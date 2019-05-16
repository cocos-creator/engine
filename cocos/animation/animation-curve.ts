import { Quat, ValueType, Vec2, Vec3, Vec4 } from '../core/value-types';
import * as vmath from '../core/vmath';
import { ccclass, property } from '../core/data/class-decorator';
import { binarySearchEpsilon as binarySearch } from '../core/data/utils/binary-search';
import { errorID } from '../core/platform/CCDebug';
import { ccenum } from '../core/value-types/enum';
import { PropertyBlendState } from './animation-blend-state';
import { bezierByTime } from './bezier';
import * as blending from './blending';
import * as easing from './easing';
import { MotionPath, sampleMotionPaths } from './motion-path-helper';
import { ILerpable, isLerpable } from './types';

export type CurveValue = any;

export interface ICurveTarget {
    [x: string]: any;
}

export type LerpFunction<T = any> = (from: T, to: T, t: number, dt: number) => T;

/**
 * If propertyBlendState.weight equals to zero, the propertyBlendState.value is dirty.
 * You shall handle this situation correctly.
 */
export type BlendFunction<T> = (value: T, weight: number, propertyBlendState: PropertyBlendState) => T;

export type FrameFinder = (framevalues: number[], value: number) => number;

export type LinearType = null;

export type BezierType = [number, number, number, number];

export type EasingMethodName = keyof (typeof easing);

export type CurveType = LinearType | BezierType | EasingMethodName;

export enum AnimationInterpolation {
    Linear = 0,
    Step = 1,
    CubicSpline = 2,
}
ccenum(AnimationInterpolation);
cc.AnimationInterpolation = AnimationInterpolation;

type EasingMethod = EasingMethodName | number[];

// tslint:disable-next-line:interface-name
export interface PropertyCurveData {
    keys: number;
    values: CurveValue[];
    easingMethod?: EasingMethod;
    easingMethods?: EasingMethod[];
    motionPaths?: MotionPath | MotionPath[];

    /**
     * When the interpolation is 'AnimationInterpolation.CubicSpline', the values must be array of ICubicSplineValue.
     */
    interpolation?: AnimationInterpolation;
}

interface ICubicSplineValue<T> {
    inTangent: T;
    dataPoint: T;
    outTangent: T;
}

export class RatioSampler {
    public ratios: number[];

    private _lastSampleRatio: number = -1;

    private _lastSampleResult: number = 0;

    private _findRatio: (ratios: number[], ratio: number) => number;

    constructor (ratios: number[]) {
        this.ratios = ratios;
        // If every piece of ratios are the same, we can use the quick function to find frame index.
        let currRatioDif;
        let lastRatioDif;
        let canOptimize = true;
        const EPSILON = 1e-6;
        for (let i = 1, l = ratios.length; i < l; i++) {
            currRatioDif = ratios[i] - ratios[i - 1];
            if (i === 1) {
                lastRatioDif = currRatioDif;
            }
            else if (Math.abs(currRatioDif - lastRatioDif) > EPSILON) {
                canOptimize = false;
                break;
            }
        }
        this._findRatio = canOptimize ? quickFindIndex : binarySearch;
    }

    public sample (ratio: number) {
        if (this._lastSampleRatio !== ratio) {
            this._lastSampleRatio = ratio;
            this._lastSampleResult = this._findRatio(this.ratios, ratio);
        }
        return this._lastSampleResult;
    }
}

/**
 * 动画曲线。
 */
@ccclass('cc.AnimCurve')
export class AnimCurve {
    public static Linear = null;

    public static Bezier (controlPoints: number[]) {
        return controlPoints as BezierType;
    }

    /**
     * The values of the keyframes. (y)
     */
    @property
    public values: CurveValue[] = [];

    /**
     * The keyframe ratio of the keyframe specified as a number between 0.0 and 1.0 inclusive. (x)
     * A null ratio indicates a zero or single frame curve.
     */
    public ratioSampler: RatioSampler | null = null;

    @property
    public types?: CurveType[] = undefined;

    @property
    public type?: CurveType = null;

    public _blendFunction: BlendFunction<any> | undefined = undefined;

    /**
     * Lerp function used. If undefined, no lerp is performed.
     */
    private _lerp: LerpFunction | undefined = undefined;

    private _stepfiedValues?: any[];

    private _interpolation: AnimationInterpolation;

    constructor (propertyCurveData: PropertyCurveData, propertyName: string, isNode: boolean, ratioSampler: RatioSampler | null) {
        this._interpolation = propertyCurveData.interpolation || AnimationInterpolation.Linear;

        this.ratioSampler = ratioSampler;

        // Install values.
        this.values = propertyCurveData.values;

        const getCurveType = (easingMethod: EasingMethod) => {
            if (typeof easingMethod === 'string') {
                return easingMethod;
            } else if (Array.isArray(easingMethod)) {
                if (easingMethod[0] === easingMethod[1] &&
                    easingMethod[2] === easingMethod[3]) {
                    return AnimCurve.Linear;
                } else {
                    return AnimCurve.Bezier(easingMethod);
                }
            } else {
                return AnimCurve.Linear;
            }
        };
        if (propertyCurveData.easingMethod !== undefined) {
            this.type = getCurveType(propertyCurveData.easingMethod);
        } else if (propertyCurveData.easingMethods !== undefined) {
            this.types = propertyCurveData.easingMethods.map(getCurveType);
        } else {
            this.type = null;
        }

        // Setup the lerp function.
        const firstValue = propertyCurveData.values[0];
        if (this._interpolation === AnimationInterpolation.Linear) {
            this._lerp = selectLinearLerpFx(firstValue);
        } else if (this._interpolation === AnimationInterpolation.CubicSpline) {
            this._lerp = selectCubicSplineLerpFx(firstValue ? firstValue.inTangent : undefined);
        }

        // Setup the blend function.
        if (isNode) {
            switch (propertyName) {
                case 'position':
                    this._blendFunction = blending.additive3D;
                    break;
                case 'scale':
                    this._blendFunction = blending.additive3D;
                    break;
                case 'rotation':
                    this._blendFunction = blending.additiveQuat;
                    break;
            }
        }
    }

    /**
     * @param ratio The normalized time specified as a number between 0.0 and 1.0 inclusive.
     */
    public sample (ratio: number): any {
        if (!this._stepfiedValues) {
            return this._sampleFromOriginal(ratio);
        } else {
            const ratioStep = 1 / this._stepfiedValues.length;
            const i = Math.floor(ratio / ratioStep);
            return this._stepfiedValues[i];
        }
    }

    public stepfy (stepCount: number) {
        this._stepfiedValues = undefined;
        if (stepCount === 0) {
            return;
        }
        this._stepfiedValues = new Array(stepCount);
        const ratioStep = 1 / stepCount;
        let curRatio = 0;
        for (let i = 0; i < stepCount; ++i, curRatio += ratioStep) {
            const value = this._sampleFromOriginal(curRatio);
            this._stepfiedValues[i] = value instanceof ValueType ? value.clone() : value;
        }
    }

    private _sampleFromOriginal (ratio: number) {
        const values = this.values;
        const frameCount = this.ratioSampler ?
            this.ratioSampler.ratios.length :
            this.values.length;
        if (frameCount === 0) {
            return;
        }

        // evaluate value
        let isLerped = false;
        let value: CurveValue;
        if (this.ratioSampler === null) {
            value = this.values[0];
        } else {
            let index = this.ratioSampler.sample(ratio);
            if (index >= 0) {
                value = values[index];
            } else {
                index = ~index;
                if (index <= 0) {
                    value = values[0];
                } else if (index >= frameCount) {
                    value = values[frameCount - 1];
                } else {
                    const fromVal = values[index - 1];
                    if (!this._lerp) {
                        value = fromVal;
                    } else {
                        const fromRatio = this.ratioSampler.ratios[index - 1];
                        const toRatio = this.ratioSampler.ratios[index];
                        const type = this.types ? this.types[index - 1] : this.type;
                        const dRatio = (toRatio - fromRatio);
                        let ratioBetweenFrames = (ratio - fromRatio) / dRatio;
                        if (type) {
                            ratioBetweenFrames = computeRatioByType(ratioBetweenFrames, type);
                        }
                        // calculate value
                        const toVal = values[index];
                        value = this._lerp(fromVal, toVal, ratioBetweenFrames, dRatio);
                        isLerped = true;
                    }
                }
            }
        }
        if (!isLerped) {
            if (this._interpolation === AnimationInterpolation.CubicSpline) {
                return value.dataPoint;
            }
        }
        return value;
    }
}

export class EventInfo {
    public events: any[] = [];

    /**
     * @param func event function
     * @param params event params
     */
    public add (func: string, params: any[]) {
        this.events.push({
            func: func || '',
            params: params || [],
        });
    }
}

/**
 * Compute a new ratio by curve type
 * @param ratio - The origin ratio
 * @param type - If it's Array, then ratio will be computed with bezierByTime.
 * If it's string, then ratio will be computed with cc.easing function
 */
export function computeRatioByType (ratio: number, type: CurveType) {
    if (typeof type === 'string') {
        const func = easing[type];
        if (func) {
            ratio = func(ratio);
        } else {
            errorID(3906, type);
        }
    } else if (Array.isArray(type)) {
        // bezier curve
        ratio = bezierByTime(type, ratio);
    }

    return ratio;
}

/**
 * 当每两帧之前的间隔都一样的时候可以使用此函数快速查找 index
 */
function quickFindIndex (ratios: number[], ratio: number) {
    const length = ratios.length - 1;

    if (length === 0) { return 0; }

    const start = ratios[0];
    if (ratio < start) { return 0; }

    const end = ratios[length];
    if (ratio > end) { return length; }

    ratio = (ratio - start) / (end - start);

    const eachLength = 1 / length;
    const index = ratio / eachLength;
    const floorIndex = index | 0;
    const EPSILON = 1e-6;

    if ((index - floorIndex) < EPSILON) {
        return floorIndex;
    }
    else if ((floorIndex + 1 - index) < EPSILON) {
        return floorIndex + 1;
    }

    return ~(floorIndex + 1);
}

const selectLinearLerpFx = (() => {
    function makeValueTypeLerpFx<T extends ValueType> (constructor: Constructor<T>) {
        const tempValue = new constructor();
        return (from: T, to: T, ratio: number) => {
            return from.lerp(to, ratio, tempValue);
        };
    }

    const lerpNumber = vmath.lerp;

    const builtinLerpFxTable: Map<Object, LerpFunction> = new Map();
    builtinLerpFxTable.set(Number, lerpNumber);
    builtinLerpFxTable.set(Vec2, makeValueTypeLerpFx(Vec2));
    builtinLerpFxTable.set(Vec3, makeValueTypeLerpFx(Vec3));
    builtinLerpFxTable.set(Vec4, makeValueTypeLerpFx(Vec4));
    builtinLerpFxTable.set(Quat, makeValueTypeLerpFx(Quat));

    function lerpObject (from: ILerpable, to: ILerpable, t: number): ILerpable {
        return from.lerp(to, t);
    }

    return (value: any): LerpFunction<any> | undefined => {
        if (typeof value === 'number') {
            return lerpNumber;
        } else if (typeof value === 'object') {
            const result = builtinLerpFxTable.get(value.constructor);
            if (result) {
                return result;
            } else if (isLerpable(value)) {
                return lerpObject;
            }
        }
        return undefined;
    };
})();

const selectCubicSplineLerpFx = (() => {
    type ScaleFx<T> = (out: T, v: T, s: number) => T;
    type ScaleAndAddFx<T> = (out: T, v1: T, v2: T, s: number) => T;
    function makeValueTypeLerpFx<T> (
        constructor: Constructor<T>,
        scaleFx: ScaleFx<T>,
        scaleAndAdd: ScaleAndAddFx<T>) {
        let tempValue = new constructor();
        let m0 = new constructor();
        let m1 = new constructor();
        return (from: ICubicSplineValue<T>, to: ICubicSplineValue<T>, t: number, dt: number) => {
            const p0 = from.dataPoint;
            const p1 = to.dataPoint;
            // dt => t_k+1 - t_k
            m0 = scaleFx(m0, from.outTangent, dt);
            m1 = scaleFx(m1, to.inTangent, dt);
            const t_3 = t * t * t;
            const t_2 = t * t;
            const f_0 = 2 * t_3 - 3 * t_2 + 1;
            const f_1 = t_3 - 2 * t_2 + t;
            const f_2 = -2 * t_3 + 3 * t_2;
            const f_3 = t_3 - t_2;
            tempValue = scaleFx(tempValue, p0, f_0);
            tempValue = scaleAndAdd(tempValue, tempValue, m0, f_1);
            tempValue = scaleAndAdd(tempValue, tempValue, p1, f_2);
            tempValue = scaleAndAdd(tempValue, tempValue, m1, f_3);
            return tempValue;
        };
    }

    const lerpNumber = (from: ICubicSplineValue<number>, to: ICubicSplineValue<number>, t: number, dt: number) => {
        const p0 = from.dataPoint;
        const p1 = to.dataPoint;
        // dt => t_k+1 - t_k
        const m0 = from.outTangent * dt;
        const m1 = to.inTangent * dt;
        const t_3 = t * t * t;
        const t_2 = t * t;
        const f_0 = 2 * t_3 - 3 * t_2 + 1;
        const f_1 = t_3 - 2 * t_2 + t;
        const f_2 = -2 * t_3 + 3 * t_2;
        const f_3 = t_3 - t_2;
        return p0 * f_0 + m0 * f_1 + p1 * f_2 + m1 * f_3;
    };

    const builtinLerpFxTable: Map<Object, LerpFunction> = new Map();
    builtinLerpFxTable.set(Number, lerpNumber);
    builtinLerpFxTable.set(Vec2, makeValueTypeLerpFx(Vec2, vmath.vec2.scale, vmath.vec2.scaleAndAdd));
    builtinLerpFxTable.set(Vec3, makeValueTypeLerpFx(Vec3, vmath.vec3.scale, vmath.vec3.scaleAndAdd));
    builtinLerpFxTable.set(Vec4, makeValueTypeLerpFx(Vec4, vmath.vec4.scale, vmath.vec4.scaleAndAdd));
    builtinLerpFxTable.set(Quat, makeValueTypeLerpFx(Quat, vmath.quat.scale, vmath.quat.scaleAndAdd));

    function lerpObject (from: ILerpable, to: ILerpable, t: number): ILerpable {
        return from.lerp(to, t);
    }

    return (value: any): LerpFunction<any> | undefined => {
        if (typeof value === 'number') {
            return lerpNumber;
        } else if (typeof value === 'object') {
            const result = builtinLerpFxTable.get(value.constructor);
            if (result) {
                return result;
            } else if (isLerpable(value)) {
                return lerpObject;
            }
        }
        return undefined;
    };
})();
