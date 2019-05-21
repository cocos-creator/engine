import { Component } from '../../../../components/component';
import { ccclass } from '../../../../core/data/class-decorator';
import { Quat, Vec3 } from '../../../../core/value-types';
import { quat, vec3 } from '../../../../core/vmath';
import { Node } from '../../../../scene-graph/node';
// tslint:disable-next-line:max-line-length
import { AfterStepCallback, BeforeStepCallback, ICollisionCallback, ICollisionEvent, ICollisionType, PhysicsWorldBase, RigidBodyBase } from '../../../physics/api';
import { createRigidBody } from '../../../physics/instance';
import { ERigidBodyType, ETransformSource } from '../../../physics/physic-enum';
import { stringfyQuat, stringfyVec3 } from '../../../physics/util';

export class PhysicsBasedComponent extends Component {

    protected get _body () {
        return this._sharedBody ? this._sharedBody.body : null;
    }

    protected get sharedBody () {
        return this._sharedBody;
    }
    private _sharedBody!: SharedRigidBody | null;

    constructor () {
        super();
    }

    public __preload () {
        this._refSharedBody();
    }

    public onEnable () {
        if (this.sharedBody) {
            this.sharedBody!.enable();
        }
    }

    public onDisable () {
        if (this.sharedBody) {
            this.sharedBody!.disable();
        }
    }

    public onDestroy () {
        if (this._sharedBody) {
            this._sharedBody.deref();
            this._sharedBody = null;
        }
    }

    /**
     *  @return group ∈ [0, 31] (int)
     */
    public getGroup (): number {
        return this._body!.getGroup();
    }

    /**
     * @param v ∈ [0, 31] (int)
     */
    public setGroup (v: number) {
        return this._body!.setGroup(v);
    }

    /**
     * @return (int)
     */
    public getMask (): number {
        return this._body!.getMask();
    }

    /**
     *  this will reset the mask
     * @param v ∈ [0, 31] (int)
     */
    public setMask (v: number) {
        return this._body!.setMask(v);
    }

    /**
     * this will add a mask
     * @param v ∈ [0, 31] (int)
     */
    public addMask (v: number) {
        return this._body!.addMask(v);
    }

    private _refSharedBody () {
        if (this._sharedBody) {
            return;
        }
        const physicsBasedComponents = this.node.getComponents(PhysicsBasedComponent);
        let sharedBody: SharedRigidBody | null = null;
        for (const physicsBasedComponent of physicsBasedComponents) {
            if (physicsBasedComponent._sharedBody) {
                sharedBody = physicsBasedComponent._sharedBody;
                break;
            }
        }
        if (!sharedBody) {
            sharedBody = new SharedRigidBody(this.node, cc.director._physicsSystem.world);
        }
        sharedBody.ref();
        this._sharedBody = sharedBody;
    }
}

class SharedRigidBody {
    private _body: RigidBodyBase;

    private _refCount = 0;

    private _actived = false;

    private _world: PhysicsWorldBase;

    private _node: Node;

    private _worldScale: Vec3 = new Vec3(1, 1, 1);

    private _beforeStepCallback: BeforeStepCallback;

    private _afterStepCallback: AfterStepCallback;

    private _onCollidedCallback: ICollisionCallback;

    private _transformInitialized: boolean = false;

    /** 是否只有Collider组件 */
    private _isShapeOnly: boolean = true;
    public get isShapeOnly (): boolean { return this._isShapeOnly; }

    /** 上一次的缩放 */
    private _prevScale: Vec3 = new Vec3();

    constructor (node: Node, world: PhysicsWorldBase) {
        this._body = createRigidBody({
            name: node.name,
        });
        this._node = node;
        this._world = world;
        this._body.setUserData(this._node);
        this._beforeStepCallback = this._beforeStep.bind(this);
        this._afterStepCallback = this._afterStep.bind(this);
        this._onCollidedCallback = this._onCollided.bind(this);
        this._body.addCollisionCallback(this._onCollidedCallback);
        this._world.addBeforeStep(this._beforeStepCallback);
    }

    public get body () {
        return this._body;
    }

    /** 设置场景与物理之间的同步关系 */
    public set transfromSource (v: ETransformSource) {
        if (v === ETransformSource.SCENE) {
            this._isShapeOnly = true;
        } else {
            this._isShapeOnly = false;
        }
    }

    public ref () {
        // if (!this._refCount) {
        //     this._activeBody();
        // }
        ++this._refCount;
    }

    public deref () {
        --this._refCount;
        if (!this._refCount) {
            // this._deactiveBody();
            // TODO : destroy this body
            // this.destroy();
        }
    }

    public enable () {
        this._activeBody();
    }

    public disable () {
        this._deactiveBody();
    }

    public syncPhysWithScene (node: Node) {
        // sync position rotation
        const p = node.getWorldPosition();
        const r = node.getWorldRotation();

        this.body.setPosition(p);
        this.body.setRotation(r);

        // scale property should handle by shape, scale belong to shape
        // node.getWorldScale(this._worldScale);
        // // Because we sync the scale, we should update shape parameters.
        // this.body.scaleAllShapes(this._worldScale);
        // this.body.commitShapeUpdates();
    }

    /**
     * Push the rigidbody's transform information back to node.
     */
    private _syncSceneWithPhys () {
        if (!this._node) {
            return;
        }

        const p = new Vec3();
        this.body.getPosition(p);
        this._node.setWorldPosition(p.x, p.y, p.z);
        if (!this._body.getFreezeRotation()) {
            const q = new Quat();
            this.body.getRotation(q);
            this._node.setWorldRotation(q.x, q.y, q.z, q.w);
        }
    }

    private _activeBody () {
        // 是否为第一次激活
        if (!this._transformInitialized) {
            this._transformInitialized = true;
            this.syncPhysWithScene(this._node);
        }

        if (this._actived) {
            return;
        }

        this._actived = true;
        this._body.setWorld(this._world);
        // this._world.addBeforeStep(this._beforeStepCallback);
        this._world.addAfterStep(this._afterStepCallback);
        this._body.wakeUp();
    }

    private _deactiveBody () {
        if (!this._actived) {
            return;
        }
        this._actived = false;
        this._world.removeBeforeStep(this._beforeStepCallback);
        this._world.removeAfterStep(this._afterStepCallback);
        this._body.sleep();
        this._body.setWorld(null);
    }

    private _onCollided (type: ICollisionType, event: ICollisionEvent) {
        if (!this._node) {
            return;
        }
        this._node.emit(type, {
            source: event.source.getUserData() as Node,
            target: event.target.getUserData() as Node,
        });
    }

    private _beforeStep () {

        // 开始物理计算之前，用户脚本或引擎功能有可能改变节点的Transform，所以需要判断并进行更新
        if (this._node.hasChanged) {
            // scale 进行单独判断，因为目前的物理系统处理后不会改变scale的属性
            if (!vec3.equals(this._prevScale, this._node._scale)) {
                this.body.scaleAllShapes(this._node._scale);
                vec3.copy(this._prevScale, this._node._scale);
            }
            this.syncPhysWithScene(this._node);
        }
    }

    private _afterStep () {
        // 物理计算之后，除了只有形状组件的节点，其它有刚体组件的节点，并且刚体类型为DYNAMIC的，需要将计算结果同步到Scene中
        if (!this._isShapeOnly && this.body.getType() === ERigidBodyType.DYNAMIC) {
            this._syncSceneWithPhys();
        } else {
            // 对于只有形状组件的节点，需要将Scene中节点的Transform同步到Phyisc。
            // 这是因为物理计算后可能会改变一些节点，这会导致这些子节点的Transform也发生改变。
            if (this._node.hasChanged) {
                this.syncPhysWithScene(this._node);
            }
        }
    }
}
