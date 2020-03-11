/**
 * @category pipeline
 */

import { GFXCommandBuffer } from '../gfx/command-buffer';
import { BatchedBuffer } from './batched-buffer';

/**
 * @zh
 * 渲染合批队列。
 */
export class RenderBatchedQueue {

    /**
     * @zh
     * 基于缓存数组的队列。
     */
    public queue = new Set<BatchedBuffer>();

    /**
     * 构造函数。
     * @param desc 渲染队列描述。
     */
    constructor () {
    }

    /**
     * @zh
     * 清空渲染队列。
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
     * @zh
     * 记录命令缓冲。
     */
    public recordCommandBuffer (cmdBuff: GFXCommandBuffer) {
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
                if (!boundPSO) { cmdBuff.bindPipelineState(batch.pso); boundPSO = true; }
                cmdBuff.bindBindingLayout(batch.pso.pipelineLayout.layouts[0]);
                cmdBuff.bindInputAssembler(batch.ia);
                cmdBuff.draw(batch.ia);
            }
            res = it.next();
        }
    }
}
