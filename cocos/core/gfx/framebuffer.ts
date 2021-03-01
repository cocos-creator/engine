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
 * @module gfx
 */

import { Device } from './device';
import { RenderPass } from './render-pass';
import { Texture } from './texture';
import { Obj, ObjectType } from './define';

export class FramebufferInfo {
    declare private _token: never; // to make sure all usages must be an instance of this exact class, not assembled from plain object

    constructor (
        public renderPass: RenderPass,
        public colorTextures: (Texture | null)[] = [], // pass null to use swapchain buffers
        public depthStencilTexture: Texture | null = null,
        public colorMipmapLevels: number[] = [],
        public depStencilMipmapLevel: number = 0,
    ) {}
}

/**
 * @en GFX frame buffer.
 * @zh GFX 帧缓冲。
 */
export abstract class Framebuffer extends Obj {
    /**
     * @en Get current render pass.
     * @zh GFX 渲染过程。
     */
    public get renderPass (): RenderPass {
        return this._renderPass!;
    }

    /**
     * @en Get current color views.
     * @zh 颜色纹理视图数组。
     */
    public get colorTextures (): (Texture | null)[] {
        return this._colorTextures;
    }

    /**
     * @en Get current depth stencil views.
     * @zh 深度模板纹理视图。
     */
    public get depthStencilTexture (): Texture | null {
        return this._depthStencilTexture;
    }

    protected _device: Device;

    protected _renderPass: RenderPass | null = null;

    protected _colorTextures: (Texture | null)[] = [];

    protected _depthStencilTexture: Texture | null = null;

    constructor (device: Device) {
        super(ObjectType.FRAMEBUFFER);
        this._device = device;
    }

    public abstract initialize (info: FramebufferInfo): boolean;

    public abstract destroy (): void;
}
