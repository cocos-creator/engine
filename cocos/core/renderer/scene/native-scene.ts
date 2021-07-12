import { IFlatBuffer } from '../../assets/rendering-sub-mesh';
import { Frustum } from '../../geometry';
import { Attribute, Buffer, ClearFlags, Color as GFXColor, DescriptorSet, Framebuffer, InputAssembler, Shader } from '../../gfx';
import { Color, Mat4, Rect, Vec2 } from '../../math';
import { RenderPriority } from '../../pipeline/define';
import { LightType } from './light';

export const NativeNode: Constructor<{
    initWithData (data: TypedArray): void;
    setParent(val: NativeNode | null): void;
}> = null!;
export type NativeNode = InstanceType<typeof NativeNode>;

export const NativeAABB: Constructor<{
    initWithData(data: TypedArray): void;
}> = null!;
export type NativeAABB = InstanceType<typeof NativeAABB>;

export const NativeModel: Constructor<{
    setReceiveShadow (val: boolean): void;
    setEnabled (val: boolean): void;
    seVisFlag (val: number): void;
    setTransform (n: Node): void;
    setNode (n: Node): void;
    setCastShadow (val: boolean): void;
    setLocalBuffer (buf: Buffer | null): void;
    setBounds (val: NativeAABB | null): void;
    addSubModel (val: NativeSubModel): void;
    setInstMatWorldIdx (idx: number): void;
    setInstancedBuffer (buffer: ArrayBuffer): void;
    setInstanceAttributes (attrs: Attribute[]): void;
    setInstancedAttrBlock(buffer: ArrayBuffer, views: ArrayBuffer[], attrs: Attribute[]);
}> = null!;
export type NativeModel = InstanceType<typeof NativeModel>;

export const NativeSkinningModel: Constructor<{
    setReceiveShadow (val: boolean): void;
    setEnabled (val: boolean): void;
    seVisFlag (val: number): void;
    setTransform (n: Node): void;
    setNode (n: Node): void;
    setCastShadow (val: boolean): void;
    setLocalBuffer (buf: Buffer | null): void;
    setBounds (val: NativeAABB | null): void;
    addSubModel (val: NativeSubModel): void;
    setInstMatWorldIdx (idx: number): void;
    setInstancedBuffer (buffer: ArrayBuffer): void;
    setInstanceAttributes (attrs: Attribute[]): void;
    setInstancedAttrBlock(buffer: ArrayBuffer, views: ArrayBuffer[], attrs: Attribute[]);
    setIndicesAndJoints(indices: number[], joints: NativeJointInfo[]): void;
    setBuffers(bufs: Buffer[]):void;
    updateLocalDescriptors(submodelIdx: number, descriptorSet: DescriptorSet);
}> = null!;
export type NativeSkinningModel = InstanceType<typeof NativeSkinningModel>;

export const NativeBakedAnimInfo: Constructor<{
    buffer: Buffer;
    data: ArrayBuffer;
    dirty: ArrayBuffer;
}> = null!;
export type NativeBakedAnimInfo = InstanceType<typeof NativeBakedAnimInfo>;

export const NativeBakedJointInfo: Constructor<{
    boundsInfo: NativeAABB[];
    jointTextureInfo: ArrayBuffer;
    animInfo: NativeBakedAnimInfo;
    buffer: Buffer | null;
}> = null!;
export type NativeBakedJointInfo = InstanceType<typeof NativeBakedJointInfo>;

export const NativeBakedSkinningModel: Constructor<{
    setReceiveShadow (val: boolean): void;
    setEnabled (val: boolean): void;
    seVisFlag (val: number): void;
    setTransform (n: Node): void;
    setNode (n: Node): void;
    setCastShadow (val: boolean): void;
    setLocalBuffer (buf: Buffer | null): void;
    setBounds (val: NativeAABB | null): void;
    addSubModel (val: NativeSubModel): void;
    setInstMatWorldIdx (idx: number): void;
    setInstancedBuffer (buffer: ArrayBuffer): void;
    setInstanceAttributes (attrs: Attribute[]): void;
    setInstancedAttrBlock(buffer: ArrayBuffer, views: ArrayBuffer[], attrs: Attribute[]): void;
    setJointMedium(isUploadAnim: boolean, jointInfo: NativeBakedJointInfo): void;
    setAnimInfoIdx(idx: number): void;
}> = null!;
export type NativeBakedSkinningModel = InstanceType<typeof NativeBakedSkinningModel>;

export const NativeLight: Constructor<{
    setType (type: LightType): void;
    setColor (color: Vec3): void;
    setUseColorTemperature (enable: boolean): void;
    setColorTemperatureRGB (color: Vec3): void;
    setNode (n: Node): void;
}> = null!;
export type NativeLight = InstanceType<typeof NativeLight>;

export const NativeDirectionalLight: Constructor<{
    setDirection (dir: Vec3): void;
    setIlluminance (lum: number): void;
} & NativeLight> = null!;
export type NativeDirectionalLight = InstanceType<typeof NativeDirectionalLight>;

export const NativeSphereLight: Constructor<{
    setPosition (pos: Vec3): void;
    setAABB (aabb: NativeAABB): void;
    setSize (size: number): void;
    setRange (range: number): void;
    setIlluminance (lum: number): void;
}  & NativeLight> = null!;
export type NativeSphereLight = InstanceType<typeof NativeSphereLight>;

export const NativeSpotLight: Constructor<{
    setDirection (dir: Vec3): void;
    setFrustum (frs: Frustum): void;
    setAABB (aabb: NativeAABB): void;
    setPosition (pos: Vec3): void;
    setSize (size: number): void;
    setRange (range: number): void;
    setAspect (aspect: number): void;
    setAngle (angle: number): void;
    setIlluminance (lum: number): void;
} & NativeLight> = null!;
export type NativeSpotLight = InstanceType<typeof NativeSpotLight>;

export const NaitveSkybox: Constructor<{
    enabled: boolean;
    useIBL: boolean;
    isRGBE: boolean;
    model: NativeModel | null;
}> = null!;
export type NaitveSkybox = InstanceType<typeof NaitveSkybox>;

export const NativeFog: Constructor<{
    type: number;
    enabled: boolean;
    color: Color;
    density: number;
    start: number;
    end: number;
    atten: number;
    top: number;
    range: number;
}> = null!;
export type NativeFog = InstanceType<typeof NativeFog>;

export const NativeRenderWindow: Constructor<{
    hasOffScreenAttachments: boolean;
    hasOnScreenAttachments: boolean;
    frameBuffer: Framebuffer;
}> = null!;
export type NativeRenderWindow = InstanceType<typeof NativeRenderWindow>;

export const NativeCamera: Constructor<{
    width: number;
    height: number;
    scene: NativeRenderScene | null;
    frustum: Frustum;
    matView: Mat4;
    matViewProj: Mat4;
    matViewProjInv: Mat4;
    matProj: Mat4;
    matProjInv: Mat4;
    position: Vec3;
    forward: Vec3;
    node: NativeNode | null;
    clearColor: GFXColor;
    viewPort: Rect;
    window: NativeRenderWindow | null;
    visibility: number;
    clearFlag: ClearFlags;
    clearDepth: number;
    clearStencil: number;
    exposure: number;
}> = null!;
export type NativeCamera = InstanceType<typeof NativeCamera>;

export const NativePass: Constructor<{
    initWithData(data: TypedArray): void;
    update(): void;
    setPriority(val: number): void;
    setStage(val: number): void;
    setPhase(val: number): void;
    setPrimitive(val: number): void;
    setRasterizerState(val): void;
    setDepthStencilState(val): void;
    setBlendState(val): void;
    setState(bs, dss, rs, ds): void;
    setDescriptorSet(val): void;
    setBatchingScheme(val: number): void;
    setDynamicState(val: number): void;
    setHash(val: number): void;
    setPipelineLayout(val): void;
    setRootBufferAndBlock(val: Buffer, block: ArrayBuffer): void;
    setRootBufferDirty(val: boolean): void;
}> = null!;
export type NativePass = InstanceType<typeof NativePass>;

export const NativeSubModel: Constructor<{
    setDescriptorSet(val: DescriptorSet | null): void;
    setInputAssembler(val: InputAssembler | null): void;
    setSubMeshBuffers(val: IFlatBuffer[]): void;
    setPlanarShader(val: Shader | null): void;
    setPlanarInstanceShader(val: Shader | null): void;
    setPasses(val: NativePass[]): void;
    setShaders(val: (Shader | null)[]): void;
    setPriority(val: RenderPriority): void;
}> = null!;
export type NativeSubModel = InstanceType<typeof NativeSubModel>;

export const NativeDrawBatch2D: Constructor<{
    initWithData (data: TypedArray): void;
}> = null!;
export type NativeDrawBatch2D = InstanceType<typeof NativeDrawBatch2D>;

export const NativeRenderScene: Constructor<{
    update(): void;
    setMainLight (l: NativeLight | null): void;
    addSphereLight (l: NativeLight | null): void;
    removeSphereLight (l: NativeLight | null): void;
    addSpotLight (l: NativeLight | null): void;
    removeSpotLight (l: NativeLight | null): void;
    removeSphereLights (): void;
    removeSpotLights (): void;
    addModel (m: NativeModel): void;
    removeModel (i: number): void;
    removeModels (): void;
    addBatch (batch: NativeDrawBatch2D): void;
    updateBatches (batches: NativeDrawBatch2D[]): void;
    addSkinningModel (m: NativeModel): void;
    addBakedSkinningModel(m: NativeModel): void;
    removeBatch (index: number): void;
    removeBatches (): void;
}> = null!;
export type NativeRenderScene = InstanceType<typeof NativeRenderScene>;

export const NativeAmbient: Constructor<{
    enabled: boolean;
    skyColor: Color;
    skyIllum: number;
    groundAlbedo: Color;
}> = null!;
export type NativeAmbient = InstanceType<typeof NativeAmbient>;

export const NativeShadow: Constructor<{
    normal: Vec3;
    distance: number;
    color: Color;
    nearValue: number;
    farValue: number;
    aspect: number;
    orthoSize: number;
    size: Vec2;
    pcfType: number;
    shadowMapDirty: boolean;
    bias: number;
    packing: boolean;
    linear: boolean;
    selfShadow: boolean;
    normalBias: number;
    autoAdapt: boolean;
    planarPass: NativePass;
    instancePass: NativePass;
    enabled: boolean;
    shadowType: number;
}> = null!;
export type NativeShadow = InstanceType<typeof NativeShadow>;

export const NativeRoot: Constructor<{
    cumulativeTime: number;
    frameTime: number;
}> = null!;
export type NativeRoot = InstanceType<typeof NativeRoot>;

export const NativeJointTransform: Constructor<{
    node: Node;
    local: Mat4;
    world: Mat4;
    stamp: number;
}> = null!;
export type NativeJointTransform = InstanceType<typeof NativeJointTransform>;

export const NativeJointInfo: Constructor<{
    bound: NativeAABB;
    target: Node;
    bindpose: Mat4;
    transform: NativeJointTransform | null;
    parents: NativeJointTransform[];
    buffers: number[];
    indices: number[];
}> = null!;
export type NativeJointInfo = InstanceType<typeof NativeJointInfo>;

export const NativePipelineSharedSceneData: Constructor<{
    isHDR: boolean;
    shadingScale: number;
    fpScale: number;
    fog: NativeFog;
    ambient: NativeAmbient;
    skybox: NaitveSkybox;
    shadow: NativeShadow;
    deferredLightPassShader: Shader | null;
    deferredLightPass: NativePass;
    deferredPostPassShader: Shader | null;
    deferredPostPass: NativePass;
}> = null!;

export type NativePipelineSharedSceneData = InstanceType<typeof NativePipelineSharedSceneData>;
