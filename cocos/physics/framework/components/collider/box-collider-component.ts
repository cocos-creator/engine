/**
 * @category physics
 */

import {
    ccclass,
    executeInEditMode,
    executionOrder,
    menu,
    property,
} from '../../../../core/data/class-decorator';
import { Vec3 } from '../../../../core/math';
import { createBoxShape } from '../../instance';
import { ColliderComponent } from './collider-component';
import { IBoxShape } from '../../../spec/i-physics-shape';
import { EDITOR, TEST } from 'internal:constants';

/**
 * @zh
 * 盒子碰撞器
 */
@ccclass('cc.BoxColliderComponent')
@executionOrder(98)
@menu('Physics/BoxCollider')
@executeInEditMode
export class BoxColliderComponent extends ColliderComponent {

    /// PUBLIC PROPERTY GETTER\SETTER ///

    /**
     * @en
     * Get or set the size of the box, in local space.
     * @zh
     * 获取或设置盒的大小。
     */
    @property({
        type: Vec3,
        tooltip: '盒的大小，即长、宽、高'
    })
    public get size () {
        return this._size;
    }

    public set size (value) {
        Vec3.copy(this._size, value);
        if (!EDITOR && !TEST) {
            this.shape.setSize(this._size);
        }
    }

    public get shape () {
        return this._shape as IBoxShape;
    }

    /// PRIVATE PROPERTY ///

    @property
    private _size: Vec3 = new Vec3(1, 1, 1);

    constructor () {
        super();
        if (!EDITOR && !TEST) {
            this._shape = createBoxShape(this._size);
        }
    }

}
