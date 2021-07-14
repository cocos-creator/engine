import { binarySearchEpsilon } from '../algorithm/binary-search';
import { ccclass, serializable } from '../data/decorators';
import { assertIsTrue } from '../data/utils/asserts';
import { approx } from '../math';
import type { CurveBase } from './curve-base';

type KeyFrame<TKeyframeValue> = [number, TKeyframeValue];

/**
 * Curve.
 */
@ccclass('cc.KeyframeCurve')
export class KeyframeCurve<TKeyframeValue> implements CurveBase, Iterable<KeyFrame<TKeyframeValue>> {
    /**
     * Gets the count of keyframes.
     */
    get keyFramesCount () {
        return this._times.length;
    }

    /**
     * Indicates if this curve has no any key frame.
     */
    get empty () {
        return this._times.length === 0;
    }

    /**
     * Gets the minimal time.
     */
    get rangeMin () {
        return this._times[0];
    }

    /**
     * Gets the maximum time.
     */
    get rangeMax () {
        return this._times[this._values.length - 1];
    }

    /**
     * Returns an iterator to keyframe pairs.
     */
    [Symbol.iterator] () {
        let index = 0;
        return {
            next: (): IteratorResult<KeyFrame<TKeyframeValue>> => {
                if (index >= this._times.length) {
                    return {
                        done: true,
                        value: undefined,
                    };
                } else {
                    const value: KeyFrame<TKeyframeValue> = [this._times[index], this._values[index]];
                    ++index;
                    return {
                        done: false,
                        value,
                    };
                }
            },
        };
    }

    /**
     * Returns an iterator to keyframe pairs.
     */
    public keyframes (): Iterable<KeyFrame<TKeyframeValue>> {
        return this;
    }

    public times (): Iterable<number> {
        return this._times;
    }

    public values (): Iterable<TKeyframeValue> {
        return this._values;
    }

    /**
     * Gets the time of specified keyframe.
     * @param index Index to the keyframe.
     * @returns The keyframe 's time.
     */
    public getKeyframeTime (index: number): number {
        return this._times[index];
    }

    /**
     * Gets the value of specified keyframe.
     * @param index Index to the keyframe.
     * @returns The keyframe 's value.
     */
    public getKeyframeValue (index: number): TKeyframeValue {
        return this._values[index];
    }

    /**
     * Adds a keyframe into this curve.
     * @param time Time of the keyframe.
     * @param value Value of the keyframe.
     * @returns The index to the new keyframe.
     */
    public addKeyFrame (time: number, keyframeValue: TKeyframeValue): number {
        return this._insertNewKeyframe(time, keyframeValue);
    }

    /**
     * Removes a keyframe from this curve.
     * @param index Index to the keyframe.
     */
    public removeKeyframe (index: number) {
        this._times.splice(index, 1);
        this._values.splice(index, 1);
    }

    /**
     * Searches for the keyframe at specified time.
     * @param time Time to search.
     * @returns Index to the keyframe or negative number if not found.
     */
    public indexOfKeyframe (time: number) {
        return binarySearchEpsilon(this._times, time);
    }

    /**
     * Updates the time of a keyframe.
     * @param index Index to the keyframe.
     * @param time New time.
     */
    public updateTime (index: number, time: number) {
        const value = this._values[index];
        this.removeKeyframe(index);
        this._insertNewKeyframe(time, value);
    }

    /**
     * Assigns all keyframes.
     * @param keyframes An iterable to keyframes. The keyframes should be sorted by their time.
     */
    public assignSorted (keyframes: Iterable<[number, TKeyframeValue]>): void;

    /**
     * Assigns all keyframes.
     * @param times Times array. Should be sorted.
     * @param values Values array. Corresponding to each time in `times`.
     */
    public assignSorted (times: readonly number[], values: TKeyframeValue[]): void;

    public assignSorted (times: Iterable<[number, TKeyframeValue]> | readonly number[], values?: readonly TKeyframeValue[]) {
        if (values !== undefined) {
            assertIsTrue(Array.isArray(times));
            assertIsTrue(times.length === values.length);
            this._times = times.slice();
            this._values = values.map((value) => value);
        } else {
            const keyframes = Array.from(times as Iterable<[number, TKeyframeValue]>);
            this._times = keyframes.map(([time]) => time);
            this._values = keyframes.map(([, value]) => value);
        }

        assertIsTrue(isSorted(this._times));
    }

    /**
     * Removes all key frames.
     */
    public clear () {
        this._times.length = 0;
        this._values.length = 0;
    }

    protected searchKeyframe (time: number) {
        return binarySearchEpsilon(this._times, time);
    }

    private _insertNewKeyframe (time: number, value: TKeyframeValue) {
        const times = this._times;
        const values = this._values;
        const nFrames = times.length;

        const index = binarySearchEpsilon(times, time);
        if (index >= 0) {
            return index;
        }
        const iNext = ~index;
        if (iNext === 0) {
            times.unshift(time);
            values.unshift(value);
        } else if (iNext === nFrames) {
            times.push(time);
            values.push(value);
        } else {
            assertIsTrue(nFrames > 1);
            times.splice(iNext - 1, 0, time);
            values.splice(iNext - 1, 0, value);
        }
        return iNext;
    }

    // Times are always sorted and 1-1 correspond to values.
    @serializable
    protected _times: number[] = [];

    @serializable
    protected _values: TKeyframeValue[] = [];
}

function isSorted (values: number[]) {
    return values.every(
        (value, index, array) => index === 0
            || value > array[index - 1] || approx(value, array[index - 1], 1e-6),
    );
}
