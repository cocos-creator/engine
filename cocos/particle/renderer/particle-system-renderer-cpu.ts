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

import { builtinResMgr } from '../../core/builtin';
import { Material } from '../../core/assets';
import { AttributeName, Format, Attribute } from '../../core/gfx';
import { Mat4, Vec2, Vec3, Vec4, pseudoRandom, Quat } from '../../core/math';
import { RecyclePool } from '../../core/memop';
import { MaterialInstance, IMaterialInstanceInfo } from '../../core/renderer/core/material-instance';
import { MacroRecord } from '../../core/renderer/core/pass-utils';
import { RenderMode, Space } from '../enum';
import { Particle, IParticleModule, PARTICLE_MODULE_ORDER } from '../particle';
import { ParticleSystemRendererBase } from './particle-system-renderer-base';
import { Component } from '../../core';

const _tempAttribUV = new Vec3();
const _tempWorldTrans = new Mat4();

const _anim_module = [
    '_colorOverLifetimeModule',
    '_sizeOvertimeModule',
    '_velocityOvertimeModule',
    '_forceOvertimeModule',
    '_limitVelocityOvertimeModule',
    '_rotationOvertimeModule',
    '_textureAnimationModule',
];

const _uvs = [
    0, 0, // bottom-left
    1, 0, // bottom-right
    0, 1, // top-left
    1, 1, // top-right
];

const CC_USE_WORLD_SPACE = 'CC_USE_WORLD_SPACE';

const CC_RENDER_MODE = 'CC_RENDER_MODE';
const RENDER_MODE_BILLBOARD = 0;
const RENDER_MODE_STRETCHED_BILLBOARD = 1;
const RENDER_MODE_HORIZONTAL_BILLBOARD = 2;
const RENDER_MODE_VERTICAL_BILLBOARD = 3;
const RENDER_MODE_MESH = 4;

const _vertex_attrs = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),       // position
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),     // color
];

const _vertex_attrs_stretch = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),       // position
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),     // color
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGB32F),         // particle velocity
];

const _vertex_attrs_mesh = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),       // particle position
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),     // particle color
    new Attribute(AttributeName.ATTR_TEX_COORD3, Format.RGB32F),     // mesh position
    new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F),         // mesh normal
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGBA8, true),    // mesh color
];

const _matInsInfo: IMaterialInstanceInfo = {
    parent: null!,
    owner: null!,
    subModelIdx: 0,
};

export default class ParticleSystemRendererCPU extends ParticleSystemRendererBase {
    private _defines: MacroRecord;
    private _trailDefines: MacroRecord;
    private _frameTile_velLenScale: Vec4;
    private _tmp_velLenScale: Vec4;
    private _defaultMat: Material | null = null;
    private _node_scale: Vec4;
    private _attrs: any[];
    private _particles: RecyclePool | null = null;
    private _defaultTrailMat: Material | null = null;
    private _updateList: Map<string, IParticleModule> = new Map<string, IParticleModule>();
    private _animateList: Map<string, IParticleModule> = new Map<string, IParticleModule>();
    private _runAnimateList: IParticleModule[] = new Array<IParticleModule>();
    private _fillDataFunc: any = null;
    private _uScaleHandle = 0;
    private _uLenHandle = 0;
    private _inited = false;
    private _localMat: Mat4 = new Mat4();
    private _gravity: Vec4 = new Vec4();

    constructor (info: any) {
        super(info);

        this._model = null;

        this._frameTile_velLenScale = new Vec4(1, 1, 0, 0);
        this._tmp_velLenScale = this._frameTile_velLenScale.clone();
        this._node_scale = new Vec4();
        this._attrs = new Array(5);
        this._defines = {
            CC_USE_WORLD_SPACE: true,
            CC_USE_BILLBOARD: true,
            CC_USE_STRETCHED_BILLBOARD: false,
            CC_USE_HORIZONTAL_BILLBOARD: false,
            CC_USE_VERTICAL_BILLBOARD: false,
        };
        this._trailDefines = {
            CC_USE_WORLD_SPACE: true,
            // CC_DRAW_WIRE_FRAME: true,   // <wireframe debug>
        };
    }

    public onInit (ps: Component) {
        super.onInit(ps);

        this._particles = new RecyclePool(() => new Particle(this), 16);
        this._setVertexAttrib();
        this._setFillFunc();
        this._initModuleList();
        this._initModel();
        this.updateMaterialParams();
        this.updateTrailMaterial();
        this.setVertexAttributes();
        this._inited = true;
    }

    public clear () {
        super.clear();
        this._particles!.reset();
        if (this._particleSystem._trailModule) {
            this._particleSystem._trailModule.clear();
        }
        this.updateRenderData();
        this._model!.enabled = false;
    }

    public updateRenderMode () {
        this._setVertexAttrib();
        this._setFillFunc();
        this.updateMaterialParams();
        this.setVertexAttributes();
    }

    public getFreeParticle (): Particle | null {
        if (this._particles!.length >= this._particleSystem.capacity) {
            return null;
        }
        return this._particles!.add() as Particle;
    }

    public getDefaultTrailMaterial (): any {
        return this._defaultTrailMat;
    }

    public setNewParticle (p: Particle) {
    }

    private _initModuleList () {
        _anim_module.forEach((val) => {
            const pm = this._particleSystem[val];
            if (pm && pm.enable) {
                if (pm.needUpdate) {
                    this._updateList[pm.name] = pm;
                }

                if (pm.needAnimate) {
                    this._animateList[pm.name] = pm;
                }
            }
        });

        // reorder
        this._runAnimateList.length = 0;
        for (let i = 0, len = PARTICLE_MODULE_ORDER.length; i < len; i++) {
            const p = this._animateList[PARTICLE_MODULE_ORDER[i]];
            if (p) {
                this._runAnimateList.push(p);
            }
        }
    }

    public enableModule (name: string, val: boolean, pm: IParticleModule) {
        if (val) {
            if (pm.needUpdate) {
                this._updateList[pm.name] = pm;
            }

            if (pm.needAnimate) {
                this._animateList[pm.name] = pm;
            }
        } else {
            delete this._animateList[name];
            delete this._updateList[name];
        }
        // reorder
        this._runAnimateList.length = 0;
        for (let i = 0, len = PARTICLE_MODULE_ORDER.length; i < len; i++) {
            const p = this._animateList[PARTICLE_MODULE_ORDER[i]];
            if (p) {
                this._runAnimateList.push(p);
            }
        }
    }

    public updateParticles (dt: number) {
        const ps = this._particleSystem;
        if (!ps) {
            return this._particles!.length;
        }
        ps.node.getWorldMatrix(_tempWorldTrans);
        switch (ps.scaleSpace) {
        case Space.Local:
            ps.node.getScale(this._node_scale);
            break;
        case Space.World:
            ps.node.getWorldScale(this._node_scale);
            break;
        default:
            break;
        }
        const mat: Material | null = ps.getMaterialInstance(0) || this._defaultMat;
        const pass = mat!.passes[0];
        pass.setUniform(this._uScaleHandle, this._node_scale);

        this._updateList.forEach((value: IParticleModule, key: string) => {
            value.update(ps._simulationSpace, _tempWorldTrans);
        });

        const trailModule = ps._trailModule;
        const trailEnable = trailModule && trailModule.enable;
        if (trailEnable) {
            trailModule.update();
        }

        if (ps.simulationSpace === Space.Local) {
            const r:Quat = ps.node.getRotation();
            Mat4.fromQuat(this._localMat, r);
            this._localMat.transpose(); // just consider rotation, use transpose as invert
        }

        for (let i = 0; i < this._particles!.length; ++i) {
            const p = this._particles!.data[i];
            p.remainingLifetime -= dt;
            Vec3.set(p.animatedVelocity, 0, 0, 0);

            if (p.remainingLifetime < 0.0) {
                if (trailEnable) {
                    trailModule.removeParticle(p);
                }
                this._particles!.removeAt(i);
                --i;
                continue;
            }

            if (ps.simulationSpace === Space.Local) {
                const gravityFactor = -ps.gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, pseudoRandom(p.randomSeed))! * 9.8 * dt;
                this._gravity.x = 0.0;
                this._gravity.y = gravityFactor;
                this._gravity.z = 0.0;
                this._gravity.w = 1.0;
                this._gravity = this._gravity.transformMat4(this._localMat);

                p.velocity.x += this._gravity.x;
                p.velocity.y += this._gravity.y;
                p.velocity.z += this._gravity.z;
            } else {
                // apply gravity.
                p.velocity.y -= ps.gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, pseudoRandom(p.randomSeed))! * 9.8 * dt;
            }

            Vec3.copy(p.ultimateVelocity, p.velocity);

            this._runAnimateList.forEach((value) => {
                value.animate(p, dt);
            });

            Vec3.scaleAndAdd(p.position, p.position, p.ultimateVelocity, dt); // apply velocity.
            if (trailEnable) {
                trailModule.animate(p, dt);
            }
        }

        this._model!.enabled = this._particles!.length > 0;
        return this._particles!.length;
    }

    // internal function
    public updateRenderData () {
        // update vertex buffer
        let idx = 0;
        for (let i = 0; i < this._particles!.length; ++i) {
            const p = this._particles!.data[i];
            let fi = 0;
            const textureModule = this._particleSystem._textureAnimationModule;
            if (textureModule && textureModule.enable) {
                fi = p.frameIndex;
            }
            idx = i * 4;
            this._fillDataFunc(p, idx, fi);
        }
    }

    public beforeRender () {
        // because we use index buffer, per particle index count = 6.
        this._model!.updateIA(this._particles!.length);
    }

    public getParticleCount (): number {
        return this._particles!.length;
    }

    public onMaterialModified (index: number, material: Material) {
        if (!this._inited) {
            return;
        }

        if (index === 0) {
            this.updateMaterialParams();
        } else {
            this.updateTrailMaterial();
        }
    }

    public onRebuildPSO (index: number, material: Material) {
        if (this._model && index === 0) {
            this._model.setSubModelMaterial(0, material);
        }
        const trailModule = this._particleSystem._trailModule;
        if (trailModule && trailModule._trailModel && index === 1) {
            trailModule._trailModel.setSubModelMaterial(0, material);
        }
    }

    private _setFillFunc () {
        if (this._renderInfo!.renderMode === RenderMode.Mesh) {
            this._fillDataFunc = this._fillMeshData;
        } else if (this._renderInfo!.renderMode === RenderMode.StrecthedBillboard) {
            this._fillDataFunc = this._fillStrecthedData;
        } else {
            this._fillDataFunc = this._fillNormalData;
        }
    }

    private _fillMeshData (p: Particle, idx: number, fi: number) {
        const i = idx / 4;
        let attrNum = 0;
        this._attrs[attrNum++] = p.position;
        _tempAttribUV.z = fi;
        this._attrs[attrNum++] = _tempAttribUV;
        this._attrs[attrNum++] = p.size;
        this._attrs[attrNum++] = p.rotation;
        this._attrs[attrNum++] = p.color._val;
        this._model!.addParticleVertexData(i, this._attrs);
    }

    private _fillStrecthedData (p: Particle, idx: number, fi: number) {
        let attrNum = 0;
        for (let j = 0; j < 4; ++j) { // four verts per particle.
            attrNum = 0;
            this._attrs[attrNum++] = p.position;
            _tempAttribUV.x = _uvs[2 * j];
            _tempAttribUV.y = _uvs[2 * j + 1];
            _tempAttribUV.z = fi;
            this._attrs[attrNum++] = _tempAttribUV;
            this._attrs[attrNum++] = p.size;
            this._attrs[attrNum++] = p.rotation;
            this._attrs[attrNum++] = p.color._val;
            this._attrs[attrNum++] = p.ultimateVelocity;
            this._attrs[attrNum++] = p.ultimateVelocity;
            this._model!.addParticleVertexData(idx++, this._attrs);
        }
    }

    private _fillNormalData (p: Particle, idx: number, fi: number) {
        let attrNum = 0;
        for (let j = 0; j < 4; ++j) { // four verts per particle.
            attrNum = 0;
            this._attrs[attrNum++] = p.position;
            _tempAttribUV.x = _uvs[2 * j];
            _tempAttribUV.y = _uvs[2 * j + 1];
            _tempAttribUV.z = fi;
            this._attrs[attrNum++] = _tempAttribUV;
            this._attrs[attrNum++] = p.size;
            this._attrs[attrNum++] = p.rotation;
            this._attrs[attrNum++] = p.color._val;
            this._attrs[attrNum++] = null;
            this._model!.addParticleVertexData(idx++, this._attrs);
        }
    }

    private _setVertexAttrib () {
        switch (this._renderInfo!.renderMode) {
        case RenderMode.StrecthedBillboard:
            this._vertAttrs = _vertex_attrs_stretch.slice();
            break;
        case RenderMode.Mesh:
            this._vertAttrs = _vertex_attrs_mesh.slice();
            break;
        default:
            this._vertAttrs = _vertex_attrs.slice();
        }
    }

    public updateMaterialParams () {
        if (!this._particleSystem) {
            return;
        }

        const ps = this._particleSystem;
        const shareMaterial = ps.sharedMaterial;
        if (shareMaterial != null) {
            const effectName = shareMaterial._effectAsset._name;
            this._renderInfo!.mainTexture = shareMaterial.getProperty('mainTexture', 0);
            // reset material
            if (effectName.indexOf('particle') === -1 || effectName.indexOf('particle-gpu') !== -1) {
                ps.setMaterial(null, 0);
            }
        }

        if (ps.sharedMaterial == null && this._defaultMat == null) {
            _matInsInfo.parent = builtinResMgr.get<Material>('default-particle-material');
            _matInsInfo.owner = this._particleSystem;
            _matInsInfo.subModelIdx = 0;
            this._defaultMat = new MaterialInstance(_matInsInfo);
            if (this._renderInfo!.mainTexture !== null) {
                this._defaultMat.setProperty('mainTexture', this._renderInfo!.mainTexture);
            }
        }
        const mat: Material = ps.getMaterialInstance(0) || this._defaultMat;
        if (ps._simulationSpace === Space.World) {
            this._defines[CC_USE_WORLD_SPACE] = true;
        } else {
            this._defines[CC_USE_WORLD_SPACE] = false;
        }

        const pass = mat.passes[0];
        this._uScaleHandle = pass.getHandle('scale');
        this._uLenHandle = pass.getHandle('frameTile_velLenScale');

        const renderMode = this._renderInfo!.renderMode;
        const vlenScale = this._frameTile_velLenScale;
        if (renderMode === RenderMode.Billboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_BILLBOARD;
        } else if (renderMode === RenderMode.StrecthedBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_STRETCHED_BILLBOARD;
            vlenScale.z = this._renderInfo!.velocityScale;
            vlenScale.w = this._renderInfo!.lengthScale;
        } else if (renderMode === RenderMode.HorizontalBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_HORIZONTAL_BILLBOARD;
        } else if (renderMode === RenderMode.VerticalBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_VERTICAL_BILLBOARD;
        } else if (renderMode === RenderMode.Mesh) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_MESH;
        } else {
            console.warn(`particle system renderMode ${renderMode} not support.`);
        }
        const textureModule = ps._textureAnimationModule;
        if (textureModule && textureModule.enable) {
            Vec4.copy(this._tmp_velLenScale, vlenScale); // fix textureModule switch bug
            Vec2.set(this._tmp_velLenScale, textureModule.numTilesX, textureModule.numTilesY);
            pass.setUniform(this._uLenHandle, this._tmp_velLenScale);
        } else {
            pass.setUniform(this._uLenHandle, vlenScale);
        }
        mat.recompileShaders(this._defines);
        if (this._model) {
            this._model.updateMaterial(mat);
        }
    }

    public updateTrailMaterial () {
        if (!this._particleSystem) {
            return;
        }
        const ps = this._particleSystem;
        const trailModule = ps._trailModule;
        if (trailModule && trailModule.enable) {
            if (ps.simulationSpace === Space.World || trailModule.space === Space.World) {
                this._trailDefines[CC_USE_WORLD_SPACE] = true;
            } else {
                this._trailDefines[CC_USE_WORLD_SPACE] = false;
            }
            let mat = ps.getMaterialInstance(1);
            if (mat === null && this._defaultTrailMat === null) {
                _matInsInfo.parent = builtinResMgr.get<Material>('default-trail-material');
                _matInsInfo.owner = this._particleSystem;
                _matInsInfo.subModelIdx = 1;
                this._defaultTrailMat = new MaterialInstance(_matInsInfo);
            }
            mat = mat || this._defaultTrailMat;
            mat.recompileShaders(this._trailDefines);
            trailModule.updateMaterial();
        }
    }
}
