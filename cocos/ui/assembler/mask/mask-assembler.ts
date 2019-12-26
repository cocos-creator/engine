/*
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
 * @category ui-assembler
 */

import { IRenderData, RenderData } from '../../../core/renderer/ui/render-data';
import { UI } from '../../../core/renderer/ui/ui';
import { MaskComponent } from '../../components/mask-component';
import { IAssembler, IAssemblerManager } from '../../../core/renderer/ui/base';
import { StencilManager } from '../../../core/renderer/ui/stencil-manager';

const _stencilManager = StencilManager.sharedManager!;

export const maskAssembler: IAssembler = {
    createData (mask: MaskComponent) {
        const renderData = mask.requestRenderData();
        renderData!.dataLength = 4;
        renderData!.vertexCount = 4;
        renderData!.indiceCount = 6;
        return renderData as RenderData;
    },

    updateRenderData (mask: MaskComponent){
        const renderData = mask.renderData;
        if (renderData) {
            if (renderData.vertDirty) {
                if (this.updateVerts) {
                    this.updateVerts(mask);
                }
            }
        }
    },

    updateVerts (mask: MaskComponent) {
        const renderData: RenderData | null = mask.renderData;
        if (!renderData) {
            return;
        }

        const node = mask.node;
        const datas: IRenderData[] = renderData.datas;
        const cw = node.width;
        const ch = node.height;
        const appx = node.anchorX * cw;
        const appy = node.anchorY * ch;
        let l = 0;
        let b = 0;
        let r = 0;
        let t = 0;
        // if (sprite.trim) {
        l = -appx;
        b = -appy;
        r = cw - appx;
        t = ch - appy;
        datas[0].x = l;
        datas[0].y = b;
        datas[3].x = r;
        datas[3].y = t;

        renderData.vertDirty = false;
    },

    fillBuffers (mask: MaskComponent, renderer: UI) {
        _stencilManager.pushMask(mask);

        _stencilManager.clear();
        mask.clearGraphics!.updateAssembler(renderer);

        _stencilManager.enterLevel();
        mask.graphics!.updateAssembler(renderer);

        _stencilManager.enableMask();
    },
};

export const maskEndAssembler: IAssembler = {
    fillBuffers (mask: MaskComponent, ui: UI) {
        _stencilManager.exitMask();
    },
};

const StartAssembler: IAssemblerManager = {
    getAssembler () {
        return maskAssembler;
    },
};

const PostAssembler: IAssemblerManager = {
    getAssembler () {
        return maskEndAssembler;
    },
};

MaskComponent.Assembler = StartAssembler;
MaskComponent.PostAssembler = PostAssembler;
