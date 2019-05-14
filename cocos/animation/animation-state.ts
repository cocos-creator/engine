import { Component } from '../components';
import { binarySearchEpsilon as binarySearch } from '../core/data/utils/binary-search';
import { Node } from '../scene-graph';
import { AnimationBlendState, PropertyBlendState } from './animation-blend-state';
import { AnimationClip } from './animation-clip';
import { AnimCurve, EventInfo, ICurveTarget } from './animation-curve';
import { Playable } from './playable';
import { WrapMode, WrapModeMask, WrappedInfo } from './types';

interface ICurveInstance {
    curve: AnimCurve;
    target: ICurveTarget;
    propertyName: string;
    blendTarget: PropertyBlendState | null;
    cached?: any[];
}

/**
 * !#en
 * The AnimationState gives full control over animation playback process.
 * In most cases the Animation Component is sufficient and easier to use. Use the AnimationState if you need full control.
 * !#zh
 * AnimationState 完全控制动画播放过程。<br/>
 * 大多数情况下 动画组件 是足够和易于使用的。如果您需要更多的动画控制接口，请使用 AnimationState。
 *
 */
export class AnimationState extends Playable {

    /**
     * !#en The clip that is being played by this animation state.
     * !#zh 此动画状态正在播放的剪辑。
     */
    get clip () {
        return this._clip;
    }

    /**
     * !#en The name of the playing animation.
     * !#zh 动画的名字
     */
    get name () {
        return this._name;
    }

    get length () {
        return this.duration;
    }

    /**
     * !#en
     * Wrapping mode of the playing animation.
     * Notice : dynamic change wrapMode will reset time and repeatCount property
     * !#zh
     * 动画循环方式。
     * 需要注意的是，动态修改 wrapMode 时，会重置 time 以及 repeatCount
     * @default: WrapMode.Normal
     */
    get wrapMode () {
        return this._wrapMode;
    }

    set wrapMode (value: WrapMode) {
        this._wrapMode = value;

        if (CC_EDITOR) { return; }

        // dynamic change wrapMode will need reset time to 0
        this.time = 0;

        if (value & WrapModeMask.Loop) {
            this.repeatCount = Infinity;
        }
        else {
            this.repeatCount = 1;
        }
    }

    /**
     * !#en The animation's iteration count property.
     *
     * A real number greater than or equal to zero (including positive infinity) representing the number of times
     * to repeat the animation node.
     *
     * Values less than zero and NaN values are treated as the value 1.0 for the purpose of timing model
     * calculations.
     *
     * !#zh 迭代次数，指动画播放多少次后结束, normalize time。 如 2.5（2次半）
     *
     * @property repeatCount
     * @type {Number}
     * @default 1
     */
    get repeatCount () {
        return this._repeatCount;
    }

    set repeatCount (value: number) {
        this._repeatCount = value;

        const shouldWrap = this._wrapMode & WrapModeMask.ShouldWrap;
        const reverse = (this.wrapMode & WrapModeMask.Reverse) === WrapModeMask.Reverse;
        if (value === Infinity && !shouldWrap && !reverse) {
            this._process = this.simpleProcess;
        }
        else {
            this._process = this.process;
        }
    }

    /**
     * !#en The start delay which represents the number of seconds from an animation's start time to the start of
     * the active interval.
     * !#zh 延迟多少秒播放。
     * @default 0
     */
    get delay () {
        return this._delay;
    }

    set delay (value: number) {
        this._delayTime = this._delay = value;
    }

    /**
     * !#en The curves list.
     * !#zh 曲线列表。
     */
    // public curves: AnimCurve[] = [];

    // http://www.w3.org/TR/web-animations/#idl-def-AnimationTiming

    /**
     * !#en The iteration duration of this animation in seconds. (length)
     * !#zh 单次动画的持续时间，秒。
     * @readOnly
     */
    public duration = 1;

    /**
     * !#en The animation's playback speed. 1 is normal playback speed.
     * !#zh 播放速率。
     * @default: 1.0
     */
    public speed = 1;

    /**
     * !#en The current time of this animation in seconds.
     * !#zh 动画当前的时间，秒。
     * @default 0
     */
    public time = 0;

    /**
     * The weight.
     */
    public weight = 0;

    public frameRate = 0;

    public _lastframeEventOn = false;

    private _wrapMode = WrapMode.Normal;

    private _repeatCount = 1;

    /**
     * Mark whether the current frame is played.
     * When set new time to animation state, we should ensure the frame at the specified time being played at next update.
     */
    private _currentFramePlayed = false;
    private _delay = 0;
    private _delayTime = 0;
    private _wrappedInfo = new WrappedInfo();
    private _lastWrappedInfo: WrappedInfo | null = null;
    private _process = this.process;
    private _target: Node | null = null;
    private _clip: AnimationClip;
    private _name: string;
    private _lastIterations?: number;
    private _curveInstances: ICurveInstance[] = [];

    constructor (clip: AnimationClip, name?: string) {
        super();
        this._clip = clip;
        this._name = name || (clip && clip.name);
    }

    public initialize (root: Node) {
        this._curveInstances.length = 0;
        const clip = this._clip;

        this.duration = clip.duration;
        this.speed = clip.speed;
        this.wrapMode = clip.wrapMode;
        this.frameRate = clip.sample;

        if ((this.wrapMode & WrapModeMask.Loop) === WrapModeMask.Loop) {
            this.repeatCount = Infinity;
        } else {
            this.repeatCount = 1;
        }

        const propertyCurves = clip.propertyCurves;
        for (const propertyCurve of propertyCurves) {
            const targetNode = root.getChildByPath(propertyCurve.path);
            if (!targetNode) {
                console.warn(`Target animation node referenced by path ${propertyCurve.path} is not found(from ${root.name}).`);
                continue;
            }
            let target: Node | Component = targetNode;
            if (propertyCurve.component) {
                const targetComponent = targetNode.getComponent(propertyCurve.component);
                if (!targetComponent) {
                    continue;
                }
                target = targetComponent;
            }
            this._curveInstances.push({
                target,
                propertyName: propertyCurve.propertyName,
                curve: propertyCurve.curve,
                blendTarget: null,
            });
        }
    }

    public _emit (type, state) {
        if (this._target && this._target.isValid) {
            this._target.emit(type, type, state);
        }
    }

    public emit (...restargs: any[]) {
        const args = new Array(restargs.length);
        for (let i = 0, l = args.length; i < l; i++) {
            args[i] = restargs[i];
        }
        cc.director.getAnimationManager().pushDelayEvent(this, '_emit', args);
    }

    public on (type, callback, target) {
        if (this._target && this._target.isValid) {
            if (type === 'lastframe') {
                this._lastframeEventOn = true;
            }
            return this._target.on(type, callback, target);
        }
        else {
            return null;
        }
    }

    public once (type, callback, target) {
        if (this._target && this._target.isValid) {
            if (type === 'lastframe') {
                this._lastframeEventOn = true;
            }
            return this._target.once(type, (event) => {
                callback.call(target, event);
                this._lastframeEventOn = false;
            });
        }
        else {
            return null;
        }
    }

    public off (type, callback, target) {
        if (this._target && this._target.isValid) {
            if (type === 'lastframe') {
                if (!this._target.hasEventListener(type)) {
                    this._lastframeEventOn = false;
                }
            }
            this._target.off(type, callback, target);
        }
    }

    public _setEventTarget (target) {
        this._target = target;
    }

    public setTime (time: number) {
        this._currentFramePlayed = false;
        this.time = time || 0;
        // const curves = this.curves;
        // for (let i = 0, l = curves.length; i < l; i++) {
        //     const curve = curves[i];
        //     if (curve.onTimeChangedManually) {
        //         curve.onTimeChangedManually(time, this);
        //     }
        // }
    }

    public update (delta: number) {
        // calculate delay time

        if (this._delayTime > 0) {
            this._delayTime -= delta;
            if (this._delayTime > 0) {
                // still waiting
                return;
            }
        }

        // make first frame perfect

        // var playPerfectFirstFrame = (this.time === 0);
        if (this._currentFramePlayed) {
            this.time += (delta * this.speed);
        }
        else {
            this._currentFramePlayed = true;
        }

        this._process();
    }

    public _needReverse (currentIterations: number) {
        const wrapMode = this.wrapMode;
        let needReverse = false;

        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
            const isEnd = currentIterations - (currentIterations | 0) === 0;
            if (isEnd && (currentIterations > 0)) {
                currentIterations -= 1;
            }

            const isOddIteration = currentIterations & 1;
            if (isOddIteration) {
                needReverse = !needReverse;
            }
        }
        if ((wrapMode & WrapModeMask.Reverse) === WrapModeMask.Reverse) {
            needReverse = !needReverse;
        }
        return needReverse;
    }

    public getWrappedInfo (time: number, info?: WrappedInfo) {
        info = info || new WrappedInfo();

        let stopped = false;
        const duration = this.duration;
        const repeatCount = this.repeatCount;

        let currentIterations = time > 0 ? (time / duration) : -(time / duration);
        if (currentIterations >= repeatCount) {
            currentIterations = repeatCount;

            stopped = true;
            let tempRatio = repeatCount - (repeatCount | 0);
            if (tempRatio === 0) {
                tempRatio = 1;  // 如果播放过，动画不复位
            }
            time = tempRatio * duration * (time > 0 ? 1 : -1);
        }

        if (time > duration) {
            const tempTime = time % duration;
            time = tempTime === 0 ? duration : tempTime;
        }
        else if (time < 0) {
            time = time % duration;
            if (time !== 0) { time += duration; }
        }

        let needReverse = false;
        const shouldWrap = this._wrapMode & WrapModeMask.ShouldWrap;
        if (shouldWrap) {
            needReverse = this._needReverse(currentIterations);
        }

        let direction = needReverse ? -1 : 1;
        if (this.speed < 0) {
            direction *= -1;
        }

        // calculate wrapped time
        if (shouldWrap && needReverse) {
            time = duration - time;
        }

        info.ratio = time / duration;
        info.time = time;
        info.direction = direction;
        info.stopped = stopped;
        info.iterations = currentIterations;

        return info;
    }

    public sample () {
        const info = this.getWrappedInfo(this.time, this._wrappedInfo);
        this._sampleCurves(info.ratio);

        return info;
    }

    public process () {
        // sample
        const info = this.sample();

        if (this._lastframeEventOn) {
            let lastInfo;
            if (!this._lastWrappedInfo) {
                lastInfo = this._lastWrappedInfo = new WrappedInfo(info);
            } else {
                lastInfo = this._lastWrappedInfo;
            }

            if (this.repeatCount > 1 && ((info.iterations | 0) > (lastInfo.iterations | 0))) {
                this.emit('lastframe', this);
            }

            lastInfo.set(info);
        }

        if (info.stopped) {
            this.stop();
            this.emit('finished', this);
        }
    }

    public simpleProcess () {
        let time = this.time;
        const duration = this.duration;

        if (time > duration) {
            time = time % duration;
            if (time === 0) { time = duration; }
        }
        else if (time < 0) {
            time = time % duration;
            if (time !== 0) { time += duration; }
        }

        const ratio = time / duration;
        this._sampleCurves(ratio);

        if (this._lastframeEventOn) {
            if (this._lastIterations === undefined) {
                this._lastIterations = ratio;
            }

            if ((this.time > 0 && this._lastIterations > ratio) || (this.time < 0 && this._lastIterations < ratio)) {
                this.emit('lastframe', this);
            }

            this._lastIterations = ratio;
        }
    }

    public attachToBlendState (blendState: AnimationBlendState) {
        for (const curveInstance of this._curveInstances) {
            curveInstance.blendTarget = blendState.refPropertyBlendTarget(
                curveInstance.target, curveInstance.propertyName);
        }
    }

    public detachFromBlendState (blendState: AnimationBlendState) {
        for (const curveInstance of this._curveInstances) {
            curveInstance.blendTarget = null;
            blendState.derefPropertyBlendTarget(
                curveInstance.target, curveInstance.propertyName);
        }
    }

    public cache (frames: number) {
    }

    protected onPlay () {
        // replay
        this.setTime(0);
        this._delayTime = this._delay;

        cc.director.getAnimationManager().addAnimation(this);

        this.emit('play', this);
    }

    protected onStop () {
        if (!this.isPaused) {
            cc.director.getAnimationManager().removeAnimation(this);
        }

        this.emit('stop', this);
    }

    protected onResume () {
        cc.director.getAnimationManager().addAnimation(this);
        this.emit('resume', this);
    }

    protected onPause () {
        cc.director.getAnimationManager().removeAnimation(this);
        this.emit('pause', this);
    }

    private _sampleCurves (ratio: number) {
        for (const curveInstace of this._curveInstances) {
            const { curve, blendTarget, target, propertyName } = curveInstace;
            const value = curve.sample(ratio);
            if (!curve._blendFunction || !blendTarget || blendTarget.refCount <= 1) {
                target[propertyName] = value;
            } else {
                const { weight } = this;
                blendTarget.value = curve._blendFunction(value, weight, blendTarget);
                blendTarget.weight += weight;
            }
        }
    }

    private _sampleEvents () {
        /*
@ccclass('cc.EventAnimCurve')
export class EventAnimCurve extends AnimCurve {
    @property
    public target: ICurveTarget | null = null;

    @property
    public ratios: number[] = [];

    @property
    public events: EventInfo[] = [];

    @property
    private _wrappedInfo = new WrappedInfo();

    @property
    private _lastWrappedInfo: WrappedInfo | null = null;

    @property
    private _ignoreIndex: number = NaN;

    public sample (time: number, ratio: number, state: AnimationState) {
        const length = this.ratios.length;

        const currentWrappedInfo = state.getWrappedInfo(state.time, this._wrappedInfo);
        let direction = currentWrappedInfo.direction;
        let currentIndex = binarySearch(this.ratios, currentWrappedInfo.ratio);
        if (currentIndex < 0) {
            currentIndex = ~currentIndex - 1;

            // if direction is inverse, then increase index
            if (direction < 0) { currentIndex += 1; }
        }

        if (this._ignoreIndex !== currentIndex) {
            this._ignoreIndex = NaN;
        }

        currentWrappedInfo.frameIndex = currentIndex;

        if (!this._lastWrappedInfo) {
            this._fireEvent(currentIndex);
            this._lastWrappedInfo = new WrappedInfo(currentWrappedInfo);
            return;
        }

        const wrapMode = state.wrapMode;
        const currentIterations = this._wrapIterations(currentWrappedInfo.iterations);

        const lastWrappedInfo = this._lastWrappedInfo;
        let lastIterations = this._wrapIterations(lastWrappedInfo.iterations);
        let lastIndex = lastWrappedInfo.frameIndex;
        const lastDirection = lastWrappedInfo.direction;

        const interationsChanged = lastIterations !== -1 && currentIterations !== lastIterations;

        if (lastIndex === currentIndex && interationsChanged && length === 1) {
            this._fireEvent(0);
        } else if (lastIndex !== currentIndex || interationsChanged) {
            direction = lastDirection;

            do {
                if (lastIndex !== currentIndex) {
                    if (direction === -1 && lastIndex === 0 && currentIndex > 0) {
                        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
                            direction *= -1;
                        } else {
                            lastIndex = length;
                        }
                        lastIterations++;
                    } else if (direction === 1 && lastIndex === length - 1 && currentIndex < length - 1) {
                        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
                            direction *= -1;
                        } else {
                            lastIndex = -1;
                        }
                        lastIterations++;
                    }

                    if (lastIndex === currentIndex) {
                        break;
                    }
                    if (lastIterations > currentIterations) {
                        break;
                    }
                }

                lastIndex += direction;

                cc.director.getAnimationManager().pushDelayEvent(this, '_fireEvent', [lastIndex]);
            } while (lastIndex !== currentIndex && lastIndex > -1 && lastIndex < length);
        }

        this._lastWrappedInfo.set(currentWrappedInfo);
    }

    public onTimeChangedManually (time: number, state) {
        this._lastWrappedInfo = null;
        this._ignoreIndex = NaN;

        const info = state.getWrappedInfo(time, this._wrappedInfo);
        const direction = info.direction;
        let frameIndex = binarySearch(this.ratios, info.ratio);

        // only ignore when time not on a frame index
        if (frameIndex < 0) {
            frameIndex = ~frameIndex - 1;

            // if direction is inverse, then increase index
            if (direction < 0) { frameIndex += 1; }

            this._ignoreIndex = frameIndex;
        }
    }

    private _wrapIterations (iterations: number) {
        if (iterations - (iterations | 0) === 0) {
            iterations -= 1;
        }
        return iterations | 0;
    }

    private _fireEvent (index: number) {
        if (index < 0 || index >= this.events.length || this._ignoreIndex === index) {
            return;
        }

        const eventInfo = this.events[index];
        const events = eventInfo.events;

        if (!this.target || !this.target.isValid) {
            return;
        }

        const components = this.target._components;

        for (const event of events) {
            const funcName = event.func;
            for (const component of components) {
                const func = component[funcName];
                if (func) {
                    func.apply(component, event.params);
                }
            }
        }
    }
}
         */
    }
}

cc.AnimationState = AnimationState;
