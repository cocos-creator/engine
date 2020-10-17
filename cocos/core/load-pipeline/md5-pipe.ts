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
 * @module loader
 */

import { Pipeline, IPipe } from './pipeline';
import { legacyCC } from '../global-exports';

const ID = 'MD5Pipe';
const ExtnameRegex = /(\.[^.\n\\/]*)$/;
const UuidRegex = /.*[/\\][0-9a-fA-F]{2}[/\\]([0-9a-fA-F-@]{8,}).*/;

function getUuidFromURL (url) {
    let matches = url.match(UuidRegex);
    if (matches) {
        return matches[1];
    }
    return "";
}

/**
 * @en The md5 pipe in {{loader}}, it can transform the url to the real url with md5 suffix
 * @zh {{loader}} 中的 md5 管道，可以将资源 url 转换到包含 md5 后缀版本
 */
export default class MD5Pipe implements IPipe {
    static ID = ID;

    public id = ID;
    public async = false;
    public pipeline = null;
    public md5AssetsMap;
    public md5NativeAssetsMap;
    public libraryBase;

    constructor (md5AssetsMap, md5NativeAssetsMap, libraryBase) {
        this.id = ID;
        this.async = false;
        this.pipeline = null;
        this.md5AssetsMap = md5AssetsMap;
        this.md5NativeAssetsMap = md5NativeAssetsMap;
        this.libraryBase = libraryBase;
    }

    handle (item) {
        let hashPatchInFolder = false;
        // HACK: explicitly use folder md5 for ttf files
        if (item.type === 'ttf') {
            hashPatchInFolder = true;
        }
        item.url = this.transformURL(item.url, hashPatchInFolder);
        return item;
    }

    /**
     * @en Transform an url to the real url with md5 suffix
     * @zh 将一个 url 转换到包含 md5 后缀版本
     * @param url The url to be parsed
     * @param hashPatchInFolder NA
     */
    transformURL (url, hashPatchInFolder?: boolean) {
        let uuid = getUuidFromURL(url);
        if (uuid) {
            let isNativeAsset = !url.match(this.libraryBase);
            let map = isNativeAsset ? this.md5NativeAssetsMap : this.md5AssetsMap;
            let hashValue = map[uuid];
            if (hashValue) {
                if (hashPatchInFolder) {
                    let dirname = legacyCC.path.dirname(url);
                    let basename = legacyCC.path.basename(url);
                    url = `${dirname}.${hashValue}/${basename}`;
                } else {
                    let matched = false;
                    url = url.replace(ExtnameRegex, (function(match, p1) {
                        matched = true;
                        return "." + hashValue + p1;
                    }));
                    if (!matched) {
                        url = url + "." + hashValue;
                    }
                }
            }
        }
        return url;
    }
}

// @ts-ignore
Pipeline.MD5Pipe = MD5Pipe;