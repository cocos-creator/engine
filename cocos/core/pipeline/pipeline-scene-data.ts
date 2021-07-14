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

import { JSB } from 'internal:constants';
import { Fog } from '../renderer/scene/fog';
import { Ambient } from '../renderer/scene/ambient';
import { Skybox } from '../renderer/scene/skybox';
import { Shadows } from '../renderer/scene/shadows';
import { IRenderObject } from './define';
import { Device, Framebuffer } from '../gfx';
import { RenderPipeline } from './render-pipeline';
import { Light } from '../renderer/scene/light';
import { NativePipelineSharedSceneData } from '../renderer/scene';

export class PipelineSceneData {
    private _init (): void {
        if (JSB) {
            this._nativeObj = new NativePipelineSharedSceneData();
            this._nativeObj.fog = this.fog.native;
            this._nativeObj.ambient = this.ambient.native;
            this._nativeObj.skybox = this.skybox.native;
            this._nativeObj.shadow = this.shadows.native;
        }
    }

    public get native (): NativePipelineSharedSceneData {
        return this._nativeObj!;
    }

    /**
     * @en Is open HDR.
     * @zh 是否开启 HDR。
     * @readonly
     */
    public get isHDR () {
        return this._isHDR;
    }

    public set isHDR (val: boolean) {
        this._isHDR = val;
        if (JSB) {
            this._nativeObj!.isHDR = val;
        }
    }
    public get shadingScale () {
        return this._shadingScale;
    }

    public set shadingScale (val: number) {
        this._shadingScale = val;
        if (JSB) {
            this._nativeObj!.shadingScale = val;
        }
    }
    public get fpScale () {
        return this._fpScale;
    }
    public set fpScale (val: number) {
        this._fpScale = val;
        if (JSB) {
            this._fpScale = val;
        }
    }

    public fog: Fog = new Fog();
    public ambient: Ambient = new Ambient();
    public skybox: Skybox = new Skybox();
    public shadows: Shadows = new Shadows();
    /**
     * @en The list for render objects, only available after the scene culling of the current frame.
     * @zh 渲染对象数组，仅在当前帧的场景剔除完成后有效。
     */
    public renderObjects: IRenderObject[] = [];
    public shadowObjects: IRenderObject[] = [];
    public shadowFrameBufferMap: Map<Light, Framebuffer> = new Map();
    protected declare _device: Device;
    protected declare _pipeline: RenderPipeline;
    protected declare _nativeObj: NativePipelineSharedSceneData | null;
    protected _isHDR = false;
    protected _shadingScale = 1.0;
    protected _fpScale = 1.0 / 1024.0;

    constructor () {
        this._init();
        this.shadingScale = 1.0;
        this.fpScale = 1.0 / 1024.0;
    }

    public activate (device: Device, pipeline: RenderPipeline) {
        this._device = device;
        this._pipeline = pipeline;
        return true;
    }

    public onGlobalPipelineStateChanged () {
    }

    public destroy () {
        this.ambient.destroy();
        this.skybox.destroy();
        this.fog.destroy();
        this.shadows.destroy();
        if (JSB) {
            this._nativeObj = null;
        }
    }
}
