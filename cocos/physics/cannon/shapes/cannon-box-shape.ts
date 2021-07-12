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
 * @hidden
 */

import CANNON from '@cocos/cannon';
import { clamp, Vec3 } from '../../../core/math';
import { commitShapeUpdates } from '../cannon-util';
import { CannonShape } from './cannon-shape';
import { IBoxShape } from '../../spec/i-physics-shape';
import { IVec3Like } from '../../../core/math/type-define';
import { BoxCollider, physics } from '../../../../exports/physics-framework';
import { absolute, VEC3_0 } from '../../utils/util';

export class CannonBoxShape extends CannonShape implements IBoxShape {
    public get collider () {
        return this._collider as BoxCollider;
    }

    public get impl () {
        return this._shape as CANNON.Box;
    }

    readonly halfExtent: CANNON.Vec3;
    constructor () {
        super();
        this.halfExtent = new CANNON.Vec3(0.5, 0.5, 0.5);
        this._shape = new CANNON.Box(this.halfExtent.clone());
    }

    setSize (v: IVec3Like) {
        Vec3.multiplyScalar(this.halfExtent, v, 0.5);
        const ws = absolute(VEC3_0.set(this.collider.node.worldScale));
        const x = this.halfExtent.x * ws.x;
        const y = this.halfExtent.y * ws.y;
        const z = this.halfExtent.z * ws.z;
        this.impl.halfExtents.x = clamp(x, physics.config.minVolumeSize, Number.MAX_VALUE);
        this.impl.halfExtents.y = clamp(y, physics.config.minVolumeSize, Number.MAX_VALUE);
        this.impl.halfExtents.z = clamp(z, physics.config.minVolumeSize, Number.MAX_VALUE);
        this.impl.updateConvexPolyhedronRepresentation();
        if (this._index !== -1) {
            commitShapeUpdates(this._body);
        }
    }

    onLoad () {
        super.onLoad();
        this.setSize(this.collider.size);
    }

    setScale (scale: Vec3): void {
        super.setScale(scale);
        this.setSize(this.collider.size);
    }
}
