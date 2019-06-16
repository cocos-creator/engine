import { Component } from '../../../components';
import { ccclass, executeInEditMode, executionOrder, property } from '../../../core/data/class-decorator';
import { SystemEventType } from '../../../core/platform/event-manager/event-enum';
import { UI } from '../../../renderer/ui/ui';
import { Node } from '../../../scene-graph';
import { CanvasComponent } from './canvas-component';

/**
 * @zh
 * UI 及 UI 模型渲染基类。
 */
@ccclass('cc.UIComponent')
@executionOrder(110)
@executeInEditMode
export class UIComponent extends Component {

    /**
     * @zh
     * 渲染先后顺序，按照广度渲染排列，按同级节点下进行一次排列。
     */
    @property
    get priority () {
        return this._priority;
    }

    set priority (value) {
        if (this._priority === value) {
            return;
        }

        this._priority = value;
    }

    /**
     * @zh
     * 查找被渲染相机。
     */
    get visibility () {
        return this._visibility;
    }

    @property
    protected _priority = 0;

    protected _visibility = -1;

    private _lastParent: Node | null = null;
    public onEnable () {
        this._lastParent = this.node.parent;
        this._updateVisibility();
        if (this._lastParent) {
            this.node.on(SystemEventType.CHILD_REMOVED, this._parentChanged, this);
        }

    }

    public onDisable () {
        this._cancelEventFromParent();
    }

    public updateAssembler (render: UI) {
    }

    public postUpdateAssembler (render: UI) {
    }

    /**
     * @zh
     * 设置当前组件的可视编号。（我们不希望用户自行做处理，除非用户自己知道在做什么）
     */
    public setVisibility (value: number) {
        this._visibility = value;
    }

    protected _parentChanged (node: Node){
        if (node === this.node) {
            this._updateVisibility();
            this._cancelEventFromParent();
            this._lastParent = this.node.parent;
            return true;
        }

        return false;
    }

    private _updateVisibility () {
        let parent = this.node;
        // 获取被渲染相机的 visibility
        while (parent) {
            if (parent) {
                const canvasComp = parent.getComponent(CanvasComponent);
                if (canvasComp) {
                    this._visibility = canvasComp.visibility;
                    break;
                }
            }

            // @ts-ignore
            parent = parent.parent;
        }
    }

    private _cancelEventFromParent (){
        if (this._lastParent) {
            this._lastParent.off(SystemEventType.CHILD_REMOVED, this._parentChanged, this);
            this._lastParent = null;
        }

        this._visibility = -1;
    }
}
