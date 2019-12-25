import Ammo from '@cocos/ammo';
import { Vec3 } from "../../../core";
import { AmmoShape } from "./ammo-shape";
import { SphereColliderComponent } from '../../../../exports/physics-framework';
import { cocos2AmmoVec3 } from '../ammo-util';
import { AmmoBroadphaseNativeTypes } from '../ammo-enum';
import { ISphereShape } from '../../spec/i-physics-shape';

const v3_0 = new Vec3();

export class AmmoSphereShape extends AmmoShape implements ISphereShape {

    public set radius (radius: number) {
        const ws = this._collider.node.worldScale;
        const max_sp = Math.abs(Math.max(Math.max(ws.x, ws.y), ws.z));
        v3_0.set(radius, radius, radius);
        v3_0.multiplyScalar(max_sp * 2);
        cocos2AmmoVec3(this.scale, v3_0);
        this._btShape.setLocalScaling(this.scale);
        if (this._btCompound) {
            this._btCompound.updateChildTransform(this.index, this.transform, true);
        }
    }

    public get btSphere () {
        return this._btShape as Ammo.btSphereShape;
    }

    public get sphereCollider () {
        return this._collider as SphereColliderComponent;
    }

    constructor (radius: number) {
        super(AmmoBroadphaseNativeTypes.SPHERE_SHAPE_PROXYTYPE);
        this._btShape = new Ammo.btSphereShape(0.5);
    }

    onLoad () {
        super.onLoad();
        this.radius = this.sphereCollider.radius;
    }

    updateScale () {
        super.updateScale();
        this.radius = this.sphereCollider.radius;
    }
}
