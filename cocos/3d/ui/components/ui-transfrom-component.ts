import { Component} from '../../../components/component';
import { ccclass, executeInEditMode, executionOrder, menu, property } from '../../../core/data/class-decorator';
import { EventType } from '../../../core/platform/event-manager/event-enum';
import { EventListener, ILinstenerMask } from '../../../core/platform/event-manager/event-listener';
import { Mat4, Rect, Size, Vec2, Vec3 } from '../../../core/value-types';
import * as vmath from '../../../core/vmath';
import { CanvasComponent } from './canvas-component';

const _vec2a = new Vec2();
const _vec2b = new Vec2();
const _mat4_temp = new Mat4();
const _matrix = new Mat4();
const _worldMatrix = new Mat4();

@ccclass('cc.UITransformComponent')
@executionOrder(100)
@menu('UI/UITransform')
@executeInEditMode
export class UITransformComponent extends Component {

    @property
    get contentSize () {
        return this._contentSize;
    }

    set contentSize (value) {
        if (this._contentSize.equals(value)) {
            return;
        }

        this._contentSize.set(value);
        this.node.emit(EventType.SIZE_CHANGED, this._contentSize);

    }

    get width () {
        return this._contentSize.width;
    }

    set width (value) {
        if (this._contentSize.width === value) {
            return;
        }

        this._contentSize.width = value;
        this.node.emit(EventType.SIZE_CHANGED, this._contentSize);
    }

    get height () {
        return this._contentSize.height;
    }

    set height (value) {
        if (this.contentSize.height === value){
            return;
        }

        this._contentSize.height = value;
        this.node.emit(EventType.SIZE_CHANGED, this._contentSize);
    }

    @property
    get anchorPoint () {
        return this._anchorPoint;
    }

    set anchorPoint (value) {
        if (this._anchorPoint.equals(value)) {
            return;
        }

        this._anchorPoint.set(value);
        this.node.emit(EventType.ANCHOR_CHANGED, this._anchorPoint);
    }

    get anchorX () {
        return this._anchorPoint.x;
    }

    set anchorX (value) {
        if (this._anchorPoint.x === value) {
            return;
        }

        this._anchorPoint.x = value;
        this.node.emit(EventType.ANCHOR_CHANGED, this._anchorPoint);
    }

    get anchorY () {
        return this._anchorPoint.y;
    }

    set anchorY (value) {
        if (this._anchorPoint.y === value) {
            return;
        }

        this._anchorPoint.y = value;
        this.node.emit(EventType.ANCHOR_CHANGED, this._anchorPoint);
    }

    public static EventType = EventType;
    @property
    public _contentSize = new Size(100, 100);
    @property
    public _anchorPoint = new Vec2(0.5, 0.5);

    public __preload () {
        this.node.uiTransfromComp = this;
    }

    public onDestroy () {
        this.node.uiTransfromComp = null;
    }

    /**
     * !#en
     * Sets the untransformed size of the node.<br/>
     * The contentSize remains the same no matter the node is scaled or rotated.<br/>
     * All nodes has a size. Layer and Scene has the same size of the screen.
     * !#zh 设置节点原始大小，不受该节点是否被缩放或者旋转的影响。
     * @method setContentSize
     * @param {Size|Number} size - The untransformed size of the node or The untransformed size's width of the node.
     * @param {Number} [height] - The untransformed size's height of the node.
     * @example
     * node.setContentSize(cc.size(100, 100));
     * node.setContentSize(100, 100);
     */
    public setContentSize (size: Size|number, height?: number) {
        const locContentSize = this._contentSize;
        if (height === undefined) {
            size = size as Size;
            if ((size.width === locContentSize.width) && (size.height === locContentSize.height)) {
                return;
            }

            locContentSize.width = size.width;
            locContentSize.height = size.height;
        } else {
            if ((size === locContentSize.width) && (height === locContentSize.height)) {
                return;
            }

            locContentSize.width = size as number;
            locContentSize.height = height;
        }

        this.node.emit(EventType.SIZE_CHANGED, this._contentSize);
    }

    /**
     * !#en
     * Sets the anchor point in percent. <br/>
     * anchor point is the point around which all transformations and positioning manipulations take place. <br/>
     * It's like a pin in the node where it is "attached" to its parent. <br/>
     * The anchorPoint is normalized, like a percentage. (0,0) means the bottom-left corner and (1,1) means the top-right corner.<br/>
     * But you can use values higher than (1,1) and lower than (0,0) too.<br/>
     * The default anchor point is (0.5,0.5), so it starts at the center of the node.
     * !#zh
     * 设置锚点的百分比。<br/>
     * 锚点应用于所有变换和坐标点的操作，它就像在节点上连接其父节点的大头针。<br/>
     * 锚点是标准化的，就像百分比一样。(0，0) 表示左下角，(1，1) 表示右上角。<br/>
     * 但是你可以使用比（1，1）更高的值或者比（0，0）更低的值。<br/>
     * 默认的锚点是（0.5，0.5），因此它开始于节点的中心位置。<br/>
     * 注意：Creator 中的锚点仅用于定位所在的节点，子节点的定位不受影响。
     * @method setAnchorPoint
     * @param {Vec2|Number} point - The anchor point of node or The x axis anchor of node.
     * @param {Number} [y] - The y axis anchor of node.
     * @example
     * node.setAnchorPoint(cc.v2(1, 1));
     * node.setAnchorPoint(1, 1);
     */
    public setAnchorPoint (point: Vec2 | number, y?: number) {
        const locAnchorPoint = this._anchorPoint;
        if (y === undefined) {
            point = point as Vec2;
            if ((point.x === locAnchorPoint.x) && (point.y === locAnchorPoint.y)) {
                return;
            }
            locAnchorPoint.x = point.x;
            locAnchorPoint.y = point.y;
        } else {
            if ((point === locAnchorPoint.x) && (y === locAnchorPoint.y)) {
                return;
            }
            locAnchorPoint.x = point as number;
            locAnchorPoint.y = y;
        }

        // this.setLocalDirty(LocalDirtyFlag.POSITION);
        // if (this._eventMask & ANCHOR_ON) {
        this.node.emit(EventType.ANCHOR_CHANGED, this._anchorPoint);

        // }
    }

    public isHit (point: Vec2, listener?: EventListener) {
        // console.log('click point  ' + point.toString());
        const w = this._contentSize.width;
        const h = this._contentSize.height;
        const cameraPt = _vec2a;
        const testPt = _vec2b;

        // hack: discuss how to distribute 3D event
        let visibility = -1;
        const renderComp = this.node.getComponent(cc.UIRenderComponent) as any;
        if (!renderComp) {
            visibility = this._getVisibility();
        } else {
            visibility = renderComp.visibility;
        }

        const canvas = cc.director.root.ui.getScreen(visibility);
        if (!canvas) {
            return;
        }

        // 将一个摄像机坐标系下的点转换到世界坐标系下
        canvas.node.getWorldRT(_mat4_temp);
        const m12 = _mat4_temp.m12;
        const m13 = _mat4_temp.m13;
        const center = cc.visibleRect.center;
        _mat4_temp.m12 = center.x - (_mat4_temp.m00 * m12 + _mat4_temp.m04 * m13);
        _mat4_temp.m13 = center.y - (_mat4_temp.m01 * m12 + _mat4_temp.m05 * m13);
        vmath.mat4.invert(_mat4_temp, _mat4_temp);
        vmath.vec2.transformMat4(cameraPt, point, _mat4_temp);

        this.node.getWorldMatrix(_worldMatrix);
        vmath.mat4.invert(_mat4_temp, _worldMatrix);
        vmath.vec2.transformMat4(testPt, cameraPt, _mat4_temp);
        testPt.x += this._anchorPoint.x * w;
        testPt.y += this._anchorPoint.y * h;

        if (testPt.x >= 0 && testPt.y >= 0 && testPt.x <= w && testPt.y <= h) {
            if (listener && listener.mask) {
                const mask = listener.mask as ILinstenerMask;
                let parent: any = this.node;
                // find mask parent, should hit test it
                for (let i = 0; parent && i < mask.index; ++i, parent = parent.parent) {
                }
                if (parent === mask.node) {
                    const comp = parent.getComponent(cc.MaskComponent);
                    return (comp && comp.enabledInHierarchy) ? comp.isHit(cameraPt) : true;
                } else {
                    listener.mask = null;
                    return true;
                }
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * !#en
     * Converts a UI Point to UI Node (Local) Space coordinates in which the anchor point is the origin position.
     * Conversion of non-UI nodes to UI Node (Local) Space coordinate system, please go cc.pipelineUtils.ConvertWorldToUISpaceAR.
     * !#zh
     * 将一个 UI 节点转换到另一个 UI 节点 (局部) 空间坐标系，这个坐标系以锚点为原点。
     * 非 UI 节点转换到 UI 节点(局部) 空间坐标系，请走 cc.pipelineUtils.ConvertWorldToUISpaceAR
     * @method convertToNodeSpaceAR
     * @param {Vec3} worldPoint
     * @param {Vec3} out
     * @return {Vec3}
     * @example
     * var newVec2 = node.convertToNodeSpaceAR(cc.v2(100, 100));
     */
    public convertToNodeSpaceAR (worldPoint: Vec3, out?: Vec3) {
        this.node.getWorldMatrix(_worldMatrix);
        vmath.mat4.invert(_mat4_temp, _worldMatrix);
        if (!out) {
            out = new Vec3();
        }

        return vmath.vec3.transformMat4(out, worldPoint, _mat4_temp);
    }

    /**
     * !#en
     * Converts a Point in node coordinates to world space coordinates.
     * !#zh
     * 将当前节点坐标系下的一个点转换到世界坐标系。
     * @method convertToWorldSpaceAR
     * @param {Vec2} nodePoint
     * @return {Vec2}
     * @example
     * var newVec2 = node.convertToWorldSpaceAR(cc.v2(100, 100));
     */
    public convertToWorldSpaceAR (nodePoint: Vec3, out?: Vec3) {
        this.node.getWorldMatrix(_worldMatrix);
        if (!out) {
            out = new Vec3();
        }

        return vmath.vec3.transformMat4(out, nodePoint, _worldMatrix);
    }

    /**
     * !#en
     * Returns a "local" axis aligned bounding box of the node. <br/>
     * The returned box is relative only to its parent.
     * !#zh 返回父节坐标系下的轴向对齐的包围盒。
     * @method getBoundingBox
     * @return {Rect} The calculated bounding box of the node
     * @example
     * var boundingBox = node.getBoundingBox();
     */
    public getBoundingBox () {
        vmath.mat4.fromRTS(_matrix, this.node.getRotation(), this.node.getPosition(), this.node.getScale());
        const width = this._contentSize.width;
        const height = this._contentSize.height;
        const rect = new Rect(
            -this._anchorPoint.x * width,
            -this._anchorPoint.y * height,
            width,
            height);
        return rect.transformMat4(rect, _matrix);
    }

    /**
     * !#en
     * Returns a "world" axis aligned bounding box of the node.<br/>
     * The bounding box contains self and active children's world bounding box.
     * !#zh
     * 返回节点在世界坐标系下的对齐轴向的包围盒（AABB）。<br/>
     * 该边框包含自身和已激活的子节点的世界边框。
     * @method getBoundingBoxToWorld
     * @return {Rect}
     * @example
     * var newRect = node.getBoundingBoxToWorld();
     */
    public getBoundingBoxToWorld () {
        if (this.node.parent) {
            this.node.parent.getWorldMatrix(_worldMatrix);
            return this.getBoundingBoxTo(_worldMatrix);
        } else {
            return this.getBoundingBox();
        }
    }

    public getBoundingBoxTo (parentMat: Mat4) {
        vmath.mat4.fromRTS(_matrix, this.node.getRotation(), this.node.getPosition(), this.node.getScale());
        const width = this._contentSize.width;
        const height = this._contentSize.height;
        const rect = new Rect(
            -this._anchorPoint.x * width,
            -this._anchorPoint.y * height,
            width,
            height);

        vmath.mat4.mul(_worldMatrix, parentMat, _matrix);
        rect.transformMat4(rect, _worldMatrix);

        // query child's BoundingBox
        if (!this.node.children) {
            return rect;
        }

        const locChildren = this.node.children;
        for (const child of locChildren) {
            if (child && child.active) {
                const uiTransform = child.getComponent(UITransformComponent);
                if (uiTransform) {
                    const childRect = uiTransform.getBoundingBoxTo(parentMat);
                    if (childRect) {
                        rect.union(rect, childRect);
                    }
                }
            }
        }

        return rect;
    }

    private _getVisibility (){
        let visibility = -1;
        let parent = this.node;
        // 获取被渲染相机的 visibility
        while (parent) {
            if (parent) {
                const canvasComp = parent.getComponent('cc.CanvasComponent') as CanvasComponent;
                if (canvasComp) {
                    visibility = canvasComp.visibility;
                    break;
                }
            }

            // @ts-ignore
            parent = parent.parent;
        }

        return visibility;
    }
}

cc.UITransformComponent = UITransformComponent;
