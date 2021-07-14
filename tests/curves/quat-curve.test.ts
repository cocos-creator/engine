
import { Quat, QuaternionCurve, QuaternionInterpMode, QuaternionKeyframeValue } from '../../cocos/core';
import { deserializeSymbol, serializeSymbol } from '../../cocos/core/data/serialization-symbols';

describe('Curve', () => {
    test('Evaluate an empty curve', () => {
        const curve = new QuaternionCurve();
        expect(curve.evaluate(12.34)).toStrictEqual(Quat.IDENTITY);
    });

    describe('serialization', () => {
        test('Normal', () => {
            const curve = new QuaternionCurve();
            curve.assignSorted([0.1, 0.2, 0.3], [
                new QuaternionKeyframeValue({ value: { x: 0.1, y: 0.2, z: 0.3, w: 0.4 }, interpMode: QuaternionInterpMode.CONSTANT }),
                new QuaternionKeyframeValue({ value: { x: 0.5, y: -0.6, z: 0.7, w: 0.8 }, interpMode: QuaternionInterpMode.SLERP }),
                new QuaternionKeyframeValue({ value: { x: 0.9, y: 0.1, z: 0.11, w: 0.12 }, interpMode: QuaternionInterpMode.CONSTANT }),
            ]);
            compareCurves(serializeAndDeserialize(curve), curve);
        });

        test('Optimized for linear curve', () => {
            const curve = new QuaternionCurve();
            curve.assignSorted([0.1, 0.2], [
                new QuaternionKeyframeValue({ value: { x: 0.1, y: 0.2, z: 0.3, w: 0.4 }, interpMode: QuaternionInterpMode.SLERP }),
                new QuaternionKeyframeValue({ value: { x: 0.5, y: -0.6, z: 0.7, w: 0.8 }, interpMode: QuaternionInterpMode.SLERP }),
            ]);
            compareCurves(serializeAndDeserialize(curve), curve);
        });

        test('Optimized for constant curve', () => {
            const curve = new QuaternionCurve();
            curve.assignSorted([0.1, 0.2], [
                new QuaternionKeyframeValue({ value: { x: 0.1, y: 0.2, z: 0.3, w: 0.4 }, interpMode: QuaternionInterpMode.CONSTANT }),
                new QuaternionKeyframeValue({ value: { x: 0.5, y: -0.6, z: 0.7, w: 0.8 }, interpMode: QuaternionInterpMode.CONSTANT }),
            ]);
            compareCurves(serializeAndDeserialize(curve), curve);
        });
    });

    test('Default keyframe value', () => {
        const keyframeValue = new QuaternionKeyframeValue({});
        expect(Quat.equals(keyframeValue.value, Quat.IDENTITY)).toBe(true);
        expect(keyframeValue.interpMode).toBe(QuaternionInterpMode.SLERP);
    });
});

function serializeAndDeserialize (curve: QuaternionCurve) {
    const serialized = curve[serializeSymbol]();
    const newCurve = new QuaternionCurve();
    newCurve[deserializeSymbol](serialized);
    return newCurve;
}

function compareCurves (left: QuaternionCurve, right: QuaternionCurve, numDigits = 2) {
    expect(left.keyFramesCount).toBe(right.keyFramesCount);
    for (let iKeyframe = 0; iKeyframe < left.keyFramesCount; ++iKeyframe) {
        expect(left.getKeyframeTime(iKeyframe)).toBeCloseTo(right.getKeyframeTime(iKeyframe), numDigits);
        const leftKeyframeValue = left.getKeyframeValue(iKeyframe);
        const rightKeyframeValue = right.getKeyframeValue(iKeyframe);
        expect(leftKeyframeValue.value.x).toBeCloseTo(rightKeyframeValue.value.x, numDigits);
        expect(leftKeyframeValue.value.y).toBeCloseTo(rightKeyframeValue.value.y, numDigits);
        expect(leftKeyframeValue.value.z).toBeCloseTo(rightKeyframeValue.value.z, numDigits);
        expect(leftKeyframeValue.value.w).toBeCloseTo(rightKeyframeValue.value.w, numDigits);
        expect(leftKeyframeValue.interpMode).toStrictEqual(rightKeyframeValue.interpMode);
    }
}