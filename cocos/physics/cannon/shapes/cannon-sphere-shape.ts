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
import { absMaxComponent, clamp, Vec3 } from '../../../core/math';
import { commitShapeUpdates } from '../cannon-util';
import { CannonShape } from './cannon-shape';
import { ISphereShape } from '../../spec/i-physics-shape';
import { physics, SphereCollider } from '../../../../exports/physics-framework';

export class CannonSphereShape extends CannonShape implements ISphereShape {
    get collider () {
        return this._collider as SphereCollider;
    }

    get impl () {
        return this._shape as CANNON.Sphere;
    }

    setRadius (v: number) {
        const max = Math.abs(absMaxComponent(this.collider.node.worldScale));
        this.impl.radius = clamp(v * max, physics.config.minVolumeSize, Number.MAX_VALUE);
        this.impl.updateBoundingSphereRadius();
        if (this._index !== -1) {
            commitShapeUpdates(this._body);
        }
    }

    constructor (radius = 0.5) {
        super();
        this._shape = new CANNON.Sphere(radius);
    }

    onLoad () {
        super.onLoad();
        this.setRadius(this.collider.radius);
    }

    setScale (scale: Vec3): void {
        super.setScale(scale);
        this.setRadius(this.collider.radius);
    }
}
