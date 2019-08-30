import { GFXStatus } from '../define';
import { GFXDevice } from '../device';
import { GFXInputAssembler, IGFXInputAssemblerInfo } from '../input-assembler';
import { WebGL2GFXBuffer } from './webgl2-buffer';
import { WebGL2CmdDraw, WebGL2CmdFuncCreateInputAssember, WebGL2CmdFuncDestroyInputAssembler } from './webgl2-commands';
import { WebGL2GFXDevice } from './webgl2-device';
import { IWebGL2GPUInputAssembler, WebGL2GPUBuffer } from './webgl2-gpu-objects';

export class WebGL2GFXInputAssembler extends GFXInputAssembler {

    public get gpuInputAssembler (): IWebGL2GPUInputAssembler {
        return  this._gpuInputAssembler!;
    }

    private _gpuInputAssembler: IWebGL2GPUInputAssembler | null = null;

    constructor (device: GFXDevice) {
        super(device);
    }

    public initialize (info: IGFXInputAssemblerInfo): boolean {

        if (info.vertexBuffers.length === 0) {
            console.error('GFXInputAssemblerInfo.vertexBuffers is null.');
            return false;
        }

        this._attributes = info.attributes;
        this._vertexBuffers = info.vertexBuffers;

        if (info.indexBuffer !== undefined) {
            this._indexBuffer = info.indexBuffer;
            this._indexCount = this._indexBuffer.size / this._indexBuffer.stride;
        } else {
            const vertBuff = this._vertexBuffers[0];
            this._vertexCount = vertBuff.size / vertBuff.stride;
        }

        this._indirectBuffer = info.indirectBuffer || null;

        const gpuVertexBuffers: WebGL2GPUBuffer[] = new Array<WebGL2GPUBuffer>(info.vertexBuffers.length);
        for (let i = 0; i < info.vertexBuffers.length; ++i) {
            const vb = info.vertexBuffers[i] as WebGL2GFXBuffer;
            if (vb.gpuBuffer) {
                gpuVertexBuffers[i] = vb.gpuBuffer;
            }
        }

        let gpuIndexBuffer: WebGL2GPUBuffer | null = null;
        let glIndexType = 0;
        if (info.indexBuffer) {
            gpuIndexBuffer = (info.indexBuffer as WebGL2GFXBuffer).gpuBuffer;
            if (gpuIndexBuffer) {
                switch (gpuIndexBuffer.stride) {
                    case 1: glIndexType = 0x1401; break; // WebGLRenderingContext.UNSIGNED_BYTE
                    case 2: glIndexType = 0x1403; break; // WebGLRenderingContext.UNSIGNED_SHORT
                    case 4: glIndexType = 0x1405; break; // WebGLRenderingContext.UNSIGNED_INT
                    default: {
                        console.error('Illegal index buffer stride.');
                    }
                }
            }
        }

        let gpuIndirectBuffer: WebGL2GPUBuffer | null = null;
        if (info.indirectBuffer !== undefined) {
            gpuIndirectBuffer = (info.indirectBuffer as WebGL2GFXBuffer).gpuBuffer;
        }

        this._gpuInputAssembler = {
            attributes: info.attributes,
            gpuVertexBuffers,
            gpuIndexBuffer,
            gpuIndirectBuffer,

            glAttribs: [],
            glIndexType,
            glVAOs: new Map<WebGLProgram, WebGLVertexArrayObject>(),
        };

        WebGL2CmdFuncCreateInputAssember(this._device as WebGL2GFXDevice, this._gpuInputAssembler);

        this._status = GFXStatus.SUCCESS;

        return true;
    }

    public destroy () {
        const webgl2Dev = this._device as WebGL2GFXDevice;
        if (this._gpuInputAssembler && webgl2Dev.useVAO) {
            WebGL2CmdFuncDestroyInputAssembler(webgl2Dev, this._gpuInputAssembler);
        }
        this._gpuInputAssembler = null;
        this._status = GFXStatus.UNREADY;
    }

    public extractCmdDraw (cmd: WebGL2CmdDraw) {
        cmd.drawInfo.vertexCount = this._vertexCount;
        cmd.drawInfo.firstVertex = this._firstVertex;
        cmd.drawInfo.indexCount = this._indexCount;
        cmd.drawInfo.firstIndex = this._firstIndex;
        cmd.drawInfo.vertexOffset = this._vertexOffset;
        cmd.drawInfo.instanceCount = this._instanceCount;
        cmd.drawInfo.firstInstance = this._firstInstance;
    }
}
