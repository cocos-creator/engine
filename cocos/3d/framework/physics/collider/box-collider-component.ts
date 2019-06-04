import {
    ccclass,
    executeInEditMode,
    executionOrder,
    menu,
    property,
} from '../../../../core/data/class-decorator';
import Vec3 from '../../../../core/value-types/vec3';
import { vec3 } from '../../../../core/vmath';
import { BoxShapeBase } from '../../../physics/api';
import { createBoxShape } from '../../../physics/instance';
import { ColliderComponentBase } from './collider-component';

@ccclass('cc.BoxColliderComponent')
@executionOrder(98)
@menu('Components/BoxColliderComponent')
@executeInEditMode
export class BoxColliderComponent extends ColliderComponentBase {

    private _shape!: BoxShapeBase;

    /// PRIVATE PROPERTY ///

    @property
    private _size: Vec3 = new Vec3(0, 0, 0);

    constructor () {
        super();
        if (!CC_EDITOR) {
            this._shape = createBoxShape(this._size);
            this._shape.setUserData(this);
            this._shapeBase = this._shape;
        }
    }

    /// COMPONENT LIFECYCLE ///

    public onLoad () {
        super.onLoad();

        if (!CC_EDITOR) {
            this.size = this._size;
            this._shape.setScale(this.node._scale);
        }
    }

    /// PUBLIC PROPERTY GETTER\SETTER ///

    /**
     * The size of the box, in local space.
     * @note Shall not specify size with component 0.
     */
    @property({ type: Vec3 })
    get size () {
        return this._size;
    }

    set size (value) {
        vec3.copy(this._size, value);

        if (!CC_EDITOR) {
            this._shape.setSize(this._size);
            if (!CC_PHYISCS_BUILT_IN) {
                this.sharedBody.body.commitShapeUpdates();
            }
        }
    }
}
