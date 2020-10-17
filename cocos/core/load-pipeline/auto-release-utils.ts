/*
 Copyright (c) 2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
 * @packageDocumentation
 * @hidden
 */

import {createMap} from '../utils/js';
import { RawAsset } from '../assets/raw-asset';
import { legacyCC } from '../global-exports';

function parseDepends (key, parsed) {
    let item = legacyCC.loader.getItem(key);
    if (item) {
        let depends = item.dependKeys;
        if (depends) {
            for (let i = 0; i < depends.length; i++) {
                let depend = depends[i];
                if ( !parsed[depend] ) {
                    parsed[depend] = true;
                    parseDepends(depend, parsed);
                }
            }
        }
    }
}

function visitAsset (asset, excludeMap) {
    // Skip assets generated programmatically or by user (e.g. label texture)
    if (!asset._uuid) {
        return;
    }
    let key = legacyCC.loader._getReferenceKey(asset);
    if ( !excludeMap[key] ) {
        excludeMap[key] = true;
        parseDepends(key, excludeMap);
    }
}

function visitComponent (comp, excludeMap) {
    let props = Object.getOwnPropertyNames(comp);
    for (let i = 0; i < props.length; i++) {
        let value = comp[props[i]];
        if (typeof value === 'object' && value) {
            if (Array.isArray(value)) {
                for (let j = 0; j < value.length; j++) {
                    let val = value[j];
                    if (val instanceof RawAsset) {
                        visitAsset(val, excludeMap);
                    }
                }
            }
            else if (!value.constructor || value.constructor === Object) {
                let keys = Object.getOwnPropertyNames(value);
                for (let j = 0; j < keys.length; j++) {
                    let val = value[keys[j]];
                    if (val instanceof RawAsset) {
                        visitAsset(val, excludeMap);
                    }
                }
            }
            else if (value instanceof RawAsset) {
                visitAsset(value, excludeMap);
            }
        }
    }
}

function visitNode (node, excludeMap) {
    for (let i = 0; i < node._components.length; i++) {
        visitComponent(node._components[i], excludeMap);
    }
    for (let i = 0; i < node._children.length; i++) {
        visitNode(node._children[i], excludeMap);
    }
}

// do auto release
export function autoRelease (oldSceneAssets, nextSceneAssets, persistNodes) {
    let releaseSettings = legacyCC.loader._autoReleaseSetting;
    let excludeMap = createMap();

    // collect next scene assets
    if (nextSceneAssets) {
        for (let i = 0; i < nextSceneAssets.length; i++) {
            excludeMap[nextSceneAssets[i]] = true;
        }
    }

    // collect assets used by persist nodes
    for (let i = 0; i < persistNodes.length; i++) {
        visitNode(persistNodes[i], excludeMap)
    }

    // remove ununsed scene assets
    if (oldSceneAssets) {
        for (let i = 0; i < oldSceneAssets.length; i++) {
            let key = oldSceneAssets[i];
            if (releaseSettings[key] !== false && !excludeMap[key]) {
                legacyCC.loader.release(key);
            }
        }
    }

    // remove auto release assets
    // (releasing asset will change _autoReleaseSetting, so don't use for-in)
    let keys = Object.keys(releaseSettings);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (releaseSettings[key] === true && !excludeMap[key]) {
            legacyCC.loader.release(key);
        }
    }
}

// get dependencies not including self
export function getDependsRecursively (key) {
    let depends = {};
    parseDepends(key, depends);
    return Object.keys(depends);
}