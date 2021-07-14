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
 * @module geometry
 */

import { CCClass } from '../data/class';
import { clamp, inverseLerp, pingPong, repeat } from '../math/utils';
import { WrapModeMask } from '../animation/types';
import { ExtrapMode, RealCurve, RealInterpMode, RealKeyframeValue } from '../curves';
import { ccclass, serializable } from '../data/decorators';

const LOOK_FORWARD = 3;

/**
 * @en
 * A key frame in the curve.
 * @zh
 * 曲线中的一个关键帧。
 */
export class Keyframe {
    /**
     * @en Current frame time.
     * @zh 当前帧时间。
     */
    public time = 0;

    /**
     * @en Current frame value.
     * @zh 当前帧的值。
     */
    public value = 0;

    /**
     * @en In tangent value.
     * @zh 左切线。
     */
    public inTangent = 0;

    /**
     * @en Out tangent value.
     * @zh 右切线。
     */
    public outTangent = 0;
}

CCClass.fastDefine('cc.Keyframe', Keyframe, {
    time: 0,
    value: 0,
    inTangent: 0,
    outTangent: 0,
});

export class OptimizedKey {
    public index: number;
    public time: number;
    public endTime: number;
    public coefficient: Float32Array;
    constructor () {
        this.index = -1;
        this.time = 0;
        this.endTime = 0;
        this.coefficient = new Float32Array(4);
    }

    public evaluate (T: number) {
        const t = T - this.time;
        return evalOptCurve(t, this.coefficient);
    }
}

export function evalOptCurve (t: number, coefs: Float32Array | number[]) {
    return (t * (t * (t * coefs[0] + coefs[1]) + coefs[2])) + coefs[3];
}

/**
 * @en
 * Describe a curve in which three times Hermite interpolation is used for each adjacent key frame.
 * @zh
 * 描述一条曲线，其中每个相邻关键帧采用三次hermite插值计算。
 */
@ccclass('cc.AnimationCurve')
export class AnimationCurve {
    @serializable
    private _curve!: RealCurve;

    private static defaultKF: Keyframe[] = [{
        time: 0,
        value: 1,
        inTangent: 0,
        outTangent: 0,
    }, {
        time: 1,
        value: 1,
        inTangent: 0,
        outTangent: 0,
    }];

    /**
     * For internal usage only.
     * @internal
     */
    get _internalCurve () {
        return this._curve;
    }

    /**
     * @en
     * The key frame of the curve.
     * @zh
     * 曲线的关键帧。
     */
    get keyFrames () {
        return Array.from(this._curve.keyframes()).map(([time, value]) => {
            const legacyKeyframe = new Keyframe();
            legacyKeyframe.time = time;
            legacyKeyframe.value = value.value;
            legacyKeyframe.inTangent = value.startTangent;
            legacyKeyframe.outTangent = value.endTangent;
            return legacyKeyframe;
        });
    }

    set keyFrames (value) {
        this._curve.assignSorted(value.map((legacyCurve) => [
            legacyCurve.time,
            new RealKeyframeValue({
                interpMode: RealInterpMode.CUBIC,
                value: legacyCurve.value,
                startTangent: legacyCurve.inTangent,
                endTangent: legacyCurve.outTangent,
            }),
        ]));
    }

    /**
     * @en
     * Loop mode [[WrapMode]] when the sampling time exceeds the left end.
     * @zh
     * 当采样时间超出左端时采用的循环模式[[WrapMode]]。
     */
    get preWrapMode () {
        return toLegacyWrapMode(this._curve.preExtrap);
    }

    set preWrapMode (value) {
        this._curve.preExtrap = fromLegacyWrapMode(value);
    }

    /**
     * @en
     * Cycle mode [[WrapMode]] when the sampling time exceeds the right end.
     * @zh
     * 当采样时间超出右端时采用的循环模式[[WrapMode]]。
     */
    get postWrapMode () {
        return toLegacyWrapMode(this._curve.postExtrap);
    }

    set postWrapMode (value) {
        this._curve.postExtrap = fromLegacyWrapMode(value);
    }

    private cachedKey: OptimizedKey;

    /**
     * 构造函数。
     * @param keyFrames 关键帧。
     */
    constructor (keyFrames: Keyframe[] | null | RealCurve = null) {
        if (keyFrames instanceof RealCurve) {
            this._curve = keyFrames;
        } else {
            const curve = new RealCurve();
            this._curve = curve;
            curve.preExtrap = ExtrapMode.REPEAT;
            curve.postExtrap = ExtrapMode.CLAMP;
            if (!keyFrames) {
                curve.assignSorted([
                    [0.0, new RealKeyframeValue({ interpMode: RealInterpMode.CUBIC, value: 1.0 })],
                    [1.0, new RealKeyframeValue({ interpMode: RealInterpMode.CUBIC, value: 1.0 })],
                ]);
            } else {
                curve.assignSorted(keyFrames.map((legacyKeyframe) => [legacyKeyframe.time, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    value: legacyKeyframe.value,
                    startTangent: legacyKeyframe.inTangent,
                    endTangent: legacyKeyframe.outTangent,
                })]));
            }
        }
        this.cachedKey = new OptimizedKey();
    }

    /**
     * @en
     * Add a keyframe.
     * @zh
     * 添加一个关键帧。
     * @param keyFrame 关键帧。
     */
    public addKey (keyFrame: Keyframe | null) {
        if (!keyFrame) {
            this._curve.clear();
        } else {
            this._curve.addKeyFrame(keyFrame.time, new RealKeyframeValue({
                interpMode: RealInterpMode.CUBIC,
                value: keyFrame.value,
                startTangent: keyFrame.inTangent,
                endTangent: keyFrame.outTangent,
            }));
        }
    }

    /**
     * @ignore
     * @param time
     */
    public evaluate_slow (time: number) {
        return this._curve.evaluate(time);
    }

    /**
     * @en
     * Calculate the curve interpolation at a given point in time.
     * @zh
     * 计算给定时间点的曲线插值。
     * @param time 时间。
     */
    public evaluate (time: number) {
        const { cachedKey, _curve: curve } = this;
        const nKeyframes = curve.keyFramesCount;
        const lastKeyframeIndex = nKeyframes - 1;
        let wrappedTime = time;
        const extrapMode = time < 0 ? curve.preExtrap : curve.postExtrap;
        const startTime = curve.getKeyframeTime(0);
        const endTime = curve.getKeyframeTime(lastKeyframeIndex);
        switch (extrapMode) {
        case ExtrapMode.REPEAT:
            wrappedTime = repeat(time - startTime, endTime - startTime) + startTime;
            break;
        case ExtrapMode.PING_PONG:
            wrappedTime = pingPong(time - startTime, endTime - startTime) + startTime;
            break;
        case ExtrapMode.CLAMP:
        default:
            wrappedTime = clamp(time, startTime, endTime);
            break;
        }
        if (wrappedTime >= cachedKey.time && wrappedTime < cachedKey.endTime) {
            return cachedKey.evaluate(wrappedTime);
        }
        const leftIndex = this.findIndex(cachedKey, wrappedTime);
        const rightIndex = Math.min(leftIndex + 1, lastKeyframeIndex);
        this.calcOptimizedKey(cachedKey, leftIndex, rightIndex);
        return cachedKey.evaluate(wrappedTime);
    }

    /**
     * @ignore
     * @param optKey
     * @param leftIndex
     * @param rightIndex
     */
    public calcOptimizedKey (optKey: OptimizedKey, leftIndex: number, rightIndex: number) {
        const lhsTime = this._curve.getKeyframeTime(leftIndex);
        const rhsTime = this._curve.getKeyframeTime(rightIndex);
        const { value: lhsValue, endTangent: lhsOutTangent } = this._curve.getKeyframeValue(leftIndex);
        const { value: rhsValue, startTangent: rhsInTangent  } = this._curve.getKeyframeValue(rightIndex);
        optKey.index = leftIndex;
        optKey.time = lhsTime;
        optKey.endTime = rhsTime;

        const dx = rhsTime - lhsTime;
        const dy = rhsValue - lhsValue;
        const length = 1 / (dx * dx);
        const d1 = lhsOutTangent * dx;
        const d2 = rhsInTangent * dx;

        optKey.coefficient[0] = (d1 + d2 - dy - dy) * length / dx;
        optKey.coefficient[1] = (dy + dy + dy - d1 - d1 - d2) * length;
        optKey.coefficient[2] = lhsOutTangent;
        optKey.coefficient[3] = lhsValue;
    }

    /**
     * @ignore
     * @param optKey
     * @param t
     */
    private findIndex (optKey: OptimizedKey, t: number) {
        const { _curve: curve } = this;
        const nKeyframes = curve.keyFramesCount;
        const cachedIndex = optKey.index;
        if (cachedIndex !== -1) {
            const cachedTime = curve.getKeyframeTime(cachedIndex);
            if (t > cachedTime) {
                for (let i = 0; i < LOOK_FORWARD; i++) {
                    const currIndex = cachedIndex + i;
                    if (currIndex + 1 < nKeyframes && curve.getKeyframeTime(currIndex + 1) > t) {
                        return currIndex;
                    }
                }
            } else {
                for (let i = 0; i < LOOK_FORWARD; i++) {
                    const currIndex = cachedIndex - i;
                    if (currIndex >= 0 && curve.getKeyframeTime(currIndex - 1) <= t) {
                        return currIndex - 1;
                    }
                }
            }
        }
        let left = 0;
        let right = nKeyframes;
        let mid;
        while (right - left > 1) {
            mid = Math.floor((left + right) / 2);
            if (curve.getKeyframeTime(mid) >= t) {
                right = mid;
            } else {
                left = mid;
            }
        }
        return left;
    }
}

function fromLegacyWrapMode (legacyWrapMode: WrapModeMask): ExtrapMode {
    switch (legacyWrapMode) {
    default:
    case WrapModeMask.Default:
    case WrapModeMask.Normal:
    case WrapModeMask.Clamp: return ExtrapMode.CLAMP;
    case WrapModeMask.PingPong: return ExtrapMode.PING_PONG;
    case WrapModeMask.Loop: return ExtrapMode.REPEAT;
    }
}

function toLegacyWrapMode (extrapMode: ExtrapMode): WrapModeMask {
    switch (extrapMode) {
    default:
    case ExtrapMode.LINEAR:
    case ExtrapMode.CLAMP: return WrapModeMask.Clamp;
    case ExtrapMode.PING_PONG: return WrapModeMask.PingPong;
    case ExtrapMode.REPEAT: return WrapModeMask.Loop;
    }
}

/**
 * Same as but more effective than `new LegacyCurve()._internalCurve`.
 */
export function constructLegacyCurveAndConvert () {
    const curve = new RealCurve();
    curve.assignSorted([
        [0.0, new RealKeyframeValue({ interpMode: RealInterpMode.CUBIC, value: 1.0 })],
        [1.0, new RealKeyframeValue({ interpMode: RealInterpMode.CUBIC, value: 1.0 })],
    ]);
    return curve;
}
