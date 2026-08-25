/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GPUBackendType = 'webgpu' | 'webgl2' | 'cpu';

export interface GPUDeviceCapabilities {
  backend: GPUBackendType;
  deviceName: string;
  vendor: string;
  maxTextureSize: number;
  supportsFloatTextures: boolean;
  supportsColorBufferFloat: boolean;
  maxDrawBuffers: number;
  isHardwareAccelerated: boolean;
  estimatedVRAMBytes: number;
}

export class GPUDeviceManager {
  private static instance: GPUDeviceManager;
  private backend: GPUBackendType = 'cpu';
  private capabilities: GPUDeviceCapabilities;
  private glCanvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private isContextLost = false;

  private constructor() {
    this.capabilities = this.probeHardware();
  }

  public static getInstance(): GPUDeviceManager {
    if (!GPUDeviceManager.instance) {
      GPUDeviceManager.instance = new GPUDeviceManager();
    }
    return GPUDeviceManager.instance;
  }

  private probeHardware(): GPUDeviceCapabilities {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;

      // Try WebGL2 first as universal high-performance GPU pipeline
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });

      if (gl) {
        this.glCanvas = canvas;
        this.gl = gl;
        this.backend = 'webgl2';

        // Setup context loss handlers
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          this.isContextLost = true;
          this.backend = 'cpu';
          console.warn('[GPUDeviceManager] GPU context lost, switching to CPU fallback.');
        });

        canvas.addEventListener('webglcontextrestored', () => {
          this.isContextLost = false;
          this.backend = 'webgl2';
          console.info('[GPUDeviceManager] GPU context restored.');
        });

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
        const floatExt = gl.getExtension('EXT_color_buffer_float');

        return {
          backend: 'webgl2',
          deviceName: renderer || 'WebGL2 GPU Accelerator',
          vendor: vendor || 'Hardware Vendor',
          maxTextureSize,
          supportsFloatTextures: true,
          supportsColorBufferFloat: !!floatExt,
          maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS) || 4,
          isHardwareAccelerated: !/software|llvmpipe|swiftshader/i.test(renderer || ''),
          estimatedVRAMBytes: 2 * 1024 * 1024 * 1024, // 2GB estimation default
        };
      }
    } catch (e) {
      console.warn('[GPUDeviceManager] WebGL2 probe failed, falling back to CPU renderer:', e);
    }

    // CPU Fallback Capabilities
    this.backend = 'cpu';
    return {
      backend: 'cpu',
      deviceName: 'CPU Software Compositor (Canvas2D)',
      vendor: 'Software / Host CPU',
      maxTextureSize: 4096,
      supportsFloatTextures: false,
      supportsColorBufferFloat: false,
      maxDrawBuffers: 1,
      isHardwareAccelerated: false,
      estimatedVRAMBytes: 512 * 1024 * 1024,
    };
  }

  public getBackend(): GPUBackendType {
    return this.isContextLost ? 'cpu' : this.backend;
  }

  public getCapabilities(): GPUDeviceCapabilities {
    return this.capabilities;
  }

  public getGLContext(): WebGL2RenderingContext | null {
    if (this.isContextLost) return null;
    return this.gl;
  }

  public getGLCanvas(): HTMLCanvasElement | null {
    return this.glCanvas;
  }
}
