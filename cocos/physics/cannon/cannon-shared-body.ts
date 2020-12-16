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

import CANNON from '@cocos/cannon';
import { Quat, Vec3 } from '../../core/math';
import { ERigidBodyType } from '../framework/physics-enum';
import { getWrap } from '../framework/util';
import { CannonWorld } from './cannon-world';
import { CannonShape } from './shapes/cannon-shape';
import { Collider, PhysicsSystem } from '../../../exports/physics-framework';
import { TransformBit } from '../../core/scene-graph/node-enum';
import { Node } from '../../core';
import { CollisionEventType, IContactEquation } from '../framework/physics-interface';
import { CannonRigidBody } from './cannon-rigid-body';
import { commitShapeUpdates } from './cannon-util';
import { CannonContactEquation } from './cannon-contact-equation';

const v3_0 = new Vec3();
const quat_0 = new Quat();
const contactsPool: CannonContactEquation[] = [] as any;
const CollisionEventObject = {
    type: 'onCollisionEnter' as CollisionEventType,
    selfCollider: null as unknown as Collider,
    otherCollider: null as unknown as Collider,
    contacts: [] as CannonContactEquation[],
    impl: null as unknown as CANNON.ICollisionEvent,
};

/**
 * node : shared-body = 1 : 1
 * static
 */
export class CannonSharedBody {
    private static readonly sharedBodesMap = new Map<string, CannonSharedBody>();

    static getSharedBody (node: Node, wrappedWorld: CannonWorld, wrappedBody?: CannonRigidBody) {
        const key = node.uuid;
        let newSB: CannonSharedBody;
        if (CannonSharedBody.sharedBodesMap.has(key)) {
            newSB = CannonSharedBody.sharedBodesMap.get(key)!;
        } else {
            newSB = new CannonSharedBody(node, wrappedWorld);
            CannonSharedBody.sharedBodesMap.set(node.uuid, newSB);
        }
        if (wrappedBody) {
            newSB.wrappedBody = wrappedBody;
            const g = wrappedBody.rigidBody.group;
            const m = PhysicsSystem.instance.collisionMatrix[g];
            newSB.body.collisionFilterGroup = g;
            newSB.body.collisionFilterMask = m;
        }
        return newSB;
    }

    readonly node: Node;
    readonly wrappedWorld: CannonWorld;
    readonly body: CANNON.Body;
    readonly shapes: CannonShape[] = [];
    wrappedBody: CannonRigidBody | null = null;

    private index = -1;
    private ref = 0;
    private onCollidedListener = this.onCollided.bind(this);

    /**
     * add or remove from world \
     * add, if enable \
     * remove, if disable & shapes.length == 0 & wrappedBody disable
     */
    set enabled (v: boolean) {
        if (v) {
            if (this.index < 0) {
                this.index = this.wrappedWorld.bodies.length;
                this.wrappedWorld.addSharedBody(this);
                this.syncInitial();
            }
        } else if (this.index >= 0) {
            const isRemove = (this.shapes.length == 0 && this.wrappedBody == null)
                    || (this.shapes.length == 0 && this.wrappedBody != null && !this.wrappedBody.isEnabled);

            if (isRemove) {
                this.body.sleep(); // clear velocity etc.
                this.index = -1;
                this.wrappedWorld.removeSharedBody(this);
            }
        }
    }

    set reference (v: boolean) {
        // eslint-disable-next-line no-unused-expressions
        v ? this.ref++ : this.ref--;
        if (this.ref === 0) { this.destroy(); }
    }

    private constructor (node: Node, wrappedWorld: CannonWorld) {
        this.wrappedWorld = wrappedWorld;
        this.node = node;
        this.body = new CANNON.Body();
        this.body.collisionFilterGroup = PhysicsSystem.PhysicsGroup.DEFAULT;
        this.body.sleepSpeedLimit = PhysicsSystem.instance.sleepThreshold;
        this.body.material = this.wrappedWorld.impl.defaultMaterial;
        this.body.addEventListener('cc-collide', this.onCollidedListener);
    }

    addShape (v: CannonShape) {
        const index = this.shapes.indexOf(v);
        if (index < 0) {
            const index = this.body.shapes.length;
            this.body.addShape(v.impl);
            this.shapes.push(v);

            v.setIndex(index);
            const offset = this.body.shapeOffsets[index];
            const orient = this.body.shapeOrientations[index];
            v.setOffsetAndOrient(offset, orient);
            if (this.body.isSleeping()) this.body.wakeUp();
        }
    }

    removeShape (v: CannonShape) {
        const index = this.shapes.indexOf(v);
        if (index >= 0) {
            this.shapes.splice(index, 1);
            this.body.removeShape(v.impl);
            v.setIndex(-1);
            if (this.body.isSleeping()) this.body.wakeUp();
        }
    }

    syncSceneToPhysics () {
        if (this.node.hasChangedFlags) {
            if (this.body.isSleeping()) this.body.wakeUp();
            Vec3.copy(this.body.position, this.node.worldPosition);
            Quat.copy(this.body.quaternion, this.node.worldRotation);
            this.body.aabbNeedsUpdate = true;
            if (this.node.hasChangedFlags & TransformBit.SCALE) {
                for (let i = 0; i < this.shapes.length; i++) {
                    this.shapes[i].setScale(this.node.worldScale);
                }
                commitShapeUpdates(this.body);
            }
        }
    }

    syncPhysicsToScene () {
        if (this.body.type === ERigidBodyType.DYNAMIC) {
            if (!this.body.isSleeping()) {
                Vec3.copy(v3_0, this.body.position);
                Quat.copy(quat_0, this.body.quaternion);
                this.node.worldPosition = v3_0;
                this.node.worldRotation = quat_0;
            }
        }
    }

    syncInitial () {
        Vec3.copy(this.body.position, this.node.worldPosition);
        Quat.copy(this.body.quaternion, this.node.worldRotation);
        this.body.aabbNeedsUpdate = true;
        for (let i = 0; i < this.shapes.length; i++) {
            this.shapes[i].setScale(this.node.worldScale);
        }
        commitShapeUpdates(this.body);

        if (this.body.isSleeping()) this.body.wakeUp();
    }

    private destroy () {
        this.body.removeEventListener('cc-collide', this.onCollidedListener);
        CannonSharedBody.sharedBodesMap.delete(this.node.uuid);
        delete (CANNON.World as any).idToBodyMap[this.body.id];
        (this.node as any) = null;
        (this.wrappedWorld as any) = null;
        (this.body as any) = null;
        (this.shapes as any) = null;
        (this.onCollidedListener as any) = null;
    }

    private onCollided (event: CANNON.ICollisionEvent) {
        CollisionEventObject.type = event.event;
        const self = getWrap<CannonShape>(event.selfShape);
        const other = getWrap<CannonShape>(event.otherShape);
        if (self && self.collider.needCollisionEvent) {
            contactsPool.push.apply(contactsPool, CollisionEventObject.contacts);
            CollisionEventObject.contacts.length = 0;

            CollisionEventObject.impl = event;
            CollisionEventObject.selfCollider = self.collider;
            CollisionEventObject.otherCollider = other ? other.collider : (null as any);

            let i = 0;
            for (i = 0; i < event.contacts.length; i++) {
                const cq = event.contacts[i];
                if (contactsPool.length > 0) {
                    const c = contactsPool.pop();
                    c!.impl = cq;
                    CollisionEventObject.contacts.push(c!);
                } else {
                    const c = new CannonContactEquation(CollisionEventObject);
                    c.impl = cq;
                    CollisionEventObject.contacts.push(c);
                }
            }

            for (i = 0; i < this.shapes.length; i++) {
                const shape = this.shapes[i];
                shape.collider.emit(CollisionEventObject.type, CollisionEventObject);
            }
        }
    }
}
