/**
 * @category pipeline
 */

import { ccclass, property } from '../../data/class-decorator';
import { RenderPipeline } from '../render-pipeline';
import { UIFlow } from '../ui/ui-flow';
import { ForwardFlow } from './forward-flow';
import { Root } from '../../root';
import { RenderTextureConfig, MaterialConfig } from '../pipeline-serialization';
import { ShadowFlow } from '../shadow/shadow-flow';
import { Light, genSamplerHash, samplerLib } from '../../renderer';
import { GFXBuffer } from '../../gfx/buffer';
import { LightType } from '../../renderer/scene/light';
import { SphereLight } from '../../renderer/scene/sphere-light';
import { SpotLight } from '../../renderer/scene/spot-light';
import { IRenderObject, UBOGlobal, UBOShadow, UBOPCFShadow,
    UNIFORM_ENVIRONMENT, UBOForwardLight, RenderPassStage, UNIFORM_SHADOWMAP} from '../define';
import { GFXBindingType, GFXBufferUsageBit, GFXMemoryUsageBit,
    GFXStoreOp, GFXCommandBufferType, GFXClearFlag, GFXFilter, GFXAddress } from '../../gfx/define';
import { RenderTexture } from '../../assets/render-texture';
import { Material } from '../../assets/material';
import { GFXColorAttachment, GFXDepthStencilAttachment, GFXRenderPass, GFXLoadOp, GFXTextureLayout } from '../../gfx';
import { SKYBOX_FLAG } from '../../renderer';
import { legacyCC } from '../../global-exports';
import { RenderView } from '../render-view';
import { Mat4, Vec3, Vec2, Quat, Vec4 } from '../../math';
import { GFXFeature } from '../../gfx/device';
import { GFXCommandBuffer } from '../../gfx/command-buffer';

const _vec4Array = new Float32Array(4);
const shadowCamera_W_P = new Vec3();
const shadowCamera_W_R = new Quat();
const shadowCamera_W_S = new Vec3();
const shadowCamera_W_T = new Mat4();

const shadowCamera_M_V = new Mat4();
const shadowCamera_M_P = new Mat4();
const shadowCamera_M_V_P = new Mat4();

// Define shadwoMapCamera
const shadowCamera_Near = 0.1;
const shadowCamera_Far = 1000.0;
const shadowCamera_Fov = 45.0;
const shadowCamera_Aspect = 1.0;
const shadowCamera_OrthoSize = 20.0;

/**
 * @en The forward render pipeline
 * @zh 前向渲染管线。
 */
@ccclass('ForwardPipeline')
export class ForwardPipeline extends RenderPipeline {
    /**
     * @en The lights participating the render process
     * @zh 参与渲染的灯光。
     */
    public get validLights () {
        return this._validLights;
    }

    /**
     * @en The buffer array of lights
     * @zh 灯光 buffer 数组。
     */
    public get lightBuffers () {
        return this._lightBuffers;
    }

    /**
     * @en The index buffer offset of lights
     * @zh 灯光索引缓存偏移量数组。
     */
    public get lightIndexOffsets () {
        return this._lightIndexOffsets;
    };

    /**
     * @en The indices of lights
     * @zh 灯光索引数组。
     */
    public get lightIndices () {
        return this._lightIndices;
    }

    public get isHDR () {
        return this._isHDR;
    }

    public set isHDR (val) {
        if (this._isHDR === val) {
            return
        }

        this._isHDR = val;
        const defaultGlobalUBOData = this._uboGlobal.view;
        defaultGlobalUBOData[UBOGlobal.EXPOSURE_OFFSET + 2] = this._isHDR ? 1.0 : 0.0;
        const globalUBOBuffer = this._globalBindings.get(UBOGlobal.BLOCK.name)!.buffer!;
        globalUBOBuffer.update(defaultGlobalUBOData);
    }

    public get shadingScale (): number {
        return this._shadingScale;
    }

    public get fpScale (): number {
        return this._fpScale;
    }

    /**
     * @zh
     * 获取阴影UBO。
     */
    public  get shadowUBOBuffer (){
        return this._globalBindings.get(UBOPCFShadow.BLOCK.name)!.buffer!;
    }

    /**
     * @zh
     * 获取阴影贴图分辨率
     */
    public get shadowMapSize () {
        return this._shadowMapSize;
    }

    @property({
        type: [RenderTextureConfig],
    })
    protected renderTextures: RenderTextureConfig[] = [];
    @property({
        type: [MaterialConfig],
    })
    protected materials: MaterialConfig[] = [];
    /**
     * @en The list for render objects, only available after the scene culling of the current frame.
     * @zh 渲染对象数组，仅在当前帧的场景剔除完成后有效。
     * @readonly
     */
    public renderObjects: IRenderObject[] = [];
    public commandBuffers: GFXCommandBuffer[] = [];
    protected _renderTextures: Map<string, RenderTexture> = new Map<string, RenderTexture>();
    protected _materials: Map<string, Material> = new Map<string, Material>();
    protected _validLights: Light[] = [];
    protected _lightBuffers: GFXBuffer[] = [];
    protected _lightIndexOffsets: number[] = [];
    protected _lightIndices: number[] = [];
    protected _uboGlobal: UBOGlobal = new UBOGlobal();
    protected _uboLight: UBOForwardLight = new UBOForwardLight();
    protected _isHDR: boolean = false;
    protected _lightMeterScale: number = 10000.0;
    protected _shadingScale: number = 1.0;
    protected _fpScale: number = 1.0 / 1024.0;
    protected _renderPasses = new Map<GFXClearFlag, GFXRenderPass>();
    protected _root: Root | null = null;
    protected _uboPCFShadow: UBOPCFShadow = new UBOPCFShadow();
    protected _shadowMapSize: Vec2 = new Vec2(512, 512);
    public initialize (): boolean {
        super.initialize();

        const shadowFlow = new ShadowFlow();
        shadowFlow.initialize(ShadowFlow.initInfo);
        this._flows.push(shadowFlow);

        const forwardFlow = new ForwardFlow();
        forwardFlow.initialize(ForwardFlow.initInfo);
        this._flows.push(forwardFlow);

        // init textures
        for (let i = 0; i < this.renderTextures.length; i++) {
            const rtd = this.renderTextures[i];
            if (rtd.name !== '' && rtd.texture !== null) {
                this._renderTextures.set(rtd.name, rtd.texture);
            }
        }

        // init materials
        for (let i = 0; i < this.materials.length; i++) {
            const mats = this.materials[i];
            if (mats.name !== '' && mats.material !== null) {
                this._materials.set(mats.name, mats.material);
            }
        }

        return true;
    }

    public activate (): boolean {
        if (!super.activate()) {
            return false;
        }

        this._root = legacyCC.director.root;

        if (!this._activeRenderer()) {
            console.error('ForwardPipeline startup failed!');
            return false;
        }

        const uiFlow = new UIFlow();
        uiFlow.initialize(UIFlow.initInfo);
        this._flows.push(uiFlow);
        uiFlow.activate(this);

        return true;
    }

    /**
     * @en Add a render pass.
     * @zh 添加渲染过程。
     * @param stage The render stage id
     * @param renderPass The render pass setting for the stage
     */
    public addRenderPass (stage: number, renderPass: GFXRenderPass) {
        if (renderPass) {
            this._renderPasses.set(stage, renderPass);
        }
    }

    public getRenderPass (clearFlags: GFXClearFlag): GFXRenderPass {
        let renderPass = this._renderPasses.get(clearFlags);
        if (renderPass) { return renderPass; }

        const device = this.device!;
        const colorAttachment = new GFXColorAttachment();
        const depthStencilAttachment = new GFXDepthStencilAttachment();
        colorAttachment.format = device.colorFormat;
        depthStencilAttachment.format = device.depthStencilFormat;

        if (!(clearFlags & GFXClearFlag.COLOR)) {
            if (clearFlags & SKYBOX_FLAG) {
                colorAttachment.loadOp = GFXLoadOp.DISCARD;
            } else {
                colorAttachment.loadOp = GFXLoadOp.LOAD;
                colorAttachment.beginLayout = GFXTextureLayout.PRESENT_SRC;
            }
        }

        if ((clearFlags & GFXClearFlag.DEPTH_STENCIL) !== GFXClearFlag.DEPTH_STENCIL) {
            if (!(clearFlags & GFXClearFlag.DEPTH)) depthStencilAttachment.depthLoadOp = GFXLoadOp.LOAD;
            if (!(clearFlags & GFXClearFlag.STENCIL)) depthStencilAttachment.stencilLoadOp = GFXLoadOp.LOAD;
            depthStencilAttachment.beginLayout = GFXTextureLayout.DEPTH_STENCIL_ATTACHMENT_OPTIMAL;
        }

        renderPass = device.createRenderPass({
            colorAttachments: [colorAttachment],
            depthStencilAttachment,
        });
        this._renderPasses.set(clearFlags, renderPass!);

        return renderPass;
    }

    /**
     * @en Update all UBOs
     * @zh 更新全部 UBO。
     */
    public updateUBOs (view: RenderView) {
        this._updateUBO(view);
        const exposure = view.camera.exposure;
        const lightMeterScale = this._lightMeterScale;
        const mainLight = view.camera.scene!.mainLight;
        const device = this.device;

        if (mainLight) {
            shadowCamera_W_P.set(mainLight!.node!.getWorldPosition());
            shadowCamera_W_R.set(mainLight!.node!.getWorldRotation());
            shadowCamera_W_S.set(mainLight!.node!.getWorldScale());

            // world Transfrom
            Mat4.fromRTS(shadowCamera_W_T, shadowCamera_W_R, shadowCamera_W_P, shadowCamera_W_S);

            // camera view
            Mat4.invert(shadowCamera_M_V, shadowCamera_W_T);

            // camera proj
            // Mat4.perspective(shadowCamera_M_P, shadowCamera_Fov, shadowCamera_Aspect, shadowCamera_Near, shadowCamera_Far);
            const x = shadowCamera_OrthoSize * shadowCamera_Aspect;
            const y = shadowCamera_OrthoSize;
            Mat4.ortho(shadowCamera_M_P, -x, x, -y, y, shadowCamera_Near, shadowCamera_Far,
                 device.clipSpaceMinZ, device.screenSpaceSignY);

            // camera viewProj
            Mat4.multiply(shadowCamera_M_V_P, shadowCamera_M_P, shadowCamera_M_V);

            Mat4.toArray(this._uboGlobal.view, shadowCamera_M_V_P, UBOGlobal.MAIN_SHADOW_MATRIX_OFFSET);
            // update ubos
            this._globalBindings.get(UBOGlobal.BLOCK.name)!.buffer!.update(this._uboGlobal.view);
        }

        // Fill Shadow UBO
        // Fill cc_shadowMatViewProj
        Mat4.toArray(this._uboPCFShadow.view, shadowCamera_M_V_P, UBOPCFShadow.MAT_SHADOW_VIEW_PROJ_OFFSET);
        this._globalBindings.get(UBOPCFShadow.BLOCK.name)!.buffer!.update(this._uboPCFShadow.view);

        // Fill UBOForwardLight, And update LightGFXBuffer[light_index]
        for(let l = 0; l < this.validLights.length; ++l) {
            this._uboLight.view.fill(0);
            const light = this.validLights[l];
            if (light) {
                switch (light.type) {
                    case LightType.SPHERE:
                        const sphereLit = light as SphereLight;
                        Vec3.toArray(_vec4Array, sphereLit.position);
                        this._uboLight.view.set(_vec4Array, UBOForwardLight.LIGHT_POS_OFFSET);

                        _vec4Array[0] = sphereLit.size;
                        _vec4Array[1] = sphereLit.range;
                        _vec4Array[2] = 0.0;
                        this._uboLight.view.set(_vec4Array, UBOForwardLight.LIGHT_SIZE_RANGE_ANGLE_OFFSET);

                        Vec3.toArray(_vec4Array, light.color);
                        if (light.useColorTemperature) {
                            const tempRGB = light.colorTemperatureRGB;
                            _vec4Array[0] *= tempRGB.x;
                            _vec4Array[1] *= tempRGB.y;
                            _vec4Array[2] *= tempRGB.z;
                        }
                        if (this._isHDR) {
                            _vec4Array[3] = sphereLit.luminance * this._fpScale * lightMeterScale;
                        } else {
                            _vec4Array[3] = sphereLit.luminance * exposure * lightMeterScale;
                        }
                        this._uboLight.view.set(_vec4Array, UBOForwardLight.LIGHT_COLOR_OFFSET);
                    break;
                    case LightType.SPOT:
                        const spotLit = light as SpotLight;

                        Vec3.toArray(_vec4Array, spotLit.position);
                        _vec4Array[3] = spotLit.size;
                        this._uboLight.view.set(_vec4Array, UBOForwardLight.LIGHT_POS_OFFSET);

                        _vec4Array[0] = spotLit.size;
                        _vec4Array[1] = spotLit.range;
                        _vec4Array[2] = spotLit.spotAngle;
                        this._uboLight.view.set(_vec4Array, UBOForwardLight.LIGHT_SIZE_RANGE_ANGLE_OFFSET);

                        Vec3.toArray(_vec4Array, spotLit.direction);
                        this._uboLight.view.set(_vec4Array, UBOForwardLight.LIGHT_DIR_OFFSET);

                        Vec3.toArray(_vec4Array, light.color);
                        if (light.useColorTemperature) {
                            const tempRGB = light.colorTemperatureRGB;
                            _vec4Array[0] *= tempRGB.x;
                            _vec4Array[1] *= tempRGB.y;
                            _vec4Array[2] *= tempRGB.z;
                        }
                        if (this._isHDR) {
                            _vec4Array[3] = spotLit.luminance * this._fpScale * lightMeterScale;
                        } else {
                            _vec4Array[3] = spotLit.luminance * exposure * lightMeterScale;
                        }
                        this._uboLight.view.set(_vec4Array, UBOForwardLight.LIGHT_COLOR_OFFSET);
                    break;
                }
            }
            // update lightBuffer
            this._lightBuffers[l].update(this._uboLight.view);
        }
    }

    private _activeRenderer () {
        const device = this.device;

        this.commandBuffers[0] = device.createCommandBuffer({
            type: GFXCommandBufferType.PRIMARY,
            queue: device.queue,
        });

        let colorAttachment = new GFXColorAttachment();
        let depthStencilAttachment = new GFXDepthStencilAttachment();
        colorAttachment.format = device.colorFormat;
        depthStencilAttachment.format = device.depthStencilFormat;
        depthStencilAttachment.depthStoreOp = GFXStoreOp.DISCARD;
        depthStencilAttachment.stencilStoreOp = GFXStoreOp.DISCARD;

        const windowPass = device.createRenderPass({
            colorAttachments: [colorAttachment],
            depthStencilAttachment,
        });
        this.addRenderPass(RenderPassStage.DEFAULT, windowPass);

        colorAttachment = new GFXColorAttachment();
        colorAttachment.format = device.colorFormat;
        colorAttachment.loadOp = GFXLoadOp.LOAD;
        colorAttachment.beginLayout = GFXTextureLayout.PRESENT_SRC;

        depthStencilAttachment = new GFXDepthStencilAttachment();
        depthStencilAttachment.format = device.depthStencilFormat;
        depthStencilAttachment.depthStoreOp = GFXStoreOp.DISCARD;
        depthStencilAttachment.stencilStoreOp = GFXStoreOp.DISCARD;

        const uiPass = device.createRenderPass({
            colorAttachments: [colorAttachment],
            depthStencilAttachment,
        });
        this.addRenderPass(RenderPassStage.UI, uiPass);

        if (!this._createUBOs()) {
            return false;
        }

        // update global defines when all states initialized.
        this.macros.CC_USE_HDR = this._isHDR;
        this.macros.CC_SUPPORT_FLOAT_TEXTURE = this.device.hasFeature(GFXFeature.TEXTURE_FLOAT);

        return true;
    }

    private _createUBOs (): boolean {
        const device = this.device!;
        const globalBindings = this._globalBindings;
        if (!globalBindings.get(UBOGlobal.BLOCK.name)) {
            const globalUBO = device.createBuffer({
                usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                size: UBOGlobal.SIZE,
            });

            globalBindings.set(UBOGlobal.BLOCK.name, {
                type: GFXBindingType.UNIFORM_BUFFER,
                blockInfo: UBOGlobal.BLOCK,
                buffer: globalUBO,
            });
        }

        if (!globalBindings.get(UBOShadow.BLOCK.name)) {
            const shadowUBO = device.createBuffer({
                usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                size: UBOShadow.SIZE,
            });

            globalBindings.set(UBOShadow.BLOCK.name, {
                type: GFXBindingType.UNIFORM_BUFFER,
                blockInfo: UBOShadow.BLOCK,
                buffer: shadowUBO,
            });
        }

        if (!globalBindings.get(UNIFORM_ENVIRONMENT.name)) {
            globalBindings.set(UNIFORM_ENVIRONMENT.name, {
                type: GFXBindingType.SAMPLER,
                samplerInfo: UNIFORM_ENVIRONMENT,
            });
        }

        if (!globalBindings.get(UBOPCFShadow.BLOCK.name)) {
            const shadowPCFUBO = device.createBuffer({
                usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                size: UBOPCFShadow.SIZE,
            });

            globalBindings.set(UBOPCFShadow.BLOCK.name, {
                type: GFXBindingType.UNIFORM_BUFFER,
                blockInfo: UBOPCFShadow.BLOCK,
                buffer: shadowPCFUBO,
            });
        }

        if (!globalBindings.get(UNIFORM_SHADOWMAP.name)) {
            globalBindings.set(UNIFORM_SHADOWMAP.name, {
                type: GFXBindingType.SAMPLER,
                samplerInfo: UNIFORM_SHADOWMAP,
            });
            const shadowMapSamplerHash = genSamplerHash([
                GFXFilter.LINEAR,
                GFXFilter.LINEAR,
                GFXFilter.NONE,
                GFXAddress.CLAMP,
                GFXAddress.CLAMP,
                GFXAddress.CLAMP,
            ]);
            const shadowmapUniform = globalBindings.get(UNIFORM_SHADOWMAP.name);
            const sampler = samplerLib.getSampler(device, shadowMapSamplerHash);
            shadowmapUniform!.sampler = sampler;
        }

        return true;
    }

    private _updateUBO (view: RenderView) {
        const camera = view.camera;
        const scene = camera.scene!;

        const mainLight = scene.mainLight;
        const ambient = scene.ambient;
        const fog = scene.fog;
        const uboGlobal = this._uboGlobal;
        const fv = uboGlobal.view;
        const device = this.device;

        const shadingWidth = Math.floor(device.width);
        const shadingHeight = Math.floor(device.height);

        // update UBOGlobal
        fv[UBOGlobal.TIME_OFFSET] = this._root!.cumulativeTime;
        fv[UBOGlobal.TIME_OFFSET + 1] = this._root!.frameTime;
        fv[UBOGlobal.TIME_OFFSET + 2] = legacyCC.director.getTotalFrames();

        fv[UBOGlobal.SCREEN_SIZE_OFFSET] = device.width;
        fv[UBOGlobal.SCREEN_SIZE_OFFSET + 1] = device.height;
        fv[UBOGlobal.SCREEN_SIZE_OFFSET + 2] = 1.0 / fv[UBOGlobal.SCREEN_SIZE_OFFSET];
        fv[UBOGlobal.SCREEN_SIZE_OFFSET + 3] = 1.0 / fv[UBOGlobal.SCREEN_SIZE_OFFSET + 1];

        fv[UBOGlobal.SCREEN_SCALE_OFFSET] = camera.width / shadingWidth * this.shadingScale;
        fv[UBOGlobal.SCREEN_SCALE_OFFSET + 1] = camera.height / shadingHeight * this.shadingScale;
        fv[UBOGlobal.SCREEN_SCALE_OFFSET + 2] = 1.0 / fv[UBOGlobal.SCREEN_SCALE_OFFSET];
        fv[UBOGlobal.SCREEN_SCALE_OFFSET + 3] = 1.0 / fv[UBOGlobal.SCREEN_SCALE_OFFSET + 1];

        fv[UBOGlobal.NATIVE_SIZE_OFFSET] = shadingWidth;
        fv[UBOGlobal.NATIVE_SIZE_OFFSET + 1] = shadingHeight;
        fv[UBOGlobal.NATIVE_SIZE_OFFSET + 2] = 1.0 / fv[UBOGlobal.NATIVE_SIZE_OFFSET];
        fv[UBOGlobal.NATIVE_SIZE_OFFSET + 3] = 1.0 / fv[UBOGlobal.NATIVE_SIZE_OFFSET + 1];

        Mat4.toArray(fv, camera.matView, UBOGlobal.MAT_VIEW_OFFSET);
        Mat4.toArray(fv, camera.node.worldMatrix, UBOGlobal.MAT_VIEW_INV_OFFSET);
        Mat4.toArray(fv, camera.matProj, UBOGlobal.MAT_PROJ_OFFSET);
        Mat4.toArray(fv, camera.matProjInv, UBOGlobal.MAT_PROJ_INV_OFFSET);
        Mat4.toArray(fv, camera.matViewProj, UBOGlobal.MAT_VIEW_PROJ_OFFSET);
        Mat4.toArray(fv, camera.matViewProjInv, UBOGlobal.MAT_VIEW_PROJ_INV_OFFSET);
        Vec3.toArray(fv, camera.position, UBOGlobal.CAMERA_POS_OFFSET);
        let projectionSignY = device.screenSpaceSignY;
        if (view.window.hasOffScreenAttachments) {
            projectionSignY *= device.UVSpaceSignY; // need flipping if drawing on render targets
        }
        fv[UBOGlobal.CAMERA_POS_OFFSET + 3] = projectionSignY;

        const exposure = camera.exposure;
        fv[UBOGlobal.EXPOSURE_OFFSET] = exposure;
        fv[UBOGlobal.EXPOSURE_OFFSET + 1] = 1.0 / exposure;
        fv[UBOGlobal.EXPOSURE_OFFSET + 2] = this._isHDR ? 1.0 : 0.0;
        fv[UBOGlobal.EXPOSURE_OFFSET + 3] = this._fpScale / exposure;

        if (mainLight) {
            Vec3.toArray(fv, mainLight.direction, UBOGlobal.MAIN_LIT_DIR_OFFSET);
            Vec3.toArray(fv, mainLight.color, UBOGlobal.MAIN_LIT_COLOR_OFFSET);
            if (mainLight.useColorTemperature) {
                const colorTempRGB = mainLight.colorTemperatureRGB;
                fv[UBOGlobal.MAIN_LIT_COLOR_OFFSET] *= colorTempRGB.x;
                fv[UBOGlobal.MAIN_LIT_COLOR_OFFSET + 1] *= colorTempRGB.y;
                fv[UBOGlobal.MAIN_LIT_COLOR_OFFSET + 2] *= colorTempRGB.z;
            }

            if (this._isHDR) {
                fv[UBOGlobal.MAIN_LIT_COLOR_OFFSET + 3] = mainLight.illuminance * this._fpScale;
            } else {
                fv[UBOGlobal.MAIN_LIT_COLOR_OFFSET + 3] = mainLight.illuminance * exposure;
            }
        } else {
            Vec3.toArray(fv, Vec3.UNIT_Z, UBOGlobal.MAIN_LIT_DIR_OFFSET);
            Vec4.toArray(fv, Vec4.ZERO, UBOGlobal.MAIN_LIT_COLOR_OFFSET);
        }

        const skyColor = ambient.skyColor;
        if (this._isHDR) {
            skyColor[3] = ambient.skyIllum * this._fpScale;
        } else {
            skyColor[3] = ambient.skyIllum * exposure;
        }
        fv.set(skyColor, UBOGlobal.AMBIENT_SKY_OFFSET);
        fv.set(ambient.groundAlbedo, UBOGlobal.AMBIENT_GROUND_OFFSET);

        if (fog.enabled) {
            fv.set(fog.fogColor, UBOGlobal.GLOBAL_FOG_COLOR_OFFSET);

            fv[UBOGlobal.GLOBAL_FOG_BASE_OFFSET] = fog.fogStart;
            fv[UBOGlobal.GLOBAL_FOG_BASE_OFFSET + 1] = fog.fogEnd;
            fv[UBOGlobal.GLOBAL_FOG_BASE_OFFSET + 2] = fog.fogDensity;

            fv[UBOGlobal.GLOBAL_FOG_ADD_OFFSET] = fog.fogTop;
            fv[UBOGlobal.GLOBAL_FOG_ADD_OFFSET + 1] = fog.fogRange;
            fv[UBOGlobal.GLOBAL_FOG_ADD_OFFSET + 2] = fog.fogAtten;
        }

        // update ubos
        this._globalBindings.get(UBOGlobal.BLOCK.name)!.buffer!.update(uboGlobal.view);
    }

    private destroyUBOs () {
        const globalUBO = this._globalBindings.get(UBOGlobal.BLOCK.name);
        if (globalUBO) {
            globalUBO.buffer!.destroy();
            this._globalBindings.delete(UBOGlobal.BLOCK.name);
        }
        const shadowUBO = this._globalBindings.get(UBOShadow.BLOCK.name);
        if (shadowUBO) {
            shadowUBO.buffer!.destroy();
            this._globalBindings.delete(UBOShadow.BLOCK.name);
        }
    }

    public destroy () {
        super.destroy();

        this.destroyUBOs();

        const rtIter = this._renderTextures.values();
        let rtRes = rtIter.next();
        while (!rtRes.done) {
            rtRes.value.destroy();
            rtRes = rtIter.next();
        }

        const rpIter = this._renderPasses.values();
        let rpRes = rpIter.next();
        while (!rpRes.done) {
            rpRes.value.destroy();
            rpRes = rpIter.next();
        }
    }
}
