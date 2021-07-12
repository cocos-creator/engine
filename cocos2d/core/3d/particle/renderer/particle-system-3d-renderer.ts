import { Mat4, Vec2, Vec3, Vec4 } from '../../../value-types';
import gfx from '../../../../renderer/gfx';
import ParticleBatchModel from './particle-batch-model';
import MaterialVariant from '../../../assets/material/material-variant';
import RecyclePool from '../../../../renderer/memop/recycle-pool';
import { RenderMode, Space } from '../enum';
import Particle from '../particle';
import Assembler from '../../../renderer/assembler';
import ParticleSystem3D from '../particle-system-3d';

const { ccclass, property } = require('../../../platform/CCClassDecorator');

// tslint:disable: max-line-length
const _tempAttribUV = new Vec3();
const _tempAttribUV0 = new Vec2();
const _tempAttribColor = new Vec4();
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
//const CC_DRAW_WIRE_FRAME = 'CC_DRAW_WIRE_FRAME'; // <wireframe debug>


var vfmtNormal = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD1, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD2, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },
]);
vfmtNormal.name = 'vfmtNormal';

var vfmtStretch = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD1, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD2, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },
    { name: gfx.ATTR_COLOR1, type: gfx.ATTR_TYPE_FLOAT32, num: 3}
]);
vfmtStretch.name = 'vfmtStretch';

var vfmtMesh = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD1, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_TEX_COORD2, type: gfx.ATTR_TYPE_FLOAT32, num: 3},
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },
    { name: gfx.ATTR_TEX_COORD3, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
    { name: gfx.ATTR_NORMAL, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
    { name: gfx.ATTR_COLOR1, type: gfx.ATTR_TYPE_FLOAT32, num: 4, normalize: true }
]);
vfmtMesh.name = 'vfmtMesh';

@ccclass('cc.ParticleSystem3DAssembler')
export default class ParticleSystem3DAssembler extends Assembler {
    _defines = null;
    _trailDefines = null;
    _model = null;
    frameTile_velLenScale = null;
    attrs = [];
    _vertFormat = [];
    _particleSystem = null;
    _particles = null;
    _defaultMat = null;
    _isAssetReady = false;
    _defaultTrailMat = null;
    _customProperties = null;
    _node_scale = null;

    constructor () {
        super();
        this._model = null;

        this.frameTile_velLenScale = cc.v4(1, 1, 0, 0);
        this._node_scale = cc.v4();
        this.attrs = new Array(5);

        this._trailDefines = {
            CC_USE_WORLD_SPACE: true,
            //CC_DRAW_WIRE_FRAME: true,   // <wireframe debug>
        };
    }

    onInit (ps) {
        this._particleSystem = ps;
        this._particles = new RecyclePool(() => {
            return new Particle(this);
        }, 16);
        this._setVertexAttrib();
        this.onEnable();
        this._updateModel();
        this._updateMaterialParams();
        this._updateTrailMaterial();
    }

    onEnable () {
        if (!this._particleSystem) {
            return;
        }

        if (this._model == null) {
            this._model = new ParticleBatchModel();
        }

        if (!this._model.inited) {
            this._model.setCapacity(this._particleSystem.capacity);
        }

        this._model.enabled = this._particleSystem.enabledInHierarchy;
    }

    onDisable () {
        if (this._model) {
            this._model.enabled = this._particleSystem.enabledInHierarchy;
        }
    }

    onDestroy () {
        this._model = null;
    }

    clear () {
        this._particles.reset();
        this.updateParticleBuffer();
    }

    _getFreeParticle () {
        if (this._particles.length >= this._particleSystem.capacity) {
            return null;
        }
        return this._particles.add();
    }

    _setNewParticle (p) {

    }

    _updateParticles (dt) {
        this._particleSystem.node.getWorldMatrix(_tempWorldTrans);

        switch (this._particleSystem.scaleSpace) {
            case Space.Local:
                this._particleSystem.node.getScale(this._node_scale);
                break;
            case Space.World:
                this._particleSystem.node.getWorldScale(this._node_scale);
                break;
        }

        let material = this._particleSystem.materials[0];
        let mat = material ? this._particleSystem.particleMaterial : this._defaultMat;
        mat.setProperty('scale', this._node_scale);

        if (this._particleSystem.velocityOvertimeModule.enable) {
            this._particleSystem.velocityOvertimeModule.update(this._particleSystem._simulationSpace, _tempWorldTrans);
        }
        if (this._particleSystem.forceOvertimeModule.enable) {
            this._particleSystem.forceOvertimeModule.update(this._particleSystem._simulationSpace, _tempWorldTrans);
        }
        if (this._particleSystem.trailModule.enable) {
            this._particleSystem.trailModule.update();
        }
        for (let i = 0; i < this._particles.length; ++i) {
            const p = this._particles.data[i];
            p.remainingLifetime -= dt;
            Vec3.set(p.animatedVelocity, 0, 0, 0);

            if (p.remainingLifetime < 0.0) {
                if (this._particleSystem.trailModule.enable) {
                    this._particleSystem.trailModule.removeParticle(p);
                }
                this._particles.remove(i);
                --i;
                continue;
            }

            p.velocity.y -= this._particleSystem.gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, p.randomSeed) * 9.8 * dt; // apply gravity.
            if (this._particleSystem.sizeOvertimeModule.enable) {
                this._particleSystem.sizeOvertimeModule.animate(p);
            }
            if (this._particleSystem.colorOverLifetimeModule.enable) {
                this._particleSystem.colorOverLifetimeModule.animate(p);
            }
            if (this._particleSystem.forceOvertimeModule.enable) {
                this._particleSystem.forceOvertimeModule.animate(p, dt);
            }
            if (this._particleSystem.velocityOvertimeModule.enable) {
                this._particleSystem.velocityOvertimeModule.animate(p);
            } else {
                Vec3.copy(p.ultimateVelocity, p.velocity);
            }

            if (this._particleSystem.limitVelocityOvertimeModule.enable) {
                this._particleSystem.limitVelocityOvertimeModule.animate(p);
            }
            if (this._particleSystem.rotationOvertimeModule.enable) {
                this._particleSystem.rotationOvertimeModule.animate(p, dt);
            }
            if (this._particleSystem.textureAnimationModule.enable) {
                this._particleSystem.textureAnimationModule.animate(p);
            }
            Vec3.scaleAndAdd(p.position, p.position, p.ultimateVelocity, dt); // apply velocity.
            if (this._particleSystem.trailModule.enable) {
                this._particleSystem.trailModule.animate(p, dt);
            }
        }
        return this._particles.length;
    }

    // internal function
    updateParticleBuffer () {
        // update vertex buffer
        let idx = 0;
        const uploadVel = this._particleSystem.renderMode === RenderMode.StrecthedBillboard;
        for (let i = 0; i < this._particles.length; ++i) {
            const p = this._particles.data[i];
            let fi = 0;
            if (this._particleSystem.textureAnimationModule.enable) {
                fi = p.frameIndex;
            }
            idx = i * 4;
            let attrNum = 0;
            if (this._particleSystem.renderMode !== RenderMode.Mesh) {
                for (let j = 0; j < 4; ++j) { // four verts per particle.
                    attrNum = 0;
                    this.attrs[attrNum++] = p.position;
                    _tempAttribUV.x = _uvs[2 * j];
                    _tempAttribUV.y = _uvs[2 * j + 1];
                    _tempAttribUV.z = fi;
                    this.attrs[attrNum++] = _tempAttribUV;
                    this.attrs[attrNum++] = p.size;
                    this.attrs[attrNum++] = p.rotation;
                    this.attrs[attrNum++] = p.color._val;

                    if (uploadVel) {
                        this.attrs[attrNum++] = p.ultimateVelocity;
                    } else {
                        this.attrs[attrNum++] = null;
                    }

                    this._model.addParticleVertexData(idx++, this.attrs);
                }
            } else {
                attrNum = 0;
                this.attrs[attrNum++] = p.position;
                _tempAttribUV.z = fi;
                this.attrs[attrNum++] = _tempAttribUV;
                this.attrs[attrNum++] = p.size;
                this.attrs[attrNum++] = p.rotation;
                this.attrs[attrNum++] = p.color._val;
                this._model.addParticleVertexData(i, this.attrs);
            }
        }

        this.updateIA(0, this._particles.length * this._model._indexCount, true);
    }

    updateShaderUniform () {

    }

    updateIA (index, count, vDirty, iDirty) {
        if (!this._model) return;

        this._model.updateIA(index, count, vDirty, iDirty);
    }

    getParticleCount () {
        return this._particles.data.length;
    }

    _onMaterialModified (index, material) {
        if (index === 0) {
            this._updateModel();
            this._updateMaterialParams();
        } else {
            this._updateTrailMaterial();
        }
    }

    _onRebuildPSO (index, material) {
        if (this._model && index === 0) {
            this._model.setModelMaterial(material);
        }
        if (this._particleSystem.trailModule._trailModel && index === 1) {
            this._particleSystem.trailModule._trailModel.setModelMaterial(material);
        }
    }

    _ensureLoadMesh () {
        if (this._particleSystem.mesh && !this._particleSystem.mesh.loaded) {
            cc.assetManager.postLoadNative(this._particleSystem.mesh);
        }
    }

    setCapacity (capacity) {
        if (!this._model) return;

        this._model.setCapacity(capacity);
    }

    _setVertexAttrib () {
        switch (this._particleSystem.renderMode) {
            case RenderMode.StrecthedBillboard:
                this._vertFormat = vfmtStretch;
                break;
            case RenderMode.Mesh:
                this._vertFormat = vfmtMesh;
                break;
            default:
                this._vertFormat = vfmtNormal;
        }
    }

    _updateMaterialParams () {
        if (!this._particleSystem) {
            return;
        }
        let mat = this._particleSystem.materials[0];
        if (mat == null && this._defaultMat == null) {
            mat = this._defaultMat = MaterialVariant.createWithBuiltin('3d-particle', this);
        } else {
            mat = MaterialVariant.create(mat, this._particleSystem);
        }

        mat = mat || this._defaultMat;

        if (this._particleSystem._simulationSpace === Space.World) {
            mat.define(CC_USE_WORLD_SPACE, true);
        } else {
            mat.define(CC_USE_WORLD_SPACE, false);
        }

        if (this._particleSystem.renderMode === RenderMode.Billboard) {
            mat.define(CC_USE_BILLBOARD, true);
            mat.define(CC_USE_STRETCHED_BILLBOARD, false);
            mat.define(CC_USE_HORIZONTAL_BILLBOARD, false);
            mat.define(CC_USE_VERTICAL_BILLBOARD, false);
            mat.define(CC_USE_MESH, false);
        } else if (this._particleSystem.renderMode === RenderMode.StrecthedBillboard) {
            mat.define(CC_USE_BILLBOARD, false);
            mat.define(CC_USE_STRETCHED_BILLBOARD, true);
            mat.define(CC_USE_HORIZONTAL_BILLBOARD, false);
            mat.define(CC_USE_VERTICAL_BILLBOARD, false);
            mat.define(CC_USE_MESH, false);
            this.frameTile_velLenScale.z = this._particleSystem.velocityScale;
            this.frameTile_velLenScale.w = this._particleSystem.lengthScale;
        } else if (this._particleSystem.renderMode === RenderMode.HorizontalBillboard) {
            mat.define(CC_USE_BILLBOARD, false);
            mat.define(CC_USE_STRETCHED_BILLBOARD, false);
            mat.define(CC_USE_HORIZONTAL_BILLBOARD, true);
            mat.define(CC_USE_VERTICAL_BILLBOARD, false);
            mat.define(CC_USE_MESH, false);
        } else if (this._particleSystem.renderMode === RenderMode.VerticalBillboard) {
            mat.define(CC_USE_BILLBOARD, false);
            mat.define(CC_USE_STRETCHED_BILLBOARD, false);
            mat.define(CC_USE_HORIZONTAL_BILLBOARD, false);
            mat.define(CC_USE_VERTICAL_BILLBOARD, true);
            mat.define(CC_USE_MESH, false);
        } else if (this._particleSystem.renderMode === RenderMode.Mesh) {
            mat.define(CC_USE_BILLBOARD, false);
            mat.define(CC_USE_STRETCHED_BILLBOARD, false);
            mat.define(CC_USE_HORIZONTAL_BILLBOARD, false);
            mat.define(CC_USE_VERTICAL_BILLBOARD, false);
            mat.define(CC_USE_MESH, true);
        } else {
            console.warn(`particle system renderMode ${this._particleSystem.renderMode} not support.`);
        }

        if (this._particleSystem.textureAnimationModule.enable) {
            Vec2.set(this.frameTile_velLenScale, this._particleSystem.textureAnimationModule.numTilesX, this._particleSystem.textureAnimationModule.numTilesY);
        }

        mat.setProperty('frameTile_velLenScale', this.frameTile_velLenScale);

        this._particleSystem.setMaterial(0, mat);
    }

    _updateTrailMaterial () {
        // Here need to create a material variant through the getter call.
        let mat = this._particleSystem.trailMaterial;
        if (this._particleSystem.trailModule.enable) {
            if (mat === null && this._defaultTrailMat === null) {
                this._defaultTrailMat = MaterialVariant.createWithBuiltin('3d-trail', this);
            }

            if (mat === null) {
                mat = this._defaultTrailMat;
                this._particleSystem.trailMaterial = mat;
            }

            if (this._particleSystem._simulationSpace === Space.World || this._particleSystem.trailModule.space === Space.World) {
                mat.define(CC_USE_WORLD_SPACE, true);
            } else {
                mat.define(CC_USE_WORLD_SPACE, false);
            }

            //mat.define(CC_DRAW_WIRE_FRAME, true); // <wireframe debug>
            this._particleSystem.trailModule._updateMaterial();
        }
    }

    _updateTrailEnable (enable) {
        if (!this._model) {
            return;
        }

        let subData = this._model._subDatas[1];
        if (subData) {
            subData.enable = enable;
        }
    }

    _updateModel () {
        if (!this._model) {
            return;
        }
        this._model.setVertexAttributes(this._particleSystem.renderMode === RenderMode.Mesh ? this._particleSystem.mesh : null, this._vertFormat);
    }

    setVertexAttributes (mesh, vfmt) {
        if (!this._model) {
            return;
        }
        this._model.setVertexAttributes(mesh, vfmt);
    }

    fillBuffers (comp, renderer) {
        if (!this._model) return;

        this._model._uploadData();

        let submeshes = this._model._subMeshes;
        let subDatas = this._model._subDatas;
        let materials = comp.materials;
        renderer._flush()
        for (let i = 0, len = submeshes.length; i < len; i++) {
            let ia = submeshes[i];
            let meshData = subDatas[i];
            let material = materials[i];

            if (meshData.enable) {
                renderer.material = material;
                renderer.cullingMask = comp.node._cullingMask;
                renderer.node = comp.node;

                renderer._flushIA(ia);
            }
        }
    }
}

Object.assign(ParticleSystem3DAssembler, { uv: _uvs });

Assembler.register(ParticleSystem3D, ParticleSystem3DAssembler);
