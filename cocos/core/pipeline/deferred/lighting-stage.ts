/*
 Copyright (c) Huawei Technologies Co., Ltd. 2020-2021.

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
 * @category pipeline
 */

import { ccclass, displayOrder, type, serializable } from 'cc.decorator';
import { Camera } from '../../renderer/scene';
import { localDescriptorSetLayout, UBODeferredLight, SetIndex, UBOForwardLight } from '../define';
import { getPhaseID } from '../pass-phase';
import { Color, Rect, Shader, Buffer, BufferUsageBit, MemoryUsageBit, BufferInfo, BufferViewInfo, DescriptorSet, DescriptorSetLayoutInfo,
    DescriptorSetLayout, DescriptorSetInfo, PipelineState, ClearFlagBit } from '../../gfx';
import { IRenderStageInfo, RenderStage } from '../render-stage';
import { DeferredStagePriority } from './enum';
import { LightingFlow } from './lighting-flow';
import { DeferredPipeline } from './deferred-pipeline';
import { PlanarShadowQueue } from '../planar-shadow-queue';
import { Material } from '../../assets/material';
import { PipelineStateManager } from '../pipeline-state-manager';
import { intersect, Sphere } from '../../geometry';
import { Vec3, Vec4 } from '../../math';
import { SRGBToLinear } from '../pipeline-funcs';
import { DeferredPipelineSceneData } from './deferred-pipeline-scene-data';
import { Pass } from '../../renderer/core/pass';
import { renderQueueClearFunc, RenderQueue, convertRenderQueue, renderQueueSortFunc } from '../render-queue';
import { RenderQueueDesc } from '../pipeline-serialization';

const colors: Color[] = [new Color(0, 0, 0, 1)];

/**
 * @en The lighting render stage
 * @zh 前向渲染阶段。
 */
@ccclass('LightingStage')
export class LightingStage extends RenderStage {
    private _deferredLitsBufs: Buffer = null!;
    private _maxDeferredLights = UBODeferredLight.LIGHTS_PER_PASS;
    private _lightBufferData!: Float32Array;
    private _lightMeterScale = 10000.0;
    private _descriptorSet: DescriptorSet = null!;
    private _descriptorSetLayout!: DescriptorSetLayout;
    private _renderArea = new Rect();
    private declare _planarQueue: PlanarShadowQueue;

    @type(Material)
    @serializable
    @displayOrder(3)
    private _deferredMaterial: Material | null = null;

    @type([RenderQueueDesc])
    @serializable
    @displayOrder(2)
    private renderQueues: RenderQueueDesc[] = [];
    private _phaseID = getPhaseID('default');
    private _defPhaseID = getPhaseID('deferred');
    private _renderQueues: RenderQueue[] = [];

    public static initInfo: IRenderStageInfo = {
        name: 'LightingStage',
        priority: DeferredStagePriority.LIGHTING,
        tag: 0,
    };
    public initialize (info: IRenderStageInfo): boolean {
        super.initialize(info);
        return true;
    }
    public gatherLights (camera: Camera) {
        const pipeline = this._pipeline as DeferredPipeline;
        const cmdBuff = pipeline.commandBuffers[0];

        const sphereLights = camera.scene!.sphereLights;
        const spotLights = camera.scene!.spotLights;
        const _sphere = Sphere.create(0, 0, 0, 1);
        const _vec4Array = new Float32Array(4);
        const exposure = camera.exposure;

        let idx = 0;
        const elementLen = Vec4.length; // sizeof(vec4) / sizeof(float32)
        const fieldLen = elementLen * this._maxDeferredLights;

        for (let i = 0; i < sphereLights.length && idx < this._maxDeferredLights; i++, ++idx) {
            const light = sphereLights[i];
            Sphere.set(_sphere, light.position.x, light.position.y, light.position.z, light.range);
            if (intersect.sphereFrustum(_sphere, camera.frustum)) {
                // cc_lightPos
                Vec3.toArray(_vec4Array, light.position);
                _vec4Array[3] = 0;
                this._lightBufferData.set(_vec4Array, idx * elementLen);

                // cc_lightColor
                Vec3.toArray(_vec4Array, light.color);
                if (light.useColorTemperature) {
                    const tempRGB = light.colorTemperatureRGB;
                    _vec4Array[0] *= tempRGB.x;
                    _vec4Array[1] *= tempRGB.y;
                    _vec4Array[2] *= tempRGB.z;
                }

                if (pipeline.pipelineSceneData.isHDR) {
                    _vec4Array[3] = light.luminance * pipeline.pipelineSceneData.fpScale * this._lightMeterScale;
                } else {
                    _vec4Array[3] = light.luminance * exposure * this._lightMeterScale;
                }

                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 1);

                // cc_lightSizeRangeAngle
                _vec4Array[0] = light.size;
                _vec4Array[1] = light.range;
                _vec4Array[2] = 0.0;
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 2);
            }
        }

        for (let i = 0; i < spotLights.length && idx < this._maxDeferredLights; i++, ++idx) {
            const light = spotLights[i];
            Sphere.set(_sphere, light.position.x, light.position.y, light.position.z, light.range);
            if (intersect.sphereFrustum(_sphere, camera.frustum)) {
                // cc_lightPos
                Vec3.toArray(_vec4Array, light.position);
                _vec4Array[3] = 1;
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 0);

                // cc_lightColor
                Vec3.toArray(_vec4Array, light.color);
                if (light.useColorTemperature) {
                    const tempRGB = light.colorTemperatureRGB;
                    _vec4Array[0] *= tempRGB.x;
                    _vec4Array[1] *= tempRGB.y;
                    _vec4Array[2] *= tempRGB.z;
                }
                if (pipeline.pipelineSceneData.isHDR) {
                    _vec4Array[3] = light.luminance * pipeline.pipelineSceneData.fpScale * this._lightMeterScale;
                } else {
                    _vec4Array[3] = light.luminance * exposure * this._lightMeterScale;
                }
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 1);

                // cc_lightSizeRangeAngle
                _vec4Array[0] = light.size;
                _vec4Array[1] = light.range;
                _vec4Array[2] = light.spotAngle;
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 2);

                // cc_lightDir
                Vec3.toArray(_vec4Array, light.direction);
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 3);
            }
        }

        // the count of lights is set to cc_lightDir[0].w
        const offset = fieldLen * 3 + 3;
        this._lightBufferData.set([idx], offset);

        cmdBuff.updateBuffer(this._deferredLitsBufs, this._lightBufferData);
    }

    public activate (pipeline: DeferredPipeline, flow: LightingFlow) {
        super.activate(pipeline, flow);

        const device = pipeline.device;

        // activate queue
        for (let i = 0; i < this.renderQueues.length; i++) {
            this._renderQueues[i] = convertRenderQueue(this.renderQueues[i]);
        }

        let totalSize = Float32Array.BYTES_PER_ELEMENT * 4 * 4 * this._maxDeferredLights;
        totalSize = Math.ceil(totalSize / device.capabilities.uboOffsetAlignment) * device.capabilities.uboOffsetAlignment;

        this._deferredLitsBufs = device.createBuffer(new BufferInfo(
            BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            totalSize,
            device.capabilities.uboOffsetAlignment,
        ));

        const deferredLitsBufView = device.createBuffer(new BufferViewInfo(this._deferredLitsBufs, 0, totalSize));
        this._lightBufferData = new Float32Array(totalSize / Float32Array.BYTES_PER_ELEMENT);

        const layoutInfo = new DescriptorSetLayoutInfo(localDescriptorSetLayout.bindings);
        this._descriptorSetLayout = device.createDescriptorSetLayout(layoutInfo);
        this._descriptorSet = device.createDescriptorSet(new DescriptorSetInfo(this._descriptorSetLayout));
        this._descriptorSet.bindBuffer(UBOForwardLight.BINDING, deferredLitsBufView);

        this._planarQueue = new PlanarShadowQueue(this._pipeline as DeferredPipeline);

        if (this._deferredMaterial) { (pipeline.pipelineSceneData as DeferredPipelineSceneData).deferredLightingMaterial = this._deferredMaterial; }
    }

    public destroy () {
        this._deferredLitsBufs.destroy();
        this._deferredLitsBufs = null!;
        this._descriptorSet = null!;
    }

    public render (camera: Camera) {
        const pipeline = this._pipeline as DeferredPipeline;
        const device = pipeline.device;

        const cmdBuff = pipeline.commandBuffers[0];
        const sceneData = pipeline.pipelineSceneData;
        const renderObjects = sceneData.renderObjects;
        if (renderObjects.length === 0) {
            return;
        }

        // light信息
        this.gatherLights(camera);
        this._descriptorSet.update();
        this._planarQueue.gatherShadowPasses(camera, cmdBuff);

        const dynamicOffsets: number[] = [0];
        cmdBuff.bindDescriptorSet(SetIndex.LOCAL, this._descriptorSet, dynamicOffsets);

        this._renderArea = pipeline.generateRenderArea(camera);

        if (camera.clearFlag & ClearFlagBit.COLOR) {
            if (sceneData.isHDR) {
                SRGBToLinear(colors[0], camera.clearColor);
                const scale = sceneData.fpScale / camera.exposure;
                colors[0].x *= scale;
                colors[0].y *= scale;
                colors[0].z *= scale;
            } else {
                colors[0].x = camera.clearColor.x;
                colors[0].y = camera.clearColor.y;
                colors[0].z = camera.clearColor.z;
            }
        }

        colors[0].w = 0;
        const deferredData = pipeline.getDeferredRenderData(camera);
        const framebuffer = deferredData.lightingFrameBuffer!;
        const renderPass = framebuffer.renderPass;

        cmdBuff.beginRenderPass(renderPass, framebuffer, this._renderArea,
            colors, camera.clearDepth, camera.clearStencil);

        cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);

        // Lighting
        const lightingMat = (sceneData as DeferredPipelineSceneData).deferredLightingMaterial;
        const pass = lightingMat.passes[0];
        const shader = pass.getShaderVariant();
        cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);

        const inputAssembler = pipeline.quadIAOffscreen;
        let pso:PipelineState|null = null;
        if (pass != null && shader != null && inputAssembler != null) {
            pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, inputAssembler);
        }

        if (pso != null) {
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
        }

        // Transparent
        this._renderQueues.forEach(renderQueueClearFunc);

        let m = 0; let p = 0; let k = 0;
        for (let i = 0; i < renderObjects.length; ++i) {
            const ro = renderObjects[i];
            const subModels = ro.model.subModels;
            for (m = 0; m < subModels.length; ++m) {
                const subModel = subModels[m];
                const passes = subModel.passes;
                for (p = 0; p < passes.length; ++p) {
                    const pass = passes[p];
                    // TODO: need fallback of ulit and gizmo material.
                    if (pass.phase !== this._phaseID && pass.phase !== this._defPhaseID) continue;
                    for (k = 0; k < this._renderQueues.length; k++) {
                        this._renderQueues[k].insertRenderPass(ro, m, p);
                    }
                }
            }
        }

        this._renderQueues.forEach(renderQueueSortFunc);
        for (let i = 0; i < this._renderQueues.length; i++) {
            this._renderQueues[i].recordCommandBuffer(device, renderPass, cmdBuff);
        }

        // planarQueue
        this._planarQueue.recordCommandBuffer(device, renderPass, cmdBuff);

        cmdBuff.endRenderPass();
    }
}
