import { GFXBindingLayout } from '../binding-layout';
import { GFXBuffer, GFXBufferSource } from '../buffer';
import { GFXCommandBuffer, IGFXCommandBufferInfo } from '../command-buffer';
import {
    GFXBufferTextureCopy,
    GFXBufferUsageBit,
    GFXClearFlag,
    GFXCommandBufferType,
    GFXStatus,
    GFXStencilFace,
    GFXTextureLayout,
    IGFXColor,
    IGFXRect,
    IGFXViewport,
} from '../define';
import { GFXDevice } from '../device';
import { GFXFramebuffer } from '../framebuffer';
import { GFXInputAssembler } from '../input-assembler';
import { GFXPipelineState } from '../pipeline-state';
import { GFXTexture } from '../texture';
import { WebGL2GFXBindingLayout } from './webgl2-binding-layout';
import { WebGL2GFXBuffer } from './webgl2-buffer';
import { WebGL2GFXCommandAllocator } from './webgl2-command-allocator';
import {
    WebGL2Cmd,
    WebGL2CmdBeginRenderPass,
    WebGL2CmdBindStates,
    WebGL2CmdCopyBufferToTexture,
    WebGL2CmdDraw,
    WebGL2CmdPackage,
    WebGL2CmdUpdateBuffer,
} from './webgl2-commands';
import { WebGL2GFXDevice } from './webgl2-device';
import { WebGL2GFXFramebuffer } from './webgl2-framebuffer';
import { IWebGL2GPUInputAssembler, WebGL2GPUBindingLayout, WebGL2GPUPipelineState } from './webgl2-gpu-objects';
import { WebGL2GFXInputAssembler } from './webgl2-input-assembler';
import { WebGL2GFXPipelineState } from './webgl2-pipeline-state';
import { WebGL2GFXTexture } from './webgl2-texture';

export interface IWebGL2DepthBias {
    constantFactor: number;
    clamp: number;
    slopeFactor: number;
}

export interface IWebGL2DepthBounds {
    minBounds: number;
    maxBounds: number;
}

export interface IWebGL2StencilWriteMask {
    face: GFXStencilFace;
    writeMask: number;
}

export interface IWebGL2StencilCompareMask {
    face: GFXStencilFace;
    reference: number;
    compareMask: number;
}

export class WebGL2GFXCommandBuffer extends GFXCommandBuffer {

    public cmdPackage: WebGL2CmdPackage = new WebGL2CmdPackage();
    protected _webGLAllocator: WebGL2GFXCommandAllocator | null = null;
    protected _isInRenderPass: boolean = false;
    protected _curGPUPipelineState: WebGL2GPUPipelineState | null = null;
    protected _curGPUBindingLayout: WebGL2GPUBindingLayout | null = null;
    protected _curGPUInputAssembler: IWebGL2GPUInputAssembler | null = null;
    protected _curViewport: IGFXViewport | null = null;
    protected _curScissor: IGFXRect | null = null;
    protected _curLineWidth: number | null = null;
    protected _curDepthBias: IWebGL2DepthBias | null = null;
    protected _curBlendConstants: number[] = [];
    protected _curDepthBounds: IWebGL2DepthBounds | null = null;
    protected _curStencilWriteMask: IWebGL2StencilWriteMask | null = null;
    protected _curStencilCompareMask: IWebGL2StencilCompareMask | null = null;
    protected _isStateInvalied: boolean = false;

    public initialize (info: IGFXCommandBufferInfo): boolean {

        if (!info.allocator) {
            return false;
        }

        this._allocator = info.allocator;
        this._webGLAllocator = this._allocator as WebGL2GFXCommandAllocator;
        this._type = info.type;
        this._status = GFXStatus.SUCCESS;

        return true;
    }

    public destroy () {
        if (this._webGLAllocator) {
            this._webGLAllocator.clearCmds(this.cmdPackage);
            this._allocator = null;
            this._webGLAllocator = null;
        }
        this._status = GFXStatus.UNREADY;
    }

    public begin () {
        this._webGLAllocator!.clearCmds(this.cmdPackage);
        this._curGPUPipelineState = null;
        this._curGPUBindingLayout = null;
        this._curGPUInputAssembler = null;
        this._curViewport = null;
        this._curScissor = null;
        this._curLineWidth = null;
        this._curDepthBias = null;
        this._curBlendConstants = [];
        this._curDepthBounds = null;
        this._curStencilWriteMask = null;
        this._curStencilCompareMask = null;
        this._numDrawCalls = 0;
        this._numInstances = 0;
        this._numTris = 0;
    }

    public end () {
        if (this._isStateInvalied) {
            this.bindStates();
        }

        this._isInRenderPass = false;
    }

    public beginRenderPass (
        framebuffer: GFXFramebuffer,
        renderArea: IGFXRect,
        clearFlag: GFXClearFlag,
        clearColors: IGFXColor[],
        clearDepth: number,
        clearStencil: number) {
        const cmd = this._webGLAllocator!.beginRenderPassCmdPool.alloc(WebGL2CmdBeginRenderPass);
        cmd.gpuFramebuffer = ( framebuffer as WebGL2GFXFramebuffer).gpuFramebuffer;
        cmd.renderArea = renderArea;
        cmd.clearFlag = clearFlag;
        for (let i = 0; i < clearColors.length; ++i) {
            cmd.clearColors[i] = clearColors[i];
        }
        cmd.clearDepth = clearDepth;
        cmd.clearStencil = clearStencil;
        this.cmdPackage.beginRenderPassCmds.push(cmd);

        this.cmdPackage.cmds.push(WebGL2Cmd.BEGIN_RENDER_PASS);

        this._isInRenderPass = true;
    }

    public endRenderPass () {
        this._isInRenderPass = false;
    }

    public bindPipelineState (pipelineState: GFXPipelineState) {
        const gpuPipelineState = (pipelineState as WebGL2GFXPipelineState).gpuPipelineState;
        this._curGPUPipelineState = gpuPipelineState;
        this._isStateInvalied = true;
    }

    public bindBindingLayout (bindingLayout: GFXBindingLayout) {
        const gpuBindingLayout = (bindingLayout as WebGL2GFXBindingLayout).gpuBindingLayout;
        this._curGPUBindingLayout = gpuBindingLayout;
        this._isStateInvalied = true;
    }

    public bindInputAssembler (inputAssembler: GFXInputAssembler) {
        const gpuInputAssembler = (inputAssembler as WebGL2GFXInputAssembler).gpuInputAssembler;
        this._curGPUInputAssembler = gpuInputAssembler;
        this._isStateInvalied = true;
    }

    public setViewport (viewport: IGFXViewport) {
        if (!this._curViewport) {
            this._curViewport = {
                left: viewport.left,
                top: viewport.top,
                width: viewport.width,
                height: viewport.height,
                minDepth: viewport.minDepth,
                maxDepth: viewport.maxDepth,
            };
        } else {
            if (this._curViewport.left !== viewport.left ||
                this._curViewport.top !== viewport.top ||
                this._curViewport.width !== viewport.width ||
                this._curViewport.height !== viewport.height ||
                this._curViewport.minDepth !== viewport.minDepth ||
                this._curViewport.maxDepth !== viewport.maxDepth) {

                this._curViewport.left = viewport.left;
                this._curViewport.top = viewport.top;
                this._curViewport.width = viewport.width;
                this._curViewport.height = viewport.height;
                this._curViewport.minDepth = viewport.minDepth;
                this._curViewport.maxDepth = viewport.maxDepth;
                this._isStateInvalied = true;
            }
        }
    }

    public setScissor (scissor: IGFXRect) {
        if (!this._curScissor) {
            this._curScissor = {
                x: scissor.x,
                y: scissor.y,
                width: scissor.width,
                height: scissor.height,
            };
        } else {
            if (this._curScissor.x !== scissor.x ||
                this._curScissor.y !== scissor.y ||
                this._curScissor.width !== scissor.width ||
                this._curScissor.height !== scissor.height) {
                this._curScissor.x = scissor.x;
                this._curScissor.y = scissor.y;
                this._curScissor.width = scissor.width;
                this._curScissor.height = scissor.height;
                this._isStateInvalied = true;
            }
        }
    }

    public setLineWidth (lineWidth: number) {
        if (this._curLineWidth !== lineWidth) {
            this._curLineWidth = lineWidth;
            this._isStateInvalied = true;
        }
    }

    public setDepthBias (depthBiasConstantFactor: number, depthBiasClamp: number, depthBiasSlopeFactor: number) {
        if (!this._curDepthBias) {
            this._curDepthBias = {
                constantFactor: depthBiasConstantFactor,
                clamp: depthBiasClamp,
                slopeFactor: depthBiasSlopeFactor,
            };
            this._isStateInvalied = true;
        } else {
            if (this._curDepthBias.constantFactor !== depthBiasConstantFactor ||
                this._curDepthBias.clamp !== depthBiasClamp ||
                this._curDepthBias.slopeFactor !== depthBiasSlopeFactor) {

                this._curDepthBias.constantFactor = depthBiasConstantFactor;
                this._curDepthBias.clamp = depthBiasClamp;
                this._curDepthBias.slopeFactor = depthBiasSlopeFactor;
                this._isStateInvalied = true;
            }
        }
    }

    public setBlendConstants (blendConstants: number[]) {
        if (!this._curBlendConstants &&
            blendConstants.length === 4) {
            this._curBlendConstants = [blendConstants[0], blendConstants[1], blendConstants[2], blendConstants[3]];
            this._isStateInvalied = true;
        } else {
            if (blendConstants.length === 4 && (
                this._curBlendConstants[0] !== blendConstants[0] ||
                this._curBlendConstants[1] !== blendConstants[1] ||
                this._curBlendConstants[2] !== blendConstants[2] ||
                this._curBlendConstants[3] !== blendConstants[3])) {
                this._curBlendConstants = [blendConstants[0], blendConstants[1], blendConstants[2], blendConstants[3]];
                this._isStateInvalied = true;
            }
        }
    }

    public setDepthBound (minDepthBounds: number, maxDepthBounds: number) {
        if (!this._curDepthBounds) {
            this._curDepthBounds = {
                minBounds: minDepthBounds,
                maxBounds: maxDepthBounds,
            };
            this._isStateInvalied = true;
        } else {
            if (this._curDepthBounds.minBounds !== minDepthBounds ||
                this._curDepthBounds.maxBounds !== maxDepthBounds) {
                this._curDepthBounds = {
                    minBounds: minDepthBounds,
                    maxBounds: maxDepthBounds,
                };
                this._isStateInvalied = true;
            }
        }
    }

    public setStencilWriteMask (face: GFXStencilFace, writeMask: number) {
        if (!this._curStencilWriteMask) {
            this._curStencilWriteMask = {
                face,
                writeMask,
            };
            this._isStateInvalied = true;
        } else {
            if (this._curStencilWriteMask.face !== face ||
                this._curStencilWriteMask.writeMask !== writeMask) {

                this._curStencilWriteMask.face = face;
                this._curStencilWriteMask.writeMask = writeMask;
                this._isStateInvalied = true;
            }
        }
    }

    public setStencilCompareMask (face: GFXStencilFace, reference: number, compareMask: number) {
        if (!this._curStencilCompareMask) {
            this._curStencilCompareMask = {
                face,
                reference,
                compareMask,
            };
            this._isStateInvalied = true;
        } else {
            if (this._curStencilCompareMask.face !== face ||
                this._curStencilCompareMask.reference !== reference ||
                this._curStencilCompareMask.compareMask !== compareMask) {

                this._curStencilCompareMask.face = face;
                this._curStencilCompareMask.reference = reference;
                this._curStencilCompareMask.compareMask = compareMask;
                this._isStateInvalied = true;
            }
        }
    }

    public draw (inputAssembler: GFXInputAssembler) {
        if (this._type === GFXCommandBufferType.PRIMARY && this._isInRenderPass ||
            this._type === GFXCommandBufferType.SECONDARY) {
            if (this._isStateInvalied) {
                this.bindStates();
            }

            const cmd = ( this._allocator as WebGL2GFXCommandAllocator).
                        drawCmdPool.alloc(WebGL2CmdDraw);
            (inputAssembler as WebGL2GFXInputAssembler).extractCmdDraw(cmd);
            this.cmdPackage.drawCmds.push(cmd);

            this.cmdPackage.cmds.push(WebGL2Cmd.DRAW);

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

    public updateBuffer (buffer: GFXBuffer, data: GFXBufferSource, offset?: number, size?: number) {
        if (this._type === GFXCommandBufferType.PRIMARY && !this._isInRenderPass ||
            this._type === GFXCommandBufferType.SECONDARY) {
            const gpuBuffer = (buffer as WebGL2GFXBuffer).gpuBuffer;
            if (gpuBuffer) {
                const cmd = this._webGLAllocator!.updateBufferCmdPool.alloc(WebGL2CmdUpdateBuffer);
                let buffSize;
                if (size !== undefined ) {
                    buffSize = size;
                } else if (buffer.usage & GFXBufferUsageBit.INDIRECT) {
                    buffSize = 0;
                } else {
                    buffSize = (data as ArrayBuffer).byteLength;
                }

                const buff = data as ArrayBuffer;

                cmd.gpuBuffer = gpuBuffer;
                cmd.buffer = buff;
                cmd.offset = (offset !== undefined ? offset : 0);
                cmd.size = buffSize;
                this.cmdPackage.updateBufferCmds.push(cmd);

                this.cmdPackage.cmds.push(WebGL2Cmd.UPDATE_BUFFER);
            }
        } else {
            console.error('Command \'updateBuffer\' must be recorded outside a render pass.');
        }
    }

    public copyBufferToTexture (
        srcBuff: GFXBuffer,
        dstTex: GFXTexture,
        dstLayout: GFXTextureLayout,
        regions: GFXBufferTextureCopy[]) {

        if (this._type === GFXCommandBufferType.PRIMARY && !this._isInRenderPass ||
            this._type === GFXCommandBufferType.SECONDARY) {
            const gpuBuffer = ( srcBuff as WebGL2GFXBuffer).gpuBuffer;
            const gpuTexture = ( dstTex as WebGL2GFXTexture).gpuTexture;
            if (gpuBuffer && gpuTexture) {
                const cmd = this._webGLAllocator!.copyBufferToTextureCmdPool.alloc(WebGL2CmdCopyBufferToTexture);
                cmd.gpuBuffer = gpuBuffer;
                cmd.gpuTexture = gpuTexture;
                cmd.dstLayout = dstLayout;
                cmd.regions = regions;
                this.cmdPackage.copyBufferToTextureCmds.push(cmd);

                this.cmdPackage.cmds.push(WebGL2Cmd.COPY_BUFFER_TO_TEXTURE);
            }
        } else {
            console.error('Command \'copyBufferToTexture\' must be recorded outside a render pass.');
        }
    }

    public execute (cmdBuffs: GFXCommandBuffer[], count: number) {

        for (let i = 0; i < count; ++i) {
            const webGL2CmdBuff = cmdBuffs[i] as WebGL2GFXCommandBuffer;

            for (let c = 0; c < webGL2CmdBuff.cmdPackage.beginRenderPassCmds.length; ++c) {
                const cmd = webGL2CmdBuff.cmdPackage.beginRenderPassCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.beginRenderPassCmds.push(cmd);
            }

            for (let c = 0; c < webGL2CmdBuff.cmdPackage.bindStatesCmds.length; ++c) {
                const cmd = webGL2CmdBuff.cmdPackage.bindStatesCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.bindStatesCmds.push(cmd);
            }

            for (let c = 0; c < webGL2CmdBuff.cmdPackage.drawCmds.length; ++c) {
                const cmd = webGL2CmdBuff.cmdPackage.drawCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.drawCmds.push(cmd);
            }

            for (let c = 0; c < webGL2CmdBuff.cmdPackage.updateBufferCmds.length; ++c) {
                const cmd = webGL2CmdBuff.cmdPackage.updateBufferCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.updateBufferCmds.push(cmd);
            }

            for (let c = 0; c < webGL2CmdBuff.cmdPackage.copyBufferToTextureCmds.length; ++c) {
                const cmd = webGL2CmdBuff.cmdPackage.copyBufferToTextureCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.copyBufferToTextureCmds.push(cmd);
            }

            this.cmdPackage.cmds.concat(webGL2CmdBuff.cmdPackage.cmds.array);

            this._numDrawCalls += webGL2CmdBuff._numDrawCalls;
            this._numInstances += webGL2CmdBuff._numInstances;
            this._numTris += webGL2CmdBuff._numTris;
        }
    }

    public get webGLDevice (): WebGL2GFXDevice {
        return this._device as WebGL2GFXDevice;
    }

    protected bindStates () {
        const bindStatesCmd = this._webGLAllocator!.bindStatesCmdPool.alloc(WebGL2CmdBindStates);
        bindStatesCmd.gpuPipelineState = this._curGPUPipelineState;
        bindStatesCmd.gpuBindingLayout = this._curGPUBindingLayout;
        bindStatesCmd.gpuInputAssembler = this._curGPUInputAssembler;
        bindStatesCmd.viewport = this._curViewport;
        bindStatesCmd.scissor = this._curScissor;
        bindStatesCmd.lineWidth = this._curLineWidth;
        bindStatesCmd.depthBias = this._curDepthBias;
        bindStatesCmd.blendConstants = this._curBlendConstants;
        bindStatesCmd.depthBounds = this._curDepthBounds;
        bindStatesCmd.stencilWriteMask = this._curStencilWriteMask;
        bindStatesCmd.stencilCompareMask = this._curStencilCompareMask;

        this.cmdPackage.bindStatesCmds.push(bindStatesCmd);
        this.cmdPackage.cmds.push(WebGL2Cmd.BIND_STATES);

        this._isStateInvalied = false;
    }
}
