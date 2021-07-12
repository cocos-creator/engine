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

import { PhysicsSystem } from './physics-system';
import { PhysicsMaterial } from './assets/physics-material';
import { PhysicsRayResult } from './physics-ray-result';
import { BoxCollider } from './components/colliders/box-collider';
import { Collider } from './components/colliders/collider';
import { SphereCollider } from './components/colliders/sphere-collider';
import { CapsuleCollider } from './components/colliders/capsule-collider';
import { CylinderCollider } from './components/colliders/cylinder-collider';
import { ConeCollider } from './components/colliders/cone-collider';
import { MeshCollider } from './components/colliders/mesh-collider';
import { RigidBody } from './components/rigid-body';
import { ConstantForce } from './components/constant-force';
import { TerrainCollider } from './components/colliders/terrain-collider';
import { SimplexCollider } from './components/colliders/simplex-collider';
import { PlaneCollider } from './components/colliders/plane-collider';

// constraints
import { Constraint } from './components/constraints/constraint';
import { HingeConstraint } from './components/constraints/hinge-constraint';
import { PointToPointConstraint } from './components/constraints/point-to-point-constraint';

import { legacyCC } from '../../core/global-exports';
import { selector } from './physics-selector';
import * as utils from '../utils/util';

/**
 * @en
 * This object stores various types of configuration properties.
 * @zh
 * 该对象存储了多种类型的配置属性。
 */
const config = {
    /**
     * @en
     * The minimum size of the collision body.
     * @zh
     * 碰撞体的最小尺寸。
     */
    minVolumeSize: 1e-5,
};

export {
    PhysicsSystem,
    PhysicsRayResult,

    Collider,
    BoxCollider,
    SphereCollider,
    CapsuleCollider,
    MeshCollider,
    CylinderCollider,
    ConeCollider,
    TerrainCollider,
    SimplexCollider,
    PlaneCollider,

    Constraint,
    HingeConstraint,
    PointToPointConstraint,

    RigidBody,
    PhysicsMaterial,
    ConstantForce,

    selector,
    utils,
    config,
};

legacyCC.PhysicsSystem = PhysicsSystem;

legacyCC.PhysicsMaterial = PhysicsMaterial;
legacyCC.PhysicsRayResult = PhysicsRayResult;
legacyCC.ConstantForce = ConstantForce;

export * from './physics-interface';
export * from './physics-config';
export * from './physics-enum';
