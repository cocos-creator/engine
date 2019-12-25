import Ammo from '@cocos/ammo';
import { Vec3 } from "../../core/math";
import { AmmoSharedBody } from "./ammo-shared-body";
import { AmmoRigidBody } from "./ammo-rigid-body";
import { AmmoShape } from './shapes/ammo-shape';
import { ArrayCollisionMatrix } from '../utils/array-collision-matrix';
import { TupleDictionary } from '../utils/tuple-dictionary';
import { TriggerEventObject, CollisionEventObject } from './ammo-const';
import { ammo2CocosVec3, cocos2AmmoVec3, cocos2AmmoQuat } from './ammo-util';
import { ray } from '../../core/geom-utils';
import { IRaycastOptions, IPhysicsWorld } from '../spec/i-physics-world';
import { PhysicsRayResult, PhysicMaterial } from '../framework';
import { Node, RecyclePool } from '../../core';
import { AmmoInstance } from './ammo-instance';
import { AmmoCollisionFilterGroups } from './ammo-enum';

const contactsPool = [] as any;
const v3_0 = new Vec3();
export class AmmoWorld implements IPhysicsWorld {

    set allowSleep (v: boolean) { };
    set defaultMaterial (v: PhysicMaterial) { };

    set gravity (gravity: Vec3) {
        cocos2AmmoVec3(this._btGravity, gravity);
        this._world.setGravity(this._btGravity);
    }

    get world () {
        return this._world;
    }

    private readonly _world: Ammo.btDiscreteDynamicsWorld;
    private readonly _btBroadphase: Ammo.btDbvtBroadphase;
    private readonly _btSolver: Ammo.btSequentialImpulseConstraintSolver;
    private readonly _btDispatcher: Ammo.btCollisionDispatcher;
    private readonly _btGravity: Ammo.btVector3;

    readonly bodies: AmmoSharedBody[] = [];
    readonly ghosts: AmmoSharedBody[] = [];
    readonly triggerArrayMat = new ArrayCollisionMatrix();
    readonly collisionArrayMat = new ArrayCollisionMatrix();
    readonly contactsDic = new TupleDictionary();
    readonly oldContactsDic = new TupleDictionary();

    readonly closeHitCB = new Ammo.ClosestRayResultCallback(new Ammo.btVector3(), new Ammo.btVector3());
    readonly allHitsCB = new Ammo.AllHitsRayResultCallback(new Ammo.btVector3(), new Ammo.btVector3());

    constructor (options?: any) {
        const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        this._btDispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        this._btBroadphase = new Ammo.btDbvtBroadphase();
        this._btSolver = new Ammo.btSequentialImpulseConstraintSolver();
        this._world = new Ammo.btDiscreteDynamicsWorld(this._btDispatcher, this._btBroadphase, this._btSolver, collisionConfiguration);
        this._btGravity = new Ammo.btVector3(0, -10, 0);
        this._world.setGravity(this._btGravity);
    }

    step (timeStep: number, fixTimeStep?: number, maxSubStep?: number) {

        for (let i = 0; i < this.ghosts.length; i++) {
            this.ghosts[i].syncSceneToGhost();
        }

        for (let i = 0; i < this.bodies.length; i++) {
            this.bodies[i].syncSceneToPhysics();
        }

        this._world.stepSimulation(timeStep, maxSubStep, fixTimeStep);

        for (let i = 0; i < this.bodies.length; i++) {
            this.bodies[i].syncPhysicsToScene();
        }

        const numManifolds = this._btDispatcher.getNumManifolds();
        for (let i = 0; i < numManifolds; i++) {
            const manifold = this._btDispatcher.getManifoldByIndexInternal(i);
            const body0 = manifold.getBody0();
            const body1 = manifold.getBody1();
            const index0 = body0.getUserIndex();
            const index1 = body1.getUserIndex();
            const numContacts = manifold.getNumContacts();
            for (let j = 0; j < numContacts; j++) {
                const manifoldPoint: Ammo.btManifoldPoint = manifold.getContactPoint(j);
                const d = manifoldPoint.getDistance();
                if (d <= 0.0001) {
                    const key0 = 'KEY' + index0;
                    const key1 = 'KEY' + index1;
                    const shared0 = AmmoInstance.bodyAndGhosts[key0];
                    const shared1 = AmmoInstance.bodyAndGhosts[key1];
                    const shape0 = shared0.wrappedShapes[manifoldPoint.m_index0];
                    const shape1 = shared1.wrappedShapes[manifoldPoint.m_index1];

                    // current contact
                    var item = this.contactsDic.get(shape0.id, shape1.id) as any;
                    if (item == null) {
                        item = this.contactsDic.set(shape0.id, shape1.id,
                            {
                                shape0: shape0,
                                shape1: shape1,
                                contacts: []
                            }
                        );
                    }
                    item.contacts.push(manifoldPoint);
                }
            }
        }

        this.emitEvents();
    }

    raycast (worldRay: ray, options: IRaycastOptions, pool: RecyclePool<PhysicsRayResult>, results: PhysicsRayResult[]): boolean {
        let from = cocos2AmmoVec3(this.allHitsCB.m_rayFromWorld, worldRay.o);
        worldRay.computeHit(v3_0, options.maxDistance);
        let to = cocos2AmmoVec3(this.allHitsCB.m_rayToWorld, v3_0);

        this.allHitsCB.m_collisionFilterGroup = -1;
        this.allHitsCB.m_collisionFilterMask = -1;
        this.allHitsCB.m_closestHitFraction = 1;
        this.allHitsCB.m_shapePart = -1;
        (this.allHitsCB.m_collisionObject as any) = null;
        this.allHitsCB.m_shapeParts.clear();
        this.allHitsCB.m_hitFractions.clear();
        this.allHitsCB.m_collisionObjects.clear();

        this._world.rayTest(from, to, this.allHitsCB);
        if (this.allHitsCB.hasHit()) {
            for (let i = 0, n = this.allHitsCB.m_collisionObjects.size(); i < n; i++) {
                const shapeIndex = this.allHitsCB.m_shapeParts.at(i);
                const btObj = this.allHitsCB.m_collisionObjects.at(i);
                const index = btObj.getUserIndex();
                const shared = AmmoInstance.bodyAndGhosts['KEY' + index];
                // if (shared.wrappedShapes.length > shapeIndex) {
                const shape = shared.wrappedShapes[shapeIndex];
                const hitFraction = this.allHitsCB.m_hitFractions.at(i);
                v3_0.x = from.x() + hitFraction * (to.x() - from.x());
                v3_0.y = from.y() + hitFraction * (to.y() - from.y());
                v3_0.z = from.z() + hitFraction * (to.z() - from.z());
                const distance = Vec3.distance(worldRay.o, v3_0);
                const r = pool.add();
                r._assign(v3_0, distance, shape.collider);
                results.push(r);
                // }
            }
            return true;
        }
        return false;
    }

    /**
     * Ray cast, and return information of the closest hit.
     * @return True if any body was hit.
     */
    raycastClosest (worldRay: ray, options: any, result: PhysicsRayResult): boolean {
        let from = cocos2AmmoVec3(this.closeHitCB.m_rayFromWorld, worldRay.o);
        worldRay.computeHit(v3_0, options.maxDistance);
        let to = cocos2AmmoVec3(this.closeHitCB.m_rayToWorld, v3_0);

        this.closeHitCB.m_collisionFilterGroup = -1;
        this.closeHitCB.m_collisionFilterMask = -1;
        this.closeHitCB.m_closestHitFraction = 1;
        (this.closeHitCB.m_collisionObject as any) = null;

        this._world.rayTest(from, to, this.closeHitCB);
        if (this.closeHitCB.hasHit()) {
            const btObj = this.closeHitCB.m_collisionObject;
            const index = btObj.getUserIndex();
            const shared = AmmoInstance.bodyAndGhosts['KEY' + index];
            const shapeIndex = this.closeHitCB.m_shapePart;
            // if (shared.wrappedShapes.length > shapeIndex) {
            const shape = shared.wrappedShapes[shapeIndex];
            ammo2CocosVec3(v3_0, this.closeHitCB.m_hitPointWorld);
            const distance = Vec3.distance(worldRay.o, v3_0);
            result._assign(v3_0, distance, shape.collider);
            return true;
            // }
        }
        return false;
    }

    getSharedBody (node: Node, wrappedBody?: AmmoRigidBody) {
        return AmmoSharedBody.getSharedBody(node, this, wrappedBody);
    }

    addSharedBody (sharedBody: AmmoSharedBody) {
        const i = this.bodies.indexOf(sharedBody);
        if (i < 0) {
            this.bodies.push(sharedBody);
            if (sharedBody.body.isStaticObject()) {
                this._world.addCollisionObject(sharedBody.body, sharedBody.collisionFilterGroup, sharedBody.collisionFilterMask);
            }
            else {
                this._world.addRigidBody(sharedBody.body, sharedBody.collisionFilterGroup, sharedBody.collisionFilterMask);
            }
        }
    }

    removeSharedBody (sharedBody: AmmoSharedBody) {
        const i = this.bodies.indexOf(sharedBody);
        if (i >= 0) {
            this.bodies.splice(i, 1);
            if (sharedBody.body.isStaticObject()) {
                this._world.removeCollisionObject(sharedBody.body);
            } else {
                this._world.removeRigidBody(sharedBody.body);
            }
        }
    }

    addGhostObject (sharedBody: AmmoSharedBody) {
        const i = this.ghosts.indexOf(sharedBody);
        if (i < 0) {
            this.ghosts.push(sharedBody);
            this._world.addCollisionObject(sharedBody.ghost, sharedBody.collisionFilterGroup, sharedBody.collisionFilterMask);
        }
    }

    removeGhostObject (sharedBody: AmmoSharedBody) {
        const i = this.ghosts.indexOf(sharedBody);
        if (i >= 0) {
            this.ghosts.splice(i, 1);
            this._world.removeCollisionObject(sharedBody.ghost);
        }
    }

    emitEvents () {
        // is enter or stay
        let dicL = this.contactsDic.getLength();
        while (dicL--) {
            for (let j = CollisionEventObject.contacts.length; j--;) {
                contactsPool.push(CollisionEventObject.contacts.pop());
            }

            const key = this.contactsDic.getKeyByIndex(dicL);
            const data = this.contactsDic.getDataByKey(key) as any;
            const shape0: AmmoShape = data.shape0;
            const shape1: AmmoShape = data.shape1;
            this.oldContactsDic.set(shape0.id, shape1.id, data);
            const collider0 = shape0.collider;
            const collider1 = shape1.collider;
            if (collider0 && collider1) {
                const isTrigger = collider0.isTrigger || collider1.isTrigger;
                if (isTrigger) {
                    if (this.triggerArrayMat.get(shape0.id, shape1.id)) {
                        TriggerEventObject.type = 'onTriggerStay';
                    } else {
                        TriggerEventObject.type = 'onTriggerEnter';
                        this.triggerArrayMat.set(shape0.id, shape1.id, true);
                    }
                    TriggerEventObject.selfCollider = collider0;
                    TriggerEventObject.otherCollider = collider1;
                    collider0.emit(TriggerEventObject.type, TriggerEventObject);

                    TriggerEventObject.selfCollider = collider1;
                    TriggerEventObject.otherCollider = collider0;
                    collider1.emit(TriggerEventObject.type, TriggerEventObject);
                } else {
                    if (this.collisionArrayMat.get(shape0.id, shape1.id)) {
                        CollisionEventObject.type = 'onCollisionStay';
                    } else {
                        CollisionEventObject.type = 'onCollisionEnter';
                        this.collisionArrayMat.set(shape0.id, shape1.id, true);
                    }

                    for (let i = 0; i < data.contacts.length; i++) {
                        const cq = data.contacts[i] as Ammo.btManifoldPoint;
                        if (contactsPool.length > 0) {
                            const c = contactsPool.pop();
                            ammo2CocosVec3(c.contactA, cq.m_positionWorldOnA);
                            ammo2CocosVec3(c.contactB, cq.m_positionWorldOnB);
                            ammo2CocosVec3(c.normal, cq.m_normalWorldOnB);
                            CollisionEventObject.contacts.push(c);
                        } else {
                            const c = {
                                contactA: ammo2CocosVec3(new Vec3(), cq.m_positionWorldOnA),
                                contactB: ammo2CocosVec3(new Vec3(), cq.m_positionWorldOnB),
                                normal: ammo2CocosVec3(new Vec3(), cq.m_normalWorldOnB),
                            };
                            CollisionEventObject.contacts.push(c);
                        }
                    }

                    CollisionEventObject.selfCollider = collider0;
                    CollisionEventObject.otherCollider = collider1;
                    collider0.emit(CollisionEventObject.type, CollisionEventObject);

                    CollisionEventObject.selfCollider = collider1;
                    CollisionEventObject.otherCollider = collider0;
                    collider1.emit(CollisionEventObject.type, CollisionEventObject);
                }

                if (this.oldContactsDic.get(shape0.id, shape1.id) == null) {
                    this.oldContactsDic.set(shape0.id, shape1.id, data);
                }

                // shape0.sharedBody.syncSceneToPhysics();
                // shape1.sharedBody.syncSceneToPhysics();
            }
        }

        /** TODO: 待一致，此处 trigger 和 collsion 事件，
         * 在碰撞盒子改变 isTrigger 后目前不会触发 exit 事件 
         * */
        // is exit
        let oldDicL = this.oldContactsDic.getLength();
        while (oldDicL--) {
            let key = this.oldContactsDic.getKeyByIndex(oldDicL);
            let data = this.oldContactsDic.getDataByKey(key) as any;
            const shape0: AmmoShape = data.shape0;
            const shape1: AmmoShape = data.shape1;
            const collider0 = shape0.collider;
            const collider1 = shape1.collider;
            if (collider0 && collider1) {
                const isTrigger = collider0.isTrigger || collider1.isTrigger;
                if (this.contactsDic.getDataByKey(key) == null) {
                    if (isTrigger) {
                        // emit exit
                        if (this.triggerArrayMat.get(shape0.id, shape1.id)) {
                            TriggerEventObject.type = 'onTriggerExit';
                            TriggerEventObject.selfCollider = collider0;
                            TriggerEventObject.otherCollider = collider1;
                            collider0.emit(TriggerEventObject.type, TriggerEventObject);

                            TriggerEventObject.selfCollider = collider1;
                            TriggerEventObject.otherCollider = collider0;
                            collider1.emit(TriggerEventObject.type, TriggerEventObject);

                            this.triggerArrayMat.set(shape0.id, shape1.id, false);
                            this.oldContactsDic.set(shape0.id, shape1.id, null);
                        }
                    }
                    else {
                        // emit exit
                        if (this.collisionArrayMat.get(shape0.id, shape1.id)) {
                            for (let j = CollisionEventObject.contacts.length; j--;) {
                                contactsPool.push(CollisionEventObject.contacts.pop());
                            }

                            for (let i = 0; i < data.contacts.length; i++) {
                                const cq = data.contacts[i] as Ammo.btManifoldPoint;
                                if (contactsPool.length > 0) {
                                    const c = contactsPool.pop();
                                    ammo2CocosVec3(c.contactA, cq.m_positionWorldOnA);
                                    ammo2CocosVec3(c.contactB, cq.m_positionWorldOnB);
                                    ammo2CocosVec3(c.normal, cq.m_normalWorldOnB);
                                    CollisionEventObject.contacts.push(c);
                                } else {
                                    const c = {
                                        contactA: ammo2CocosVec3(new Vec3(), cq.m_positionWorldOnA),
                                        contactB: ammo2CocosVec3(new Vec3(), cq.m_positionWorldOnB),
                                        normal: ammo2CocosVec3(new Vec3(), cq.m_normalWorldOnB),
                                    };
                                    CollisionEventObject.contacts.push(c);
                                }
                            }

                            CollisionEventObject.type = 'onCollisionExit';
                            CollisionEventObject.selfCollider = collider0;
                            CollisionEventObject.otherCollider = collider1;
                            collider0.emit(CollisionEventObject.type, CollisionEventObject);

                            CollisionEventObject.selfCollider = collider1;
                            CollisionEventObject.otherCollider = collider0;
                            collider1.emit(CollisionEventObject.type, CollisionEventObject);

                            this.collisionArrayMat.set(shape0.id, shape1.id, false);
                            this.oldContactsDic.set(shape0.id, shape1.id, null);
                        }
                    }

                    // shape0.sharedBody.syncSceneToPhysics();
                    // shape1.sharedBody.syncSceneToPhysics();
                }
            }
        }

        this.contactsDic.reset();
    }
}
