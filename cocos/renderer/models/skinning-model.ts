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

import { Skeleton } from '../../3d/assets/skeleton';
import { SkeletalAnimationClip } from '../../animation';
import { Texture2D } from '../../assets/texture-2d';
import { GFXBuffer } from '../../gfx/buffer';
import { GFXBufferUsageBit, GFXMemoryUsageBit } from '../../gfx/define';
import { UBOSkinningTexture, UNIFORM_JOINTS_TEXTURE } from '../../pipeline/define';
import { Node } from '../../scene-graph/node';
import { Pass } from '../core/pass';
import { samplerLib } from '../core/sampler-lib';
import { Model } from '../scene/model';
import { RenderScene } from '../scene/render-scene';

interface IJointsInfo {
    buffer: GFXBuffer | null;
    nativeData: Float32Array;
    texture: Texture2D;
}

export class SkinningModel extends Model {

    public uploadedClip: SkeletalAnimationClip | null = null;

    private _jointsMedium: IJointsInfo;
    private _skeleton: Skeleton | null = null;

    get worldBounds () {
        return this.uploadedClip ? null : this._worldBounds;
    }

    constructor (scene: RenderScene, node: Node) {
        super(scene, node);
        this._type = 'skinning';
        const buffer = this._device.createBuffer({
            usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
            memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            size: UBOSkinningTexture.SIZE,
            stride: UBOSkinningTexture.SIZE,
        });
        const nativeData = new Float32Array(4);
        const texture = Skeleton.getDefaultJointsTexture(this._device);
        this._jointsMedium = { buffer, nativeData, texture };
    }

    public destroy () {
        super.destroy();
        if (this._jointsMedium.buffer) {
            this._jointsMedium.buffer.destroy();
            this._jointsMedium.buffer = null;
        }
    }

    public bindSkeleton (skeleton: Skeleton | null, skinningRoot: Node | null) {
        this._skeleton = skeleton;
        if (!skeleton || !skinningRoot) { return; }
        this._transform = skinningRoot;
        this._jointsMedium.texture = Skeleton.getDefaultJointsTexture(this._device);
        this._applyJointTexture(this._jointsMedium.texture);
    }

    public uploadAnimationClip (clip: SkeletalAnimationClip) {
        if (!this._skeleton) { return; }
        this._applyJointTexture(this._skeleton.getJointsTextureWithClip(this._device, clip));
        if (this._jointsMedium) { this.uploadedClip = clip; }
    }

    public setFrameID (val: number) {
        const { buffer, nativeData } = this._jointsMedium;
        nativeData[2] = val;
        buffer!.update(nativeData, UBOSkinningTexture.JOINTS_TEXTURE_SIZE_INV_OFFSET);
    }

    public getFrameID () {
        return this._jointsMedium.nativeData[2];
    }

    protected _applyJointTexture (texture: Texture2D) {
        this._jointsMedium.texture = texture;
        const { buffer, nativeData } = this._jointsMedium;
        nativeData[0] = 1 / texture.width;
        nativeData[1] = 1 / texture.height;
        nativeData[2] = 0;
        if (buffer) { buffer.update(nativeData, UBOSkinningTexture.JOINTS_TEXTURE_SIZE_INV_OFFSET); }
        const view = texture.getGFXTextureView();
        const sampler = samplerLib.getSampler(this._device, texture.getSamplerHash());
        if (!view || !sampler) { console.warn('incomplete skinning texture'); return; }
        for (const submodel of this._subModels) {
            if (!submodel.psos) { continue; }
            for (const pso of submodel.psos) {
                pso.pipelineLayout.layouts[0].bindTextureView(UNIFORM_JOINTS_TEXTURE.binding, view);
                pso.pipelineLayout.layouts[0].bindSampler(UNIFORM_JOINTS_TEXTURE.binding, sampler);
            }
        }
    }

    protected _doCreatePSO (pass: Pass) {
        const pso = super._doCreatePSO(pass);
        const { buffer, texture } = this._jointsMedium;
        pso.pipelineLayout.layouts[0].bindBuffer(UBOSkinningTexture.BLOCK.binding, buffer!);
        const view = texture.getGFXTextureView();
        const sampler = samplerLib.getSampler(this._device, texture.getSamplerHash());
        if (view && sampler) {
            pso.pipelineLayout.layouts[0].bindTextureView(UNIFORM_JOINTS_TEXTURE.binding, view);
            pso.pipelineLayout.layouts[0].bindSampler(UNIFORM_JOINTS_TEXTURE.binding, sampler);
        }
        return pso;
    }
}
