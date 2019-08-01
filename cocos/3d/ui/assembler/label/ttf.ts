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
 * ui-assembler 相关模块
 * @category ui-assembler
 */

import * as js from '../../../../core/utils/js';
import { Color } from '../../../../core/math';
import { RenderData } from '../../../../renderer/ui/renderData';
import { UI } from '../../../../renderer/ui/ui';
import { LabelComponent } from '../../components/label-component';
import { IAssembler} from '../base';
import { fillMeshVertices3D } from '../utils';
import { ttfUtils } from './ttfUtils';

const WHITE = Color.WHITE;

/**
 * ttf 组装器
 * 可通过 cc.UI.ttf 获取该组装器。
 */
export const ttf: IAssembler = {
    useModel: false,

    createData (comp: LabelComponent) {
        const renderData: RenderData|null = comp.requestRenderData();

        renderData!.dataLength = 4;
        renderData!.vertexCount = 4;
        renderData!.indiceCount = 6;

        const datas = renderData!.datas;
        datas[0].u = 0;
        datas[0].v = 1;
        datas[1].u = 1;
        datas[1].v = 1;
        datas[2].u = 0;
        datas[2].v = 0;
        datas[3].u = 1;
        datas[3].v = 0;
        return renderData as RenderData;
    },

    fillBuffers (comp: LabelComponent, renderer: UI) {
        fillMeshVertices3D(comp.node, renderer, comp.renderData!, WHITE);
    },

    updateVerts (comp: LabelComponent) {
        const renderData = comp.renderData;
        if (!renderData){
            return;
        }

        const node = comp.node;
        const width = node.width!;
        const height = node.height!;
        const appx = node.anchorX! * width;
        const appy = node.anchorY! * height;

        const datas = renderData!.datas;
        datas[0].x = -appx;
        datas[0].y = -appy;
        datas[1].x = width - appx;
        datas[1].y = -appy;
        datas[2].x = -appx;
        datas[2].y = height - appy;
        datas[3].x = width - appx;
        datas[3].y = height - appy;
    },
};

js.addon(ttf, ttfUtils);
