import CANNON from '@cocos/cannon';
import { getWrap } from '../framework/util';
import { Vec3 } from '../../core';
import { IBaseShape } from '../spec/i-physics-shape';
import { PhysicsRayResult } from '../framework';
import { IRaycastOptions } from '../spec/i-physics-world';

export function toCannonRaycastOptions (out: CANNON.IRaycastOptions, options: IRaycastOptions) {
    out.checkCollisionResponse = !options.queryTrigger;
    out.collisionFilterGroup = -1;
    out.collisionFilterMask = options.mask;
    out.skipBackFaces = false;
}

export function fillRaycastResult (result: PhysicsRayResult, cannonResult: CANNON.RaycastResult) {
    result._assign(
        cannonResult.hitPointWorld,
        cannonResult.distance,
        getWrap<IBaseShape>(cannonResult.shape).collider,
        cannonResult.hitNormalWorld
    );
}

export function commitShapeUpdates (body: CANNON.Body) {
    body.updateMassProperties();
    body.updateBoundingRadius();
    body.aabbNeedsUpdate = true;
}