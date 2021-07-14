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
 * @module component
 */

import { ccclass, inspector, editorOnly, serializable, editable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { _getClassById } from '../utils/js';
import { BUILTIN_CLASSID_RE } from '../utils/misc';
import { Component } from './component';
import { legacyCC } from '../global-exports';
import { warnID } from '../platform/debug';

/**
 * @en
 * A temp fallback to contain the original component which can not be loaded.
 * @zh
 * 包含无法加载的原始组件的临时回退。
 */
@ccclass('cc.MissingScript')
@inspector('packages://inspector/inspectors/comps/missing-script.js')
export default class MissingScript extends Component {
    // _scriptUuid: {
    //    get: function () {
    //        var id = this._$erialized.__type__;
    //        if (EditorExtends.UuidUtils.isUuid(id)) {
    //            return EditorExtends.UuidUtils.decompressUuid(id);
    //        }
    //        return '';
    //    },
    // },

    /*
     * @param {string} id
     * @return {function} constructor
     */
    public static safeFindClass (id: string) {
        const cls = _getClassById(id);
        if (cls) {
            return cls;
        }
        legacyCC.deserialize.reportMissingClass(id);

        return undefined;
    }

    // the serialized data for original script object
    @serializable
    @editorOnly
    public _$erialized = null;

    constructor () {
        super();
    }

    public onLoad () {
        warnID(4600, this.node.name);
    }
}

legacyCC._MissingScript = MissingScript;
