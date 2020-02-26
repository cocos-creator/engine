/*
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
 * @hidden
 */

import { AnimationClip } from '../../animation/animation-clip';
import { SkelAnimDataHub } from '../../animation/skeletal-animation-data-hub';
import { getWorldTransformUntilRoot } from '../../animation/transform-utils';
import { Mesh } from '../../assets/mesh';
import { Skeleton } from '../../assets/skeleton';
import { aabb } from '../../geometry';
import { GFXBuffer } from '../../gfx/buffer';
import { GFXAddress, GFXAttributeName, GFXBufferUsageBit, GFXFilter, GFXFormat, GFXFormatInfos, GFXMemoryUsageBit } from '../../gfx/define';
import { GFXDevice, GFXFeature } from '../../gfx/device';
import { Mat4, Quat, Vec3 } from '../../math';
import { UBOSkinningAnimation } from '../../pipeline/define';
import { Node } from '../../scene-graph';
import { genSamplerHash } from '../core/sampler-lib';
import { ITextureBufferHandle, TextureBufferPool } from '../core/texture-buffer-pool';
import { DataPoolManager } from '../data-pool-manager';

// change here and cc-skinning.chunk to use other skinning algorithms
export const uploadJointData = uploadJointDataLBS;

export function selectJointsMediumFormat (device: GFXDevice): GFXFormat {
    if (device.hasFeature(GFXFeature.TEXTURE_FLOAT)) {
        return GFXFormat.RGBA32F;
    } else {
        return GFXFormat.RGBA8;
    }
}

// negative zeros cannot be decoded correctly at GLSL 100 minimum highp float precision, 1/1024
// and it has a significant effect on the final transformation
function makeStable (n: number) { return n ? n : 0; }

// Linear Blending Skinning
function uploadJointDataLBS (out: Float32Array, base: number, mat: Mat4, firstBone: boolean) {
    out[base + 0] = makeStable(mat.m00);
    out[base + 1] = makeStable(mat.m01);
    out[base + 2] = makeStable(mat.m02);
    out[base + 3] = makeStable(mat.m12);
    out[base + 4] = makeStable(mat.m04);
    out[base + 5] = makeStable(mat.m05);
    out[base + 6] = makeStable(mat.m06);
    out[base + 7] = makeStable(mat.m13);
    out[base + 8] = makeStable(mat.m08);
    out[base + 9] = makeStable(mat.m09);
    out[base + 10] = makeStable(mat.m10);
    out[base + 11] = makeStable(mat.m14);
}

const dq_0 = new Quat();
const dq_1 = new Quat();
const v3_1 = new Vec3();
const qt_1 = new Quat();
const v3_2 = new Vec3();

// Dual Quaternion Skinning
function uploadJointDataDQS (out: Float32Array, base: number, mat: Mat4, firstBone: boolean) {
    Mat4.toRTS(mat, qt_1, v3_1, v3_2);
    // sign consistency
    if (firstBone) { Quat.copy(dq_0, qt_1); }
    else if (Quat.dot(dq_0, qt_1) < 0) { Quat.multiplyScalar(qt_1, qt_1, -1); }
    // conversion
    Quat.set(dq_1, v3_1.x, v3_1.y, v3_1.z, 0);
    Quat.multiplyScalar(dq_1, Quat.multiply(dq_1, dq_1, qt_1), 0.5);
    // upload
    out[base + 0] = makeStable(qt_1.x);
    out[base + 1] = makeStable(qt_1.y);
    out[base + 2] = makeStable(qt_1.z);
    out[base + 3] = makeStable(qt_1.w);
    out[base + 4] = makeStable(dq_1.x);
    out[base + 5] = makeStable(dq_1.y);
    out[base + 6] = makeStable(dq_1.z);
    out[base + 7] = makeStable(dq_1.w);
    out[base + 8] = makeStable(v3_2.x);
    out[base + 9] = makeStable(v3_2.y);
    out[base + 10] = makeStable(v3_2.z);
}

function roundUpTextureSize (targetLength: number, formatSize: number) {
    const minSize = 480; // have to be multiples of 12
    const formatScale = 4 / Math.sqrt(formatSize);
    return Math.ceil(Math.max(minSize * formatScale, targetLength) / 12) * 12;
}

export const jointsTextureSamplerHash = genSamplerHash([
    GFXFilter.POINT,
    GFXFilter.POINT,
    GFXFilter.NONE,
    GFXAddress.CLAMP,
    GFXAddress.CLAMP,
    GFXAddress.CLAMP,
]);

export interface IJointsTextureHandle {
    pixelOffset: number;
    refCount: number;
    clipHash: number;
    skeletonHash: number;
    readyToBeDeleted: boolean;
    handle: ITextureBufferHandle;
    bounds: Map<number, aabb[]>;
}

const v3_3 = new Vec3();
const v3_4 = new Vec3();
const v3_min = new Vec3();
const v3_max = new Vec3();
const m4_1 = new Mat4();
const ab_1 = new aabb();

export class JointsTexturePool {

    private _device: GFXDevice;
    private _pool: TextureBufferPool;
    private _textureBuffers: Map<number, IJointsTextureHandle> = new Map(); // per skeleton per clip
    private _formatSize = 0;

    constructor (device: GFXDevice, maxChunks = 8) {
        this._device = device;
        this._pool = new TextureBufferPool(device);
        const format = selectJointsMediumFormat(this._device);
        this._formatSize = GFXFormatInfos[format].size;
        const scale = 16 / this._formatSize;
        this._pool.initialize({
            format,
            maxChunks: maxChunks * scale,
            roundUpFn: roundUpTextureSize,
        });
    }

    public clear () {
        this._pool.destroy();
        this._textureBuffers.clear();
    }

    /**
     * @en
     * Get joint texture for the default pose.
     * @zh
     * 获取默认姿势的骨骼贴图。
     */
    public getDefaultPoseTexture (skeleton: Skeleton, mesh: Mesh, skinningRoot: Node) {
        const hash = skeleton.hash ^ 0; // may not equal to skeleton.hash
        let texture: IJointsTextureHandle | null = this._textureBuffers.get(hash) || null;
        if (texture && texture.bounds.has(mesh.hash)) { texture.refCount++; return texture; }
        const { joints, bindposes } = skeleton;
        let textureBuffer: Float32Array = null!; let buildTexture = false;
        if (!texture) {
            const bufSize = joints.length * 12;
            const handle = this._pool.alloc(bufSize * Float32Array.BYTES_PER_ELEMENT);
            if (!handle) { return texture; }
            texture = { pixelOffset: handle.start / this._formatSize, refCount: 1, bounds: new Map(),
                skeletonHash: skeleton.hash, clipHash: 0, readyToBeDeleted: false, handle };
            textureBuffer = new Float32Array(bufSize); buildTexture = true;
        }
        Vec3.set(v3_min,  Infinity,  Infinity,  Infinity);
        Vec3.set(v3_max, -Infinity, -Infinity, -Infinity);
        const dataPoolManager: DataPoolManager = cc.director.root.dataPoolManager;
        const boneSpaceBounds = dataPoolManager.boneSpaceBoundsInfo.getData(mesh, skeleton);
        for (let i = 0; i < joints.length; i++) {
            const node = skinningRoot.getChildByPath(joints[i]);
            const bound = boneSpaceBounds[i];
            if (!node) { continue; } // don't skip null `bound` here, or it becomes mesh-specific
            getWorldTransformUntilRoot(node, skinningRoot, m4_1);
            if (bound) {
                aabb.transform(ab_1, bound, m4_1);
                ab_1.getBoundary(v3_3, v3_4);
                Vec3.min(v3_min, v3_min, v3_3);
                Vec3.max(v3_max, v3_max, v3_4);
            }
            if (buildTexture) {
                Mat4.multiply(m4_1, m4_1, bindposes[i]);
                uploadJointData(textureBuffer, 12 * i, m4_1, i === 0);
            }
        }
        const bounds = [new aabb()]; texture.bounds.set(mesh.hash, bounds);
        aabb.fromPoints(bounds[0], v3_min, v3_max);
        if (buildTexture) {
            this._pool.update(texture.handle, textureBuffer.buffer);
            this._textureBuffers.set(hash, texture);
        }
        return texture;
    }

    /**
     * @en
     * Get joint texture for the specified animation clip.
     * @zh
     * 获取指定动画片段的骨骼贴图。
     */
    public getSequencePoseTexture (skeleton: Skeleton, clip: AnimationClip, mesh: Mesh) {
        const hash = skeleton.hash ^ clip.hash;
        let texture: IJointsTextureHandle | null = this._textureBuffers.get(hash) || null;
        if (texture && texture.bounds.has(mesh.hash)) { texture.refCount++; return texture; }
        const { joints, bindposes } = skeleton;
        const clipData = SkelAnimDataHub.getOrExtract(clip);
        const frames = clipData.info.frames;
        let textureBuffer: Float32Array = null!; let buildTexture = false;
        if (!texture) {
            const bufSize = joints.length * 12 * frames;
            const handle = this._pool.alloc(bufSize * Float32Array.BYTES_PER_ELEMENT);
            if (!handle) { return null; }
            texture = { pixelOffset: handle.start / this._formatSize, refCount: 1, bounds: new Map(),
                skeletonHash: skeleton.hash, clipHash: clip.hash, readyToBeDeleted: false, handle };
            textureBuffer = new Float32Array(bufSize); buildTexture = true;
        }
        Vec3.set(v3_min,  Infinity,  Infinity,  Infinity);
        Vec3.set(v3_max, -Infinity, -Infinity, -Infinity);
        const dataPoolManager: DataPoolManager = cc.director.root.dataPoolManager;
        const boneSpaceBounds = dataPoolManager.boneSpaceBoundsInfo.getData(mesh, skeleton);
        const bounds: aabb[] = []; texture.bounds.set(mesh.hash, bounds);
        for (let fid = 0; fid < frames; fid++) {
            bounds.push(new aabb(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity));
        }
        for (let i = 0; i < joints.length; i++) {
            const boneSpaceBound = boneSpaceBounds[i];
            const nodeData = clipData.data[joints[i]];
            if (!nodeData) { continue; } // don't skip null `boneSpaceBounds` here, or it becomes mesh-specific
            const bindpose = bindposes[i];
            const matrix = nodeData.worldMatrix.values as Mat4[];
            for (let frame = 0; frame < frames; frame++) {
                const m = matrix[frame];
                const bound = bounds[frame];
                if (boneSpaceBound) {
                    aabb.transform(ab_1, boneSpaceBound, m);
                    ab_1.getBoundary(v3_3, v3_4);
                    Vec3.min(bound.center, bound.center, v3_3);
                    Vec3.max(bound.halfExtents, bound.halfExtents, v3_4);
                }
                if (buildTexture) {
                    Mat4.multiply(m4_1, m, bindpose);
                    uploadJointData(textureBuffer, 12 * (frames * i + frame), m4_1, i === 0);
                }
            }
        }
        for (let frame = 0; frame < frames; frame++) {
            const { center, halfExtents } = bounds[frame];
            aabb.fromPoints(bounds[frame], center, halfExtents);
        }
        if (buildTexture) {
            this._pool.update(texture.handle, textureBuffer.buffer);
            this._textureBuffers.set(hash, texture);
        }
        return texture;
    }

    public releaseHandle (handle: IJointsTextureHandle) {
        if (handle.refCount > 0) { handle.refCount--; }
        if (!handle.refCount && handle.readyToBeDeleted) {
            this._pool.free(handle.handle);
            this._textureBuffers.delete(handle.skeletonHash ^ handle.clipHash);
        }
    }

    public releaseSkeleton (skeleton: Skeleton) {
        const it = this._textureBuffers.values();
        let res = it.next();
        while (!res.done) {
            const handle = res.value;
            if (handle.skeletonHash === skeleton.hash) {
                handle.readyToBeDeleted = true;
                if (handle.refCount) {
                    // delete handle record immediately so new allocations with the same asset could work
                    this._textureBuffers.delete(handle.skeletonHash ^ handle.clipHash);
                } else {
                    this.releaseHandle(handle);
                }
            }
            res = it.next();
        }
    }

    public releaseAnimationClip (clip: AnimationClip) {
        const it = this._textureBuffers.values();
        let res = it.next();
        while (!res.done) {
            const handle = res.value;
            if (handle.clipHash === clip.hash) {
                handle.readyToBeDeleted = true;
                if (handle.refCount) {
                    // delete handle record immediately so new allocations with the same asset could work
                    this._textureBuffers.delete(handle.skeletonHash ^ handle.clipHash);
                } else {
                    this.releaseHandle(handle);
                }
            }
            res = it.next();
        }
    }
}

export interface IAnimInfo {
    buffer: GFXBuffer;
    data: Float32Array;
    dirty: boolean;
}

export class JointsAnimationInfo {
    private _pool = new Map<string, IAnimInfo>(); // per node
    private _device: GFXDevice;

    constructor (device: GFXDevice) {
        this._device = device;
    }

    public getData (nodeID = '-1') {
        const res = this._pool.get(nodeID);
        if (res) { return res; }
        const buffer = this._device.createBuffer({
            usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
            memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            size: UBOSkinningAnimation.SIZE,
            stride: UBOSkinningAnimation.SIZE,
        });
        const data = new Float32Array([1, 0, 0, 0]);
        buffer.update(data);
        const info = { buffer, data, dirty: false };
        this._pool.set(nodeID, info);
        return info;
    }

    public destroy (nodeID: string) {
        const info = this._pool.get(nodeID);
        if (!info) { return; }
        info.buffer.destroy();
        this._pool.delete(nodeID);
    }

    public switchClip (info: IAnimInfo, clip: AnimationClip | null) {
        info.data[0] = clip ? SkelAnimDataHub.getOrExtract(clip).info.frames : 1;
        info.data[1] = 0;
        info.buffer.update(info.data);
        info.dirty = false;
        return info;
    }

    public clear () {
        for (const info of this._pool.values()) {
            info.buffer.destroy();
        }
        this._pool.clear();
    }
}

export class BoneSpaceBoundsInfo {
    private _pool = new Map<number, Map<number, Array<aabb | null>>>(); // per Mesh per Skeleton

    /**
     * @en
     * Get the bone space bounds of specified mesh.
     * @zh
     * 获取指定模型的骨骼空间包围盒。
     */
    public getData (mesh: Mesh, skeleton: Skeleton) {
        let m = this._pool.get(mesh.hash);
        let bounds = m && m.get(skeleton.hash);
        if (bounds) { return bounds; }
        if (!m) { m = new Map<number, Array<aabb | null>>(); this._pool.set(mesh.hash, m); }
        bounds = []; m.set(skeleton.hash, bounds);
        const valid: boolean[] = [];
        const bindposes = skeleton.bindposes;
        for (let i = 0; i < bindposes.length; i++) {
            bounds.push(new aabb(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity));
            valid.push(false);
        }
        for (let p = 0; p < mesh.struct.primitives.length; p++) {
            const joints = mesh.readAttribute(p, GFXAttributeName.ATTR_JOINTS);
            const weights = mesh.readAttribute(p, GFXAttributeName.ATTR_WEIGHTS);
            const positions = mesh.readAttribute(p, GFXAttributeName.ATTR_POSITION);
            if (!joints || !weights || !positions) { continue; }
            const vertCount = Math.min(joints.length / 4, weights.length / 4, positions.length / 3);
            for (let i = 0; i < vertCount; i++) {
                Vec3.set(v3_3, positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2]);
                for (let j = 0; j < 4; ++j) {
                    const idx = 4 * i + j;
                    const joint = joints[idx];
                    if (weights[idx] === 0 || joint >= bindposes.length) { continue; }
                    Vec3.transformMat4(v3_4, v3_3, bindposes[joint]);
                    valid[joint] = true;
                    const b = bounds[joint]!;
                    Vec3.min(b.center, b.center, v3_4);
                    Vec3.max(b.halfExtents, b.halfExtents, v3_4);
                }
            }
        }
        for (let i = 0; i < bindposes.length; i++) {
            const b = bounds[i]!;
            if (!valid[i]) { bounds[i] = null; }
            else { aabb.fromPoints(b, b.center, b.halfExtents); }
        }
        return bounds;
    }

    public clear () {
        this._pool.clear();
    }

    public releaseMesh (mesh: Mesh) {
        this._pool.delete(mesh.hash);
    }

    public releaseSkeleton (skeleton: Skeleton) {
        const it1 = this._pool.values();
        let res1 = it1.next();
        while (!res1.done) {
            res1.value.delete(skeleton.hash);
            res1 = it1.next();
        }
    }
}
