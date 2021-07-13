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

// Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

/**
 * @packageDocumentation
 * @module particle
 */

// eslint-disable-next-line max-len
import { ccclass, help, executeInEditMode, executionOrder, menu, tooltip, displayOrder, type, range, displayName, visible, formerlySerializedAs, override, radian, serializable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { RenderableComponent } from '../core/components/renderable-component';
import { Material } from '../core/assets/material';
import { Mat4, pseudoRandom, Quat, randomRangeInt, Vec2, Vec3 } from '../core/math';
import { INT_MAX } from '../core/math/bits';
import { scene } from '../core/renderer';
import ColorOverLifetimeModule from './animator/color-overtime';
import CurveRange, { Mode } from './animator/curve-range';
import ForceOvertimeModule from './animator/force-overtime';
import GradientRange from './animator/gradient-range';
import LimitVelocityOvertimeModule from './animator/limit-velocity-overtime';
import RotationOvertimeModule from './animator/rotation-overtime';
import SizeOvertimeModule from './animator/size-overtime';
import TextureAnimationModule from './animator/texture-animation';
import VelocityOvertimeModule from './animator/velocity-overtime';
import Burst from './burst';
import ShapeModule from './emitter/shape-module';
import { RenderMode, Space } from './enum';
import { particleEmitZAxis } from './particle-general-function';
import ParticleSystemRenderer from './renderer/particle-system-renderer-data';
import TrailModule from './renderer/trail';
import { IParticleSystemRenderer } from './renderer/particle-system-renderer-base';
import { Particle, PARTICLE_MODULE_PROPERTY } from './particle';
import { legacyCC } from '../core/global-exports';
import { TransformBit } from '../core/scene-graph/node-enum';

const _world_mat = new Mat4();
const _world_rol = new Quat();

const superMaterials = Object.getOwnPropertyDescriptor(RenderableComponent.prototype, 'sharedMaterials')!;

@ccclass('cc.ParticleSystem')
@help('i18n:cc.ParticleSystem')
@menu('Effects/ParticleSystem')
@executionOrder(99)
@executeInEditMode
export class ParticleSystem extends RenderableComponent {
    /**
     * @zh 粒子系统能生成的最大粒子数量。
     */
    @displayOrder(1)
    @tooltip('i18n:particle_system.capacity')
    public get capacity () {
        return this._capacity;
    }

    public set capacity (val) {
        this._capacity = Math.floor(val);
        // @ts-expect-error private property access
        if (this.processor && this.processor._model) {
            // @ts-expect-error private property access
            this.processor._model.setCapacity(this._capacity);
        }
    }

    /**
     * @zh 粒子初始颜色。
     */
    @type(GradientRange)
    @serializable
    @displayOrder(8)
    @tooltip('i18n:particle_system.startColor')
    public startColor = new GradientRange();

    @type(Space)
    @serializable
    @displayOrder(9)
    @tooltip('i18n:particle_system.scaleSpace')
    public scaleSpace = Space.Local;

    @serializable
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSize3D')
    public startSize3D = false;

    /**
     * @zh 粒子初始大小。
     */
    @formerlySerializedAs('startSize')
    @type(CurveRange)
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeX')
    public startSizeX = new CurveRange();

    /**
     * @zh 粒子初始大小。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeY')
    public startSizeY = new CurveRange();

    /**
     * @zh 粒子初始大小。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeZ')
    public startSizeZ = new CurveRange();

    /**
     * @zh 粒子初始速度。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @displayOrder(11)
    @tooltip('i18n:particle_system.startSpeed')
    public startSpeed = new CurveRange();

    @serializable
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotation3D')
    public startRotation3D = false;

    /**
     * @zh 粒子初始旋转角度。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationX')
    public startRotationX = new CurveRange();

    /**
     * @zh 粒子初始旋转角度。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationY')
    public startRotationY = new CurveRange();

    /**
     * @zh 粒子初始旋转角度。
     */
    @type(CurveRange)
    @formerlySerializedAs('startRotation')
    @range([-1, 1])
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationZ')
    public startRotationZ = new CurveRange();

    /**
     * @zh 粒子系统开始运行后，延迟粒子发射的时间。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(6)
    @tooltip('i18n:particle_system.startDelay')
    public startDelay = new CurveRange();

    /**
     * @zh 粒子生命周期。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(7)
    @tooltip('i18n:particle_system.startLifetime')
    public startLifetime = new CurveRange();

    /**
     * @zh 粒子系统运行时间。
     */
    @serializable
    @displayOrder(0)
    @tooltip('i18n:particle_system.duration')
    public duration = 5.0;

    /**
     * @zh 粒子系统是否循环播放。
     */
    @serializable
    @displayOrder(2)
    @tooltip('i18n:particle_system.loop')
    public loop = true;

    /**
     * @zh 选中之后，粒子系统会以已播放完一轮之后的状态开始播放（仅当循环播放启用时有效）。
     */
    @displayOrder(3)
    @tooltip('i18n:particle_system.prewarm')
    get prewarm () {
        return this._prewarm;
    }

    set prewarm (val) {
        if (val === true && this.loop === false) {
            // console.warn('prewarm only works if loop is also enabled.');
        }
        this._prewarm = val;
    }

    /**
     * @zh 选择粒子系统所在的坐标系[[Space]]。<br>
     */
    @type(Space)
    @serializable
    @displayOrder(4)
    @tooltip('i18n:particle_system.simulationSpace')
    get simulationSpace () {
        return this._simulationSpace;
    }

    set simulationSpace (val) {
        if (val !== this._simulationSpace) {
            this._simulationSpace = val;
            if (this.processor) {
                this.processor.updateMaterialParams();
                this.processor.updateTrailMaterial();
            }
        }
    }

    /**
     * @zh 控制整个粒子系统的更新速度。
     */
    @serializable
    @displayOrder(5)
    @tooltip('i18n:particle_system.simulationSpeed')
    public simulationSpeed = 1.0;

    /**
     * @zh 粒子系统加载后是否自动开始播放。
     */
    @serializable
    @displayOrder(2)
    @tooltip('i18n:particle_system.playOnAwake')
    public playOnAwake = true;

    /**
     * @zh 粒子受重力影响的重力系数。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @displayOrder(13)
    @tooltip('i18n:particle_system.gravityModifier')
    public gravityModifier = new CurveRange();

    // emission module
    /**
     * @zh 每秒发射的粒子数。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(14)
    @tooltip('i18n:particle_system.rateOverTime')
    public rateOverTime = new CurveRange();

    /**
     * @zh 每移动单位距离发射的粒子数。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(15)
    @tooltip('i18n:particle_system.rateOverDistance')
    public rateOverDistance = new CurveRange();

    /**
     * @zh 设定在指定时间发射指定数量的粒子的 burst 的数量。
     */
    @type([Burst])
    @serializable
    @displayOrder(16)
    @tooltip('i18n:particle_system.bursts')
    public bursts: Burst[] = [];

    @override
    @visible(false)
    @type(Material)
    @serializable
    @displayName('Materials')
    get sharedMaterials () {
        // if we don't create an array copy, the editor will modify the original array directly.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return superMaterials.get!.call(this);
    }

    set sharedMaterials (val) {
        // @ts-expect-error private property access
        superMaterials.set.call(this, val);
    }

    // color over lifetime module
    @type(ColorOverLifetimeModule)
    _colorOverLifetimeModule: ColorOverLifetimeModule | null = null;
    /**
     * @zh 颜色控制模块。
     */
    @type(ColorOverLifetimeModule)
    @displayOrder(23)
    @tooltip('i18n:particle_system.colorOverLifetimeModule')
    public get colorOverLifetimeModule () {
        if (EDITOR) {
            if (!this._colorOverLifetimeModule) {
                this._colorOverLifetimeModule = new ColorOverLifetimeModule();
                this._colorOverLifetimeModule.bindTarget(this.processor);
            }
        }
        return this._colorOverLifetimeModule;
    }

    public set colorOverLifetimeModule (val) {
        if (!val) return;
        this._colorOverLifetimeModule = val;
    }

    // shape module
    @type(ShapeModule)
    _shapeModule: ShapeModule | null = null;
    /**
     * @zh 粒子发射器模块。
     */
    @type(ShapeModule)
    @displayOrder(17)
    @tooltip('i18n:particle_system.shapeModule')
    public get shapeModule () {
        if (EDITOR) {
            if (!this._shapeModule) {
                this._shapeModule = new ShapeModule();
                this._shapeModule.onInit(this);
            }
        }
        return this._shapeModule;
    }

    public set shapeModule (val) {
        if (!val) return;
        this._shapeModule = val;
    }

    // size over lifetime module
    @type(SizeOvertimeModule)
    _sizeOvertimeModule: SizeOvertimeModule | null = null;
    /**
     * @zh 粒子大小模块。
     */
    @type(SizeOvertimeModule)
    @displayOrder(21)
    @tooltip('i18n:particle_system.sizeOvertimeModule')
    public get sizeOvertimeModule () {
        if (EDITOR) {
            if (!this._sizeOvertimeModule) {
                this._sizeOvertimeModule = new SizeOvertimeModule();
                this._sizeOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._sizeOvertimeModule;
    }

    public set sizeOvertimeModule (val) {
        if (!val) return;
        this._sizeOvertimeModule = val;
    }

    // velocity overtime module
    @type(VelocityOvertimeModule)
    _velocityOvertimeModule: VelocityOvertimeModule | null = null;
    /**
     * @zh 粒子速度模块。
     */
    @type(VelocityOvertimeModule)
    @displayOrder(18)
    @tooltip('i18n:particle_system.velocityOvertimeModule')
    public get velocityOvertimeModule () {
        if (EDITOR) {
            if (!this._velocityOvertimeModule) {
                this._velocityOvertimeModule = new VelocityOvertimeModule();
                this._velocityOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._velocityOvertimeModule;
    }

    public set velocityOvertimeModule (val) {
        if (!val) return;
        this._velocityOvertimeModule = val;
    }

    // force overTime module
    @type(ForceOvertimeModule)
    _forceOvertimeModule: ForceOvertimeModule | null = null;
    /**
     * @zh 粒子加速度模块。
     */
    @type(ForceOvertimeModule)
    @displayOrder(19)
    @tooltip('i18n:particle_system.forceOvertimeModule')
    public get forceOvertimeModule () {
        if (EDITOR) {
            if (!this._forceOvertimeModule) {
                this._forceOvertimeModule = new ForceOvertimeModule();
                this._forceOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._forceOvertimeModule;
    }

    public set forceOvertimeModule (val) {
        if (!val) return;
        this._forceOvertimeModule = val;
    }

    // limit velocity overtime module
    @type(LimitVelocityOvertimeModule)
    _limitVelocityOvertimeModule: LimitVelocityOvertimeModule | null = null;

    /**
     * @zh 粒子限制速度模块（只支持 CPU 粒子）。
     */
    @type(LimitVelocityOvertimeModule)
    @displayOrder(20)
    @tooltip('i18n:particle_system.limitVelocityOvertimeModule')
    public get limitVelocityOvertimeModule () {
        if (EDITOR) {
            if (!this._limitVelocityOvertimeModule) {
                this._limitVelocityOvertimeModule = new LimitVelocityOvertimeModule();
                this._limitVelocityOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._limitVelocityOvertimeModule;
    }

    public set limitVelocityOvertimeModule (val) {
        if (!val) return;
        this._limitVelocityOvertimeModule = val;
    }

    // rotation overtime module
    @type(RotationOvertimeModule)
    _rotationOvertimeModule: RotationOvertimeModule | null = null;
    /**
     * @zh 粒子旋转模块。
     */
    @type(RotationOvertimeModule)
    @displayOrder(22)
    @tooltip('i18n:particle_system.rotationOvertimeModule')
    public get rotationOvertimeModule () {
        if (EDITOR) {
            if (!this._rotationOvertimeModule) {
                this._rotationOvertimeModule = new RotationOvertimeModule();
                this._rotationOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._rotationOvertimeModule;
    }

    public set rotationOvertimeModule (val) {
        if (!val) return;
        this._rotationOvertimeModule = val;
    }

    // texture animation module
    @type(TextureAnimationModule)
    _textureAnimationModule: TextureAnimationModule | null = null;
    /**
     * @zh 贴图动画模块。
     */
    @type(TextureAnimationModule)
    @displayOrder(24)
    @tooltip('i18n:particle_system.textureAnimationModule')
    public get textureAnimationModule () {
        if (EDITOR) {
            if (!this._textureAnimationModule) {
                this._textureAnimationModule = new TextureAnimationModule();
                this._textureAnimationModule.bindTarget(this.processor);
            }
        }
        return this._textureAnimationModule;
    }

    public set textureAnimationModule (val) {
        if (!val) return;
        this._textureAnimationModule = val;
    }

    // trail module
    @type(TrailModule)
    _trailModule: TrailModule | null = null;
    /**
     * @zh 粒子轨迹模块。
     */
    @type(TrailModule)
    @displayOrder(25)
    @tooltip('i18n:particle_system.trailModule')
    public get trailModule () {
        if (EDITOR) {
            if (!this._trailModule) {
                this._trailModule = new TrailModule();
                this._trailModule.onInit(this);
                this._trailModule.onEnable();
            }
        }
        return this._trailModule;
    }

    public set trailModule (val) {
        if (!val) return;
        this._trailModule = val;
    }

    // particle system renderer
    @type(ParticleSystemRenderer)
    @serializable
    @displayOrder(26)
    @tooltip('i18n:particle_system.renderer')
    public renderer: ParticleSystemRenderer = new ParticleSystemRenderer();

    // serilized culling
    @serializable
    @displayOrder(27)
    @tooltip('i18n:particle_system.enableCulling')
    public enableCulling = false;

    /**
     * @ignore
     */
    private _isPlaying: boolean;
    private _isPaused: boolean;
    private _isStopped: boolean;
    private _isEmitting: boolean;
    private _needRefresh: boolean;

    private _time: number;  // playback position in seconds.
    private _emitRateTimeCounter: number;
    private _emitRateDistanceCounter: number;
    private _oldWPos: Vec3;
    private _curWPos: Vec3;

    private _customData1: Vec2;
    private _customData2: Vec2;

    private _subEmitters: any[]; // array of { emitter: ParticleSystem, type: 'birth', 'collision' or 'death'}

    @serializable
    private _prewarm = false;

    @serializable
    private _capacity = 100;

    @serializable
    private _simulationSpace = Space.Local;

    public processor: IParticleSystemRenderer = null!;

    constructor () {
        super();

        this.rateOverTime.constant = 10;
        this.startLifetime.constant = 5;
        this.startSizeX.constant = 1;
        this.startSpeed.constant = 5;

        // internal status
        this._isPlaying = false;
        this._isPaused = false;
        this._isStopped = true;
        this._isEmitting = false;
        this._needRefresh = false;

        this._time = 0.0;  // playback position in seconds.
        this._emitRateTimeCounter = 0.0;
        this._emitRateDistanceCounter = 0.0;
        this._oldWPos = new Vec3();
        this._curWPos = new Vec3();

        this._customData1 = new Vec2();
        this._customData2 = new Vec2();

        this._subEmitters = []; // array of { emitter: ParticleSystem, type: 'birth', 'collision' or 'death'}
    }

    public onFocusInEditor () {
        this.renderer.create(this);
    }

    public onLoad () {
        // HACK, TODO
        this.renderer.onInit(this);
        if (this._shapeModule) this._shapeModule.onInit(this);
        if (this._trailModule) this._trailModule.onInit(this);
        this.bindModule();
        this._resetPosition();

        // this._system.add(this);
    }

    public _onMaterialModified (index: number, material: Material) {
        if (this.processor !== null) {
            this.processor.onMaterialModified(index, material);
        }
    }

    public _onRebuildPSO (index: number, material: Material) {
        this.processor.onRebuildPSO(index, material);
    }

    public _collectModels (): scene.Model[] {
        this._models.length = 0;
        this._models.push((this.processor as any)._model);
        if (this._trailModule && this._trailModule.enable && (this._trailModule as any)._trailModel) {
            this._models.push((this._trailModule as any)._trailModel);
        }
        return this._models;
    }

    protected _attachToScene () {
        this.processor.attachToScene();
        if (this._trailModule && this._trailModule.enable) {
            this._trailModule._attachToScene();
        }
    }

    protected _detachFromScene () {
        this.processor.detachFromScene();
        if (this._trailModule && this._trailModule.enable) {
            this._trailModule._detachFromScene();
        }
    }

    public bindModule () {
        if (this._colorOverLifetimeModule) this._colorOverLifetimeModule.bindTarget(this.processor);
        if (this._sizeOvertimeModule) this._sizeOvertimeModule.bindTarget(this.processor);
        if (this._rotationOvertimeModule) this._rotationOvertimeModule.bindTarget(this.processor);
        if (this._forceOvertimeModule) this._forceOvertimeModule.bindTarget(this.processor);
        if (this._limitVelocityOvertimeModule) this._limitVelocityOvertimeModule.bindTarget(this.processor);
        if (this._velocityOvertimeModule) this._velocityOvertimeModule.bindTarget(this.processor);
        if (this._textureAnimationModule) this._textureAnimationModule.bindTarget(this.processor);
    }

    // TODO: Fast forward current particle system by simulating particles over given period of time, then pause it.
    // simulate(time, withChildren, restart, fixedTimeStep) {

    // }

    /**
     * 播放粒子效果。
     */
    public play () {
        if (this._isPaused) {
            this._isPaused = false;
        }
        if (this._isStopped) {
            this._isStopped = false;
        }

        this._isPlaying = true;
        this._isEmitting = true;

        this._resetPosition();

        // prewarm
        if (this._prewarm) {
            this._prewarmSystem();
        }

        if (this._trailModule) {
            this._trailModule.play();
        }
    }

    /**
     * 暂停播放粒子效果。
     */
    public pause () {
        if (this._isStopped) {
            console.warn('pause(): particle system is already stopped.');
            return;
        }
        if (this._isPlaying) {
            this._isPlaying = false;
        }

        this._isPaused = true;
    }

    /**
     * 停止播放粒子。
     */
    public stop () {
        if (this._isPlaying || this._isPaused) {
            this.clear();
        }
        if (this._isPlaying) {
            this._isPlaying = false;
        }
        if (this._isPaused) {
            this._isPaused = false;
        }

        this._time = 0.0;
        this._emitRateTimeCounter = 0.0;
        this._emitRateDistanceCounter = 0.0;

        this._isStopped = true;

        // if stop emit modify the refresh flag to true
        this._needRefresh = true;
    }

    // remove all particles from current particle system.
    /**
     * 将所有粒子从粒子系统中清除。
     */
    public clear () {
        if (this.enabledInHierarchy) {
            this.processor.clear();
            if (this._trailModule) this._trailModule.clear();
        }
    }

    /**
     * @zh 获取当前粒子数量
     */
    public getParticleCount () {
        return this.processor.getParticleCount();
    }

    /**
     * @ignore
     */
    public setCustomData1 (x, y) {
        Vec2.set(this._customData1, x, y);
    }

    public setCustomData2 (x, y) {
        Vec2.set(this._customData2, x, y);
    }

    protected onDestroy () {
        legacyCC.director.off(legacyCC.Director.EVENT_BEFORE_COMMIT, this.beforeRender, this);
        // this._system.remove(this);
        this.processor.onDestroy();
        if (this._trailModule) this._trailModule.destroy();
    }

    protected onEnable () {
        legacyCC.director.on(legacyCC.Director.EVENT_BEFORE_COMMIT, this.beforeRender, this);
        if (this.playOnAwake) {
            this.play();
        }
        this.processor.onEnable();
        if (this._trailModule) this._trailModule.onEnable();
    }
    protected onDisable () {
        legacyCC.director.off(legacyCC.Director.EVENT_BEFORE_COMMIT, this.beforeRender, this);
        this.processor.onDisable();
        if (this._trailModule) this._trailModule.onDisable();
    }
    protected update (dt: number) {
        const scaledDeltaTime = dt * this.simulationSpeed;
        if (this._isPlaying) {
            this._time += scaledDeltaTime;

            // Execute emission
            this._emit(scaledDeltaTime);

            // simulation, update particles.
            if (this.processor.updateParticles(scaledDeltaTime) === 0 && !this._isEmitting) {
                this.stop();
            }
        }
        // update render data
        this.processor.updateRenderData();

        // update trail
        if (this._trailModule && this._trailModule.enable) {
            this._trailModule.updateRenderData();
        }
    }

    protected beforeRender () {
        if (!this._isPlaying) return;
        this.processor.beforeRender();
        if (this._trailModule && this._trailModule.enable) {
            this._trailModule.beforeRender();
        }
    }

    protected _onVisibilityChange (val) {
        // @ts-expect-error private property access
        if (this.processor._model) {
            // @ts-expect-error private property access
            this.processor._model.visFlags = val;
        }
    }

    private _processRotation (particle) {
        const renderMode = this.processor.getInfo().renderMode;
        if (renderMode !== RenderMode.Mesh) {
            if (renderMode === RenderMode.Billboard) {
                particle.startEuler.set(particle.startEuler.x, particle.startEuler.y, particle.startEuler.z);
            } else if (renderMode === RenderMode.StrecthedBillboard) {
                particle.startEuler.set(0, 0, 0);
            } else {
                particle.startEuler.set(0, 0, particle.startEuler.z);
            }
        }

        // eslint-disable-next-line max-len
        Quat.fromEuler(particle.startRotation, particle.startEuler.x * Particle.R2D, particle.startEuler.y * Particle.R2D, particle.startEuler.z * Particle.R2D);
        particle.startRotation = Quat.normalize(particle.startRotation, particle.startRotation);

        if (particle.startRotation.w < 0.0) {
            particle.startRotation.x += Particle.INDENTIFY_NEG_QUAT; // Indentify negative w
        }
    }

    private emit (count: number, dt: number) {
        const delta = this._time / this.duration;

        // refresh particle node position to update emit position
        if (this._needRefresh) {
            // this.node.setPosition(this.node.getPosition());
            this.node.invalidateChildren(TransformBit.POSITION);

            this._needRefresh = false;
        }

        if (this._simulationSpace === Space.World) {
            this.node.getWorldMatrix(_world_mat);
            this.node.getWorldRotation(_world_rol);
        }

        for (let i = 0; i < count; ++i) {
            const particle = this.processor.getFreeParticle();
            if (particle === null) {
                return;
            }
            particle.particleSystem = this;
            particle.reset();

            const rand = pseudoRandom(randomRangeInt(0, INT_MAX));

            if (this._shapeModule && this._shapeModule.enable) {
                this._shapeModule.emit(particle);
            } else {
                Vec3.set(particle.position, 0, 0, 0);
                Vec3.copy(particle.velocity, particleEmitZAxis);
            }

            if (this._textureAnimationModule && this._textureAnimationModule.enable) {
                this._textureAnimationModule.init(particle);
            }

            let curveStartSpeed = this.startSpeed.evaluate(delta, rand)!;
            if (this.startSpeed.mode === Mode.Curve) {
                const current = this._time % this.duration; // loop curve value
                curveStartSpeed = this.startSpeed.evaluate(current / this.duration, rand)!;
            }
            Vec3.multiplyScalar(particle.velocity, particle.velocity, curveStartSpeed);

            if (this._simulationSpace === Space.World) {
                Vec3.transformMat4(particle.position, particle.position, _world_mat);
                Vec3.transformQuat(particle.velocity, particle.velocity, _world_rol);
            }

            Vec3.copy(particle.ultimateVelocity, particle.velocity);
            // apply startRotation.
            if (this.startRotation3D) {
                // eslint-disable-next-line max-len
                particle.startEuler.set(this.startRotationX.evaluate(delta, rand), this.startRotationY.evaluate(delta, rand), this.startRotationZ.evaluate(delta, rand));
                this._processRotation(particle);
                Vec3.set(particle.rotation, particle.startRotation.x, particle.startRotation.y, particle.startRotation.z);
            } else {
                particle.startEuler.set(0, 0, this.startRotationZ.evaluate(delta, rand));
                this._processRotation(particle);
                Vec3.set(particle.rotation, particle.startRotation.x, particle.startRotation.y, particle.startRotation.z);
            }

            // apply startSize.
            if (this.startSize3D) {
                Vec3.set(particle.startSize, this.startSizeX.evaluate(delta, rand)!,
                    this.startSizeY.evaluate(delta, rand)!,
                    this.startSizeZ.evaluate(delta, rand)!);
            } else {
                Vec3.set(particle.startSize, this.startSizeX.evaluate(delta, rand)!, 1, 1);
                particle.startSize.y = particle.startSize.x;
            }
            Vec3.copy(particle.size, particle.startSize);

            // apply startColor.
            particle.startColor.set(this.startColor.evaluate(delta, rand));
            particle.color.set(particle.startColor);

            // apply startLifetime.
            particle.startLifetime = this.startLifetime.evaluate(delta, rand)! + dt;
            particle.remainingLifetime = particle.startLifetime;

            particle.randomSeed = randomRangeInt(0, 233280);

            this.processor.setNewParticle(particle);
        } // end of particles forLoop.
    }

    // initialize particle system as though it had already completed a full cycle.
    private _prewarmSystem () {
        this.startDelay.mode = Mode.Constant; // clear startDelay.
        this.startDelay.constant = 0;
        const dt = 1.0; // should use varying value?
        const cnt = this.duration / dt;

        for (let i = 0; i < cnt; ++i) {
            this._time += dt;
            this._emit(dt);
            this.processor.updateParticles(dt);
        }
    }

    // internal function
    private _emit (dt) {
        // emit particles.
        const startDelay = this.startDelay.evaluate(0, 1)!;
        if (this._time > startDelay) {
            if (this._time > (this.duration + startDelay)) {
                // this._time = startDelay; // delay will not be applied from the second loop.(Unity)
                // this._emitRateTimeCounter = 0.0;
                // this._emitRateDistanceCounter = 0.0;
                if (!this.loop) {
                    this._isEmitting = false;
                    return;
                }
            }

            // emit by rateOverTime
            this._emitRateTimeCounter += this.rateOverTime.evaluate(this._time / this.duration, 1)! * dt;
            if (this._emitRateTimeCounter > 1 && this._isEmitting) {
                const emitNum = Math.floor(this._emitRateTimeCounter);
                this._emitRateTimeCounter -= emitNum;
                this.emit(emitNum, dt);
            }

            // emit by rateOverDistance
            this.node.getWorldPosition(this._curWPos);
            const distance = Vec3.distance(this._curWPos, this._oldWPos);
            Vec3.copy(this._oldWPos, this._curWPos);
            this._emitRateDistanceCounter += distance * this.rateOverDistance.evaluate(this._time / this.duration, 1)!;

            if (this._emitRateDistanceCounter > 1 && this._isEmitting) {
                const emitNum = Math.floor(this._emitRateDistanceCounter);
                this._emitRateDistanceCounter -= emitNum;
                this.emit(emitNum, dt);
            }

            // bursts
            for (const burst of this.bursts) {
                burst.update(this, dt);
            }
        }
    }

    private _resetPosition () {
        this.node.getWorldPosition(this._oldWPos);
        Vec3.copy(this._curWPos, this._oldWPos);
    }

    private addSubEmitter (subEmitter) {
        this._subEmitters.push(subEmitter);
    }

    private removeSubEmitter (idx) {
        this._subEmitters.splice(this._subEmitters.indexOf(idx), 1);
    }

    private addBurst (burst) {
        this.bursts.push(burst);
    }

    private removeBurst (idx) {
        this.bursts.splice(this.bursts.indexOf(idx), 1);
    }

    /**
     * @ignore
     */
    get isPlaying () {
        return this._isPlaying;
    }

    get isPaused () {
        return this._isPaused;
    }

    get isStopped () {
        return this._isStopped;
    }

    get isEmitting () {
        return this._isEmitting;
    }

    get time () {
        return this._time;
    }

    public _onBeforeSerialize (props) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.enableCulling ? props.filter((p) => !PARTICLE_MODULE_PROPERTY.includes(p) || (this[p] && this[p].enable)) : props;
    }
}
