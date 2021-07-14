import { SpriteFrame } from "../../cocos/2d/assets";
import { math, RealInterpMode } from "../../cocos/core";
import { AnimationClip, animation, BezierControlPoints, bezierByTime } from "../../cocos/core/animation";
import { ColorTrack, IValueProxyFactory, RealTrack, Track, TrackPath, VectorTrack } from "../../cocos/core/animation/animation";
import { LegacyClipCurve, LegacyCommonTarget, LegacyEasingMethod, timeBezierToTangents } from "../../cocos/core/animation/legacy-clip-data";
import { ComponentPath, HierarchyPath, ICustomTargetPath, TargetPath } from "../../cocos/core/animation/target-path";
import { RealChannel } from "../../cocos/core/animation/tracks/track";
import { UntypedTrack } from "../../cocos/core/animation/tracks/untyped-track";
import { ExtrapMode, RealCurve, RealKeyframeValue, TangentWeightMode } from "../../cocos/core/curves/curve";

class ValueProxyFactorFoo implements IValueProxyFactory {
    forTarget(_target: any): animation.IValueProxy {
        throw new Error("Method not implemented.");
    }
}

describe('Animation Clip Migration 3.x', () => {
    test(`Zero curve clip`, () => {
        const clip = createClipWithLegacyData({});
        expect(clip.tracksCount).toBe(0);
    });

    describe(`Modifiers & proxies`, () => {
        test(`Empty path`, () => {
            const clip = createClipWithLegacyData({
                times: [[0.1]],
                curves: [{ modifiers: [], data: { keys: 0, values: [0.2] } }],
            });
            expect(clip.tracksCount).toBe(1);
            expect(Array.from(clip.tracks)[0].path.length).toBe(0);
        });

        const TRACK_PATH_PROTOTYPE = TrackPath.prototype;

        test.each([
            [`Property path`, {
                value: 'p',
                expected: 'p',
                is: TRACK_PATH_PROTOTYPE.isPropertyAt,
                parse: TRACK_PATH_PROTOTYPE.parsePropertyAt,
            }],
            [`Element path`, {
                value: 2,
                expected: 2,
                is: TRACK_PATH_PROTOTYPE.isPropertyAt,
                parse: TRACK_PATH_PROTOTYPE.parseElementAt,
            }],
            [`Hierarchy path`, {
                value: new HierarchyPath('foo'),
                expected: 'foo',
                is: TRACK_PATH_PROTOTYPE.isPropertyAt,
                parse: TRACK_PATH_PROTOTYPE.parseHierarchyAt,
            }],
            [`Component path`, {
                value: new ComponentPath('bar'),
                expected: 'bar',
                is: TRACK_PATH_PROTOTYPE.isPropertyAt,
                parse: TRACK_PATH_PROTOTYPE.parseComponentAt,
            }],
        ] as [
            title: string, options: {
                value: TargetPath;
                expected: unknown;
                is: (index: number) => boolean;
                parse: (index: number) => unknown;
            }
        ][])(`%s`, (_, { value, expected, is, parse }) => {
            const clip = createClipWithLegacyData({
                times: [[0.1]],
                curves: [{ modifiers: [value], data: { keys: 0, values: [0.2] } }],
            });
            expect(clip.tracksCount).toBe(1);
            const path = Array.from(clip.tracks)[0].path;
            expect(path.length).toBe(1);
            expect(is.call(path, 0));
            expect(parse.call(path, 0)).toBe(expected);
        });

        test(`Customized path`, () => {
            // TODO
        });

        test(`Compound path`, () => {
            const clip = createClipWithLegacyData({
                times: [[0.1]],
                curves: [{ modifiers: [
                    new HierarchyPath('foo'),
                    new ComponentPath('bar'),
                    'baz',
                    1,
                ], data: { keys: 0, values: [0.2] } }],
            });
            expect(clip.tracksCount).toBe(1);
            const path = Array.from(clip.tracks)[0].path;
            expect(path.length).toBe(4);
            expect(path.isHierarchyAt(0));
            expect(path.parseHierarchyAt(0)).toBe('foo');
            expect(path.isComponentAt(1));
            expect(path.parseComponentAt(1)).toBe('bar');
            expect(path.isPropertyAt(2));
            expect(path.parsePropertyAt(2)).toBe('baz');
            expect(path.isElementAt(3));
            expect(path.parseElementAt(3)).toBe(1);
        });

        test(`Value proxy`, () => {
            const valueProxy = new ValueProxyFactorFoo();
            const clip = createClipWithLegacyData({
                times: [[0.1]],
                curves: [{ modifiers: [], valueAdapter: valueProxy, data: { keys: 0, values: [0.2] } }],
            });
            expect(clip.tracksCount).toBe(1);
            expect(Array.from(clip.tracks)[0].proxy).toBe(valueProxy);
        });
    });

    describe(`Curves`, () => {

        test(`Empty curve`, () => {
            const clip = createClipWithLegacyData({
                times: [[]],
                curves: [{ modifiers: ['p'], data: { keys: 0, values: [] } }],
            });
            // We did not convert a empty curve since it's meaningless.
            expect(clip.tracksCount).toBe(0);
        });

        interface RealLikeTrackTestOptions<TValueType, T extends Track> {
            valueType: NumberConstructor | { new (...args: number[]): TValueType };
            numberOfValueTypeComponents: number;
            expectedTrackType: { new (...args: any[]): T };
            numberFactor?: number;
            componentNames?: string[];
        }

        describe.each([
            [`Numeric curves`, {
                valueType: Number,
                numberOfValueTypeComponents: 1,
                expectedTrackType: RealTrack,
            }],
            [`Vec2 curves`, {
                valueType: math.Vec2,
                numberOfValueTypeComponents: 2,
                expectedTrackType: VectorTrack,
            }],
            [`Vec3 curves`, {
                valueType: math.Vec3,
                numberOfValueTypeComponents: 3,
                expectedTrackType: VectorTrack,
            }],
            [`Vec4 curves`, {
                valueType: math.Vec4,
                numberOfValueTypeComponents: 4,
                expectedTrackType: VectorTrack,
            }],
            [`Color curves`, {
                valueType: math.Color,
                numberOfValueTypeComponents: 4,
                expectedTrackType: ColorTrack,
                numberFactor: 10,
                componentNames: ['r', 'g', 'b', 'a'],
            }],
        ] as Array<[
            title: string,
            options: RealLikeTrackTestOptions<unknown, Track>,
        ]>)(`%s`, (_, {
            valueType,
            numberOfValueTypeComponents,
            expectedTrackType,
            numberFactor = 0.1,
            componentNames,
        }) => {
            if (!componentNames) {
                componentNames = ['x', 'y', 'z', 'w'];
            }
            const times = [0.1, 0.2, 0.8];
            const nKeyframes = times.length;
            const genValueAt = (keyframeIndex: number, componentIndex: number) =>
                numberFactor * (keyframeIndex * numberOfValueTypeComponents + componentIndex);
            const values = Array.from(
                { length: nKeyframes },
                (_, iKeyframe) => valueType === Number
                    ? genValueAt(iKeyframe, 0)
                    : new valueType(...Array.from(
                        { length: numberOfValueTypeComponents },
                        (_, iComponent) => genValueAt(iKeyframe, iComponent)),
                    ),
            );
            const clip = createClipWithLegacyData({
                times: [times],
                curves: [{
                    modifiers: ['p'],
                    data: {
                        keys: 0,
                        values: values,
                        interpolate: true,
                    },
                }, {
                    modifiers: ['p'],
                    data: {
                        keys: 0,
                        values: values,
                        interpolate: false,
                    },
                }],
            });
            const INTERPOLATE_TRUE_CURVE_INDEX = 0;
            const INTERPOLATE_FALSE_CURVE_INDEX = 1;
            expect(clip.tracksCount).toBe(2);
            test.each([
                [true, [INTERPOLATE_TRUE_CURVE_INDEX, RealInterpMode.LINEAR]],
                [false, [INTERPOLATE_FALSE_CURVE_INDEX, RealInterpMode.CONSTANT]],
            ])(`with .interpolate: %s`, (_interpolate, [trackIndex, interpMode]) => {
                const track = clip.getTrack(trackIndex);
                expect(track).toBeInstanceOf(expectedTrackType);
                const channels = Array.from(track.channels());
                if (expectedTrackType === VectorTrack) {
                    expect((track as VectorTrack).componentsCount).toBe(numberOfValueTypeComponents);
                } else {
                    expect(channels).toHaveLength(numberOfValueTypeComponents);
                }
                const getComponentNameOfChannel = (channelIndex: number) => {
                    if (channelIndex >= componentNames.length) {
                        throw new Error(`Unknown component name at channel ${channelIndex}`);
                    } else {
                        return componentNames[channelIndex];
                    }
                };
                for (let iChannel = 0; iChannel < numberOfValueTypeComponents; ++iChannel) {
                    const { curve } = channels[iChannel] as RealChannel;
                    expect(curve.preExtrap).toBe(ExtrapMode.CLAMP);
                    expect(curve.postExtrap).toBe(ExtrapMode.CLAMP);
                    // Each curve's times are obtained from original times
                    expect(Array.from(curve.times())).toStrictEqual(times);
                    const valuesAtChannel = valueType === Number
                        ? values as number[]
                        : values.map((value) => (value as Record<string, number>)[getComponentNameOfChannel(iChannel)]);
                    expect(Array.from(curve.values())).toStrictEqual(valuesAtChannel.map((value) => new RealKeyframeValue({
                        value,
                        interpMode,
                    })));
                }
            });
        });
    
        test('Size curves', () => {
            const clip = createClipWithLegacyData({
                times: [[0.0, 0.2, 0.8]],
                curves: [{
                    modifiers: ['p'],
                    data: {
                        keys: 0,
                        values: [
                            new math.Size(10.8, -1.3),
                            new math.Size(20, 50),
                            new math.Size(30, 60),
                        ],
                    },
                }],
            });
            expect(clip.tracksCount).toBe(1);
            const track = clip.getTrack(0) as animation.SizeTrack;
            expect(track).toBeInstanceOf(animation.SizeTrack);
            const [{ curve: width }, { curve: height }] = track.channels();
            expect(Array.from(width.times())).toStrictEqual([0.0, 0.2, 0.8]);
            expect(Array.from(width.values())).toStrictEqual(
                createRealKeyframesWithoutTangent([10.8, 20, 30], RealInterpMode.LINEAR),
            );
            expect(Array.from(height.times())).toStrictEqual([0.0, 0.2, 0.8]);
            expect(Array.from(height.values())).toStrictEqual(
                createRealKeyframesWithoutTangent([-1.3, 50, 60], RealInterpMode.LINEAR),
            );
        });
    
        test('Sprite frame curves', () => {
            const spriteFrames = [
                new SpriteFrame(),
                new SpriteFrame(),
                new SpriteFrame(),
            ];
            const clip = createClipWithLegacyData({
                times: [[0.0, 0.2, 0.8]],
                curves: [{
                    modifiers: ['p'],
                    data: {
                        keys: 0,
                        values: spriteFrames,
                    },
                }],
            });
            expect(clip.tracksCount).toBe(1);
            const track = clip.getTrack(0) as animation.ObjectTrack<SpriteFrame>;
            expect(track).toBeInstanceOf(animation.ObjectTrack);
            const { curve } = track.channel;
            expect(Array.from(curve.times())).toStrictEqual([0.0, 0.2, 0.8]);
            expect(Array.from(curve.values())).toStrictEqual(spriteFrames);
        });
    });

    test(`Common targets are converted into internal concept: UntypedTracks`, () => {
        const valueProxy = new ValueProxyFactorFoo();

        const clip = createClipWithLegacyData({
            times: [[1.2]],
            commonTargets: [{
                modifiers: ['p1'],
            }, {
                modifiers: ['p2'],
                valueAdapter: valueProxy,
            }],
            curves: [{
                commonTarget: 0,
                modifiers: ['x'],
                data: { keys: 0, values: [0.1] },
            }, {
                commonTarget: 0,
                modifiers: ['y'],
                data: { keys: 0, values: [0.2] },
            }, {
                commonTarget: 1,
                modifiers: ['z'],
                data: { keys: 0, values: [0.3] },
            }],
        });

        expect(clip.tracksCount).toBe(2);
        const tracks = Array.from(clip.tracks);
        const [ track1, track2 ] = tracks as [UntypedTrack, UntypedTrack];

        expect(track1).toBeInstanceOf(UntypedTrack);
        expect(track1.path.length).toBe(1);
        expect(track1.path.isPropertyAt(0)).toBe(true);
        expect(track1.path.parsePropertyAt(0)).toBe('p1');
        expect(track1.channels()).toHaveLength(2);
        expect(Array.from(track1.channels()[0].curve.keyframes())).toStrictEqual([[1.2, new RealKeyframeValue({ value: 0.1 })]]);
        expect(Array.from(track1.channels()[1].curve.keyframes())).toStrictEqual([[1.2, new RealKeyframeValue({ value: 0.2 })]]);

        expect(track2).toBeInstanceOf(UntypedTrack);
        expect(track2.path.length).toBe(1);
        expect(track2.path.isPropertyAt(0)).toBe(true);
        expect(track2.path.parsePropertyAt(0)).toBe('p2');
        expect(track2.proxy).toBe(valueProxy);
        expect(track2.channels()).toHaveLength(1);
        expect(Array.from(track2.channels()[0].curve.keyframes())).toStrictEqual([[1.2, new RealKeyframeValue({ value: 0.3 })]]);
    });

    describe(`Easing methods`, () => {
        function createClipWithEasingMethodsAndConvert (
            times: number[],
            values: number[],
            easingMethod: undefined | LegacyEasingMethod,
            easingMethods: undefined | LegacyEasingMethod[] | Record<number, LegacyEasingMethod>,
            interpolate = true,
        ) {
            const clip = createClipWithLegacyData({
                times: [times],
                curves: [{
                    modifiers: [],
                    data: {
                        keys: 0,
                        values: values,
                        easingMethod,
                        easingMethods,
                        interpolate,
                    },
                }],
            });
            expect(clip.tracksCount).toBe(1);
            const track = Array.from(clip.tracks)[0] as RealTrack;
            expect(track).toBeInstanceOf(RealTrack);
            return track.channel.curve;
        }

        test(`Easing methods: not specified`, () => {
            const curve = createClipWithEasingMethodsAndConvert(
                [0.1, 0.3, 0.5],
                [1, 3, 5],
                undefined,
                undefined,
                true,
            );
            expect(Array.from(curve.times())).toStrictEqual([0.1, 0.3, 0.5]);
            expect(Array.from(curve.values())).toStrictEqual(createRealKeyframesWithoutTangent([1, 3, 5], RealInterpMode.LINEAR));
        });

        describe(`Specified through ".easingMethod"`, () => {
            test(`null(linear)`, () => {
                const curve = createClipWithEasingMethodsAndConvert(
                    [0.1, 0.3, 0.8],
                    [1, 3, 5],
                    null,
                    undefined,
                    true,
                );
                expect(Array.from(curve.times())).toStrictEqual([0.1, 0.3, 0.8]);
                expect(Array.from(curve.values())).toStrictEqual(createRealKeyframesWithoutTangent([1, 3, 5], RealInterpMode.LINEAR));
            });
    
            test(`Time bezier`, () => {
                const curve = createClipWithEasingMethodsAndConvert(
                    [0.1, 0.3, 0.8],
                    [1, 3, 5],
                    [0.2, 0.3, 0.4, 0.5],
                    undefined,
                    true,
                );
                expect(Array.from(curve.times())).toStrictEqual([0.1, 0.3, 0.8]);
                expect(Array.from(curve.values())).toStrictEqual([new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.BOTH,
                    value: 1,
                    startTangent: 14.999999999999998,
                    startTangentWeight: 0.6013318551349163,
                    endTangent: 8.333333333333334,
                    endTangentWeight: 1.0071742649611337,
                }), new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.BOTH,
                    value: 3,
                    startTangent: 5.999999999999998,
                    startTangentWeight: 0.6082762530298218,
                    endTangent: 3.3333333333333335,
                    endTangentWeight: 1.044030650891055,
                }), new RealKeyframeValue({
                    interpMode: RealInterpMode.LINEAR,
                    value: 5,
                })]);
            }); 
        });

        describe(`Specified through ".easingMethods"`, () => {
            test.each([
                [`Full array`, [null, [0.2, 0.3, 0.4, 0.5], null] as (LegacyEasingMethod | null)[]],
                [`Sparse array`, {
                    1: [0.2, 0.3, 0.4, 0.5],
                } as Record<number, LegacyEasingMethod>],
            ])(`%s`, (_, easingMethods) => {
                const curve = createClipWithEasingMethodsAndConvert(
                    [0.1, 0.3, 0.5],
                    [1, 3, 5],
                    undefined,
                    easingMethods,
                    true,
                );
                expect(Array.from(curve.times())).toStrictEqual([0.1, 0.3, 0.5]);
                expect(Array.from(curve.values())).toStrictEqual([new RealKeyframeValue({
                    interpMode: RealInterpMode.LINEAR,
                    value: 1,
                }), new RealKeyframeValue({
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.BOTH,
                    value: 3,
                    startTangent: 14.999999999999996,
                    startTangentWeight: 0.6013318551349163,
                    endTangent: 8.333333333333332,
                    endTangentWeight: 1.0071742649611337,
                }), new RealKeyframeValue({
                    interpMode: RealInterpMode.LINEAR,
                    value: 5,
                })]);
            });
        });
    });

    test('Time bezier to tangent', () => {
        testTimeBezierCurveConversion({
            // t0: 0.0,
            // t1: 1.0,
            // v0: 0.0,
            // v1: 1.0,
            t0: 0.08333333333333333,
            v0: 3,
            t1: 0.18333333333333332,
            v1: 5,
            bezierPoints: [.04,.94,.53,.63],
        });

        type TimeBezierTestCase = {
            t0: number;
            t1: number;
            v0: number;
            v1: number;
            bezierPoints: BezierControlPoints;
        };

        function testTimeBezierCurveConversion (testCase: TimeBezierTestCase) {
            const [endTangent, endTangentWeight, startTangent, startTangentWeight] = timeBezierToTangents(
                testCase.bezierPoints,
                testCase.t0,
                testCase.v0,
                testCase.t1,
                testCase.v1,
            );
            const curve = new RealCurve();
            curve.assignSorted([
                [testCase.t0, new RealKeyframeValue({
                    value: testCase.v0,
                    endTangent,
                    endTangentWeight,
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.END,
                })],
                [testCase.t1, new RealKeyframeValue({
                    value: testCase.v1,
                    startTangent,
                    startTangentWeight,
                    interpMode: RealInterpMode.CUBIC,
                    tangentWeightMode: TangentWeightMode.START,
                })],
            ]);

            for (let inputRatio = 0.0; inputRatio <= 1.0; inputRatio += 0.01) {
                const ratio = bezierByTime(testCase.bezierPoints, inputRatio);
                const timeBezierResult = testCase.v0 + (testCase.v1 - testCase.v0) * ratio;
                const inputTime = testCase.t0 + inputRatio * (testCase.t1 - testCase.t0);
                const curveResult = curve.evaluate(inputTime);
                expect(timeBezierResult).toBeCloseTo(curveResult, 2);
            }
        }
    });
});

function createClipWithLegacyData ({
    times,
    curves,
    commonTargets,
}: {
    times?: number[][];
    curves?: LegacyClipCurve[];
    commonTargets?: LegacyCommonTarget[];
}) {
    const clip = new AnimationClip();
    if (times) {
        clip.keys = times;
    }
    if (curves) {
        clip.curves = curves;
    }
    if (commonTargets) {
        clip.commonTargets = commonTargets;
    }
    clip.syncLegacyData();
    return clip;
}

function createRealKeyframesWithoutTangent (values: number[], interpMode: RealInterpMode): RealKeyframeValue[] {
    return values.map((value) => {
        return new RealKeyframeValue({
            value,
            interpMode,
        });
    });
}