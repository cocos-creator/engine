// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

import gfx from '../gfx';
import enums from '../enums';
import ValueType from '../../core/value-types/value-type';

export default class Pass {
    constructor (name, detailName, programName, stage, properties = {}, defines = {}) {
        this._name = name;
        this._detailName = detailName;
        this._programName = programName;
        this._programKey = null;
        this._stage = stage;
        this._properties = properties;
        this._defines = defines;

        this._propertyNames = Object.keys(properties)
        this._defineNames = Object.keys(defines)

        // cullmode
        this._cullMode = gfx.CULL_BACK;

        // blending
        this._blend = false;
        this._blendEq = gfx.BLEND_FUNC_ADD;
        this._blendAlphaEq = gfx.BLEND_FUNC_ADD;
        this._blendSrc = gfx.BLEND_SRC_ALPHA;
        this._blendDst = gfx.BLEND_ONE_MINUS_SRC_ALPHA;
        this._blendSrcAlpha = gfx.BLEND_SRC_ALPHA;
        this._blendDstAlpha = gfx.BLEND_ONE_MINUS_SRC_ALPHA;
        this._blendColor = 0xffffffff;

        // depth
        this._depthTest = false;
        this._depthWrite = false;
        this._depthFunc = gfx.DS_FUNC_LESS,

        // stencil
        this._stencilTest = gfx.STENCIL_INHERIT;

        // front
        this._stencilFuncFront = gfx.DS_FUNC_ALWAYS;
        this._stencilRefFront = 0;
        this._stencilMaskFront = 0xff;
        this._stencilFailOpFront = gfx.STENCIL_OP_KEEP;
        this._stencilZFailOpFront = gfx.STENCIL_OP_KEEP;
        this._stencilZPassOpFront = gfx.STENCIL_OP_KEEP;
        this._stencilWriteMaskFront = 0xff;
        // back
        this._stencilFuncBack = gfx.DS_FUNC_ALWAYS;
        this._stencilRefBack = 0;
        this._stencilMaskBack = 0xff;
        this._stencilFailOpBack = gfx.STENCIL_OP_KEEP;
        this._stencilZFailOpBack = gfx.STENCIL_OP_KEEP;
        this._stencilZPassOpBack = gfx.STENCIL_OP_KEEP;
        this._stencilWriteMaskBack = 0xff;
    }

    setCullMode (cullMode = gfx.CULL_BACK) {
        this._cullMode = cullMode;
    }

    setBlend (
        enabled = false,
        blendEq = gfx.BLEND_FUNC_ADD,
        blendSrc = gfx.BLEND_SRC_ALPHA,
        blendDst = gfx.BLEND_ONE_MINUS_SRC_ALPHA,
        blendAlphaEq = gfx.BLEND_FUNC_ADD,
        blendSrcAlpha = gfx.BLEND_SRC_ALPHA,
        blendDstAlpha = gfx.BLEND_ONE_MINUS_SRC_ALPHA,
        blendColor = 0xffffffff
    ) {
        this._blend = enabled;
        this._blendEq = blendEq;
        this._blendSrc = blendSrc;
        this._blendDst = blendDst;
        this._blendAlphaEq = blendAlphaEq;
        this._blendSrcAlpha = blendSrcAlpha;
        this._blendDstAlpha = blendDstAlpha;
        this._blendColor = blendColor;
    }

    setDepth (
        depthTest = false,
        depthWrite = false,
        depthFunc = gfx.DS_FUNC_LESS
    ) {
        this._depthTest = depthTest;
        this._depthWrite = depthWrite;
        this._depthFunc = depthFunc;
    }

    setStencilFront (
        enabled = gfx.STENCIL_INHERIT,
        stencilFunc = gfx.DS_FUNC_ALWAYS,
        stencilRef = 0,
        stencilMask = 0xff,
        stencilFailOp = gfx.STENCIL_OP_KEEP,
        stencilZFailOp = gfx.STENCIL_OP_KEEP,
        stencilZPassOp = gfx.STENCIL_OP_KEEP,
        stencilWriteMask = 0xff
    ) {
        this._stencilTest = enabled === true ? gfx.STENCIL_ENABLE : enabled;
        this._stencilFuncFront = stencilFunc;
        this._stencilRefFront = stencilRef;
        this._stencilMaskFront = stencilMask;
        this._stencilFailOpFront = stencilFailOp;
        this._stencilZFailOpFront = stencilZFailOp;
        this._stencilZPassOpFront = stencilZPassOp;
        this._stencilWriteMaskFront = stencilWriteMask;
    }

    setStencilEnabled (stencilTest = gfx.STENCIL_INHERIT) {
        this._stencilTest = stencilTest;
    }

    setStencilBack (
        stencilTest = gfx.STENCIL_INHERIT,
        stencilFunc = gfx.DS_FUNC_ALWAYS,
        stencilRef = 0,
        stencilMask = 0xff,
        stencilFailOp = gfx.STENCIL_OP_KEEP,
        stencilZFailOp = gfx.STENCIL_OP_KEEP,
        stencilZPassOp = gfx.STENCIL_OP_KEEP,
        stencilWriteMask = 0xff
    ) {
        this._stencilTest = stencilTest === true ? gfx.STENCIL_ENABLE : stencilTest;
        this._stencilFuncBack = stencilFunc;
        this._stencilRefBack = stencilRef;
        this._stencilMaskBack = stencilMask;
        this._stencilFailOpBack = stencilFailOp;
        this._stencilZFailOpBack = stencilZFailOp;
        this._stencilZPassOpBack = stencilZPassOp;
        this._stencilWriteMaskBack = stencilWriteMask;
    }

    setStage (stage) {
        this._stage = stage;
    }

    setProperties (properties) {
        this._properties = properties;
    }

    getProperty (name) {
        if (!this._properties[name]) {
            return;
        }
        return this._properties[name].value;
    }

    setProperty (name, value, directly) {
        let prop = this._properties[name];
        if (!prop) {
            return false;
        }

        prop.directly = directly;

        if (Array.isArray(value)) {
            let array = prop.value;
            if (array.length !== value.length) {
                cc.warnID(9105, this._name, name);
                return;
            }
            for (let i = 0; i < value.length; i++) {
                array[i] = value[i];
            }
        }
        else {
            if (value && !ArrayBuffer.isView(value)) {
                if (prop.type === enums.PARAM_TEXTURE_2D) {
                    prop.value = value.getImpl();
                }
                else if (value instanceof ValueType) {
                    value.constructor.toArray(prop.value, value);
                }
                else {
                    if (typeof value === 'object') {
                        cc.warnID(9106, this._name, name);
                    }
                    prop.value = value;
                }
            }
            else {
                prop.value = value;
            }
        }

        return true;
    }

    getDefine (name) {
        return this._defines[name];
    }

    define (name, value, force) {
        let oldValue = this._defines[name];

        if (!force && oldValue === undefined) {
            return false;
        }

        if (oldValue !== value) {
            this._defines[name] = value;
            this._programKey = null;
        }

        return true;
    }

    clone () {
        let pass = new Pass(this._programName);
        Object.assign(pass, this);

        let newProperties = {};
        let properties = this._properties;
        for (let name in properties) {
            let prop = properties[name];
            let newProp = newProperties[name] = {};

            let value = prop.value;
            if (Array.isArray(value)) {
                newProp.value = value.concat();
            }
            else if (ArrayBuffer.isView(value)) {
                newProp.value = new value.__proto__.constructor(value);
            }
            else {
                newProp.value = value;
            }

            for (let name in prop) {
                if (name === 'value') continue;
                newProp[name] = prop[name];
            }
        }

        pass._properties = newProperties;
        pass._defines = Object.assign({}, this._defines);
        pass._propertyNames = this._propertyNames;
        pass._defineNames = this._defineNames;

        return pass;
    }
}
