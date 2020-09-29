/**
 * @category pipeline.forward
 */

import { ccclass } from 'cc.decorator';
import { PIPELINE_FLOW_SHADOW, UNIFORM_SHADOWMAP_BINDING } from '../define';
import { IRenderFlowInfo, RenderFlow } from '../render-flow';
import { ForwardFlowPriority } from '../forward/enum';
import { ShadowStage } from './shadow-stage';
import { GFXFramebuffer, GFXRenderPass, GFXLoadOp,
    GFXStoreOp, GFXTextureLayout, GFXFormat, GFXTexture,
    GFXTextureType, GFXTextureUsageBit, GFXColorAttachment, GFXDepthStencilAttachment, GFXRenderPassInfo, GFXTextureInfo, GFXFramebufferInfo } from '../../gfx';
import { RenderFlowTag } from '../pipeline-serialization';
import { ForwardPipeline } from '../forward/forward-pipeline';
import { RenderView } from '../render-view';
import { ShadowType } from '../../renderer/scene/shadows';

/**
 * @zh 阴影贴图绘制流程
 */
@ccclass('ShadowFlow')
export class ShadowFlow extends RenderFlow {

    public get shadowFrameBuffer () {
        return this._shadowFrameBuffer;
    }

    public static initInfo: IRenderFlowInfo = {
        name: PIPELINE_FLOW_SHADOW,
        priority: ForwardFlowPriority.SHADOW,
        tag: RenderFlowTag.SCENE,
        stages: []
    };

    private _shadowRenderPass: GFXRenderPass|null = null;
    private _shadowRenderTargets: GFXTexture[] = [];
    private _shadowFrameBuffer: GFXFramebuffer|null = null;
    private _depth: GFXTexture|null = null;
    private _width: number = 0;
    private _height: number = 0;

    public initialize (info: IRenderFlowInfo): boolean{
        super.initialize(info);
        if (this._stages.length === 0) {
            // add shadowMap-stages
            const shadowMapStage = new ShadowStage();
            shadowMapStage.initialize(ShadowStage.initInfo);
            this._stages.push(shadowMapStage);
        }
        return true;
    }

    public activate (pipeline: ForwardPipeline) {
        super.activate(pipeline);

        const device = pipeline.device;
        const shadowMapSize = pipeline.shadows.size;
        this._width = shadowMapSize.x;
        this._height = shadowMapSize.y;

        if(!this._shadowRenderPass) {

            const colorAttachment = new GFXColorAttachment();
            colorAttachment.format = GFXFormat.RGBA8;
            colorAttachment.loadOp = GFXLoadOp.CLEAR; // should clear color attachment
            colorAttachment.storeOp = GFXStoreOp.STORE;
            colorAttachment.sampleCount = 1;
            colorAttachment.beginLayout = GFXTextureLayout.UNDEFINED;
            colorAttachment.endLayout = GFXTextureLayout.PRESENT_SRC;

            const depthStencilAttachment = new GFXDepthStencilAttachment();
            depthStencilAttachment.format = device.depthStencilFormat;
            depthStencilAttachment.depthLoadOp = GFXLoadOp.CLEAR;
            depthStencilAttachment.depthStoreOp = GFXStoreOp.STORE;
            depthStencilAttachment.stencilLoadOp = GFXLoadOp.CLEAR;
            depthStencilAttachment.stencilStoreOp = GFXStoreOp.STORE;
            depthStencilAttachment.sampleCount = 1;
            depthStencilAttachment.beginLayout = GFXTextureLayout.UNDEFINED;
            depthStencilAttachment.endLayout = GFXTextureLayout.DEPTH_STENCIL_ATTACHMENT_OPTIMAL;

            const renderPassInfo = new GFXRenderPassInfo([colorAttachment], depthStencilAttachment);
            this._shadowRenderPass = device.createRenderPass(renderPassInfo);
        }

        if(this._shadowRenderTargets.length < 1) {
            this._shadowRenderTargets.push(device.createTexture(new GFXTextureInfo(
                GFXTextureType.TEX2D,
                GFXTextureUsageBit.COLOR_ATTACHMENT | GFXTextureUsageBit.SAMPLED,
                GFXFormat.RGBA8,
                this._width,
                this._height,
            )));
        }

        if(!this._depth) {
            this._depth = device.createTexture(new GFXTextureInfo(
                GFXTextureType.TEX2D,
                GFXTextureUsageBit.DEPTH_STENCIL_ATTACHMENT,
                device.depthStencilFormat,
                this._width,
                this._height,
            ));
        }

        if(!this._shadowFrameBuffer) {
            this._shadowFrameBuffer = device.createFramebuffer(new GFXFramebufferInfo(
                this._shadowRenderPass,
                this._shadowRenderTargets,
                this._depth,
            ));
        }

        for (let i = 0; i < this._stages.length; ++i) {
            (this._stages[i] as ShadowStage).setShadowFrameBuffer(this._shadowFrameBuffer);
        }
    }

    public render (view: RenderView) {
        const pipeline = this._pipeline as ForwardPipeline;
        const shadowInfo = pipeline.shadows;
        if (shadowInfo.type !== ShadowType.ShadowMap) { return; }

        const shadowMapSize = shadowInfo.size;
        if (this._width !== shadowMapSize.x || this._height !== shadowMapSize.y) {
            this.resizeShadowMap(shadowMapSize.x,shadowMapSize.y);
            this._width = shadowMapSize.x;
            this._height = shadowMapSize.y;
        }

        pipeline.updateUBOs(view);
        super.render(view);
        pipeline.descriptorSet.bindTexture(UNIFORM_SHADOWMAP_BINDING, this._shadowFrameBuffer!.colorTextures[0]!);
    }

    private resizeShadowMap (width: number, height: number) {
        if (this._depth) {
            this._depth.resize(width, height);
        }

        if (this._shadowRenderTargets.length > 0) {
            for (let i = 0; i< this._shadowRenderTargets.length; i++) {
                const renderTarget = this._shadowRenderTargets[i];
                if (renderTarget) { renderTarget.resize(width, height); }
            }
        }

        if(this._shadowFrameBuffer) {
            this._shadowFrameBuffer.destroy();
            this._shadowFrameBuffer.initialize(new GFXFramebufferInfo(
                this._shadowRenderPass!,
                this._shadowRenderTargets,
                this._depth,
            ));
        }
    }
}
