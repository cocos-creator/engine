import { GFXTextureFlagBit, GFXFormatSurfaceSize } from '../define';
import { GFXTexture, IGFXTextureInfo, IsPowerOf2, IGFXTextureViewInfo } from '../texture';
import { WebGL2CmdFuncCreateTexture, WebGL2CmdFuncDestroyTexture, WebGL2CmdFuncResizeTexture } from './webgl2-commands';
import { WebGL2Device } from './webgl2-device';
import { IWebGL2GPUTexture } from './webgl2-gpu-objects';

export class WebGL2Texture extends GFXTexture {

    get gpuTexture (): IWebGL2GPUTexture {
        return  this._gpuTexture!;
    }

    private _gpuTexture: IWebGL2GPUTexture | null = null;

    public initialize (info: IGFXTextureInfo | IGFXTextureViewInfo): boolean {
        if ('texture' in info) {
            console.log('WebGL2 does not support texture view.');
            return false;
        }

        this._type = info.type;
        this._usage = info.usage;
        this._format = info.format;
        this._width = info.width;
        this._height = info.height;

        if (info.depth !== undefined) {
            this._depth = info.depth;
        }

        if (info.layerCount !== undefined) {
            this._layerCount = info.layerCount;
        }

        if (info.levelCount !== undefined) {
            this._levelCount = info.levelCount;
        }

        if (info.samples !== undefined) {
            this._samples = info.samples;
        }

        if (info.flags !== undefined) {
            this._flags = info.flags;
        }

        this._isPowerOf2 = IsPowerOf2(this._width) && IsPowerOf2(this._height);

        this._size = GFXFormatSurfaceSize(this._format, this.width, this.height,
            this.depth, this._levelCount) * this._layerCount;

        if (this._flags & GFXTextureFlagBit.BAKUP_BUFFER) {
            this._buffer = new ArrayBuffer(this._size);
        }

        this._gpuTexture = {
            type: this._type,
            format: this._format,
            usage: this._usage,
            width: this._width,
            height: this._height,
            depth: this._depth,
            size: this._size,
            arrayLayer: this._layerCount,
            mipLevel: this._levelCount,
            samples: this._samples,
            flags: this._flags,
            isPowerOf2: this._isPowerOf2,

            glTarget: 0,
            glInternalFmt: 0,
            glFormat: 0,
            glType: 0,
            glUsage: 0,
            glTexture: null,
            glRenderbuffer: null,
            glWrapS: 0,
            glWrapT: 0,
            glMinFilter: 0,
            glMagFilter: 0,
        };

        WebGL2CmdFuncCreateTexture(this._device as WebGL2Device, this._gpuTexture);

        this._device.memoryStatus.textureSize += this._size;

        return true;
    }

    public destroy () {
        if (this._gpuTexture) {
            WebGL2CmdFuncDestroyTexture(this._device as WebGL2Device, this._gpuTexture);
            this._device.memoryStatus.textureSize -= this._size;
            this._gpuTexture = null;
        }
        this._buffer = null;
    }

    public resize (width: number, height: number) {

        const oldSize = this._size;
        this._width = width;
        this._height = height;
        this._size = GFXFormatSurfaceSize(this._format, this.width, this.height,
            this.depth, this._levelCount) * this._layerCount;

        if (this._gpuTexture) {
            this._gpuTexture.width = width;
            this._gpuTexture.height = height;
            this._gpuTexture.size = this._size;
            WebGL2CmdFuncResizeTexture(this._device as WebGL2Device, this._gpuTexture);
            this._device.memoryStatus.textureSize -= oldSize;
            this._device.memoryStatus.textureSize += this._size;
        }
    }
}
