import Ammo from '@cocos/ammo';
import { Vec3, Node } from "../../core";
import { AmmoWorld } from "./ammo-world";
import { cocos2AmmoVec3, ammo2CocosVec3 } from "./ammo-util";
import { RigidBodyComponent, PhysicsSystem } from '../../../exports/physics-framework';
import { AmmoCollisionFlags, AmmoRigidBodyFlags, AmmoCollisionObjectStates } from './ammo-enum';
import { IRigidBody } from '../spec/i-rigid-body';
import { ERigidBodyType } from '../framework/physics-enum';
import { AmmoSharedBody } from './ammo-shared-body';

const v3_0 = new Vec3();

export class AmmoRigidBody implements IRigidBody {

    /** property */
    set mass (value: number) {
        // See https://studiofreya.com/game-maker/bullet-physics/bullet-physics-how-to-change-body-mass/
        const localInertia = this._sharedBody.bodyStruct.localInertia;
        localInertia.setValue(1.6666666269302368, 1.6666666269302368, 1.6666666269302368);
        if (this._btCompoundShape.getNumChildShapes() > 0) {
            this._btCompoundShape.calculateLocalInertia(this._rigidBody.mass, localInertia);
        }
        this._btBody.setMassProps(value, localInertia);
        this._sharedBody.updateByReAdd();
    }

    set linearDamping (value: number) {
        this._btBody.setDamping(this._rigidBody.linearDamping, this._rigidBody.angularDamping);
    }

    set angularDamping (value: number) {
        this._btBody.setDamping(this._rigidBody.linearDamping, this._rigidBody.angularDamping);
    }

    set isKinematic (value: boolean) {
        let m_collisionFlags = this._btBody.getCollisionFlags();
        if (value) {
            m_collisionFlags |= AmmoCollisionFlags.CF_KINEMATIC_OBJECT;
        } else {
            m_collisionFlags &= (~AmmoCollisionFlags.CF_KINEMATIC_OBJECT);
        }
        this._btBody.setCollisionFlags(m_collisionFlags);
    }

    set useGravity (value: boolean) {
        let m_rigidBodyFlag = this._btBody.getFlags()
        if (value) {
            m_rigidBodyFlag &= (~AmmoRigidBodyFlags.BT_DISABLE_WORLD_GRAVITY);
        } else {
            this._btBody.setGravity(cocos2AmmoVec3(this._btVec3_0, Vec3.ZERO));
            m_rigidBodyFlag |= AmmoRigidBodyFlags.BT_DISABLE_WORLD_GRAVITY;
        }
        this._btBody.setFlags(m_rigidBodyFlag);
        this._sharedBody.updateByReAdd();
    }

    set fixedRotation (value: boolean) {
        if (value) {
            /** TODO : should i reset angular velocity & torque ? */

            this._btBody.setAngularFactor(cocos2AmmoVec3(this._btVec3_0, Vec3.ZERO));
        } else {
            this._btBody.setAngularFactor(cocos2AmmoVec3(this._btVec3_0, this._rigidBody.angularFactor));
        }
    }

    set linearFactor (value: Vec3) {
        this._btBody.setLinearFactor(cocos2AmmoVec3(this._btVec3_0, value));
    }

    set angularFactor (value: Vec3) {
        this._btBody.setAngularFactor(cocos2AmmoVec3(this._btVec3_0, value));
    }

    /** state */

    get isAwake (): boolean {
        const state = this._btBody.getActivationState();
        return state == AmmoCollisionObjectStates.ACTIVE_TAG ||
            state == AmmoCollisionObjectStates.DISABLE_DEACTIVATION;
    }

    get isSleepy (): boolean {
        const state = this._btBody.getActivationState();
        return state == AmmoCollisionObjectStates.WANTS_DEACTIVATION;
    }

    get isSleeping (): boolean {
        const state = this._btBody.getActivationState();
        return state == AmmoCollisionObjectStates.ISLAND_SLEEPING;
    }

    get allowSleep (): boolean {
        const state = this._btBody.getActivationState();
        return state == AmmoCollisionObjectStates.DISABLE_DEACTIVATION;
    }

    set allowSleep (v: boolean) {
        if (v) {
            const state = this._btBody.getActivationState();
            if (state == AmmoCollisionObjectStates.DISABLE_DEACTIVATION) {
                this._btBody.setActivationState(AmmoCollisionObjectStates.ACTIVE_TAG);
            }
        } else {
            this._btBody.setActivationState(AmmoCollisionObjectStates.DISABLE_DEACTIVATION);
        }
    }

    get isEnabled () { return this._isEnabled; }
    get rigidBody () { return this._rigidBody; }

    private static idCounter = 0;
    readonly id: number;

    private _isEnabled = false;
    private _sharedBody!: AmmoSharedBody;
    private get _btBody () { return this._sharedBody.body };
    private get _btCompoundShape () { return this._sharedBody.bodyCompoundShape };
    private _rigidBody!: RigidBodyComponent;

    private _btVec3_0 = new Ammo.btVector3();
    private _btVec3_1 = new Ammo.btVector3();

    constructor () {
        this.id = AmmoRigidBody.idCounter++;
    }

    /** LIFECYCLE */

    __preload (com: RigidBodyComponent) {
        this._rigidBody = com;
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as AmmoWorld).getSharedBody(this._rigidBody.node as Node, this);
        this._sharedBody.reference = true;
    }

    onEnable () {
        this._isEnabled = true;
        this.mass = this._rigidBody.mass;
        this.allowSleep = this._rigidBody.allowSleep;
        this.linearDamping = this._rigidBody.linearDamping;
        this.angularDamping = this._rigidBody.angularDamping;
        this.isKinematic = this._rigidBody.isKinematic;
        this.fixedRotation = this._rigidBody.fixedRotation;
        this.linearFactor = this._rigidBody.linearFactor;
        this.angularFactor = this._rigidBody.angularFactor;
        this.useGravity = this._rigidBody.useGravity;
        this._sharedBody.bodyEnabled = true;
    }

    onDisable () {
        this._isEnabled = false;
        this._sharedBody.bodyEnabled = false;
    }

    onDestroy () {
        this._sharedBody.reference = false;
        (this._rigidBody as any) = null;
        (this._sharedBody as any) = null;
    }

    /** INTERFACE */

    wakeUp (force?: boolean): void {
        this._btBody.activate(force);
    }

    sleep (): void {
        return this._btBody.wantsSleeping() as any;
    }

    /** type */

    getType (): ERigidBodyType {
        if (this._btBody.isStaticOrKinematicObject()) {
            if (this._btBody.isKinematicObject()) {
                return ERigidBodyType.KINEMATIC
            } else {
                return ERigidBodyType.STATIC
            }
        } else {
            return ERigidBodyType.DYNAMIC
        }
    }

    /** kinematic */

    getLinearVelocity (out: Vec3): Vec3 {
        return ammo2CocosVec3(out, this._btBody.getLinearVelocity());
    }

    setLinearVelocity (value: Vec3): void {
        cocos2AmmoVec3(this._btBody.getLinearVelocity(), value);
    }

    getAngularVelocity (out: Vec3): Vec3 {
        return ammo2CocosVec3(out, this._btBody.getAngularVelocity());
    }

    setAngularVelocity (value: Vec3): void {
        cocos2AmmoVec3(this._btBody.getAngularVelocity(), value);
    }

    /** dynamic */

    applyLocalForce (force: Vec3, rel_pos?: Vec3): void {
        const rp = rel_pos ? Vec3.transformQuat(v3_0, rel_pos, this._sharedBody.node.worldRotation) : Vec3.ZERO;
        this._btBody.applyForce(
            cocos2AmmoVec3(this._btVec3_0, force),
            cocos2AmmoVec3(this._btVec3_1, rp)
        )
    }

    applyLocalTorque (torque: Vec3): void {
        // this._btBody.applyLocalTorque(cocos2AmmoVec3(_btVec3_0, torque));
        // this._btBody.applyLocalTorque(cocos2AmmoVec3(new Ammo.btVector3(), torque));

        Vec3.transformQuat(v3_0, torque, this._sharedBody.node.worldRotation);
        this._btBody.applyTorque(cocos2AmmoVec3(this._btVec3_0, v3_0));
    }

    applyLocalImpulse (impulse: Vec3, rel_pos?: Vec3): void {
        const rp = rel_pos ? Vec3.transformQuat(v3_0, rel_pos, this._sharedBody.node.worldRotation) : Vec3.ZERO;
        this._btBody.applyImpulse(
            cocos2AmmoVec3(this._btVec3_0, impulse),
            cocos2AmmoVec3(this._btVec3_1, rp)
        )
    }

    applyForce (force: Vec3, rel_pos?: Vec3): void {
        const rp = rel_pos ? rel_pos : Vec3.ZERO;
        this._btBody.applyForce(
            cocos2AmmoVec3(this._btVec3_0, force),
            cocos2AmmoVec3(this._btVec3_1, rp)
        )
    }

    applyTorque (torque: Vec3): void {
        this._btBody.applyTorque(cocos2AmmoVec3(this._btVec3_0, torque));
    }

    applyImpulse (impulse: Vec3, rel_pos?: Vec3): void {
        const rp = rel_pos ? rel_pos : Vec3.ZERO;
        this._btBody.applyImpulse(
            cocos2AmmoVec3(this._btVec3_0, impulse),
            cocos2AmmoVec3(this._btVec3_1, rp)
        )
    }

    /** group mask */
    getGroup (): number {
        return this._sharedBody.collisionFilterGroup;
    }

    setGroup (v: number): void {
        this._sharedBody.collisionFilterGroup = v;
    }

    addGroup (v: number): void {
        this._sharedBody.collisionFilterGroup |= v;
    }

    removeGroup (v: number): void {
        this._sharedBody.collisionFilterGroup &= ~v;
    }

    getMask (): number {
        return this._sharedBody.collisionFilterMask;
    }

    setMask (v: number): void {
        this._sharedBody.collisionFilterMask = v;
    }

    addMask (v: number): void {
        this._sharedBody.collisionFilterMask |= v;
    }

    removeMask (v: number): void {
        this._sharedBody.collisionFilterMask &= ~v;
    }

}
