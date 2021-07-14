import { WrapModeMask } from '../../../cocos/core/animation/types';
import { ExtrapMode, RealCurve, RealInterpMode, RealKeyframeValue, TangentWeightMode } from '../../../cocos/core/curves';
import { AnimationCurve, Keyframe } from '../../../cocos/core/geometry/curve';

describe('geometry.AnimationCurve', () => {
    describe('Constructor', () => {
        test('new AnimationCurve()', () => {
            const curve = new AnimationCurve();
            expect(curve.keyFrames).toStrictEqual([
                createLegacyKeyframe({ time: 0.0, value: 1.0 }),
                createLegacyKeyframe({ time: 1.0, value: 1.0 }),
            ] as Keyframe[]);
        });

        test('new AnimationCurve(keyframes)', () => {
            const curve = new AnimationCurve([
                createLegacyKeyframe({ time: 2.0, value: 8.0, inTangent: -3.3, outTangent: 1.75 }),
                createLegacyKeyframe({ time: 3.0, value: 9.0, inTangent: 4.2, outTangent: -7.1 }),
            ]);
            expect(curve.keyFrames).toStrictEqual([
                createLegacyKeyframe({ time: 2.0, value: 8.0, inTangent: -3.3, outTangent: 1.75 }),
                createLegacyKeyframe({ time: 3.0, value: 9.0, inTangent: 4.2, outTangent: -7.1 }),
            ] as Keyframe[]);
        });

        test('new AnimationCurve(realCurve)(INTERNAL)', () => {
            const realCurve = new RealCurve();
            realCurve.assignSorted([
                // Non weighted tangent
                [0.1, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    value: 0.1,
                    startTangent: 0.2,
                    endTangent: 0.3,
                })],
                // Non cubic keyframe
                [0.2, new RealKeyframeValue({
                    interpMode: RealInterpMode.LINEAR,
                    value: 0.1,
                })],
                // Weighted tangent
                [0.3, new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    value: 0.1,
                    startTangent: 0.2,
                    endTangent: 0.3,
                    tangentWeightMode: TangentWeightMode.START,
                    startTangentWeight: 0.4,
                    endTangentWeight: 0.5,
                })],
            ]);

            const geometryCurve = new AnimationCurve(realCurve);
            expect(geometryCurve.keyFrames).toStrictEqual([
                createLegacyKeyframe({ time: 0.1, value: 0.1, inTangent: 0.2, outTangent: 0.3 }),
                createLegacyKeyframe({ time: 0.2, value: 0.1, inTangent: 0.0, outTangent: 0.0 }),
                createLegacyKeyframe({ time: 0.3, value: 0.1, inTangent: 0.2, outTangent: 0.3 }),
            ] as Keyframe[]);
        });

        test.each([
            { extrapMode: ExtrapMode.REPEAT, expected: WrapModeMask.Loop },
            { extrapMode: ExtrapMode.PING_PONG, expected: WrapModeMask.PingPong },
            { extrapMode: ExtrapMode.CLAMP, expected: WrapModeMask.Clamp },
            { extrapMode: ExtrapMode.LINEAR, expected: WrapModeMask.Clamp },
        ])(`new AnimationCurve(realCurve)(INTERNAL): conversion of extrapolation mode $extrapMode`, ({ extrapMode, expected }) => {
            const realCurve = new RealCurve();
            realCurve.preExtrap = extrapMode;
            realCurve.postExtrap = extrapMode;
            const geometryCurve = new AnimationCurve(realCurve);
            expect(geometryCurve.preWrapMode).toStrictEqual(expected);
            expect(geometryCurve.postWrapMode).toStrictEqual(expected);
        });
    });

    test.each([
        { wrapMode: WrapModeMask.Clamp, extrapMode: ExtrapMode.CLAMP, },
        { wrapMode: WrapModeMask.Loop, extrapMode: ExtrapMode.REPEAT, },
        { wrapMode: WrapModeMask.PingPong, extrapMode: ExtrapMode.PING_PONG, },
    ])(`Wrap mode $wrapMode`, ({ wrapMode, extrapMode }) => {
        const curve = new AnimationCurve();
        
        curve.preWrapMode = wrapMode;
        expect(curve.preWrapMode).toStrictEqual(wrapMode);
        expect(curve._internalCurve.preExtrap).toStrictEqual(extrapMode);

        curve.postWrapMode = wrapMode;
        expect(curve.postWrapMode).toStrictEqual(wrapMode);
        expect(curve._internalCurve.postExtrap).toStrictEqual(extrapMode);
    });

    test(`Add key`, () => {
        const curve = new AnimationCurve();

        // Clear
        curve.addKey(null);
        expect(curve.keyFrames).toStrictEqual([]);

        curve.addKey(createLegacyKeyframe({
            time: 0.1,
            value: 0.2,
            inTangent: 0.3,
            outTangent: 0.4,
        }));
        expect(curve.keyFrames).toStrictEqual([createLegacyKeyframe({
            time: 0.1,
            value: 0.2,
            inTangent: 0.3,
            outTangent: 0.4,
        })]);

        // Clear again
        curve.addKey(null);
        expect(curve.keyFrames).toStrictEqual([]);
    });

    test('Keyframes', () => {
        const curve = new AnimationCurve();

        curve.keyFrames = [createLegacyKeyframe({
            time: 0.1,
            value: 0.2,
            inTangent: 0.3,
            outTangent: 0.4,
        }), createLegacyKeyframe({
            time: 0.5,
            value: 0.6,
            inTangent: 0.7,
            outTangent: 0.8,
        })];

        expect(curve.keyFrames).toStrictEqual([createLegacyKeyframe({
            time: 0.1,
            value: 0.2,
            inTangent: 0.3,
            outTangent: 0.4,
        }), createLegacyKeyframe({
            time: 0.5,
            value: 0.6,
            inTangent: 0.7,
            outTangent: 0.8,
        })]);

        curve._internalCurve.clear();
        expect(curve.keyFrames).toStrictEqual([]);

        curve._internalCurve.assignSorted([
            // Non weighted tangent
            [0.1, new RealKeyframeValue({
                interpMode: RealInterpMode.CUBIC,
                value: 0.1,
                startTangent: 0.2,
                endTangent: 0.3,
            })],
            // Non cubic keyframe
            [0.2, new RealKeyframeValue({
                interpMode: RealInterpMode.LINEAR,
                value: 0.1,
            })],
            // Weighted tangent
            [0.3, new RealKeyframeValue({
                interpMode: RealInterpMode.CUBIC,
                value: 0.1,
                startTangent: 0.2,
                endTangent: 0.3,
                tangentWeightMode: TangentWeightMode.START,
                startTangentWeight: 0.4,
                endTangentWeight: 0.5,
            })],
        ]);
        expect(curve.keyFrames).toStrictEqual([
            createLegacyKeyframe({ time: 0.1, value: 0.1, inTangent: 0.2, outTangent: 0.3 }),
            createLegacyKeyframe({ time: 0.2, value: 0.1, inTangent: 0.0, outTangent: 0.0 }),
            createLegacyKeyframe({ time: 0.3, value: 0.1, inTangent: 0.2, outTangent: 0.3 }),
        ] as Keyframe[]);
    });
});

function createLegacyKeyframe ({
    time,
    value,
    inTangent = 0.0,
    outTangent = 0.0,
}: {
    time: number,
    value: number;
    inTangent?: number;
    outTangent?: number;
}) {
    const keyFrame = new Keyframe();
    keyFrame.time = time;
    keyFrame.value = value;
    keyFrame.inTangent = inTangent;
    keyFrame.outTangent = outTangent;
    return keyFrame;
}
