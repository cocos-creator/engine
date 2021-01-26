/*
 Copyright (c) Huawei Technologies Co., Ltd. 2020-2021.

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
 * @category pipeline
 */

import { ccclass, displayOrder, type, serializable } from 'cc.decorator';
import { SetIndex } from '../define';
import { Color, Rect, Shader } from '../../gfx';
import { IRenderStageInfo, RenderStage } from '../render-stage';
import { DeferredStagePriority } from './enum';
import { LightingFlow } from './lighting-flow';
import { DeferredPipeline } from './deferred-pipeline';
import { Material } from '../../assets/material';
import { ShaderPool } from '../../renderer/core/memory-pools';
import { PipelineStateManager } from '../pipeline-state-manager';
import { PipelineState } from '../../gfx/pipeline-state';
import { Pass } from '../../renderer';
import { builtinResMgr } from 'cocos/core';
import { UIPhase } from '../forward/ui-phase';
import { Camera } from 'cocos/core/renderer/scene';

const colors: Color[] = [ new Color(0, 0, 0, 1) ];
const POSTPROCESSPASS_INDEX = 0;

/**
 * @en The postprocess render stage
 * @zh 前向渲染阶段。
 */
@ccclass('PostprocessStage')
export class PostprocessStage extends RenderStage {

    private _renderArea = new Rect();

    public static initInfo: IRenderStageInfo = {
        name: 'PostprocessStage',
        priority: DeferredStagePriority.POSTPROCESS,
        tag: 0
    };

    @type(Material)
    @serializable
    @displayOrder(3)
    private _postprocessMaterial: Material | null = null;
    private _uiPhase: UIPhase;

    set material (val) {
        if (this._postprocessMaterial === val) {
            return
        }

        this._postprocessMaterial = val;
    }

    constructor () {
        super();
        this._uiPhase = new UIPhase();
    }

    public initialize (info: IRenderStageInfo): boolean {
        super.initialize(info);
        return true;
    }

    public activate (pipeline: DeferredPipeline, flow: LightingFlow) {
        super.activate(pipeline, flow);
        this._uiPhase.activate(pipeline);
    }

    public destroy () {
    }

    public render (camera: Camera) {
        const pipeline = this._pipeline as DeferredPipeline;
        const device = pipeline.device;

        const cmdBuff = pipeline.commandBuffers[0];

        const vp = camera.viewport;
        this._renderArea!.x = vp.x * camera.width;
        this._renderArea!.y = vp.y * camera.height;
        this._renderArea!.width = vp.width * camera.width * pipeline.pipelineSceneData.shadingScale;
        this._renderArea!.height = vp.height * camera.height * pipeline.pipelineSceneData.shadingScale;

        const framebuffer = camera.window!.framebuffer;
        const renderPass = framebuffer.colorTextures[0] ? framebuffer.renderPass : pipeline.getRenderPass(camera.clearFlag);

        cmdBuff.beginRenderPass(renderPass, framebuffer, this._renderArea!,
            colors, camera.clearDepth, camera.clearStencil);

        cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);

        // Postprocess
        var pass: Pass;
        var shader: Shader;
        const builtinPostProcess = builtinResMgr.get<Material>('builtin-post-process-material');
        if (builtinPostProcess) {
            pass = builtinPostProcess.passes[0];
            shader = ShaderPool.get(pass.getShaderVariant());
        } else {
            pass = this._postprocessMaterial!.passes[POSTPROCESSPASS_INDEX];
            shader = ShaderPool.get(this._postprocessMaterial!.passes[POSTPROCESSPASS_INDEX].getShaderVariant());
        }

        const inputAssembler = camera.window!.hasOffScreenAttachments ? pipeline.quadIAOffscreen : pipeline.quadIAOnscreen;
        var pso:PipelineState|null = null;
        if (pass != null && shader != null && inputAssembler != null)
        {
            pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, inputAssembler);
        }

        if(pso != null)
        {
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
        }

        this._uiPhase.render(camera, renderPass);

        cmdBuff.endRenderPass();
    }
}
