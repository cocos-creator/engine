/**
 * @category pipeline
 */

import { GFXCommandBuffer } from '../gfx/command-buffer';
import { RecyclePool } from '../memop';
import { CachedArray } from '../memop/cached-array';
import { IRenderObject, IRenderPass, IRenderQueueDesc } from './define';

/**
 * @en Comparison sorting function. Opaque objects are sorted by priority -> depth front to back -> shader ID.
 * @zh 比较排序函数。不透明对象按优先级 -> 深度由前向后 -> Shader ID 顺序排序。
 */
export function opaqueCompareFn (a: IRenderPass, b: IRenderPass) {
    return (a.hash - b.hash) || (a.depth - b.depth) || (a.shaderId - b.shaderId);
}

/**
 * @en Comparison sorting function. Transparent objects are sorted by priority -> depth back to front -> shader ID.
 * @zh 比较排序函数。半透明对象按优先级 -> 深度由后向前 -> Shader ID 顺序排序。
 */
export function transparentCompareFn (a: IRenderPass, b: IRenderPass) {
    return (a.hash - b.hash) || (b.depth - a.depth) || (a.shaderId - b.shaderId);
}

/**
 * @en The render queue. It manages a [[GFXRenderPass]] queue which will be executed by the [[RenderStage]].
 * @zh 渲染队列。它管理一个 [[GFXRenderPass]] 队列，队列中的渲染过程会被 [[RenderStage]] 所执行。
 */
export class RenderQueue {

    /**
     * @en A cached array of render passes
     * @zh 基于缓存数组的渲染过程队列。
     */
    public queue: CachedArray<IRenderPass>;

    /**
     * @en A cached array of command buffers
     * @zh 基于缓存数组的命令缓冲队列。
     */
    public cmdBuffs: CachedArray<GFXCommandBuffer>;

    /**
     * @en Command buffer count.
     * @zh 命令缓冲数量。
     */
    public cmdBuffCount: number = 0;

    private _passDesc: IRenderQueueDesc;
    private _passPool: RecyclePool<IRenderPass>;

    /**
     * @en Construct a RenderQueue with render queue descriptor
     * @zh 利用渲染队列描述来构造一个 RenderQueue。
     * @param desc Render queue descriptor
     */
    constructor (desc: IRenderQueueDesc) {
        this._passDesc = desc;
        this._passPool = new RecyclePool(() => ({
            hash: 0,
            depth: 0,
            shaderId: 0,
            subModel: null!,
            cmdBuff: null!,
        }), 64);
        this.cmdBuffs = new CachedArray(64);
        this.queue = new CachedArray(64, this._passDesc.sortFunc);
    }

    /**
     * @en Clear the render queue
     * @zh 清空渲染队列。
     */
    public clear () {
        this.queue.clear();
        this._passPool.reset();
        this.cmdBuffCount = 0;
    }

    /**
     * @en Insert a render pass into the queue
     * @zh 插入渲染过程。
     * @param renderObj The render object of the pass
     * @param modelIdx The model id
     * @param passIdx The pass id
     * @returns Whether the new render pass is successfully added
     */
    public insertRenderPass (renderObj: IRenderObject, modelIdx: number, passIdx: number): boolean {
        const subModel = renderObj.model.getSubModel(modelIdx);
        const pass = subModel.passes[passIdx];
        const pso = subModel.psos![passIdx];
        const isTransparent = pso.blendState.targets[0].blend;
        if (isTransparent !== this._passDesc.isTransparent || !(pass.phase & this._passDesc.phases)) {
            return false;
        }
        const hash = (0 << 30) | pass.priority << 16 | subModel.priority << 8 | passIdx;
        const rp = this._passPool.add();
        rp.hash = hash;
        rp.depth = renderObj.depth;
        rp.shaderId = pso.shader.id;
        rp.subModel = subModel;
        rp.cmdBuff = subModel.commandBuffers[passIdx];
        this.queue.push(rp);
        return true;
    }

    /**
     * @en Sort the current queue
     * @zh 排序渲染队列。
     */
    public sort () {

        this.queue.sort();

        this.cmdBuffCount = this.queue.length;

        for (let i = 0; i < this.queue.length; ++i) {
            this.cmdBuffs.array[i] = this.queue.array[i].cmdBuff;
        }
    }
}
