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
 * @hidden
 */

import { ccclass, type, serializable, editable, formerlySerializedAs } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { lerp } from '../../core/math';
import { Enum } from '../../core/value-types';
import { AnimationCurve, constructLegacyCurveAndConvert } from '../../core/geometry/curve';
import { Texture2D, ImageAsset, RealCurve } from '../../core';
import { PixelFormat, Filter, WrapMode } from '../../core/assets/asset-enum';

const SerializableTable = [
    ['mode', 'constant', 'multiplier'],
    ['mode', 'value', 'multiplier'],
    ['mode', 'min', 'max', 'multiplier'],
    ['mode', 'constantMin', 'constantMax', 'multiplier'],
];

export const Mode = Enum({
    Constant: 0,
    Curve: 1,
    TwoCurves: 2,
    TwoConstants: 3,
});

@ccclass('cc.CurveRange')
export default class CurveRange  {
    public static Mode = Mode;

    /**
     * @zh 曲线类型[[Mode]]。
     */
    @type(Mode)
    public mode = Mode.Constant;

    /**
     * @zh 当mode为Curve时，使用的曲线。
     */
    @type(RealCurve)
    public value = constructLegacyCurveAndConvert();

    /**
     * @zh 当mode为TwoCurves时，使用的曲线下限。
     */
    @type(RealCurve)
    public min = constructLegacyCurveAndConvert();

    /**
     * @zh 当mode为TwoCurves时，使用的曲线上限。
     */
    @type(RealCurve)
    public max = constructLegacyCurveAndConvert();

    /**
     * @zh 当mode为Curve时，使用的曲线。
     * @deprecated Since V3.2. Use `value` instead.
     */
    get curve () {
        return this._curve;
    }

    set curve (value) {
        this._curve = value;
        this.value = value._internalCurve;
    }

    /**
     * @zh 当mode为TwoCurves时，使用的曲线下限。
     * @deprecated Since V3.2. Use `min` instead.
     */
    get curveMin () {
        return this._curveMin;
    }

    set curveMin (value) {
        this._curveMin = value;
        this.min = value._internalCurve;
    }

    /**
     * @zh 当mode为TwoCurves时，使用的曲线上限。
     * @deprecated Since V3.2. Use `max` instead.
     */
    get curveMax () {
        return this._curveMax;
    }

    set curveMax (value) {
        this._curveMax = value;
        this.max = value._internalCurve;
    }

    /**
     * @zh 当mode为Constant时，曲线的值。
     */
    @serializable
    @editable
    public constant = 0;

    /**
     * @zh 当mode为TwoConstants时，曲线的上限。
     */
    @serializable
    @editable
    public constantMin = 0;

    /**
     * @zh 当mode为TwoConstants时，曲线的下限。
     */
    @serializable
    @editable
    public constantMax = 0;

    /**
     * @zh 应用于曲线插值的系数。
     */
    @serializable
    @editable
    public multiplier = 1;

    constructor () {

    }

    public evaluate (time: number, rndRatio: number) {
        switch (this.mode) {
        default:
        case Mode.Constant:
            return this.constant;
        case Mode.Curve:
            return this.value.evaluate(time) * this.multiplier;
        case Mode.TwoCurves:
            return lerp(this.min.evaluate(time), this.max.evaluate(time), rndRatio) * this.multiplier;
        case Mode.TwoConstants:
            return lerp(this.constantMin, this.constantMax, rndRatio);
        }
    }

    public getMax (): number {
        switch (this.mode) {
        default:
        case Mode.Constant:
            return this.constant;
        case Mode.Curve:
            return this.multiplier;
        case Mode.TwoConstants:
            return this.constantMax;
        case Mode.TwoCurves:
            return this.multiplier;
        }
    }

    public _onBeforeSerialize (props) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return SerializableTable[this.mode];
    }

    private _curve = new AnimationCurve(this.value);
    private _curveMin = new AnimationCurve(this.min);
    private _curveMax = new AnimationCurve(this.max);
}

function evaluateCurve (cr: CurveRange, time: number, index: number) {
    switch (cr.mode) {
    case Mode.Constant:
        return cr.constant;
    case Mode.Curve:
        return cr.value.evaluate(time) * cr.multiplier;
    case Mode.TwoCurves:
        return index === 0 ? cr.min.evaluate(time) * cr.multiplier : cr.max.evaluate(time) * cr.multiplier;
    case Mode.TwoConstants:
        return index === 0 ? cr.constantMin : cr.constantMax;
    default:
        return 0;
    }
}

function evaluateHeight (cr: CurveRange) {
    switch (cr.mode) {
    case Mode.TwoConstants:
        return 2;
    case Mode.TwoCurves:
        return 2;
    default:
        return 1;
    }
}

function packTexture (data, width, height) {
    const image = new ImageAsset({
        width,
        height,
        _data: data,
        _compressed: false,
        format: PixelFormat.RGBA32F,
    });

    const texture = new Texture2D();
    texture.setFilters(Filter.NEAREST, Filter.NEAREST);
    texture.setMipFilter(Filter.NONE);
    texture.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
    texture.image = image;

    return texture;
}

export function packCurveRangeZ (samples:number, cr: CurveRange, discrete?: boolean) {
    const height = evaluateHeight(cr);
    const data = new Float32Array(samples * height * 4);
    const interval = 1.0 / (samples - 1);
    let sum = 0;
    let average = 0;
    let offset = 0;

    for (let h = 0; h < height; h++) {
        sum = 0;
        for (let j = 0; j < samples; j++) {
            const value = evaluateCurve(cr, interval * j, h);
            if (discrete) {
                average = value;
            } else {
                sum += value;
                average = sum / (j + 1);
            }
            data[offset + 2] = value;
            offset += 4;
        }
    }
    return packTexture(data, samples, height);
}
export function packCurveRangeN (samples:number, cr: CurveRange, discrete?: boolean) {
    const height = evaluateHeight(cr);
    const data = new Float32Array(samples * height * 4);
    const interval = 1.0 / (samples - 1);
    let sum = 0;
    let average = 0;
    let offset = 0;
    for (let h = 0; h < height; h++) {
        sum = 0;
        for (let j = 0; j < samples; j++) {
            const value = evaluateCurve(cr, interval * j, h);
            if (discrete) {
                average = value;
            } else {
                sum += value;
                average = sum / (j + 1);
            }
            data[offset] = average;
            data[offset + 1] = average;
            data[offset + 2] = average;
            offset += 4;
        }
    }
    return packTexture(data, samples, height);
}

export function packCurveRangeXY (samples: number, x: CurveRange, y: CurveRange, discrete?: boolean) {
    const height = Math.max(evaluateHeight(x), evaluateHeight(y));
    const data = new Float32Array(samples * height * 4);
    const curves: CurveRange[] = [x, y];
    const interval = 1.0 / (samples - 1);

    for (let h = 0; h < height; h++) {
        for (let i = 0; i < 2; i++) {
            const cr = curves[i];
            let sum = 0;
            let average = 0;
            for (let j = 0; j < samples; j++) {
                const value = evaluateCurve(cr, interval * j, h);
                if (discrete) {
                    average = value;
                } else {
                    sum += value;
                    average = sum / (j + 1);
                }
                data[j * 4 + i] = average;
            }
        }
    }
    return packTexture(data, samples, height);
}

export function packCurveRangeXYZ (samples: number, x: CurveRange, y: CurveRange, z: CurveRange, discrete?: boolean) {
    const height = Math.max(evaluateHeight(x), evaluateHeight(y), evaluateHeight(z));
    const data = new Float32Array(samples * height * 4);
    const curves: CurveRange[] = [x, y, z];
    const interval = 1.0 / (samples - 1);

    for (let h = 0; h < height; h++) {
        for (let i = 0; i < 3; i++) {
            const cr = curves[i];
            let sum = 0;
            let average = 0;
            for (let j = 0; j < samples; j++) {
                const value = evaluateCurve(cr, interval * j, h);
                if (discrete) {
                    average = value;
                } else {
                    sum += value;
                    average = sum / (j + 1);
                }
                data[j * 4 + i] = average;
            }
        }
    }
    return packTexture(data, samples, height);
}

export function packCurveRangeXYZW (samples: number, x: CurveRange, y: CurveRange, z: CurveRange, w: CurveRange, discrete?: boolean) {
    const height = Math.max(evaluateHeight(x), evaluateHeight(y), evaluateHeight(z), evaluateHeight(w));
    const data = new Float32Array(samples * height * 4);
    const curves: CurveRange[] = [x, y, z, w];
    const interval = 1.0 / (samples - 1);

    for (let h = 0; h < height; h++) {
        for (let i = 0; i < 4; i++) {
            const cr = curves[i];
            let sum = 0;
            let average = 0;
            for (let j = 0; j < samples; j++) {
                const value = evaluateCurve(cr, interval * j, h);
                if (discrete) {
                    average = value;
                } else {
                    sum += value;
                    average = sum / (j + 1);
                }
                data[j * 4 + i] = average;
            }
        }
    }
    return packTexture(data, samples, height);
}
