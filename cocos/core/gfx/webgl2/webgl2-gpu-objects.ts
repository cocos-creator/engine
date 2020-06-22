import { IGFXDrawInfo } from '../buffer';
import {
    GFXAddress,
    GFXBindingType,
    GFXBufferUsage,
    GFXBufferUsageBit,
    GFXDynamicState,
    GFXFilter,
    GFXFormat,
    GFXMemoryUsage,
    GFXMemoryUsageBit,
    GFXSampleCount,
    GFXShaderType,
    GFXTextureFlagBit,
    GFXTextureFlags,
    GFXTextureType,
    GFXTextureUsage,
    GFXTextureUsageBit,
    GFXType,
} from '../define';
import { IGFXAttribute } from '../input-assembler';
import { GFXBlendState, GFXDepthStencilState, GFXRasterizerState } from '../pipeline-state';
import { GFXColorAttachment, GFXDepthStencilAttachment } from '../render-pass';
import { GFXUniformBlock, GFXUniformSampler, IGFXShaderMacro } from '../shader';

export interface IWebGL2GPUUniformInfo {
    name: string;
    type: GFXType;
    count: number;
    offset: number;
    view: Float32Array | Int32Array;
    isDirty: boolean;
}

export class WebGL2GPUBuffer {
    public usage: GFXBufferUsage = GFXBufferUsageBit.NONE;
    public memUsage: GFXMemoryUsage = GFXMemoryUsageBit.NONE;
    public size: number = 0;
    public stride: number = 0;

    public glTarget: GLenum = 0;
    public glBuffer: WebGLBuffer | null = null;
    public buffer: ArrayBufferView | null = null;
    public vf32: Float32Array | null = null;
    public indirects: IGFXDrawInfo[] = [];
}

export class WebGL2GPUTexture {
    public type: GFXTextureType = GFXTextureType.TEX2D;
    public format: GFXFormat = GFXFormat.UNKNOWN;
    public usage: GFXTextureUsage = GFXTextureUsageBit.NONE;
    public width: number = 0;
    public height: number = 0;
    public depth: number = 1;
    public size: number = 0;
    public arrayLayer: number = 1;
    public mipLevel: number = 1;
    public samples: GFXSampleCount = GFXSampleCount.X1;
    public flags: GFXTextureFlags = GFXTextureFlagBit.NONE;
    public isPowerOf2: boolean = false;

    public glTarget: GLenum = 0;
    public glInternelFmt: GLenum = 0;
    public glFormat: GLenum = 0;
    public glType: GLenum = 0;
    public glUsage: GLenum = 0;
    public glTexture: WebGLTexture | null = null;
    public glRenderbuffer: WebGLRenderbuffer | null = null;
    public glWrapS: GLenum = 0;
    public glWrapT: GLenum = 0;
    public glMinFilter: GLenum = 0;
    public glMagFilter: GLenum = 0;
}

export class WebGL2GPURenderPass {

    public colorAttachments: GFXColorAttachment[] = [];
    public depthStencilAttachment: GFXDepthStencilAttachment | null = null;
}

export class WebGL2GPUFramebuffer {

    public gpuRenderPass: WebGL2GPURenderPass;
    public gpuColorTextures: WebGL2GPUTexture[] = [];
    public gpuDepthStencilTexture: WebGL2GPUTexture | null = null;
    public isOffscreen?: boolean = false;

    public glFramebuffer: WebGLFramebuffer | null = null;

    constructor (gpuRenderPass: WebGL2GPURenderPass) {
        this.gpuRenderPass = gpuRenderPass;
    }
}

export class WebGL2GPUSampler {
    public glSampler: WebGLSampler | null = null;
    public minFilter: GFXFilter = GFXFilter.NONE;
    public magFilter: GFXFilter = GFXFilter.NONE;
    public mipFilter: GFXFilter = GFXFilter.NONE;
    public addressU: GFXAddress = GFXAddress.CLAMP;
    public addressV: GFXAddress = GFXAddress.CLAMP;
    public addressW: GFXAddress = GFXAddress.CLAMP;
    public minLOD: number = 0;
    public maxLOD: number = 1000;

    public glMinFilter: GLenum = 0;
    public glMagFilter: GLenum = 0;
    public glWrapS: GLenum = 0;
    public glWrapT: GLenum = 0;
    public glWrapR: GLenum = 0;
}

export class WebGL2GPUInput {
    public binding: number = -1;
    public name: string = '';
    public type: GFXType = GFXType.UNKNOWN;
    public stride: number = 0;
    public count: number = 0;
    public size: number = 0;

    public glType: GLenum = 0;
    public glLoc: GLint = 0;
}

export interface IWebGL2GPUUniform {
    binding: number;
    name: string;
    type: GFXType;
    stride: number;
    count: number;
    size: number;
    offset: number;

    glType: GLenum;
    glLoc: WebGLUniformLocation;
    array: number[];
    begin: number;
}

export class WebGL2GPUUniformBlock {
    public binding: number = -1;
    public idx: number = 0;
    public name: string = '';
    public size: number = 0;
    public glUniforms: IWebGL2GPUUniform[] = [];
    public glActiveUniforms: IWebGL2GPUUniform[] = [];

    public isUniformPackage: boolean = false;  // Is a single uniform package?
}

export class WebGL2GPUUniformSampler {
    public binding: number = -1;
    public name: string = '';
    public type: GFXType = GFXType.UNKNOWN;
    public units: number[] = [];

    public glType: GLenum = 0;
    public glLoc: WebGLUniformLocation = -1;
}

export class WebGL2GPUShaderStage {
    public type: GFXShaderType = GFXShaderType.VERTEX;
    public source: string = '';
    public macros: IGFXShaderMacro[] = [];
    public glShader: WebGLShader | null = null;
}

export class WebGL2GPUShader {
    public name: string = '';
    public blocks: GFXUniformBlock[] = [];
    public samplers: GFXUniformSampler[] = [];

    public gpuStages: WebGL2GPUShaderStage[] = [];
    public glProgram: WebGLProgram | null = null;
    public glInputs: WebGL2GPUInput[] = [];
    public glUniforms: IWebGL2GPUUniform[] = [];
    public glBlocks: WebGL2GPUUniformBlock[] = [];
    public glSamplers: WebGL2GPUUniformSampler[] = [];
}

export class WebGL2GPUPipelineLayout {

}

export class WebGL2GPUPipelineState {

    public glPrimitive: GLenum = 0x0004; // WebGLRenderingContext.TRIANGLES
    public gpuShader: WebGL2GPUShader | null = null;
    public rs: GFXRasterizerState = new GFXRasterizerState();
    public dss: GFXDepthStencilState = new GFXDepthStencilState();
    public bs: GFXBlendState = new GFXBlendState();
    public dynamicStates: GFXDynamicState[] = [];
    public gpuRenderPass: WebGL2GPURenderPass | null = null;
}

export class WebGL2GPUBinding {
    public binding: number = 0;
    public type: GFXBindingType = GFXBindingType.UNKNOWN;
    public name: string = '';
    public gpuBuffer: WebGL2GPUBuffer | null = null;
    public gpuTexture: WebGL2GPUTexture | null = null;
    public gpuSampler: WebGL2GPUSampler | null = null;
}

export class WebGL2GPUBindingLayout {

    public gpuBindings: WebGL2GPUBinding[] = [];
}

export class WebGL2Attrib {
    public name: string = '';
    public glBuffer: WebGLBuffer | null = null;
    public glType: GLenum = 0;
    public size: number = 0;
    public count: number = 0;
    public stride: number = 0;
    public componentCount: number = 1;
    public isNormalized: boolean = false;
    public isInstanced: boolean = false;
    public offset: number = 0;
}

export interface IWebGL2GPUInputAssembler {
    attributes: IGFXAttribute[];
    gpuVertexBuffers: WebGL2GPUBuffer[];
    gpuIndexBuffer: WebGL2GPUBuffer | null;
    gpuIndirectBuffer: WebGL2GPUBuffer | null;

    glAttribs: WebGL2Attrib[];
    glIndexType: GLenum;
    glVAOs: Map<WebGLProgram, WebGLVertexArrayObject>;
}
