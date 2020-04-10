/**
 * @category gfx
 */

import {
    GFXFormat,
    GFXLoadOp,
    GFXObject,
    GFXObjectType,
    GFXPipelineBindPoint,
    GFXStoreOp,
    GFXTextureLayout,
} from './define';
import { GFXDevice } from './device';

/**
 * @en Color attachment.
 * @zh GFX 颜色附件。
 */
export class GFXColorAttachment {
    public format: GFXFormat = GFXFormat.UNKNOWN;
    public loadOp: GFXLoadOp = GFXLoadOp.CLEAR;
    public storeOp: GFXStoreOp = GFXStoreOp.STORE;
    public sampleCount: number = 1;
    public beginLayout: GFXTextureLayout = GFXTextureLayout.COLOR_ATTACHMENT_OPTIMAL;
    public endLayout: GFXTextureLayout = GFXTextureLayout.COLOR_ATTACHMENT_OPTIMAL;
}

/**
 * @en Depth stencil attachment.
 * @zh GFX 深度模板附件。
 */
export class GFXDepthStencilAttachment {
    public format: GFXFormat = GFXFormat.UNKNOWN;
    public depthLoadOp: GFXLoadOp = GFXLoadOp.CLEAR;
    public depthStoreOp: GFXStoreOp = GFXStoreOp.STORE;
    public stencilLoadOp: GFXLoadOp = GFXLoadOp.CLEAR;
    public stencilStoreOp: GFXStoreOp = GFXStoreOp.STORE;
    public sampleCount: number = 1;
    public beginLayout: GFXTextureLayout = GFXTextureLayout.DEPTH_STENCIL_ATTACHMENT_OPTIMAL;
    public endLayout: GFXTextureLayout = GFXTextureLayout.DEPTH_STENCIL_ATTACHMENT_OPTIMAL;
}

export interface IGFXSubPassInfo {
    bindPoint: GFXPipelineBindPoint;
    inputs: number[];
    colors: number[];
    resolves: number[];
    depthStencil: number;
    preserves: number[];
}

export interface IGFXRenderPassInfo {
    colorAttachments?: GFXColorAttachment[];
    depthStencilAttachment?: GFXDepthStencilAttachment;
    // subPasses? : GFXSubPassInfo[];
}

/**
 * @en GFX render pass.
 * @zh GFX 渲染过程。
 */
export abstract class GFXRenderPass extends GFXObject {

    protected _device: GFXDevice;

    protected _colorInfos: GFXColorAttachment[] = [];

    protected _depthStencilInfo: GFXDepthStencilAttachment | null = null;

    // protected _subPasses : GFXSubPassInfo[] = [];

    constructor (device: GFXDevice) {
        super(GFXObjectType.RENDER_PASS);
        this._device = device;
    }

    public abstract initialize (info: IGFXRenderPassInfo): boolean;

    public abstract destroy (): void;
}
