import { GFXBuffer } from './buffer';
import { GFXCommandBuffer } from './command-buffer';
import * as GFXDefines from './define';
import { GFXDevice } from './device';
import { GFXFramebuffer } from './framebuffer';
import { GFXInputAssembler } from './input-assembler';
import { GFXPipelineLayout } from './pipeline-layout';
import { GFXPipelineState } from './pipeline-state';
import { GFXQueue } from './queue';
import { GFXRenderPass } from './render-pass';
import { GFXSampler } from './sampler';
import { GFXShader } from './shader';
import { GFXTexture } from './texture';
import { GFXTextureView } from './texture-view';
import { WebGLGFXDevice } from './webgl/webgl-device';
import { WebGL2GFXDevice } from './webgl2/webgl2-device';

export { GFXAttributeName, GFXFormat, GFXPrimitiveMode } from './define';

cc.GFXDevice = GFXDevice;
cc.GFXBuffer = GFXBuffer;
cc.GFXTexture = GFXTexture;
cc.GFXTextureView = GFXTextureView;
cc.GFXSampler = GFXSampler;
cc.GFXShader = GFXShader;
cc.GFXInputAssembler = GFXInputAssembler;
cc.GFXRenderPass = GFXRenderPass;
cc.GFXFramebuffer = GFXFramebuffer;
cc.GFXPipelineLayout = GFXPipelineLayout;
cc.GFXPipelineState = GFXPipelineState;
cc.GFXCommandBuffer = GFXCommandBuffer;
cc.GFXQueue = GFXQueue;
cc.WebGLGFXDevice = WebGLGFXDevice;
cc.WebGL2GFXDevice = WebGL2GFXDevice;

Object.assign(cc, GFXDefines);
