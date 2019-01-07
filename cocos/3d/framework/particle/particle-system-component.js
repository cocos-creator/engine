// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

import Component from '../../../components/CCComponent';
import { vec3, vec2, mat4, quat, randomRangeInt, pseudoRandom } from '../../../core/vmath';
import CurveRange from './animator/curve-range';
import GradientRange from './animator/gradient-range';
import ParticleSystemRenderer from './renderer/particle-system-renderer';
import SizeOvertimeModule from './animator/size-overtime';
import ColorOverLifetimeModule from './animator/color-overtime';
import VelocityOvertimeModule from './animator/velocity-overtime';
import ForceOvertimeModule from './animator/force-overtime';
import LimitVelocityOvertimeModule from './animator/limit-velocity-overtime';
import RotationOvertimeModule from './animator/rotation-overtime';
import TextureAnimationModule from './animator/texture-animation';
import ShapeModule from './emitter/shape-module';
import Burst from './burst';
import { particleEmitZAxis, Space } from './particle-general-function';
import { INT_MAX } from '../../../core/vmath/bits';
import { ccclass, executionOrder, executeInEditMode, property, requireComponent, menu } from '../../../core/data/class-decorator';

let _world_mat = mat4.create();

@ccclass('cc.ParticleSystemComponent')
@menu('Components/ParticleSystemComponent')
@requireComponent(ParticleSystemRenderer)
@executionOrder(99)
@executeInEditMode
export default class ParticleSystemComponent extends Component {

    @property
    capacity = 2000;

    @property({
        type:GradientRange
    })
    startColor = new GradientRange();

    @property({
        type: CurveRange
    })
    startSize = new CurveRange();

    @property({
        type: CurveRange
    })
    startSpeed = new CurveRange();

    @property({
        type: CurveRange
    })
    startRotation = new CurveRange();

    @property({
        type: CurveRange
    })
    startDelay = new CurveRange();

    @property({
        type: CurveRange
    })
    startLifetime = new CurveRange();

    @property
    duration = 5.0;

    @property
    loop = true;

    @property
    _prewarm = false;

    @property
    get prewarm() {
        return this._prewarm;
    }

    set prewarm(val) {
        if (val === true && this._loop === false) {
            // console.warn('prewarm only works if loop is also enabled.');
        }
        this._prewarm = val;
    }

    @property
    _simulationSpace = Space.Local;

    @property({
        type: Space
    })
    get simulationSpace() {
        return this._simulationSpace;
    }

    set simulationSpace(val) {
        if (val === Space.World) {
            this._renderer._material.define('USE_WORLD_SPACE', true);
        } else {
            this._renderer._material.define('USE_WORLD_SPACE', false);
        }
        this._simulationSpace = val;
    }

    @property
    simulationSpeed = 1.0;

    @property
    playOnAwake = false;

    @property({
        type: CurveRange
    })
    gravityModifier = new CurveRange();

    // emission module
    @property({
        type: CurveRange
    })
    rateOverTime = new CurveRange();

    @property({
        type: CurveRange
    })
    rateOverDistance = new CurveRange();

    @property({
        type: [Burst]
    })
    bursts = new Array();

    // color over lifetime module
    @property({
        type: ColorOverLifetimeModule
    })
    colorOverLifetimeModule = new ColorOverLifetimeModule();

    // shpae module
    @property({
        type: ShapeModule
    })
    shapeModule = new ShapeModule();

    // particle system renderer
    @property({
        type: ParticleSystemRenderer
    })
    renderer = null;

    // size over lifetime module
    @property({
        type: SizeOvertimeModule
    })
    sizeOvertimeModule = new SizeOvertimeModule();

    @property({
        type: VelocityOvertimeModule
    })
    velocityOvertimeModule = new VelocityOvertimeModule();

    @property({
        type: ForceOvertimeModule
    })
    forceOvertimeModule = new ForceOvertimeModule();

    @property({
        type: LimitVelocityOvertimeModule
    })
    limitVelocityOvertimeModule = new LimitVelocityOvertimeModule();

    @property({
        type: RotationOvertimeModule
    })
    rotationOvertimeModule = new RotationOvertimeModule();

    @property({
        type: TextureAnimationModule
    })
    textureAnimationModule = new TextureAnimationModule();

    constructor() {
        super();

        // internal status
        this._isPlaying = false;
        this._isPaused = false;
        this._isStopped = true;
        this._isEmitting = false;

        this._time = 0.0;  // playback position in seconds.
        this._emitRateTimeCounter = 0.0;
        this._emitRateDistanceCounter = 0.0;
        this._oldWPos = vec3.create(0, 0, 0);
        this._curWPos = vec3.create(0, 0, 0);

        this._customData1 = vec2.create(0, 0);
        this._customData2 = vec2.create(0, 0);

        this._subEmitters = []; // array of { emitter: ParticleSystemComponent, type: 'birth', 'collision' or 'death'}
    }

    onLoad() {
        // HACK, TODO
        this.renderer = this.getComponent(ParticleSystemRenderer);
        this.renderer.onInit();
        this.shapeModule.onInit(this);
        this.textureAnimationModule.onInit(this);

        this.node.getWorldPosition(this._oldWPos);
        vec3.copy(this._curWPos, this._oldWPos);

        // this._system.add(this);
    }

    onDestroy() {
        // this._system.remove(this);
    }

    onEnable() {
        if (this._playOnAwake) {
            this.play();
        }
    }

    onDisable() {

    }

    // TODO: fastforward current particle system by simulating particles over given period of time, then pause it.
    // simulate(time, withChildren, restart, fixedTimeStep) {

    // }

    play() {
        if (this._isPaused) {
            this._isPaused = false;
        }
        if (this._isStopped) {
            this._isStopped = false;
        }

        this._time = 0.0;
        this._emitRateTimeCounter = 0.0;
        this._emitRateDistanceCounter = 0.0;

        this._isPlaying = true;

        // prewarm
        if (this._prewarm) {
            this._prewarmSystem();
        }
    }

    pause() {
        if (this._isStopped) {
            console.warn('pause(): particle system is already stopped.');
            return;
        }
        if (this._isPlaying) {
            this._isPlaying = false;
        }

        this._isPaused = true;
    }

    stop() {
        if (this._isPlaying) {
            this._isPlaying = false;
        }
        if (this._isPaused) {
            this._isPaused = false;
        }

        this.clear();
        this._time = 0.0;
        this._emitRateTimeCounter = 0.0;
        this._emitRateDistanceCounter = 0.0;

        this._isStopped = true;
    }

    // remove all particles from current particle system.
    clear() {
        this._particles.reset();
        this._renderer._model.clear();
    }

    emit(count, emitParams = null) {
        if (emitParams !== null) {
            // TODO:
        }

        for (let i = 0; i < count; ++i) {
            let particle = this.renderer._getFreeParticle();
            if (particle === null)
                return;
            let rand = pseudoRandom(randomRangeInt(0, INT_MAX));

            if (this.shapeModule.enable) {
                this.shapeModule.emit(particle);
            }
            else {
                vec3.set(particle.position, 0, 0, 0);
                vec3.copy(particle.velocity, particleEmitZAxis);
            }

            vec3.scale(particle.velocity, particle.velocity, this.startSpeed.evaluate(this._time / this.duration, rand));

            switch (this._simulationSpace) {
                case Space.Local:
                    break;
                case Space.World: {
                    this.node.getWorldMatrix(_world_mat);
                    vec3.transformMat4(particle.position, particle.position, _world_mat);
                    let worldRot = quat.create();
                    this.node.getWorldRotation(worldRot);
                    vec3.transformQuat(particle.velocity, particle.velocity, worldRot);
                }
                    break;
                case Space.Custom:
                    // TODO:
                    break;
            }
            // apply startRotation. now 2D only.
            vec3.set(particle.rotation, this.startRotation.evaluate(this._time / this.duration, rand), 0, 0);

            // apply startSize. now 2D only.
            vec3.set(particle.startSize, this.startSize.evaluate(this._time / this.duration, rand), 0, 0);
            vec3.copy(particle.size, particle.startSize);

            // apply startColor.
            particle.startColor.set(this.startColor.evaluate(this._time / this.duration, rand));
            particle.startColor.to01(particle.startColor01);
            particle.color.set(particle.startColor);

            // apply startLifetime.
            particle.startLifetime = this.startLifetime.evaluate(this._time / this.duration, rand);
            particle.remainingLifetime = particle.startLifetime;

            particle.randomSeed = randomRangeInt(0, 233280);

            this.renderer._setNewParticle(particle);

        } // end of particles forLoop.
    }

    // simulation, update particles.
    _updateParticles(dt) {
        this._entity.getWorldMatrix(_world_mat);
        if (this._velocityOvertimeModule.enable) {
            this._velocityOvertimeModule.update(this._simulationSpace, _world_mat);
        }
        if (this._forceOvertimeModule.enable) {
            this._forceOvertimeModule.update(this._simulationSpace, _world_mat);
        }
        for (let i = 0; i < this._particles.length; ++i) {
            let p = this._particles.data[i];
            p.remainingLifetime -= dt;
            vec3.set(p.animatedVelocity, 0, 0, 0);

            if (p.remainingLifetime < 0.0) {
                // subEmitter
                // if (this._subEmitters.length > 0) {
                //   for (let idx = 0; idx < this._subEmitters.length; ++idx) {
                //     let subEmitter = this._subEmitters[idx];
                //     if (subEmitter.type === 'death') {
                //       vec3.copy(subEmitter.emitter.entity.lpos, p.position);
                //       subEmitter.emitter.play();
                //     }
                //   }
                // }

                this._particles.remove(i);
                --i;
                continue;
            }

            p.velocity.y -= this._gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, p.randomSeed) * 9.8 * dt; // apply gravity.
            if (this._sizeOvertimeModule.enable) {
                this._sizeOvertimeModule.animate(p);
            }
            if (this._colorOverLifetimeModule.enable) {
                this._colorOverLifetimeModule.animate(p);
            }
            if (this._forceOvertimeModule.enable) {
                this._forceOvertimeModule.animate(p, dt);
            }
            if (this._velocityOvertimeModule.enable) {
                this._velocityOvertimeModule.animate(p);
            }
            else {
                vec3.copy(p.ultimateVelocity, p.velocity);
            }
            if (this._limitVelocityOvertimeModule.enable) {
                this._limitVelocityOvertimeModule.animate(p);
            }
            if (this._rotationOvertimeModule.enable) {
                this._rotationOvertimeModule.animate(p, dt);
            }
            if (this._textureAnimationModule.enable) {
                this._textureAnimationModule.animate(p);
            }
            vec3.scaleAndAdd(p.position, p.position, p.ultimateVelocity, dt); // apply velocity.
        }
    }

    // initialize particle system as though it had already completed a full cycle.
    _prewarmSystem() {
        this._startDelay.mode = 'constant'; // clear startDelay.
        this._startDelay.constant = 0;
        let dt = 1.0; // should use varying value?
        let cnt = this.duration / dt;
        for (let i = 0; i < cnt; ++i) {
            this._time += dt;
            this._emit(dt);
            this._renderer._updateParticles(dt);
        }
    }

    // internal function
    _emit(dt) {
        // emit particles.
        let startDelay = this.startDelay.evaluate();
        if (this._time > startDelay) {
            if (!this._isStopped) {
                this._isEmitting = true;
            }
            if (this._time > (this.duration + startDelay)) {
                // this._time = startDelay; // delay will not be applied from the second loop.(Unity)
                // this._emitRateTimeCounter = 0.0;
                // this._emitRateDistanceCounter = 0.0;
                if (!this.loop) {
                    this._isEmitting = false;
                    this._isStopped = true;
                }
            }

            // emit by rateOverTime
            this._emitRateTimeCounter += this.rateOverTime.evaluate(this._time / this.duration, 1) * dt;
            if (this._emitRateTimeCounter > 1 && this._isEmitting) {
                let emitNum = Math.floor(this._emitRateTimeCounter);
                this._emitRateTimeCounter -= emitNum;
                this.emit(emitNum);
            }
            // emit by rateOverDistance
            this.node.getWorldPosition(this._curWPos);
            let distance = vec3.distance(this._curWPos, this._oldWPos);
            vec3.copy(this._oldWPos, this._curWPos);
            this._emitRateDistanceCounter += distance * this.rateOverDistance.evaluate(this._time / this.duration, 1);
            if (this._emitRateDistanceCounter > 1 && this._isEmitting) {
                let emitNum = Math.floor(this._emitRateDistanceCounter);
                this._emitRateDistanceCounter -= emitNum;
                this.emit(emitNum);
            }

            // bursts
            for (let i = 0; i < this.bursts.length; ++i) {
                this.bursts[i].update(this, dt);
            }
        }
    }

    update(dt) {
        let scaledDeltaTime = dt * this.simulationSpeed;
        if (this._isPlaying) {
            this._time += scaledDeltaTime;

            // excute emission
            this._emit(scaledDeltaTime);

            // simulation, update particles.
            this.renderer._updateParticles(scaledDeltaTime);

            // update render data
            this.renderer._updateRenderData();
        }
    }

    addSubEmitter(subEmitter) {
        this._subEmitters.push(subEmitter);
    }

    removeSubEmitter(idx) {
        this._subEmitters.remove(idx);
    }

    addBurst(burst) {
        this._bursts.push(burst);
    }

    removeBurst(idx) {
        this._bursts.remove(idx);
    }

    getParticleCount() {
        return this._particles.length;
    }

    setCustomData1(x, y) {
        vec2.set(this._customData1, x, y);
    }

    setCustomData2(x, y) {
        vec2.set(this._customData2, x, y);
    }

    get isPlaying() {
        return this._isPlaying;
    }

    get isPaused() {
        return this._isPaused;
    }

    get isStopped() {
        return this._isStopped;
    }

    get isEmitting() {
        return this._isEmitting;
    }

    get time() {
        return this._time;
    }
}
