/**
 * @hidden
 */

import { frustum, intersect } from '../geometry';
import { Mat4, Quat, Vec3 } from '../math';
import { Camera, Light, Model } from '../renderer';
import { DirectionalLight } from '../renderer/scene/directional-light';
import { SphereLight } from '../renderer/scene/sphere-light';
import { SpotLight } from '../renderer/scene/spot-light';

export function cullLight (light: Light, model: Model) {
    // TODO:to add light mask & lightmapped model check.
    return false;
}

export function cullDirectionalLight (light: DirectionalLight, model: Model) {
    return cullLight(light, model);
}

export function cullSphereLight (light: SphereLight, model: Model) {
    return cullLight(light, model) || !!(model.worldBounds && !intersect.aabb_aabb(model.worldBounds, light.aabb));
}

export function cullSpotLight (light: SpotLight, model: Model) {
    return cullLight(light, model) || !!(model.worldBounds &&
        (!intersect.aabb_aabb(model.worldBounds, light.aabb) || !intersect.aabb_frustum(model.worldBounds, light.frustum)));
}

export const cullSceneWithDirectionalLight = (() => {
    const lightFrustum: frustum = new frustum();
    lightFrustum.accurate = true;
    return (out: Model[], modelToCull: Model[], sceneCamera: Camera, light: DirectionalLight, near: number, far: number, nearBias: number) => {
        calcDirectionalLightCullFrustum(lightFrustum, sceneCamera, light, near, far, nearBias);
        for (const m of modelToCull) {
            if (!m.enabled || !m.worldBounds) {
                continue;
            }
            m.updateTransform();
            if (!intersect.aabb_frustum(m.worldBounds, lightFrustum)) {
                continue;
            }
            m.updateUBOs();
            out.push(m);
        }
    };
})();

export const calcDirectionalLightCullFrustum = (() => {
    const lightPos = new Vec3();
    const lightViewCenter = new Vec3();
    const lightRot = new Quat();
    const camFrustum = new frustum();
    camFrustum.accurate = true;
    const lightViewMat = new Mat4();
    const lightVeiwMatInv = new Mat4();
    const minBoxCorner = new Vec3();
    const maxBoxCorner = new Vec3();
    return (out: frustum, sceneCamera: Camera, light: DirectionalLight, near: number, far: number, nearBias: number) => {
        Mat4.fromRT(lightViewMat, light.node!.getWorldRotation(lightRot), sceneCamera.node.getWorldPosition(lightPos));
        Mat4.invert(lightVeiwMatInv, lightViewMat);
        sceneCamera.getSplitFrustum(camFrustum, near, far);
        // transform camera frustum to light space
        camFrustum.transform(lightVeiwMatInv);
        Vec3.set(minBoxCorner, camFrustum.vertices[0].x, camFrustum.vertices[0].y, camFrustum.vertices[0].z);
        Vec3.copy(maxBoxCorner, minBoxCorner);
        // calculate the light frustum corner
        for (let i = 1; i < camFrustum.vertices.length; i++) {
            minBoxCorner.x = Math.min(minBoxCorner.x, camFrustum.vertices[i].x);
            minBoxCorner.y = Math.min(minBoxCorner.y, camFrustum.vertices[i].y);
            minBoxCorner.z = Math.min(minBoxCorner.z, camFrustum.vertices[i].z);
            maxBoxCorner.x = Math.max(maxBoxCorner.x, camFrustum.vertices[i].x);
            maxBoxCorner.y = Math.max(maxBoxCorner.y, camFrustum.vertices[i].y);
            maxBoxCorner.z = Math.max(maxBoxCorner.z, camFrustum.vertices[i].z);
        }
        // calc the light world transform ,suppose that the light's position is at the camera's location.
        Vec3.set(lightViewCenter, (minBoxCorner.x + maxBoxCorner.x) / 2, (minBoxCorner.y + maxBoxCorner.y) / 2, maxBoxCorner.z);
        lightViewCenter.z += nearBias;
        Vec3.transformMat4(lightPos, lightViewCenter, lightViewMat);
        Mat4.fromRT(lightViewMat, light.node!.getWorldRotation(lightRot), lightPos);
        // calc the light's frustum
        frustum.createOrtho(out, maxBoxCorner.x - minBoxCorner.x, maxBoxCorner.y - minBoxCorner.y, 0, minBoxCorner.z - nearBias - maxBoxCorner.z, lightViewMat);
    };
})();
