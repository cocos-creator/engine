import { Buffer, BufferSource, DrawInfo } from '../buffer';
import { CommandBuffer } from '../command-buffer';
import {  BufferUsageBit } from '../define';
import { BufferTextureCopy, Color, Rect } from '../define-class';
import { Framebuffer } from '../framebuffer';
import { InputAssembler } from '../input-assembler';
import { Texture } from '../texture';
import { WebGLBuffer } from './webgl-buffer';
import { WebGLCommandBuffer } from './webgl-command-buffer';
import {
    WebGLCmdFuncBeginRenderPass, WebGLCmdFuncBindStates, WebGLCmdFuncCopyBuffersToTexture,
    WebGLCmdFuncDraw, WebGLCmdFuncExecuteCmds, WebGLCmdFuncUpdateBuffer } from './webgl-commands';
import { WebGLDevice } from './webgl-device';
import { WebGLFramebuffer } from './webgl-framebuffer';
import { WebGLTexture } from './webgl-texture';
import { RenderPass } from '../render-pass';
import { WebGLRenderPass } from './webgl-render-pass';

const _dynamicOffsets: number[] = [];

export class WebGLPrimaryCommandBuffer extends WebGLCommandBuffer {

    public beginRenderPass (
        renderPass: RenderPass,
        framebuffer: Framebuffer,
        renderArea: Rect,
        clearColors: Color[],
        clearDepth: number,
        clearStencil: number) {

        WebGLCmdFuncBeginRenderPass(
            this._device as WebGLDevice,
            (renderPass as WebGLRenderPass).gpuRenderPass,
            (framebuffer as WebGLFramebuffer).gpuFramebuffer,
            renderArea, clearColors, clearDepth, clearStencil);
        this._isInRenderPass = true;
    }

    public draw (inputAssembler: InputAssembler) {
        if (this._isInRenderPass) {
            if (this._isStateInvalied) {
                this.bindStates();
            }

            WebGLCmdFuncDraw(this._device as WebGLDevice, inputAssembler as unknown as DrawInfo);

            ++this._numDrawCalls;
            this._numInstances += inputAssembler.instanceCount;
            const indexCount = inputAssembler.indexCount || inputAssembler.vertexCount;
            if (this._curGPUPipelineState) {
                const glPrimitive = this._curGPUPipelineState.glPrimitive;
                switch (glPrimitive) {
                    case 0x0004: { // WebGLRenderingContext.TRIANGLES
                        this._numTris += indexCount / 3 * Math.max(inputAssembler.instanceCount, 1);
                        break;
                    }
                    case 0x0005: // WebGLRenderingContext.TRIANGLE_STRIP
                    case 0x0006: { // WebGLRenderingContext.TRIANGLE_FAN
                        this._numTris += (indexCount - 2) * Math.max(inputAssembler.instanceCount, 1);
                        break;
                    }
                }
            }
        } else {
            console.error('Command \'draw\' must be recorded inside a render pass.');
        }
    }

    public updateBuffer (buffer: Buffer, data: BufferSource, offset?: number, size?: number) {
        if (!this._isInRenderPass) {
            const gpuBuffer = (buffer as WebGLBuffer).gpuBuffer;
            if (gpuBuffer) {
                if (offset === undefined) { offset = 0; }

                let buffSize: number;
                if (size !== undefined) {
                    buffSize = size;
                } else if (buffer.usage & BufferUsageBit.INDIRECT) {
                    buffSize = 0;
                } else {
                    buffSize = (data as ArrayBuffer).byteLength;
                }

                WebGLCmdFuncUpdateBuffer(this._device as WebGLDevice, gpuBuffer, data as ArrayBuffer, offset, buffSize);
            }
        } else {
            console.error('Command \'updateBuffer\' must be recorded outside a render pass.');
        }
    }

    public copyBuffersToTexture (buffers: ArrayBufferView[], texture: Texture, regions: BufferTextureCopy[]) {
        if (!this._isInRenderPass) {
            const gpuTexture = (texture as WebGLTexture).gpuTexture;
            if (gpuTexture) {
                WebGLCmdFuncCopyBuffersToTexture(this._device as WebGLDevice, buffers, gpuTexture, regions);
            }
        } else {
            console.error('Command \'copyBufferToTexture\' must be recorded outside a render pass.');
        }
    }

    public execute (cmdBuffs: CommandBuffer[], count: number) {
        for (let i = 0; i < count; ++i) {
            // actually they are secondary buffers, the cast here is only for type checking
            const webGLCmdBuff = cmdBuffs[i] as WebGLPrimaryCommandBuffer;
            WebGLCmdFuncExecuteCmds(this._device as WebGLDevice, webGLCmdBuff.cmdPackage);
            this._numDrawCalls += webGLCmdBuff._numDrawCalls;
            this._numInstances += webGLCmdBuff._numInstances;
            this._numTris += webGLCmdBuff._numTris;
        }
    }

    protected bindStates () {
        _dynamicOffsets.length = 0;
        for (let i = 0; i < this._curDynamicOffsets.length; i++) {
            Array.prototype.push.apply(_dynamicOffsets, this._curDynamicOffsets[i]);
        }
        WebGLCmdFuncBindStates(this._device as WebGLDevice,
            this._curGPUPipelineState, this._curGPUInputAssembler, this._curGPUDescriptorSets, _dynamicOffsets,
            this._curViewport, this._curScissor, this._curLineWidth, this._curDepthBias, this._curBlendConstants,
            this._curDepthBounds, this._curStencilWriteMask, this._curStencilCompareMask);
        this._isStateInvalied = false;
    }
}
