
import { ExtrapMode, RealCurve, RealInterpMode, RealKeyframeValue } from '../../cocos/core/curves/curve';
import { KeySharedQuaternionCurves, KeySharedRealCurves } from '../../cocos/core/curves/keys-shared-curves';
import { QuaternionCurve, QuaternionInterpMode, QuaternionKeyframeValue } from '../../cocos/core/curves/quat-curve';
import { Quat } from '../../cocos/core/math';

describe('Keys shared real curves', () => {
    test('Enabling', () => {
        {
            const curve = new RealCurve();
            curve.assignSorted([[0.1, new RealKeyframeValue({
                value: 0.1,
            })]]);
            expect(KeySharedRealCurves.allowedForCurve(curve)).toBe(true);
        }

        {
            const curve = new RealCurve();
            curve.assignSorted([[0.1, new RealKeyframeValue({
                value: 0.1,
            })]]);
            curve.postExtrap = ExtrapMode.REPEAT;
            expect(KeySharedRealCurves.allowedForCurve(curve)).toBe(false);
        }

        {
            const curve = new RealCurve();
            curve.assignSorted([[0.1, new RealKeyframeValue({
                value: 0.1,
            })]]);
            curve.preExtrap = ExtrapMode.REPEAT;
            expect(KeySharedRealCurves.allowedForCurve(curve)).toBe(false);
        }

        {
            const curve = new RealCurve();
            curve.assignSorted([[0.1, new RealKeyframeValue({
                value: 0.1,
                interpMode: RealInterpMode.CUBIC,
            })]]);
            expect(KeySharedRealCurves.allowedForCurve(curve)).toBe(false);
        }
    });

    test('Composite', () => {
        const curves1 = new KeySharedRealCurves([0.1, 0.7, 0.8]);

        const curveMatched = new RealCurve();
        curveMatched.assignSorted([0.1, 0.7, 0.8], Array.from({ length: 3 }, () => new RealKeyframeValue({ value: 0.1 })));
        expect(curves1.matchCurve(curveMatched)).toBe(true);

        const curveNonMatched = new RealCurve();
        curveNonMatched.assignSorted([0.1, 0.3, 0.8], Array.from({ length: 3 }, () => new RealKeyframeValue({ value: 0.1 })));
        expect(curves1.matchCurve(curveNonMatched)).toBe(false);
    });

    test('Composite (may be baked)', () => {
        const curves1 = new KeySharedRealCurves([0.1, 0.2, 0.3]);

        const curveMatched = new RealCurve();
        curveMatched.assignSorted([0.1, 0.2, 0.3], Array.from({ length: 3 }, () => new RealKeyframeValue({ value: 0.1 })));
        expect(curves1.matchCurve(curveMatched)).toBe(true);

        const curveNonMatched = new RealCurve();
        curveNonMatched.assignSorted([0.2, 0.3, 0.4], Array.from({ length: 3 }, () => new RealKeyframeValue({ value: 0.1 })));
        expect(curves1.matchCurve(curveNonMatched)).toBe(false);
    });

    test('Evaluate', () => {
        const curve = new RealCurve();
        curve.assignSorted([0.1, 0.7, 0.8], Array.from({ length: 3 }, (_, index) => new RealKeyframeValue({ value: index + 1 })));

        const curves = new KeySharedRealCurves(Array.from(curve.times()));
        curves.addCurve(curve);
        const values = [0.0];
        const resetAndEval = (time: number) => {
            values[0] = NaN;
            curves.evaluate(time, values);
        };

        resetAndEval(0.0);
        expect(values[0]).toBeCloseTo(1.0);

        resetAndEval(0.81);
        expect(values[0]).toBeCloseTo(3.0);

        resetAndEval(0.7);
        expect(values[0]).toBeCloseTo(2.0);

        resetAndEval(0.73);
        expect(values[0]).toBeCloseTo(2.3);
    });

    test('Evaluate optimized keys', () => {
        const curve = new RealCurve();
        curve.assignSorted([0.1, 0.2, 0.3], Array.from({ length: 3 }, (_, index) => new RealKeyframeValue({ value: index + 1 })));

        const curves = new KeySharedRealCurves(Array.from(curve.times()));
        curves.addCurve(curve);
        const values = [0.0];
        const resetAndEval = (time: number) => {
            values[0] = NaN;
            curves.evaluate(time, values);
        };

        resetAndEval(0.0);
        expect(values[0]).toBeCloseTo(1.0);

        resetAndEval(0.31);
        expect(values[0]).toBeCloseTo(3.0);

        resetAndEval(0.2);
        expect(values[0]).toBeCloseTo(2.0);

        resetAndEval(0.25);
        expect(values[0]).toBeCloseTo(2.5);
    });
});

describe('Keys shared quaternion curves', () => {
    test('Enabling', () => {
        {
            const curve = new QuaternionCurve();
            curve.assignSorted([[0.1, new QuaternionKeyframeValue({
                interpMode: QuaternionInterpMode.SLERP,
                value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 },
            })]]);
            expect(KeySharedQuaternionCurves.allowedForCurve(curve)).toBe(true);
        }

        {
            const curve = new QuaternionCurve();
            curve.assignSorted([[0.1, new QuaternionKeyframeValue({
                value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 },
            })]]);
            curve.postExtrap = ExtrapMode.REPEAT;
            expect(KeySharedQuaternionCurves.allowedForCurve(curve)).toBe(false);
        }

        {
            const curve = new QuaternionCurve();
            curve.assignSorted([[0.1, new QuaternionKeyframeValue({
                value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 },
            })]]);
            curve.preExtrap = ExtrapMode.REPEAT;
            expect(KeySharedQuaternionCurves.allowedForCurve(curve)).toBe(false);
        }

        {
            const curve = new QuaternionCurve();
            curve.assignSorted([[0.1, new QuaternionKeyframeValue({
                value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 },
                interpMode: QuaternionInterpMode.CONSTANT,
            })]]);
            expect(KeySharedQuaternionCurves.allowedForCurve(curve)).toBe(false);
        }
    });

    test('Composite', () => {
        const curves1 = new KeySharedQuaternionCurves([0.1, 0.7, 0.8]);

        const curveMatched = new QuaternionCurve();
        curveMatched.assignSorted([0.1, 0.7, 0.8], Array.from({ length: 3 }, () =>
            new QuaternionKeyframeValue({ value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 } })));
        expect(curves1.matchCurve(curveMatched)).toBe(true);

        const curveNonMatched = new QuaternionCurve();
        curveNonMatched.assignSorted([0.1, 0.3, 0.8], Array.from({ length: 3 }, () =>
            new QuaternionKeyframeValue({ value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 } })));
        expect(curves1.matchCurve(curveNonMatched)).toBe(false);
    });

    test('Composite (may be baked)', () => {
        const curves1 = new KeySharedQuaternionCurves([0.1, 0.2, 0.3]);

        const curveMatched = new QuaternionCurve();
        curveMatched.assignSorted([0.1, 0.2, 0.3], Array.from({ length: 3 }, () =>
            new QuaternionKeyframeValue({ value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 } })));
        expect(curves1.matchCurve(curveMatched)).toBe(true);

        const curveNonMatched = new QuaternionCurve();
        curveNonMatched.assignSorted([0.2, 0.3, 0.4], Array.from({ length: 3 }, () =>
            new QuaternionKeyframeValue({ value: { x: -0.542, y: -0.688, z: 0.199, w: -0.439 } })));
        expect(curves1.matchCurve(curveNonMatched)).toBe(false);
    });

    const quaternions = [
        new Quat(-0.542, -0.688 -0.439, 0.199),
        new Quat(-0.403, 0.723, -0.545, -0.135),
        new Quat(0.658, 0.422, 0.455, 0.427),
    ];

    test('Evaluate', () => {
        const curve = new QuaternionCurve();
        curve.assignSorted([0.1, 0.7, 0.8], Array.from({ length: 3 }, (_, index) =>
            new QuaternionKeyframeValue({ value: Quat.clone(quaternions[index]) })));

        const curves = new KeySharedQuaternionCurves(Array.from(curve.times()));
        curves.addCurve(curve);
        const values = [new Quat()];
        const resetAndEval = (time: number) => {
            Quat.set(values[0], NaN, NaN, NaN, NaN);
            curves.evaluate(time, values);
        };

        resetAndEval(0.0);
        expect(Quat.equals(values[0], quaternions[0])).toBe(true);

        resetAndEval(0.81);
        expect(Quat.equals(values[0], quaternions[2])).toBe(true);

        resetAndEval(0.7);
        expect(Quat.equals(values[0], quaternions[1])).toBe(true);

        resetAndEval(0.73);
        expect(Quat.equals(values[0], Quat.slerp(new Quat(), quaternions[1], quaternions[2], 0.3))).toBe(true);
    });

    test('Evaluate optimized keys', () => {
        const curve = new QuaternionCurve();
        curve.assignSorted([0.1, 0.2, 0.3], Array.from({ length: 3 }, (_, index) =>
            new QuaternionKeyframeValue({ value: Quat.clone(quaternions[index]) })));

        const curves = new KeySharedQuaternionCurves(Array.from(curve.times()));
        curves.addCurve(curve);
        const values = [new Quat()];
        const resetAndEval = (time: number) => {
            Quat.set(values[0], NaN, NaN, NaN, NaN);
            curves.evaluate(time, values);
        };

        resetAndEval(0.0);
        expect(Quat.equals(values[0], quaternions[0])).toBe(true);

        resetAndEval(0.31);
        expect(Quat.equals(values[0], quaternions[2])).toBe(true);

        resetAndEval(0.2);
        expect(Quat.equals(values[0], quaternions[1])).toBe(true);

        resetAndEval(0.25);
        expect(Quat.equals(values[0], Quat.slerp(new Quat(), quaternions[1], quaternions[2], 0.5))).toBe(true);
    });
});