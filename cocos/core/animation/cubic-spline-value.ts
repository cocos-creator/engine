/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * @packageDocumentation
 * @module animation
 */

import { ccclass, serializable } from 'cc.decorator';
import { Quat, Vec2, Vec3, Vec4 } from '../math';
import { ILerpable } from './types';
import { legacyCC } from '../global-exports';

interface ICubicSplineValue<T> extends ILerpable {
    dataPoint: T;
    inTangent: T;
    outTangent: T;
    lerp (to: ICubicSplineValue<T>, t: number, dt: number): T;
    getNoLerp (): T;
}

type CubicSplineValueConstructor<T> = new (dataPoint: T, inTangent: T, outTangent: T) => ICubicSplineValue<T>;

type ScaleFx<T> = (out: T, v: T, s: number) => T;
type ScaleAndAddFx<T> = (out: T, v1: T, v2: T, s: number) => T;
function makeCubicSplineValueConstructor<T> (
    name: string,
    constructorX: new () => T,
    scaleFx: ScaleFx<T>,
    scaleAndAdd: ScaleAndAddFx<T>,
): CubicSplineValueConstructor<T> {
    let tempValue = new constructorX();
    let m0 = new constructorX();
    let m1 = new constructorX();

    @ccclass(name)
    class CubicSplineValueClass implements ICubicSplineValue<T> {
        @serializable
        public dataPoint: T = new constructorX();

        @serializable
        public inTangent: T = new constructorX();

        @serializable
        public outTangent: T = new constructorX();

        constructor (dataPoint?: T, inTangent?: T, outTangent?: T) {
            this.dataPoint = dataPoint || new constructorX();
            this.inTangent = inTangent || new constructorX();
            this.outTangent = outTangent || new constructorX();
        }

        public lerp (to: CubicSplineValueClass, t: number, dt: number) {
            const p0 = this.dataPoint;
            const p1 = to.dataPoint;
            // dt => t_k+1 - t_k
            m0 = scaleFx(m0, this.inTangent, dt);
            m1 = scaleFx(m1, to.outTangent, dt);
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
        }

        public getNoLerp () {
            return this.dataPoint;
        }
    }

    // @ts-expect-error TS2367
    if (constructorX === Quat) {
        const lerp = CubicSplineValueClass.prototype.lerp;
        CubicSplineValueClass.prototype.lerp = function (this: CubicSplineValueClass, to: CubicSplineValueClass, t: number, dt: number) {
            const result = lerp.call(this, to, t, dt) as Quat;
            Quat.normalize(result, result);
            return result;
        };
    }

    return CubicSplineValueClass;
}

export const CubicSplineVec2Value = makeCubicSplineValueConstructor(
    'cc.CubicSplineVec2Value', Vec2, Vec2.multiplyScalar, Vec2.scaleAndAdd,
);

export type CubicSplineVec2Value = ICubicSplineValue<Vec2>;
legacyCC.CubicSplineVec2Value = CubicSplineVec2Value;

export const CubicSplineVec3Value = makeCubicSplineValueConstructor(
    'cc.CubicSplineVec3Value', Vec3, Vec3.multiplyScalar, Vec3.scaleAndAdd,
);
export type CubicSplineVec3Value = ICubicSplineValue<Vec3>;
legacyCC.CubicSplineVec3Value = CubicSplineVec3Value;

export const CubicSplineVec4Value = makeCubicSplineValueConstructor(
    'cc.CubicSplineVec4Value', Vec4, Vec4.multiplyScalar, Vec4.scaleAndAdd,
);
export type CubicSplineVec4Value = ICubicSplineValue<Vec4>;
legacyCC.CubicSplineVec4Value = CubicSplineVec4Value;

export const CubicSplineQuatValue = makeCubicSplineValueConstructor(
    'cc.CubicSplineQuatValue', Quat, Quat.multiplyScalar, Quat.scaleAndAdd,
);
legacyCC.CubicSplineQuatValue = CubicSplineQuatValue;

@ccclass('cc.CubicSplineNumberValue')
export class CubicSplineNumberValue implements ICubicSplineValue<number> {
    @serializable
    public dataPoint = 0;

    @serializable
    public inTangent = 0;

    @serializable
    public outTangent = 0;

    constructor (dataPoint: number, inTangent: number, outTangent: number) {
        this.dataPoint = dataPoint;
        this.inTangent = inTangent;
        this.outTangent = outTangent;
    }

    public lerp (to: CubicSplineNumberValue, t: number, dt: number) {
        const p0 = this.dataPoint;
        const p1 = to.dataPoint;
        // dt => t_k+1 - t_k
        const m0 = this.outTangent * dt;
        const m1 = to.inTangent * dt;
        const t_3 = t * t * t;
        const t_2 = t * t;
        const f_0 = 2 * t_3 - 3 * t_2 + 1;
        const f_1 = t_3 - 2 * t_2 + t;
        const f_2 = -2 * t_3 + 3 * t_2;
        const f_3 = t_3 - t_2;
        return p0 * f_0 + m0 * f_1 + p1 * f_2 + m1 * f_3;
    }

    public getNoLerp () {
        return this.dataPoint;
    }
}
legacyCC.CubicSplineNumberValue = CubicSplineNumberValue;
