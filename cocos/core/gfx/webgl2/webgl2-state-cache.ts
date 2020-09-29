import { GFX_MAX_BUFFER_BINDINGS, GFX_MAX_TEXTURE_UNITS, GFX_MAX_VERTEX_ATTRIBUTES, GFXRect, GFXViewport } from '../define';
import { GFXBlendState, GFXDepthStencilState, GFXRasterizerState } from '../pipeline-state';

export interface IWebGL2TexUnit {
    glTexture: WebGLTexture | null;
}

export class WebGL2StateCache {
    public glArrayBuffer: WebGLBuffer | null = null;
    public glElementArrayBuffer: WebGLBuffer | null = null;
    public glUniformBuffer: WebGLBuffer | null = null;
    public glBindUBOs: (WebGLBuffer | null)[];
    public glVAO: WebGLVertexArrayObject | null = null;
    public texUnit: number = 0;
    public glTexUnits: IWebGL2TexUnit[];
    public glSamplerUnits: (WebGLSampler | null)[];
    public glRenderbuffer: WebGLRenderbuffer | null = null;
    public glFramebuffer: WebGLFramebuffer | null = null;
    public glReadFramebuffer: WebGLFramebuffer | null = null;
    public viewport: GFXViewport;
    public scissorRect: GFXRect;
    public rs: GFXRasterizerState;
    public dss: GFXDepthStencilState;
    public bs: GFXBlendState;
    public glProgram: WebGLProgram | null = null;
    public glEnabledAttribLocs: boolean[];
    public glCurrentAttribLocs: boolean[];

    constructor () {
        this.glBindUBOs = new Array<WebGLBuffer>(GFX_MAX_BUFFER_BINDINGS);
        this.glBindUBOs.fill(null);

        this.glTexUnits = new Array<IWebGL2TexUnit>(GFX_MAX_TEXTURE_UNITS);
        this.glSamplerUnits = new Array<WebGLSampler>(GFX_MAX_TEXTURE_UNITS);
        this.glSamplerUnits.fill(null);

        this.viewport = { left: 0.0, top: 0.0, width: 0.0, height: 0.0, minDepth: 0.0, maxDepth: 0.0 };
        this.scissorRect = { x: 0.0, y: 0.0, width: 0.0, height: 0.0 };
        this.rs = new GFXRasterizerState();
        this.dss = new GFXDepthStencilState();
        this.bs = new GFXBlendState();
        this.glEnabledAttribLocs = new Array<boolean>(GFX_MAX_VERTEX_ATTRIBUTES);
        this.glCurrentAttribLocs = new Array<boolean>(GFX_MAX_VERTEX_ATTRIBUTES);
        this.glEnabledAttribLocs.fill(false);
        this.glCurrentAttribLocs.fill(false);

        for (let i = 0; i < GFX_MAX_TEXTURE_UNITS; ++i) {
            this.glTexUnits[i] = {
                glTexture: null,
            };
        }
    }
}
