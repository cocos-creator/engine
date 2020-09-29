import { GFXFramebuffer, GFXFramebufferInfo } from '../framebuffer';
import { WebGL2CmdFuncCreateFramebuffer, WebGL2CmdFuncDestroyFramebuffer } from './webgl2-commands';
import { WebGL2Device } from './webgl2-device';
import { IWebGL2GPUFramebuffer, IWebGL2GPUTexture } from './webgl2-gpu-objects';
import { WebGL2RenderPass } from './webgl2-render-pass';
import { WebGL2Texture } from './webgl2-texture';

export class WebGL2Framebuffer extends GFXFramebuffer {

    get gpuFramebuffer (): IWebGL2GPUFramebuffer {
        return  this._gpuFramebuffer!;
    }

    private _gpuFramebuffer: IWebGL2GPUFramebuffer | null = null;

    public initialize (info: GFXFramebufferInfo): boolean {

        this._renderPass = info.renderPass;
        this._colorTextures = info.colorTextures || [];
        this._depthStencilTexture = info.depthStencilTexture || null;

        if (info.depStencilMipmapLevel !== 0) {
            console.warn('The mipmap level of th texture image to be attached of depth stencil attachment should be 0. Convert to 0.');
        }
        for (let i = 0; i < info.colorMipmapLevels.length; ++i) {
            if (info.colorMipmapLevels[i] !== 0) {
                console.warn(`The mipmap level of th texture image to be attached of color attachment ${i} should be 0. Convert to 0.`);
            }
        }

        const gpuColorTextures: IWebGL2GPUTexture[] = [];
        for (let i = 0; i < info.colorTextures.length; i++) {
            const colorTexture = info.colorTextures[i];
            if (colorTexture) {
                gpuColorTextures.push((colorTexture as WebGL2Texture).gpuTexture);
            }
        }

        let gpuDepthStencilTexture: IWebGL2GPUTexture | null = null;
        if (info.depthStencilTexture) {
            gpuDepthStencilTexture = (info.depthStencilTexture as WebGL2Texture).gpuTexture;
        }

        this._gpuFramebuffer = {
            gpuRenderPass: (info.renderPass as WebGL2RenderPass).gpuRenderPass,
            gpuColorTextures,
            gpuDepthStencilTexture,
            glFramebuffer: null,
        };

        WebGL2CmdFuncCreateFramebuffer(this._device as WebGL2Device, this._gpuFramebuffer);

        return true;
    }

    public destroy () {
        if (this._gpuFramebuffer) {
            WebGL2CmdFuncDestroyFramebuffer(this._device as WebGL2Device, this._gpuFramebuffer);
            this._gpuFramebuffer = null;
        }
    }
}
