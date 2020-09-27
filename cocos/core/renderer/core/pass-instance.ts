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
 * @category material
 */

import { IPassInfo } from '../../assets/effect-asset';
import { MaterialInstance } from './material-instance';
import { Pass, PassOverrides } from './pass';
import { overrideMacros, MacroRecord } from './pass-utils';
import { PassView, RasterizerStatePool, DepthStencilStatePool, BlendStatePool, PassPool } from './memory-pools';

export class PassInstance extends Pass {

    get parent () { return this._parent; }

    private _parent: Pass;
    private _owner: MaterialInstance;
    private _dontNotify = false;

    constructor (parent: Pass, owner: MaterialInstance) {
        super(parent.root);
        this._parent = parent;
        this._owner = owner;
        this._doInit(this._parent, true); // defines may change now
        for (let i = 0; i < this._shaderInfo.blocks.length; i++) {
            const u = this._shaderInfo.blocks[i];
            const block = this._blocks[u.binding];
            const parentBlock = this._parent.blocks[u.binding];
            block.set(parentBlock);
        }
        this._rootBufferDirty = true;
        const paren = this._parent as PassInstance;
        for (let i = 0; i < this._shaderInfo.samplers.length; i++) {
            const u = this._shaderInfo.samplers[i];
            for (let j = 0; j < u.count; j++) {
                const sampler = paren._descriptorSet.getSampler(u.binding, j);
                const texture = paren._descriptorSet.getTexture(u.binding, j);
                this._descriptorSet.bindSampler(u.binding, sampler, j);
                this._descriptorSet.bindTexture(u.binding, texture, j);
            }
        }
        super.tryCompile();
    }

    public overridePipelineStates (original: IPassInfo, overrides: PassOverrides): void {
        BlendStatePool.free(PassPool.get(this._handle, PassView.BLEND_STATE));
        RasterizerStatePool.free(PassPool.get(this._handle, PassView.RASTERIZER_STATE));
        DepthStencilStatePool.free(PassPool.get(this._handle, PassView.DEPTH_STENCIL_STATE));
        PassPool.set(this._handle, PassView.BLEND_STATE, BlendStatePool.alloc());
        PassPool.set(this._handle, PassView.RASTERIZER_STATE, RasterizerStatePool.alloc());
        PassPool.set(this._handle, PassView.DEPTH_STENCIL_STATE, DepthStencilStatePool.alloc());

        Pass.fillPipelineInfo(this._handle, original);
        Pass.fillPipelineInfo(this._handle, overrides);
        this._onStateChange();
    }

    public tryCompile (defineOverrides?: MacroRecord) {
        if (defineOverrides) {
            if (!overrideMacros(this._defines, defineOverrides)) {
                return false;
            }
        }
        const res = super.tryCompile();
        this._onStateChange();
        return res;
    }

    public beginChangeStatesSilently () {
        this._dontNotify = true;
    }

    public endChangeStatesSilently () {
        this._dontNotify = false;
    }

    protected _syncBatchingScheme () {
        this._defines.USE_BATCHING = this._defines.USE_INSTANCING = false;
        PassPool.set(this._handle, PassView.BATCHING_SCHEME, 0);
    }

    protected _onStateChange () {
        PassPool.set(this._handle, PassView.HASH, Pass.getPassHash(this._handle, this._hShaderDefault));
        this._owner.onPassStateChange(this._dontNotify);
    }
}
