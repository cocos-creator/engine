import { GFXCommandBuffer } from '../../gfx/command-buffer';
import { GFXCommandBufferType, IGFXColor } from '../../gfx/define';
import { GFXFramebuffer } from '../../gfx/framebuffer';
import { Camera } from '../../renderer/scene/camera';
import { RenderFlow } from '../render-flow';
import { IRenderStageInfo, RenderStage } from '../render-stage';
import { RenderView } from '../render-view';
import { GFXPipelineState } from '../../gfx/pipeline-state';
import { UBOGlobal } from '../define';

const colors: IGFXColor[] = [];
const bufs: GFXCommandBuffer[] = [];

export class ToneMapStage extends RenderStage {

    constructor (flow: RenderFlow) {
        super(flow);
    }

    public initialize (info: IRenderStageInfo): boolean {

        if (info.name !== undefined) {
            this._name = info.name;
        }

        this._priority = info.priority;
        this._framebuffer = info.framebuffer;

        this._cmdBuff = this._device.createCommandBuffer({
            allocator: this._device.commandAllocator,
            type: GFXCommandBufferType.PRIMARY,
        });

        this._pass = this._flow.material.passes[0];
        const binding = this._pass.getBinding('u_texSampler');

        const globalUBO = this._pipeline.globalBindings.get(UBOGlobal.BLOCK.name);
        this._pass.bindBuffer(UBOGlobal.BLOCK.binding, globalUBO!.buffer!);
        this._pass.bindTextureView(binding, this._pipeline.shadingTexView);
        this._pass.update();

        this._pso = this._pass.createPipelineState();
        this._pso!.pipelineLayout.layouts[0].update();

        return true;
    }

    public destroy () {
        if (this._cmdBuff) {
            this._cmdBuff.destroy();
            this._cmdBuff = null;
        }
    }

    public resize (width: number, height: number) {
    }

    public render (view: RenderView) {

        const camera = view.camera!;

        if (this._cmdBuff && camera.view.window) {

            this._renderArea.width = camera.width;
            this._renderArea.height = camera.height;
            const framebuffer = camera.view.window.framebuffer;

            this._cmdBuff.begin();
            this._cmdBuff.beginRenderPass(framebuffer, this._renderArea, [{ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }], 1.0, 0);
            this._cmdBuff.bindPipelineState(this._pso!);
            this._cmdBuff.bindBindingLayout(this._pso!.pipelineLayout.layouts[0]);
            this._cmdBuff.bindInputAssembler(this._pipeline.quadIA);
            this._cmdBuff.draw(this._pipeline.quadIA);
            this._cmdBuff.endRenderPass();
            this._cmdBuff.end();
        }

        this._device.queue.submit([this._cmdBuff!]);
    }
}
