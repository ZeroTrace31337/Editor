/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorGrade } from '../../domain/color/ColorGrade';

const PASS_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const PASS_FRAGMENT_SHADER = `#version 300 es
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
  color.r += temp * 0.003;
  color.b -= temp * 0.003;
  color.g -= tintVal * 0.003;
  color.r += tintVal * 0.0015;
  color.b += tintVal * 0.0015;
  return color;
}

void main() {
  vec4 tex = texture(u_image, v_texCoord);
  vec3 rgb = tex.rgb;

  // 1. Unsharp Mask Sharpness & Clarity
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
  float wLift = max(0.0, 1.0 - luma) * max(0.0, 1.0 - luma);
  rgb += u_lift * (wLift * 0.4);

  float wGain = luma * luma;
  rgb += u_gain * (wGain * 0.4);

  float wGamma = 4.0 * luma * (1.0 - luma);
  rgb += u_gamma * (wGamma * 0.35);

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

export class GPUColorGradingPass {
  private static instance: GPUColorGradingPass | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private isAvailable: boolean = false;

  // Cached uniform locations
  private uLocs: Record<string, WebGLUniformLocation | null> = {};

  private constructor() {
    this.initGL();
  }

  public static getInstance(): GPUColorGradingPass {
    if (!GPUColorGradingPass.instance) {
      GPUColorGradingPass.instance = new GPUColorGradingPass();
    }
    return GPUColorGradingPass.instance;
  }

  private initGL(): void {
    try {
      if (typeof document === 'undefined') return;

      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = 1920;
      this.offscreenCanvas.height = 1080;

      this.gl = this.offscreenCanvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });

      if (!this.gl) {
        this.isAvailable = false;
        return;
      }

      const gl = this.gl;

      this.offscreenCanvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.isAvailable = false;
      });

      this.offscreenCanvas.addEventListener('webglcontextrestored', () => {
        this.initGL();
      });

      // Compile Shader Program on this context
      const vs = this.compileShader(gl, gl.VERTEX_SHADER, PASS_VERTEX_SHADER);
      const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, PASS_FRAGMENT_SHADER);
      if (!vs || !fs) {
        this.isAvailable = false;
        return;
      }

      const prog = gl.createProgram();
      if (!prog) {
        this.isAvailable = false;
        return;
      }

      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, 'a_position');
      gl.bindAttribLocation(prog, 1, 'a_texCoord');
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('[GPUColorGradingPass] Program link failed:', gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        this.isAvailable = false;
        return;
      }

      this.program = prog;

      // Cache Uniform Locations
      const uniformNames = [
        'u_image', 'u_exposure', 'u_brightness', 'u_contrast', 'u_pivot',
        'u_brilliance', 'u_highlights', 'u_shadows', 'u_whites', 'u_blacks',
        'u_fade', 'u_saturation', 'u_temperature', 'u_tint', 'u_sharpen',
        'u_clarity', 'u_vignette', 'u_grain', 'u_resolution', 'u_time',
        'u_lift', 'u_gamma', 'u_gain', 'u_offset'
      ];
      for (const name of uniformNames) {
        this.uLocs[name] = gl.getUniformLocation(prog, name);
      }

      // Create Quad Geometry on this context
      // Note: mapping Y: -1 -> V: 1 and Y: 1 -> V: 0 produces correct orientation when copying back to 2D canvas
      const quadVertices = new Float32Array([
        -1, -1, 0, 1,
         1, -1, 1, 1,
        -1,  1, 0, 0,
        -1,  1, 0, 0,
         1, -1, 1, 1,
         1,  1, 1, 0,
      ]);

      this.quadVAO = gl.createVertexArray();
      gl.bindVertexArray(this.quadVAO);

      this.quadVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
      gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

      gl.bindVertexArray(null);

      // Create & Configure Texture
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      this.isAvailable = true;
    } catch (e) {
      console.warn('[GPUColorGradingPass] Initialization error:', e);
      this.isAvailable = false;
    }
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('[GPUColorGradingPass] Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public canAccelerate(): boolean {
    return this.isAvailable && this.gl !== null && this.program !== null && this.quadVAO !== null;
  }

  private safeNum(val: unknown, fallback: number): number {
    return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  }

  /**
   * Executes hardware-accelerated color grading shader on target canvas.
   * Crucially: if any error occurs, the context is NEVER cleared and returns false
   * so ColorEngine seamlessly falls back to CPU grading.
   */
  public applyGPUColorGrade(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grade: ColorGrade
  ): boolean {
    if (!this.canAccelerate() || !this.gl || !this.program || !this.offscreenCanvas || !this.quadVAO) {
      return false;
    }

    if (width <= 0 || height <= 0 || !ctx || !ctx.canvas) {
      return false;
    }

    const gl = this.gl;

    try {
      if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
      }

      gl.viewport(0, 0, width, height);
      gl.useProgram(this.program);

      // Upload source canvas as texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);

      // Set Uniforms with safe fallback clamping
      gl.uniform1i(this.uLocs.u_image, 0);
      gl.uniform1f(this.uLocs.u_exposure, this.safeNum(grade.exposure, 0));
      gl.uniform1f(this.uLocs.u_brightness, this.safeNum(grade.brightness, 0));
      gl.uniform1f(this.uLocs.u_contrast, this.safeNum(grade.contrast, 1.0));
      gl.uniform1f(this.uLocs.u_pivot, 0.435);
      gl.uniform1f(this.uLocs.u_brilliance, this.safeNum(grade.brilliance, 0) / 100);
      gl.uniform1f(this.uLocs.u_highlights, this.safeNum(grade.highlights, 0) / 100);
      gl.uniform1f(this.uLocs.u_shadows, this.safeNum(grade.shadows, 0) / 100);
      gl.uniform1f(this.uLocs.u_whites, this.safeNum(grade.whites, 0) / 100);
      gl.uniform1f(this.uLocs.u_blacks, this.safeNum(grade.blacks, 0) / 100);
      gl.uniform1f(this.uLocs.u_fade, Math.max(0, Math.min(1, this.safeNum(grade.fade, 0) / 100)));
      gl.uniform1f(this.uLocs.u_saturation, Math.max(0, this.safeNum(grade.saturation, 1.0)));
      gl.uniform1f(this.uLocs.u_temperature, this.safeNum(grade.temperature, 0));
      gl.uniform1f(this.uLocs.u_tint, this.safeNum(grade.tint, 0));
      gl.uniform1f(this.uLocs.u_sharpen, Math.max(0, Math.min(1, this.safeNum(grade.sharpen, 0) / 100)));
      gl.uniform1f(this.uLocs.u_clarity, Math.max(-1, Math.min(1, this.safeNum(grade.clarity, 0) / 100)));
      gl.uniform1f(this.uLocs.u_vignette, Math.max(0, Math.min(1, this.safeNum(grade.vignette, 0))));
      gl.uniform1f(this.uLocs.u_grain, Math.max(0, Math.min(1, this.safeNum(grade.grain, 0) / 100)));
      gl.uniform2f(this.uLocs.u_resolution, width, height);
      gl.uniform1f(this.uLocs.u_time, performance.now() / 1000);

      // 4-Way Color Wheels
      const wheels = grade.wheels;
      gl.uniform3f(
        this.uLocs.u_lift,
        this.safeNum(wheels?.lift?.r, 0),
        this.safeNum(wheels?.lift?.g, 0),
        this.safeNum(wheels?.lift?.b, 0)
      );
      gl.uniform3f(
        this.uLocs.u_gamma,
        this.safeNum(wheels?.gamma?.r, 0),
        this.safeNum(wheels?.gamma?.g, 0),
        this.safeNum(wheels?.gamma?.b, 0)
      );
      gl.uniform3f(
        this.uLocs.u_gain,
        this.safeNum(wheels?.gain?.r, 0),
        this.safeNum(wheels?.gain?.g, 0),
        this.safeNum(wheels?.gain?.b, 0)
      );
      gl.uniform3f(
        this.uLocs.u_offset,
        this.safeNum(wheels?.offset?.r, 0),
        this.safeNum(wheels?.offset?.g, 0),
        this.safeNum(wheels?.offset?.b, 0)
      );

      // Bind VAO & Draw Quad
      gl.bindVertexArray(this.quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);

      // Draw processed GPU output back to 2D canvas context directly
      // Note: we do NOT call clearRect, drawImage cleanly paints over the context
      ctx.save();
      ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);
      ctx.restore();

      return true;
    } catch (e) {
      console.warn('[GPUColorGradingPass] Failed GPU pass, falling back:', e);
      return false;
    }
  }
}

