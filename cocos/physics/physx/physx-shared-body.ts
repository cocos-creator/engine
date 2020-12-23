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
import { Node, Quat, Vec3 } from '../../core';
import { PhysXRigidBody } from './physx-rigid-body';
import { PhysXWorld } from './physx-world';
import { PhysXShape } from './shapes/physx-shape';
import { TransformBit } from '../../core/scene-graph/node-enum';
import { copyPhysXTransform, getTempTransform, physXEqualsCocosQuat, physXEqualsCocosVec3, PX, setMassAndUpdateInertia } from './export-physx';
import { VEC3_0 } from '../utils/util';
import { ERigidBodyType, PhysicsSystem } from '../framework';

export class PhysXSharedBody {
    private static idCounter = 0;
    private static readonly sharedBodesMap = new Map<string, PhysXSharedBody>();

    static getSharedBody (node: Node, wrappedWorld: PhysXWorld, wrappedBody?: PhysXRigidBody): PhysXSharedBody {
        const key = node.uuid;
        let newSB!: PhysXSharedBody;
        if (PhysXSharedBody.sharedBodesMap.has(key)) {
            newSB = PhysXSharedBody.sharedBodesMap.get(key)!;
        } else {
            newSB = new PhysXSharedBody(node, wrappedWorld);
            PhysXSharedBody.sharedBodesMap.set(node.uuid, newSB);
        }
        if (wrappedBody) {
            newSB._wrappedBody = wrappedBody;
            const g = wrappedBody.rigidBody.group;
            const m = PhysicsSystem.instance.collisionMatrix[g];
            newSB.filterData.word0 = g;
            newSB.filterData.word1 = m;
        }
        return newSB;
    }

    readonly id: number;
    readonly node: Node;
    readonly wrappedWorld: PhysXWorld;
    readonly wrappedShapes: PhysXShape[] = [];

    get isStatic (): boolean { return this._isStatic; }
    get isKinematic (): boolean { return this._isKinematic; }
    get isDynamic (): boolean { return !this._isStatic && !this._isKinematic; }
    get wrappedBody (): PhysXRigidBody | null { return this._wrappedBody; }
    get filterData () { return this._filterData; }
    get impl (): any {
        this._initActor();
        return this._impl;
    }

    private _index = -1;
    private _ref = 0;
    private _isStatic = false;
    private _isKinematic = false;
    private _impl!: PhysX.RigidActor | any;
    private _wrappedBody: PhysXRigidBody | null = null;
    private _filterData: any;

    set reference (v: boolean) {
        this._ref = v ? this._ref + 1 : this._ref - 1;
        if (this._ref === 0) { this.destroy(); }
    }

    set enabled (v: boolean) {
        if (v) {
            if (this._index < 0) {
                this._index = this.wrappedWorld.wrappedBodies.length;
                this.wrappedWorld.addActor(this);
            }
        } else if (this._index >= 0) {
            const ws = this.wrappedShapes;
            const wb = this.wrappedBody;
            const isRemove = (ws.length === 0 && wb == null)
                || (ws.length === 0 && wb != null && !wb.isEnabled);

            if (isRemove) {
                this._index = -1;
                this.clearForces();
                this.clearVelocity();
                this.wrappedWorld.removeActor(this);
            }
        }
    }

    constructor (node: Node, wrappedWorld: PhysXWorld) {
        this.id = PhysXSharedBody.idCounter++;
        this.node = node;
        this.wrappedWorld = wrappedWorld;
        this._filterData = {
            word0: 1,
            word1: ((0xffffffff & (~2)) >>> 0),
            word2: 0,
            word3: 0,
        };
    }

    private _initActor (): void {
        if (this._impl) return;
        const t = getTempTransform(this.node.worldPosition, this.node.worldRotation);
        const wb = this.wrappedBody;
        if (wb) {
            const rb = wb.rigidBody;
            if (rb.type === ERigidBodyType.STATIC) {
                this._isStatic = true;
                this._impl = this.wrappedWorld.physics.createRigidStatic(t);
            } else {
                this._isStatic = false;
                this._impl = this.wrappedWorld.physics.createRigidDynamic(t);
                this._impl.setMass(rb.mass);
                this._impl.setActorFlag(PX.ActorFlag.eDISABLE_GRAVITY, !rb.useGravity);
                this.setRigidBodyFlag(PX.RigidBodyFlag.eKINEMATIC, rb.isKinematic);
                this._impl.setLinearDamping(rb.linearDamping);
                this._impl.setAngularDamping(rb.angularDamping);
                const lf = rb.linearFactor;
                this._impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_X, !lf.x);
                this._impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_Y, !lf.y);
                this._impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_Z, !lf.z);
                const af = rb.angularFactor;
                this._impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_X, !af.x);
                this._impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Y, !af.y);
                this._impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Z, !af.z);
            }
        } else {
            this._isStatic = true;
            this._impl = this.wrappedWorld.physics.createRigidStatic(t);
        }
        if (this._impl && this._impl.$$) {
            PX.IMPL_PTR[this._impl.$$.ptr] = this;
        }
    }

    addShape (ws: PhysXShape): void {
        const index = this.wrappedShapes.indexOf(ws);
        if (index < 0) {
            ws.setIndex(this.wrappedShapes.length);
            ws.updateFilterData(this._filterData);
            this.impl.attachShape(ws.impl);
            this.wrappedShapes.push(ws);
            if (!ws.collider.isTrigger) {
                if (!Vec3.strictEquals(ws.collider.center, Vec3.ZERO)) this.updateCenterOfMass();
                if (this.isDynamic) setMassAndUpdateInertia(this.impl, this._wrappedBody!.rigidBody.mass);
            }
        }
    }

    removeShape (ws: PhysXShape): void {
        const index = this.wrappedShapes.indexOf(ws);
        if (index >= 0) {
            ws.setIndex(-1);
            this.impl.detachShape(ws.impl, true);
            this.wrappedShapes.splice(index, 1);
            if (!ws.collider.isTrigger) {
                if (!Vec3.strictEquals(ws.collider.center, Vec3.ZERO)) this.updateCenterOfMass();
                if (this.isDynamic) setMassAndUpdateInertia(this.impl, this._wrappedBody!.rigidBody.mass);
            }
        }
    }

    setMass (v: number): void {
        if (v <= 0) return;
        if (!this.isDynamic) return;
        setMassAndUpdateInertia(this.impl, v);
    }

    setRigidBodyFlag (v: any, b: boolean): void {
        if (v === PX.RigidBodyFlag.eKINEMATIC) {
            this._isKinematic = b;
        }
        this.impl.setRigidBodyFlag(v, b);
    }

    syncSceneToPhysics (): void {
        const node = this.node;
        if (node.hasChangedFlags) {
            if (node.hasChangedFlags & TransformBit.SCALE) {
                const l = this.wrappedShapes.length;
                for (let i = 0; i < l; i++) {
                    this.wrappedShapes[i].updateScale();
                }
            }
            const trans = getTempTransform(node.worldPosition, node.worldRotation);
            if (this._isKinematic) {
                this._impl.setKinematicTarget(trans);
            } else {
                this._impl.setGlobalPose(trans, true);
            }
        }
    }

    syncSceneWithCheck (): void {
        const node = this.node;
        if (node.hasChangedFlags) {
            if (node.hasChangedFlags & TransformBit.SCALE) {
                const l = this.wrappedShapes.length;
                for (let i = 0; i < l; i++) {
                    this.wrappedShapes[i].updateScale();
                }
            }
            const wp = node.worldPosition;
            const wr = node.worldRotation;
            const pose = this._impl.getGlobalPose();
            const DontUpdate = physXEqualsCocosVec3(pose, wp) && physXEqualsCocosQuat(pose, wr);
            if (!DontUpdate) {
                const trans = getTempTransform(node.worldPosition, node.worldRotation);
                if (this._isKinematic) {
                    this._impl.setKinematicTarget(trans);
                } else {
                    this._impl.setGlobalPose(trans, true);
                }
            }
        }
    }

    syncPhysicsToScene (): void {
        if (this._isStatic || this._impl.isSleeping()) return;
        const transform = this._impl.getGlobalPose();
        copyPhysXTransform(this.node, transform);
    }

    setGroup (v: number): void {
        this._filterData.word0 = v;
        this.updateFilterData();
    }

    getGroup (): number {
        return this._filterData.word0;
    }

    addGroup (v: number): void {
        this._filterData.word0 |= v;
        this.updateFilterData();
    }

    removeGroup (v: number): void {
        this._filterData.word0 &= ~v;
        this.updateFilterData();
    }

    setMask (v: number): void {
        if (v === -1) v = 0xffffffff;
        this._filterData.word1 = v;
        this.updateFilterData();
    }

    getMask (): number {
        return this._filterData.word1;
    }

    addMask (v: number): void {
        this._filterData.word1 |= v;
        this.updateFilterData();
    }

    removeMask (v: number): void {
        this._filterData.word1 &= ~v;
        this.updateFilterData();
    }

    updateFilterData (): void {
        for (let i = 0; i < this.wrappedShapes.length; i++) {
            this.wrappedShapes[i].updateFilterData(this._filterData);
        }
    }

    updateCenterOfMass (): void {
        if (!this.impl || this._isStatic) return;
        const center = VEC3_0;
        center.set(0, 0, 0);
        for (let i = 0; i < this.wrappedShapes.length; i++) {
            center.subtract(this.wrappedShapes[i].collider.center);
        }
        this._impl.setCMassLocalPose(getTempTransform(center, Quat.IDENTITY));
    }

    clearForces (): void {
        if (this._isStatic || this._isKinematic) return;
        this.impl.clearForce(PX.ForceMode.eFORCE); // this.impl.clearForce(PX.ForceMode.eACCELERATION);
        this.impl.clearForce(PX.ForceMode.eIMPULSE); // this.impl.clearForce(PX.ForceMode.eVELOCITY_CHANGE);
        this.impl.clearTorque(PX.ForceMode.eFORCE);
        this.impl.clearTorque(PX.ForceMode.eIMPULSE);
    }

    clearVelocity (): void {
        if (this._isStatic || this._isKinematic) return;
        this.impl.setLinearVelocity(Vec3.ZERO, false);
        this.impl.setAngularVelocity(Vec3.ZERO, false);
    }

    destroy (): void {
        if (this._impl && this._impl.$$) {
            PX.IMPL_PTR[this._impl.$$.ptr] = null;
            delete PX.IMPL_PTR[this._impl.$$.ptr];
            this._impl.release();
        }
        PhysXSharedBody.sharedBodesMap.delete(this.node.uuid);
    }
}
