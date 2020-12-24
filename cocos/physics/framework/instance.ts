/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
 * @hidden
 */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { EDITOR, DEBUG, TEST } from 'internal:constants';
import { IVec3Like } from '../../core/math';
import { IRigidBody } from '../spec/i-rigid-body';
import { WRAPPER } from './physics-selector';
import {
    IBoxShape, ISphereShape, ICapsuleShape, ITrimeshShape, ICylinderShape,
    IConeShape, ITerrainShape, ISimplexShape, IPlaneShape, IBaseShape,
} from '../spec/i-physics-shape';
import { IPhysicsWorld } from '../spec/i-physics-world';
import { errorID, warnID, warn } from '../../core';
import { EColliderType, EConstraintType } from './physics-enum';
import { IBaseConstraint, IPointToPointConstraint, IHingeConstraint, IConeTwistConstraint } from '../spec/i-physics-constraint';
import { legacyCC } from '../../core/global-exports';

export function checkPhysicsModule (obj: any) {
    if (DEBUG && !TEST && !EDITOR && obj == null) {
        errorID(9600);
        return true;
    }
    return false;
}

export function createPhysicsWorld (): IPhysicsWorld {
    if (DEBUG && checkPhysicsModule(WRAPPER.PhysicsWorld)) { return null as any; }
    return new WRAPPER.PhysicsWorld() as IPhysicsWorld;
}

export function createRigidBody (): IRigidBody {
    if (DEBUG && checkPhysicsModule(WRAPPER.RigidBody)) { return null as any; }
    return new WRAPPER.RigidBody() as IRigidBody;
}

const CREATE_COLLIDER_PROXY = { INITED: false };

const FUNC = (...v: any) => 0 as any;
interface IEntireShape extends IBoxShape, ISphereShape, ICapsuleShape,
    ITrimeshShape, ICylinderShape, IConeShape, ITerrainShape, ISimplexShape, IPlaneShape { }
const ENTIRE_SHAPE: IEntireShape = {
    impl: null,
    collider: null as unknown as any,
    attachedRigidBody: null,
    initialize: FUNC,
    onLoad: FUNC,
    onEnable: FUNC,
    onDisable: FUNC,
    onDestroy: FUNC,
    setGroup: FUNC,
    getGroup: FUNC,
    addGroup: FUNC,
    removeGroup: FUNC,
    setMask: FUNC,
    getMask: FUNC,
    addMask: FUNC,
    removeMask: FUNC,
    setMaterial: FUNC,
    setAsTrigger: FUNC,
    setCenter: FUNC,
    getAABB: FUNC,
    getBoundingSphere: FUNC,
    setSize: FUNC,
    setRadius: FUNC,
    setCylinderHeight: FUNC,
    setDirection: FUNC,
    setHeight: FUNC,
    setShapeType: FUNC,
    setVertices: FUNC,
    setMesh: FUNC,
    setTerrain: FUNC,
    setNormal: FUNC,
    setConstant: FUNC,
    updateEventListener: FUNC,
};

export function createShape (type: EColliderType): IBaseShape {
    initColliderProxy();
    return CREATE_COLLIDER_PROXY[type]();
}

function initColliderProxy () {
    if (CREATE_COLLIDER_PROXY.INITED) return;
    CREATE_COLLIDER_PROXY.INITED = true;

    const PHYSICS_BUILTIN = legacyCC._global.CC_PHYSICS_BUILTIN;
    const PHYSICS_CANNON = legacyCC._global.CC_PHYSICS_CANNON;
    const PHYSICS_AMMO = legacyCC._global.CC_PHYSICS_AMMO;

    CREATE_COLLIDER_PROXY[EColliderType.BOX] = function createBoxShape (size: IVec3Like): IBoxShape {
        if (DEBUG && checkPhysicsModule(WRAPPER.BoxShape)) { return ENTIRE_SHAPE; }
        return new WRAPPER.BoxShape(size) as IBoxShape;
    };

    CREATE_COLLIDER_PROXY[EColliderType.SPHERE] = function createSphereShape (radius: number): ISphereShape {
        if (DEBUG && checkPhysicsModule(WRAPPER.SphereShape)) { return ENTIRE_SHAPE; }
        return new WRAPPER.SphereShape(radius) as ISphereShape;
    };

    CREATE_COLLIDER_PROXY[EColliderType.CAPSULE] = function createCapsuleShape (radius = 0.5, height = 2, dir = 1): ICapsuleShape {
        if (!PHYSICS_CANNON) {
            if (DEBUG && checkPhysicsModule(WRAPPER.CapsuleShape)) { return ENTIRE_SHAPE; }
            return new WRAPPER.CapsuleShape(radius, height, dir) as ICapsuleShape;
        }
        warnID(9610);
        return ENTIRE_SHAPE;
    };

    CREATE_COLLIDER_PROXY[EColliderType.CYLINDER] = function createCylinderShape (radius = 0.5, height = 2, dir = 1): ICylinderShape {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.CylinderShape)) { return ENTIRE_SHAPE; }
            return new WRAPPER.CylinderShape(radius, height, dir) as ICylinderShape;
        }
        warnID(9612);
        return ENTIRE_SHAPE;
    };

    CREATE_COLLIDER_PROXY[EColliderType.CONE] = function createConeShape (radius = 0.5, height = 1, dir = 1): IConeShape {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.ConeShape)) { return ENTIRE_SHAPE; }
            return new WRAPPER.ConeShape(radius, height, dir) as IConeShape;
        }
        warnID(9612);
        return ENTIRE_SHAPE;
    };

    CREATE_COLLIDER_PROXY[EColliderType.MESH] = function createTrimeshShape (): ITrimeshShape {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.TrimeshShape)) { return ENTIRE_SHAPE; }
            return new WRAPPER.TrimeshShape() as ITrimeshShape;
        }
        warnID(9611);
        return ENTIRE_SHAPE;
    };

    CREATE_COLLIDER_PROXY[EColliderType.TERRAIN] = function createTerrainShape (): ITerrainShape {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.TerrainShape)) { return ENTIRE_SHAPE; }
            return new WRAPPER.TerrainShape() as ITerrainShape;
        }
        warn("[Physics]: builtin physics system doesn't support cylinder collider");
        return ENTIRE_SHAPE;
    };

    CREATE_COLLIDER_PROXY[EColliderType.SIMPLEX] = function createSimplexShape (): ISimplexShape {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.SimplexShape)) { return ENTIRE_SHAPE; }
            return new WRAPPER.SimplexShape() as ISimplexShape;
        }
        warn("[Physics]: builtin physics system doesn't support simple collider");
        return ENTIRE_SHAPE;
    };

    CREATE_COLLIDER_PROXY[EColliderType.PLANE] = function createPlaneShape (): IPlaneShape {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.PlaneShape)) { return ENTIRE_SHAPE; }
            return new WRAPPER.PlaneShape() as IPlaneShape;
        }
        warn("[Physics]: builtin physics system doesn't support plane collider");
        return ENTIRE_SHAPE;
    };
}

/// CREATE CONSTRAINT ///

const CREATE_CONSTRAINT_PROXY = { INITED: false };

interface IEntireConstraint extends IPointToPointConstraint, IHingeConstraint, IConeTwistConstraint { }
const ENTIRE_CONSTRAINT: IEntireConstraint = {
    impl: null,
    initialize: FUNC,
    onLoad: FUNC,
    onEnable: FUNC,
    onDisable: FUNC,
    onDestroy: FUNC,
    setEnableCollision: FUNC,
    setConnectedBody: FUNC,
    setPivotA: FUNC,
    setPivotB: FUNC,
    setAxis: FUNC,
};

export function createConstraint (type: EConstraintType): IBaseConstraint {
    initConstraintProxy();
    return CREATE_CONSTRAINT_PROXY[type]();
}

function initConstraintProxy () {
    if (CREATE_CONSTRAINT_PROXY.INITED) return;
    CREATE_CONSTRAINT_PROXY.INITED = true;

    const PHYSICS_BUILTIN = legacyCC._global.CC_PHYSICS_BUILTIN;
    const PHYSICS_CANNON = legacyCC._global.CC_PHYSICS_CANNON;
    const PHYSICS_AMMO = legacyCC._global.CC_PHYSICS_AMMO;

    CREATE_CONSTRAINT_PROXY[EConstraintType.POINT_TO_POINT] = function createPointToPointConstraint (): IPointToPointConstraint {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.PointToPointConstraint)) { return ENTIRE_CONSTRAINT; }
            return new WRAPPER.PointToPointConstraint() as IPointToPointConstraint;
        }
        warn("[Physics]: builtin physics system doesn't support point to point constraint");
        return ENTIRE_CONSTRAINT;
    };

    CREATE_CONSTRAINT_PROXY[EConstraintType.HINGE] = function createHingeConstraint (): IHingeConstraint {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.HingeConstraint)) { return ENTIRE_CONSTRAINT; }
            return new WRAPPER.HingeConstraint() as IHingeConstraint;
        }
        warn("[Physics]: builtin physics system doesn't support hinge constraint");
        return ENTIRE_CONSTRAINT;
    };

    CREATE_CONSTRAINT_PROXY[EConstraintType.CONE_TWIST] = function createConeTwistConstraint (): IConeTwistConstraint {
        if (!PHYSICS_BUILTIN) {
            if (DEBUG && checkPhysicsModule(WRAPPER.ConeTwistConstraint)) { return null as any; }
            return new WRAPPER.ConeTwistConstraint() as IConeTwistConstraint;
        }
        warn("[Physics]: builtin physics system doesn't support cone twist constraint");
        return ENTIRE_CONSTRAINT;
    };
}
