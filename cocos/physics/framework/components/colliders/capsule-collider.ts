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
 * @module physics
 */

import {
    ccclass,
    help,
    executeInEditMode,
    menu,
    tooltip,
    type,
    serializable,
} from 'cc.decorator';
import { EDITOR, TEST } from 'internal:constants';
import { Collider } from './collider';
import { ICapsuleShape } from '../../../spec/i-physics-shape';
import { EAxisDirection, EColliderType } from '../../physics-enum';
import { absMax } from '../../../../core';

/**
 * @en
 * Capsule collider component.
 * @zh
 * 胶囊体碰撞器。
 */
@ccclass('cc.CapsuleCollider')
@help('i18n:cc.CapsuleCollider')
@menu('Physics/CapsuleCollider')
@executeInEditMode
export class CapsuleCollider extends Collider {
    /// PUBLIC PROPERTY GETTER\SETTER ///

    /**
     * @en
     * Gets or sets the radius of the sphere on the capsule body, in local space.
     * @zh
     * 获取或设置胶囊体在本地坐标系下的球半径。
     */
    @tooltip('i18n:physics3d.collider.capsule_radius')
    public get radius () {
        return this._radius;
    }

    public set radius (value) {
        if (this._radius === value) return;
        this._radius = Math.abs(value);
        if (this._shape) {
            this.shape.setRadius(value);
        }
    }

    /**
     * @en
     * Gets or sets the cylinder on the capsule body is at the corresponding axial height, in local space.
     * @zh
     * 获取或设置在本地坐标系下的胶囊体上圆柱体的高度。
     */
    @tooltip('i18n:physics3d.collider.capsule_cylinderHeight')
    public get cylinderHeight () {
        return this._cylinderHeight;
    }

    public set cylinderHeight (value) {
        if (this._cylinderHeight === value) return;
        this._cylinderHeight = Math.abs(value);
        if (this._shape) {
            this.shape.setCylinderHeight(value);
        }
    }

    /**
     * @en
     * Gets or sets the capsule direction, in local space.
     * @zh
     * 获取或设置在本地坐标系下胶囊体的方向。
     */
    @type(EAxisDirection)
    @tooltip('i18n:physics3d.collider.capsule_direction')
    public get direction () {
        return this._direction;
    }

    public set direction (value: EAxisDirection) {
        value = Math.floor(value);
        if (value < EAxisDirection.X_AXIS || value > EAxisDirection.Z_AXIS) return;
        if (this._direction === value) return;
        this._direction = value;
        if (!EDITOR && !TEST) {
            this.shape.setDirection(value);
        }
    }

    /**
     * @en
     * Gets or sets the capsule height, in local space, with the minimum value being the diameter of the sphere.
     * @zh
     * 获取或设置在本地坐标系下胶囊体的高度，最小值为球的直径。
     */
    public get height () {
        return this._radius * 2 + this._cylinderHeight;
    }

    public set height (value) {
        let ch = value - this._radius * 2;
        if (ch < 0) ch = 0;
        this.cylinderHeight = ch;
    }

    /**
     * @en
     * Gets the capsule body is at the corresponding axial height, in world space.
     * @zh
     * 获取胶囊体在世界坐标系下相应胶囊体朝向上的高度，只读属性。
     */
    public get worldHeight () {
        return this._radius * 2 * this._getRadiusScale() + this._cylinderHeight * this._getHeightScale();
    }

    /**
     * @en
     * Gets the wrapper object, through which the lowLevel instance can be accessed.
     * @zh
     * 获取封装对象，通过此对象可以访问到底层实例。
     */
    public get shape () {
        return this._shape as ICapsuleShape;
    }

    /// PRIVATE PROPERTY ///

    @serializable
    private _radius = 0.5;

    @serializable
    private _cylinderHeight = 1;

    @serializable
    private _direction = EAxisDirection.Y_AXIS;

    constructor () {
        super(EColliderType.CAPSULE);
    }

    private _getRadiusScale () {
        if (this.node == null) return 1;
        const ws = this.node.worldScale;
        if (this._direction === EAxisDirection.Y_AXIS) return Math.abs(absMax(ws.x, ws.z));
        if (this._direction === EAxisDirection.X_AXIS) return Math.abs(absMax(ws.y, ws.z));
        return Math.abs(absMax(ws.x, ws.y));
    }

    private _getHeightScale () {
        if (this.node == null) return 1;
        const ws = this.node.worldScale;
        if (this._direction === EAxisDirection.Y_AXIS) return Math.abs(ws.y);
        if (this._direction === EAxisDirection.X_AXIS) return Math.abs(ws.x);
        return Math.abs(ws.z);
    }
}
