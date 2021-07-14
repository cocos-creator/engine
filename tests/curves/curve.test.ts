import { toRadian } from '../../cocos/core';
import { RealCurve, RealInterpMode } from '../../cocos/core/curves';
import { RealKeyframeValue } from '../../cocos/core/curves/curve';
import { ExtrapMode, TangentWeightMode } from '../../cocos/core/curves/real-curve-param';
import { deserializeSymbol, serializeSymbol } from '../../cocos/core/data/serialization-symbols';

describe('Curve', () => {
    test('assign sorted', () => {
        const curve = new RealCurve();
        curve.assignSorted([0.1, 0.2, 0.3], [
            realKeyframeWithoutTangent(0.4),
            realKeyframeWithoutTangent(0.5),
            realKeyframeWithoutTangent(0.6),
        ]);

        // Assign empty(keys, values)
        curve.assignSorted([], []);
        expect(curve.keyFramesCount).toBe(0);

        // Assign empty(frames)
        curve.assignSorted([]);
        expect(curve.keyFramesCount).toBe(0);

        // The count of keys and values should be same, if not, the behavior is undefined.
        // In test mode, assertion error would be thrown.
        expect(() => curve.assignSorted([0.1, 0.2], [])).toThrow();

        // Keys should be sorted, if not, the behavior is undefined.
        // In test mode, assertion error would be thrown.
        expect(() => curve.assignSorted(
            [0.2, 0.1],
            [realKeyframeWithoutTangent(0.4), realKeyframeWithoutTangent(0.5)],
        )).toThrow();
        expect(() => curve.assignSorted([
            [0.2, realKeyframeWithoutTangent(0.4)],
            [0.1, realKeyframeWithoutTangent(0.5)],
        ])).toThrow();
    });

    describe('serialization', () => {
        test('Normal', () => {
            const curve = new RealCurve();
            curve.assignSorted([0.1, 0.2, 0.3], [
                new RealKeyframeValue({ value: 0.4, startTangent: 0.0, endTangent: 0.0, interpMode: RealInterpMode.CONSTANT }),
                new RealKeyframeValue({ value: 0.5, startTangent: 0.0, endTangent: 0.0, interpMode: RealInterpMode.LINEAR }),
                new RealKeyframeValue({
                    value: 0.6,
                    startTangent: 0.487,
                    startTangentWeight: 0.2,
                    endTangent: 0.4598,
                    endTangentWeight: 0.32,
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.BOTH,
                }),
            ]);
            compareCurves(serializeAndDeserialize(curve), curve);
        });

        test('Optimized for linear curve', () => {
            const curve = new RealCurve();
            curve.assignSorted([0.1, 0.2, 0.3], [
                realKeyframeWithoutTangent(0.4),
                realKeyframeWithoutTangent(0.5),
                realKeyframeWithoutTangent(0.6),
            ]);
            compareCurves(serializeAndDeserialize(curve), curve);
        });

        test('Optimized for constant curve', () => {
            const curve = new RealCurve();
            curve.assignSorted([0.1, 0.2, 0.3], [
                realKeyframeWithoutTangent(0.4, RealInterpMode.CONSTANT),
                realKeyframeWithoutTangent(0.5, RealInterpMode.CONSTANT),
                realKeyframeWithoutTangent(0.6, RealInterpMode.CONSTANT),
            ]);
            compareCurves(serializeAndDeserialize(curve), curve);
        });
    });

    test('Default keyframe value', () => {
        const keyframeValue = new RealKeyframeValue({});
        expect(keyframeValue.value).toBe(0.0);
        expect(keyframeValue.interpMode).toBe(RealInterpMode.LINEAR);
        expect(keyframeValue.startTangent).toBe(0.0);
        expect(keyframeValue.startTangentWeight).toBe(0.0);
        expect(keyframeValue.endTangent).toBe(0.0);
        expect(keyframeValue.endTangentWeight).toBe(0.0);
    });

    describe('Evaluation', () => {
        test('Empty curve', () => {
            const curve = new RealCurve();
            expect(curve.evaluate(12.34)).toBe(0.0);
        });

        test('Interpolation mode: constant', () => {
            const curve = new RealCurve();
            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 0.7, interpMode: RealInterpMode.CONSTANT, })],
                [0.4, new RealKeyframeValue({ value: 0.8, interpMode: RealInterpMode.LINEAR, })],
            ]);
            expect(curve.evaluate(0.28)).toBe(0.7);
        });

        test('Interpolation mode: linear', () => {
            const curve = new RealCurve();
            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 0.7, interpMode: RealInterpMode.LINEAR, })],
                [0.4, new RealKeyframeValue({ value: 0.8, interpMode: RealInterpMode.CONSTANT, })],
            ]);
            expect(curve.evaluate(0.28)).toBeCloseTo(0.74);
        });

        test('Interpolation mode: cubic; Both weights are unused', () => {
            const curve = new RealCurve();
            curve.assignSorted([
                [0.2, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.NONE,
                    value: 0.7,
                    endTangent: Math.tan(toRadian(30.0)),
                })],
                [0.4, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.NONE,
                    value: 0.8,
                    startTangent: Math.tan(toRadian(30.0)),
                })],
            ]);
            expect(curve.evaluate(0.28)).toBeCloseTo(0.740742562, 5);
        });

        test('Interpolation mode: cubic; Start weight is used', () => {
            const curve = new RealCurve();
            curve.assignSorted([
                [0.2, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.END,
                    value: 0.7,
                    endTangent: Math.tan(toRadian(30.0)),
                })],
                [0.4, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.NONE,
                    value: 0.8,
                    startTangent: Math.tan(toRadian(30.0)),
                })],
            ]);
            expect(curve.evaluate(0.28)).toBeCloseTo(0.737992646, 5);
        });

        test('Interpolation mode: cubic; End weight is used', () => {
            const curve = new RealCurve();
            curve.assignSorted([
                [0.2, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.NONE,
                    value: 0.7,
                    endTangent: Math.tan(toRadian(30.0)),
                })],
                [0.4, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.START,
                    value: 0.8,
                    startTangent: Math.tan(toRadian(30.0)),
                })],
            ]);
            expect(curve.evaluate(0.28)).toBeCloseTo(0.7422913, 5);
        });

        test('Extrap mode: clamp', () => {
            const curve = new RealCurve();
            curve.preExtrap = ExtrapMode.CLAMP;
            curve.postExtrap = ExtrapMode.CLAMP;

            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 5.0 })],
            ]);
            // Fall back to clamp
            expect(curve.evaluate(0.05)).toBeCloseTo(5.0);
            expect(curve.evaluate(0.46)).toBeCloseTo(5.0);
        });

        test('Extrap mode: linear', () => {
            const curve = new RealCurve();
            curve.preExtrap = ExtrapMode.LINEAR;
            curve.postExtrap = ExtrapMode.LINEAR;

            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 5.0 })],
                [0.3, new RealKeyframeValue({ value: 3.14 })],
            ]);
            expect(curve.evaluate(0.05)).toBeCloseTo(7.79);
            expect(curve.evaluate(-102.4)).toBeCloseTo(1913.36);
            expect(curve.evaluate(0.46)).toBeCloseTo(0.164);

            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 5.0 })],
            ]);
            // Fall back to clamp
            expect(curve.evaluate(0.05)).toBeCloseTo(5.0);
            expect(curve.evaluate(0.46)).toBeCloseTo(5.0);
        });

        test('Extrap mode: repeat', () => {
            const curve = new RealCurve();
            curve.preExtrap = ExtrapMode.REPEAT;
            curve.postExtrap = ExtrapMode.REPEAT;

            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 5.0 })],
                [0.36, new RealKeyframeValue({ value: 3.14 })],
            ]);
            expect(curve.evaluate(-2.7)).toBeCloseTo(curve.evaluate(0.34));
            expect(curve.evaluate(4.6)).toBeCloseTo(curve.evaluate(0.28));

            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 5.0 })],
            ]);
            // Fall back to clamp
            expect(curve.evaluate(0.05)).toBeCloseTo(5.0);
            expect(curve.evaluate(0.46)).toBeCloseTo(5.0);
        });

        test('Extrap mode: ping-pong', () => {
            const curve = new RealCurve();
            curve.preExtrap = ExtrapMode.PING_PONG;
            curve.postExtrap = ExtrapMode.PING_PONG;

            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 5.0 })],
                [0.36, new RealKeyframeValue({ value: 3.14 })],
            ]);
            expect(curve.evaluate(-2.7)).toBeCloseTo(curve.evaluate(0.22));
            expect(curve.evaluate(4.6)).toBeCloseTo(curve.evaluate(0.28));
            expect(curve.evaluate(4.77)).toBeCloseTo(curve.evaluate(0.29));

            curve.assignSorted([
                [0.2, new RealKeyframeValue({ value: 5.0 })],
            ]);
            // Fall back to clamp
            expect(curve.evaluate(0.05)).toBeCloseTo(5.0);
            expect(curve.evaluate(0.46)).toBeCloseTo(5.0);
        });
    });
});

function realKeyframeWithoutTangent (value: number, interpMode: RealInterpMode = RealInterpMode.LINEAR): RealKeyframeValue {
    return new RealKeyframeValue({
        value,
        interpMode,
    });
}

function serializeAndDeserialize (curve: RealCurve) {
    const serialized = curve[serializeSymbol]();
    const newCurve = new RealCurve();
    newCurve[deserializeSymbol](serialized);
    return newCurve;
}

function compareCurves (left: RealCurve, right: RealCurve, numDigits = 2) {
    expect(left.keyFramesCount).toBe(right.keyFramesCount);
    for (let iKeyframe = 0; iKeyframe < left.keyFramesCount; ++iKeyframe) {
        expect(left.getKeyframeTime(iKeyframe)).toBeCloseTo(right.getKeyframeTime(iKeyframe), numDigits);
        const leftKeyframeValue = left.getKeyframeValue(iKeyframe);
        const rightKeyframeValue = right.getKeyframeValue(iKeyframe);
        expect(leftKeyframeValue.value).toBeCloseTo(rightKeyframeValue.value, numDigits);
        expect(leftKeyframeValue.startTangent).toBeCloseTo(rightKeyframeValue.startTangent, numDigits);
        expect(leftKeyframeValue.startTangentWeight).toBeCloseTo(rightKeyframeValue.startTangentWeight, numDigits);
        expect(leftKeyframeValue.endTangent).toBeCloseTo(rightKeyframeValue.endTangent, numDigits);
        expect(leftKeyframeValue.endTangentWeight).toBeCloseTo(rightKeyframeValue.endTangentWeight, numDigits);
        expect(leftKeyframeValue.interpMode).toStrictEqual(rightKeyframeValue.interpMode);
    }
}