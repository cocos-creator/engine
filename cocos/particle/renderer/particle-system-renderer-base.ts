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

import { Component } from '../../core';
import { Attribute } from '../../core/gfx';
import ParticleBatchModel from '../models/particle-batch-model';
import ParticleSystemRenderer from './particle-system-renderer-data';
import { Material } from '../../core/assets';
import { Particle, IParticleModule } from '../particle';
import { RenderMode } from '../enum';
import { legacyCC } from '../../core/global-exports';

export interface IParticleSystemRenderer {
    onInit (ps: Component): void;
    getInfo (): ParticleSystemRenderer;
    onEnable (): void;
    onDisable (): void;
    onDestroy (): void;
    clear (): void;
    attachToScene (): void;
    detachFromScene (): void;
    updateMaterialParams (): void;
    setVertexAttributes (): void;
    updateRenderMode (): void;
    onMaterialModified (index: number, material: Material): void;
    onRebuildPSO (index: number, material: Material) : void;
    getParticleCount (): number;
    getFreeParticle (): Particle | null;
    setNewParticle (p: Particle): void;
    updateParticles (dt: number): number;
    updateRenderData (): void;
    enableModule (name: string, val: boolean, pm: IParticleModule): void;
    updateTrailMaterial (): void;
    getDefaultTrailMaterial (): any;
    beforeRender (): void;
}

export abstract class ParticleSystemRendererBase implements IParticleSystemRenderer {
    protected _particleSystem: any = null;
    protected _model: ParticleBatchModel | null = null;
    protected _renderInfo: ParticleSystemRenderer | null = null;
    protected _vertAttrs: Attribute[] = [];

    constructor (info: ParticleSystemRenderer) {
        this._renderInfo = info;
    }

    public getInfo () {
        return this._renderInfo!;
    }

    public onInit (ps: Component) {
        this._particleSystem = ps;
    }

    public onEnable () {
        if (!this._particleSystem) {
            return;
        }
        this.attachToScene();
        const model = this._model;
        if (model) {
            model.node = model.transform = this._particleSystem.node;
            model.enabled = this._particleSystem.enabledInHierarchy;
        }
    }

    public onDisable () {
        this.detachFromScene();
    }

    public onDestroy () {
        if (this._model) {
            legacyCC.director.root.destroyModel(this._model);
            this._model = null;
        }
    }

    public attachToScene () {
        if (this._model) {
            if (this._model.scene) {
                this.detachFromScene();
            }
            this._particleSystem._getRenderScene().addModel(this._model);
        }
    }

    public detachFromScene () {
        if (this._model && this._model.scene) {
            this._model.scene.removeModel(this._model);
        }
    }

    public setVertexAttributes () {
        if (this._model) {
            this._model.setVertexAttributes(this._renderInfo!.renderMode === RenderMode.Mesh ? this._renderInfo!.mesh : null, this._vertAttrs);
        }
    }

    public clear () {
        if (this._model) this._model.enabled = false;
    }

    protected _initModel () {
        if (!this._model) {
            this._model = legacyCC.director.root.createModel(ParticleBatchModel);
            this._model!.setCapacity(this._particleSystem.capacity);
            this._model!.visFlags = this._particleSystem.visibility;
        }
    }

    public updateTrailMaterial () {}
    public getDefaultTrailMaterial () { return null; }
    public abstract getParticleCount () : number;
    public abstract getFreeParticle (): Particle | null;
    public abstract onMaterialModified (index: number, material: Material) : void;
    public abstract onRebuildPSO (index: number, material: Material) : void;
    public abstract updateRenderMode () : void;
    public abstract updateMaterialParams () : void;
    public abstract setNewParticle (p: Particle): void;
    public abstract updateParticles (dt: number): number;
    public abstract updateRenderData (): void;
    public abstract enableModule (name: string, val: boolean, pm: IParticleModule): void;
    public abstract beforeRender (): void;
}
