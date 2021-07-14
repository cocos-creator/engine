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

import { EDITOR } from 'internal:constants';
import { builtinResMgr } from '../../core/builtin';
import { Material } from '../../core/assets';
import { Texture2D } from '../../core';
import { Component } from '../../core/components';
import { AttributeName, Format, Attribute } from '../../core/gfx';
import { Mat4, Vec2, Vec4, Quat } from '../../core/math';
import { MaterialInstance, IMaterialInstanceInfo } from '../../core/renderer/core/material-instance';
import { MacroRecord } from '../../core/renderer/core/pass-utils';
import { RenderMode, Space } from '../enum';
import { Particle, IParticleModule } from '../particle';
import { packGradientRange } from '../animator/gradient-range';
import { Pass } from '../../core/renderer/core/pass';
import { packCurveRangeXYZ, packCurveRangeZ, packCurveRangeXYZW, packCurveRangeN, packCurveRangeXY } from '../animator/curve-range';
import { ParticleSystemRendererBase } from './particle-system-renderer-base';

const _tempWorldTrans = new Mat4();
const _tempVec4 = new Vec4();
const _world_rot = new Quat();

const _sample_num = 32;
const _sample_interval = 1.0 / _sample_num;

const CC_USE_WORLD_SPACE = 'CC_USE_WORLD_SPACE';

const CC_RENDER_MODE = 'CC_RENDER_MODE';
const RENDER_MODE_BILLBOARD = 0;
const RENDER_MODE_STRETCHED_BILLBOARD = 1;
const RENDER_MODE_HORIZONTAL_BILLBOARD = 2;
const RENDER_MODE_VERTICAL_BILLBOARD = 3;
const RENDER_MODE_MESH = 4;

const COLOR_OVER_TIME_MODULE_ENABLE = 'COLOR_OVER_TIME_MODULE_ENABLE';
const ROTATION_OVER_TIME_MODULE_ENABLE = 'ROTATION_OVER_TIME_MODULE_ENABLE';
const SIZE_OVER_TIME_MODULE_ENABLE = 'SIZE_OVER_TIME_MODULE_ENABLE';
const VELOCITY_OVER_TIME_MODULE_ENABLE = 'VELOCITY_OVER_TIME_MODULE_ENABLE';
const FORCE_OVER_TIME_MODULE_ENABLE = 'FORCE_OVER_TIME_MODULE_ENABLE';
const TEXTURE_ANIMATION_MODULE_ENABLE = 'TEXTURE_ANIMATION_MODULE_ENABLE';

const _vert_attr_name = {
    POSITION_STARTTIME: 'a_position_starttime',
    VERT_SIZE_UV: 'a_size_uv',
    VERT_ROTATION_UV: 'a_rotation_uv',
    COLOR: 'a_color',
    DIR_LIFE: 'a_dir_life',
    RANDOM_SEED: 'a_rndSeed',
};

const _gpu_vert_attr = [
    new Attribute(_vert_attr_name.POSITION_STARTTIME, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_SIZE_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_ROTATION_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.COLOR, Format.RGBA32F),
    new Attribute(_vert_attr_name.DIR_LIFE, Format.RGBA32F),
    new Attribute(_vert_attr_name.RANDOM_SEED, Format.R32F),
];

const _gpu_vert_attr_mesh = [
    new Attribute(_vert_attr_name.POSITION_STARTTIME, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_SIZE_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_ROTATION_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.COLOR, Format.RGBA32F),
    new Attribute(_vert_attr_name.DIR_LIFE, Format.RGBA32F),
    new Attribute(_vert_attr_name.RANDOM_SEED, Format.R32F),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD3, Format.RGB32F),     // mesh position
    new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F),         // mesh normal
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGBA8, true),    // mesh color
];

const _matInsInfo: IMaterialInstanceInfo = {
    parent: null!,
    owner: null!,
    subModelIdx: 0,
};

export default class ParticleSystemRendererGPU extends ParticleSystemRendererBase {
    private _defines: MacroRecord;
    private _frameTile_velLenScale: Vec4;
    private _unifrom_velLenScale: Vec4;
    private _tmp_velLenScale: Vec4;
    private _node_scale: Vec4;
    protected _vertAttrs: Attribute[] = [];
    protected _defaultMat: Material | null = null;
    private _particleNum = 0;
    private _tempParticle: Particle | null = null;
    private _colorTexture: Texture2D | null = null;
    private _forceTexture: Texture2D | null = null;
    private _velocityTexture: Texture2D | null = null;
    private _rotationTexture: Texture2D | null = null;
    private _sizeTexture: Texture2D | null = null;
    private _animTexture: Texture2D | null = null;
    private _uTimeHandle = 0;
    private _uRotHandle = 0;
    private _inited = false;

    constructor (info: any) {
        super(info);

        this._frameTile_velLenScale = new Vec4(1, 1, 0, 0);
        this._unifrom_velLenScale = this._frameTile_velLenScale.clone();
        this._tmp_velLenScale = this._frameTile_velLenScale.clone();
        this._node_scale = new Vec4();
        this._defines = {
            CC_USE_WORLD_SPACE: true,
            CC_USE_BILLBOARD: true,
            CC_USE_STRETCHED_BILLBOARD: false,
            CC_USE_HORIZONTAL_BILLBOARD: false,
            CC_USE_VERTICAL_BILLBOARD: false,
            COLOR_OVER_TIME_MODULE_ENABLE: false,
        };

        this._tempParticle = new Particle(null);
        this._particleNum = 0;
    }

    public onInit (ps: Component) {
        super.onInit(ps);
        this._setVertexAttrib();
        this._initModel();
        this.updateMaterialParams();
        this.setVertexAttributes();
        this._inited = true;
    }

    public updateRenderMode () {
        this._setVertexAttrib();
        this.updateMaterialParams();
        this.setVertexAttributes();
    }

    public setVertexAttributes () {
        super.setVertexAttributes();
        this._model!.constructAttributeIndex();
    }

    public clear () {
        super.clear();
        this._particleNum = 0;
        this.updateRenderData();
    }

    public onDestroy () {
        super.onDestroy();
        if (this._forceTexture) this._forceTexture.destroy();
        if (this._velocityTexture) this._velocityTexture.destroy();
        if (this._colorTexture) this._colorTexture.destroy();
        if (this._sizeTexture) this._sizeTexture.destroy();
        if (this._rotationTexture) this._rotationTexture.destroy();
        if (this._animTexture) this._animTexture.destroy();
    }

    public enableModule (name: string, val: boolean, pm: IParticleModule) {
        const mat: Material | null = this._particleSystem.getMaterialInstance(0) || this._defaultMat;
        if (!mat) {
            return;
        }
        this.initShaderUniform(mat);
        mat.recompileShaders(this._defines);
        if (this._model) {
            this._model.setSubModelMaterial(0, mat);
        }
    }

    public getFreeParticle (): Particle | null {
        if (this._particleNum >= this._particleSystem._capacity) {
            return null;
        }

        return this._tempParticle;
    }

    public setNewParticle (p: Particle) {
        this._model!.addGPUParticleVertexData(p, this._particleNum, this._particleSystem._time);
        this._particleNum++;
    }

    public updateParticles (dt: number) {
        if (EDITOR) {
            const mat: Material | null = this._particleSystem.getMaterialInstance(0) || this._defaultMat;

            this._particleSystem.node.getWorldMatrix(_tempWorldTrans);
            switch (this._particleSystem.scaleSpace) {
            case Space.Local:
                this._particleSystem.node.getScale(this._node_scale);
                break;
            case Space.World:
                this._particleSystem.node.getWorldScale(this._node_scale);
                break;
            default:
                break;
            }

            this.initShaderUniform(mat!);
        }
        this._particleNum = this._model!.updateGPUParticles(this._particleNum, this._particleSystem._time, dt);
        this.updateShaderUniform(dt);
        this._model!.enabled = this._particleNum > 0;
        return this._particleNum;
    }

    // internal function
    public updateRenderData () {
    }

    public beforeRender () {
        // update vertex buffer
        this._model!.updateIA(this._particleNum);
    }

    public updateShaderUniform (dt: number) {
        const mat: Material | null = this._particleSystem.getMaterialInstance(0) || this._defaultMat;
        if (!mat) {
            return;
        }

        const pass = mat.passes[0];
        _tempVec4.x = this._particleSystem._time;
        _tempVec4.y = dt;
        pass.setUniform(this._uTimeHandle, _tempVec4);

        this._particleSystem.node.getWorldRotation(_world_rot);
        pass.setUniform(this._uRotHandle, _world_rot);
    }

    public initShaderUniform (mat: Material) {
        const pass = mat.passes[0];

        this._uTimeHandle = pass.getHandle('u_timeDelta');
        this._uRotHandle = pass.getHandle('u_worldRot');

        pass.setUniform(pass.getHandle('scale'), this._node_scale);
        pass.setUniform(pass.getHandle('frameTile_velLenScale'), this._unifrom_velLenScale);
        _tempVec4.x = _sample_num;
        _tempVec4.y = _sample_interval;
        pass.setUniform(pass.getHandle('u_sampleInfo'), _tempVec4);

        let enable = false;
        // force
        const forceModule = this._particleSystem._forceOvertimeModule;
        enable = forceModule && forceModule.enable;
        this._defines[FORCE_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            if (this._forceTexture) this._forceTexture.destroy();
            this._forceTexture = packCurveRangeXYZ(_sample_num, forceModule.x, forceModule.y, forceModule.z);
            const handle = pass.getHandle('force_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._forceTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._forceTexture.getGFXTexture()!);
            const spaceHandle = pass.getHandle('u_force_space');
            pass.setUniform(spaceHandle, forceModule.space);
            const modeHandle = pass.getHandle('u_force_mode');
            pass.setUniform(modeHandle, this._forceTexture.height);
        }

        // velocity
        const velocityModule = this._particleSystem._velocityOvertimeModule;
        enable = velocityModule && velocityModule.enable;
        this._defines[VELOCITY_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            if (this._velocityTexture) this._velocityTexture.destroy();
            this._velocityTexture = packCurveRangeXYZW(_sample_num, velocityModule.x, velocityModule.y, velocityModule.z, velocityModule.speedModifier);
            const handle = pass.getHandle('velocity_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._velocityTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._velocityTexture.getGFXTexture()!);
            const spaceHandle = pass.getHandle('u_velocity_space');
            pass.setUniform(spaceHandle, velocityModule.space);
            const modeHandle = pass.getHandle('u_velocity_mode');
            pass.setUniform(modeHandle, this._velocityTexture.height);
        }

        // color module
        const colorModule = this._particleSystem._colorOverLifetimeModule;
        enable = colorModule && colorModule.enable;
        this._defines[COLOR_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            if (this._colorTexture) this._colorTexture.destroy();
            this._colorTexture = packGradientRange(_sample_num, colorModule.color);
            const handle = pass.getHandle('color_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._colorTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._colorTexture.getGFXTexture()!);
            const modeHandle = pass.getHandle('u_color_mode');
            pass.setUniform(modeHandle, this._colorTexture.height);
        }

        // rotation module
        const roationModule = this._particleSystem._rotationOvertimeModule;
        enable = roationModule && roationModule.enable;
        this._defines[ROTATION_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            if (this._rotationTexture) this._rotationTexture.destroy();
            if (roationModule.separateAxes) {
                this._rotationTexture = packCurveRangeXYZ(_sample_num, roationModule.x, roationModule.y, roationModule.z);
            } else {
                this._rotationTexture = packCurveRangeZ(_sample_num, roationModule.z);
            }
            const handle = pass.getHandle('rotation_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._rotationTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._rotationTexture.getGFXTexture()!);
            const modeHandle = pass.getHandle('u_rotation_mode');
            pass.setUniform(modeHandle, this._rotationTexture.height);
        }

        // size module
        const sizeModule = this._particleSystem._sizeOvertimeModule;
        enable = sizeModule && sizeModule.enable;
        this._defines[SIZE_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            if (this._sizeTexture) this._sizeTexture.destroy();
            if (sizeModule.separateAxes) {
                this._sizeTexture = packCurveRangeXYZ(_sample_num, sizeModule.x, sizeModule.y, sizeModule.z, true);
            } else {
                this._sizeTexture = packCurveRangeN(_sample_num, sizeModule.size, true);
            }
            const handle = pass.getHandle('size_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._sizeTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._sizeTexture.getGFXTexture()!);
            const modeHandle = pass.getHandle('u_size_mode');
            pass.setUniform(modeHandle, this._sizeTexture.height);
        }

        // texture module
        const textureModule = this._particleSystem._textureAnimationModule;
        enable = textureModule && textureModule.enable;
        this._defines[TEXTURE_ANIMATION_MODULE_ENABLE] = enable;
        if (enable) {
            if (this._animTexture) this._animTexture.destroy();
            this._animTexture = packCurveRangeXY(_sample_num, textureModule.startFrame, textureModule.frameOverTime);
            const handle = pass.getHandle('texture_animation_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._animTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._animTexture.getGFXTexture()!);
            const infoHandle = pass.getHandle('u_anim_info');
            _tempVec4.x = this._animTexture.height;
            _tempVec4.y = textureModule.numTilesX * textureModule.numTilesY;
            _tempVec4.z = textureModule.cycleCount;
            pass.setUniform(infoHandle, _tempVec4);
        }
    }

    public getParticleCount (): number {
        return this._particleNum;
    }

    public onMaterialModified (index: number, material: Material) {
        if (!this._inited) {
            return;
        }
        this.updateMaterialParams();
    }

    public onRebuildPSO (index: number, material: Material) {
        if (this._model && index === 0) {
            this._model.setSubModelMaterial(0, material);
        }
    }

    private _setVertexAttrib () {
        switch (this._renderInfo!.renderMode) {
        case RenderMode.StrecthedBillboard:
            this._vertAttrs = _gpu_vert_attr.slice();
            break;
        case RenderMode.Mesh:
            this._vertAttrs = _gpu_vert_attr_mesh.slice();
            break;
        default:
            this._vertAttrs = _gpu_vert_attr.slice();
        }
    }

    public updateMaterialParams () {
        if (!this._particleSystem) {
            return;
        }
        const ps = this._particleSystem;
        const shareMaterial = ps.sharedMaterial;
        if (shareMaterial !== null) {
            const effectName = shareMaterial._effectAsset._name;
            this._renderInfo!.mainTexture = shareMaterial.getProperty('mainTexture', 0);
            if (effectName.indexOf('particle-gpu') === -1) {
                this._renderInfo!.mainTexture = shareMaterial.getProperty('mainTexture', 0);
                // reset material
                this._particleSystem.setMaterial(null, 0);
            }
        }

        if (ps.sharedMaterial == null && this._defaultMat == null) {
            _matInsInfo.parent = builtinResMgr.get<Material>('default-particle-gpu-material');
            _matInsInfo.owner = ps;
            _matInsInfo.subModelIdx = 0;
            this._defaultMat = new MaterialInstance(_matInsInfo);
            if (this._renderInfo!.mainTexture !== null) {
                this._defaultMat.setProperty('mainTexture', this._renderInfo!.mainTexture);
            }
        }
        const mat: Material | null = ps.getMaterialInstance(0) || this._defaultMat;

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

        if (ps._simulationSpace === Space.World) {
            this._defines[CC_USE_WORLD_SPACE] = true;
        } else {
            this._defines[CC_USE_WORLD_SPACE] = false;
        }
        const renderMode = this._renderInfo!.renderMode;
        if (renderMode === RenderMode.Billboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_BILLBOARD;
        } else if (renderMode === RenderMode.StrecthedBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_STRETCHED_BILLBOARD;
            this._frameTile_velLenScale.z = this._renderInfo!.velocityScale;
            this._frameTile_velLenScale.w = this._renderInfo!.lengthScale;
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
            Vec2.set(this._frameTile_velLenScale, textureModule.numTilesX, textureModule.numTilesY);
            Vec4.copy(this._unifrom_velLenScale, this._frameTile_velLenScale);
        } else {
            this._tmp_velLenScale.z = this._frameTile_velLenScale.z;
            this._tmp_velLenScale.w = this._frameTile_velLenScale.w;
            Vec4.copy(this._unifrom_velLenScale, this._tmp_velLenScale);
        }

        this.initShaderUniform(mat!);

        mat!.recompileShaders(this._defines);

        if (this._model) {
            this._model.updateMaterial(mat!);
        }
    }
}
