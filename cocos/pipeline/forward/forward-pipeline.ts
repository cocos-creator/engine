/**
 * @category pipeline.forward
 */

import { intersect, sphere } from '../../3d/geom-utils';
import { ccclass } from '../../core/data/class-decorator';
import { Root } from '../../core/root';
import { v3 } from '../../core/value-types/vec3';
import { vec3 } from '../../core/vmath';
import { GFXBuffer } from '../../gfx/buffer';
import { GFXBindingType, GFXBufferUsageBit, GFXMemoryUsageBit } from '../../gfx/define';
import { GFXRenderPass } from '../../gfx/render-pass';
import { Light, Model } from '../../renderer';
import { DirectionalLight } from '../../renderer/scene/directional-light';
import { LightType } from '../../renderer/scene/light';
import { SphereLight } from '../../renderer/scene/sphere-light';
import { SpotLight } from '../../renderer/scene/spot-light';
import { cullDirectionalLight, cullSphereLight, cullSpotLight } from '../culling';
import { PIPELINE_FLOW_FORWARD, PIPELINE_FLOW_TONEMAP, RenderPassStage, UBOForwardLight } from '../define';
import { RenderPipeline } from '../render-pipeline';
import { RenderView } from '../render-view';
import { UIFlow } from '../ui/ui-flow';

/**
 * @zh
 * 前向渲染流程优先级。
 */
export enum ForwardFlowPriority {
    FORWARD = 0,
    UI = 10,
}

const _vec4Array = new Float32Array(4);
const _sphere = sphere.create(0, 0, 0, 1);
const _tempLightIndex = [] as number[];
const _tempLightDist = [] as number[];
const _tempVec3 = v3();

/**
 * @zh
 * 前向渲染管线。
 */
@ccclass('ForwardPipeline')
export class ForwardPipeline extends RenderPipeline {

    /**
     * @zh
     * 全部光源的UBO结构描述。
     */
    protected _uboLights: UBOForwardLight = new UBOForwardLight();

    /**
     * @zh
     * 全部光源的UBO缓冲。
     */
    protected _lightsUBO: GFXBuffer | null = null;

    /**
     * @zh
     * 参与渲染的灯光。
     */
    private _validLights: Light[];

    /**
     * @zh
     * 灯光索引偏移量数组。
     */
    private _lightIndexOffset: number[];

    /**
     * @zh
     * 灯光索引数组。
     */
    private _lightIndices: number[];

    public get lightsUBO (): GFXBuffer {
        return this._lightsUBO!;
    }

    /**
     * 构造函数。
     * @param root Root类实例。
     */
    constructor () {
        super();
        this._validLights = [];
        this._lightIndexOffset = [];
        this._lightIndices = [];
    }

    /**
     * @zh
     * 初始化函数。
     * @param info 渲染管线描述信息。
     */
    public initialize (root: Root): boolean {

        super.initialize(root);
        if (!this._initialize()) {
            return false;
        }

        this._name = 'ForwardPipeline';

        if (!this._globalBindings.get(UBOForwardLight.BLOCK.name)) {
            const lightsUBO = this._root.device.createBuffer({
                usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                size: UBOForwardLight.SIZE,
            });

            if (!lightsUBO) {
                return false;
            }

            this._globalBindings.set(UBOForwardLight.BLOCK.name, {
                type: GFXBindingType.UNIFORM_BUFFER,
                blockInfo: UBOForwardLight.BLOCK,
                buffer: lightsUBO,
            });
        }

        const mainWindow = this._root.mainWindow;
        let windowPass: GFXRenderPass | null = null;

        if (mainWindow) {
            windowPass = mainWindow.renderPass;
        }

        if (!windowPass) {
            console.error('RenderPass of main window is null.');
            return false;
        }

        this.addRenderPass(RenderPassStage.DEFAULT, windowPass);

        // create flows

        this.activateFlow(this.getFlow(PIPELINE_FLOW_FORWARD)!);

        if (this._usePostProcess) {
            if (this._useSMAA) {
                /*
                this.createFlow(SMAAEdgeFlow, {
                    name: PIPELINE_FLOW_SMAA,
                    priority: 0,
                });
                */
            }
            this.activateFlow(this.getFlow(PIPELINE_FLOW_TONEMAP)!);
        }

        this.createFlow(UIFlow, {
            name: 'UIFlow',
            priority: ForwardFlowPriority.UI,
        });

        return true;
    }

    /**
     * @zh
     * 销毁函数。
     */
    public destroy () {
        const lightsUBO = this._globalBindings.get(UBOForwardLight.BLOCK.name);
        if (lightsUBO) {
            lightsUBO.buffer!.destroy();
            this._globalBindings.delete(UBOForwardLight.BLOCK.name);
        }

        this._destroy();
    }

    /**
     * @zh
     * 重构函数。
     */
    public rebuild () {
        super.rebuild();
        for (const flow of this._flows) {
            flow.rebuild();
        }
    }

    /**
     * @zh
     * 更新UBO。
     */
    protected updateUBOs (view: RenderView) {
        super.updateUBOs(view);

        const exposure = view.camera.exposure;

        for (let i = 0; i < this._renderObjects.length; i++) {
            this._uboLights.view.fill(0);
            const nextLightIndex = i + 1 < this._renderObjects.length ? this._lightIndexOffset[i + 1] : this._lightIndices.length;
            if (!this._renderObjects[i].model.localBindings.get(UBOForwardLight.BLOCK.name)) {
                continue;
            }
            let sphereNum = 0;
            let spotNum = 0;
            for (let l = this._lightIndexOffset[i]; l < nextLightIndex; l++) {
                const light = this._validLights[this._lightIndices[l]];
                if (light && light.enabled) {
                    switch (light.type) {
                        case LightType.SPHERE:
                            if (sphereNum >= UBOForwardLight.MAX_SPHERE_LIGHTS) {
                                continue;
                            }

                            const sphereLit = light as SphereLight;
                            vec3.array(_vec4Array, sphereLit.position);
                            this._uboLights.view.set(_vec4Array, UBOForwardLight.SPHERE_LIGHT_POS_OFFSET + sphereNum * 4);

                            _vec4Array[0] = sphereLit.size;
                            _vec4Array[1] = sphereLit.range;
                            _vec4Array[2] = 0.0;
                            this._uboLights.view.set(_vec4Array, UBOForwardLight.SPHERE_LIGHT_SIZE_RANGE_OFFSET + sphereNum * 4);

                            vec3.array(_vec4Array, light.color);
                            if (light.useColorTemperature) {
                                const tempRGB = light.colorTemperatureRGB;
                                _vec4Array[0] *= tempRGB.x;
                                _vec4Array[1] *= tempRGB.y;
                                _vec4Array[2] *= tempRGB.z;
                            }
                            _vec4Array[3] = sphereLit.luminance * this._lightMeterScale;
                            if (this._isHDR) {
                                _vec4Array[3] = sphereLit.luminance * this._fpScale * this._lightMeterScale;
                            } else {
                                _vec4Array[3] = sphereLit.luminance * exposure * this._lightMeterScale;
                            }
                            this._uboLights.view.set(_vec4Array, UBOForwardLight.SPHERE_LIGHT_COLOR_OFFSET + sphereNum * 4);
                            sphereNum++;
                            break;
                        case LightType.SPOT:
                            if (spotNum >= UBOForwardLight.MAX_SPOT_LIGHTS) {
                                continue;
                            }

                            const spotLit = light as SpotLight;

                            vec3.array(_vec4Array, spotLit.position);
                            _vec4Array[3] = spotLit.size;
                            this._uboLights.view.set(_vec4Array, UBOForwardLight.SPOT_LIGHT_POS_OFFSET + spotNum * 4);

                            _vec4Array[0] = spotLit.size;
                            _vec4Array[1] = spotLit.range;
                            _vec4Array[2] = spotLit.spotAngle;
                            this._uboLights.view.set(_vec4Array, UBOForwardLight.SPOT_LIGHT_SIZE_RANGE_ANGLE_OFFSET + spotNum * 4);

                            vec3.array(_vec4Array, spotLit.direction);
                            this._uboLights.view.set(_vec4Array, UBOForwardLight.SPOT_LIGHT_DIR_OFFSET + spotNum * 4);

                            vec3.array(_vec4Array, light.color);
                            if (light.useColorTemperature) {
                                const tempRGB = light.colorTemperatureRGB;
                                _vec4Array[0] *= tempRGB.x;
                                _vec4Array[1] *= tempRGB.y;
                                _vec4Array[2] *= tempRGB.z;
                            }
                            if (this._isHDR) {
                                _vec4Array[3] = spotLit.luminance * this._fpScale * this._lightMeterScale;
                            } else {
                                _vec4Array[3] = spotLit.luminance * exposure * this._lightMeterScale;
                            }
                            this._uboLights.view.set(_vec4Array, UBOForwardLight.SPOT_LIGHT_COLOR_OFFSET + spotNum * 4);
                            spotNum++;
                            break;
                    }
                }
            }
            this._renderObjects[i].model.localBindings.get(UBOForwardLight.BLOCK.name)!.buffer!.update(this._uboLights.view);
        }

    }

    /**
     * @zh
     * 场景裁剪。
     * @param view 渲染视图。
     */
    protected sceneCulling (view: RenderView) {
        super.sceneCulling(view);
        this._validLights.splice(0);
        for (const light of view.camera.scene.sphereLights) {
            if (light.enabled) {
                light.update();
                sphere.set(_sphere, light.position.x, light.position.y, light.position.z, light.range);
                if (intersect.sphere_frustum(_sphere, view.camera.frustum)) {
                    this._validLights.push(light);
                }
            }
        }
        for (const light of view.camera.scene.spotLights) {
            if (light.enabled) {
                light.update();
                sphere.set(_sphere, light.position.x, light.position.y, light.position.z, light.range);
                if (intersect.sphere_frustum(_sphere, view.camera.frustum)) {
                    this._validLights.push(light);
                }
            }
        }

        this._lightIndexOffset.splice(0);
        this._lightIndices.splice(0);
        for (let i = 0; i < this._renderObjects.length; i++) {
            this._lightIndexOffset[i] = this._lightIndices.length;
            if (this._renderObjects[i].model.localBindings.get(UBOForwardLight.BLOCK.name)) {
                this.cullLightPerModel(this._renderObjects[i].model);
            }
        }
    }

    /**
     * @zh
     * 对每个模型裁剪光源。
     * @param model 模型。
     */
    private cullLightPerModel (model: Model) {
        _tempLightIndex.splice(0);
        for (let i = 0; i < this._validLights.length; i++) {
            let isCulled = false;
            switch (this._validLights[i].type) {
                case LightType.DIRECTIONAL:
                    isCulled = cullDirectionalLight(this._validLights[i] as DirectionalLight, model);
                    break;
                case LightType.SPHERE:
                    isCulled = cullSphereLight(this._validLights[i] as SphereLight, model);
                    break;
                case LightType.SPOT:
                    isCulled = cullSpotLight(this._validLights[i] as SpotLight, model);
                    break;
            }
            if (!isCulled) {
                _tempLightIndex.push(i);
                if (this._validLights[i].type === LightType.DIRECTIONAL) {
                    _tempLightDist[i] = 0;
                } else {
                    _tempLightDist[i] = vec3.distance((this._validLights[i] as SphereLight | SpotLight).position, model.node.getWorldPosition(_tempVec3));
                }
            }
        }
        _tempLightIndex.sort(this.sortLight);
        this._lightIndices.push(..._tempLightIndex);
    }

    private sortLight (a, b) {
        return _tempLightDist[a] - _tempLightDist[b];
    }
}
