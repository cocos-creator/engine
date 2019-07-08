import { Component } from '../../../../components';
import { ccclass, property } from '../../../../core/data/class-decorator';
import { Mat4, Vec2, Vec3, Vec4 } from '../../../../core/value-types';
import { vec2, vec3 } from '../../../../core/vmath';
import { GFXAttributeName, GFXFormat } from '../../../../gfx/define';
import { IGFXAttribute } from '../../../../gfx/input-assembler';
import { IDefineMap } from '../../../../renderer/core/pass';
import ParticleBatchModel from '../../../../renderer/models/particle-batch-model';
import { Mesh } from '../../../assets';
import { Material } from '../../../assets/material';
import { builtinResMgr } from '../../../builtin';
import RecyclePool from '../../../memop/recycle-pool';
import { RenderMode, Space } from '../enum';
import Particle from '../particle';

const _tempAttribUV = new Vec3();
const _tempAttribUV0 = new Vec2();
const _tempWorldTrans = new Mat4();

const _uvs = [
    0, 0, // bottom-left
    1, 0, // bottom-right
    0, 1, // top-left
    1, 1, // top-right
];

const CC_USE_WORLD_SPACE = 'CC_USE_WORLD_SPACE';
const CC_USE_BILLBOARD = 'CC_USE_BILLBOARD';
const CC_USE_STRETCHED_BILLBOARD = 'CC_USE_STRETCHED_BILLBOARD';
const CC_USE_HORIZONTAL_BILLBOARD = 'CC_USE_HORIZONTAL_BILLBOARD';
const CC_USE_VERTICAL_BILLBOARD = 'CC_USE_VERTICAL_BILLBOARD';
const CC_USE_MESH = 'CC_USE_MESH';

const _vertex_attrs = [
    { name: GFXAttributeName.ATTR_POSITION, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_TEX_COORD, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_TEX_COORD1, format: GFXFormat.RG32F },
    { name: GFXAttributeName.ATTR_COLOR, format: GFXFormat.RGBA8, isNormalized: true },
];

const _vertex_attrs_stretch = [
    { name: GFXAttributeName.ATTR_POSITION, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_TEX_COORD, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_TEX_COORD1, format: GFXFormat.RG32F },
    { name: GFXAttributeName.ATTR_COLOR, format: GFXFormat.RGBA8, isNormalized: true },
    { name: GFXAttributeName.ATTR_COLOR1, format: GFXFormat.RGB32F },
];

const _vertex_attrs_mesh = [
    { name: GFXAttributeName.ATTR_POSITION, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_TEX_COORD, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_TEX_COORD1, format: GFXFormat.RG32F },
    { name: GFXAttributeName.ATTR_COLOR, format: GFXFormat.RGBA8, isNormalized: true },
    { name: GFXAttributeName.ATTR_TEX_COORD2, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_NORMAL, format: GFXFormat.RGB32F },
    { name: GFXAttributeName.ATTR_COLOR1, format: GFXFormat.RGBA8, isNormalized: true },
];

@ccclass('cc.ParticleSystemRenderer')
export default class ParticleSystemRenderer {

    /**
     * @zh 设定粒子生成模式。
     */
    @property({
        type: RenderMode,
        displayOrder: 0,
    })
    public get renderMode () {
        return this._renderMode;
    }

    public set renderMode (val) {
        if (this._renderMode === val) {
            return;
        }
        this._renderMode = val;
        this._setVertexAttrib();
        this._updateModel();
        this._updateMaterialParams();
    }

    /**
     * @zh 在粒子生成方式为 StrecthedBillboard 时,对粒子在运动方向上按速度大小进行拉伸。
     */
    @property({
        displayOrder: 1,
    })
    public get velocityScale () {
        return this._velocityScale;
    }

    public set velocityScale (val) {
        this._velocityScale = val;
        this._updateMaterialParams();
        // this._updateModel();
    }

    /**
     * @zh 在粒子生成方式为 StrecthedBillboard 时,对粒子在运动方向上按粒子大小进行拉伸。
     */
    @property({
        displayOrder: 2,
    })
    public get lengthScale () {
        return this._lengthScale;
    }

    public set lengthScale (val) {
        this._lengthScale = val;
        this._updateMaterialParams();
        // this._updateModel();
    }

    @property({
        type: RenderMode,
        displayOrder: 3,
    })
    private _renderMode = RenderMode.Billboard;

    @property({
        displayOrder: 4,
    })
    private _velocityScale = 1;

    @property({
        displayOrder: 5,
    })
    private _lengthScale = 1;

    @property({
        displayOrder: 6,
    })
    private _mesh: Mesh | null = null;

    /**
     * @zh 粒子发射的模型。
     */
    @property({
        type: Mesh,
        displayOrder: 7,
    })
    public get mesh () {
        return this._mesh;
    }

    public set mesh (val) {
        this._mesh = val;
        if (this._model) {
            this._model.setVertexAttributes(this._renderMode === RenderMode.Mesh ? this._mesh : null, this._vertAttrs);
        }
    }

    /**
     * @zh 粒子使用的材质。
     */
    @property({
        type: Material,
        displayOrder: 8,
    })
    public get particleMaterial () {
        return this.particleSystem.getMaterial(0);
    }

    public set particleMaterial (val) {
        this.particleSystem.setMaterial(val, 0);
    }

    /**
     * @zh 拖尾使用的材质。
     */
    @property({
        type: Material,
        displayOrder: 9,
    })
    public get trailMaterial () {
        return this.particleSystem.getMaterial(1)!;
    }

    public set trailMaterial (val) {
        this.particleSystem.setMaterial(val, 1);
    }

    private _defines: IDefineMap;
    private _trailDefines: IDefineMap;
    private _model: ParticleBatchModel | null;
    private frameTile_velLenScale: Vec4;
    private _node_scale: Vec4;
    private attrs: any[];
    private _vertAttrs: IGFXAttribute[] = [];
    private particleSystem: any;
    private _particles: RecyclePool | null = null;
    private _defaultMat: Material | null = null;
    private _defaultTrailMat: Material | null = null;

    constructor () {
        this._model = null;

        this.frameTile_velLenScale = new Vec4(1, 1, 0, 0);
        this._node_scale = new Vec4();
        this.attrs = new Array(5);
        this._defines = {
            CC_USE_WORLD_SPACE: true,
            CC_USE_BILLBOARD: true,
            CC_USE_STRETCHED_BILLBOARD: false,
            CC_USE_HORIZONTAL_BILLBOARD: false,
            CC_USE_VERTICAL_BILLBOARD: false,
        };
        this._trailDefines = {
            CC_USE_WORLD_SPACE: true,
        };
    }

    public onInit (ps: Component) {
        this.particleSystem = ps.node.getComponent('cc.ParticleSystemComponent');
        this._particles = new RecyclePool(() => {
            return new Particle(this);
        }, 16);
        this._setVertexAttrib();
        this.onEnable();
        this._updateModel();
        this._updateMaterialParams();
        this._updateTrailMaterial();
    }

    public onEnable () {
        if (!this.particleSystem) {
            return;
        }
        if (this._model == null) {
            this._model = this.particleSystem._getRenderScene().createModel(ParticleBatchModel, this.particleSystem.node) as ParticleBatchModel;
            this._model.viewID = this.particleSystem.visibility;
        }
        if (!this._model.inited) {
            this._model.setCapacity(this.particleSystem.capacity);
            this._model.node = this.particleSystem.node;
        }
        this._model.enabled = this.particleSystem.enabledInHierarchy;
    }

    public onDisable () {
        if (this._model) {
            this._model.enabled = this.particleSystem.enabledInHierarchy;
        }
    }

    public onDestroy () {
        this.particleSystem._getRenderScene().destroyModel(this._model!);
        this._model = null;
    }

    public clear () {
        this._particles!.reset();
        this._updateRenderData();
    }

    public _getFreeParticle (): Particle | null {
        if (this._particles!.length >= this.particleSystem.capacity) {
            return null;
        }
        return this._particles!.add();
    }

    public _setNewParticle (p: Particle) {

    }

    public _updateParticles (dt: number) {
        this.particleSystem.node.getWorldMatrix(_tempWorldTrans);
        switch (this.particleSystem.scaleSpace) {
            case Space.Local:
                this.particleSystem.node.getScale(this._node_scale);
                break;
            case Space.World:
                this.particleSystem.node.getWorldScale(this._node_scale);
                break;
        }
        const mat: Material | null = this.particleSystem.sharedMaterial ? this.particleMaterial : this._defaultMat;
        mat!.setProperty('scale', this._node_scale);
        if (this.particleSystem.velocityOvertimeModule.enable) {
            this.particleSystem.velocityOvertimeModule.update(this.particleSystem._simulationSpace, _tempWorldTrans);
        }
        if (this.particleSystem.forceOvertimeModule.enable) {
            this.particleSystem.forceOvertimeModule.update(this.particleSystem._simulationSpace, _tempWorldTrans);
        }
        if (this.particleSystem.trailModule.enable) {
            this.particleSystem.trailModule.update();
        }
        for (let i = 0; i < this._particles!.length; ++i) {
            const p = this._particles!.data[i];
            p.remainingLifetime -= dt;
            vec3.set(p.animatedVelocity, 0, 0, 0);

            if (p.remainingLifetime < 0.0) {
                if (this.particleSystem.trailModule.enable) {
                    this.particleSystem.trailModule.removeParticle(p);
                }
                this._particles!.removeAt(i);
                --i;
                continue;
            }

            p.velocity.y -= this.particleSystem.gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, p.randomSeed)! * 9.8 * dt; // apply gravity.
            if (this.particleSystem.sizeOvertimeModule.enable) {
                this.particleSystem.sizeOvertimeModule.animate(p);
            }
            if (this.particleSystem.colorOverLifetimeModule.enable) {
                this.particleSystem.colorOverLifetimeModule.animate(p);
            }
            if (this.particleSystem.forceOvertimeModule.enable) {
                this.particleSystem.forceOvertimeModule.animate(p, dt);
            }
            if (this.particleSystem.velocityOvertimeModule.enable) {
                this.particleSystem.velocityOvertimeModule.animate(p);
            } else {
                vec3.copy(p.ultimateVelocity, p.velocity);
            }
            if (this.particleSystem.limitVelocityOvertimeModule.enable) {
                this.particleSystem.limitVelocityOvertimeModule.animate(p);
            }
            if (this.particleSystem.rotationOvertimeModule.enable) {
                this.particleSystem.rotationOvertimeModule.animate(p, dt);
            }
            if (this.particleSystem.textureAnimationModule.enable) {
                this.particleSystem.textureAnimationModule.animate(p);
            }
            vec3.scaleAndAdd(p.position, p.position, p.ultimateVelocity, dt); // apply velocity.
            if (this.particleSystem.trailModule.enable) {
                this.particleSystem.trailModule.animate(p, dt);
            }
        }
        return this._particles!.length;
    }

    // internal function
    public _updateRenderData () {
        // update vertex buffer
        let idx = 0;
        const uploadVel = this._renderMode === RenderMode.StrecthedBillboard;
        for (let i = 0; i < this._particles!.length; ++i) {
            const p = this._particles!.data[i];
            let fi = 0;
            if (this.particleSystem.textureAnimationModule.enable) {
                fi = p.frameIndex;
            }
            idx = i * 4;
            let attrNum = 0;
            if (this._renderMode !== RenderMode.Mesh) {
                for (let j = 0; j < 4; ++j) { // four verts per particle.
                    attrNum = 0;
                    this.attrs[attrNum++] = p.position;
                    _tempAttribUV.x = _uvs[2 * j];
                    _tempAttribUV.y = _uvs[2 * j + 1];
                    _tempAttribUV.z = fi;
                    this.attrs[attrNum++] = _tempAttribUV;
                    _tempAttribUV0.x = p.size.x;
                    _tempAttribUV0.y = p.rotation.x;
                    this.attrs[attrNum++] = _tempAttribUV0;
                    this.attrs[attrNum++] = p.color._val;

                    if (uploadVel) {
                        this.attrs[attrNum++] = p.ultimateVelocity;
                    } else {
                        this.attrs[attrNum++] = null;
                    }

                    this._model!.addParticleVertexData(idx++, this.attrs);
                }
            } else {
                attrNum = 0;
                this.attrs[attrNum++] = p.position;
                _tempAttribUV.z = fi;
                this.attrs[attrNum++] = _tempAttribUV;
                _tempAttribUV0.x = p.size.x;
                _tempAttribUV0.y = p.rotation.x;
                this.attrs[attrNum++] = _tempAttribUV0;
                this.attrs[attrNum++] = p.color._val;
                this._model!.addParticleVertexData(i, this.attrs);
            }
        }

        // because we use index buffer, per particle index count = 6.
        this._model!.updateIA(this._particles!.length);
    }

    public updateShaderUniform () {

    }

    public getParticleCount (): number {
        return this._particles!.length;
    }

    public _onMaterialModified (index: number, material: Material) {
        if (index === 0) {
            this._updateModel();
            this._updateMaterialParams();
        } else {
            this._updateTrailMaterial();
        }
    }

    public _onRebuildPSO (index: number, material: Material) {
        if (this._model && index === 0) {
            this._model.setSubModelMaterial(0, material);
        }
        if (this.particleSystem.trailModule._trailModel && index === 1) {
            this.particleSystem.trailModule._trailModel.setSubModelMaterial(0, material);
        }
    }

    private _setVertexAttrib () {
        switch (this._renderMode) {
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

    private _updateMaterialParams () {
        if (!this.particleSystem) {
            return;
        }
        if (this.particleSystem.sharedMaterial != null && this.particleSystem.sharedMaterial._effectAsset._name.indexOf('particle') === -1) {
            this.particleSystem.setMaterial(null, 0, false);
        }
        if (this.particleSystem.sharedMaterial == null && this._defaultMat == null) {
            this._defaultMat = Material.getInstantiatedMaterial(builtinResMgr.get<Material>('default-particle-material'), this.particleSystem, true);
        }
        const mat: Material | null = this.particleSystem.sharedMaterial ? this.particleMaterial : this._defaultMat;
        if (this.particleSystem._simulationSpace === Space.World) {
            this._defines[CC_USE_WORLD_SPACE] = true;
        } else {
            this._defines[CC_USE_WORLD_SPACE] = false;
        }

        if (this._renderMode === RenderMode.Billboard) {
            this._defines[CC_USE_BILLBOARD] = true;
            this._defines[CC_USE_STRETCHED_BILLBOARD] = false;
            this._defines[CC_USE_HORIZONTAL_BILLBOARD] = false;
            this._defines[CC_USE_VERTICAL_BILLBOARD] = false;
            this._defines[CC_USE_MESH] = false;
        } else if (this._renderMode === RenderMode.StrecthedBillboard) {
            this._defines[CC_USE_BILLBOARD] = false;
            this._defines[CC_USE_STRETCHED_BILLBOARD] = true;
            this._defines[CC_USE_HORIZONTAL_BILLBOARD] = false;
            this._defines[CC_USE_VERTICAL_BILLBOARD] = false;
            this._defines[CC_USE_MESH] = false;
            this.frameTile_velLenScale.z = this._velocityScale;
            this.frameTile_velLenScale.w = this._lengthScale;
        } else if (this._renderMode === RenderMode.HorizontalBillboard) {
            this._defines[CC_USE_BILLBOARD] = false;
            this._defines[CC_USE_STRETCHED_BILLBOARD] = false;
            this._defines[CC_USE_HORIZONTAL_BILLBOARD] = true;
            this._defines[CC_USE_VERTICAL_BILLBOARD] = false;
            this._defines[CC_USE_MESH] = false;
        } else if (this._renderMode === RenderMode.VerticalBillboard) {
            this._defines[CC_USE_BILLBOARD] = false;
            this._defines[CC_USE_STRETCHED_BILLBOARD] = false;
            this._defines[CC_USE_HORIZONTAL_BILLBOARD] = false;
            this._defines[CC_USE_VERTICAL_BILLBOARD] = true;
            this._defines[CC_USE_MESH] = false;
        } else if (this._renderMode === RenderMode.Mesh) {
            this._defines[CC_USE_BILLBOARD] = false;
            this._defines[CC_USE_STRETCHED_BILLBOARD] = false;
            this._defines[CC_USE_HORIZONTAL_BILLBOARD] = false;
            this._defines[CC_USE_VERTICAL_BILLBOARD] = false;
            this._defines[CC_USE_MESH] = true;
        } else {
            console.warn(`particle system renderMode ${this._renderMode} not support.`);
        }

        if (this.particleSystem.textureAnimationModule.enable) {
            vec2.set(this.frameTile_velLenScale, this.particleSystem.textureAnimationModule.numTilesX, this.particleSystem.textureAnimationModule.numTilesY);
            mat!.setProperty('frameTile_velLenScale', this.frameTile_velLenScale);
        } else {
            mat!.setProperty('frameTile_velLenScale', this.frameTile_velLenScale);
        }
        mat!.recompileShaders(this._defines);
        if (this._model) {
            this._model.setSubModelMaterial(0, this.particleSystem.sharedMaterial || this._defaultMat);
        }
    }

    private _updateTrailMaterial () {
        if (this.particleSystem.trailModule.enable) {
            if (this.particleSystem._simulationSpace === Space.World || this.particleSystem.trailModule.space === Space.World) {
                this._trailDefines[CC_USE_WORLD_SPACE] = true;
            } else {
                this._trailDefines[CC_USE_WORLD_SPACE] = false;
            }
            let mat = this.trailMaterial;
            if (mat === null && this._defaultTrailMat === null) {
                this._defaultTrailMat = Material.getInstantiatedMaterial(builtinResMgr.get<Material>('default-trail-material'), this.particleSystem, true);
            }
            if (mat === null) {
                mat = this._defaultTrailMat;
            }
            mat!.recompileShaders(this._trailDefines);
            this.particleSystem.trailModule._updateMaterial();
        }
    }

    private _updateModel () {
        if (!this._model) {
            return;
        }
        this._model.setVertexAttributes(this._renderMode === RenderMode.Mesh ? this._mesh : null, this._vertAttrs);
        // if (Object.getPrototypeOf(this).constructor.name === 'ParticleSystemGpuRenderer') {
        //     return;
        // }
    }
}

Object.assign(ParticleSystemRenderer, { uv: _uvs });
