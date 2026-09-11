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

// 1. Color Grading & 3D LUT Shader with Complete 16 Adjustment Controls
const COLOR_GRADE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_exposure;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_pivot;
uniform float u_brilliance;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;
uniform float u_fade;
uniform float u_saturation;
uniform float u_temperature;
uniform float u_tint;
uniform float u_sharpen;
uniform float u_clarity;
uniform float u_vignette;
uniform float u_grain;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_lift;
uniform vec3 u_gamma;
uniform vec3 u_gain;
uniform vec3 u_offset;

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

void main() {
  vec4 tex = texture(u_image, v_texCoord);
  vec3 rgb = tex.rgb;

  // 1. Unsharp Mask Sharpness & Clarity (Spatial convolution)
  if (u_sharpen > 0.001 || abs(u_clarity) > 0.001) {
    vec2 texel = 1.0 / max(u_resolution, vec2(1.0, 1.0));
    vec3 up = texture(u_image, v_texCoord + vec2(0.0, texel.y)).rgb;
    vec3 down = texture(u_image, v_texCoord - vec2(0.0, texel.y)).rgb;
    vec3 left = texture(u_image, v_texCoord - vec2(texel.x, 0.0)).rgb;
    vec3 right = texture(u_image, v_texCoord + vec2(texel.x, 0.0)).rgb;
    float k = (u_sharpen * 0.6 + u_clarity * 0.4) * 0.8;
    rgb = rgb * (1.0 + 4.0 * k) - (up + down + left + right) * k;
  }

  // 2. Exposure (in stops: 2^EV)
  rgb *= pow(2.0, u_exposure);

  // 3. Brightness & Contrast (with neutral midtone pivot)
  rgb = (rgb - u_pivot) * u_contrast + u_pivot + vec3(u_brightness);

  // 4. Brilliance (smart dynamic midtone & deep shadows roll-off)
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  if (abs(u_brilliance) > 0.001) {
    float brCurve = sin(clamp(luma, 0.0, 1.0) * 3.14159265);
    rgb += vec3(u_brilliance * 0.22 * brCurve);
  }

  // 5. Highlights (protects shadows/midtones, affects upper range > 0.25)
  luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  if (abs(u_highlights) > 0.001 && luma > 0.25) {
    float hlFactor = smoothstep(0.25, 1.0, luma);
    rgb += vec3(u_highlights * 0.35 * hlFactor * hlFactor);
  }

  // 6. Shadows (protects highlights/midtones, affects lower range < 0.75)
  if (abs(u_shadows) > 0.001 && luma < 0.75) {
    float shFactor = smoothstep(0.75, 0.0, luma);
    rgb += vec3(u_shadows * 0.35 * shFactor * shFactor);
  }

  // 7. Whites (adjusts extreme upper white levels > 0.6)
  luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  if (abs(u_whites) > 0.001 && luma > 0.6) {
    float whFactor = smoothstep(0.6, 1.0, luma);
    rgb += vec3(u_whites * 0.4 * whFactor * whFactor);
  }

  // 8. Blacks (adjusts extreme lower black levels < 0.4)
  if (abs(u_blacks) > 0.001 && luma < 0.4) {
    float blFactor = smoothstep(0.4, 0.0, luma);
    rgb += vec3(u_blacks * 0.4 * blFactor * blFactor);
  }

  // 9. Film Fade (pedestal black level lift)
  if (u_fade > 0.001) {
    rgb = rgb * (1.0 - u_fade * 0.4) + vec3(u_fade * 0.18);
  }

  // 10. Temperature & Tint (White Balance)
  rgb = adjustTemperatureAndTint(rgb, u_temperature, u_tint);

  // 11. Primary Color Wheels (Lift, Gamma, Gain, Offset)
  // Lift (Shadows)
  float wLift = max(0.0, 1.0 - luma) * max(0.0, 1.0 - luma);
  rgb += u_lift * (wLift * 0.4);

  // Gain (Highlights)
  float wGain = luma * luma;
  rgb += u_gain * (wGain * 0.4);

  // Gamma (Midtones)
  float wGamma = 4.0 * luma * (1.0 - luma);
  rgb += u_gamma * (wGamma * 0.35);

  // Offset (Global)
  rgb += u_offset * 0.25;

  // 12. Saturation
  luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(luma), rgb, max(0.0, u_saturation));

  // 13. Optical Vignette
  if (u_vignette > 0.0) {
    vec2 uv = (v_texCoord - 0.5) * 2.0;
    float dist = length(uv);
    float vig = smoothstep(0.45, 1.35, dist);
    rgb = mix(rgb, rgb * (1.0 - u_vignette * 0.85), vig);
  }

  // 14. Procedural Film Grain
  if (u_grain > 0.001) {
    vec2 grainUv = v_texCoord * u_resolution * 0.75 + vec2(sin(u_time * 17.0) * 100.0, cos(u_time * 23.0) * 100.0);
    float noise = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
    float grainAmt = (noise - 0.5) * (u_grain * 0.3);
    rgb += vec3(grainAmt);
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
