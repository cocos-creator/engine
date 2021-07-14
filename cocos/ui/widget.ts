/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
 * @packageDocumentation
 * @module ui
 */

import { ccclass, help, executeInEditMode, executionOrder, menu, requireComponent, tooltip, type, editorOnly, editable, serializable, visible } from 'cc.decorator';
import { EDITOR, DEV } from 'internal:constants';
import { Component } from '../core/components';
import { UITransform } from '../2d/framework/ui-transform';
import { Size, Vec2, Vec3 } from '../core/math';
import { errorID, warnID } from '../core/platform/debug';
import { View } from '../core/platform/view';
import visibleRect from '../core/platform/visible-rect';
import { Scene } from '../core/scene-graph';
import { Node } from '../core/scene-graph/node';
import { ccenum } from '../core/value-types/enum';
import { TransformBit } from '../core/scene-graph/node-enum';
import { legacyCC } from '../core/global-exports';
import { NodeEventType } from '../core/scene-graph/node-event';

const _tempScale = new Vec2();

// returns a readonly size of the node
export function getReadonlyNodeSize (parent: Node | Scene) {
    if (parent instanceof Scene) {
        if (EDITOR) {
            // const canvasComp = parent.getComponentInChildren(Canvas);
            if (!View.instance) {
                throw new Error('cc.view uninitiated');
            }

            return View.instance.getDesignResolutionSize();
        }

        return visibleRect;
    } else if (parent._uiProps.uiTransformComp) {
        return parent._uiProps.uiTransformComp.contentSize;
    } else {
        return Size.ZERO;
    }
}

export function computeInverseTransForTarget (widgetNode: Node, target: Node, out_inverseTranslate: Vec2, out_inverseScale: Vec2) {
    if (widgetNode.parent) {
        _tempScale.set(widgetNode.parent.getScale().x, widgetNode.parent.getScale().y);
    } else {
        _tempScale.set(0, 0);
    }
    let scaleX = _tempScale.x;
    let scaleY = _tempScale.y;
    let translateX = 0;
    let translateY = 0;
    for (let node = widgetNode.parent; ;) {
        if (!node) {
            // ERROR: widgetNode should be child of target
            out_inverseTranslate.x = out_inverseTranslate.y = 0;
            out_inverseScale.x = out_inverseScale.y = 1;
            return;
        }

        const pos = node.getPosition();
        translateX += pos.x;
        translateY += pos.y;
        node = node.parent;    // loop increment

        if (node !== target) {
            if (node) {
                _tempScale.set(node.getScale().x, node.getScale().y);
            } else {
                _tempScale.set(0, 0);
            }
            const sx = _tempScale.x;
            const sy = _tempScale.y;
            translateX *= sx;
            translateY *= sy;
            scaleX *= sx;
            scaleY *= sy;
        } else {
            break;
        }
    }
    out_inverseScale.x = scaleX !== 0 ? (1 / scaleX) : 1;
    out_inverseScale.y = scaleY !== 0 ? (1 / scaleY) : 1;
    out_inverseTranslate.x = -translateX;
    out_inverseTranslate.y = -translateY;
}

/**
 * @en Enum for Widget's alignment mode, indicating when the widget should refresh.
 *
 * @zh Widget 的对齐模式，表示 Widget 应该何时刷新。
 */
export enum AlignMode {
    /**
     * @en Only align once when the Widget is enabled for the first time.
     * This will allow the script or animation to continue controlling the current node.
     * It will only be aligned once before the end of frame when onEnable is called,then immediately disables the Widget.
     *
     * @zh 仅在 Widget 第一次激活时对齐一次，便于脚本或动画继续控制当前节点。<br/>
     * 开启后会在 onEnable 时所在的那一帧结束前对齐一次，然后立刻禁用该 Widget。
     */
    ONCE = 0,
    /**
     * @en Keep aligning all the way.
     *
     * @zh  始终保持对齐。
     */
    ALWAYS = 1,
    /**
     * @zh
     * 一开始会像 ONCE 一样对齐一次，之后每当窗口大小改变时还会重新对齐。
     */
    ON_WINDOW_RESIZE = 2,
}

ccenum(AlignMode);

/**
 * @en Enum for Widget's alignment flag, indicating when the widget select alignment.
 *
 * @zh Widget 的对齐标志，表示 Widget 选择对齐状态。
 */
export enum AlignFlags {
    /**
     * @en Align top.
     *
     * @zh 上边对齐。
     */
    TOP = 1 << 0,
    /**
     * @en Align middle.
     *
     * @zh 垂直中心对齐。
     */
    MID = 1 << 1,
    /**
     * @en Align bottom.
     *
     * @zh 下边对齐。
     */
    BOT = 1 << 2,
    /**
     * @en Align left.
     *
     * @zh 左边对齐。
     */
    LEFT = 1 << 3,
    /**
     * @en Align center.
     *
     * @zh 横向中心对齐。
     */
    CENTER = 1 << 4,
    /**
     * @en Align right.
     *
     * @zh 右边对齐。
     */
    RIGHT = 1 << 5,
    /**
     * @en Align horizontal.
     *
     * @zh 横向对齐。
     */
    HORIZONTAL = LEFT | CENTER | RIGHT,
    /**
     * @en Align vertical.
     *
     * @zh 纵向对齐。
     */
    VERTICAL = TOP | MID | BOT,
}

const TOP_BOT = AlignFlags.TOP | AlignFlags.BOT;
const LEFT_RIGHT = AlignFlags.LEFT | AlignFlags.RIGHT;

/**
 * @en
 * Stores and manipulate the anchoring based on its parent.
 * Widget are used for GUI but can also be used for other things.
 * Widget will adjust current node's position and size automatically,
 * but the results after adjustment can not be obtained until the next frame unless you call [[updateAlignment]] manually.
 *
 * @zh Widget 组件，用于设置和适配其相对于父节点的边距，Widget 通常被用于 UI 界面，也可以用于其他地方。<br/>
 * Widget 会自动调整当前节点的坐标和宽高，不过目前调整后的结果要到下一帧才能在脚本里获取到，除非你先手动调用 [[updateAlignment]]。
 */
@ccclass('cc.Widget')
@help('i18n:cc.Widget')
@executionOrder(110)
@menu('UI/Widget')
@requireComponent(UITransform)
@executeInEditMode
export class Widget extends Component {
    /**
     * @en
     * Specifies an alignment target that can only be one of the parent nodes of the current node.
     * The default value is null, and when null, indicates the current parent.
     *
     * @zh
     * 指定一个对齐目标，只能是当前节点的其中一个父节点，默认为空，为空时表示当前父节点。
     */
    @type(Node)
    @tooltip('i18n:widget.target')
    get target () {
        return this._target;
    }

    set target (value) {
        if (this._target === value) {
            return;
        }

        this._unregisterTargetEvents();
        this._target = value;
        this._registerTargetEvents();
        if (EDITOR /* && !cc.engine._isPlaying */ && this.node.parent) {
            // adjust the offsets to keep the size and position unchanged after target changed
            legacyCC._widgetManager.updateOffsetsToStayPut(this);
        }

        this._validateTargetInDEV();

        this._recursiveDirty();
    }

    /**
     * @en
     * Whether to align to the top.
     *
     * @zh
     * 是否对齐上边。
     */
    @tooltip('i18n:widget.align_top')
    get isAlignTop () {
        return (this._alignFlags & AlignFlags.TOP) > 0;
    }
    set isAlignTop (value) {
        this._setAlign(AlignFlags.TOP, value);
        this._recursiveDirty();
    }

    /**
     * @en
     * Whether to align to the bottom.
     *
     * @zh
     * 是否对齐下边。
     */
    @tooltip('i18n:widget.align_bottom')
    get isAlignBottom () {
        return (this._alignFlags & AlignFlags.BOT) > 0;
    }
    set isAlignBottom (value) {
        this._setAlign(AlignFlags.BOT, value);
        this._recursiveDirty();
    }

    /**
     * @en
     * Whether to align to the left.
     *
     * @zh
     * 是否对齐左边。
     */
    @tooltip('i18n:widget.align_left')
    get isAlignLeft () {
        return (this._alignFlags & AlignFlags.LEFT) > 0;
    }
    set isAlignLeft (value) {
        this._setAlign(AlignFlags.LEFT, value);
        this._recursiveDirty();
    }

    /**
     * @en
     * Whether to align to the right.
     *
     * @zh
     * 是否对齐右边。
     */
    @tooltip('i18n:widget.align_right')
    get isAlignRight () {
        return (this._alignFlags & AlignFlags.RIGHT) > 0;
    }
    set isAlignRight (value) {
        this._setAlign(AlignFlags.RIGHT, value);
        this._recursiveDirty();
    }

    /**
     * @en
     * Whether to align vertically.
     *
     * @zh
     * 是否垂直方向对齐中点，开启此项会将垂直方向其他对齐选项取消。
     */
    @tooltip('i18n:widget.align_h_center')
    get isAlignVerticalCenter () {
        return (this._alignFlags & AlignFlags.MID) > 0;
    }
    set isAlignVerticalCenter (value) {
        if (value) {
            this.isAlignTop = false;
            this.isAlignBottom = false;
            this._alignFlags |= AlignFlags.MID;
        } else {
            this._alignFlags &= ~AlignFlags.MID;
        }

        this._recursiveDirty();
    }

    /**
     * @en
     * Whether to align horizontally.
     *
     * @zh
     * 是否水平方向对齐中点，开启此选项会将水平方向其他对齐选项取消。
     */
    @tooltip('i18n:widget.align_v_center')
    get isAlignHorizontalCenter () {
        return (this._alignFlags & AlignFlags.CENTER) > 0;
    }
    set isAlignHorizontalCenter (value) {
        if (value) {
            this.isAlignLeft = false;
            this.isAlignRight = false;
            this._alignFlags |= AlignFlags.CENTER;
        } else {
            this._alignFlags &= ~AlignFlags.CENTER;
        }
        this._recursiveDirty();
    }

    /**
     * @en
     * Whether to stretch horizontally, when enable the left and right alignment will be stretched horizontally,
     * the width setting is invalid (read only).
     *
     * @zh
     * 当前是否水平拉伸。当同时启用左右对齐时，节点将会被水平拉伸。此时节点的宽度（只读）。
     */
    @visible(false)
    get isStretchWidth () {
        return (this._alignFlags & LEFT_RIGHT) === LEFT_RIGHT;
    }

    /**
     * @en
     * Whether to stretch vertically, when enable the left and right alignment will be stretched vertically,
     * then height setting is invalid (read only).
     *
     * @zh
     * 当前是否垂直拉伸。当同时启用上下对齐时，节点将会被垂直拉伸，此时节点的高度（只读）。
     */
    @visible(false)
    get isStretchHeight () {
        return (this._alignFlags & TOP_BOT) === TOP_BOT;
    }

    // ALIGN MARGINS

    /**
     * @en
     * The margins between the top of this node and the top of parent node,
     * the value can be negative, Only available in 'isAlignTop' open.
     *
     * @zh
     * 本节点顶边和父节点顶边的距离，可填写负值，只有在 isAlignTop 开启时才有作用。
     */
    @tooltip('i18n:widget.top')
    get top () {
        return this._top;
    }
    set top (value) {
        this._top = value;
        this._recursiveDirty();
    }

    /**
     * @EditorOnly Not for user
     */
    @editable
    get editorTop () {
        return this._isAbsTop ? this._top : (this._top * 100);
    }
    set editorTop (value) {
        this._top = this._isAbsTop ? value : (value / 100);
        this._recursiveDirty();
    }

    /**
     * @en
     * The margins between the bottom of this node and the bottom of parent node,
     * the value can be negative, Only available in 'isAlignBottom' open.
     *
     * @zh
     * 本节点底边和父节点底边的距离，可填写负值，只有在 isAlignBottom 开启时才有作用。
     */
    @tooltip('i18n:widget.bottom')
    get bottom () {
        return this._bottom;
    }
    set bottom (value) {
        this._bottom = value;
        this._recursiveDirty();
    }

    /**
     * @EditorOnly Not for user
     */
    @editable
    get editorBottom () {
        return this._isAbsBottom ? this._bottom : (this._bottom * 100);
    }
    set editorBottom (value) {
        this._bottom = this._isAbsBottom ? value : (value / 100);
        this._recursiveDirty();
    }

    /**
     * @en
     * The margins between the left of this node and the left of parent node,
     * the value can be negative, Only available in 'isAlignLeft' open.
     *
     * @zh
     * 本节点左边和父节点左边的距离，可填写负值，只有在 isAlignLeft 开启时才有作用。
     */
    @tooltip('i18n:widget.left')
    get left () {
        return this._left;
    }
    set left (value) {
        this._left = value;
        this._recursiveDirty();
    }

    /**
     * @EditorOnly Not for user
     */
    @editable
    get editorLeft () {
        return this._isAbsLeft ? this._left : (this._left * 100);
    }
    set editorLeft (value) {
        this._left = this._isAbsLeft ? value : (value / 100);
        this._recursiveDirty();
    }

    /**
     * @en
     * The margins between the right of this node and the right of parent node,
     * the value can be negative, Only available in 'isAlignRight' open.
     *
     * @zh
     * 本节点右边和父节点右边的距离，可填写负值，只有在 isAlignRight 开启时才有作用。
     */
    @tooltip('i18n:widget.right')
    get right () {
        return this._right;
    }
    set right (value) {
        this._right = value;
        this._recursiveDirty();
    }

    /**
     * @EditorOnly Not for user
     */
    @editable
    get editorRight () {
        return this._isAbsRight ? this._right : (this._right * 100);
    }
    set editorRight (value) {
        this._right = this._isAbsRight ? value : (value / 100);
        this._recursiveDirty();
    }

    /**
     * @en
     * Horizontally aligns the midpoint offset value,
     * the value can be negative, Only available in 'isAlignHorizontalCenter' open.
     *
     * @zh
     * 水平居中的偏移值，可填写负值，只有在 isAlignHorizontalCenter 开启时才有作用。
     */
    @tooltip('i18n:widget.horizontal_center')
    get horizontalCenter () {
        return this._horizontalCenter;
    }
    set horizontalCenter (value) {
        this._horizontalCenter = value;
        this._recursiveDirty();
    }

    /**
     * @EditorOnly Not for user
     */
    @editable
    get editorHorizontalCenter () {
        return this._isAbsHorizontalCenter ? this._horizontalCenter : (this._horizontalCenter * 100);
    }
    set editorHorizontalCenter (value) {
        this._horizontalCenter = this._isAbsHorizontalCenter ? value : (value / 100);
        this._recursiveDirty();
    }

    /**
     * @en
     * Vertically aligns the midpoint offset value,
     * the value can be negative, Only available in 'isAlignVerticalCenter' open.
     *
     * @zh
     * 垂直居中的偏移值，可填写负值，只有在 isAlignVerticalCenter 开启时才有作用。
     */
    @tooltip('i18n:widget.vertical_center')
    get verticalCenter () {
        return this._verticalCenter;
    }
    set verticalCenter (value) {
        this._verticalCenter = value;
        this._recursiveDirty();
    }

    /**
     * @EditorOnly Not for user
     */
    @editable
    get editorVerticalCenter () {
        return this._isAbsVerticalCenter ? this._verticalCenter : (this._verticalCenter * 100);
    }
    set editorVerticalCenter (value) {
        this._verticalCenter = this._isAbsVerticalCenter ? value : (value / 100);
        this._recursiveDirty();
    }

    /**
     * @en
     * If true, top is pixel margin, otherwise is percentage (0 - 1) margin relative to the parent's height.
     *
     * @zh
     * 如果为 true，"top" 将会以像素作为边距，否则将会以相对父物体高度的比例（0 到 1）作为边距。
     */
    @editable
    get isAbsoluteTop () {
        return this._isAbsTop;
    }
    set isAbsoluteTop (value) {
        if (this._isAbsTop === value) {
            return;
        }

        this._isAbsTop = value;
        this._autoChangedValue(AlignFlags.TOP, this._isAbsTop);
    }

    /**
     * @en
     * If true, bottom is pixel margin, otherwise is percentage (0 - 1) margin relative to the parent's height.
     *
     * @zh
     * 如果为 true，"bottom" 将会以像素作为边距，否则将会以相对父物体高度的比例（0 到 1）作为边距。
     */
    @editable
    get isAbsoluteBottom () {
        return this._isAbsBottom;
    }
    set isAbsoluteBottom (value) {
        if (this._isAbsBottom === value) {
            return;
        }

        this._isAbsBottom = value;
        this._autoChangedValue(AlignFlags.BOT, this._isAbsBottom);
    }

    /**
     * @en
     * If true, left is pixel margin, otherwise is percentage (0 - 1) margin relative to the parent's width.
     *
     * @zh
     * 如果为 true，"left" 将会以像素作为边距，否则将会以相对父物体宽度的比例（0 到 1）作为边距。
     */
    @editable
    get isAbsoluteLeft () {
        return this._isAbsLeft;
    }
    set isAbsoluteLeft (value) {
        if (this._isAbsLeft === value) {
            return;
        }

        this._isAbsLeft = value;
        this._autoChangedValue(AlignFlags.LEFT, this._isAbsLeft);
    }

    /**
     * @en
     * If true, right is pixel margin, otherwise is percentage (0 - 1) margin relative to the parent's width.
     *
     * @zh
     * 如果为 true，"right" 将会以像素作为边距，否则将会以相对父物体宽度的比例（0 到 1）作为边距。
     */
    @editable
    get isAbsoluteRight () {
        return this._isAbsRight;
    }
    set isAbsoluteRight (value) {
        if (this._isAbsRight === value) {
            return;
        }

        this._isAbsRight = value;
        this._autoChangedValue(AlignFlags.RIGHT, this._isAbsRight);
    }

    /**
     * @en
     * If true, horizontalCenter is pixel margin, otherwise is percentage (0 - 1) margin.
     *
     * @zh
     * 如果为 true，"horizontalCenter" 将会以像素作为偏移值，反之为比例（0 到 1）。
     */
    @editable
    get isAbsoluteHorizontalCenter () {
        return this._isAbsHorizontalCenter;
    }
    set isAbsoluteHorizontalCenter (value) {
        if (this._isAbsHorizontalCenter === value) {
            return;
        }

        this._isAbsHorizontalCenter = value;
        this._autoChangedValue(AlignFlags.CENTER, this._isAbsHorizontalCenter);
    }

    /**
     * @en
     * If true, verticalCenter is pixel margin, otherwise is percentage (0 - 1) margin.
     *
     * @zh
     * 如果为 true，"verticalCenter" 将会以像素作为偏移值，反之为比例（0 到 1）。
     */
    @editable
    get isAbsoluteVerticalCenter () {
        return this._isAbsVerticalCenter;
    }
    set isAbsoluteVerticalCenter (value) {
        if (this._isAbsVerticalCenter === value) {
            return;
        }

        this._isAbsVerticalCenter = value;
        this._autoChangedValue(AlignFlags.MID, this._isAbsVerticalCenter);
    }

    /**
     * @en
     * Specifies the alignment mode of the Widget, which determines when the widget should refresh.
     *
     * @zh
     * 指定 Widget 的对齐模式，用于决定 Widget 应该何时刷新。
     *
     * @example
     * ```
     * import { Widget } from 'cc';
     * widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
     * ```
     */
    @type(AlignMode)
    @tooltip('i18n:widget.align_mode')
    get alignMode () {
        return this._alignMode;
    }
    set alignMode (value) {
        this._alignMode = value;
        this._recursiveDirty();
    }

    /**
     * @zh
     * 对齐开关，由 AlignFlags 组成
     */
    @editable
    get alignFlags () {
        return this._alignFlags;
    }
    set alignFlags (value) {
        if (this._alignFlags === value) {
            return;
        }

        this._alignFlags = value;
        this._recursiveDirty();
    }

    public static AlignMode = AlignMode;

    public _lastPos = new Vec3();
    public _lastSize = new Size();
    public _dirty = true;
    public _hadAlignOnce = false;

    @serializable
    private _alignFlags = 0;
    @serializable
    private _target: Node | null = null;
    @serializable
    private _left = 0;
    @serializable
    private _right = 0;
    @serializable
    private _top = 0;
    @serializable
    private _bottom = 0;
    @serializable
    private _horizontalCenter = 0;
    @serializable
    private _verticalCenter = 0;
    @serializable
    private _isAbsLeft = true;
    @serializable
    private _isAbsRight = true;
    @serializable
    private _isAbsTop = true;
    @serializable
    private _isAbsBottom = true;
    @serializable
    private _isAbsHorizontalCenter = true;
    @serializable
    private _isAbsVerticalCenter = true;
    // original size before align
    @serializable
    private _originalWidth = 0;
    @serializable
    private _originalHeight = 0;
    @serializable
    private _alignMode = AlignMode.ON_WINDOW_RESIZE;
    @serializable
    @editorOnly
    private _lockFlags = 0;

    /**
     * @en
     * Immediately perform the widget alignment. You need to manually call this method only if
     * you need to get the latest results after the alignment before the end of current frame.
     *
     * @zh
     * 立刻执行 widget 对齐操作。这个接口一般不需要手工调用。
     * 只有当你需要在当前帧结束前获得 widget 对齐后的最新结果时才需要手动调用这个方法。
     *
     * @example
     * ```ts
     * import { log } from 'cc';
     * widget.top = 10;       // change top margin
     * log(widget.node.y); // not yet changed
     * widget.updateAlignment();
     * log(widget.node.y); // changed
     * ```
     */
    public updateAlignment () {
        legacyCC._widgetManager.updateAlignment(this.node);
    }

    public _validateTargetInDEV () {
        if (!DEV) {
            return;
        }

        const target = this._target;
        if (target) {
            const isParent = this.node !== target && this.node.isChildOf(target);
            if (!isParent) {
                errorID(6500);
                this.target = null;
            }
        }
    }

    public setDirty () {
        this._recursiveDirty();
    }

    public onEnable () {
        this.node.getPosition(this._lastPos);
        this._lastSize.set(this.node._uiProps.uiTransformComp!.contentSize);
        legacyCC._widgetManager.add(this);
        this._hadAlignOnce = false;
        this._registerEvent();
        this._registerTargetEvents();
    }

    public onDisable () {
        legacyCC._widgetManager.remove(this);
        this._unregisterEvent();
        this._unregisterTargetEvents();
    }

    public onDestroy () {
        this._removeParentEvent();
    }

    public _adjustWidgetToAllowMovingInEditor (eventType: TransformBit) {}
    public _adjustWidgetToAllowResizingInEditor () {}

    public _adjustWidgetToAnchorChanged () {
        this.setDirty();
    }

    public _adjustTargetToParentChanged (oldParent: Node) {
        if (oldParent) {
            this._unregisterOldParentEvents(oldParent);
        }
        if (this.node.getParent()) {
            this._registerTargetEvents();
        }
        this._setDirtyByMode();
    }

    protected _registerEvent () {
        if (EDITOR && !legacyCC.GAME_VIEW) {
            this.node.on(NodeEventType.TRANSFORM_CHANGED, this._adjustWidgetToAllowMovingInEditor, this);
            this.node.on(NodeEventType.SIZE_CHANGED, this._adjustWidgetToAllowResizingInEditor, this);
        } else {
            this.node.on(NodeEventType.TRANSFORM_CHANGED, this._setDirtyByMode, this);
            this.node.on(NodeEventType.SIZE_CHANGED, this._setDirtyByMode, this);
        }
        this.node.on(NodeEventType.ANCHOR_CHANGED, this._adjustWidgetToAnchorChanged, this);
        this.node.on(NodeEventType.PARENT_CHANGED, this._adjustTargetToParentChanged, this);
    }

    protected _unregisterEvent () {
        if (EDITOR && !legacyCC.GAME_VIEW) {
            this.node.off(NodeEventType.TRANSFORM_CHANGED, this._adjustWidgetToAllowMovingInEditor, this);
            this.node.off(NodeEventType.SIZE_CHANGED, this._adjustWidgetToAllowResizingInEditor, this);
        } else {
            this.node.off(NodeEventType.TRANSFORM_CHANGED, this._setDirtyByMode, this);
            this.node.off(NodeEventType.SIZE_CHANGED, this._setDirtyByMode, this);
        }
        this.node.off(NodeEventType.ANCHOR_CHANGED, this._adjustWidgetToAnchorChanged, this);
    }

    protected _removeParentEvent () {
        this.node.off(NodeEventType.PARENT_CHANGED, this._adjustTargetToParentChanged, this);
    }

    protected _autoChangedValue (flag: AlignFlags, isAbs: boolean) {
        const current = (this._alignFlags & flag) > 0;
        if (!current) {
            return;
        }
        const parentUiProps = this.node.parent && this.node.parent._uiProps;
        const parentTrans = parentUiProps && parentUiProps.uiTransformComp;

        const size = parentTrans ? parentTrans.contentSize : visibleRect;
        if (this.isAlignLeft && flag === AlignFlags.LEFT) {
            this._left = isAbs ? this._left * size.width : this._left / size.width;
        } else if (this.isAlignRight && flag === AlignFlags.RIGHT) {
            this._right = isAbs ? this._right * size.width : this._right / size.width;
        } else if (this.isAlignHorizontalCenter && flag === AlignFlags.CENTER) {
            this._horizontalCenter = isAbs ? this._horizontalCenter * size.width : this._horizontalCenter / size.width;
        } else if (this.isAlignTop && flag === AlignFlags.TOP) {
            this._top = isAbs ? this._top * size.height : this._top / size.height;
        } else if (this.isAlignBottom && flag === AlignFlags.BOT) {
            this._bottom = isAbs ? this._bottom * size.height : this._bottom / size.height;
        } else if (this.isAbsoluteVerticalCenter && flag === AlignFlags.MID) {
            this._verticalCenter = isAbs ? this._verticalCenter / size.height : this._verticalCenter / size.height;
        }

        this._recursiveDirty();
    }

    protected _registerTargetEvents () {
        const target = this._target || this.node.parent;
        if (target) {
            if (target.getComponent(UITransform)) {
                target.on(NodeEventType.TRANSFORM_CHANGED, this._setDirtyByMode, this);
                target.on(NodeEventType.SIZE_CHANGED, this._setDirtyByMode, this);
            }
        }
    }

    protected _unregisterTargetEvents () {
        const target = this._target || this.node.parent;
        if (target) {
            target.off(NodeEventType.TRANSFORM_CHANGED, this._setDirtyByMode, this);
            target.off(NodeEventType.SIZE_CHANGED, this._setDirtyByMode, this);
        }
    }

    protected _unregisterOldParentEvents (oldParent: Node) {
        const target = this._target || oldParent;
        if (target) {
            target.off(NodeEventType.TRANSFORM_CHANGED, this._setDirtyByMode, this);
            target.off(NodeEventType.SIZE_CHANGED, this._setDirtyByMode, this);
        }
    }

    protected _setDirtyByMode () {
        if (this.alignMode === AlignMode.ALWAYS || EDITOR) {
            this._recursiveDirty();
        }
    }

    private _setAlign (flag: AlignFlags, isAlign: boolean) {
        const current = (this._alignFlags & flag) > 0;
        if (isAlign === current) {
            return;
        }
        const isHorizontal = (flag & LEFT_RIGHT) > 0;
        const trans = this.node._uiProps.uiTransformComp!;
        if (isAlign) {
            this._alignFlags |= flag;

            if (isHorizontal) {
                this.isAlignHorizontalCenter = false;
                if (this.isStretchWidth) {
                    // become stretch
                    this._originalWidth = trans.width;
                    // test check conflict
                    if (EDITOR /* && !cc.engine.isPlaying */) {
                        // TODO:
                        // _Scene.DetectConflict.checkConflict_Widget(this);
                    }
                }
            } else {
                this.isAlignVerticalCenter = false;
                if (this.isStretchHeight) {
                    // become stretch
                    this._originalHeight = trans.height;
                    // test check conflict
                    if (EDITOR /* && !cc.engine.isPlaying */) {
                        // TODO:
                        // _Scene.DetectConflict.checkConflict_Widget(this);
                    }
                }
            }

            if (EDITOR && this.node.parent) {
                // adjust the offsets to keep the size and position unchanged after alignment changed
                legacyCC._widgetManager.updateOffsetsToStayPut(this, flag);
            }
        } else {
            if (isHorizontal) {
                if (this.isStretchWidth) {
                    // will cancel stretch
                    trans.width = this._originalWidth;
                }
            } else if (this.isStretchHeight) {
                // will cancel stretch
                trans.height = this._originalHeight;
            }

            this._alignFlags &= ~flag;
        }
    }

    private _recursiveDirty () {
        if (this._dirty) {
            return;
        }

        this._dirty = true;
    }
}

export declare namespace Widget {
    export type AlignMode = EnumAlias<typeof AlignMode>;
}

// cc.Widget = module.exports = Widget;
legacyCC.internal.computeInverseTransForTarget = computeInverseTransForTarget;
legacyCC.internal.getReadonlyNodeSize = getReadonlyNodeSize;
