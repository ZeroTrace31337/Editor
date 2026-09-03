/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GPUDeviceManager } from './GPUDeviceManager';
import { ShaderManager } from './ShaderManager';
import { ColorGrade } from '../../domain/color/ColorGrade';

export class GPUColorGradingPass {
  private static instance: GPUColorGradingPass | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private isAvailable: boolean = false;

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

      if (this.gl) {
        const shaderMgr = ShaderManager.getInstance();
        this.program = shaderMgr.getProgram('colorGrade');
        if (this.program) {
          this.texture = this.gl.createTexture();
          this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
          this.isAvailable = true;
        }
      }
    } catch {
      this.isAvailable = false;
    }
  }

  public canAccelerate(): boolean {
    return this.isAvailable && this.gl !== null && this.program !== null;
  }

  /**
   * Executes hardware-accelerated color grading shader on target canvas
   */
  public applyGPUColorGrade(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grade: ColorGrade
  ): boolean {
    if (!this.canAccelerate() || !this.gl || !this.program || !this.offscreenCanvas) {
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

      // Set Uniforms
      const uImage = gl.getUniformLocation(this.program, 'u_image');
      const uExp = gl.getUniformLocation(this.program, 'u_exposure');
      const uContrast = gl.getUniformLocation(this.program, 'u_contrast');
      const uPivot = gl.getUniformLocation(this.program, 'u_pivot');
      const uSat = gl.getUniformLocation(this.program, 'u_saturation');
      const uTemp = gl.getUniformLocation(this.program, 'u_temperature');
      const uTint = gl.getUniformLocation(this.program, 'u_tint');
      const uLift = gl.getUniformLocation(this.program, 'u_lift');
      const uGamma = gl.getUniformLocation(this.program, 'u_gamma');
      const uGain = gl.getUniformLocation(this.program, 'u_gain');
      const uOffset = gl.getUniformLocation(this.program, 'u_offset');
      const uVignette = gl.getUniformLocation(this.program, 'u_vignette');

      gl.uniform1i(uImage, 0);
      gl.uniform1f(uExp, grade.exposure || 0);
      gl.uniform1f(uContrast, grade.contrast ?? 1.0);
      gl.uniform1f(uPivot, 0.435);
      gl.uniform1f(uSat, grade.saturation ?? 1.0);
      gl.uniform1f(uTemp, grade.temperature || 0);
      gl.uniform1f(uTint, grade.tint || 0);

      // 4-Way Color Wheels
      const wheels = grade.wheels;
      gl.uniform3f(uLift, wheels?.lift?.r ?? 0, wheels?.lift?.g ?? 0, wheels?.lift?.b ?? 0);
      gl.uniform3f(uGamma, wheels?.gamma?.r ?? 1, wheels?.gamma?.g ?? 1, wheels?.gamma?.b ?? 1);
      gl.uniform3f(uGain, wheels?.gain?.r ?? 1, wheels?.gain?.g ?? 1, wheels?.gain?.b ?? 1);
      gl.uniform3f(uOffset, wheels?.offset?.r ?? 0, wheels?.offset?.g ?? 0, wheels?.offset?.b ?? 0);

      gl.uniform1f(uVignette, grade.vignette || 0);

      // Bind VAO & Draw Quad
      const shaderMgr = ShaderManager.getInstance();
      const vao = shaderMgr.getQuadVAO();
      if (vao) {
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
      }

      // Draw processed GPU output back to 2D canvas context
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);
      ctx.restore();

      return true;
    } catch (e) {
      console.warn('[GPUColorGradingPass] Failed GPU pass, falling back:', e);
      return false;
    }
  }
}
