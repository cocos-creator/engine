/**
 * @category pipeline
 */

import { Pass } from '../renderer/core/pass';
import { Model } from '../renderer/scene/model';
import { SubModel } from '../renderer/scene/submodel';
import { Layers } from '../scene-graph/layers';
import { legacyCC } from '../global-exports';
import { GFXBindingMappingInfo, GFXDescriptorType, GFXType, GFXShaderStageFlagBit, IGFXDescriptorSetLayoutBinding } from '../gfx';
import { IBlockInfo, ISamplerInfo } from '../assets/effect-asset';

export const PIPELINE_FLOW_FORWARD: string = 'ForwardFlow';
export const PIPELINE_FLOW_SHADOW: string = 'ShadowFlow';
export const PIPELINE_FLOW_SMAA: string = 'SMAAFlow';
export const PIPELINE_FLOW_TONEMAP: string = 'ToneMapFlow';

/**
 * @en The predefined render pass stage ids
 * @zh 预设的渲染阶段。
 */
export enum RenderPassStage {
    DEFAULT = 100,
    UI = 200,
}
legacyCC.RenderPassStage = RenderPassStage;

/**
 * @en The predefined render priorities
 * @zh 预设的渲染优先级。
 */
export enum RenderPriority {
    MIN = 0,
    MAX = 0xff,
    DEFAULT = 0x80,
}

/**
 * @en Render object interface
 * @zh 渲染对象接口。
 */
export interface IRenderObject {
    model: Model;
    depth: number;
}

/*
 * @en The render pass interface
 * @zh 渲染过程接口。
 */
export interface IRenderPass {
    hash: number;
    depth: number;
    shaderId: number;
    subModel: SubModel;
    passIdx: number;
}

/**
 * @en Render batch interface
 * @zh 渲染批次接口。
 */
export interface IRenderBatch {
    pass: Pass;
}

/**
 * @en Render queue descriptor
 * @zh 渲染队列描述。
 */
export interface IRenderQueueDesc {
    isTransparent: boolean;
    phases: number;
    sortFunc: (a: IRenderPass, b: IRenderPass) => number;
}

export interface IDescriptorSetLayoutInfo {
    bindings: IGFXDescriptorSetLayoutBinding[];
    record: Record<string, IBlockInfo | ISamplerInfo>;
}

export const globalDescriptorSetLayout: IDescriptorSetLayoutInfo = { bindings: [], record: {} };
export const localDescriptorSetLayout: IDescriptorSetLayoutInfo = { bindings: [], record: {} };

/**
 * @en The uniform bindings
 * @zh Uniform 参数绑定。
 */
export enum PipelineGlobalBindings {
    UBO_GLOBAL,
    UBO_SHADOW,

    SAMPLER_ENVIRONMENT,
    SAMPLER_SHADOWMAP,

    COUNT,
}
const GLOBAL_UBO_COUNT = PipelineGlobalBindings.SAMPLER_ENVIRONMENT;
const GLOBAL_SAMPLER_COUNT = PipelineGlobalBindings.COUNT - GLOBAL_UBO_COUNT;

export enum ModelLocalBindings {
    UBO_LOCAL,
    UBO_FORWARD_LIGHTS,
    UBO_SKINNING_ANIMATION,
    UBO_SKINNING_TEXTURE,
    UBO_MORPH,

    SAMPLER_JOINTS,
    SAMPLER_MORPH_POSITION,
    SAMPLER_MORPH_NORMAL,
    SAMPLER_MORPH_TANGENT,
    SAMPLER_LIGHTING_MAP,
    SAMPLER_SPRITE,

    COUNT,
}
const LOCAL_UBO_COUNT = ModelLocalBindings.SAMPLER_JOINTS;
const LOCAL_SAMPLER_COUNT = ModelLocalBindings.COUNT - LOCAL_UBO_COUNT;

/**
 * @en Check whether the given uniform binding is a builtin binding
 * @zh 检查指定的 UniformBinding 是否是引擎内置的
 * @param binding
 */
export const isBuiltinBinding = (set: number) => set !== SetIndex.MATERIAL;

export enum SetIndex {
    GLOBAL,
    MATERIAL,
    LOCAL,
}
// parameters passed to GFXDevice
export const bindingMappingInfo = new GFXBindingMappingInfo();
bindingMappingInfo.bufferOffsets = [0, GLOBAL_UBO_COUNT + LOCAL_UBO_COUNT, GLOBAL_UBO_COUNT];
bindingMappingInfo.samplerOffsets = [0, GLOBAL_SAMPLER_COUNT + LOCAL_SAMPLER_COUNT, GLOBAL_SAMPLER_COUNT];

/**
 * @en The global uniform buffer object
 * @zh 全局 UBO。
 */
export class UBOGlobal {

    public static TIME_OFFSET: number = 0;
    public static SCREEN_SIZE_OFFSET: number = UBOGlobal.TIME_OFFSET + 4;
    public static SCREEN_SCALE_OFFSET: number = UBOGlobal.SCREEN_SIZE_OFFSET + 4;
    public static NATIVE_SIZE_OFFSET: number = UBOGlobal.SCREEN_SCALE_OFFSET + 4;
    public static MAT_VIEW_OFFSET: number = UBOGlobal.NATIVE_SIZE_OFFSET + 4;
    public static MAT_VIEW_INV_OFFSET: number = UBOGlobal.MAT_VIEW_OFFSET + 16;
    public static MAT_PROJ_OFFSET: number = UBOGlobal.MAT_VIEW_INV_OFFSET + 16;
    public static MAT_PROJ_INV_OFFSET: number = UBOGlobal.MAT_PROJ_OFFSET + 16;
    public static MAT_VIEW_PROJ_OFFSET: number = UBOGlobal.MAT_PROJ_INV_OFFSET + 16;
    public static MAT_VIEW_PROJ_INV_OFFSET: number = UBOGlobal.MAT_VIEW_PROJ_OFFSET + 16;
    public static CAMERA_POS_OFFSET: number = UBOGlobal.MAT_VIEW_PROJ_INV_OFFSET + 16;
    public static EXPOSURE_OFFSET: number = UBOGlobal.CAMERA_POS_OFFSET + 4;
    public static MAIN_LIT_DIR_OFFSET: number = UBOGlobal.EXPOSURE_OFFSET + 4;
    public static MAIN_LIT_COLOR_OFFSET: number = UBOGlobal.MAIN_LIT_DIR_OFFSET + 4;
    public static AMBIENT_SKY_OFFSET: number = UBOGlobal.MAIN_LIT_COLOR_OFFSET + 4;
    public static AMBIENT_GROUND_OFFSET: number = UBOGlobal.AMBIENT_SKY_OFFSET + 4;
    public static GLOBAL_FOG_COLOR_OFFSET: number = UBOGlobal.AMBIENT_GROUND_OFFSET + 4;
    public static GLOBAL_FOG_BASE_OFFSET: number = UBOGlobal.GLOBAL_FOG_COLOR_OFFSET + 4;
    public static GLOBAL_FOG_ADD_OFFSET: number = UBOGlobal.GLOBAL_FOG_BASE_OFFSET + 4;
    public static COUNT: number = UBOGlobal.GLOBAL_FOG_ADD_OFFSET + 4;
    public static SIZE: number = UBOGlobal.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.ALL, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.GLOBAL, binding: PipelineGlobalBindings.UBO_GLOBAL, name: 'CCGlobal', members: [
            { name: 'cc_time', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_screenSize', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_screenScale', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_nativeSize', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_matView', type: GFXType.MAT4, count: 1 },
            { name: 'cc_matViewInv', type: GFXType.MAT4, count: 1 },
            { name: 'cc_matProj', type: GFXType.MAT4, count: 1 },
            { name: 'cc_matProjInv', type: GFXType.MAT4, count: 1 },
            { name: 'cc_matViewProj', type: GFXType.MAT4, count: 1 },
            { name: 'cc_matViewProjInv', type: GFXType.MAT4, count: 1 },
            { name: 'cc_cameraPos', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_exposure', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_mainLitDir', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_mainLitColor', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_ambientSky', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_ambientGround', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_fogColor', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_fogBase', type: GFXType.FLOAT4, count: 1 },
            { name: 'cc_fogAdd', type: GFXType.FLOAT4, count: 1 },
        ],
    };
}
globalDescriptorSetLayout.record[UBOGlobal.BLOCK.name] = UBOGlobal.BLOCK;
globalDescriptorSetLayout.bindings[UBOGlobal.BLOCK.binding] = UBOGlobal.BLOCK;

/**
 * @en The uniform buffer object for shadow
 * @zh 阴影 UBO。
 */
export class UBOShadow {
    public static MAT_LIGHT_PLANE_PROJ_OFFSET: number = 0;
    public static MAT_LIGHT_VIEW_PROJ_OFFSET: number = UBOShadow.MAT_LIGHT_PLANE_PROJ_OFFSET + 16;
    public static SHADOW_COLOR_OFFSET: number = UBOShadow.MAT_LIGHT_VIEW_PROJ_OFFSET + 16;
    public static COUNT: number = UBOShadow.SHADOW_COLOR_OFFSET + 4;
    public static SIZE: number = UBOShadow.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.ALL, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.GLOBAL, binding: PipelineGlobalBindings.UBO_SHADOW, name: 'CCShadow', members: [
            { name: 'cc_matLightPlaneProj', type: GFXType.MAT4, count: 1 },
            { name: 'cc_matLightViewProj', type: GFXType.MAT4, count: 1 },
            { name: 'cc_shadowColor', type: GFXType.FLOAT4, count: 1 },
        ],
    };
}
globalDescriptorSetLayout.record[UBOShadow.BLOCK.name] = UBOShadow.BLOCK;
globalDescriptorSetLayout.bindings[UBOShadow.BLOCK.binding] = UBOShadow.BLOCK;

export const UNIFORM_SHADOWMAP: ISamplerInfo = {
    stageFlags: GFXShaderStageFlagBit.FRAGMENT, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.GLOBAL, binding: PipelineGlobalBindings.SAMPLER_SHADOWMAP, name: 'cc_shadowMap', type: GFXType.SAMPLER2D,
};
globalDescriptorSetLayout.record[UNIFORM_SHADOWMAP.name] = UNIFORM_SHADOWMAP;
globalDescriptorSetLayout.bindings[UNIFORM_SHADOWMAP.binding] = UNIFORM_SHADOWMAP;

export const UNIFORM_ENVIRONMENT: ISamplerInfo = {
    stageFlags: GFXShaderStageFlagBit.FRAGMENT, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.GLOBAL, binding: PipelineGlobalBindings.SAMPLER_ENVIRONMENT, name: 'cc_environment', type: GFXType.SAMPLER_CUBE,
};
globalDescriptorSetLayout.record[UNIFORM_ENVIRONMENT.name] = UNIFORM_ENVIRONMENT;
globalDescriptorSetLayout.bindings[UNIFORM_ENVIRONMENT.binding] = UNIFORM_ENVIRONMENT;

/**
 * @en The local uniform buffer object
 * @zh 本地 UBO。
 */
export class UBOLocal {
    public static MAT_WORLD_OFFSET: number = 0;
    public static MAT_WORLD_IT_OFFSET: number = UBOLocal.MAT_WORLD_OFFSET + 16;
    public static LIGHTINGMAP_UVPARAM: number = UBOLocal.MAT_WORLD_IT_OFFSET + 16;
    public static COUNT: number = UBOLocal.LIGHTINGMAP_UVPARAM + 4;
    public static SIZE: number = UBOLocal.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.LOCAL, binding: ModelLocalBindings.UBO_LOCAL, name: 'CCLocal', members: [
            { name: 'cc_matWorld', type: GFXType.MAT4, count: 1 },
            { name: 'cc_matWorldIT', type: GFXType.MAT4, count: 1 },
            { name: 'cc_lightingMapUVParam', type: GFXType.FLOAT4, count: 1 },
        ],
    };
}
localDescriptorSetLayout.record[UBOLocal.BLOCK.name] = UBOLocal.BLOCK;
localDescriptorSetLayout.bindings[UBOLocal.BLOCK.binding] = UBOLocal.BLOCK;

export const INST_MAT_WORLD = 'a_matWorld0';

export class UBOLocalBatched {
    public static BATCHING_COUNT: number = 10;
    public static MAT_WORLDS_OFFSET: number = 0;
    public static COUNT: number = 16 * UBOLocalBatched.BATCHING_COUNT;
    public static SIZE: number = UBOLocalBatched.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.LOCAL, binding: ModelLocalBindings.UBO_LOCAL, name: 'CCLocalBatched', members: [
            { name: 'cc_matWorlds', type: GFXType.MAT4, count: UBOLocalBatched.BATCHING_COUNT },
        ],
    };
}
localDescriptorSetLayout.record[UBOLocalBatched.BLOCK.name] = UBOLocalBatched.BLOCK;
localDescriptorSetLayout.bindings[UBOLocalBatched.BLOCK.binding] = UBOLocalBatched.BLOCK;

/**
 * @en The uniform buffer object for forward lighting
 * @zh 前向灯光 UBO。
 */
export class UBOForwardLight {
    public static LIGHTS_PER_PASS = 1;

    public static LIGHT_POS_OFFSET: number = 0;
    public static LIGHT_COLOR_OFFSET: number = UBOForwardLight.LIGHT_POS_OFFSET + UBOForwardLight.LIGHTS_PER_PASS * 4;
    public static LIGHT_SIZE_RANGE_ANGLE_OFFSET: number = UBOForwardLight.LIGHT_COLOR_OFFSET + UBOForwardLight.LIGHTS_PER_PASS * 4;
    public static LIGHT_DIR_OFFSET: number = UBOForwardLight.LIGHT_SIZE_RANGE_ANGLE_OFFSET + UBOForwardLight.LIGHTS_PER_PASS * 4;
    public static COUNT: number = UBOForwardLight.LIGHT_DIR_OFFSET + UBOForwardLight.LIGHTS_PER_PASS * 4;
    public static SIZE: number = UBOForwardLight.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.FRAGMENT, descriptorType: GFXDescriptorType.DYNAMIC_UNIFORM_BUFFER, count: 1,
        set: SetIndex.LOCAL, binding: ModelLocalBindings.UBO_FORWARD_LIGHTS, name: 'CCForwardLight', members: [
            { name: 'cc_lightPos', type: GFXType.FLOAT4, count: UBOForwardLight.LIGHTS_PER_PASS },
            { name: 'cc_lightColor', type: GFXType.FLOAT4, count: UBOForwardLight.LIGHTS_PER_PASS },
            { name: 'cc_lightSizeRangeAngle', type: GFXType.FLOAT4, count: UBOForwardLight.LIGHTS_PER_PASS },
            { name: 'cc_lightDir', type: GFXType.FLOAT4, count: UBOForwardLight.LIGHTS_PER_PASS },
        ],
    };
}
localDescriptorSetLayout.record[UBOForwardLight.BLOCK.name] = UBOForwardLight.BLOCK;
localDescriptorSetLayout.bindings[UBOForwardLight.BLOCK.binding] = UBOForwardLight.BLOCK;

// The actual uniform vectors used is JointUniformCapacity * 3.
// We think this is a reasonable default capacity considering MAX_VERTEX_UNIFORM_VECTORS in WebGL spec is just 128.
// Skinning models with number of bones more than this capacity will be automatically switched to texture skinning.
// But still, you can tweak this for your own need by changing the number below
// and the JOINT_UNIFORM_CAPACITY macro in cc-skinning shader header.
export const JOINT_UNIFORM_CAPACITY = 30;

/**
 * @en The uniform buffer object for skinning texture
 * @zh 骨骼贴图 UBO。
 */
export class UBOSkinningTexture {
    public static JOINTS_TEXTURE_INFO_OFFSET: number = 0;
    public static COUNT: number = UBOSkinningTexture.JOINTS_TEXTURE_INFO_OFFSET + 4;
    public static SIZE: number = UBOSkinningTexture.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.LOCAL, binding: ModelLocalBindings.UBO_SKINNING_TEXTURE, name: 'CCSkinningTexture', members: [
            { name: 'cc_jointTextureInfo', type: GFXType.FLOAT4, count: 1 },
        ],
    };
}
localDescriptorSetLayout.record[UBOSkinningTexture.BLOCK.name] = UBOSkinningTexture.BLOCK;
localDescriptorSetLayout.bindings[UBOSkinningTexture.BLOCK.binding] = UBOSkinningTexture.BLOCK;

export class UBOSkinningAnimation {
    public static JOINTS_ANIM_INFO_OFFSET: number = 0;
    public static COUNT: number = UBOSkinningAnimation.JOINTS_ANIM_INFO_OFFSET + 4;
    public static SIZE: number = UBOSkinningAnimation.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.LOCAL, binding: ModelLocalBindings.UBO_SKINNING_ANIMATION, name: 'CCSkinningAnimation', members: [
            { name: 'cc_jointAnimInfo', type: GFXType.FLOAT4, count: 1 },
        ],
    };
}
localDescriptorSetLayout.record[UBOSkinningAnimation.BLOCK.name] = UBOSkinningAnimation.BLOCK;
localDescriptorSetLayout.bindings[UBOSkinningAnimation.BLOCK.binding] = UBOSkinningAnimation.BLOCK;

export const INST_JOINT_ANIM_INFO = 'a_jointAnimInfo';
export class UBOSkinning {
    public static JOINTS_OFFSET: number = 0;
    public static COUNT: number = UBOSkinning.JOINTS_OFFSET + JOINT_UNIFORM_CAPACITY * 12;
    public static SIZE: number = UBOSkinning.COUNT * 4;

    public static BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.LOCAL, binding: ModelLocalBindings.UBO_SKINNING_TEXTURE, name: 'CCSkinning', members: [
            { name: 'cc_joints', type: GFXType.FLOAT4, count: JOINT_UNIFORM_CAPACITY * 3 },
        ],
    };
}
localDescriptorSetLayout.record[UBOSkinning.BLOCK.name] = UBOSkinning.BLOCK;
localDescriptorSetLayout.bindings[UBOSkinning.BLOCK.binding] = UBOSkinning.BLOCK;

/**
 * @en The uniform buffer object for morph setting
 * @zh 形变配置的 UBO
 */
export class UBOMorph {
    public static readonly MAX_MORPH_TARGET_COUNT = 60;

    public static readonly OFFSET_OF_WEIGHTS = 0;

    public static readonly OFFSET_OF_DISPLACEMENT_TEXTURE_WIDTH = 4 * UBOMorph.MAX_MORPH_TARGET_COUNT;

    public static readonly OFFSET_OF_DISPLACEMENT_TEXTURE_HEIGHT = UBOMorph.OFFSET_OF_DISPLACEMENT_TEXTURE_WIDTH + 4;

    public static readonly COUNT_BASE_4_BYTES = 4 * Math.ceil(UBOMorph.MAX_MORPH_TARGET_COUNT / 4) + 4;

    public static readonly SIZE = UBOMorph.COUNT_BASE_4_BYTES * 4;

    public static readonly BLOCK: IBlockInfo = {
        stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.UNIFORM_BUFFER, count: 1,
        set: SetIndex.LOCAL, binding: ModelLocalBindings.UBO_MORPH, name: 'CCMorph', members: [
            { name: 'cc_displacementWeights', type: GFXType.FLOAT4, count: UBOMorph.MAX_MORPH_TARGET_COUNT / 4, },
            { name: 'cc_displacementTextureInfo', type: GFXType.FLOAT4, count: 1, },
        ],
    };
}
localDescriptorSetLayout.record[UBOMorph.BLOCK.name] = UBOMorph.BLOCK;
localDescriptorSetLayout.bindings[UBOMorph.BLOCK.binding] = UBOMorph.BLOCK;

/**
 * @en The sampler for joint texture
 * @zh 骨骼纹理采样器。
 */
export const UniformJointTexture: ISamplerInfo = {
    stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.LOCAL, binding: ModelLocalBindings.SAMPLER_JOINTS, name: 'cc_jointTexture', type: GFXType.SAMPLER2D,
};
localDescriptorSetLayout.record[UniformJointTexture.name] = UniformJointTexture;
localDescriptorSetLayout.bindings[UniformJointTexture.binding] = UniformJointTexture;

/**
 * @en The sampler for morph texture of position
 * @zh 位置形变纹理采样器。
 */
export const UniformPositionMorphTexture: Readonly<ISamplerInfo> = {
    stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.LOCAL, binding: ModelLocalBindings.SAMPLER_MORPH_POSITION, name: 'cc_PositionDisplacements', type: GFXType.SAMPLER2D,
};
localDescriptorSetLayout.record[UniformPositionMorphTexture.name] = UniformPositionMorphTexture;
localDescriptorSetLayout.bindings[UniformPositionMorphTexture.binding] = UniformPositionMorphTexture;

/**
 * @en The sampler for morph texture of normal
 * @zh 法线形变纹理采样器。
 */
export const UniformNormalMorphTexture: Readonly<ISamplerInfo> = {
    stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.LOCAL, binding: ModelLocalBindings.SAMPLER_MORPH_NORMAL, name: 'cc_NormalDisplacements', type: GFXType.SAMPLER2D,
};
localDescriptorSetLayout.record[UniformNormalMorphTexture.name] = UniformNormalMorphTexture;
localDescriptorSetLayout.bindings[UniformNormalMorphTexture.binding] = UniformNormalMorphTexture;

/**
 * @en The sampler for morph texture of tangent
 * @zh 切线形变纹理采样器。
 */
export const UniformTangentMorphTexture: Readonly<ISamplerInfo> = {
    stageFlags: GFXShaderStageFlagBit.VERTEX, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.LOCAL, binding: ModelLocalBindings.SAMPLER_MORPH_TANGENT, name: 'cc_TangentDisplacements', type: GFXType.SAMPLER2D,
};
localDescriptorSetLayout.record[UniformTangentMorphTexture.name] = UniformTangentMorphTexture;
localDescriptorSetLayout.bindings[UniformTangentMorphTexture.binding] = UniformTangentMorphTexture;

/**
 * @en The sampler for light map texture
 * @zh 光照图纹理采样器。
 */
export const UniformLightingMapSampler: Readonly<ISamplerInfo> = {
    stageFlags: GFXShaderStageFlagBit.FRAGMENT, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.LOCAL, binding: ModelLocalBindings.SAMPLER_LIGHTING_MAP, name: 'cc_lightingMap', type: GFXType.SAMPLER2D,
};
localDescriptorSetLayout.record[UniformLightingMapSampler.name] = UniformLightingMapSampler;
localDescriptorSetLayout.bindings[UniformLightingMapSampler.binding] = UniformLightingMapSampler;

/**
 * @en The sampler for UI sprites.
 * @zh UI 精灵纹理采样器。
 */
export const UniformSpriteSampler: Readonly<ISamplerInfo> = {
    stageFlags: GFXShaderStageFlagBit.FRAGMENT, descriptorType: GFXDescriptorType.SAMPLER, count: 1,
    set: SetIndex.LOCAL, binding: ModelLocalBindings.SAMPLER_SPRITE, name: 'cc_spriteTexture', type: GFXType.SAMPLER2D,
};
localDescriptorSetLayout.record[UniformSpriteSampler.name] = UniformSpriteSampler;
localDescriptorSetLayout.bindings[UniformSpriteSampler.binding] = UniformSpriteSampler;



export const CAMERA_DEFAULT_MASK = Layers.makeMaskExclude([Layers.BitMask.UI_2D, Layers.BitMask.GIZMOS, Layers.BitMask.EDITOR,
    Layers.BitMask.SCENE_GIZMO, Layers.BitMask.PROFILER]);

export const CAMERA_EDITOR_MASK = Layers.makeMaskExclude([Layers.BitMask.UI_2D, Layers.BitMask.PROFILER]);

export const MODEL_ALWAYS_MASK = Layers.Enum.ALL;
