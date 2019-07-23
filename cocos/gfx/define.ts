/**
 * gfx模块
 * @category gfx
 */

export const GFX_MAX_VERTEX_ATTRIBUTES: number = 16;
export const GFX_MAX_TEXTURE_UNITS: number = 16;
export const GFX_MAX_ATTACHMENTS: number = 4;
export const GFX_MAX_BUFFER_BINDINGS: number = 24;

/**
 * @zh
 * GFX对象类型。
 */
export enum GFXObjectType {
    UNKNOWN,
    BUFFER,
    TEXTURE,
    TEXTURE_VIEW,
    RENDER_PASS,
    FRAMEBUFFER,
    SAMPLER,
    SHADER,
    PIPELINE_LAYOUT,
    PIPELINE_STATE,
    BINDING_LAYOUT,
    INPUT_ASSEMBLER,
    COMMAND_ALLOCATOR,
    COMMAND_BUFFER,
    QUEUE,
    WINDOW,
}

/**
 * @zh
 * GFX状态。
 */
export enum GFXStatus {
    UNREADY,
    FAILED,
    SUCCESS,
}

/**
 * @zh
 * GFX对象。
 */
export class GFXObject {

    public get gfxType (): GFXObjectType {
        return this._gfxType;
    }

    public get status (): GFXStatus {
        return this._status;
    }

    /**
     * @zh
     * 对象类型。
     */
    protected _gfxType = GFXObjectType.UNKNOWN;

    /**
     * @zh
     * 对象状态。
     */
    protected _status = GFXStatus.UNREADY;

    /**
     * 构造函数。
     * @param gfxType GFX对象类型。
     */
    constructor (gfxType: GFXObjectType) {
        this._gfxType = gfxType;
    }
}

/**
 * @zh
 * GFX顶点属性名。
 */
export enum GFXAttributeName {
    ATTR_POSITION = 'a_position',
    ATTR_NORMAL = 'a_normal',
    ATTR_TANGENT = 'a_tangent',
    ATTR_BITANGENT = 'a_bitangent',
    ATTR_WEIGHTS = 'a_weights',
    ATTR_JOINTS = 'a_joints',
    ATTR_COLOR = 'a_color',
    ATTR_COLOR1 = 'a_color1',
    ATTR_COLOR2 = 'a_color2',
    ATTR_TEX_COORD = 'a_texCoord',
    ATTR_TEX_COORD1 = 'a_texCoord1',
    ATTR_TEX_COORD2 = 'a_texCoord2',
    ATTR_TEX_COORD3 = 'a_texCoord3',
    ATTR_TEX_COORD4 = 'a_texCoord4',
    ATTR_TEX_COORD5 = 'a_texCoord5',
    ATTR_TEX_COORD6 = 'a_texCoord6',
    ATTR_TEX_COORD7 = 'a_texCoord7',
    ATTR_TEX_COORD8 = 'a_texCoord8',
    ATTR_BATCH_ID = 'a_batch_id',
    ATTR_BATCH_UV = 'a_batch_uv',
}

/**
 * @zh
 * GFX数据类型。
 */
export enum GFXType {
    UNKNOWN,
    // vectors
    BOOL,
    BOOL2,
    BOOL3,
    BOOL4,
    INT,
    INT2,
    INT3,
    INT4,
    UINT,
    UINT2,
    UINT3,
    UINT4,
    FLOAT,
    FLOAT2,
    FLOAT3,
    FLOAT4,
    MAT2,
    MAT2X3,
    MAT2X4,
    MAT3X2,
    MAT3,
    MAT3X4,
    MAT4X2,
    MAT4X3,
    MAT4,
    // samplers
    SAMPLER1D,
    SAMPLER1D_ARRAY,
    SAMPLER2D,
    SAMPLER2D_ARRAY,
    SAMPLER3D,
    SAMPLER_CUBE,
    COUNT,
}

/**
 * @zh
 * GFX格式。
 */
export enum GFXFormat {

    UNKNOWN,

    A8,
    L8,
    LA8,

    R8,
    R8SN,
    R8UI,
    R8I,
    R16F,
    R16UI,
    R16I,
    R32F,
    R32UI,
    R32I,

    RG8,
    RG8SN,
    RG8UI,
    RG8I,
    RG16F,
    RG16UI,
    RG16I,
    RG32F,
    RG32UI,
    RG32I,

    RGB8,
    SRGB8,
    RGB8SN,
    RGB8UI,
    RGB8I,
    RGB16F,
    RGB16UI,
    RGB16I,
    RGB32F,
    RGB32UI,
    RGB32I,

    RGBA8,
    SRGB8_A8,
    RGBA8SN,
    RGBA8UI,
    RGBA8I,
    RGBA16F,
    RGBA16UI,
    RGBA16I,
    RGBA32F,
    RGBA32UI,
    RGBA32I,

    // Special Format
    R5G6B5,
    R11G11B10F,
    RGB5A1,
    RGBA4,
    RGB10A2,
    RGB10A2UI,
    RGB9E5,

    // Depth-Stencil Format
    D16,
    D16S8,
    D24,
    D24S8,
    D32F,
    D32F_S8,

    // Compressed Format

    // Block Compression Format, DDS (DirectDraw Surface)
    // DXT1: 3 channels (5:6:5), 1/8 origianl size, with 0 or 1 bit of alpha
    BC1,
    BC1_ALPHA,
    BC1_SRGB,
    BC1_SRGB_ALPHA,
    // DXT3: 4 channels (5:6:5), 1/4 origianl size, with 4 bits of alpha
    BC2,
    BC2_SRGB,
    // DXT5: 4 channels (5:6:5), 1/4 origianl size, with 8 bits of alpha
    BC3,
    BC3_SRGB,
    // 1 channel (8), 1/4 origianl size
    BC4,
    BC4_SNORM,
    // 2 channels (8:8), 1/2 origianl size
    BC5,
    BC5_SNORM,
    // 3 channels (16:16:16), half-floating point, 1/6 origianl size
    // UF16: unsigned float, 5 exponent bits + 11 mantissa bits
    // SF16: signed float, 1 signed bit + 5 exponent bits + 10 mantissa bits
    BC6H_UF16,
    BC6H_SF16,
    // 4 channels (4~7 bits per channel) with 0 to 8 bits of alpha, 1/3 original size
    BC7,
    BC7_SRGB,

    // Ericsson Texture Compression Format
    ETC_RGB8,
    ETC2_RGB8,
    ETC2_SRGB8,
    ETC2_RGB8_A1,
    ETC2_SRGB8_A1,
    ETC2_RGBA8,
    ETC2_SRGB8_A8,
    EAC_R11,
    EAC_R11SN,
    EAC_RG11,
    EAC_RG11SN,

    // PVRTC (PowerVR)
    PVRTC_RGB2,
    PVRTC_RGBA2,
    PVRTC_RGB4,
    PVRTC_RGBA4,
    PVRTC2_2BPP,
    PVRTC2_4BPP,
}

/**
 * @zh
 * GFX缓冲使用方式标识位。
 */
export enum GFXBufferUsageBit {
    NONE = 0,
    TRANSFER_SRC = 0x1,
    TRANSFER_DST = 0x2,
    INDEX = 0x4,
    VERTEX = 0x8,
    UNIFORM = 0x10,
    STORAGE = 0x20,
    INDIRECT = 0x40,
}

export type GFXBufferUsage = GFXBufferUsageBit;

/**
 * @zh
 * GFX内存使用方式标识位。
 */
export enum GFXMemoryUsageBit {
    NONE = 0,
    DEVICE = 0x1,
    HOST = 0x2,
}

export type GFXMemoryUsage = GFXMemoryUsageBit;

/**
 * @zh
 * GFX缓冲访问标识位。
 */
export enum GFXBufferAccessBit {
    NONE = 0,
    READ = 0x1,
    WRITE = 0x2,
}

export type GFXBufferAccess = GFXBufferAccessBit;

/**
 * @zh
 * GFX图元模式标识位。
 */
export enum GFXPrimitiveMode {
    POINT_LIST,
    LINE_LIST,
    LINE_STRIP,
    LINE_LOOP,
    LINE_LIST_ADJACENCY,
    LINE_STRIP_ADJACENCY,
    ISO_LINE_LIST,
    // raycast detectable:
    TRIANGLE_LIST,
    TRIANGLE_STRIP,
    TRIANGLE_FAN,
    TRIANGLE_LIST_ADJACENCY,
    TRIANGLE_STRIP_ADJACENCY,
    TRIANGLE_PATCH_ADJACENCY,
    QUAD_PATCH_LIST,
}

/**
 * @zh
 * GFX三角形填充模式。
 */
export enum GFXPolygonMode {
    FILL,
    POINT,
    LINE,
}

/**
 * @zh
 * GFX着色模式。
 */
export enum GFXShadeModel {
    GOURAND,
    FLAT,
}

/**
 * @zh
 * GFX裁剪模式。
 */
export enum GFXCullMode {
    NONE,
    FRONT,
    BACK,
}

/**
 * @zh
 * GFX比较函数。
 */
export enum GFXComparisonFunc {
    NEVER,
    LESS,
    EQUAL,
    LESS_EQUAL,
    GREATER,
    NOT_EQUAL,
    GREATER_EQUAL,
    ALWAYS,
}

/**
 * @zh
 * GFX模板操作。
 */
export enum GFXStencilOp {
    ZERO,
    KEEP,
    REPLACE,
    INCR,
    DECR,
    INVERT,
    INCR_WRAP,
    DECR_WRAP,
}

/**
 * @zh
 * GFX混合操作。
 */
export enum GFXBlendOp {
    ADD,
    SUB,
    REV_SUB,
    MIN,
    MAX,
}

/**
 * @zh
 * GFX混合因子。
 */
export enum GFXBlendFactor {
    ZERO,
    ONE,
    SRC_ALPHA,
    DST_ALPHA,
    ONE_MINUS_SRC_ALPHA,
    ONE_MINUS_DST_ALPHA,
    SRC_COLOR,
    DST_COLOR,
    ONE_MINUS_SRC_COLOR,
    ONE_MINUS_DST_COLOR,
    SRC_ALPHA_SATURATE,
    CONSTANT_COLOR,
    ONE_MINUS_CONSTANT_COLOR,
    CONSTANT_ALPHA,
    ONE_MINUS_CONSTANT_ALPHA,
}

/**
 * @zh
 * GFX颜色掩码。
 */
export enum GFXColorMask {
    NONE = 0x0,
    R = 0x1,
    G = 0x2,
    B = 0x4,
    A = 0x8,
    ALL = R | G | B | A,
}

/**
 * @zh
 * GFX过滤模式。
 */
export enum GFXFilter {
    NONE,
    POINT,
    LINEAR,
    ANISOTROPIC,
}

/**
 * @zh
 * GFX寻址模式。
 */
export enum GFXAddress {
    WRAP,
    MIRROR,
    CLAMP,
    BORDER,
}

/**
 * @zh
 * GFX纹理类型。
 */
export enum GFXTextureType {
    TEX1D,
    TEX2D,
    TEX3D,
}

/**
 * @zh
 * GFX纹理使用方式标识位。
 */
export enum GFXTextureUsageBit {
    NONE = 0,
    TRANSFER_SRC = 0x1,
    TRANSFER_DST = 0x2,
    SAMPLED = 0x4,
    STORAGE = 0x8,
    COLOR_ATTACHMENT = 0x10,
    DEPTH_STENCIL_ATTACHMENT = 0x20,
    TRANSIENT_ATTACHMENT = 0x40,
    INPUT_ATTACHMENT = 0x80,
}

export type GFXTextureUsage = GFXTextureUsageBit;

/**
 * @zh
 * GFX采样数量。
 */
export enum GFXSampleCount {
    X1,
    X2,
    X4,
    X8,
    X16,
    X32,
    X64,
}

/**
 * @zh
 * GFX纹理标识位。
 */
export enum GFXTextureFlagBit {
    NONE = 0,
    GEN_MIPMAP = 0x1,
    CUBEMAP = 0x2,
    BAKUP_BUFFER = 0x4,
}

export type GFXTextureFlags = GFXTextureFlagBit;

/**
 * @zh
 * GFX纹理视图类型。
 */
export enum GFXTextureViewType {
    TV1D,
    TV2D,
    TV3D,
    CUBE,
    TV1D_ARRAY,
    TV2D_ARRAY,
}

/**
 * @zh
 * GFX Shader类型。
 */
export enum GFXShaderType {
    VERTEX,
    HULL,
    DOMAIN,
    GEOMETRY,
    FRAGMENT,
    COMPUTE,
    COUNT,
}

/**
 * @zh
 * GFX绑定类型。
 */
export enum GFXBindingType {
    UNKNOWN,
    UNIFORM_BUFFER,
    SAMPLER,
    STORAGE_BUFFER,
}

/**
 * @zh
 * GFX命令缓冲类型。
 */
export enum GFXCommandBufferType {
    PRIMARY,
    SECONDARY,
}

/**
 * @zh
 * 初始载入帧缓冲时的内存操作。
 */
export enum GFXLoadOp {
    LOAD,		// Load the contents from the fbo from previous
    CLEAR,		// Clear the fbo
    DISCARD,	// Ignore writing to the fbo and keep old data
}

/**
 * @zh
 * 存储到帧缓冲时的内存操作。
 */
export enum GFXStoreOp {
    STORE,		// Write the source to the destination
    DISCARD,	// Don't write the source to the destination
}

/**
 * @zh
 * GFX纹理布局。
 */
export enum GFXTextureLayout {
    UNDEFINED,
    GENERAL,
    COLOR_ATTACHMENT_OPTIMAL,
    DEPTH_STENCIL_ATTACHMENT_OPTIMAL,
    DEPTH_STENCIL_READONLY_OPTIMAL,
    SHADER_READONLY_OPTIMAL,
    TRANSFER_SRC_OPTIMAL,
    TRANSFER_DST_OPTIMAL,
    PREINITIALIZED,
    PRESENT_SRC,
}

/**
 * @zh
 * GFX管线绑定点。
 */
export enum GFXPipelineBindPoint {
    GRAPHICS,
    COMPUTE,
    RAY_TRACING,
}

/**
 * @zh
 * GFX动态状态。
 */
export enum GFXDynamicState {
    VIEWPORT,
    SCISSOR,
    LINE_WIDTH,
    DEPTH_BIAS,
    BLEND_CONSTANTS,
    DEPTH_BOUNDS,
    STENCIL_WRITE_MASK,
    STENCIL_COMPARE_MASK,
}

/**
 * @zh
 * GFX模板操作面朝向。
 */
export enum GFXStencilFace {
    FRONT,
    BACK,
    ALL,
}

/**
 * @zh
 * GFX队列类型。
 */
export enum GFXQueueType {
    GRAPHICS,
    COMPUTE,
    TRANSFER,
}

/**
 * @zh
 * GFX矩形。
 */
export interface IGFXRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * @zh
 * GFX视口。
 */
export interface IGFXViewport {
    left: number;
    top: number;
    width: number;
    height: number;
    minDepth: number;
    maxDepth: number;
}

/**
 * @zh
 * GFX颜色。
 */
export interface IGFXColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * @zh
 * GFX清空标识。
 */
export enum GFXClearFlag {
    NONE = 0,
    COLOR = 1,
    DEPTH = 2,
    STENCIL = 4,
    DEPTH_STENCIL = DEPTH | STENCIL,
    ALL = COLOR | DEPTH | STENCIL,
}

/**
 * @zh
 * GFX偏移量。
 */
export interface IGFXOffset {
    x: number;
    y: number;
    z: number;
}

/**
 * @zh
 * GFX范围。
 */
export interface IGFXExtent {
    width: number;
    height: number;
    depth: number;
}

/**
 * @zh
 * GFX纹理子资源信息。
 */
export class GFXTextureSubres {
    public baseMipLevel: number = 0;
    public levelCount: number = 1;
    public baseArrayLayer: number = 0;
    public layerCount: number = 1;
}

/**
 * @zh
 * GFX纹理拷贝信息。
 */
export class GFXTextureCopy {
    public srcSubres: GFXTextureSubres = new GFXTextureSubres();
    public srcOffset: IGFXOffset = { x: 0, y: 0, z: 0 };
    public dstSubres: GFXTextureSubres = new GFXTextureSubres();
    public dstOffset: IGFXOffset = { x: 0, y: 0, z: 0 };
    public extent: IGFXExtent = { width: 0, height: 0, depth: 0 };
}

/**
 * @zh
 * GFX缓冲纹理拷贝信息。
 */
export class GFXBufferTextureCopy {
    public buffOffset: number = 0;
    public buffStride: number = 0;
    public buffTexHeight: number = 0;
    public texOffset: IGFXOffset = { x: 0, y: 0, z: 0 };
    public texExtent: IGFXExtent = { width: 0, height: 0, depth: 0 };
    public texSubres: GFXTextureSubres = new GFXTextureSubres();
}

/**
 * @zh
 * GFX格式数据类型。
 */
export enum GFXFormatType {
    NONE,
    UNORM,
    SNORM,
    UINT,
    INT,
    UFLOAT,
    FLOAT,
}

/**
 * @zh
 * GFX格式信息。
 */
export interface IGFXFormatInfo {
    readonly name: string;
    readonly size: number;
    readonly count: number;
    readonly type: GFXFormatType;
    readonly hasAlpha: boolean;
    readonly hasDepth: boolean;
    readonly hasStencil: boolean;
    readonly isCompressed: boolean;
}

export interface IGFXMemoryStatus {
    bufferSize: number;
    textureSize: number;
}

/**
 * GFX格式信息数组。
 */
// tslint:disable: max-line-length
export const GFXFormatInfos: IGFXFormatInfo[] = [

    { name: 'UNKNOWN', size: 0, count: 0, type: GFXFormatType.NONE, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },

    { name: 'A8', size: 1, count: 1, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'L8', size: 1, count: 1, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'LA8', size: 1, count: 2, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },

    { name: 'R8', size: 1, count: 1, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R8SN', size: 1, count: 1, type: GFXFormatType.SNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R8UI', size: 1, count: 1, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R8I', size: 1, count: 1, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R16F', size: 2, count: 1, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R16UI', size: 2, count: 1, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R16I', size: 2, count: 1, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R32F', size: 4, count: 1, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R32UI', size: 4, count: 1, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R32I', size: 4, count: 1, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },

    { name: 'RG8', size: 2, count: 2, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG8SN', size: 2, count: 2, type: GFXFormatType.SNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG8UI', size: 2, count: 2, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG8I', size: 2, count: 2, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG16F', size: 4, count: 2, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG16UI', size: 4, count: 2, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG16I', size: 4, count: 2, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG32F', size: 8, count: 2, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG32UI', size: 8, count: 2, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RG32I', size: 8, count: 2, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },

    { name: 'RGB8', size: 3, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'SRGB8', size: 3, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB8SN', size: 3, count: 3, type: GFXFormatType.SNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB8UI', size: 3, count: 3, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB8I', size: 3, count: 3, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB16F', size: 6, count: 3, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB16UI', size: 6, count: 3, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB16I', size: 6, count: 3, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB32F', size: 12, count: 3, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB32UI', size: 12, count: 3, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB32I', size: 12, count: 3, type: GFXFormatType.INT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },

    { name: 'RGBA8', size: 4, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'SRGB8_A8', size: 4, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA8SN', size: 4, count: 4, type: GFXFormatType.SNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA8UI', size: 4, count: 4, type: GFXFormatType.UINT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA8I', size: 4, count: 4, type: GFXFormatType.INT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA16F', size: 8, count: 4, type: GFXFormatType.FLOAT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA16UI', size: 8, count: 4, type: GFXFormatType.UINT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA16I', size: 8, count: 4, type: GFXFormatType.INT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA32F', size: 16, count: 4, type: GFXFormatType.FLOAT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA32UI', size: 16, count: 4, type: GFXFormatType.UINT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA32I', size: 16, count: 4, type: GFXFormatType.INT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },

    { name: 'R5G6B5', size: 2, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'R11G11B10F', size: 4, count: 3, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB5A1', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGBA4', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB10A2', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB10A2UI', size: 2, count: 4, type: GFXFormatType.UINT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },
    { name: 'RGB9E5', size: 2, count: 4, type: GFXFormatType.FLOAT, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: false },

    { name: 'D16', size: 2, count: 1, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: true, hasStencil: false, isCompressed: false },
    { name: 'D16S8', size: 3, count: 2, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: true, hasStencil: true, isCompressed: false },
    { name: 'D24', size: 3, count: 1, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: true, hasStencil: false, isCompressed: false },
    { name: 'D24S8', size: 4, count: 2, type: GFXFormatType.UINT, hasAlpha: false, hasDepth: true, hasStencil: true, isCompressed: false },
    { name: 'D32F', size: 4, count: 1, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: true, hasStencil: false, isCompressed: false },
    { name: 'D32FS8', size: 5, count: 2, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: true, hasStencil: true, isCompressed: false },

    { name: 'BC1', size: 1, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC1_ALPHA', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC1_SRGB', size: 1, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC1_SRGB_ALPHA', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC2', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC2_SRGB', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC3', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC3_SRGB', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC4', size: 1, count: 1, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC4_SNORM', size: 1, count: 1, type: GFXFormatType.SNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC5', size: 1, count: 2, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC5_SNORM', size: 1, count: 2, type: GFXFormatType.SNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC6H_UF16', size: 1, count: 3, type: GFXFormatType.UFLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC6H_SF16', size: 1, count: 3, type: GFXFormatType.FLOAT, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC7', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'BC7_SRGB', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },

    { name: 'ETC_RGB8', size: 1, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'ETC2_RGB8', size: 1, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'ETC2_SRGB8', size: 1, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'ETC2_RGB8_A1', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'ETC2_SRGB8_A1', size: 1, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'ETC2_RGBA8', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'ETC2_SRGB8_A8', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'EAC_R11', size: 1, count: 1, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'EAC_R11SN', size: 1, count: 1, type: GFXFormatType.SNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'EAC_RG11', size: 2, count: 2, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'EAC_RG11SN', size: 2, count: 2, type: GFXFormatType.SNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },

    { name: 'PVRTC_RGB2', size: 2, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'PVRTC_RGBA2', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'PVRTC_RGB4', size: 2, count: 3, type: GFXFormatType.UNORM, hasAlpha: false, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'PVRTC_RGBA4', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'PVRTC2_2BPP', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
    { name: 'PVRTC2_4BPP', size: 2, count: 4, type: GFXFormatType.UNORM, hasAlpha: true, hasDepth: false, hasStencil: false, isCompressed: true },
];
// tslint:enable: max-line-length

/**
 * @zh
 * GFX格式内存大小。
 * @param format GFX格式。
 * @param width 像素宽度。
 * @param height 像素高度。
 * @param depth 像素深度。
 */
export function GFXFormatSize (format: GFXFormat, width: number, height: number, depth: number): number {

    if (!GFXFormatInfos[format].isCompressed) {
        return (width * height * depth * GFXFormatInfos[format].size);
    } else {
        switch (format) {
            case GFXFormat.BC1:
            case GFXFormat.BC1_ALPHA:
            case GFXFormat.BC1_SRGB:
            case GFXFormat.BC1_SRGB_ALPHA:
                return Math.ceil(width / 4) * Math.ceil(height / 4) * 8 * depth;
            case GFXFormat.BC2:
            case GFXFormat.BC2_SRGB:
            case GFXFormat.BC3:
            case GFXFormat.BC3_SRGB:
            case GFXFormat.BC4:
            case GFXFormat.BC4_SNORM:
            case GFXFormat.BC6H_SF16:
            case GFXFormat.BC6H_UF16:
            case GFXFormat.BC7:
            case GFXFormat.BC7_SRGB:
                return Math.ceil(width / 4) * Math.ceil(height / 4) * 16 * depth;
            case GFXFormat.BC5:
            case GFXFormat.BC5_SNORM:
                return Math.ceil(width / 4) * Math.ceil(height / 4) * 32 * depth;

            case GFXFormat.ETC_RGB8:
            case GFXFormat.ETC2_RGB8:
            case GFXFormat.ETC2_SRGB8:
            case GFXFormat.ETC2_RGB8_A1:
            case GFXFormat.ETC2_SRGB8_A1:
            case GFXFormat.EAC_R11:
            case GFXFormat.EAC_R11SN:
                return Math.ceil(width / 4) * Math.ceil(height / 4) * 8 * depth;
            case GFXFormat.EAC_RG11:
            case GFXFormat.EAC_RG11SN:
                return Math.ceil(width / 4) * Math.ceil(height / 4) * 16 * depth;

            case GFXFormat.PVRTC_RGB2:
            case GFXFormat.PVRTC_RGBA2:
            case GFXFormat.PVRTC2_2BPP:
                return Math.ceil(Math.max(width, 16) * Math.max(height, 8) / 4) * depth;
            case GFXFormat.PVRTC_RGB4:
            case GFXFormat.PVRTC_RGBA4:
            case GFXFormat.PVRTC2_4BPP:
                return Math.ceil(Math.max(width, 16) * Math.max(height, 8) / 2) * depth;

            default: {
                return 0;
            }
        }
    }
}

/**
 * @zh
 * GFX格式表面内存大小。
 * @param format GFX格式。
 * @param width 像素宽度。
 * @param height 像素高度。
 * @param depth 像素深度。
 * @param mips mip层数。
 */
export function GFXFormatSurfaceSize (
    format: GFXFormat, width: number, height: number,
    depth: number, mips: number): number {

    let size = 0;

    for (let i = 0; i < mips; ++i) {
        size += GFXFormatSize(format, width, height, depth);
        width = Math.max(width >> 1, 1);
        height = Math.max(height >> 1, 1);
        depth = Math.max(depth >> 1, 1);
    }

    return size;
}

/**
 * @zh
 * 得到GFX数据类型的大小。
 * @param type GFX数据类型。
 */
export function GFXGetTypeSize (type: GFXType): number {
    switch (type) {
        case GFXType.BOOL:
        case GFXType.INT:
        case GFXType.UINT:
        case GFXType.FLOAT: return 4;
        case GFXType.BOOL2:
        case GFXType.INT2:
        case GFXType.UINT2:
        case GFXType.FLOAT2: return 8;
        case GFXType.BOOL3:
        case GFXType.INT3:
        case GFXType.UINT3:
        case GFXType.FLOAT3: return 12;
        case GFXType.BOOL4:
        case GFXType.INT4:
        case GFXType.UINT4:
        case GFXType.FLOAT4:
        case GFXType.MAT2: return 16;
        case GFXType.MAT2X3: return 24;
        case GFXType.MAT2X4: return 32;
        case GFXType.MAT3X2: return 24;
        case GFXType.MAT3: return 36;
        case GFXType.MAT3X4: return 48;
        case GFXType.MAT4X2: return 32;
        case GFXType.MAT4X2: return 32;
        case GFXType.MAT4: return 64;
        case GFXType.SAMPLER1D:
        case GFXType.SAMPLER1D_ARRAY:
        case GFXType.SAMPLER2D:
        case GFXType.SAMPLER2D_ARRAY:
        case GFXType.SAMPLER3D:
        case GFXType.SAMPLER_CUBE: return 4;
        default: {
            return 0;
        }
    }
}
