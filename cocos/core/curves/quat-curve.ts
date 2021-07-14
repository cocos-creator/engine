import { assertIsTrue } from '../data/utils/asserts';
import { IQuatLike, pingPong, Quat, repeat } from '../math';
import { KeyframeCurve } from './keyframe-curve';
import { ExtrapMode } from './curve';
import { binarySearchEpsilon } from '../algorithm/binary-search';
import { ccclass, serializable, uniquelyReferenced } from '../data/decorators';
import { deserializeSymbol, serializeSymbol } from '../data/serialization-symbols';

@ccclass('cc.QuaternionKeyframeValue')
@uniquelyReferenced
export class QuaternionKeyframeValue {
    /**
     * Interpolation method used for this keyframe.
     */
    @serializable
    public interpMode: QuaternionInterpMode = QuaternionInterpMode.SLERP;

    /**
      * Value of the keyframe.
      */
    @serializable
    public value: IQuatLike = Quat.clone(Quat.IDENTITY);

    constructor ({
        value,
        interpMode,
    }:  Partial<QuaternionKeyframeValue> = {}) {
        // TODO: shall we normalize it?
        this.value = value ? Quat.clone(value) : this.value;
        this.interpMode = interpMode ?? this.interpMode;
    }
}

/**
 * The method used for interpolation between values of a keyframe and its next keyframe.
 */
export enum QuaternionInterpMode {
    /**
     * Perform spherical linear interpolation.
     */
    SLERP,

    /**
     * Always use the value from this keyframe.
     */
    CONSTANT,

    // #region TODO: Spherical Quadrangle Interpolation
    /**
     * TODO: Spherical Quadrangle Interpolation
     * - https://theory.org/software/qfa/writeup/node12.html
     * - http://digitalrune.github.io/DigitalRune-Documentation/html/58f74cca-83a3-5e9e-6d5d-63b09a723f90.htm
     */
    // SQUAD,
    // #endregion
}

/**
 * Quaternion curve.
 */
@ccclass('cc.QuaternionCurve')
export class QuaternionCurve extends KeyframeCurve<QuaternionKeyframeValue> {
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
    public evaluate (time: number, quat?: Quat): Quat {
        quat ??= new Quat();

        const {
            _times: times,
            _values: values,
            _postExtrap: postExtrap,
            _preExtrap: preExtrap,
        } = this;
        const nFrames = times.length;

        if (nFrames === 0) {
            return quat;
        }

        const firstTime = times[0];
        const lastTime = times[nFrames - 1];
        if (time < firstTime) {
            // Underflow
            const preValue = values[0];
            switch (preExtrap) {
            case ExtrapMode.REPEAT:
                time = firstTime + repeat(time - firstTime, lastTime - firstTime);
                break;
            case ExtrapMode.PING_PONG:
                time = firstTime + pingPong(time - firstTime, lastTime - firstTime);
                break;
            case ExtrapMode.CLAMP:
            default:
                return Quat.copy(quat, preValue.value);
            }
        } else if (time > lastTime) {
            // Overflow
            const preValue = values[nFrames - 1];
            switch (postExtrap) {
            case ExtrapMode.REPEAT:
                time = firstTime + repeat(time - firstTime, lastTime - firstTime);
                break;
            case ExtrapMode.PING_PONG:
                time = firstTime + pingPong(time - firstTime, lastTime - firstTime);
                break;
            case ExtrapMode.CLAMP:
            default:
                return Quat.copy(quat, preValue.value);
            }
        }

        const index = binarySearchEpsilon(times, time);
        if (index >= 0) {
            return Quat.copy(quat, values[index].value);
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
        switch (preValue.interpMode) {
        default:
        case QuaternionInterpMode.CONSTANT:
            return Quat.copy(quat, preValue.value);
        case QuaternionInterpMode.SLERP:
            return Quat.slerp(quat, preValue.value, nextValue.value, ratio);
        }
    }

    /**
     * Adds a keyframe into this curve.
     * @param time Time of the keyframe.
     * @param value Value of the keyframe.
     * @returns The index to the new keyframe.
     */
    public addKeyFrame (time: number, value: IQuatLike | QuaternionKeyframeValue): number {
        const keyframeValue = value instanceof QuaternionKeyframeValue
            ? value : new QuaternionKeyframeValue({ value });
        return super.addKeyFrame(time, keyframeValue);
    }

    public [serializeSymbol] () {
        const {
            _times: times,
            _values: keyframeValues,
        } = this;

        let interpModeRepeated = true;
        keyframeValues.forEach((keyframeValue, _index, [firstKeyframeValue]) => {
            // Values are unlikely to be unified.
            if (interpModeRepeated
                && keyframeValue.interpMode !== firstKeyframeValue.interpMode) { interpModeRepeated = false; }
        });

        const nKeyframes = times.length;

        const nFrames = nKeyframes;
        const interpModesSize = INTERP_MODE_BYTES * (interpModeRepeated ? 1 : nFrames);

        let dataSize = 0;
        dataSize += (
            FLAGS_BYTES
            + FRAME_COUNT_BYTES
            + TIME_BYTES * nFrames
            + VALUE_BYTES * 4 * nFrames
            + interpModesSize
            + 0
        );

        const dataView = new DataView(new ArrayBuffer(dataSize));
        let P = 0;

        // Flags
        let flags = 0;
        if (interpModeRepeated) { flags |= KeyframeValueFlagMask.INTERP_MODE; }
        dataView.setUint32(P, flags, true); P += FLAGS_BYTES;

        // Frame count
        dataView.setUint32(P, nFrames, true); P += FRAME_COUNT_BYTES;

        // Times
        times.forEach((time, index) => dataView.setFloat32(P + TIME_BYTES * index, time, true));
        P += TIME_BYTES * nFrames;

        keyframeValues.forEach(({ value: { x, y, z, w } }, index) => {
            const pQuat = P + VALUE_BYTES * 4 * index;
            dataView.setFloat32(pQuat + VALUE_BYTES * 0, x, true);
            dataView.setFloat32(pQuat + VALUE_BYTES * 1, y, true);
            dataView.setFloat32(pQuat + VALUE_BYTES * 2, z, true);
            dataView.setFloat32(pQuat + VALUE_BYTES * 3, w, true);
        });
        P += VALUE_BYTES * 4 * nFrames;

        // Frame values
        const INTERP_MODES_START = P; P += interpModesSize;
        let pInterpMode = INTERP_MODES_START;
        keyframeValues.forEach(({ interpMode }) => {
            dataView.setUint8(pInterpMode, interpMode);

            if (!interpModeRepeated) { pInterpMode += INTERP_MODE_BYTES; }
        });

        return new Uint8Array(dataView.buffer);
    }

    public [deserializeSymbol] (serialized: ReturnType<QuaternionCurve[typeof serializeSymbol]>) {
        const dataView = new DataView(serialized.buffer, serialized.byteOffset, serialized.byteLength);
        let P = 0;

        // Flags
        const flags = dataView.getUint32(P, true); P += FLAGS_BYTES;
        const interpModeRepeated = flags & KeyframeValueFlagMask.INTERP_MODE;

        // Frame count
        const nFrames = dataView.getUint32(P, true); P += FRAME_COUNT_BYTES;

        // Times
        const times = Array.from({ length: nFrames },
            (_, index) => dataView.getFloat32(P + TIME_BYTES * index, true));
        P += TIME_BYTES * nFrames;

        // Frame values
        const P_VALUES = P; P += VALUE_BYTES * 4 * nFrames;
        let pInterpModes = P;
        const keyframeValues = Array.from({ length: nFrames },
            (_, index) => {
                const pQuat = P_VALUES + VALUE_BYTES * 4 * index;
                const x = dataView.getFloat32(pQuat + VALUE_BYTES * 0, true);
                const y = dataView.getFloat32(pQuat + VALUE_BYTES * 1, true);
                const z = dataView.getFloat32(pQuat + VALUE_BYTES * 2, true);
                const w = dataView.getFloat32(pQuat + VALUE_BYTES * 3, true);
                const keyframeValue = new QuaternionKeyframeValue({
                    value: { x, y, z, w },
                    interpMode: dataView.getUint8(pInterpModes),
                });
                if (!interpModeRepeated) {
                    pInterpModes += INTERP_MODE_BYTES;
                }
                return keyframeValue;
            });

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
    INTERP_MODE = 1 << 0,
}

const FLAGS_BYTES = 1;
const FRAME_COUNT_BYTES = 4;
const TIME_BYTES = 4;
const VALUE_BYTES = 4;
const INTERP_MODE_BYTES = 1;
