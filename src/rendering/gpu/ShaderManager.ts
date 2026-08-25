/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GPUDeviceManager } from './GPUDeviceManager';

const BASE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

// 1. Color Grading & 3D LUT Shader
const COLOR_GRADE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_pivot;
uniform float u_saturation;
uniform float u_temperature;
uniform float u_tint;
uniform vec3 u_lift;
uniform vec3 u_gamma;
uniform vec3 u_gain;
uniform vec3 u_offset;
uniform float u_vignette;

vec3 adjustTemperatureAndTint(vec3 color, float temp, float tintVal) {
  // Temperature: -100 (Cool blue) to +100 (Warm orange)
  color.r += temp * 0.003;
  color.b -= temp * 0.003;
  // Tint: -100 (Green) to +100 (Magenta)
  color.g -= tintVal * 0.003;
  color.r += tintVal * 0.0015;
  color.b += tintVal * 0.0015;
  return color;
}

vec3 rgbToHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsvToRgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 tex = texture(u_image, v_texCoord);
  vec3 rgb = tex.rgb;

  // 1. Exposure (in stops)
  rgb *= pow(2.0, u_exposure);

  // 2. Temp & Tint
  rgb = adjustTemperatureAndTint(rgb, u_temperature, u_tint);

  // 3. Primary Color Wheels (Lift, Gamma, Gain, Offset)
  // Lift (Shadows)
  rgb = rgb + u_lift * (1.0 - rgb);
  // Gain (Highlights)
  rgb = rgb * u_gain;
  // Gamma (Midtones)
  rgb = pow(max(rgb, vec3(0.0)), 1.0 / max(u_gamma, vec3(0.001)));
  // Offset (Global)
  rgb = rgb + u_offset;

  // 4. Contrast & Pivot
  rgb = (rgb - u_pivot) * u_contrast + u_pivot;

  // 5. Saturation
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(luma), rgb, u_saturation);

  // 6. Vignette
  if (u_vignette > 0.0) {
    vec2 uv = v_texCoord * 2.0 - 1.0;
    float dist = length(uv);
    float vig = smoothstep(0.4, 1.4, dist);
    rgb = mix(rgb, rgb * (1.0 - u_vignette), vig);
  }

  fragColor = vec4(clamp(rgb, 0.0, 1.0), tex.a);
}
`;

// 2. Chroma Keying Shader
const CHROMA_KEY_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec3 u_keyColor;
uniform float u_tolerance;
uniform float u_softness;
uniform float u_spillAmount;

void main() {
  vec4 color = texture(u_image, v_texCoord);
  
  // Calculate distance in normalized RGB space
  float d = distance(color.rgb, u_keyColor);
  
  // Key matte
  float alpha = smoothstep(u_tolerance, u_tolerance + u_softness, d);

  // Despill (Suppresses green/blue reflection on skin/edges)
  if (u_spillAmount > 0.0) {
    if (u_keyColor.g > u_keyColor.r && u_keyColor.g > u_keyColor.b) {
      // Green screen despill
      float maxRB = max(color.r, color.b);
      if (color.g > maxRB) {
        color.g = mix(color.g, maxRB, u_spillAmount);
      }
    } else if (u_keyColor.b > u_keyColor.r && u_keyColor.b > u_keyColor.g) {
      // Blue screen despill
      float maxRG = max(color.r, color.g);
      if (color.b > maxRG) {
        color.b = mix(color.b, maxRG, u_spillAmount);
      }
    }
  }

  fragColor = vec4(color.rgb, color.a * alpha);
}
`;

// 3. Distortion Shader (Fisheye, Lens Distortion, Wave, Twirl, Glitch)
const DISTORTION_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform int u_type; // 0=Fisheye, 1=Wave, 2=Twirl, 3=Glitch
uniform float u_strength;
uniform float u_time;

void main() {
  vec2 uv = v_texCoord;
  
  if (u_type == 0) {
    // Fisheye / Barrel Distortion
    vec2 center = uv - 0.5;
    float r2 = dot(center, center);
    uv = 0.5 + center * (1.0 + u_strength * r2);
  } else if (u_type == 1) {
    // Wave / Ripple
    uv.x += sin(uv.y * 20.0 + u_time * 5.0) * (u_strength * 0.05);
    uv.y += cos(uv.x * 20.0 + u_time * 5.0) * (u_strength * 0.05);
  } else if (u_type == 2) {
    // Twirl
    vec2 center = uv - 0.5;
    float angle = length(center) * u_strength * 3.14159;
    float s = sin(angle);
    float c = cos(angle);
    center = vec2(center.x * c - center.y * s, center.x * s + center.y * c);
    uv = center + 0.5;
  } else if (u_type == 3) {
    // Glitch
    float slice = floor(uv.y * 30.0);
    float noise = sin(slice * 133.0 + u_time * 20.0);
    if (abs(noise) > 0.8) {
      uv.x += noise * u_strength * 0.08;
    }
  }

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0);
  } else {
    fragColor = texture(u_image, uv);
  }
}
`;

export class ShaderManager {
  private static instance: ShaderManager;
  private programs: Map<string, WebGLProgram> = new Map();
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;

  private constructor() {}

  public static getInstance(): ShaderManager {
    if (!ShaderManager.instance) {
      ShaderManager.instance = new ShaderManager();
    }
    return ShaderManager.instance;
  }

  public initQuadBuffer(gl: WebGL2RenderingContext): void {
    if (this.quadVAO) return;

    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);

    // Quad geometry: X, Y, U, V
    const quadVertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
      -1,  1, 0, 1,
       1, -1, 1, 0,
       1,  1, 1, 1,
    ]);

    this.quadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // a_position (index 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // a_texCoord (index 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  public getProgram(name: 'colorGrade' | 'chromaKey' | 'distortion'): WebGLProgram | null {
    const gl = GPUDeviceManager.getInstance().getGLContext();
    if (!gl) return null;

    if (this.programs.has(name)) {
      return this.programs.get(name)!;
    }

    this.initQuadBuffer(gl);

    let fragSrc = COLOR_GRADE_FRAGMENT_SHADER;
    if (name === 'chromaKey') fragSrc = CHROMA_KEY_FRAGMENT_SHADER;
    else if (name === 'distortion') fragSrc = DISTORTION_FRAGMENT_SHADER;

    const program = this.createProgram(gl, BASE_VERTEX_SHADER, fragSrc);
    if (program) {
      this.programs.set(name, program);
    }
    return program;
  }

  public getQuadVAO(): WebGLVertexArrayObject | null {
    return this.quadVAO;
  }

  private createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'a_position');
    gl.bindAttribLocation(program, 1, 'a_texCoord');
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }
}
