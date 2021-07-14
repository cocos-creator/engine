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
 * @module particle
 */

import { ccclass, tooltip, displayOrder, type, formerlySerializedAs, serializable, visible } from 'cc.decorator';
import { Mat4, Quat, Vec2, Vec3, clamp, pingPong, random, randomRange, repeat, toDegree, toRadian } from '../../core/math';

import CurveRange from '../animator/curve-range';
import { ArcMode, EmitLocation, ShapeType } from '../enum';
import { fixedAngleUnitVector2, particleEmitZAxis, randomPointBetweenCircleAtFixedAngle, randomPointBetweenSphere,
    randomPointInCube, randomSign, randomSortArray, randomUnitVector } from '../particle-general-function';
import { ParticleSystem } from '../particle-system';

const _intermediVec = new Vec3(0, 0, 0);
const _intermediArr: number[] = [];
const _unitBoxExtent = new Vec3(0.5, 0.5, 0.5);

@ccclass('cc.ShapeModule')
export default class ShapeModule {
    /**
     * @zh 粒子发射器位置。
     */
    @displayOrder(13)
    @tooltip('i18n:shapeModule.position')
    get position () {
        return this._position;
    }
    set position (val) {
        this._position = val;
        this.constructMat();
    }

    /**
     * @zh 粒子发射器旋转角度。
     */
    @displayOrder(14)
    @tooltip('i18n:shapeModule.rotation')
    get rotation () {
        return this._rotation;
    }
    set rotation (val) {
        this._rotation = val;
        this.constructMat();
    }

    /**
     * @zh 粒子发射器缩放比例。
     */
    @displayOrder(15)
    @tooltip('i18n:shapeModule.scale')
    get scale () {
        return this._scale;
    }
    set scale (val) {
        this._scale = val;
        this.constructMat();
    }

    /**
     * @zh 粒子发射器在一个扇形范围内发射。
     */
    @displayOrder(6)
    @tooltip('i18n:shapeModule.arc')
    get arc () {
        return toDegree(this._arc);
    }

    set arc (val) {
        this._arc = toRadian(val);
    }

    /**
     * @zh 圆锥的轴与母线的夹角<bg>。
     * 决定圆锥发射器的开合程度。
     */
    @displayOrder(5)
    @tooltip('i18n:shapeModule.angle')
    get angle () {
        return Math.round(toDegree(this._angle) * 100) / 100;
    }

    set angle (val) {
        this._angle = toRadian(val);
    }

    @serializable
    private _enable = false;
    /**
     * @zh 是否启用。
     */
    @displayOrder(0)
    public get enable () {
        return this._enable;
    }

    public set enable (val) {
        this._enable = val;
    }

    /**
     * @zh 粒子发射器类型 [[ShapeType]]。
     */
    @type(ShapeType)
    @formerlySerializedAs('shapeType')
    @displayOrder(1)
    public _shapeType = ShapeType.Cone;

    @type(ShapeType)
    @tooltip('i18n:shapeModule.shapeType')
    public get shapeType () {
        return this._shapeType;
    }

    public set shapeType (val) {
        this._shapeType = val;
        switch (this._shapeType) {
        case ShapeType.Box:
            if (this.emitFrom === EmitLocation.Base) {
                this.emitFrom = EmitLocation.Volume;
            }
            break;
        case ShapeType.Cone:
            if (this.emitFrom === EmitLocation.Edge) {
                this.emitFrom = EmitLocation.Base;
            }
            break;
        case ShapeType.Sphere:
        case ShapeType.Hemisphere:
            if (this.emitFrom === EmitLocation.Base || this.emitFrom === EmitLocation.Edge) {
                this.emitFrom = EmitLocation.Volume;
            }
            break;
        default:
            break;
        }
    }

    /**
     * @zh 粒子从发射器哪个部位发射 [[EmitLocation]]。
     */
    @type(EmitLocation)
    @serializable
    @displayOrder(2)
    @tooltip('i18n:shapeModule.emitFrom')
    public emitFrom = EmitLocation.Volume;

    /**
     * @zh 根据粒子的初始方向决定粒子的移动方向。
     */
    @serializable
    @displayOrder(16)
    @tooltip('i18n:shapeModule.alignToDirection')
    public alignToDirection = false;

    /**
     * @zh 粒子生成方向随机设定。
     */
    @serializable
    @displayOrder(17)
    @tooltip('i18n:shapeModule.randomDirectionAmount')
    public randomDirectionAmount = 0;

    /**
     * @zh 表示当前发射方向与当前位置到结点中心连线方向的插值。
     */
    @serializable
    @displayOrder(18)
    @tooltip('i18n:shapeModule.sphericalDirectionAmount')
    public sphericalDirectionAmount = 0;

    /**
     * @zh 粒子生成位置随机设定（设定此值为非 0 会使粒子生成位置超出生成器大小范围）。
     */
    @serializable
    @displayOrder(19)
    @tooltip('i18n:shapeModule.randomPositionAmount')
    public randomPositionAmount = 0;

    /**
     * @zh 粒子发射器半径。
     */
    @serializable
    @displayOrder(3)
    @tooltip('i18n:shapeModule.radius')
    public radius = 1;

    /**
     * @zh 粒子发射器发射位置（对 Box 类型的发射器无效）：<bg>
     * - 0 表示从表面发射；
     * - 1 表示从中心发射；
     * - 0 ~ 1 之间表示在中心到表面之间发射。
     */
    @serializable
    @displayOrder(4)
    @tooltip('i18n:shapeModule.radiusThickness')
    public radiusThickness = 1;

    /**
     * @zh 粒子在扇形范围内的发射方式 [[ArcMode]]。
     */
    @type(ArcMode)
    @serializable
    @displayOrder(7)
    @tooltip('i18n:shapeModule.arcMode')
    public arcMode = ArcMode.Random;

    /**
     * @zh 控制可能产生粒子的弧周围的离散间隔。
     */
    @visible(function noArc (this: ShapeModule) { return this.arcMode !== ArcMode.Random; }) // Bug fix: Hide this input when arcMode is random
    @serializable
    @displayOrder(9)
    @tooltip('i18n:shapeModule.arcSpread')
    public arcSpread = 0;

    /**
     * @zh 粒子沿圆周发射的速度。
     */
    @type(CurveRange)
    @visible(function noArc (this: ShapeModule) { return this.arcMode !== ArcMode.Random; }) // Bug fix: Hide this input when arcMode is random
    @serializable
    @displayOrder(10)
    @tooltip('i18n:shapeModule.arcSpeed')
    public arcSpeed = new CurveRange();

    /**
     * @zh 圆锥顶部截面距离底部的轴长<bg>。
     * 决定圆锥发射器的高度。
     */
    @serializable
    @displayOrder(11)
    @tooltip('i18n:shapeModule.length')
    public length = 5;

    /**
     * @zh 粒子发射器发射位置（针对 Box 类型的粒子发射器）。
     */
    @serializable
    @displayOrder(12)
    @tooltip('i18n:shapeModule.boxThickness')
    public boxThickness = new Vec3(0, 0, 0);

    @serializable
    private _position = new Vec3(0, 0, 0);

    @serializable
    private _rotation = new Vec3(0, 0, 0);

    @serializable
    private _scale = new Vec3(1, 1, 1);

    @serializable
    private _arc = toRadian(360);

    @serializable
    private _angle = toRadian(25);

    private mat: Mat4;
    private quat: Quat;
    private particleSystem: any;
    private lastTime: number;
    private totalAngle: number;

    constructor () {
        this.mat = new Mat4();
        this.quat = new Quat();
        this.particleSystem = null;
        this.lastTime = 0;
        this.totalAngle = 0;
    }

    public onInit (ps: ParticleSystem) {
        this.particleSystem = ps;
        this.constructMat();
        this.lastTime = this.particleSystem._time;
    }

    public emit (p) {
        switch (this.shapeType) {
        case ShapeType.Box:
            boxEmit(this.emitFrom, this.boxThickness, p.position, p.velocity);
            break;
        case ShapeType.Circle:
            circleEmit(this.radius, this.radiusThickness, this.generateArcAngle(), p.position, p.velocity);
            break;
        case ShapeType.Cone:
            coneEmit(this.emitFrom, this.radius, this.radiusThickness, this.generateArcAngle(), this._angle, this.length, p.position, p.velocity);
            break;
        case ShapeType.Sphere:
            sphereEmit(this.emitFrom, this.radius, this.radiusThickness, p.position, p.velocity);
            break;
        case ShapeType.Hemisphere:
            hemisphereEmit(this.emitFrom, this.radius, this.radiusThickness, p.position, p.velocity);
            break;
        default:
            console.warn(`${this.shapeType} shapeType is not supported by ShapeModule.`);
        }
        if (this.randomPositionAmount > 0) {
            p.position.x += randomRange(-this.randomPositionAmount, this.randomPositionAmount);
            p.position.y += randomRange(-this.randomPositionAmount, this.randomPositionAmount);
            p.position.z += randomRange(-this.randomPositionAmount, this.randomPositionAmount);
        }
        Vec3.transformQuat(p.velocity, p.velocity, this.quat);
        Vec3.transformMat4(p.position, p.position, this.mat);
        if (this.sphericalDirectionAmount > 0) {
            const sphericalVel = Vec3.normalize(_intermediVec, p.position);
            Vec3.lerp(p.velocity, p.velocity, sphericalVel, this.sphericalDirectionAmount);
        }
        this.lastTime = this.particleSystem._time;
    }

    private constructMat () {
        Quat.fromEuler(this.quat, this._rotation.x, this._rotation.y, this._rotation.z);
        Mat4.fromRTS(this.mat, this.quat, this._position, this._scale);
    }

    private generateArcAngle () {
        if (this.arcMode === ArcMode.Random) {
            return randomRange(0, this._arc);
        }
        let angle = this.totalAngle + 2 * Math.PI * this.arcSpeed.evaluate(this.particleSystem._time, 1)! * (this.particleSystem._time - this.lastTime);
        this.totalAngle = angle;
        if (this.arcSpread !== 0) {
            angle = Math.floor(angle / (this._arc * this.arcSpread)) * this._arc * this.arcSpread;
        }
        switch (this.arcMode) {
        case ArcMode.Loop:
            return repeat(angle, this._arc);
        case ArcMode.PingPong:
            return pingPong(angle, this._arc);
        default:
            return repeat(angle, this._arc);
        }
    }
}

function sphereEmit (emitFrom, radius, radiusThickness, pos, dir) {
    switch (emitFrom) {
    case EmitLocation.Volume:
        randomPointBetweenSphere(pos, radius * (1 - radiusThickness), radius);
        Vec3.normalize(dir, pos);
        break;
    case EmitLocation.Shell:
        randomUnitVector(pos);
        Vec3.multiplyScalar(pos, pos, radius);
        Vec3.normalize(dir, pos);
        break;
    default:
        console.warn(`${emitFrom} is not supported for sphere emitter.`);
    }
}

function hemisphereEmit (emitFrom, radius, radiusThickness, pos, dir) {
    switch (emitFrom) {
    case EmitLocation.Volume:
        randomPointBetweenSphere(pos, radius * (1 - radiusThickness), radius);
        if (pos.z > 0) {
            pos.z *= -1;
        }
        Vec3.normalize(dir, pos);
        break;
    case EmitLocation.Shell:
        randomUnitVector(pos);
        Vec3.multiplyScalar(pos, pos, radius);
        if (pos.z > 0) {
            pos.z *= -1;
        }
        Vec3.normalize(dir, pos);
        break;
    default:
        console.warn(`${emitFrom} is not supported for hemisphere emitter.`);
    }
}

function coneEmit (emitFrom, radius, radiusThickness, theta, angle, length, pos, dir) {
    switch (emitFrom) {
    case EmitLocation.Base:
        randomPointBetweenCircleAtFixedAngle(pos, radius * (1 - radiusThickness), radius, theta);
        Vec2.multiplyScalar(dir, pos, Math.sin(angle));
        dir.z = -Math.cos(angle) * radius;
        Vec3.normalize(dir, dir);
        pos.z = 0;
        break;
    case EmitLocation.Shell:
        fixedAngleUnitVector2(pos, theta);
        Vec2.multiplyScalar(dir, pos, Math.sin(angle));
        dir.z = -Math.cos(angle);
        Vec3.normalize(dir, dir);
        Vec2.multiplyScalar(pos, pos, radius);
        pos.z = 0;
        break;
    case EmitLocation.Volume:
        randomPointBetweenCircleAtFixedAngle(pos, radius * (1 - radiusThickness), radius, theta);
        Vec2.multiplyScalar(dir, pos, Math.sin(angle));
        dir.z = -Math.cos(angle) * radius;
        Vec3.normalize(dir, dir);
        pos.z = 0;
        Vec3.add(pos, pos, Vec3.multiplyScalar(_intermediVec, dir, length * random() / -dir.z));
        break;
    default:
        console.warn(`${emitFrom} is not supported for cone emitter.`);
    }
}

function boxEmit (emitFrom, boxThickness, pos, dir) {
    switch (emitFrom) {
    case EmitLocation.Volume:
        randomPointInCube(pos, _unitBoxExtent);
        // randomPointBetweenCube(pos, vec3.multiply(_intermediVec, _unitBoxExtent, boxThickness), _unitBoxExtent);
        break;
    case EmitLocation.Shell:
        _intermediArr.splice(0, _intermediArr.length);
        _intermediArr.push(randomRange(-0.5, 0.5));
        _intermediArr.push(randomRange(-0.5, 0.5));
        _intermediArr.push(randomSign() * 0.5);
        randomSortArray(_intermediArr);
        applyBoxThickness(_intermediArr, boxThickness);
        Vec3.set(pos, _intermediArr[0], _intermediArr[1], _intermediArr[2]);
        break;
    case EmitLocation.Edge:
        _intermediArr.splice(0, _intermediArr.length);
        _intermediArr.push(randomRange(-0.5, 0.5));
        _intermediArr.push(randomSign() * 0.5);
        _intermediArr.push(randomSign() * 0.5);
        randomSortArray(_intermediArr);
        applyBoxThickness(_intermediArr, boxThickness);
        Vec3.set(pos, _intermediArr[0], _intermediArr[1], _intermediArr[2]);
        break;
    default:
        console.warn(`${emitFrom} is not supported for box emitter.`);
    }
    Vec3.copy(dir, particleEmitZAxis);
}

function circleEmit (radius, radiusThickness, theta, pos, dir) {
    randomPointBetweenCircleAtFixedAngle(pos, radius * (1 - radiusThickness), radius, theta);
    Vec3.normalize(dir, pos);
}

function applyBoxThickness (pos, thickness) {
    if (thickness.x > 0) {
        pos[0] += 0.5 * randomRange(-thickness.x, thickness.x);
        pos[0] = clamp(pos[0], -0.5, 0.5);
    }
    if (thickness.y > 0) {
        pos[1] += 0.5 * randomRange(-thickness.y, thickness.y);
        pos[1] = clamp(pos[1], -0.5, 0.5);
    }
    if (thickness.z > 0) {
        pos[2] += 0.5 * randomRange(-thickness.z, thickness.z);
        pos[2] = clamp(pos[2], -0.5, 0.5);
    }
}
