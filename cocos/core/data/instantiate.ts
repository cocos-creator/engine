﻿/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
 * @category core/data
 */

import { isDomNode } from '../utils/misc';
import { ValueType } from '../value-types';
import { CCObject } from './object';
import { js } from '../utils';
import { errorID, warn } from '../platform/debug';
import { DEV } from 'internal:constants';
import { legacyGlobalExports } from '../global-exports';

// @ts-ignore
const Destroyed = CCObject.Flags.Destroyed;
// @ts-ignore
const PersistentMask = CCObject.Flags.PersistentMask;

const objsToClearTmpVar: any = [];   // used to reset _iN$t variable

/**
 * @en Clones the object `original` and returns the clone, or instantiate a node from the Prefab.
 * @zh 克隆指定的任意类型的对象，或者从 Prefab 实例化出新节点。
 *
 * （Instantiate 时，function 和 dom 等非可序列化对象会直接保留原有引用，Asset 会直接进行浅拷贝，可序列化类型会进行深拷贝。）
 *
 * @method instantiate
 * @param {Prefab|Node|Object} original - An existing object that you want to make a copy of.
 * @return {Node|Object} the newly instantiated object
 * @example
 * ```typescript
 * // instantiate node from prefab
 * var scene = cc.director.getScene();
 * var node = cc.instantiate(prefabAsset);
 * node.parent = scene;
 * // clone node
 * var scene = cc.director.getScene();
 * var node = cc.instantiate(targetNode);
 * node.parent = scene;
 * ```
 */
function instantiate (original, internal_force?) {
    if (!internal_force) {
        if (typeof original !== 'object' || Array.isArray(original)) {
            if (DEV) {
                errorID(6900);
            }
            return null;
        }
        if (!original) {
            if (DEV) {
                errorID(6901);
            }
            return null;
        }
        if (!legacyGlobalExports.isValid(original)) {
            if (DEV) {
                errorID(6902);
            }
            return null;
        }
        if (DEV && original instanceof legacyGlobalExports.Component) {
            warn('Should not instantiate a single cc.Component directly, you must instantiate the entire node.');
        }
    }

    let clone;
    if (original instanceof CCObject) {
        original = original as CCObject;
        // Invoke _instantiate method if supplied.
        // The _instantiate callback will be called only on the root object, its associated object will not be called.
        // @callback associated
        // @param {Object} [instantiated] - If supplied, _instantiate just need to initialize the instantiated object,
        //                                  no need to create new object by itself.
        // @returns {Object} - the instantiated object
        if (original._instantiate) {
            legacyGlobalExports.game._isCloning = true;
            clone = original._instantiate();
            legacyGlobalExports.game._isCloning = false;
            return clone;
        }
        else if (original instanceof legacyGlobalExports.Asset) {
            // 不允许用通用方案实例化资源
            if (DEV) {
                errorID(6903);
            }
            return null;
        }
    }

    legacyGlobalExports.game._isCloning = true;
    clone = doInstantiate(original);
    legacyGlobalExports.game._isCloning = false;
    return clone;
}

/**
 * @en
 * Do instantiate object, the object to instantiate must be non-nil.
 * @zh
 * 这是一个通用的 instantiate 方法，可能效率比较低。
 * 之后可以给各种类型重写快速实例化的特殊实现，但应该在单元测试中将结果和这个方法的结果进行对比。
 * 值得注意的是，这个方法不可重入。
 *
 * @param {Object} obj - 该方法仅供内部使用，用户需负责保证参数合法。什么参数是合法的请参考 cc.instantiate 的实现。
 * @param {Node} [parent] - 只有在该对象下的场景物体会被克隆。
 * @return {Object}
 * @private
 */
function doInstantiate (obj, parent?) {
    if (Array.isArray(obj)) {
        if (DEV) {
            errorID(6904);
        }
        return null;
    }
    if (isDomNode && isDomNode(obj)) {
        if (DEV) {
            errorID(6905);
        }
        return null;
    }

    let clone;
    if (obj._iN$t) {
        // User can specify an existing object by assigning the "_iN$t" property.
        // enumerateObject will always push obj to objsToClearTmpVar
        clone = obj._iN$t;
    }
    else if (obj.constructor) {
        const klass = obj.constructor;
        clone = new klass();
    }
    else {
        clone = Object.create(null);
    }

    enumerateObject(obj, clone, parent);

    for (let i = 0, len = objsToClearTmpVar.length; i < len; ++i) {
        objsToClearTmpVar[i]._iN$t = null;
    }
    objsToClearTmpVar.length = 0;

    return clone;
}

// @param {Object} obj - The object to instantiate, typeof must be 'object' and should not be an array.

function enumerateCCClass (klass, obj, clone, parent) {
    const props = klass.__values__;
    // tslint:disable: prefer-for-of
    for (let p = 0; p < props.length; p++) {
        const key = props[p];
        const value = obj[key];
        if (typeof value === 'object' && value) {
            const initValue = clone[key];
            if (initValue instanceof ValueType &&
                initValue.constructor === value.constructor) {
                initValue.set(value);
            }
            else {
                clone[key] = value._iN$t || instantiateObj(value, parent);
            }
        }
        else {
            clone[key] = value;
        }
    }
}

function enumerateObject (obj, clone, parent) {
    // 目前使用“_iN$t”这个特殊字段来存实例化后的对象，这样做主要是为了防止循环引用
    // 注意，为了避免循环引用，所有新创建的实例，必须在赋值前被设为源对象的_iN$t
    js.value(obj, '_iN$t', clone, true);
    objsToClearTmpVar.push(obj);
    const klass = obj.constructor;
    if (legacyGlobalExports.Class._isCCClass(klass)) {
        enumerateCCClass(klass, obj, clone, parent);
    }
    else {
        // primitive javascript object
        for (const key in obj) {
            if (!obj.hasOwnProperty(key) ||
                (key.charCodeAt(0) === 95 && key.charCodeAt(1) === 95 &&   // starts with "__"
                 key !== '__type__')
            ) {
                continue;
            }
            const value = obj[key];
            if (typeof value === 'object' && value) {
                if (value === clone) {
                    continue;   // value is obj._iN$t
                }
                clone[key] = value._iN$t || instantiateObj(value, parent);
            }
            else {
                clone[key] = value;
            }
        }
    }
    if (obj instanceof CCObject) {
        clone._objFlags &= PersistentMask;
    }
}

/*
 * @param {Object|Array} obj - the original non-nil object, typeof must be 'object'
 * @return {Object|Array} - the original non-nil object, typeof must be 'object'
 */
function instantiateObj (obj, parent) {
    if (obj instanceof ValueType) {
        return obj.clone();
    }
    if (obj instanceof legacyGlobalExports.Asset) {
        // 所有资源直接引用，不需要拷贝
        return obj;
    }
    let clone;
    if (Array.isArray(obj)) {
        const len = obj.length;
        clone = new Array(len);
        // @ts-ignore
        obj._iN$t = clone;
        for (let i = 0; i < len; ++i) {
            const value = obj[i];
            if (typeof value === 'object' && value) {
                clone[i] = value._iN$t || instantiateObj(value, parent);
            }
            else {
                clone[i] = value;
            }
        }
        objsToClearTmpVar.push(obj);
        return clone;
    }
    else if (obj._objFlags & Destroyed) {
        // the same as cc.isValid(obj)
        return null;
    }

    const ctor = obj.constructor;
    if (legacyGlobalExports.Class._isCCClass(ctor)) {
        if (parent) {
            if (parent instanceof legacyGlobalExports.Component) {
                if (obj instanceof legacyGlobalExports._BaseNode || obj instanceof legacyGlobalExports.Component) {
                    return obj;
                }
            }
            else if (parent instanceof legacyGlobalExports._BaseNode) {
                if (obj instanceof legacyGlobalExports._BaseNode) {
                    if (!obj.isChildOf(parent)) {
                        // should not clone other nodes if not descendant
                        return obj;
                    }
                }
                else if (obj instanceof legacyGlobalExports.Component) {
                    if (!obj.node.isChildOf(parent)) {
                        // should not clone other component if not descendant
                        return obj;
                    }
                }
            }
        }
        clone = new ctor();
    }
    else if (ctor === Object) {
        clone = {};
    }
    else if (!ctor) {
        clone = Object.create(null);
    }
    else {
        // unknown type
        return obj;
    }
    enumerateObject(obj, clone, parent);
    return clone;
}

instantiate._clone = doInstantiate;
legacyGlobalExports.instantiate = instantiate;
export default instantiate;
