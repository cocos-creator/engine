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
 * @module loader
 */

import { EDITOR } from 'internal:constants';
import { legacyCC } from '../global-exports';
import { errorID } from '../platform/debug';
import { extname, stripSep } from '../utils/path';

/**
 * @class url
 * @static
 */
let url = {

    /**
     * The base url of raw assets.
     * @private
     * @readOnly
     */
    _rawAssets: '',

    normalize: function (url) {
        if (url) {
            if (url.charCodeAt(0) === 46 && url.charCodeAt(1) === 47) {
                // strip './'
                url = url.slice(2);
            }
            else if (url.charCodeAt(0) === 47) {
                // strip '/'
                url = url.slice(1);
            }
        }
        return url;
    },

    /**
     * Returns the url of raw assets, you will only need this if the raw asset is inside the "resources" folder.
     *
     * @method raw
     * @param {String} url
     * @return {String}
     * @example {@link cocos/core/platform/url/raw.js}
     */
    raw: function (url) {
        if (EDITOR && !this._rawAssets) {
            errorID(7000);
            return '';
        }

        url = this.normalize(url);

        if ( !url.startsWith('resources/') ) {
            errorID(EDITOR ? 7001 : 7002, url);
        }
        else {
            // Compatible with versions lower than 1.10
            var uuid = legacyCC.loader._getResUuid(url.slice(10), legacyCC.Asset, null, true);
            if (uuid) {
                return legacyCC.AssetLibrary.getLibUrlNoExt(uuid, true) + extname(url);
            }
        }

        return this._rawAssets + url;
    },

    _init: function (assets) {
        this._rawAssets = stripSep(assets) + '/';
    }
}

legacyCC.url = url;

export default url;
