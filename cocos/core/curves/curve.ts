import { assertIsTrue } from '../data/utils/asserts';
import { approx, lerp, pingPong, repeat } from '../math';
import { KeyframeCurve } from './keyframe-curve';
import { ccclass, serializable, uniquelyReferenced } from '../data/decorators';
import { deserializeSymbol, serializeSymbol } from '../data/serialization-symbols';
import { RealInterpMode, ExtrapMode, TangentWeightMode } from './real-curve-param';
import { binarySearchEpsilon } from '../algorithm/binary-search';
import { solveCubic } from './solve-cubic';
import { EditorExtendableMixin } from '../data/editor-extendable';

export { RealInterpMode, ExtrapMode, TangentWeightMode };

@ccclass('cc.RealKeyframeValue')
@uniquelyReferenced
export class RealKeyframeValue {
    constructor ({
        interpMode,
        tangentWeightMode,
        value,
        startTangent,
        startTangentWeight,
        endTangent,
        endTangentWeight,
    }:  Partial<RealKeyframeValue> = { }) {
        this.value = value ?? this.value;
        this.startTangent = startTangent ?? this.startTangent;
        this.startTangentWeight = startTangentWeight ?? this.startTangentWeight;
        this.endTangent = endTangent ?? this.endTangent;
        this.endTangentWeight = endTangentWeight ?? this.endTangentWeight;
        this.interpMode = interpMode ?? this.interpMode;
        this.tangentWeightMode = tangentWeightMode ?? this.tangentWeightMode;
    }

    /**
     * Interpolation method used for this keyframe.
     */
    @serializable
    public interpMode = RealInterpMode.LINEAR;

    /**
     * Tangent weight mode.
     */
    @serializable
    public tangentWeightMode = TangentWeightMode.NONE;

    /**
     * Value of the keyframe.
     */
    @serializable
    public value = 0.0;

    /**
     * The (y component of) tangent of this keyframe
     * when it's used as starting point during cubic interpolation.
     * Meaningless otherwise.
     */
    @serializable
    public startTangent = 0.0;

    /**
     * The x component tangent of this keyframe
     * when it's used as starting point during cubic interpolation.
     * Meaningless otherwise.
     */
    @serializable
    public startTangentWeight = 0.0;

    /**
     * The (y component of) tangent of this keyframe
     * when it's used as ending point during cubic interpolation.
     * Meaningless otherwise.
     */
    @serializable
    public endTangent = 0.0;

    /**
     * The x component of tangent of this keyframe
     * when it's used as starting point during cubic interpolation.
     * Meaningless otherwise.
     */
    @serializable
    public endTangentWeight = 0.0;
}

/**
 * Curve.
 */
@ccclass('cc.RealCurve')
export class RealCurve extends EditorExtendableMixin<KeyframeCurve<RealKeyframeValue>>(KeyframeCurve) {
    /**
     * Gets or sets the operation should be taken
     * if input time is less than the time of first keyframe when evaluating this curve.
     * Defaults to `ExtrapMode.CLAMP`.
     */
    get preExtrap () {
        return this._preExtrap;
    }

    set preExtrap (value) {
        this._preExtrap = value;
    }

    /**
     * Gets or sets the operation should be taken
     * if input time is greater than the time of last keyframe when evaluating this curve.
     * Defaults to `ExtrapMode.CLAMP`.
     */
    get postExtrap () {
        return this._postExtrap;
    }

    set postExtrap (value) {
        this._postExtrap = value;
    }

    /**
     * Evaluates this curve at specified time.
     * @param time Input time.
     * @returns Result value.
     */
    public evaluate (time: number): number {
        const {
            _times: times,
            _values: values,
        } = this;

        const nFrames = times.length;

        if (nFrames === 0) {
            return 0.0;
        }

        const firstTime = times[0];
        const lastTime = times[nFrames - 1];
        if (time < firstTime) {
            // Underflow
            const { _preExtrap: preExtrap } = this;
            const preValue = values[0];
            if (preExtrap === ExtrapMode.CLAMP || nFrames < 2) {
                return preValue.value;
            }
            switch (preExtrap) {
            case ExtrapMode.LINEAR:
                return linearTrend(firstTime, values[0].value, times[1], values[1].value, time);
            case ExtrapMode.REPEAT:
                time = wrapRepeat(time, firstTime, lastTime);
                break;
            case ExtrapMode.PING_PONG:
                time = wrapPingPong(time, firstTime, lastTime);
                break;
            default:
                return preValue.value;
            }
        } else if (time > lastTime) {
            // Overflow
            const { _postExtrap: postExtrap } = this;
            const preFrame = values[nFrames - 1];
            if (postExtrap === ExtrapMode.CLAMP || nFrames < 2) {
                return preFrame.value;
            }
            switch (postExtrap) {
            case ExtrapMode.LINEAR:
                return linearTrend(lastTime, preFrame.value, times[nFrames - 2], values[nFrames - 2].value, time);
            case ExtrapMode.REPEAT:
                time = wrapRepeat(time, firstTime, lastTime);
                break;
            case ExtrapMode.PING_PONG:
                time = wrapPingPong(time, firstTime, lastTime);
                break;
            default:
                return preFrame.value;
            }
        }

        const index = binarySearchEpsilon(times, time);
        if (index >= 0) {
            return values[index].value;
        }

        const iNext = ~index;
        assertIsTrue(iNext !== 0 && iNext !== nFrames && nFrames > 1);

        const iPre = iNext - 1;
        const preTime = times[iPre];
        const preValue = values[iPre];
        const nextTime = times[iNext];
        const nextValue = values[iNext];
        assertIsTrue(nextTime > time && time > preTime);
        const dt = nextTime - preTime;

        const ratio = (time - preTime) / dt;
        return evalBetweenTwoKeyFrames(preTime, preValue, nextTime, nextValue, ratio);
    }

    /**
     * Adds a keyframe into this curve.
     * @param time Time of the keyframe.
     * @param value Value of the keyframe.
     * @returns The index to the new keyframe.
     */
    public addKeyFrame (time: number, value: number | RealKeyframeValue): number {
        const keyframeValue = typeof value === 'number' ? new RealKeyframeValue({ value }) : value;
        return super.addKeyFrame(time, keyframeValue);
    }

    /**
     * Returns if this curve is constant.
     * @param tolerance The tolerance.
     * @returns Whether it is constant.
     */
    public isConstant (tolerance: number) {
        if (this._values.length <= 1) {
            return true;
        }
        const firstVal = this._values[0].value;
        return this._values.every((frame) => approx(frame.value, firstVal, tolerance));
    }

    public [serializeSymbol] () {
        const {
            _times: times,
            _values: keyframeValues,
        } = this;

        const nKeyframes = times.length;

        const dataSize = 0
            + OVERFLOW_BYTES + OVERFLOW_BYTES
            + FRAME_COUNT_BYTES
            + TIME_BYTES * nKeyframes
            + REAL_KEY_FRAME_VALUE_MAX_SIZE * nKeyframes;

        const dataView = new DataView(new ArrayBuffer(dataSize));
        let currentOffset = 0;

        // Overflow operations
        dataView.setUint8(currentOffset, this._preExtrap); currentOffset += OVERFLOW_BYTES;
        dataView.setUint8(currentOffset, this._postExtrap); currentOffset += OVERFLOW_BYTES;

        // Frame count
        dataView.setUint32(currentOffset, nKeyframes, true); currentOffset += FRAME_COUNT_BYTES;

        // Times
        times.forEach((time, index) => dataView.setFloat32(currentOffset + TIME_BYTES * index, time, true));
        currentOffset += TIME_BYTES * nKeyframes;

        // Frame values
        for (const keyframeValue of keyframeValues) {
            currentOffset = saveRealKeyFrameValue(dataView, keyframeValue, currentOffset);
        }

        return new Uint8Array(dataView.buffer, 0, currentOffset);
    }

    public [deserializeSymbol] (serialized: ReturnType<RealCurve[typeof serializeSymbol]>) {
        const dataView = new DataView(serialized.buffer, serialized.byteOffset, serialized.byteLength);
        let currentOffset = 0;

        // Overflow operations
        this._preExtrap = dataView.getUint8(currentOffset); currentOffset += OVERFLOW_BYTES;
        this._postExtrap = dataView.getUint8(currentOffset); currentOffset += OVERFLOW_BYTES;

        // Frame count
        const nKeyframes = dataView.getUint32(currentOffset, true); currentOffset += FRAME_COUNT_BYTES;

        // Times
        const times = Array.from({ length: nKeyframes },
            (_, index) => dataView.getFloat32(currentOffset + TIME_BYTES * index, true));
        currentOffset += TIME_BYTES * nKeyframes;

        // Frame values
        const keyframeValues = new Array<RealKeyframeValue>(nKeyframes);
        for (let iKeyFrame = 0; iKeyFrame < nKeyframes; ++iKeyFrame) {
            const keyframeValue = new RealKeyframeValue({});
            currentOffset = loadRealKeyFrameValue(dataView, keyframeValue, currentOffset);
            keyframeValues[iKeyFrame] = keyframeValue;
        }

        assertIsTrue(currentOffset === serialized.byteLength);

        this._times = times;
        this._values = keyframeValues;
    }

    // Always sorted by time
    @serializable
    private _preExtrap: ExtrapMode = ExtrapMode.CLAMP;

    @serializable
    private _postExtrap: ExtrapMode = ExtrapMode.CLAMP;
}

enum KeyframeValueFlagMask {
    VALUE = 1 << 0,
    INTERP_MODE = 1 << 1,
    TANGENT_WEIGHT_MODE = 1 << 2,
    START_TANGENT = 1 << 3,
    START_TANGENT_WEIGHT = 1 << 4,
    END_TANGENT = 1 << 5,
    END_TANGENT_WEIGHT = 1 << 6,
}

const OVERFLOW_BYTES = 1;
const FRAME_COUNT_BYTES = 4;
const TIME_BYTES = 4;
const KEY_FRAME_VALUE_FLAGS_BYTES = 4;
const VALUE_BYTES = 4;
const INTERP_MODE_BYTES = 1;
const TANGENT_WEIGHT_MODE_BYTES = 1;
const START_TANGENT_BYTES = 4;
const START_TANGENT_WEIGHT_BYTES = 4;
const END_TANGENT_BYTES = 4;
const END_TANGENT_WEIGHT_BYTES = 4;

const {
    interpMode: DEFAULT_INTERP_MODE,
    tangentWeightMode: DEFAULT_TANGENT_WEIGHT_MODE,
    startTangent: DEFAULT_START_TANGENT,
    startTangentWeight: DEFAULT_START_TANGENT_WEIGHT,
    endTangent: DEFAULT_END_TANGENT,
    endTangentWeight: DEFAULT_END_TANGENT_WEIGHT,
} = new RealKeyframeValue({});

const REAL_KEY_FRAME_VALUE_MAX_SIZE = KEY_FRAME_VALUE_FLAGS_BYTES
    + VALUE_BYTES
    + INTERP_MODE_BYTES
    + INTERP_MODE_BYTES
    + TANGENT_WEIGHT_MODE_BYTES
    + START_TANGENT_WEIGHT_BYTES
    + END_TANGENT_BYTES
    + END_TANGENT_WEIGHT_BYTES
    + 0;

function saveRealKeyFrameValue (dataView: DataView, keyframeValue: RealKeyframeValue, offset: number) {
    let flags = 0;

    let currentOffset = offset;

    const pFlags = currentOffset; // Place holder for flags
    currentOffset += KEY_FRAME_VALUE_FLAGS_BYTES;

    const {
        value,
        interpMode,
        tangentWeightMode,
        startTangent,
        startTangentWeight,
        endTangent,
        endTangentWeight,
    } = keyframeValue;

    dataView.setFloat32(currentOffset, value, true);
    currentOffset += VALUE_BYTES;

    if (interpMode !== DEFAULT_INTERP_MODE) {
        flags |= KeyframeValueFlagMask.INTERP_MODE;
        dataView.setUint8(currentOffset, interpMode);
        currentOffset += INTERP_MODE_BYTES;
    }

    if (tangentWeightMode !== DEFAULT_TANGENT_WEIGHT_MODE) {
        flags |= KeyframeValueFlagMask.TANGENT_WEIGHT_MODE;
        dataView.setUint8(currentOffset, tangentWeightMode);
        currentOffset += TANGENT_WEIGHT_MODE_BYTES;
    }

    if (startTangent !== DEFAULT_START_TANGENT) {
        flags |= KeyframeValueFlagMask.START_TANGENT;
        dataView.setFloat32(currentOffset, startTangent, true);
        currentOffset += START_TANGENT_BYTES;
    }

    if (startTangentWeight !== DEFAULT_START_TANGENT_WEIGHT) {
        flags |= KeyframeValueFlagMask.START_TANGENT_WEIGHT;
        dataView.setFloat32(currentOffset, startTangentWeight, true);
        currentOffset += START_TANGENT_WEIGHT_BYTES;
    }

    if (endTangent !== DEFAULT_END_TANGENT) {
        flags |= KeyframeValueFlagMask.END_TANGENT;
        dataView.setFloat32(currentOffset, endTangent, true);
        currentOffset += END_TANGENT_BYTES;
    }

    if (endTangentWeight !== DEFAULT_END_TANGENT_WEIGHT) {
        flags |= KeyframeValueFlagMask.END_TANGENT_WEIGHT;
        dataView.setFloat32(currentOffset, endTangentWeight, true);
        currentOffset += END_TANGENT_WEIGHT_BYTES;
    }

    dataView.setUint32(pFlags, flags, true);

    return currentOffset;
}

function loadRealKeyFrameValue (dataView: DataView, keyframeValue: RealKeyframeValue, offset: number) {
    let currentOffset = offset;

    const flags = dataView.getUint32(currentOffset, true);
    currentOffset += KEY_FRAME_VALUE_FLAGS_BYTES;

    keyframeValue.value = dataView.getFloat32(currentOffset, true);
    currentOffset += VALUE_BYTES;

    if (flags & KeyframeValueFlagMask.INTERP_MODE) {
        keyframeValue.interpMode = dataView.getUint8(currentOffset);
        currentOffset += INTERP_MODE_BYTES;
    }

    if (flags & KeyframeValueFlagMask.TANGENT_WEIGHT_MODE) {
        keyframeValue.tangentWeightMode = dataView.getUint8(currentOffset);
        currentOffset += TANGENT_WEIGHT_MODE_BYTES;
    }

    if (flags & KeyframeValueFlagMask.START_TANGENT) {
        keyframeValue.startTangent = dataView.getFloat32(currentOffset, true);
        currentOffset += START_TANGENT_BYTES;
    }

    if (flags & KeyframeValueFlagMask.START_TANGENT_WEIGHT) {
        keyframeValue.startTangentWeight = dataView.getFloat32(currentOffset, true);
        currentOffset += START_TANGENT_WEIGHT_BYTES;
    }

    if (flags & KeyframeValueFlagMask.END_TANGENT) {
        keyframeValue.endTangent = dataView.getFloat32(currentOffset, true);
        currentOffset += END_TANGENT_BYTES;
    }

    if (flags & KeyframeValueFlagMask.END_TANGENT_WEIGHT) {
        keyframeValue.endTangentWeight = dataView.getFloat32(currentOffset, true);
        currentOffset += END_TANGENT_WEIGHT_BYTES;
    }

    return currentOffset;
}

function wrapRepeat (time: number, prevTime: number, nextTime: number) {
    return prevTime + repeat(time - prevTime, nextTime - prevTime);
}

function wrapPingPong (time: number, prevTime: number, nextTime: number) {
    return prevTime + pingPong(time - prevTime, nextTime - prevTime);
}

function linearTrend (
    prevTime: number,
    prevValue: number,
    nextTime: number,
    nextValue: number,
    time: number,
) {
    const slope = (nextValue - prevValue) / (nextTime - prevTime);
    return prevValue + (time - prevTime) * slope;
}

function evalBetweenTwoKeyFrames (
    prevTime: number,
    prevValue: RealKeyframeValue,
    nextTime: number,
    nextValue: RealKeyframeValue,
    ratio: number,
) {
    const dt = nextTime - prevTime;
    switch (prevValue.interpMode) {
    default:
    case RealInterpMode.CONSTANT:
        return prevValue.value;
    case RealInterpMode.LINEAR:
        return lerp(prevValue.value, nextValue.value, ratio);
    case RealInterpMode.CUBIC: {
        const ONE_THIRD = 1.0 / 3.0;
        const {
            endTangent: prevTangent,
            endTangentWeight: prevTangentWeightSpecified,
        } = prevValue;
        const prevTangentWeightEnabled = isEndTangentWeightEnabled(prevValue.tangentWeightMode);
        const {
            startTangent: nextTangent,
            startTangentWeight: nextTangentWeightSpecified,
        } = nextValue;
        const nextTangentWeightEnabled = isStartTangentWeightEnabled(nextValue.tangentWeightMode);

        if (!prevTangentWeightEnabled && !nextTangentWeightEnabled) {
            // Optimize for the case when both x components of tangents are 1.
            // See below.
            const p1 = prevValue.value + ONE_THIRD * prevTangent * dt;
            const p2 = nextValue.value - ONE_THIRD * nextTangent * dt;
            return bezierInterp(prevValue.value, p1, p2, nextValue.value, ratio);
        } else {
            let prevTangentWeight = 0.0;
            if (prevTangentWeightEnabled) {
                prevTangentWeight = prevTangentWeightSpecified;
            } else {
                const x = dt;
                const y = dt * prevTangent;
                prevTangentWeight = Math.sqrt(x * x + y * y) * ONE_THIRD;
            }
            const angle0 = Math.atan(prevTangent);
            const tx0 = Math.cos(angle0) * prevTangentWeight + prevTime;
            const ty0 = Math.sin(angle0) * prevTangentWeight + prevValue.value;

            let nextTangentWeight = 0.0;
            if (nextTangentWeightEnabled) {
                nextTangentWeight = nextTangentWeightSpecified;
            } else {
                const x = dt;
                const y = dt * nextTangent;
                nextTangentWeight = Math.sqrt(x * x + y * y) * ONE_THIRD;
            }
            const angle1 = Math.atan(nextTangent);
            const tx1 = -Math.cos(angle1) * nextTangentWeight + nextTime;
            const ty1 = -Math.sin(angle1) * nextTangentWeight + nextValue.value;

            const dx = dt;
            // Hermite to Bezier
            const u0x = (tx0 - prevTime) / dx;
            const u1x = (tx1 - prevTime) / dx;
            const u0y = ty0;
            const u1y = ty1;
            // Converts from Bernstein Basis to Power Basis.
            // Formula: [1, 0, 0, 0; -3, 3, 0, 0; 3, -6, 3, 0; -1, 3, -3, 1] * [p_0; p_1; p_2; p_3]
            // --------------------------------------
            // | Basis | Coeff
            // | t^3   | 3 * p_1 - p_0 - 3 * p_2 + p_3
            // | t^2   | 3 * p_0 - 6 * p_1 + 3 * p_2
            // | t^1   | 3 * p_1 - 3 * p_0
            // | t^0   | p_0
            // --------------------------------------
            // where: p_0 = 0, p_1 = u0x, p_2 = u1x, p_3 = 1
            // Especially, when both tangents are 1, we will have u0x = 1/3 and u1x = 2/3
            // and then: ratio = t, eg. the ratios are
            // 1-1 corresponding to param t. That's why we can do optimization like above.
            const coeff0 = 0.0; // 0
            const coeff1 = 3.0 * u0x; // 1
            const coeff2 = 3.0 * u1x - 6.0 * u0x; // -1
            const coeff3 = 3.0 * (u0x - u1x) + 1.0; // 1
            // Solves the param t from equation X(t) = ratio.
            const solutions = [0.0, 0.0, 0.0] as [number, number, number];
            const nSolutions = solveCubic(coeff0 - ratio, coeff1, coeff2, coeff3, solutions);
            const param = getParamFromCubicSolution(solutions, nSolutions, ratio);
            // Solves Y.
            const y = bezierInterp(prevValue.value, u0y, u1y, nextValue.value, param);
            return y;
        }
    }
    }
}

function isStartTangentWeightEnabled (tangentWeightMode: TangentWeightMode) {
    return (tangentWeightMode & TangentWeightMode.START) !== 0;
}

function isEndTangentWeightEnabled (tangentWeightMode: TangentWeightMode) {
    return (tangentWeightMode & TangentWeightMode.END) !== 0;
}

function bezierInterp (p0: number, p1: number, p2: number, p3: number, t: number) {
    const u = 1 - t;
    const coeff0 = u * u * u;
    const coeff1 = 3 * u * u * t;
    const coeff2 = 3 * u * t * t;
    const coeff3 = t * t * t;
    return coeff0 * p0 + coeff1 * p1 + coeff2 * p2 + coeff3 * p3;
}

function getParamFromCubicSolution (solutions: readonly [number, number, number], solutionsCount: number, x: number) {
    let param = x;
    if (solutionsCount === 1) {
        param = solutions[0];
    } else {
        param = -Infinity;
        for (let iSolution = 0; iSolution < solutionsCount; ++iSolution) {
            const solution = solutions[iSolution];
            if (solution >= 0.0 && solution <= 1.0) {
                if (solution > param) {
                    param = solution;
                }
            }
        }
        if (param === -Infinity) {
            param = 0.0;
        }
    }
    return param;
}
