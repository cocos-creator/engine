/**
 * @category pipeline
 */

import { GFXCommandBuffer } from '../gfx/command-buffer';
import { GFXBuffer } from '../gfx/buffer';
import { BatchedBuffer } from './batched-buffer';
import { PipelineStateManager } from './pipeline-state-manager';
import { GFXDevice } from '../gfx/device';
import { GFXRenderPass } from '../gfx';
import { IPSOCreateInfo } from '../renderer';
import { IRenderObject, UBOForwardLight } from './define';
import { LightType, Light } from '../renderer/scene/light';
import { IMacroPatch, Pass } from '../renderer/core/pass';

const spherePatches: IMacroPatch[] = [
    { name: 'CC_FORWARD_ADD', value: true },
];
const spotPatches: IMacroPatch[] = [
    { name: 'CC_FORWARD_ADD', value: true },
    { name: 'CC_SPOTLIGHT', value: true },
];

/**
 * @en The render queue for dynamic batching
 * @zh 渲染合批队列。
 */
export class RenderBatchedQueue {

    /**
     * @en A set of dynamic batched buffer
     * @zh 动态合批缓存集合。
     */
    public queue = new Set<BatchedBuffer>();

    private static _lightPsoCreateInfos: IPSOCreateInfo[] = [];

    public static getLightPipelineCreateInfo (renderObj: IRenderObject, subModelIdx: number, pass: Pass,
        validLights: Light[], lightGFXBuffers: GFXBuffer[], lightIdx: number): IPSOCreateInfo {
        if (!this._lightPsoCreateInfos[lightIdx]) {
            const modelPatches = renderObj.model.getMacroPatches(subModelIdx);
            const light = validLights[lightIdx];
            const lightBuffer = lightGFXBuffers[lightIdx];

            let fullPatches: IMacroPatch[] = [];
            switch (light.type) {
                case LightType.SPHERE:
                    fullPatches = modelPatches ? spherePatches.concat(modelPatches) : spherePatches;
                    break;
                case LightType.SPOT:
                    fullPatches = modelPatches ? spotPatches.concat(modelPatches) : spotPatches;
                    break;
            }

            const psoci = pass.createPipelineStateCI(fullPatches)!;
            this._lightPsoCreateInfos[lightIdx] = psoci;
            renderObj.model.updateLocalBindings(psoci, subModelIdx);
            psoci.bindingLayout.bindBuffer(UBOForwardLight.BLOCK.binding, lightBuffer);
            psoci.bindingLayout.update();
        }

        return this._lightPsoCreateInfos[lightIdx];
    }

    /**
     * @en Clear the render queue
     * @zh 清空渲染队列。
     */
    public clear () {
        const it = this.queue.values(); let res = it.next();
        while (!res.done) {
            res.value.clear();
            res = it.next();
        }
        this.queue.clear();
    }

    /**
     * @en Record command buffer for the current queue
     * @zh 记录命令缓冲。
     * @param cmdBuff The command buffer to store the result
     */
    public recordCommandBuffer (device: GFXDevice, renderPass: GFXRenderPass, cmdBuff: GFXCommandBuffer) {
        const it = this.queue.values(); let res = it.next();
        while (!res.done) {
            let boundPSO = false;
            for (let b = 0; b < res.value.batches.length; ++b) {
                const batch = res.value.batches[b];
                if (!batch.mergeCount) { continue; }
                for (let v = 0; v < batch.vbs.length; ++v) {
                    batch.vbs[v].update(batch.vbDatas[v]);
                }
                batch.vbIdx.update(batch.vbIdxData.buffer);
                batch.ubo.update(batch.uboData.view);
                const pso = PipelineStateManager.getOrCreatePipelineState(device, batch.psoCreateInfo, renderPass, batch.ia);
                if (!boundPSO) {
                    cmdBuff.bindPipelineState(pso);
                    boundPSO = true;
                }
                cmdBuff.bindBindingLayout(batch.psoCreateInfo.bindingLayout);
                cmdBuff.bindInputAssembler(batch.ia);
                cmdBuff.draw(batch.ia);
            }
            res = it.next();
        }
    }
}
