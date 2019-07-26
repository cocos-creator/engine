/**
 * @category pipeline.ppfx
 */

import { ccclass } from '../../core/data/class-decorator';
import { IRenderFlowInfo, RenderFlow } from '../render-flow';
import { ToneMapStage } from './tonemap-stage';

/**
 * @zh
 * 色调映射渲染流程。
 */
@ccclass('ToneMapFlow')
export class ToneMapFlow extends RenderFlow {

    constructor () {
        super();
    }

    public initialize (info: IRenderFlowInfo): boolean {

        if (info.name !== undefined) {
            this._name = info.name;
        }

        this._priority = info.priority;

        const material = this._material;
        material.recompileShaders({
            defines: { CC_USE_SMAA: this._pipeline.useSMAA },
        });

        const framebuffer = this._pipeline.root.mainWindow!.framebuffer!;

        this.createStage(ToneMapStage, {
            name: 'ToneMapStage',
            priority: 0,
            framebuffer,
        });

        return true;
    }

    public destroy () {
        if (this._material) {
            this._material.destroy();
        }
        this.destroyStages();
    }

    public rebuild () {
        if (this._material) {
            this._material.recompileShaders({
                defines: { CC_USE_SMAA: this._pipeline.useSMAA },
            });
        }

        for (const stage of this._stages) {
            stage.rebuild();
        }
    }
}
