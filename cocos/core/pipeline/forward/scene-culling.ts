/**
 * @packageDocumentation
 * @hidden
 */

import { aabb, intersect, frustum } from '../../geometry';
import { Model } from '../../renderer/scene/model';
import { Camera, SKYBOX_FLAG } from '../../renderer/scene/camera';
import { Layers } from '../../scene-graph/layers';
import { Vec3, Mat4, Quat, Color } from '../../math';
import { ForwardPipeline } from './forward-pipeline';
import { RenderView } from '../';
import { Pool } from '../../memop';
import { IRenderObject, UBOShadow } from '../define';
import { ShadowType, Shadows } from '../../renderer/scene/shadows';
import { SphereLight, DirectionalLight, RenderScene} from '../../renderer/scene';
import { ShadowsPool, ShadowsView } from '../../renderer';

const _tempVec3 = new Vec3();
const _dir_negate = new Vec3();
const _vec3_p = new Vec3();
const _mat4_trans = new Mat4();
const _castWorldBounds = new aabb();
const _receiveWorldBounds = new aabb();
let _castBoundsInited = false;
let _receiveBoundsInited = false;

const roPool = new Pool<IRenderObject>(() => ({ model: null!, depth: 0 }), 128);
const shadowPool = new Pool<IRenderObject>(() => ({ model: null!, depth: 0 }), 128);

function getRenderObject (model: Model, camera: Camera) {
    let depth = 0;
    if (model.node) {
        Vec3.subtract(_tempVec3, model.node.worldPosition, camera.position);
        depth = Vec3.dot(_tempVec3, camera.forward);
    }
    const ro = roPool.alloc();
    ro.model = model;
    ro.depth = depth;
    return ro;
}

function getCastShadowRenderObject (model: Model, camera: Camera) {
    let depth = 0;
    if (model.node) {
        Vec3.subtract(_tempVec3, model.node.worldPosition, camera.position);
        depth = Vec3.dot(_tempVec3, camera.forward);
    }
    const ro = shadowPool.alloc();
    ro.model = model;
    ro.depth = depth;
    return ro;
}

export function getShadowWorldMatrix (pipeline: ForwardPipeline, rotation: Quat, dir: Vec3) {
    const shadows = pipeline.shadows;
    Vec3.negate(_dir_negate, dir);
    const distance: number = 2.0 * Math.sqrt(3.0) * shadows.sphere.radius;
    Vec3.multiplyScalar(_vec3_p, _dir_negate, distance);
    Vec3.add(_vec3_p, _vec3_p, shadows.sphere.center);

    Mat4.fromRT(_mat4_trans, rotation, _vec3_p);

    return _mat4_trans;
}

function updateSphereLight (pipeline: ForwardPipeline, light: SphereLight) {
    const shadows = pipeline.shadows;

    const pos = light.node!.worldPosition;
    const n = shadows.normal; const d = shadows.distance + 0.001; // avoid z-fighting
    const NdL = Vec3.dot(n, pos);
    const lx = pos.x; const ly = pos.y; const lz = pos.z;
    const nx = n.x; const ny = n.y; const nz = n.z;
    const m = shadows.matLight;
    m.m00 = NdL - d - lx * nx;
    m.m01 = -ly * nx;
    m.m02 = -lz * nx;
    m.m03 = -nx;
    m.m04 = -lx * ny;
    m.m05 = NdL - d - ly * ny;
    m.m06 = -lz * ny;
    m.m07 = -ny;
    m.m08 = -lx * nz;
    m.m09 = -ly * nz;
    m.m10 = NdL - d - lz * nz;
    m.m11 = -nz;
    m.m12 = lx * d;
    m.m13 = ly * d;
    m.m14 = lz * d;
    m.m15 = NdL;

    Mat4.toArray(pipeline.shadowUBO, shadows.matLight, UBOShadow.MAT_LIGHT_PLANE_PROJ_OFFSET);
}

function updateDirLight (pipeline: ForwardPipeline, light: DirectionalLight) {
    const shadows = pipeline.shadows;

    const dir = light.direction;
    const n = shadows.normal; const d = shadows.distance + 0.001; // avoid z-fighting
    const NdL = Vec3.dot(n, dir); const scale = 1 / NdL;
    const lx = dir.x * scale; const ly = dir.y * scale; const lz = dir.z * scale;
    const nx = n.x; const ny = n.y; const nz = n.z;
    const m = shadows.matLight;
    m.m00 = 1 - nx * lx;
    m.m01 = -nx * ly;
    m.m02 = -nx * lz;
    m.m03 = 0;
    m.m04 = -ny * lx;
    m.m05 = 1 - ny * ly;
    m.m06 = -ny * lz;
    m.m07 = 0;
    m.m08 = -nz * lx;
    m.m09 = -nz * ly;
    m.m10 = 1 - nz * lz;
    m.m11 = 0;
    m.m12 = lx * d;
    m.m13 = ly * d;
    m.m14 = lz * d;
    m.m15 = 1;

    Mat4.toArray(pipeline.shadowUBO, shadows.matLight, UBOShadow.MAT_LIGHT_PLANE_PROJ_OFFSET);
}

export function sceneCulling (pipeline: ForwardPipeline, view: RenderView) {
    const camera = view.camera;
    const scene = camera.scene!;
    const mainLight = scene.mainLight;
    const shadows = pipeline.shadows;

    const renderObjects = pipeline.renderObjects;
    roPool.freeArray(renderObjects); renderObjects.length = 0;
    const shadowObjects = pipeline.shadowObjects;
    shadowPool.freeArray(shadowObjects); shadowObjects.length = 0;

    // Each time the calculation,
    // reset the flag.
    _castBoundsInited = false;
    _receiveBoundsInited = false;

    if (shadows.enabled) {
        Color.toArray(pipeline.shadowUBO, shadows.shadowColor, UBOShadow.SHADOW_COLOR_OFFSET);
    }

    if (mainLight) {
        if (shadows.type === ShadowType.Planar) {
            updateDirLight(pipeline, mainLight);
        }
    }

    if (pipeline.skybox.enabled && pipeline.skybox.model && (camera.clearFlag & SKYBOX_FLAG)) {
        renderObjects.push(getRenderObject(pipeline.skybox.model, camera));
    }

    const models = scene.models;

    for (let i = 0; i < models.length; i++) {
        const model = models[i];

        // filter model by view visibility
        if (model.enabled) {
            const vis = view.visibility & Layers.BitMask.UI_2D;
            if (vis) {
                if ((model.node && (view.visibility === model.node.layer)) ||
                    view.visibility === model.visFlags) {
                    renderObjects.push(getRenderObject(model, camera));
                }
            } else {
                if (model.node && ((view.visibility & model.node.layer) === model.node.layer) ||
                    (view.visibility & model.visFlags)) {

                    // shadow render Object
                    if (model.castShadow && model.worldBounds) {
                        if (!_castBoundsInited) {
                            _castWorldBounds.copy(model.worldBounds);
                            _castBoundsInited = true;
                        }
                        aabb.merge(_castWorldBounds, _castWorldBounds, model.worldBounds);
                        shadowObjects.push(getCastShadowRenderObject(model, camera));
                    }

                    // Even if the obstruction is not in the field of view,
                    // the shadow is still visible.
                    if (model.receiveShadow && model.worldBounds) {
                        if(!_receiveBoundsInited) {
                            _receiveWorldBounds.copy(model.worldBounds);
                            _receiveBoundsInited = true;
                        }
                        aabb.merge(_receiveWorldBounds, _receiveWorldBounds, model.worldBounds);
                    }

                    // frustum culling
                    if (model.worldBounds && !intersect.aabb_frustum(model.worldBounds, camera.frustum)) {
                        continue;
                    }

                    renderObjects.push(getRenderObject(model, camera));
                }
            }
        }
    }

    if (_castWorldBounds) {
        aabb.toBoundingSphere(shadows.sphere, _castWorldBounds);
        ShadowsPool.set(shadows.handle, ShadowsView.SPHERE, shadows.sphere.handle);
    }

    if (_receiveWorldBounds) {
        aabb.toBoundingSphere(shadows.receiveSphere, _receiveWorldBounds);
        ShadowsPool.set(shadows.handle, ShadowsView.RECEIVE_SPHERE, shadows.receiveSphere.handle);
    }
}
