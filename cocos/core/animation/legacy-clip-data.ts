import { ComponentPath, HierarchyPath, isPropertyPath, TargetPath } from './target-path';
import { IValueProxyFactory } from './value-proxy';
import * as easing from './easing';
import { BezierControlPoints } from './bezier';
import { CompactValueTypeArray } from '../data/utils/compact-value-type-array';
import { serializable } from '../data/decorators';
import { AnimCurve, RatioSampler } from './animation-curve';
import { QuaternionInterpMode, RealCurve, RealInterpMode, RealKeyframeValue, TangentWeightMode } from '../curves';
import { assertIsTrue } from '../data/utils/asserts';
import { Track, TrackPath } from './tracks/track';
import { UntypedTrack } from './tracks/untyped-track';
import { warn } from '../platform';
import { RealTrack } from './tracks/real-track';
import { Color, Quat, Size, Vec2, Vec3, Vec4 } from '../math';
import { CubicSplineNumberValue, CubicSplineQuatValue, CubicSplineVec2Value, CubicSplineVec3Value, CubicSplineVec4Value } from './cubic-spline-value';
import { ColorTrack } from './tracks/color-track';
import { VectorTrack } from './tracks/vector-track';
import { QuaternionTrack } from './tracks/quat-track';
import { ObjectTrack } from './tracks/object-track';
import { SizeTrack } from './tracks/size-track';

/**
 * 表示曲线值，曲线值可以是任意类型，但必须符合插值方式的要求。
 */
export type LegacyCurveValue = any;

/**
 * 表示曲线的目标对象。
 */
export type LegacyCurveTarget = Record<string, any>;

/**
 * 内置帧时间渐变方式名称。
 */
export type LegacyEasingMethodName = keyof (typeof easing);

/**
 * 帧时间渐变方式。可能为内置帧时间渐变方式的名称或贝塞尔控制点。
 */
export type LegacyEasingMethod = LegacyEasingMethodName | BezierControlPoints;

export type LegacyCompressedEasingMethods = Record<number, LegacyEasingMethod>;

export type LegacyLerpFunction<T = any> = (from: T, to: T, t: number, dt: number) => T;

export interface LegacyClipCurveData {
    /**
     * 曲线使用的时间轴。
     * @see {AnimationClip.keys}
     */
    keys: number;

    /**
     * 曲线值。曲线值的数量应和 `keys` 所引用时间轴的帧数相同。
     */
    values: LegacyCurveValue[];

    /**
     * 曲线任意两帧时间的渐变方式。仅当 `easingMethods === undefined` 时本字段才生效。
     */
    easingMethod?: LegacyEasingMethod;

    /**
     * 描述了每一帧时间到下一帧时间之间的渐变方式。
     */
    easingMethods?: LegacyEasingMethod[] | LegacyCompressedEasingMethods;

    /**
     * 是否进行插值。
     * @default true
     */
    interpolate?: boolean;

    /**
     * For internal usage only.
     */
    _arrayLength?: number;
}

export interface LegacyClipCurve {
    commonTarget?: number;

    modifiers: TargetPath[];

    valueAdapter?: IValueProxyFactory;

    data: LegacyClipCurveData;
}

export interface LegacyCommonTarget {
    modifiers: TargetPath[];
    valueAdapter?: IValueProxyFactory;
}

export type LegacyMaybeCompactCurve = Omit<LegacyClipCurve, 'data'> & {
    data: Omit<LegacyClipCurveData, 'values'> & {
        values: any[] | CompactValueTypeArray;
    };
};

export type LegacyMaybeCompactKeys = Array<number[] | CompactValueTypeArray>;

export type LegacyRuntimeCurve = Pick<LegacyClipCurve, 'modifiers' | 'valueAdapter' | 'commonTarget'> & {
    /**
     * 属性曲线。
     */
    curve: AnimCurve;

    /**
     * 曲线采样器。
     */
    sampler: RatioSampler | null;
}

// interface ConvertMap<TValue, TTrack> {
//     valueConstructor: Constructor<TValue>;
//     trackConstructor: Constructor<TTrack>;
//     properties: [keyof TValue, number][];
// }

// const VECTOR_LIKE_CURVE_CONVERT_TABLE = [
//     {
//         valueConstructor: Size,
//         trackConstructor: SizeTrack,
//         properties: [['width', 0], ['height', 1]],
//     } as ConvertMap<Size, SizeTrack>,
//     {
//         valueConstructor: Color,
//         trackConstructor: ColorTrack,
//         properties: [['r', 0], ['g', 1], ['b', 2], ['a', 3]],
//     } as ConvertMap<Color, ColorTrack>,
// ];

export class AnimationClipLegacyData {
    constructor (duration: number) {
        this._duration = duration;
    }

    get keys () {
        return this._keys;
    }

    set keys (value) {
        this._keys = value;
    }

    get curves () {
        return this._curves;
    }

    set curves (value) {
        this._curves = value;
        delete this._runtimeCurves;
    }

    get commonTargets () {
        return this._commonTargets;
    }

    set commonTargets (value) {
        this._commonTargets = value;
    }

    /**
     * 此动画的数据。
     */
    get data () {
        return this._data;
    }

    public getPropertyCurves (): readonly LegacyRuntimeCurve[] {
        if (!this._runtimeCurves) {
            this._createPropertyCurves();
        }
        return this._runtimeCurves!;
    }

    public toTracks () {
        const newTracks: Track[] = [];

        const {
            keys: legacyKeys,
            curves: legacyCurves,
            commonTargets: legacyCommonTargets,
        } = this;

        const convertTrackPath = (track: Track, modifiers: TargetPath[], valueAdapter: IValueProxyFactory | undefined) => {
            const trackPath = new TrackPath();
            for (const modifier of modifiers) {
                if (typeof modifier === 'string') {
                    trackPath.property(modifier);
                } else if (typeof modifier === 'number') {
                    trackPath.element(modifier);
                } else if (modifier instanceof HierarchyPath) {
                    trackPath.hierarchy(modifier.path);
                } else if (modifier instanceof ComponentPath) {
                    trackPath.component(modifier.component);
                } else {
                    trackPath.customized(modifier);
                }
            }
            track.path = trackPath;
            track.proxy = valueAdapter;
        };

        const untypedTracks = legacyCommonTargets.map((legacyCommonTarget) => {
            const track = new UntypedTrack();
            convertTrackPath(track, legacyCommonTarget.modifiers, legacyCommonTarget.valueAdapter);
            newTracks.push(track);
            return track;
        });

        for (const legacyCurve of legacyCurves) {
            const legacyCurveData = legacyCurve.data;
            const legacyValues = legacyCurveData.values;
            if (legacyValues.length === 0) {
                // Legacy clip did not record type info.
                continue;
            }
            const legacyKeysIndex = legacyCurveData.keys;
            // Rule: negative index means single frame.
            const times = legacyKeysIndex < 0 ? [0.0] : legacyKeys[legacyCurveData.keys];
            const firstValue = legacyValues[0];
            // Rule: default to true.
            const interpolate = legacyCurveData.interpolate ?? true;
            // Rule: _arrayLength only used for morph target, internally.
            assertIsTrue(typeof legacyCurveData._arrayLength !== 'number' || typeof firstValue === 'number');
            const legacyEasingMethodConverter = new LegacyEasingMethodConverter(legacyCurveData, times.length);

            const installPathAndSetter = (track: Track) => {
                convertTrackPath(track, legacyCurve.modifiers, legacyCurve.valueAdapter);
            };

            let legacyCommonTargetCurve: RealCurve | undefined;
            if (typeof legacyCurve.commonTarget === 'number') {
                // Rule: common targets should only target Vectors/`Size`/`Color`.
                if (!legacyValues.every((value) => typeof value === 'number')) {
                    warn(`Incorrect curve.`);
                    continue;
                }
                // Rule: Each curve that has common target should be numeric curve and targets string property.
                if (legacyCurve.valueAdapter || legacyCurve.modifiers.length !== 1 || typeof legacyCurve.modifiers[0] !== 'string') {
                    warn(`Incorrect curve.`);
                    continue;
                }
                const propertyName = legacyCurve.modifiers[0];
                const untypedTrack = untypedTracks[legacyCurve.commonTarget];
                const { curve } = untypedTrack.addChannel(propertyName);
                legacyCommonTargetCurve = curve;
            }

            const convertCurve = () => {
                if (typeof firstValue === 'number') {
                    if (!legacyValues.every((value) => typeof value === 'number')) {
                        warn(`Misconfigured curve.`);
                        return;
                    }
                    let realCurve: RealCurve;
                    if (legacyCommonTargetCurve) {
                        realCurve = legacyCommonTargetCurve;
                    } else {
                        const track = new RealTrack();
                        installPathAndSetter(track);
                        newTracks.push(track);
                        realCurve = track.channel.curve;
                    }
                    const interpMethod = interpolate ? RealInterpMode.LINEAR : RealInterpMode.CONSTANT;
                    realCurve.assignSorted(times, (legacyValues as number[]).map(
                        (value) => new RealKeyframeValue({ value, interpMode: interpMethod }),
                    ));
                    legacyEasingMethodConverter.convert(realCurve);
                    return;
                } else if (typeof firstValue === 'object') {
                    switch (true) {
                    default:
                        break;
                    case everyInstanceOf(legacyValues, Vec2):
                    case everyInstanceOf(legacyValues, Vec3):
                    case everyInstanceOf(legacyValues, Vec4): {
                        type Vec4plus = Vec4[];
                        type Vec3plus = (Vec3 | Vec4)[];
                        type Vec2plus = (Vec2 | Vec3 | Vec4)[];
                        const components = firstValue instanceof Vec2 ? 2 : firstValue instanceof Vec3 ? 3 : 4;
                        const track = new VectorTrack();
                        installPathAndSetter(track);
                        track.componentsCount = components;
                        const [{ curve: x }, { curve: y }, { curve: z }, { curve: w }] = track.channels();
                        const interpMethod = interpolate ? RealInterpMode.LINEAR : RealInterpMode.CONSTANT;
                        const valueToFrame = (value: number): RealKeyframeValue => new RealKeyframeValue({ value, interpMode: interpMethod });
                        switch (components) {
                        case 4:
                            w.assignSorted(times, (legacyValues as Vec4plus).map((value) => valueToFrame(value.w)));
                            legacyEasingMethodConverter.convert(w);
                            // falls through
                        case 3:
                            z.assignSorted(times, (legacyValues as Vec3plus).map((value) => valueToFrame(value.z)));
                            legacyEasingMethodConverter.convert(z);
                            // falls through
                        default:
                            x.assignSorted(times, (legacyValues as Vec2plus).map((value) => valueToFrame(value.x)));
                            legacyEasingMethodConverter.convert(x);
                            y.assignSorted(times, (legacyValues as Vec2plus).map((value) => valueToFrame(value.y)));
                            legacyEasingMethodConverter.convert(y);
                            break;
                        }
                        newTracks.push(track);
                        return;
                    }
                    case everyInstanceOf(legacyValues, Quat): {
                        assertIsTrue(legacyEasingMethodConverter.nil);
                        const track = new QuaternionTrack();
                        installPathAndSetter(track);
                        const interpMode = interpolate ? QuaternionInterpMode.SLERP : QuaternionInterpMode.CONSTANT;
                        track.channel.curve.assignSorted(times, (legacyValues as Quat[]).map((value) => ({
                            value: Quat.clone(value),
                            interpMode,
                        })));
                        newTracks.push(track);
                        return;
                    }
                    case everyInstanceOf(legacyValues, Color): {
                        const track = new ColorTrack();
                        installPathAndSetter(track);
                        const [{ curve: r }, { curve: g }, { curve: b }, { curve: a }] = track.channels();
                        const interpMethod = interpolate ? RealInterpMode.LINEAR : RealInterpMode.CONSTANT;
                        const valueToFrame = (value: number): RealKeyframeValue => new RealKeyframeValue({ value, interpMode: interpMethod });
                        r.assignSorted(times, (legacyValues as Color[]).map((value) => valueToFrame(value.r)));
                        legacyEasingMethodConverter.convert(r);
                        g.assignSorted(times, (legacyValues as Color[]).map((value) => valueToFrame(value.g)));
                        legacyEasingMethodConverter.convert(g);
                        b.assignSorted(times, (legacyValues as Color[]).map((value) => valueToFrame(value.b)));
                        legacyEasingMethodConverter.convert(b);
                        a.assignSorted(times, (legacyValues as Color[]).map((value) => valueToFrame(value.a)));
                        legacyEasingMethodConverter.convert(a);
                        newTracks.push(track);
                        return;
                    }
                    case everyInstanceOf(legacyValues, Size): {
                        const track = new SizeTrack();
                        installPathAndSetter(track);
                        const [{ curve: width }, { curve: height }] = track.channels();
                        const interpMethod = interpolate ? RealInterpMode.LINEAR : RealInterpMode.CONSTANT;
                        const valueToFrame = (value: number): RealKeyframeValue => new RealKeyframeValue({ value, interpMode: interpMethod });
                        width.assignSorted(times, (legacyValues as Size[]).map((value) => valueToFrame(value.width)));
                        legacyEasingMethodConverter.convert(width);
                        height.assignSorted(times, (legacyValues as Size[]).map((value) => valueToFrame(value.height)));
                        legacyEasingMethodConverter.convert(height);
                        newTracks.push(track);
                        return;
                    }
                    case everyInstanceOf(legacyValues, CubicSplineNumberValue): {
                        assertIsTrue(legacyEasingMethodConverter.nil);
                        const track = new RealTrack();
                        installPathAndSetter(track);
                        const interpMethod = interpolate ? RealInterpMode.CUBIC : RealInterpMode.CONSTANT;
                        track.channel.curve.assignSorted(times, (legacyValues as CubicSplineNumberValue[]).map((value) => new RealKeyframeValue({
                            value: value.dataPoint,
                            startTangent: value.inTangent,
                            endTangent: value.outTangent,
                            interpMode: interpMethod,
                        })));
                        newTracks.push(track);
                        return;
                    }
                    case everyInstanceOf(legacyValues, CubicSplineVec2Value):
                    case everyInstanceOf(legacyValues, CubicSplineVec3Value):
                    case everyInstanceOf(legacyValues, CubicSplineVec4Value): {
                        assertIsTrue(legacyEasingMethodConverter.nil);
                        type Vec4plus = CubicSplineVec4Value[];
                        type Vec3plus = (CubicSplineVec3Value | CubicSplineVec4Value)[];
                        type Vec2plus = (CubicSplineVec2Value | CubicSplineVec3Value | CubicSplineVec4Value)[];
                        const components = firstValue instanceof CubicSplineVec2Value ? 2 : firstValue instanceof CubicSplineVec3Value ? 3 : 4;
                        const track = new VectorTrack();
                        installPathAndSetter(track);
                        track.componentsCount = components;
                        const [x, y, z, w] = track.channels();
                        const interpMethod = interpolate ? RealInterpMode.LINEAR : RealInterpMode.CONSTANT;
                        const valueToFrame = (value: number, startTangent: number, endTangent: number): RealKeyframeValue => new RealKeyframeValue({
                            value,
                            startTangent,
                            endTangent,
                            interpMode: interpMethod,
                        });
                        switch (components) {
                        case 4:
                            w.curve.assignSorted(times, (legacyValues as Vec4plus).map(
                                (value) => valueToFrame(value.dataPoint.w, value.inTangent.w, value.outTangent.w),
                            ));
                            // falls through
                        case 3:
                            z.curve.assignSorted(times, (legacyValues as Vec3plus).map(
                                (value) => valueToFrame(value.dataPoint.z, value.inTangent.z, value.outTangent.z),
                            ));
                            // falls through
                        default:
                            x.curve.assignSorted(times, (legacyValues as Vec2plus).map(
                                (value) => valueToFrame(value.dataPoint.y, value.inTangent.y, value.outTangent.y),
                            ));
                            y.curve.assignSorted(times, (legacyValues as Vec2plus).map(
                                (value) => valueToFrame(value.dataPoint.x, value.inTangent.x, value.outTangent.x),
                            ));
                            break;
                        }
                        newTracks.push(track);
                        return;
                    }
                    case legacyValues.every((value) => value instanceof CubicSplineQuatValue): {
                        warn(`We don't currently support conversion of \`CubicSplineQuatValue\`.`);
                        break;
                    }
                    } // End switch
                }

                const objectTrack = new ObjectTrack();
                installPathAndSetter(objectTrack);
                objectTrack.channel.curve.assignSorted(times, legacyValues);
                newTracks.push(objectTrack);
            };

            convertCurve();
        }

        return newTracks;
    }

    private _keys: number[][] = [];

    private _curves: LegacyClipCurve[] = [];

    private _commonTargets: LegacyCommonTarget[] = [];

    private _ratioSamplers: RatioSampler[] = [];

    private _runtimeCurves?: LegacyRuntimeCurve[];

    private _data: Uint8Array | null = null;

    private _duration: number;

    protected _createPropertyCurves () {
        this._ratioSamplers = this._keys.map(
            (keys) => new RatioSampler(
                keys.map(
                    (key) => key / this._duration,
                ),
            ),
        );

        this._runtimeCurves = this._curves.map((targetCurve): LegacyRuntimeCurve => ({
            curve: new AnimCurve(targetCurve.data, this._duration),
            modifiers: targetCurve.modifiers,
            valueAdapter: targetCurve.valueAdapter,
            sampler: this._ratioSamplers[targetCurve.data.keys],
            commonTarget: targetCurve.commonTarget,
        }));
    }
}

function everyInstanceOf<T> (array: unknown[], constructor: Constructor<T>): array is T[] {
    return array.every((element) => element instanceof constructor);
}

// #region Legacy data structures prior to 1.2

export interface LegacyObjectCurveData {
    [propertyName: string]: LegacyClipCurveData;
}

export interface LegacyComponentsCurveData {
    [componentName: string]: LegacyObjectCurveData;
}

export interface LegacyNodeCurveData {
    props?: LegacyObjectCurveData;
    comps?: LegacyComponentsCurveData;
}

// #endregion

class LegacyEasingMethodConverter {
    constructor (legacyCurveData: LegacyClipCurveData, keyframesCount: number) {
        const { easingMethods } = legacyCurveData;
        if (Array.isArray(easingMethods)) {
            // Different
            this._easingMethods = easingMethods;
        } else if (easingMethods === undefined) {
            // Same
            this._easingMethods = new Array(keyframesCount).fill(legacyCurveData.easingMethod);
        } else {
            // Compressed as record
            this._easingMethods = Array.from({ length: keyframesCount }, (_, index) => easingMethods[index]);
        }
    }

    get nil () {
        return !this._easingMethods || this._easingMethods.every((easingMethod) => easingMethod === null || easingMethod === undefined);
    }

    public convert (curve: RealCurve) {
        const { _easingMethods: easingMethods } = this;
        if (!easingMethods) {
            return;
        }

        const nKeyframes = curve.keyFramesCount;
        if (curve.keyFramesCount < 2) {
            return;
        }

        if (Array.isArray(easingMethods)) {
            assertIsTrue(nKeyframes === easingMethods.length);
        }

        const iLastKeyframe = nKeyframes - 1;
        for (let iKeyframe = 0; iKeyframe < iLastKeyframe; ++iKeyframe) {
            const easingMethod = easingMethods[iKeyframe];
            if (!easingMethod) {
                continue;
            }
            if (Array.isArray(easingMethod)) {
                // Time bezier points
                const currentKeyframeValue = curve.getKeyframeValue(iKeyframe);
                const nextKeyframeValue = curve.getKeyframeValue(iKeyframe + 1);
                const [previousTangent, previousTangentWeight, nextTangent, nextTangentWeight] = timeBezierToTangents(
                    easingMethod,
                    curve.getKeyframeTime(iKeyframe),
                    currentKeyframeValue.value,
                    curve.getKeyframeTime(iKeyframe + 1),
                    nextKeyframeValue.value,
                );
                currentKeyframeValue.interpMode = RealInterpMode.CUBIC;
                currentKeyframeValue.tangentWeightMode = TangentWeightMode.BOTH;
                currentKeyframeValue.startTangent = previousTangent;
                currentKeyframeValue.startTangentWeight = previousTangentWeight;
                currentKeyframeValue.endTangent = nextTangent;
                currentKeyframeValue.endTangentWeight = nextTangentWeight;
            } else {
                const bernstein = new Array(4).fill(0);
                // Easing methods in `easing`
                switch (easingMethod) {
                case 'constant':
                case 'linear':
                    break;
                case 'quadIn':
                    // k * k
                    powerToBernstein([0.0, 0.0, 1.0, 0.0], bernstein);
                    break;
                case 'quadOut':
                    // k * (2 - k)
                    powerToBernstein([0.0, 2.0, -1.0, 0.0], bernstein);
                    break;
                case 'cubicIn':
                    // k * k * k
                    powerToBernstein([0.0, 0.0, 0.0, 1.0], bernstein);
                    break;
                case 'cubicOut':
                    // --k * k * k + 1;
                    powerToBernstein([0.0, 0.0, 0.0, 1.0], bernstein);
                    break;
                case 'backIn': {
                    // k * k * ((s + 1) * k - s)
                    const s = 1.70158;
                    powerToBernstein([1.0, 0.0, -s, s + 1.0], bernstein);
                    break;
                }
                case 'backOut': {
                    // k * k * ((s + 1) * k - s)
                    const s = 1.70158;
                    powerToBernstein([1.0, 0.0, s, s + 1.0], bernstein);
                    break;
                }
                case 'smooth': {
                    // k * k * (3 - 2 * k)
                    powerToBernstein([0.0, 0.0, 3.0, -2.0], bernstein);
                    break;
                }
                default:
                    // TODO: do sample
                    assertIsTrue(false);
                }
            }
        }
    }

    private _easingMethods: LegacyEasingMethod[]  | undefined;
}

/**
 * Legacy curve uses time based bezier curve interpolation.
 * That's, interpolate time 'x'(time ratio between two frames, eg.[0, 1])
 * and then use the interpolated time to sample curve.
 * Now we need to compute the the end tangent of previous frame and the start tangent of the next frame.
 * @param timeBezierPoints Bezier points used for legacy time interpolation.
 * @param previousTime Time of the previous keyframe.
 * @param previousValue Value of the previous keyframe.
 * @param nextTime Time of the next keyframe.
 * @param nextValue Value of the next keyframe.
 */
export function timeBezierToTangents (
    timeBezierPoints: BezierControlPoints,
    previousTime: number,
    previousValue: number,
    nextTime: number,
    nextValue: number,
): [previousTangent: number, previousTangentWeight: number, nextTangent: number, nextTangentWeight: number] {
    const [p1X, p1Y, p2X, p2Y] = timeBezierPoints;
    const dValue = nextValue - previousValue;
    const dTime = nextTime - previousTime;
    const fx = 3 * dTime;
    const fy = 3 * dValue;
    const t1x = p1X * fx;
    const t1y = p1Y * fy;
    const t2x = (1.0 - p2X) * fx;
    const t2y = (1.0 - p2Y) * fy;
    const ONE_THIRD = 1.0 / 3.0;
    return [
        t1y / t1x,
        Math.sqrt(t1x * t1x + t1y * t1y) * ONE_THIRD,
        t2y / t2x,
        Math.sqrt(t2x * t2x + t2y * t2y) * ONE_THIRD,
    ];
}

function powerToBernstein ([p0, p1, p2, p3]: [number, number, number, number], bernstein: number[]) {
    // https://stackoverflow.com/questions/33859199/convert-polynomial-curve-to-bezier-curve-control-points
    bernstein[0] = p0 + p1 + p2 + p3;
    bernstein[1] = p1 / 3.0 + p2 * 2.0 / 3.0 + p3;
    bernstein[2] = p2 / 3.0 + p3;
    bernstein[3] = p3;
}
