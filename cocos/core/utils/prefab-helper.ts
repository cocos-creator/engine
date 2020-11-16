/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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

import { ccclass, serializable, editable } from 'cc.decorator';
import { Quat } from '../math';
import { EDITOR, SUPPORT_JIT } from 'internal:constants';
import { legacyCC } from '../global-exports';
import { errorID } from '../platform/debug';

@ccclass('cc.PrefabInfo')
export class PrefabInfo {
    // the most top node of this prefab in the scene
    @serializable
    @editable
    public root = null;

    // 所属的 prefab 资源对象 (cc.Prefab)
    // In Editor, only asset._uuid is usable because asset will be changed.
    @serializable
    @editable
    public asset = null;

    // 用来标识别该节点在 prefab 资源中的位置，因此这个 ID 只需要保证在 Assets 里不重复就行
    @serializable
    @editable
    public fileId = '';

    // Indicates whether this node should always synchronize with the prefab asset, only available in the root node
    @serializable
    @editable
    public sync = false;
}

legacyCC._PrefabInfo = PrefabInfo;

// update node to make it sync with prefab
export default function syncWithPrefab (node) {
    const _prefab = node._prefab;

    if (!_prefab.asset) {
        if (EDITOR) {
            // const NodeUtils = Editor.require('scene://utils/node');
            // const PrefabUtils = Editor.require('scene://utils/prefab');

            // cc.warn(Editor.T('MESSAGE.prefab.missing_prefab', { node: NodeUtils.getNodePath(node) }));
            // node.name += PrefabUtils.MISSING_PREFAB_SUFFIX;
        }
        else {
            errorID(3701, node.name);
        }
        node._prefab = null;
        return;
    }

    // save root's preserved props to avoid overwritten by prefab
    const _objFlags = node._objFlags;
    const _parent = node._parent;
    const _id = node._id;
    const _name = node._name;
    const _active = node._active;
    const x = node._position.x;
    const y = node._position.y;
    const _quat = node._quat;
    const _localZOrder = node._localZOrder;
    const _globalZOrder = node._globalZOrder;

    // instantiate prefab
    legacyCC.game._isCloning = true;
    if (SUPPORT_JIT) {
        _prefab.asset._doInstantiate(node);
    }
    else {
        // root in prefab asset is always synced
        const prefabRoot = _prefab.asset.data;

        // use node as the instantiated prefabRoot to make references to prefabRoot in prefab redirect to node
        prefabRoot._iN$t = node;

        // instantiate prefab and apply to node
        legacyCC.instantiate._clone(prefabRoot, prefabRoot);
    }
    legacyCC.game._isCloning = false;

    // restore preserved props
    node._objFlags = _objFlags;
    node._parent = _parent;
    node._id = _id;
    node._prefab = _prefab;
    node._name = _name;
    node._active = _active;
    node._position.x = x;
    node._position.y = y;
    Quat.copy(node._quat, _quat);
    node._localZOrder = _localZOrder;
    node._globalZOrder = _globalZOrder;
}

@ccclass('cc.CompPrefabInfo ')
export class CompPrefabInfo {
    // To identify current component in a prefab asset, so only needs to be unique.
    @serializable
    @editable
    public fileId = '';
}
