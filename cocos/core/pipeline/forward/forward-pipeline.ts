/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * @packageDocumentation
 * @module pipeline
 */

import { ccclass, displayOrder, type, serializable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { RenderPipeline, IRenderPipelineInfo } from '../render-pipeline';
import { ForwardFlow } from './forward-flow';
import { RenderTextureConfig } from '../pipeline-serialization';
import { ShadowFlow } from '../shadow/shadow-flow';
import { UBOGlobal, UBOShadow, UBOCamera, UNIFORM_SHADOWMAP_BINDING, UNIFORM_SPOT_LIGHTING_MAP_TEXTURE_BINDING } from '../define';
import { ColorAttachment, DepthStencilAttachment, RenderPass, LoadOp,
    RenderPassInfo, ClearFlagBit, ClearFlags, Filter, Address, StoreOp, AccessType } from '../../gfx';
import { SKYBOX_FLAG } from '../../renderer/scene/camera';
import { genSamplerHash, samplerLib } from '../../renderer/core/sampler-lib';
import { builtinResMgr } from '../../builtin';
import { Texture2D } from '../../assets/texture-2d';
import { Camera } from '../../renderer/scene';
import { errorID, warnID } from '../../platform/debug';
import { sceneCulling } from '../scene-culling';
import { PipelineSceneData } from '../pipeline-scene-data';

const PIPELINE_TYPE = 0;

const _samplerInfo = [
    Filter.POINT,
    Filter.POINT,
    Filter.NONE,
    Address.CLAMP,
    Address.CLAMP,
    Address.CLAMP,
];

/**
 * @en The forward render pipeline
 * @zh 前向渲染管线。
 */
@ccclass('ForwardPipeline')
export class ForwardPipeline extends RenderPipeline {
    @type([RenderTextureConfig])
    @serializable
    @displayOrder(2)
    protected renderTextures: RenderTextureConfig[] = [];

    protected _renderPasses = new Map<ClearFlags, RenderPass>();

    public initialize (info: IRenderPipelineInfo): boolean {
        super.initialize(info);

        if (this._flows.length === 0) {
            const shadowFlow = new ShadowFlow();
            shadowFlow.initialize(ShadowFlow.initInfo);
            this._flows.push(shadowFlow);

            const forwardFlow = new ForwardFlow();
            forwardFlow.initialize(ForwardFlow.initInfo);
            this._flows.push(forwardFlow);
        }

        return true;
    }

    public activate (): boolean {
        if (EDITOR) { warnID(1218); }

        this._macros = { CC_PIPELINE_TYPE: PIPELINE_TYPE };
        this._pipelineSceneData = new PipelineSceneData();

        if (!super.activate()) {
            return false;
        }

        if (!this._activeRenderer()) {
            errorID(2402);
            return false;
        }

        return true;
    }

    public render (cameras: Camera[]) {
        this._commandBuffers[0].begin();
        this._pipelineUBO.updateGlobalUBO();
        for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];
            if (camera.scene) {
                sceneCulling(this, camera);
                this._pipelineUBO.updateCameraUBO(camera);
                for (let j = 0; j < this._flows.length; j++) {
                    this._flows[j].render(camera);
                }
            }
        }
        this._commandBuffers[0].end();
        this._device.flushCommands(this._commandBuffers);
        this._device.queue.submit(this._commandBuffers);
    }

    public getRenderPass (clearFlags: ClearFlags): RenderPass {
        let renderPass = this._renderPasses.get(clearFlags);
        if (renderPass) { return renderPass; }

        const device = this.device;
        const colorAttachment = new ColorAttachment();
        const depthStencilAttachment = new DepthStencilAttachment();
        colorAttachment.format = device.colorFormat;
        depthStencilAttachment.format = device.depthStencilFormat;
        depthStencilAttachment.stencilStoreOp = StoreOp.DISCARD;
        depthStencilAttachment.depthStoreOp = StoreOp.DISCARD;

        if (!(clearFlags & ClearFlagBit.COLOR)) {
            if (clearFlags & SKYBOX_FLAG) {
                colorAttachment.loadOp = LoadOp.DISCARD;
            } else {
                colorAttachment.loadOp = LoadOp.LOAD;
                colorAttachment.beginAccesses = [AccessType.PRESENT];
            }
        }

        if ((clearFlags & ClearFlagBit.DEPTH_STENCIL) !== ClearFlagBit.DEPTH_STENCIL) {
            if (!(clearFlags & ClearFlagBit.DEPTH)) depthStencilAttachment.depthLoadOp = LoadOp.LOAD;
            if (!(clearFlags & ClearFlagBit.STENCIL)) depthStencilAttachment.stencilLoadOp = LoadOp.LOAD;
            depthStencilAttachment.beginAccesses = [AccessType.DEPTH_STENCIL_ATTACHMENT_WRITE];
        }

        const renderPassInfo = new RenderPassInfo([colorAttachment], depthStencilAttachment);
        renderPass = device.createRenderPass(renderPassInfo);
        this._renderPasses.set(clearFlags, renderPass);

        return renderPass;
    }

    private _activeRenderer () {
        const device = this.device;

        this._commandBuffers.push(device.commandBuffer);

        const shadowMapSamplerHash = genSamplerHash(_samplerInfo);
        const shadowMapSampler = samplerLib.getSampler(device, shadowMapSamplerHash);
        this._descriptorSet.bindSampler(UNIFORM_SHADOWMAP_BINDING, shadowMapSampler);
        this._descriptorSet.bindTexture(UNIFORM_SHADOWMAP_BINDING, builtinResMgr.get<Texture2D>('default-texture').getGFXTexture()!);
        this._descriptorSet.bindSampler(UNIFORM_SPOT_LIGHTING_MAP_TEXTURE_BINDING, shadowMapSampler);
        this._descriptorSet.bindTexture(UNIFORM_SPOT_LIGHTING_MAP_TEXTURE_BINDING, builtinResMgr.get<Texture2D>('default-texture').getGFXTexture()!);
        this._descriptorSet.update();

        return true;
    }

    private destroyUBOs () {
        if (this._descriptorSet) {
            this._descriptorSet.getBuffer(UBOGlobal.BINDING).destroy();
            this._descriptorSet.getBuffer(UBOShadow.BINDING).destroy();
            this._descriptorSet.getBuffer(UBOCamera.BINDING).destroy();
            this._descriptorSet.getSampler(UNIFORM_SHADOWMAP_BINDING).destroy();
            this._descriptorSet.getSampler(UNIFORM_SPOT_LIGHTING_MAP_TEXTURE_BINDING).destroy();
            this._descriptorSet.getTexture(UNIFORM_SHADOWMAP_BINDING).destroy();
            this._descriptorSet.getTexture(UNIFORM_SPOT_LIGHTING_MAP_TEXTURE_BINDING).destroy();
        }
    }

    public destroy () {
        this.destroyUBOs();

        const rpIter = this._renderPasses.values();
        let rpRes = rpIter.next();
        while (!rpRes.done) {
            rpRes.value.destroy();
            rpRes = rpIter.next();
        }

        this._commandBuffers.length = 0;

        return super.destroy();
    }
}
