/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

import {createMap, getClassName, clear} from '../utils/js';
import { legacyCC } from '../global-exports';
import { log } from '../platform/debug';

let _tmpInfo: any = null;

function getItemDesc (item) {
    if (item.uuid) {
        if (!_tmpInfo) {
            _tmpInfo = { path: "", type: null };
        }
        if (legacyCC.loader._assetTables.assets._getInfo_DEBUG(item.uuid, _tmpInfo)) {
            _tmpInfo.path = 'resources/' + _tmpInfo.path;
            return `"${_tmpInfo.path}" (type: ${getClassName(_tmpInfo.type)}, uuid: ${item.uuid})`;
        }
        else {
            return `"${item.rawUrl}" (${item.uuid})`;
        }
    }
    else {
        return `"${item.rawUrl}"`;
    }
}

function doCheckCouldRelease (releasedKey, refOwnerItem, caches) {
    var loadedAgain = caches[releasedKey];
    if (!loadedAgain) {
        log(`"${releasedKey}" was released but maybe still referenced by ${getItemDesc(refOwnerItem)}`);
    }
}

// checks if asset was releasable

export default class ReleasedAssetChecker {
    private _releasedKeys;
    private _dirty;
    constructor () {
        // { dependKey: true }
        this._releasedKeys = createMap(true);
        this._dirty = false;
    }

    // mark as released for further checking dependencies
    setReleased (item, releasedKey) {
        this._releasedKeys[releasedKey] = true;
        this._dirty = true;
    }

    // check dependencies
    checkCouldRelease (caches) {
        if (!this._dirty) {
            return;
        }
        this._dirty = false;

        var released = this._releasedKeys;

        // check loader cache
        for (let id in caches) {
            var item = caches[id];
            if (item.alias) {
                item = item.alias;
            }
            let depends = item.dependKeys;
            if (depends) {
                for (let i = 0; i < depends.length; ++i) {
                    let depend = depends[i];
                    if (released[depend]) {
                        doCheckCouldRelease(depend, item, caches);
                        delete released[depend];
                    }
                }
            }
        }

        // // check current scene
        // let depends = director.getScene().dependAssets;
        // for (let i = 0; i < depends.length; ++i) {
        //     let depend = depends[i];
        //     if (released[depend]) {
        //         doCheckCouldRelease(depend, item, caches);
        //         delete released[depend];
        //     }
        // }

        // clear released
        clear(released);
    }
}