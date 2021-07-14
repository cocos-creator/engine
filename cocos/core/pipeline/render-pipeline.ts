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
 * @module pipeline
 */

import { ccclass, displayOrder, type, serializable } from 'cc.decorator';
import { legacyCC } from '../global-exports';
import { Asset } from '../assets/asset';
import { RenderFlow } from './render-flow';
import { MacroRecord } from '../renderer/core/pass-utils';
import { Device, DescriptorSet, CommandBuffer, Feature, Rect } from '../gfx';
import { Camera } from '../renderer/scene/camera';
import { PipelineUBO } from './pipeline-ubo';
import { PipelineSceneData } from './pipeline-scene-data';
import { GlobalDSManager } from './global-descriptor-set-manager';

/**
 * @en Render pipeline information descriptor
 * @zh 渲染管线描述信息。
 */
export interface IRenderPipelineInfo {
    flows: RenderFlow[];
    tag?: number;
}

/**
 * @en Render pipeline describes how we handle the rendering process for all render objects in the related render scene root.
 * It contains some general pipeline configurations, necessary rendering resources and some [[RenderFlow]]s.
 * The rendering process function [[render]] is invoked by [[Root]] for all [[Camera]]s.
 * @zh 渲染管线对象决定了引擎对相关渲染场景下的所有渲染对象实施的完整渲染流程。
 * 这个类主要包含一些通用的管线配置，必要的渲染资源和一些 [[RenderFlow]]。
 * 渲染流程函数 [[render]] 会由 [[Root]] 发起调用并对所有 [[Camera]] 执行预设的渲染流程。
 */
@ccclass('cc.RenderPipeline')
export abstract class RenderPipeline extends Asset {
    /**
     * @en The tag of pipeline.
     * @zh 管线的标签。
     * @readonly
     */
    get tag (): number {
        return this._tag;
    }

    /**
     * @en The flows of pipeline.
     * @zh 管线的渲染流程列表。
     * @readonly
     */
    get flows (): RenderFlow[] {
        return this._flows;
    }

    /**
     * @en Tag
     * @zh 标签
     * @readonly
     */
    @displayOrder(0)
    @serializable
    protected _tag = 0;

    /**
     * @en Flows
     * @zh 渲染流程列表
     * @readonly
     */
    @displayOrder(1)
    @type([RenderFlow])
    @serializable
    protected _flows: RenderFlow[] = [];

    /**
     * @en
     * Constant macro string, static throughout the whole runtime.
     * Used to pass device-specific parameters to shader.
     * @zh 常量宏定义字符串，运行时全程不会改变，用于给 shader 传一些只和平台相关的参数。
     * @readonly
     */
    get constantMacros () {
        return this._constantMacros;
    }

    /**
     * @en
     * The current global-scoped shader macros.
     * Used to control effects like IBL, fog, etc.
     * @zh 当前的全局宏定义，用于控制如 IBL、雾效等模块。
     * @readonly
     */
    get macros () {
        return this._macros;
    }

    get device () {
        return this._device;
    }

    get globalDSManager () {
        return this._globalDSManager;
    }

    get descriptorSetLayout () {
        return this._globalDSManager.descriptorSetLayout;
    }

    get descriptorSet () {
        return this._descriptorSet;
    }

    get commandBuffers () {
        return this._commandBuffers;
    }

    get pipelineUBO () {
        return this._pipelineUBO;
    }

    get pipelineSceneData () {
        return this._pipelineSceneData;
    }

    protected _device!: Device;
    protected _globalDSManager!: GlobalDSManager;
    protected _descriptorSet!: DescriptorSet;
    protected _commandBuffers: CommandBuffer[] = [];
    protected _pipelineUBO = new PipelineUBO();
    protected _macros: MacroRecord = {};
    protected _constantMacros = '';
    protected declare _pipelineSceneData: PipelineSceneData;

    /**
     * @en The initialization process, user shouldn't use it in most case, only useful when need to generate render pipeline programmatically.
     * @zh 初始化函数，正常情况下不会用到，仅用于程序化生成渲染管线的情况。
     * @param info The render pipeline information
     */
    public initialize (info: IRenderPipelineInfo): boolean {
        this._flows = info.flows;
        if (info.tag) { this._tag = info.tag; }
        return true;
    }

    /**
     * @en generate renderArea by camera
     * @zh 生成renderArea
     * @param camera the camera
     * @returns
     */
    public generateRenderArea (camera: Camera): Rect {
        const res = new Rect();
        const vp = camera.viewport;
        const sceneData = this.pipelineSceneData;
        // render area is not oriented
        const w = camera.window!.hasOnScreenAttachments && this.device.surfaceTransform % 2 ? camera.height : camera.width;
        const h = camera.window!.hasOnScreenAttachments && this.device.surfaceTransform % 2 ? camera.width : camera.height;
        res.x = vp.x * w;
        res.y = vp.y * h;
        res.width = vp.width * w * sceneData.shadingScale;
        res.height = vp.height * h * sceneData.shadingScale;
        return res;
    }

    /**
     * @en Activate the render pipeline after loaded, it mainly activate the flows
     * @zh 当渲染管线资源加载完成后，启用管线，主要是启用管线内的 flow
     */
    public activate (): boolean {
        this._device = legacyCC.director.root.device;
        this._globalDSManager = new GlobalDSManager(this);
        this._descriptorSet = this._globalDSManager.globalDescriptorSet;
        this._pipelineUBO.activate(this._device, this);
        this._pipelineSceneData.activate(this._device, this);

        for (let i = 0; i < this._flows.length; i++) {
            this._flows[i].activate(this);
        }

        // update global defines when all states initialized.
        this._macros.CC_USE_HDR = this._pipelineSceneData.isHDR;
        this._generateConstantMacros();

        return true;
    }

    /**
     * @en Render function, it basically run the render process of all flows in sequence for the given view.
     * @zh 渲染函数，对指定的渲染视图按顺序执行所有渲染流程。
     * @param view Render view。
     */
    public render (cameras: Camera[]) {
        for (let j = 0; j < this.flows.length; j++) {
            for (let i = 0; i < cameras.length; i++) {
                const camera = cameras[i];
                this.flows[j].render(camera);
            }
        }
    }

    /**
     * @en Internal destroy function
     * @zh 内部销毁函数。
     */
    public destroy (): boolean {
        for (let i = 0; i < this._flows.length; i++) {
            this._flows[i].destroy();
        }
        this._flows.length = 0;

        if (this._descriptorSet) {
            this._descriptorSet.destroy();
        }

        this._globalDSManager.destroy();

        for (let i = 0; i < this._commandBuffers.length; i++) {
            this._commandBuffers[i].destroy();
        }
        this._commandBuffers.length = 0;
        this._pipelineUBO.destroy();
        this._pipelineSceneData.destroy();

        return super.destroy();
    }

    /**
     * @en Device size change.
     * @zh 设备尺寸重置。
     */
    public resize (width: number, height: number) {}

    protected _generateConstantMacros () {
        let str = '';
        str += `#define CC_DEVICE_SUPPORT_FLOAT_TEXTURE ${this.device.hasFeature(Feature.TEXTURE_FLOAT) ? 1 : 0}\n`;
        str += `#define CC_DEVICE_MAX_VERTEX_UNIFORM_VECTORS ${this.device.capabilities.maxVertexUniformVectors}\n`;
        str += `#define CC_DEVICE_MAX_FRAGMENT_UNIFORM_VECTORS ${this.device.capabilities.maxFragmentUniformVectors}\n`;
        this._constantMacros = str;
    }
}

// Do not delete, for the class detection of editor
legacyCC.RenderPipeline = RenderPipeline;
