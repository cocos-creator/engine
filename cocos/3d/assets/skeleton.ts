/****************************************************************************
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
 ****************************************************************************/

import { _decorator } from '../../core/data';
const { ccclass, property } = _decorator;
import { Asset } from '../../assets/asset';
import { Node } from '../../scene-graph/node';

/**
 * CLASS Skeleton
 * The skeleton class represent a kind of deformation.
 * A skeleton consists of a forest hierachy of nodes.
 * Some of the nodes, called joints, have special meanings.
 * Skeletons are not mutable, but they can be instantiated
 * to produce a skeleton instance. Skeleton instances can be modified,
 * for example, be animated.
 */
@ccclass('cc.Skeleton')
export default class Skeleton extends Asset {
    /**
     * The path of joints.
     */
    @property([String])
    private _joints: string[] = [];

    /**
     * The inverse bind matrices of joints.
     */
    @property([Node])
    private _bindposes: Node[] = [];

    /**
     * Gets the bind pose matrices of joints.
     */
    get bindposes () {
        return this._bindposes;
    }

    /**
     * Sets the bind pose matrices of joints.
     */
    set bindposes (value) {
        this._bindposes = value;
    }

    /**
     * Gets the paths of joints.
     */
    get joints () {
        return this._joints;
    }

    /**
     * Sets the paths of joints.
     */
    set joints (value) {
        this._joints = value;
    }
}

// tslint:disable-next-line
cc['Skeleton'] = Skeleton;
