import CANNON from '@cocos/cannon';
import { Vec3 } from '../../../core/math';
import { commitShapeUpdates } from '../cannon-util';
import { CannonShape } from './cannon-shape';
import { IBoxShape } from '../../spec/i-physics-shape';
import { IVec3Like } from '../../../core/math/type-define';
import { BoxColliderComponent } from '../../../../exports/physics-framework';

export class CannonBoxShape extends CannonShape implements IBoxShape {

    public get collider () {
        return this._collider as BoxColliderComponent;
    }

    public get impl () {
        return this._shape as CANNON.Box;
    }

    readonly halfExtent: CANNON.Vec3 = new CANNON.Vec3();
    constructor (size: Vec3) {
        super();
        Vec3.multiplyScalar(this.halfExtent, size, 0.5);
        this._shape = new CANNON.Box(this.halfExtent.clone());
    }

    setSize (v: IVec3Like) {
        Vec3.multiplyScalar(this.halfExtent, v, 0.5);
        Vec3.multiply(this.impl.halfExtents, this.halfExtent, this.collider.node.worldScale);
        this.impl.updateConvexPolyhedronRepresentation();
        if (this._index != -1) {
            commitShapeUpdates(this._body);
        }
    }

    onLoad () {
        super.onLoad();
        this.setSize(this.collider.size);
    }

    setScale (scale: Vec3): void {
        super.setScale(scale);
        this.setSize(this.collider.size);
    }
}
