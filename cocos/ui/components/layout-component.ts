/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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
 * @category ui
 */

import { Component } from '../../../components/component';
import { ccclass, executeInEditMode, executionOrder, menu, property } from '../../../core/data/class-decorator';
import { Rect, Size, Vec2, Vec3 } from '../../../core/math';
import { ccenum } from '../../../core/value-types/enum';
import { UITransformComponent } from './ui-transfrom-component';
import { SystemEventType } from '../../../core/platform/event-manager/event-enum';
import { INode } from '../../../core/utils/interfaces';
const NodeEvent = SystemEventType;
/**
 * @zh
 * 布局类型。
 */
enum Type {
    /**
     * @zh
     * 取消布局。
     */
    NONE = 0,
    /**
     * @zh
     * 水平布局。
     */
    HORIZONTAL = 1,

    /**
     * @zh
     * 垂直布局。
     */
    VERTICAL = 2,
    /**
     * @zh
     * 网格布局。
     */
    GRID = 3,
}

ccenum(Type);

/**
 * @zh
 * 缩放模式。
 */
enum ResizeMode {
    /**
     * @zh
     * 不做任何缩放。
     */
    NONE = 0,
    /**
     * @zh
     * 容器的大小会根据子节点的大小自动缩放。
     */
    CONTAINER = 1,
    /**
     * @zh
     * 子节点的大小会随着容器的大小自动缩放。
     */
    CHILDREN = 2,
}

ccenum(ResizeMode);

/**
 * @zh
 * 布局轴向，只用于 GRID 布局。
 */
enum AxisDirection {
    /**
     * @zh
     * 进行水平方向布局。
     */
    HORIZONTAL = 0,
    /**
     * @zh
     * 进行垂直方向布局。
     */
    VERTICAL = 1,
}

ccenum(AxisDirection);

/**
 * @zh
 * 垂直方向布局方式。
 */
enum VerticalDirection {
    /**
     * @zh
     * 从下到上排列。
     */
    BOTTOM_TO_TOP = 0,
    /**
     * @zh
     * 从上到下排列。
     */
    TOP_TO_BOTTOM = 1,
}

ccenum(VerticalDirection);

/**
 * @zh
 * 水平方向布局方式。
 */
enum HorizontalDirection {
    /**
     * @zh
     * 从左往右排列。
     */
    LEFT_TO_RIGHT = 0,
    /**
     * @zh
     * 从右往左排列。
     */
    RIGHT_TO_LEFT = 1,
}

ccenum(HorizontalDirection);

const _tempPos = new Vec3();
const _tempScale = new Vec3();

/**
 * @zh
 * Layout 组件相当于一个容器，能自动对它的所有子节点进行统一排版。<br>
 * 注意：<br>
 * 1.不会考虑子节点的缩放和旋转。<br>
 * 2.对 Layout 设置后结果需要到下一帧才会更新，除非你设置完以后手动调用。[[updateLayout]]
 * 可通过 cc.LayoutComponent 获得此组件
 */
@ccclass('cc.LayoutComponent')
@executionOrder(110)
@menu('UI/Layout')
@executeInEditMode
export class LayoutComponent extends Component {

    /**
     * @zh
     * 布局类型。
     */
    @property({
        type: Type,
    })
    get type () {
        return this._N$layoutType;
    }

    set type (value: Type) {
        this._N$layoutType = value;

        if (CC_EDITOR && this._N$layoutType !== Type.NONE && this._resizeMode === ResizeMode.CONTAINER /*&& !cc.engine.isPlaying*/) {
            // const reLayouted = _Scene.DetectConflict.checkConflict_Layout(this);
            // if (reLayouted) {
            //     return;
            // }
        }
        this._doLayoutDirty();
    }
    /**
     * @zh
     * 缩放模式。
     */
    @property({
        type: ResizeMode,
    })
    get resizeMode () {
        return this._resizeMode;
    }
    set resizeMode (value) {
        if (this._N$layoutType === Type.NONE && value === ResizeMode.CHILDREN) {
            return;
        }

        this._resizeMode = value;
        if (CC_EDITOR && value === ResizeMode.CONTAINER /*&& !cc.engine.isPlaying*/) {
            // const reLayouted = _Scene.DetectConflict.checkConflict_Layout(this);
            // if (reLayouted) {
            //     return;
            // }
        }
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 每个格子的大小，只有布局类型为 GRID 的时候才有效。
     */
    @property
    // @constget
    get cellSize (): Readonly<Size> {
        return this._cellSize;
    }

    set cellSize (value) {
        if (this._cellSize === value) {
            return;
        }

        this._cellSize.set(value);
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 起始轴方向类型，可进行水平和垂直布局排列，只有布局类型为 GRID 的时候才有效。
     */
    @property({
        type: AxisDirection,
    })
    get startAxis () {
        return this._startAxis;
    }

    set startAxis (value) {
        if (this._startAxis === value) {
            return;
        }

        if (CC_EDITOR && this._resizeMode === ResizeMode.CONTAINER && !cc.engine.isPlaying) {
            // const reLayouted = _Scene.DetectConflict.checkConflict_Layout(this);
            // if (reLayouted) {
            //     return;
            // }
        }

        this._startAxis = value;
        this._doLayoutDirty();
    }
    /**
     * @zh
     * 容器内左边距，只会在一个布局方向上生效。
     */
    @property
    get paddingLeft () {
        return this._paddingLeft;
    }
    set paddingLeft (value) {
        if (this._paddingLeft === value) {
            return;
        }

        this._paddingLeft = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 容器内右边距，只会在一个布局方向上生效。
     */
    @property
    get paddingRight () {
        return this._paddingRight;
    }
    set paddingRight (value) {
        if (this._paddingRight === value) {
            return;
        }

        this._paddingRight = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 容器内上边距，只会在一个布局方向上生效。
     */
    @property
    get paddingTop () {
        return this._paddingTop;
    }
    set paddingTop (value) {
        if (this._paddingTop === value) {
            return;
        }

        this._paddingTop = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 容器内下边距，只会在一个布局方向上生效。
     */
    @property
    get paddingBottom () {
        return this._paddingBottom;
    }
    set paddingBottom (value) {
        if (this._paddingBottom === value) {
            return;
        }

        this._paddingBottom = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 子节点之间的水平间距。
     */
    @property
    get spacingX () {
        return this._spacingX;
    }

    set spacingX (value) {
        if (this._spacingX === value) {
            return;
        }

        this._spacingX = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 子节点之间的垂直间距。
     */
    @property
    get spacingY () {
        return this._spacingY;
    }

    set spacingY (value) {
        if (this._spacingY === value) {
            return;
        }

        this._spacingY = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 垂直排列子节点的方向。
     */
    @property({
        type: VerticalDirection,
    })
    get verticalDirection () {
        return this._verticalDirection;
    }

    set verticalDirection (value: VerticalDirection) {
        if (this._verticalDirection === value) {
            return;
        }

        this._verticalDirection = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 水平排列子节点的方向。
     */
    @property({
        type: HorizontalDirection,
    })
    get horizontalDirection () {
        return this._horizontalDirection;
    }

    set horizontalDirection (value: HorizontalDirection) {
        if (this._horizontalDirection === value) {
            return;
        }

        this._horizontalDirection = value;
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 容器内边距，该属性会在四个布局方向上生效。
     */
    @property
    get padding () {
        return this._paddingLeft;
    }

    set padding (value) {
        this._N$padding = value;

        this._migratePaddingData();
        this._doLayoutDirty();
    }

    /**
     * @zh
     * 子节点缩放比例是否影响布局。
     */
    @property
    get affectedByScale () {
        return this._affectedByScale;
    }

    set affectedByScale (value) {
        this._affectedByScale = value;
        this._doLayoutDirty();
    }

    public static Type = Type;
    public static VerticalDirection = VerticalDirection;
    public static HorizontalDirection = HorizontalDirection;
    public static ResizeMode = ResizeMode;
    public static AxisDirection = AxisDirection;

    private _layoutDirty = true;
    @property
    private _resizeMode = ResizeMode.NONE;
    // TODO: refactoring this name after data upgrade machanism is out.
    @property
    private _N$layoutType = Type.NONE;
    @property
    private _N$padding = 0;
    @property
    private _cellSize = new Size(40, 40);
    @property
    private _startAxis = AxisDirection.HORIZONTAL;
    @property
    private _paddingLeft = 0;
    @property
    private _paddingRight = 0;
    @property
    private _paddingTop = 0;
    @property
    private _paddingBottom = 0;
    @property
    private _spacingX = 0;
    @property
    private _spacingY = 0;
    private _layoutSize = new Size(300, 200);
    @property
    private _verticalDirection = VerticalDirection.TOP_TO_BOTTOM;
    @property
    private _horizontalDirection = HorizontalDirection.LEFT_TO_RIGHT;
    @property
    private _affectedByScale = false;

    /**
     * @zh
     * 立即执行更新布局。
     *
     * @example
     * ```typescript
     * layout.type = cc.LayoutComponent.HORIZONTAL;
     * layout.node.addChild(childNode);
     * cc.log(childNode.x); // not yet changed
     * layout.updateLayout();
     * cc.log(childNode.x); // changed
     * ```
     */
    public updateLayout () {
        if (this._layoutDirty && this.node.children.length > 0) {
            this._doLayout();
            this._layoutDirty = false;
        }
    }

    protected onEnable () {
        this._addEventListeners();

        if (this.node.getContentSize().equals(new Size())) {
            this.node.setContentSize(this._layoutSize);
        }

        if (this._N$padding !== 0) {
            this._migratePaddingData();
        }

        this._doLayoutDirty();
    }

    protected onDisable () {
        this._removeEventListeners();
    }

    private _migratePaddingData () {
        this._paddingLeft = this._N$padding;
        this._paddingRight = this._N$padding;
        this._paddingTop = this._N$padding;
        this._paddingBottom = this._N$padding;
        this._N$padding = 0;
    }

    private _addEventListeners () {
        cc.director.on(cc.Director.EVENT_AFTER_UPDATE, this.updateLayout, this);
        this.node.on(NodeEvent.SIZE_CHANGED, this._resized, this);
        this.node.on(NodeEvent.ANCHOR_CHANGED, this._doLayoutDirty, this);
        this.node.on(NodeEvent.CHILD_ADDED, this._childAdded, this);
        this.node.on(NodeEvent.CHILD_REMOVED, this._childRemoved, this);
        // this.node.on(NodeEvent.CHILD_REORDER, this._doLayoutDirty, this);
        this._addChildrenEventListeners();
    }

    private _removeEventListeners () {
        cc.director.off(cc.Director.EVENT_AFTER_UPDATE, this.updateLayout, this);
        this.node.off(NodeEvent.SIZE_CHANGED, this._resized, this);
        this.node.off(NodeEvent.ANCHOR_CHANGED, this._doLayoutDirty, this);
        this.node.off(NodeEvent.CHILD_ADDED, this._childAdded, this);
        this.node.off(NodeEvent.CHILD_REMOVED, this._childRemoved, this);
        // this.node.off(NodeEvent.CHILD_REORDER, this._doLayoutDirty, this);
        this._removeChildrenEventListeners();
    }

    private _addChildrenEventListeners () {
        const children = this.node.children;
        for (const child of children) {
            child.on(NodeEvent.SCALE_PART, this._doScaleDirty, this);
            child.on(NodeEvent.SIZE_CHANGED, this._doLayoutDirty, this);
            child.on(NodeEvent.TRANSFORM_CHANGED, this._transformDirty, this);
            child.on(NodeEvent.ANCHOR_CHANGED, this._doLayoutDirty, this);
            child.on('active-in-hierarchy-changed', this._doLayoutDirty, this);
        }
    }

    private _removeChildrenEventListeners () {
        const children = this.node.children;
        for (const child of children) {
            child.off(NodeEvent.SCALE_PART, this._doScaleDirty, this);
            child.off(NodeEvent.SIZE_CHANGED, this._doLayoutDirty, this);
            child.off(NodeEvent.TRANSFORM_CHANGED, this._transformDirty, this);
            child.off(NodeEvent.ANCHOR_CHANGED, this._doLayoutDirty, this);
            child.off('active-in-hierarchy-changed', this._doLayoutDirty, this);
        }
    }

    private _childAdded (child: INode) {
        child.on(NodeEvent.SCALE_PART, this._doScaleDirty, this);
        child.on(NodeEvent.SIZE_CHANGED, this._doLayoutDirty, this);
        child.on(NodeEvent.TRANSFORM_CHANGED, this._transformDirty, this);
        child.on(NodeEvent.ANCHOR_CHANGED, this._doLayoutDirty, this);
        child.on('active-in-hierarchy-changed', this._doLayoutDirty, this);

        this._doLayoutDirty();
    }

    private _childRemoved (child: INode) {
        child.off(NodeEvent.SCALE_PART, this._doScaleDirty, this);
        child.off(NodeEvent.SIZE_CHANGED, this._doLayoutDirty, this);
        child.off(NodeEvent.TRANSFORM_CHANGED, this._transformDirty, this);
        child.off(NodeEvent.ANCHOR_CHANGED, this._doLayoutDirty, this);
        child.off('active-in-hierarchy-changed', this._doLayoutDirty, this);

        this._doLayoutDirty();
    }

    private _resized () {
        this._layoutSize = this.node.getContentSize();
        this._doLayoutDirty();
    }

    private _doLayoutHorizontally (baseWidth, rowBreak, fnPositionY, applyChildren) {
        const layoutAnchor = this.node.getAnchorPoint();
        const children = this.node.children;

        let sign = 1;
        let paddingX = this._paddingLeft;
        let startPos = -layoutAnchor.x * baseWidth;
        if (this._horizontalDirection === HorizontalDirection.RIGHT_TO_LEFT) {
            sign = -1;
            startPos = (1 - layoutAnchor.x) * baseWidth;
            paddingX = this._paddingRight;
        }

        let nextX = startPos + sign * paddingX - sign * this._spacingX;
        let rowMaxHeight = 0;
        let tempMaxHeight = 0;
        let secondMaxHeight = 0;
        let row = 0;
        let containerResizeBoundary = 0;

        let maxHeightChildAnchorY = 0;

        let activeChildCount = 0;
        for (const child of children) {

            if (child.activeInHierarchy) {
                activeChildCount++;
            }
        }

        let newChildWidth = this._cellSize.width;
        if (this._N$layoutType !== Type.GRID && this._resizeMode === ResizeMode.CHILDREN) {
            newChildWidth = (baseWidth - (this._paddingLeft + this._paddingRight) - (activeChildCount - 1) * this._spacingX) / activeChildCount;
        }

        for (const child of children) {
            if (!child.activeInHierarchy) {
                continue;
            }

            child.getScale(_tempScale);
            const childScaleX = this._getUsedScaleValue(_tempScale.x);
            const childScaleY = this._getUsedScaleValue(_tempScale.y);
            // for resizing children
            if (this._resizeMode === ResizeMode.CHILDREN) {
                child.width = newChildWidth / childScaleX;
                if (this._N$layoutType === Type.GRID) {
                    child.height = this._cellSize.height / childScaleY;
                }
            }

            let anchorX = child.anchorX;
            const childBoundingBoxWidth = child.width! * childScaleX;
            const childBoundingBoxHeight = child.height! * childScaleY;

            if (secondMaxHeight > tempMaxHeight) {
                tempMaxHeight = secondMaxHeight;
            }

            if (childBoundingBoxHeight >= tempMaxHeight) {
                secondMaxHeight = tempMaxHeight;
                tempMaxHeight = childBoundingBoxHeight;
                maxHeightChildAnchorY = child.getAnchorPoint().y;
            }

            if (this._horizontalDirection === HorizontalDirection.RIGHT_TO_LEFT) {
                anchorX = 1 - child.anchorX!;
            }
            nextX = nextX + sign * anchorX! * childBoundingBoxWidth + sign * this._spacingX;
            const rightBoundaryOfChild = sign * (1 - anchorX!) * childBoundingBoxWidth;

            if (rowBreak) {
                const rowBreakBoundary = nextX + rightBoundaryOfChild + sign * (sign > 0 ? this._paddingRight : this._paddingLeft);
                let leftToRightRowBreak = false;
                if (this._horizontalDirection === HorizontalDirection.LEFT_TO_RIGHT && rowBreakBoundary > (1 - layoutAnchor.x) * baseWidth) {
                    leftToRightRowBreak = true;
                }

                let rightToLeftRowBreak = false;
                if (this._horizontalDirection === HorizontalDirection.RIGHT_TO_LEFT && rowBreakBoundary < -layoutAnchor.x * baseWidth) {
                    rightToLeftRowBreak = true;
                }

                if (leftToRightRowBreak || rightToLeftRowBreak) {

                    if (childBoundingBoxHeight >= tempMaxHeight) {
                        if (secondMaxHeight === 0) {
                            secondMaxHeight = tempMaxHeight;
                        }
                        rowMaxHeight += secondMaxHeight;
                        secondMaxHeight = tempMaxHeight;
                    } else {
                        rowMaxHeight += tempMaxHeight;
                        secondMaxHeight = childBoundingBoxHeight;
                        tempMaxHeight = 0;
                    }
                    nextX = startPos + sign * (paddingX + anchorX! * childBoundingBoxWidth);
                    row++;
                }
            }

            const finalPositionY = fnPositionY(child, rowMaxHeight, row);
            if (baseWidth >= (childBoundingBoxWidth + this._paddingLeft + this._paddingRight)) {
                if (applyChildren) {
                    child.getPosition(_tempPos);
                    child.setPosition(nextX, finalPositionY, _tempPos.z);
                }
            }

            let signX = 1;
            let tempFinalPositionY;
            const topMarign = (tempMaxHeight === 0) ? childBoundingBoxHeight : tempMaxHeight;

            if (this._verticalDirection === VerticalDirection.TOP_TO_BOTTOM) {
                containerResizeBoundary = containerResizeBoundary || this.node.getContentSize().height;
                signX = -1;
                tempFinalPositionY = finalPositionY + signX * (topMarign * maxHeightChildAnchorY + this._paddingBottom);
                if (tempFinalPositionY < containerResizeBoundary) {
                    containerResizeBoundary = tempFinalPositionY;
                }
            } else {
                containerResizeBoundary = containerResizeBoundary || -this.node.getContentSize().height;
                tempFinalPositionY = finalPositionY + signX * (topMarign * maxHeightChildAnchorY + this._paddingTop);
                if (tempFinalPositionY > containerResizeBoundary) {
                    containerResizeBoundary = tempFinalPositionY;
                }
            }

            nextX += rightBoundaryOfChild;
        }

        return containerResizeBoundary;
    }

    private _doLayoutVertically (
        baseHeight: number,
        columnBreak: boolean,
        fnPositionX: (node: INode, columnMaxWidth: number, col: number) => number,
        applyChildren: boolean,
    ) {
        const layoutAnchor = this.node.getAnchorPoint();
        const children = this.node.children;

        let sign = 1;
        let paddingY = this._paddingBottom;
        let bottomBoundaryOfLayout = -layoutAnchor.y * baseHeight;
        if (this._verticalDirection === VerticalDirection.TOP_TO_BOTTOM) {
            sign = -1;
            bottomBoundaryOfLayout = (1 - layoutAnchor.y) * baseHeight;
            paddingY = this._paddingTop;
        }

        let nextY = bottomBoundaryOfLayout + sign * paddingY - sign * this._spacingY;
        let columnMaxWidth = 0;
        let tempMaxWidth = 0;
        let secondMaxWidth = 0;
        let column = 0;
        let containerResizeBoundary = 0;
        let maxWidthChildAnchorX = 0;

        let activeChildCount = 0;
        for (const child of children) {
            if (child.activeInHierarchy) {
                activeChildCount++;
            }
        }

        let newChildHeight = this._cellSize.height;
        if (this._N$layoutType !== Type.GRID && this._resizeMode === ResizeMode.CHILDREN) {
            newChildHeight = (baseHeight - (this._paddingTop + this._paddingBottom) - (activeChildCount - 1) * this._spacingY) / activeChildCount;
        }

        for (const child of children) {
            if (!child) {
                continue;
            }

            const scale = child.getScale();
            const childScaleX = this._getUsedScaleValue(scale.x);
            const childScaleY = this._getUsedScaleValue(scale.y);
            if (!child.activeInHierarchy) {
                continue;
            }

            // for resizing children
            if (this._resizeMode === ResizeMode.CHILDREN) {
                child.height = newChildHeight / childScaleY;
                if (this._N$layoutType === Type.GRID) {
                    child.width = this._cellSize.width / childScaleX;
                }
            }

            let anchorY = child.anchorY;
            const childBoundingBoxWidth = child.width! * childScaleX;
            const childBoundingBoxHeight = child.height! * childScaleY;

            if (secondMaxWidth > tempMaxWidth) {
                tempMaxWidth = secondMaxWidth;
            }

            if (childBoundingBoxWidth >= tempMaxWidth) {
                secondMaxWidth = tempMaxWidth;
                tempMaxWidth = childBoundingBoxWidth;
                maxWidthChildAnchorX = child.getAnchorPoint().x;
            }

            if (this._verticalDirection === VerticalDirection.TOP_TO_BOTTOM) {
                anchorY = 1 - child.anchorY!;
            }
            nextY = nextY + sign * anchorY! * childBoundingBoxHeight + sign * this._spacingY;
            const topBoundaryOfChild = sign * (1 - anchorY!) * childBoundingBoxHeight;

            if (columnBreak) {
                const columnBreakBoundary = nextY + topBoundaryOfChild + sign * (sign > 0 ? this._paddingTop : this._paddingBottom);
                let bottomToTopColumnBreak = false;
                if (this._verticalDirection === VerticalDirection.BOTTOM_TO_TOP && columnBreakBoundary > (1 - layoutAnchor.y) * baseHeight) {
                    bottomToTopColumnBreak = true;
                }

                let topToBottomColumnBreak = false;
                if (this._verticalDirection === VerticalDirection.TOP_TO_BOTTOM && columnBreakBoundary < -layoutAnchor.y * baseHeight) {
                    topToBottomColumnBreak = true;
                }

                if (bottomToTopColumnBreak || topToBottomColumnBreak) {
                    if (childBoundingBoxWidth >= tempMaxWidth) {
                        if (secondMaxWidth === 0) {
                            secondMaxWidth = tempMaxWidth;
                        }
                        columnMaxWidth += secondMaxWidth;
                        secondMaxWidth = tempMaxWidth;
                    } else {
                        columnMaxWidth += tempMaxWidth;
                        secondMaxWidth = childBoundingBoxWidth;
                        tempMaxWidth = 0;
                    }
                    nextY = bottomBoundaryOfLayout + sign * (paddingY + anchorY! * childBoundingBoxHeight);
                    column++;
                }
            }

            const finalPositionX = fnPositionX(child, columnMaxWidth, column);
            if (baseHeight >= (childBoundingBoxHeight + (this._paddingTop + this._paddingBottom))) {
                if (applyChildren) {
                    child.getPosition(_tempPos);
                    child.setPosition(finalPositionX, nextY, _tempPos.z);
                }
            }

            let signX = 1;
            let tempFinalPositionX;
            // when the item is the last column break item, the tempMaxWidth will be 0.
            const rightMarign = (tempMaxWidth === 0) ? childBoundingBoxWidth : tempMaxWidth;

            if (this._horizontalDirection === HorizontalDirection.RIGHT_TO_LEFT) {
                signX = -1;
                containerResizeBoundary = containerResizeBoundary || this.node.getContentSize().width;
                tempFinalPositionX = finalPositionX + signX * (rightMarign * maxWidthChildAnchorX + this._paddingLeft);
                if (tempFinalPositionX < containerResizeBoundary) {
                    containerResizeBoundary = tempFinalPositionX;
                }
            } else {
                containerResizeBoundary = containerResizeBoundary || -this.node.getContentSize().width;
                tempFinalPositionX = finalPositionX + signX * (rightMarign * maxWidthChildAnchorX + this._paddingRight);
                if (tempFinalPositionX > containerResizeBoundary) {
                    containerResizeBoundary = tempFinalPositionX;
                }

            }

            nextY += topBoundaryOfChild;
        }

        return containerResizeBoundary;
    }

    private _doLayoutBasic () {
        const children = this.node.children;

        let allChildrenBoundingBox: Rect | null = null;

        for (const child of children) {
            const childTransform = child.getComponent(UITransformComponent);
            if (!childTransform) {
                continue;
            }

            if (child.activeInHierarchy) {
                if (!allChildrenBoundingBox) {
                    allChildrenBoundingBox = childTransform.getBoundingBoxToWorld();
                } else {
                    Rect.union(allChildrenBoundingBox, allChildrenBoundingBox, childTransform.getBoundingBoxToWorld());
                }
            }
        }

        if (allChildrenBoundingBox) {
            const parentTransform = this.node.parent!.getComponent(UITransformComponent);
            if (!parentTransform) {
                return;
            }

            Vec3.set(_tempPos, allChildrenBoundingBox.x, allChildrenBoundingBox.y, 0);
            const leftBottomInParentSpace = new Vec3();
            parentTransform.convertToNodeSpaceAR(_tempPos, leftBottomInParentSpace);
            Vec3.set(leftBottomInParentSpace,
                leftBottomInParentSpace.x - this._paddingLeft, leftBottomInParentSpace.y - this._paddingBottom,
                leftBottomInParentSpace.z);

            Vec3.set(_tempPos, allChildrenBoundingBox.x + allChildrenBoundingBox.width, allChildrenBoundingBox.y + allChildrenBoundingBox.height, 0);
            const rightTopInParentSpace = new Vec3();
            parentTransform.convertToNodeSpaceAR(_tempPos, rightTopInParentSpace);
            Vec3.set(rightTopInParentSpace, rightTopInParentSpace.x + this._paddingRight, rightTopInParentSpace.y + this._paddingTop, rightTopInParentSpace.z);

            const newSize = cc.size(parseFloat((rightTopInParentSpace.x - leftBottomInParentSpace.x).toFixed(2)),
                parseFloat((rightTopInParentSpace.y - leftBottomInParentSpace.y).toFixed(2)));

            this.node.getPosition(_tempPos);
            if (newSize.width !== 0) {
                const newAnchorX = (_tempPos.x - leftBottomInParentSpace.x) / newSize.width;
                this.node.anchorX = parseFloat(newAnchorX.toFixed(2));
            }
            if (newSize.height !== 0) {
                const newAnchorY = (_tempPos.y - leftBottomInParentSpace.y) / newSize.height;
                this.node.anchorY = parseFloat(newAnchorY.toFixed(2));
            }
            this.node.setContentSize(newSize);
        }
    }

    private _doLayoutGridAxisHorizontal (layoutAnchor, layoutSize) {
        const baseWidth = layoutSize.width;

        let sign = 1;
        let bottomBoundaryOfLayout = -layoutAnchor.y * layoutSize.height;
        let paddingY = this._paddingBottom;
        if (this._verticalDirection === VerticalDirection.TOP_TO_BOTTOM) {
            sign = -1;
            bottomBoundaryOfLayout = (1 - layoutAnchor.y) * layoutSize.height;
            paddingY = this._paddingTop;
        }

        const self = this;

        const fnPositionY = (child: INode, topOffset: number, row: number) => {
            return bottomBoundaryOfLayout +
                sign * (topOffset + child.anchorY * child.height * self._getUsedScaleValue(child.getScale().y) + paddingY + row * this._spacingY);
        };

        let newHeight = 0;
        if (this._resizeMode === ResizeMode.CONTAINER) {
            // calculate the new height of container, it won't change the position of it's children
            const boundary = this._doLayoutHorizontally(baseWidth, true, fnPositionY, false);
            newHeight = bottomBoundaryOfLayout - boundary;
            if (newHeight < 0) {
                newHeight *= -1;
            }

            bottomBoundaryOfLayout = -layoutAnchor.y * newHeight;

            if (this._verticalDirection === VerticalDirection.TOP_TO_BOTTOM) {
                sign = -1;
                bottomBoundaryOfLayout = (1 - layoutAnchor.y) * newHeight;
            }
        }

        this._doLayoutHorizontally(baseWidth, true, fnPositionY, true);

        if (this._resizeMode === ResizeMode.CONTAINER) {
            this.node.setContentSize(baseWidth, newHeight);
        }
    }

    private _doLayoutGridAxisVertical (layoutAnchor: Vec2, layoutSize: Size) {
        const baseHeight = layoutSize.height;

        let sign = 1;
        let leftBoundaryOfLayout = -layoutAnchor.x * layoutSize.width;
        let paddingX = this._paddingLeft;
        if (this._horizontalDirection === HorizontalDirection.RIGHT_TO_LEFT) {
            sign = -1;
            leftBoundaryOfLayout = (1 - layoutAnchor.x) * layoutSize.width;
            paddingX = this._paddingRight;
        }

        const self = this;
        const fnPositionX = (child: INode, leftOffset: number, column: number) => {
            return leftBoundaryOfLayout +
                sign * (leftOffset + child.anchorX * child.width * self._getUsedScaleValue(child.getScale().x) + paddingX + column * this._spacingX);
        };

        let newWidth = 0;
        if (this._resizeMode === ResizeMode.CONTAINER) {
            const boundary = this._doLayoutVertically(baseHeight, true, fnPositionX, false);
            newWidth = leftBoundaryOfLayout - boundary;
            if (newWidth < 0) {
                newWidth *= -1;
            }

            leftBoundaryOfLayout = -layoutAnchor.x * newWidth;

            if (this._horizontalDirection === HorizontalDirection.RIGHT_TO_LEFT) {
                sign = -1;
                leftBoundaryOfLayout = (1 - layoutAnchor.x) * newWidth;
            }
        }

        this._doLayoutVertically(baseHeight, true, fnPositionX, true);

        if (this._resizeMode === ResizeMode.CONTAINER) {
            this.node.setContentSize(newWidth, baseHeight);
        }
    }

    private _doLayoutGrid () {
        const layoutAnchor = this.node.getAnchorPoint();
        const layoutSize = this.node.getContentSize();

        if (this.startAxis === AxisDirection.HORIZONTAL) {
            this._doLayoutGridAxisHorizontal(layoutAnchor, layoutSize);

        } else if (this.startAxis === AxisDirection.VERTICAL) {
            this._doLayoutGridAxisVertical(layoutAnchor, layoutSize);
        }

    }

    private _getHorizontalBaseWidth (children: Readonly<INode[]>) {
        let newWidth = 0;
        let activeChildCount = 0;
        if (this._resizeMode === ResizeMode.CONTAINER) {
            for (const child of children) {
                child.getScale(_tempScale);
                if (child.activeInHierarchy) {
                    activeChildCount++;
                    newWidth += child.width! * this._getUsedScaleValue(_tempScale.x);
                }
            }
            newWidth += (activeChildCount - 1) * this._spacingX + this._paddingLeft + this._paddingRight;
        } else {
            newWidth = this.node.getContentSize().width;
        }
        return newWidth;
    }

    private _getVerticalBaseHeight (children: Readonly<INode[]>) {
        let newHeight = 0;
        let activeChildCount = 0;
        if (this._resizeMode === ResizeMode.CONTAINER) {
            for (const child of children) {
                child.getScale(_tempScale);
                if (child.activeInHierarchy) {
                    activeChildCount++;
                    newHeight += child.height! * this._getUsedScaleValue(_tempScale.y);
                }
            }

            newHeight += (activeChildCount - 1) * this._spacingY + this._paddingBottom + this._paddingTop;
        } else {
            newHeight = this.node.getContentSize().height;
        }
        return newHeight;
    }

    private _doLayout () {

        if (this._N$layoutType === Type.HORIZONTAL) {
            const newWidth = this._getHorizontalBaseWidth(this.node.children);

            const fnPositionY = (child) => {
                child.getPosition(_tempPos);
                return _tempPos.y;
            };

            this._doLayoutHorizontally(newWidth, false, fnPositionY, true);

            this.node.width = newWidth;
        } else if (this._N$layoutType === Type.VERTICAL) {
            const newHeight = this._getVerticalBaseHeight(this.node.children);

            const fnPositionX = (child) => {
                child.getPosition(_tempPos);
                return _tempPos.x;
            };

            this._doLayoutVertically(newHeight, false, fnPositionX, true);

            this.node.height = newHeight;
        } else if (this._N$layoutType === Type.NONE) {
            if (this._resizeMode === ResizeMode.CONTAINER) {
                this._doLayoutBasic();
            }
        } else if (this._N$layoutType === Type.GRID) {
            this._doLayoutGrid();
        }
    }

    private _getUsedScaleValue (value) {
        return this._affectedByScale ? Math.abs(value) : 1;
    }

    private _transformDirty(type: SystemEventType){
        if(type !== SystemEventType.POSITION_PART){
            return;
        }

        this._doLayoutDirty();
    }

    private _doLayoutDirty () {
        this._layoutDirty = true;
    }

    private _doScaleDirty () {
        this._layoutDirty = this._layoutDirty || this._affectedByScale;
    }

}

cc.LayoutComponent = LayoutComponent;
