/**
 * @category pipeline
 */

import { GFXCommandBuffer } from '../gfx/command-buffer';
import { RecyclePool } from '../memop';
import { CachedArray } from '../memop/cached-array';
import { IRenderObject, IRenderPass, IRenderQueueDesc } from './define';
import { GFXInputAssembler } from '../gfx/input-assembler';
import { PipelineStateManager } from './pipeline-state-manager';
import { GFXDevice } from '../gfx/device';
import { GFXRenderPass } from '../gfx';

/**
 * @en
 * Comparison sorting function. Opaque objects are sorted by priority -> depth front to back -> shader ID.
 * @zh
 * 比较排序函数。不透明对象按优先级 -> 深度由前向后 -> Shader ID 顺序排序。
 */
export function opaqueCompareFn (a: IRenderPass, b: IRenderPass) {
    return (a.hash - b.hash) || (a.depth - b.depth) || (a.shaderId - b.shaderId);
}

/**
 * @en
 * Comparison sorting function. Transparent objects are sorted by priority -> depth back to front -> shader ID.
 * @zh
 * 比较排序函数。半透明对象按优先级 -> 深度由后向前 -> Shader ID 顺序排序。
 */
export function transparentCompareFn (a: IRenderPass, b: IRenderPass) {
    return (a.hash - b.hash) || (b.depth - a.depth) || (a.shaderId - b.shaderId);
}

/**
 * @zh
 * 渲染队列。
 */
export class RenderQueue {

    /**
     * @zh
     * 基于缓存数组的队列。
     */
    public queue: CachedArray<IRenderPass>;

    private _passDesc: IRenderQueueDesc;
    private _passPool: RecyclePool<IRenderPass>;

    /**
     * 构造函数。
     * @param desc 渲染队列描述。
     */
    constructor (desc: IRenderQueueDesc) {
        this._passDesc = desc;
        this._passPool = new RecyclePool(() => ({
            hash: 0,
            depth: 0,
            shaderId: 0,
            subModel: null!,
            passIdx: 0,
        }), 64);
        this.queue = new CachedArray(64, this._passDesc.sortFunc);
    }

    /**
     * @zh
     * 清空渲染队列。
     */
    public clear () {
        this.queue.clear();
        this._passPool.reset();
    }

    /**
     * @zh
     * 插入渲染过程。
     */
    public insertRenderPass (renderObj: IRenderObject, subModelIdx: number, passIdx: number): boolean {
        const subModel = renderObj.model.getSubModel(subModelIdx);
        const pass = subModel.passes[passIdx];
        const psoCreateInfo = subModel.psoInfos[passIdx];
        const isTransparent = psoCreateInfo.blendState.targets[0].blend;
        if (isTransparent !== this._passDesc.isTransparent || !(pass.phase & this._passDesc.phases)) {
            return false;
        }
        const hash = (0 << 30) | pass.priority << 16 | subModel.priority << 8 | passIdx;
        const rp = this._passPool.add();
        rp.hash = hash;
        rp.depth = renderObj.depth || 0;
        rp.shaderId = psoCreateInfo.shader.id;
        rp.subModel = subModel;
        rp.passIdx = passIdx;
        this.queue.push(rp);
        return true;
    }

    /**
     * @zh
     * 排序渲染队列。
     */
    public sort () {
        this.queue.sort();
    }

    public recordCommandBuffer (device: GFXDevice, renderPass: GFXRenderPass, cmdBuff: GFXCommandBuffer) {
        for (let i = 0; i < this.queue.length; ++i) {
            const subModel = this.queue.array[i].subModel;
            const passIdx = this.queue.array[i].passIdx;
            const ia = subModel.inputAssembler as GFXInputAssembler;
            const psoCreateInfo = subModel.psoInfos[passIdx];
            const pso = PipelineStateManager.getOrCreatePipelineState(device, psoCreateInfo, renderPass, ia);
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindBindingLayout(psoCreateInfo.bindingLayout);
            cmdBuff.bindInputAssembler(ia);
            cmdBuff.draw(ia);
        }
    }
}
