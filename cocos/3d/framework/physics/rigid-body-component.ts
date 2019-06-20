
import {
    ccclass,
    executeInEditMode,
    executionOrder,
    menu,
    property,
} from '../../../core/data/class-decorator';
import { Quat, Vec3 } from '../../../core/value-types';
import { vec3 } from '../../../core/vmath';
import { PhysicsMaterial } from '../../assets/physics/material';
import { ETransformSource } from '../../physics/physic-enum';
import { DefaultPhysicsMaterial as DefaultPhysicsMaterial } from './default-material';
import { PhysicsBasedComponent } from './detail/physics-based-component';

const NonRigidBodyProperties = {
    mass: 10,
    linearDamping: 0,
    angularDamping: 0,
};

@ccclass('cc.RigidBodyComponent')
@executionOrder(99)
@menu('Components/RigidBodyComponent')
@executeInEditMode
export class RigidBodyComponent extends PhysicsBasedComponent {

    /// PUBLIC PROPERTY GETTER\SETTER ///

    // Shielding physics material for alpha version
    // @property({
    //     type: PhysicsMaterial,
    // })
    // get material () {
    //     return this._material;
    // }

    // set material (value) {
    //     this._material = value;
    //     // if (!CC_EDITOR && !CC_PHYISCS_BUILT_IN) {
    //     //     this._body.material = (this._material || DefaultPhysicsMaterial)._getImpl();
    //     // }
    // }

    /**
     * @zh
     * 获取刚体的质量。
     */
    @property({
        displayOrder: 0,
    })
    public get mass () {
        return this._mass;
    }

    /**
     * @zh
     * 设置刚体的质量。
     */
    public set mass (value) {
        this._mass = value;
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setMass(value);
        }
    }

    /**
     * @zh
     * 获取线性阻尼。
     */
    @property({
        displayOrder: 1,
    })
    public get linearDamping () {
        return this._linearDamping;
    }

    /**
     * @zh
     * 设置线性阻尼。
     */
    public set linearDamping (value) {
        this._linearDamping = value;
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setLinearDamping(value);
        }
    }

    /**
     * @zh
     * 获取角阻尼。
     */
    @property({
        displayOrder: 2,
    })
    public get angularDamping () {
        return this._angularDamping;
    }

    /**
     * @zh
     * 设置角阻尼。
     */
    public set angularDamping (value) {
        this._angularDamping = value;
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setAngularDamping(value);
        }
    }

    /**
     * @zh
     * 获取刚体是否由物理系统控制运动。
     */
    @property({
        displayOrder: 3,
    })
    public get isKinematic () {
        return this._isKinematic;
    }

    /**
     * @zh
     * 设置刚体是否由自己控制运动。
     */
    public set isKinematic (value) {
        this._isKinematic = value;
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setIsKinematic(value);
        }
    }

    /**
     * @zh
     * 获取刚体是否使用重力。
     */
    @property({
        displayOrder: 4,
    })
    public get useGravity () {
        return this._useGravity;
    }

    /**
     * @zh
     * 设置刚体是否使用重力。
     */
    public set useGravity (value) {
        this._useGravity = value;
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setUseGravity(value);
        }
    }

    /**
     * @zh
     * 获取刚体是否固定旋转。
     */
    @property({
        displayOrder: 5,
    })
    public get fixedRotation () {
        return this._fixedRotation;
    }

    /**
     * @zh
     * 设置刚体是否固定旋转。
     */
    public set fixedRotation (value) {
        this._fixedRotation = value;
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setFreezeRotation(value);
        }
    }

    /**
     * @zh
     * 设置线性速度的因子，可以用来控制每个轴方向上的速度的缩放。
     */
    @property
    public get linearFactor () {
        if (CC_EDITOR) {
            return this._linearFactor;
        }
        return this._body.getLinearFactor(this._linearFactor);

    }

    public set linearFactor (value: Vec3) {
        vec3.copy(this._linearFactor, value);
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setLinearFactor(this._linearFactor);
        }
    }

    /**
     * @zh
     * 设置旋转速度的因子，可以用来控制每个轴方向上的旋转速度的缩放。
     */
    @property
    public get angularFactor () {
        if (CC_EDITOR) {
            return this._angularFactor;
        }
        return this._body.getAngularFactor(this._angularFactor);
    }

    public set angularFactor (value: Vec3) {
        vec3.copy(this._angularFactor, value);
        if (!CC_EDITOR && !CC_PHYSICS_BUILT_IN) {
            this._body.setAngularFactor(this._angularFactor);
        }
    }

    /// PRIVATE PROPERTY ///

    @property
    private _mass: number = NonRigidBodyProperties.mass;

    @property
    private _linearDamping: number = NonRigidBodyProperties.linearDamping;

    @property
    private _angularDamping: number = NonRigidBodyProperties.angularDamping;

    @property
    private _fixedRotation: boolean = false;

    @property
    private _isKinematic: boolean = false;

    @property
    private _useGravity: boolean = true;

    @property
    private _linearFactor: Vec3 = new Vec3(1, 1, 1);

    @property
    private _angularFactor: Vec3 = new Vec3(1, 1, 1);

    constructor () {
        super();
    }

    /// PUBLIC METHOD ///

    /**
     * @zh
     * 在某点上对刚体施加一个作用力。
     * @param force - 作用力
     * @param position - 作用点
     */
    public applyForce (force: Vec3, position?: Vec3) {
        if (!CC_PHYSICS_BUILT_IN && this._assertPreload) {
            this._body!.applyForce(force, position);
        }
    }

    /**
     * @zh
     * 在某点上对刚体施加一个冲量。
     * @param impulse - 冲量
     * @param position - 作用点
     */
    public applyImpulse (impulse: Vec3, position?: Vec3) {
        if (!CC_PHYSICS_BUILT_IN && this._assertPreload) {
            this._body!.applyImpulse(impulse, position);
        }
    }

    /**
     * @zh
     * 唤醒刚体。
     */
    public wakeUp () {
        if (!CC_PHYSICS_BUILT_IN && this._assertPreload) {
            this._body!.wakeUp();
        }
    }

    /**
     * @zh
     * 休眠刚体。
     */
    public sleep () {
        if (!CC_PHYSICS_BUILT_IN && this._assertPreload) {
            this._body!.sleep();
        }
    }

    /// COMPONENT LIFECYCLE ///

    protected onLoad () {
        if (!CC_PHYSICS_BUILT_IN) {
            /**
             * 此处设置刚体属性是因为__preload不受executionOrder的顺序影响，
             * 从而导致ColliderComponent后添加会导致刚体的某些属性被重写
             */
            if (this.sharedBody) {
                this.sharedBody.transfromSource = ETransformSource.PHYSIC;
                this.mass = this._mass;
                this.linearDamping = this._linearDamping;
                this.angularDamping = this._angularDamping;
                this.useGravity = this._useGravity;
                this.isKinematic = this._isKinematic;
                this.fixedRotation = this._fixedRotation;
                this.linearFactor = this._linearFactor;
                this.angularFactor = this._angularFactor;
            }
        }
    }
}
