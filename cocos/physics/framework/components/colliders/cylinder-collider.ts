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
import { ICylinderShape } from '../../../spec/i-physics-shape';
import { EAxisDirection, EColliderType } from '../../physics-enum';

/**
 * @en
 * Cylinder collider component.
 * @zh
 * 圆柱体碰撞器。
 */
@ccclass('cc.CylinderCollider')
@help('i18n:cc.CylinderCollider')
@menu('Physics/CylinderCollider')
@executeInEditMode
export class CylinderCollider extends Collider {
    /// PUBLIC PROPERTY GETTER\SETTER ///

    /**
     * @en
     * Gets or sets the radius of the circle on the cylinder body, in local space.
     * @zh
     * 获取或设置圆柱体上圆面半径。
     */
    @tooltip('i18n:physics3d.collider.cylinder_radius')
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
     * Gets or sets the cylinder body is at the corresponding axial height, in local space.
     * @zh
     * 获取或设置圆柱体在相应轴向的高度。
     */
    @tooltip('i18n:physics3d.collider.cylinder_height')
    public get height () {
        return this._height;
    }

    public set height (value) {
        if (this._height === value) return;
        this._height = Math.abs(value);
        if (this._shape) {
            this.shape.setHeight(value);
        }
    }

    /**
     * @en
     * Gets or sets the cylinder direction, in local space.
     * @zh
     * 获取或设置在圆柱体本地空间上的方向。
     */
    @type(EAxisDirection)
    @tooltip('i18n:physics3d.collider.cylinder_direction')
    public get direction () {
        return this._direction;
    }

    public set direction (value: EAxisDirection) {
        if (this._direction === value) return;
        if (value < EAxisDirection.X_AXIS || value > EAxisDirection.Z_AXIS) return;
        this._direction = value;
        if (!EDITOR && !TEST) {
            this.shape.setDirection(value);
        }
    }

    public get shape () {
        return this._shape as ICylinderShape;
    }

    /// PRIVATE PROPERTY ///

    @serializable
    private _radius = 0.5;

    @serializable
    private _height = 2;

    @serializable
    private _direction = EAxisDirection.Y_AXIS;

    constructor () {
        super(EColliderType.CYLINDER);
    }
}
