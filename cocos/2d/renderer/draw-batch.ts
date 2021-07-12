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

import { JSB } from 'internal:constants';
import { MeshBuffer } from './mesh-buffer';
import { Material } from '../../core/assets/material';
import { Texture, Sampler, InputAssembler, DescriptorSet, Shader } from '../../core/gfx';
import { Node } from '../../core/scene-graph';
import { Camera } from '../../core/renderer/scene/camera';
import { RenderScene } from '../../core/renderer/scene/render-scene';
import { Model } from '../../core/renderer/scene/model';
import { Batcher2D } from './batcher-2d';
import { Layers } from '../../core/scene-graph/layers';
import { legacyCC } from '../../core/global-exports';
import { Pass } from '../../core/renderer/core/pass';
import { NativeDrawBatch2D, NativePass } from '../../core/renderer/scene';
import { DrawBatchBufferHandle, DrawBatchView, DrawBatchPool, NULL_HANDLE, PassPool, ShaderPool, IAPool, DSPool } from '../../core/renderer';

const UI_VIS_FLAG = Layers.Enum.NONE | Layers.Enum.UI_3D;

export class DrawBatch2D {
    public get native (): NativeDrawBatch2D {
        return this._nativeObj!;
    }

    public get inputAssembler () {
        return this._inputAssember;
    }
    public set inputAssembler (ia: InputAssembler | null) {
        this._inputAssember = ia;
        if (JSB) {
            this._nativeInputAssembler[0] = ia ? IAPool.getHandle(ia) as unknown as number : 0;
        }
    }
    public get descriptorSet () {
        return this._descriptorSet;
    }
    public set descriptorSet (ds: DescriptorSet | null) {
        this._descriptorSet = ds;
        if (JSB) {
            this._nativeDescriptorSet[0] = ds ? DSPool.getHandle(ds) as unknown as number : 0;
        }
    }
    public get visFlags () {
        return this._visFlags;
    }
    public set visFlags (vis) {
        this._visFlags = vis;

        if (JSB) {
            this._nativeVisFlags[0] = vis;
        }
    }
    public get passes () {
        return this._passes;
    }

    public get shaders () {
        return this._shaders;
    }

    public bufferBatch: MeshBuffer | null = null;
    public camera: Camera | null = null;
    public renderScene: RenderScene | null = null;
    public model: Model | null = null;
    public texture: Texture | null = null;
    public sampler: Sampler | null = null;
    public useLocalData: Node | null = null;
    public isStatic = false;
    public textureHash = 0;
    public samplerHash = 0;
    private _passes: Pass[] = [];
    private _shaders: Shader[] = [];
    private _visFlags: number = UI_VIS_FLAG;
    private _inputAssember: InputAssembler | null = null;
    private _descriptorSet: DescriptorSet | null = null;
    private _batchHandle: DrawBatchBufferHandle = NULL_HANDLE;
    private declare _nativeObj: NativeDrawBatch2D | null;
    private declare _nativeVisFlags: Uint32Array;
    private declare _nativeInputAssembler: Uint32Array;
    private declare _nativeDescriptorSet: Uint32Array;
    private declare _nativePassCount: Uint32Array;
    private declare _nativePasses: Uint32Array;
    private declare _nativeShaders: Uint32Array;

    constructor () {
        if (JSB) {
            this._nativeObj = new NativeDrawBatch2D();
            this._batchHandle = DrawBatchPool.alloc();
            this._nativeVisFlags = DrawBatchPool.getTypedArray(this._batchHandle, DrawBatchView.VIS_FLAGS) as Uint32Array;
            this._nativePassCount = DrawBatchPool.getTypedArray(this._batchHandle, DrawBatchView.PASS_COUNT) as Uint32Array;
            this._nativeInputAssembler = DrawBatchPool.getTypedArray(this._batchHandle, DrawBatchView.INPUT_ASSEMBLER) as Uint32Array;
            this._nativeDescriptorSet = DrawBatchPool.getTypedArray(this._batchHandle, DrawBatchView.DESCRIPTOR_SET) as Uint32Array;
            this._nativePasses = DrawBatchPool.getTypedArray(this._batchHandle, DrawBatchView.PASSES) as Uint32Array;
            this._nativeShaders = DrawBatchPool.getTypedArray(this._batchHandle, DrawBatchView.SHADERS) as Uint32Array;
            this._nativeObj.initWithData(DrawBatchPool.getBuffer(this._batchHandle));
            this._nativeVisFlags[0] = this._visFlags;
        }
    }

    public destroy (ui: Batcher2D) {
        this._passes.length = 0;
        if (JSB) {
            this._nativePassCount[0] = 0;
            this._nativeObj = null;
            if (this._batchHandle) {
                DrawBatchPool.free(this._batchHandle);
            }
        }
    }

    public clear () {
        this.bufferBatch = null;
        this.inputAssembler = null;
        this.descriptorSet = null;
        this.camera = null;
        this.texture = null;
        this.sampler = null;
        this.model = null;
        this.isStatic = false;
        this.useLocalData = null;
        this.visFlags = UI_VIS_FLAG;
    }

    // object version
    public fillPasses (mat: Material | null, dss, dssHash, bs, bsHash, patches) {
        if (mat) {
            const passes = mat.passes;
            if (!passes) { return; }

            let hashFactor = 0;

            for (let i = 0; i < passes.length; i++) {
                if (!this._passes[i]) {
                    this._passes[i] = new Pass(legacyCC.director.root);
                }
                const mtlPass = passes[i];
                const passInUse = this._passes[i];

                mtlPass.update();

                if (mtlPass.hash === passInUse.hash) {
                    continue;
                }

                if (!dss) { dss = mtlPass.depthStencilState; dssHash = 0; }
                if (!bs) { bs = mtlPass.blendState; bsHash = 0; }
                if (bsHash === -1) { bsHash = 0; }

                hashFactor = (dssHash << 16) | bsHash;
                // @ts-expect-error hack for UI use pass object
                passInUse._initPassFromTarget(mtlPass, dss, bs, hashFactor);

                this._shaders[i] = this._passes[i].getShaderVariant()!;
                if (JSB) {
                    this._nativePasses[i] = PassPool.getHandle(this._passes[i].native) as unknown as number;
                    this._nativeShaders[i] = ShaderPool.getHandle(this._shaders[i]) as unknown as number;
                }
            }

            if (JSB) {
                this._nativePassCount[0] = passes.length;
            }
        }
    }
}
