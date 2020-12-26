/*
 Copyright (c) 2019-2020 Xiamen Yaji Software Co., Ltd.

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

import { Material } from '../../core/assets/material';
import { Pass } from '../../core/renderer/core/pass';
import { PassView, PassPool, DescriptorSetHandle, NULL_HANDLE } from '../../core/renderer/core/memory-pools';

export interface IUIMaterialInfo {
    material: Material;
}

export class UIMaterial {

    protected _material: Material | null = null;
    protected _pass: Pass | null = null;
    protected _hDescriptorSet: DescriptorSetHandle = NULL_HANDLE;

    private _refCount: number = 0;

    get material () {
        return this._material!;
    }

    get pass () {
        return this._pass!;
    }

    get hDescriptorSet () {
        return this._hDescriptorSet!;
    }

    public initialize (info: IUIMaterialInfo): boolean {

        if (!info.material) {
            return false;
        }

        this._material = new Material();

        this._material.copy(info.material);

        this._pass = this._material.passes[0];
        this._pass.update();

        this._hDescriptorSet = PassPool.get(this._pass!.handle, PassView.DESCRIPTOR_SET);

        return true;
    }

    public increase () {
        this._refCount++;
        return this._refCount;
    }

    public decrease () {
        this._refCount--;
        if (this._refCount === 0) {
            this.destroy();
        }
        return this._refCount;
    }

    public destroy () {
        if (this._material) {
            this._material.destroy();
            this._material = null;
        }
        this._refCount = 0;
    }
}
