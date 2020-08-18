/**
 * @category pipeline
 */
import { ccclass, property, visible, displayOrder, type } from '../data/class-decorator';
import { RenderStage } from './render-stage';
import { RenderView } from './render-view';
import { RenderPipeline } from './render-pipeline';
import { legacyCC } from '../global-exports';

/**
 * @en Render flow information descriptor
 * @zh 渲染流程描述信息。
 */
export interface IRenderFlowInfo {
    name: string;
    priority: number;
    tag?: number;
}

/**
 * @en Render flow is a sub process of the [[RenderPipeline]], it dispatch the render task to all the [[RenderStage]]s.
 * @zh 渲染流程是渲染管线（[[RenderPipeline]]）的一个子过程，它将渲染任务派发到它的所有渲染阶段（[[RenderStage]]）中执行。
 */
@ccclass('RenderFlow')
export abstract class RenderFlow {
    /**
     * @en The name of the render flow
     * @zh 渲染流程的名字
     */
    public get name (): string {
        return this._name;
    }

    /**
     * @en Priority of the current flow
     * @zh 当前渲染流程的优先级。
     */
    public get priority (): number {
        return this._priority;
    }

    /**
     * @en Tag of the current flow
     * @zh 当前渲染流程的标签。
     */
    public get tag (): number {
        return this._tag;
    }

    /**
     * @en The stages of flow.
     * @zh 渲染流程 stage 列表。
     * @readonly
     */
    public get stages (): RenderStage[] {
        return this._stages;
    }

    @property
    @displayOrder(0)
    @visible(true)
    protected _name: string = '';

    @property
    @displayOrder(1)
    @visible(true)
    protected _priority: number = 0;

    @property
    @displayOrder(2)
    @visible(true)
    protected _tag: number = 0;

    @type([RenderStage])
    @displayOrder(3)
    @visible(true)
    protected _stages: RenderStage[] = [];
    protected _pipeline!: RenderPipeline;

    /**
     * @en The initialization process, user shouldn't use it in most case, only useful when need to generate render pipeline programmatically.
     * @zh 初始化函数，正常情况下不会用到，仅用于程序化生成渲染管线的情况。
     * @param info The render flow information
     */
    public initialize (info: IRenderFlowInfo): boolean{
        this._name = info.name;
        this._priority = info.priority;

        if (info.tag) {
            this._tag = info.tag;
        }

        return true;
    }

    /**
     * @en Activate the current render flow in the given pipeline
     * @zh 为指定的渲染管线开启当前渲染流程
     * @param pipeline The render pipeline to activate this render flow
     */
    public activate (pipeline: RenderPipeline) {
        this._pipeline = pipeline;
        this._stages.sort((a, b) => {
            return a.priority - b.priority;
        });

        for (let i = 0, len = this._stages.length; i < len; i++) {
            this._stages[i].activate(pipeline, this);
        }
    }

    /**
     * @en Render function, it basically run all render stages in sequence for the given view.
     * @zh 渲染函数，对指定的渲染视图按顺序执行所有渲染阶段。
     * @param view Render view。
     */
    public render (view: RenderView) {
        for (let i = 0, len = this._stages.length; i < len; i++) {
            this._stages[i].render(view);
        }
    }

    /**
     * @en Destroy function.
     * @zh 销毁函数。
     */
    public destroy () {
        for (let i = 0, len = this._stages.length; i < len; i++) {
            this._stages[i].destroy();
        }

        this._stages.length = 0;
    }
}

legacyCC.RenderFlow = RenderFlow;
