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

import { Color, Vec3, Mat4, Quat } from '../core/math';
import { ParticleSystem } from './particle-system';
import { IParticleSystemRenderer } from './renderer/particle-system-renderer-base';

export class Particle {
    public static INDENTIFY_NEG_QUAT = 10;
    public static R2D = 180.0 / Math.PI;

    public particleSystem: ParticleSystem;
    public position: Vec3;
    public velocity: Vec3;
    public animatedVelocity: Vec3;
    public ultimateVelocity: Vec3;
    public angularVelocity: Vec3;
    public axisOfRotation: Vec3;
    public rotation: Vec3;
    public startEuler: Vec3;
    public startRotation: Quat;
    public deletaQuat: Quat;
    public deletaMat: Mat4;
    public localMat: Mat4;
    public startSize: Vec3;
    public size: Vec3;
    public startColor: Color;
    public color: Color;
    public randomSeed: number; // uint
    public remainingLifetime: number;
    public startLifetime: number;
    public emitAccumulator0: number;
    public emitAccumulator1: number;
    public frameIndex: number;
    public startRow: number;

    constructor (particleSystem: any) {
        this.particleSystem = particleSystem;
        this.position = new Vec3(0, 0, 0);
        this.velocity = new Vec3(0, 0, 0);
        this.animatedVelocity = new Vec3(0, 0, 0);
        this.ultimateVelocity = new Vec3(0, 0, 0);
        this.angularVelocity = new Vec3(0, 0, 0);
        this.axisOfRotation = new Vec3(0, 0, 0);
        this.rotation = new Vec3(0, 0, 0);
        this.startEuler = new Vec3(0, 0, 0);
        this.startRotation = new Quat();
        this.deletaQuat = new Quat();
        this.deletaMat = new Mat4();
        this.localMat = new Mat4();
        this.startSize = new Vec3(0, 0, 0);
        this.size = new Vec3(0, 0, 0);
        this.startColor = Color.WHITE.clone();
        this.color = Color.WHITE.clone();
        this.randomSeed = 0; // uint
        this.remainingLifetime = 0.0;
        this.startLifetime = 0.0;
        this.emitAccumulator0 = 0.0;
        this.emitAccumulator1 = 0.0;
        this.frameIndex = 0.0;
        this.startRow = 0;
    }

    public reset () {
        this.rotation.set(0, 0, 0);
        this.startEuler.set(0, 0, 0);
        this.startRotation.set(0, 0, 0, 1);
        this.deletaQuat.set(0, 0, 0, 1);
        this.deletaMat.identity();
        this.localMat.identity();
    }
}

export const PARTICLE_MODULE_NAME = {
    COLOR: 'colorModule',
    FORCE: 'forceModule',
    LIMIT: 'limitModule',
    ROTATION: 'rotationModule',
    SIZE: 'sizeModule',
    VELOCITY: 'velocityModule',
    TEXTURE: 'textureModule',
};

export const PARTICLE_MODULE_ORDER = [
    'sizeModule',
    'colorModule',
    'forceModule',
    'velocityModule',
    'limitModule',
    'rotationModule',
    'textureModule',
];

export const PARTICLE_MODULE_PROPERTY = [
    '_colorOverLifetimeModule',
    '_shapeModule',
    '_sizeOvertimeModule',
    '_velocityOvertimeModule',
    '_forceOvertimeModule',
    '_limitVelocityOvertimeModule',
    '_rotationOvertimeModule',
    '_textureAnimationModule',
    '_trailModule',
];

export interface IParticleModule {
    target: IParticleSystemRenderer | null;
    needUpdate: boolean;
    needAnimate: boolean;
    name: string;
    bindTarget (target: any): void;
    update (space: number, trans: Mat4): void;
    animate (p: Particle, dt?: number): void;
}

export abstract class ParticleModuleBase implements IParticleModule {
    public target:IParticleSystemRenderer | null = null;
    public needUpdate = false;
    public needAnimate = true;

    public bindTarget (target: IParticleSystemRenderer) {
        this.target = target;
    }

    public update (space: number, trans: Mat4) {}
    public abstract name: string;
    public abstract animate (p: Particle, dt?: number): void;
}
