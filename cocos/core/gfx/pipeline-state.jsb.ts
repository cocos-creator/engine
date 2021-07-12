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
 * @module gfx
 */

declare const gfx: any;

declare type RecursivePartial<T> = {
    [P in keyof T]?:

    T[P] extends Array<infer U> ? Array<RecursivePartial<U>> :
    T[P] extends ReadonlyArray<infer V> ? ReadonlyArray<RecursivePartial<V>> : RecursivePartial<T[P]>;
};

import {
    BlendFactor,
    BlendOp,
    ColorMask,
    ComparisonFunc,
    CullMode,
    PolygonMode,
    ShadeModel,
    StencilOp,
    Color,
} from './base/define';

import { BSPool, DSSPool, RSPool } from '../renderer/core/memory-pools';

export class RasterizerState {
    protected _isDiscard: boolean = false;
    protected _polygonMode: PolygonMode = PolygonMode.FILL;
    protected _shadeModel: ShadeModel = ShadeModel.GOURAND;
    protected _cullMode: CullMode = CullMode.BACK;
    protected _isFrontFaceCCW: boolean = true;
    protected _depthBiasEnabled: boolean = false;
    protected _depthBias: number = 0;
    protected _depthBiasClamp: number = 0.0;
    protected _depthBiasSlop: number = 0.0;
    protected _isDepthClip: boolean = true;
    protected _isMultisample: boolean = false;
    protected _lineWidth: number = 1.0;
    protected _nativeObj;

    constructor (
        isDiscard: boolean = false,
        polygonMode: PolygonMode = PolygonMode.FILL,
        shadeModel: ShadeModel = ShadeModel.GOURAND,
        cullMode: CullMode = CullMode.BACK,
        isFrontFaceCCW: boolean = true,
        depthBiasEnabled: boolean = false,
        depthBias: number = 0,
        depthBiasClamp: number = 0.0,
        depthBiasSlop: number = 0.0,
        isDepthClip: boolean = true,
        isMultisample: boolean = false,
        lineWidth: number = 1.0,
    ) {
        this._nativeObj = RSPool.alloc(null);
        this.assignProperties(isDiscard, polygonMode, shadeModel, cullMode, isFrontFaceCCW,
            depthBiasEnabled, depthBias, depthBiasClamp, depthBiasSlop, isDepthClip, isMultisample, lineWidth);
    }

    get native () {
        return this._nativeObj;
    }

    get isDiscard (): boolean {
        return this._isDiscard;
    }
    set isDiscard (val: boolean) {
        this._isDiscard = val;
        this._nativeObj.isDiscard = val;
    }
    get polygonMode (): PolygonMode { return this._polygonMode; }
    set polygonMode (val: PolygonMode) {
        this._polygonMode = val;
        this._nativeObj.polygonMode = val;
    }
    get shadeModel (): ShadeModel { return this._shadeModel; }
    set shadeModel (val: ShadeModel) {
        this._shadeModel = val;
        this._nativeObj.shadeModel = val;
    }
    get cullMode (): CullMode { return this._cullMode; }
    set cullMode (val: CullMode) {
        this._cullMode = val;
        this._nativeObj.cullMode = val;
    }
    get isFrontFaceCCW (): boolean {
        return this._isFrontFaceCCW;
    }
    set isFrontFaceCCW (val: boolean) {
        this._isFrontFaceCCW = val;
        this._nativeObj.isFrontFaceCCW = val;
    }
    get depthBiasEnabled (): boolean {
        return this._depthBiasEnabled;
    }
    set depthBiasEnabled (val: boolean) {
        this._depthBiasEnabled = val;
        this._nativeObj.depthBiasEnabled = val;
    }
    get depthBias (): number { return this._depthBias; }
    set depthBias (val: number) {
        this._depthBias = val;
        this._nativeObj.depthBias = val;
    }
    get depthBiasClamp (): number { return this._depthBiasClamp; }
    set depthBiasClamp (val: number) {
        this._depthBiasClamp = val;
        this._nativeObj.depthBiasClamp = val;
    }
    get depthBiasSlop (): number { return this._depthBiasSlop; }
    set depthBiasSlop (val: number) {
        this._depthBiasSlop = val;
        this._nativeObj.depthBiasSlop = val;
    }
    get isDepthClip (): boolean {
        return this._isDepthClip;
    }
    set isDepthClip (val: boolean) {
        this._isDepthClip = val;
        this._nativeObj.isDepthClip = val;
    }
    get isMultisample (): boolean {
        return this._isMultisample;
    }
    set isMultisample (val: boolean) {
        this._isMultisample = val;
        this._nativeObj.isMultisample = val;
    }
    get lineWidth (): number { return this._lineWidth; }
    set lineWidth (val: number) {
        this._lineWidth = val;
        this._nativeObj.lineWidth = val;
    }

    public reset () {
        this.assignProperties(false, PolygonMode.FILL, ShadeModel.GOURAND, CullMode.BACK, true, false, 0,
            0.0, 0.0, true, false, 1.0);
    }

    public assign (rs: RecursivePartial<RasterizerState>) {
        if (!rs) return;
        this.assignProperties(rs.isDiscard, rs.polygonMode, rs.shadeModel, rs.cullMode, rs.isFrontFaceCCW,
            rs.depthBiasEnabled, rs.depthBias, rs.depthBiasClamp, rs.depthBiasSlop, rs.isDepthClip, rs.isMultisample, rs.lineWidth);
    }

    public destroy () {
        if (this._nativeObj) {
            RSPool.free(this._nativeObj);
            this._nativeObj = null;
        }
    }

    private assignProperties (
        isDiscard?: boolean,
        polygonMode?: PolygonMode,
        shadeModel?: ShadeModel,
        cullMode?: CullMode,
        isFrontFaceCCW?: boolean,
        depthBiasEnabled?: boolean,
        depthBias?: number,
        depthBiasClamp?: number,
        depthBiasSlop?: number,
        isDepthClip?: boolean,
        isMultisample?: boolean,
        lineWidth?: number,
    ) {
        if (isDiscard !== undefined) this.isDiscard = isDiscard;
        if (polygonMode !== undefined) this.polygonMode = polygonMode;
        if (shadeModel !== undefined) this.shadeModel = shadeModel;
        if (cullMode !== undefined) this.cullMode = cullMode;
        if (isFrontFaceCCW !== undefined) this.isFrontFaceCCW = isFrontFaceCCW;
        if (depthBiasEnabled !== undefined) this.depthBiasEnabled = depthBiasEnabled;
        if (depthBias !== undefined) this.depthBias = depthBias;
        if (depthBiasClamp !== undefined) this.depthBiasClamp = depthBiasClamp;
        if (depthBiasSlop !== undefined) this.depthBiasSlop = depthBiasSlop;
        if (isDepthClip !== undefined) this.isDepthClip = isDepthClip;
        if (isMultisample !== undefined) this.isMultisample = isMultisample;
        if (lineWidth !== undefined) this.lineWidth = lineWidth;
    }
}

/**
 * @en GFX depth stencil state.
 * @zh GFX 深度模板状态。
 */
export class DepthStencilState {
    protected _depthTest: boolean = true;
    protected _depthWrite: boolean = true;
    protected _depthFunc: ComparisonFunc = ComparisonFunc.LESS;
    protected _stencilTestFront: boolean = false;
    protected _stencilFuncFront: ComparisonFunc = ComparisonFunc.ALWAYS;
    protected _stencilReadMaskFront: number = 0xffff;
    protected _stencilWriteMaskFront: number = 0xffff;
    protected _stencilFailOpFront: StencilOp = StencilOp.KEEP;
    protected _stencilZFailOpFront: StencilOp = StencilOp.KEEP;
    protected _stencilPassOpFront: StencilOp = StencilOp.KEEP;
    protected _stencilRefFront: number = 1;
    protected _stencilTestBack: boolean = false;
    protected _stencilFuncBack: ComparisonFunc = ComparisonFunc.ALWAYS;
    protected _stencilReadMaskBack: number = 0xffff;
    protected _stencilWriteMaskBack: number = 0xffff;
    protected _stencilFailOpBack: StencilOp = StencilOp.KEEP;
    protected _stencilZFailOpBack: StencilOp = StencilOp.KEEP;
    protected _stencilPassOpBack: StencilOp = StencilOp.KEEP;
    protected _stencilRefBack: number = 1;
    protected _nativeObj;

    constructor (
        depthTest: boolean = true,
        depthWrite: boolean = true,
        depthFunc: ComparisonFunc = ComparisonFunc.LESS,
        stencilTestFront: boolean = false,
        stencilFuncFront: ComparisonFunc = ComparisonFunc.ALWAYS,
        stencilReadMaskFront: number = 0xffff,
        stencilWriteMaskFront: number = 0xffff,
        stencilFailOpFront: StencilOp = StencilOp.KEEP,
        stencilZFailOpFront: StencilOp = StencilOp.KEEP,
        stencilPassOpFront: StencilOp = StencilOp.KEEP,
        stencilRefFront: number = 1,
        stencilTestBack: boolean = false,
        stencilFuncBack: ComparisonFunc = ComparisonFunc.ALWAYS,
        stencilReadMaskBack: number = 0xffff,
        stencilWriteMaskBack: number = 0xffff,
        stencilFailOpBack: StencilOp = StencilOp.KEEP,
        stencilZFailOpBack: StencilOp = StencilOp.KEEP,
        stencilPassOpBack: StencilOp = StencilOp.KEEP,
        stencilRefBack: number = 1,
    ) {
        this._nativeObj = DSSPool.alloc(null);
        this.assignProperties(depthTest, depthWrite, depthFunc, stencilTestFront, stencilFuncFront, stencilReadMaskFront,
            stencilWriteMaskFront, stencilFailOpFront, stencilZFailOpFront, stencilPassOpFront, stencilRefFront,
            stencilTestBack, stencilFuncBack, stencilReadMaskBack, stencilWriteMaskBack, stencilFailOpBack,
            stencilZFailOpBack, stencilPassOpBack, stencilRefBack);
    }

    get native () {
        return this._nativeObj;
    }

    get depthTest (): boolean {
        return this._depthTest;
    }
    set depthTest (val: boolean) {
        this._depthTest = val;
        this._nativeObj.depthTest = val;
    }
    get depthWrite (): boolean {
        return this._depthWrite;
    }
    set depthWrite (val: boolean) {
        this._depthWrite = val;
        this._nativeObj.depthWrite = val;
    }
    get depthFunc (): ComparisonFunc { return this._depthFunc; }
    set depthFunc (val: ComparisonFunc) {
        this._depthFunc = val;
        this._nativeObj.depthFunc = val;
    }
    get stencilTestFront (): boolean {
        return this._stencilTestFront;
    }
    set stencilTestFront (val: boolean) {
        this._stencilTestFront = val;
        this._nativeObj.stencilTestFront = val;
    }
    get stencilFuncFront (): ComparisonFunc { return this._stencilFuncFront; }
    set stencilFuncFront (val: ComparisonFunc) {
        this._stencilFuncFront = val;
        this._nativeObj.stencilFuncFront = val;
    }
    get stencilReadMaskFront (): number { return this._stencilReadMaskFront; }
    set stencilReadMaskFront (val: number) {
        this._stencilReadMaskFront = val;
        this._nativeObj.stencilReadMaskFront = val;
    }
    get stencilWriteMaskFront (): number { return this._stencilWriteMaskFront; }
    set stencilWriteMaskFront (val: number) {
        this._stencilWriteMaskFront = val;
        this._nativeObj.stencilWriteMaskFront = val;
    }
    get stencilFailOpFront (): StencilOp { return this._stencilFailOpFront; }
    set stencilFailOpFront (val: StencilOp) {
        this._stencilFailOpFront = val;
        this._nativeObj.stencilFailOpFront = val;
    }
    get stencilZFailOpFront (): StencilOp { return this._stencilZFailOpFront; }
    set stencilZFailOpFront (val: StencilOp) {
        this._stencilZFailOpFront = val;
        this._nativeObj.stencilZFailOpFront = val;
    }
    get stencilPassOpFront (): StencilOp { return this._stencilPassOpFront; }
    set stencilPassOpFront (val: StencilOp) {
        this._stencilPassOpFront = val;
        this._nativeObj.stencilPassOpFront = val;
    }
    get stencilRefFront (): number { return this._stencilRefFront; }
    set stencilRefFront (val: number) {
        this._stencilRefFront = val;
        this._nativeObj.stencilRefFront = val;
    }
    get stencilTestBack (): boolean {
        return this._stencilTestBack;
    }
    set stencilTestBack (val: boolean) {
        this._stencilTestBack = val;
        this._nativeObj.stencilTestBack = val;
    }
    get stencilFuncBack (): ComparisonFunc { return this._stencilFuncBack; }
    set stencilFuncBack (val: ComparisonFunc) {
        this._stencilFuncBack = val;
        this._nativeObj.stencilFuncBack = val;
    }
    get stencilReadMaskBack (): number { return this._stencilReadMaskBack; }
    set stencilReadMaskBack (val: number) {
        this._stencilReadMaskBack = val;
        this._nativeObj.stencilReadMaskBack = val;
    }
    get stencilWriteMaskBack (): number { return this._stencilWriteMaskBack; }
    set stencilWriteMaskBack (val: number) {
        this._stencilWriteMaskBack = val;
        this._nativeObj.stencilWriteMaskBack = val;
    }
    get stencilFailOpBack (): StencilOp { return this._stencilFailOpBack; }
    set stencilFailOpBack (val: StencilOp) {
        this._stencilFailOpBack = val;
        this._nativeObj.stencilFailOpBack = val;
    }
    get stencilZFailOpBack (): StencilOp { return this._stencilZFailOpBack; }
    set stencilZFailOpBack (val: StencilOp) {
        this._stencilZFailOpBack = val;
        this._nativeObj.stencilZFailOpBack = val;
    }
    get stencilPassOpBack (): StencilOp { return this._stencilPassOpBack; }
    set stencilPassOpBack (val: StencilOp) {
        this._stencilPassOpBack = val;
        this._nativeObj.stencilPassOpBack = val;
    }
    get stencilRefBack (): number { return this._stencilRefBack; }
    set stencilRefBack (val: number) {
        this._stencilRefBack = val;
        this._nativeObj.stencilRefBack = val;
    }

    public initialize () {
    }

    public reset () {
        this.assignProperties(true, true, ComparisonFunc.LESS, false, ComparisonFunc.ALWAYS, 0xffff, 0xffff, StencilOp.KEEP,
            StencilOp.KEEP, StencilOp.KEEP, 1, false, ComparisonFunc.ALWAYS, 0xffff, 0xffff, StencilOp.KEEP, StencilOp.KEEP, StencilOp.KEEP, 1);
    }

    public assign (dss: RecursivePartial<DepthStencilState>) {
        if (!dss) return;
        this.assignProperties(dss.depthTest, dss.depthWrite, dss.depthFunc, dss.stencilTestFront, dss.stencilFuncFront, dss.stencilReadMaskFront,
            dss.stencilWriteMaskFront, dss.stencilFailOpFront, dss.stencilZFailOpFront, dss.stencilPassOpFront, dss.stencilRefFront,
            dss.stencilTestBack, dss.stencilFuncBack, dss.stencilReadMaskBack, dss.stencilWriteMaskBack, dss.stencilFailOpBack,
            dss.stencilZFailOpBack, dss.stencilPassOpBack, dss.stencilRefBack);
    }

    public destroy () {
        if (this._nativeObj) {
            DSSPool.free(this._nativeObj);
            this._nativeObj = null;
        }
    }

    private assignProperties (
        depthTest?: boolean,
        depthWrite?: boolean,
        depthFunc?: ComparisonFunc,
        stencilTestFront?: boolean,
        stencilFuncFront?: ComparisonFunc,
        stencilReadMaskFront?: number,
        stencilWriteMaskFront?: number,
        stencilFailOpFront?: StencilOp,
        stencilZFailOpFront?: StencilOp,
        stencilPassOpFront?: StencilOp,
        stencilRefFront?: number,
        stencilTestBack?: boolean,
        stencilFuncBack?: ComparisonFunc,
        stencilReadMaskBack?: number,
        stencilWriteMaskBack?: number,
        stencilFailOpBack?: StencilOp,
        stencilZFailOpBack?: StencilOp,
        stencilPassOpBack?: StencilOp,
        stencilRefBack?: number
    ) {
        if (depthTest !== undefined) this.depthTest = depthTest;
        if (depthWrite !== undefined) this.depthWrite = depthWrite;
        if (depthFunc !== undefined) this.depthFunc = depthFunc;
        if (stencilTestFront !== undefined) this.stencilTestFront = stencilTestFront;
        if (stencilFuncFront !== undefined) this.stencilFuncFront = stencilFuncFront;
        if (stencilReadMaskFront !== undefined) this.stencilReadMaskFront = stencilReadMaskFront;
        if (stencilWriteMaskFront !== undefined) this.stencilWriteMaskFront = stencilWriteMaskFront;
        if (stencilFailOpFront !== undefined) this.stencilFailOpFront = stencilFailOpFront;
        if (stencilZFailOpFront !== undefined) this.stencilZFailOpFront = stencilZFailOpFront;
        if (stencilPassOpFront !== undefined) this.stencilPassOpFront = stencilPassOpFront;
        if (stencilRefFront !== undefined) this.stencilRefFront = stencilRefFront;
        if (stencilTestBack !== undefined) this.stencilTestBack = stencilTestBack;
        if (stencilFuncBack !== undefined) this.stencilFuncBack = stencilFuncBack;
        if (stencilReadMaskBack !== undefined) this.stencilReadMaskBack = stencilReadMaskBack;
        if (stencilWriteMaskBack !== undefined) this.stencilWriteMaskBack = stencilWriteMaskBack;
        if (stencilFailOpBack !== undefined) this.stencilFailOpBack = stencilFailOpBack;
        if (stencilZFailOpBack !== undefined) this.stencilZFailOpBack = stencilZFailOpBack;
        if (stencilPassOpBack !== undefined) this.stencilPassOpBack = stencilPassOpBack;
        if (stencilRefBack !== undefined) this.stencilRefBack = stencilRefBack;
    }
}

/**
 * @en GFX blend target.
 * @zh GFX 混合目标。
 */
export class BlendTarget {
    protected _nativeObj;
    protected _blend: boolean = false;
    protected _blendSrc: BlendFactor = BlendFactor.ONE;
    protected _blendDst: BlendFactor = BlendFactor.ZERO;
    protected _blendEq: BlendOp = BlendOp.ADD;
    protected _blendSrcAlpha: BlendFactor = BlendFactor.ONE;
    protected _blendDstAlpha: BlendFactor = BlendFactor.ZERO;
    protected _blendAlphaEq: BlendOp = BlendOp.ADD;
    protected _blendColorMask: ColorMask = ColorMask.ALL;
    get native () {
        return this._nativeObj;
    }

    constructor (
        blend: boolean = false,
        blendSrc: BlendFactor = BlendFactor.ONE,
        blendDst: BlendFactor = BlendFactor.ZERO,
        blendEq: BlendOp = BlendOp.ADD,
        blendSrcAlpha: BlendFactor = BlendFactor.ONE,
        blendDstAlpha: BlendFactor = BlendFactor.ZERO,
        blendAlphaEq: BlendOp = BlendOp.ADD,
        blendColorMask: ColorMask = ColorMask.ALL,
    ) {
        this._nativeObj = new gfx.BlendTarget();
        this.assignProperties(blend, blendSrc, blendDst, blendEq,
            blendSrcAlpha, blendDstAlpha, blendAlphaEq, blendColorMask);
    }

    get blend (): boolean {
        return this._blend;
    }
    set blend (val: boolean) {
        this._blend = val;
        this._nativeObj.blend = val;
    }
    get blendSrc (): BlendFactor { return this._blendSrc; }
    set blendSrc (val: BlendFactor) {
        this._blendSrc = val;
        this._nativeObj.blendSrc = val;
    }
    get blendDst () { return this._blendDst; }
    set blendDst (val: BlendFactor) {
        this._blendDst = val;
        this._nativeObj.blendDst = val;
    }
    get blendEq (): BlendOp { return this._blendEq; }
    set blendEq (val: BlendOp) {
        this._blendEq = val;
        this._nativeObj.blendEq = val;
    }
    get blendSrcAlpha (): BlendFactor { return this._blendSrcAlpha; }
    set blendSrcAlpha (val: BlendFactor) {
        this._blendSrcAlpha = val;
        this._nativeObj.blendSrcAlpha = val;
    }
    get blendDstAlpha (): BlendFactor { return this._blendDstAlpha; }
    set blendDstAlpha (val: BlendFactor) {
        this._blendDstAlpha = val;
        this._nativeObj.blendDstAlpha = val;
    }
    get blendAlphaEq (): BlendOp { return this._blendAlphaEq; }
    set blendAlphaEq (val: BlendOp) {
        this._blendAlphaEq = val;
        this._nativeObj.blendAlphaEq = val;
    }
    get blendColorMask (): ColorMask { return this._blendColorMask; }
    set blendColorMask (val: ColorMask) {
        this._blendColorMask = val;
        this._nativeObj.blendColorMask = val;
    }

    public reset () {
        this.assignProperties(false, BlendFactor.ONE, BlendFactor.ZERO, BlendOp.ADD,
            BlendFactor.ONE, BlendFactor.ZERO, BlendOp.ADD, ColorMask.ALL);
    }

    public destroy () {
        this._nativeObj = null;
    }

    public assign (target: RecursivePartial<BlendTarget>) {
        if (!target) return;
        this.assignProperties(target.blend, target.blendSrc, target.blendDst, target.blendEq,
            target.blendSrcAlpha, target.blendDstAlpha, target.blendAlphaEq, target.blendColorMask);
    }

    private assignProperties (
        blend?: boolean,
        blendSrc?: BlendFactor,
        blendDst?: BlendFactor,
        blendEq?: BlendOp,
        blendSrcAlpha?: BlendFactor,
        blendDstAlpha?: BlendFactor,
        blendAlphaEq?: BlendOp,
        blendColorMask?: ColorMask
    ) {
        if (blend !== undefined) this.blend = blend;
        if (blendSrc !== undefined) this.blendSrc = blendSrc;
        if (blendDst !== undefined) this.blendDst = blendDst;
        if (blendEq !== undefined) this.blendEq = blendEq;
        if (blendSrcAlpha !== undefined) this.blendSrcAlpha = blendSrcAlpha;
        if (blendDstAlpha !== undefined) this.blendDstAlpha = blendDstAlpha;
        if (blendAlphaEq !== undefined) this.blendAlphaEq = blendAlphaEq;
        if (blendColorMask !== undefined) this.blendColorMask = blendColorMask;
    }
}

function watchArrayElementsField<S, T> (self: S, list: T[], eleField: string, cachedFieldName: string, callback: (self: S, idx: number, originTarget: T, prop: symbol | string, value: any) => void) {
    for (let i = 0, l = list.length; i < l; i++) {
        let ele = list[i] as any;
        let originField = ele[eleField][cachedFieldName] || ele[eleField];
        // replace with Proxy
        ele[eleField] = new Proxy(originField, {
            get: (originTarget, key: string | symbol) => {
                if (key === cachedFieldName) {
                    return originTarget;
                }
                return Reflect.get(originTarget, key);
            },
            set: (originTarget, prop, value) => {
                Reflect.set(originTarget, prop, value);
                callback(self, i, originTarget, prop, value);
                return true;
            }
        });
    }
}


export class BlendState {
    protected targets: BlendTarget[];
    protected _blendColor: Color;
    protected _nativeObj;
    protected _isA2C: boolean = false;
    protected _isIndepend: boolean = false;

    get native () {
        return this._nativeObj;
    }

    private _setTargets (targets: BlendTarget[]) {
        this.targets = targets;

        const CACHED_FIELD_NAME = `$__nativeObj`;
        this._syncTargetsToNativeObj(CACHED_FIELD_NAME);

        // watch target[i]._nativeObj fields update 
        watchArrayElementsField(this, this.targets, "_nativeObj", CACHED_FIELD_NAME, (self, _idx, _originTarget, _prop, _value) => {
            self._syncTargetsToNativeObj(CACHED_FIELD_NAME);
        });
    }

    private _syncTargetsToNativeObj (cachedFieldName: string) {
        const nativeTars = this.targets.map(target => { return target.native[cachedFieldName] || target.native; });
        this._nativeObj.targets = nativeTars;
    }

    constructor (
        isA2C: boolean = false,
        isIndepend: boolean = false,
        blendColor: Color = new Color(),
        targets: BlendTarget[] = [new BlendTarget()],
    ) {
        this._nativeObj = BSPool.alloc(null);
        this._setTargets(targets);
        this.blendColor = blendColor;
        this.isA2c = isA2C;
        this.isIndepend = isIndepend;
    }

    get isA2c (): boolean {
        return this._isA2C;
    }
    set isA2c (val: boolean) {
        this._isA2C = val;
        this._nativeObj.isA2C = val;
    }
    get isIndepend (): boolean {
        return this._isIndepend;
    }
    set isIndepend (val: boolean) {
        this._isIndepend = val;
        this._nativeObj.isIndepend = val;
    }
    get blendColor (): Color { return this._blendColor; }
    set blendColor (color: Color) {
        this._blendColor = color;
        this._nativeObj.blendColor = color;
    }

    /**
     * @en Should use this function to set target, or it will not work
     * on native platforms, as native can not support this feature,
     * such as `blendState[i] = target;`.
     *
     * @param index The index to set target.
     * @param target The target to be set.
     */
    public setTarget (index: number, target: RecursivePartial<BlendTarget>) {
        let tg = this.targets[index];
        if (!tg) {
            tg = this.targets[index] = new BlendTarget();
        }
        tg.assign(target);
        // TODO: define setTarget function
        this._setTargets(this.targets);
    }

    public reset () {
        this.isA2c = false;
        this.isIndepend = false;
        this.blendColor = new Color(0, 0, 0, 0);

        const targets = this.targets;
        for (let i = 1, len = targets.length; i < len; ++i) {
            targets[i].destroy();
        }
        targets.length = 1;
        targets[0].reset();
        this._setTargets(targets);
    }

    public destroy () {
        for (let i = 0, len = this.targets.length; i < len; ++i) {
            this.targets[i].destroy();
        }
        this.targets = null;
        if (this._nativeObj) {
            BSPool.free(this._nativeObj);
            this._nativeObj = null;
        }
    }
}

export const PipelineState = gfx.PipelineState;
export const PipelineStateInfo = gfx.PipelineStateInfo;
