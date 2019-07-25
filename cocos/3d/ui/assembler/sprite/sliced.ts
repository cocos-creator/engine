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

import { IUV, SpriteFrame } from '../../../../assets';
import { Mat4 } from '../../../../core/value-types';
import { color4, vec3 } from '../../../../core/vmath';
import { IRenderData, RenderData } from '../../../../renderer/ui/renderData';
import { UI } from '../../../../renderer/ui/ui';
import { SpriteComponent } from '../../components';
import { IAssembler } from '../base';

const vec3_temp = vec3.create();
const matrix = new Mat4();

/**
 * sliced 组装器
 * 可通过 cc.UI.sliced 获取该组装器。
 */
export const sliced: IAssembler = {
    useModel: false,

    createData (sprite: SpriteComponent) {
        const renderData: RenderData | null = sprite.requestRenderData();
        // 0-4 for local verts
        // 5-20 for world verts
        renderData!.dataLength = 20;

        renderData!.vertexCount = 16;
        renderData!.indiceCount = 54;
        return renderData as RenderData;
    },

    updateRenderData (sprite: SpriteComponent) {
        const frame = sprite.spriteFrame;

        // TODO: Material API design and export from editor could affect the material activation process
        // need to update the logic here
        // if (frame) {
        //     if (!frame._original && dynamicAtlasManager) {
        //         dynamicAtlasManager.insertSpriteFrame(frame);
        //     }
        //     if (sprite._material._texture !== frame._texture) {
        //         sprite._activateMaterial();
        //     }
        // }

        const renderData = sprite.renderData;
        if (renderData && frame) {
            const vertDirty = renderData.vertDirty;
            if (vertDirty) {
                this.updateVerts!(sprite);
                this.updateWorldVerts!(sprite);
            }
        }
    },

    updateVerts (sprite: SpriteComponent) {
        const renderData: RenderData | null = sprite.renderData;
        const datas: IRenderData[] = renderData!.datas;
        const node = sprite.node;
        const width = node.width!;
        const height = node.height!;
        const appx = node.anchorX! * width;
        const appy = node.anchorY! * height;

        const frame: SpriteFrame|null = sprite.spriteFrame;
        const leftWidth = frame!.insetLeft;
        const rightWidth = frame!.insetRight;
        const topHeight = frame!.insetTop;
        const bottomHeight = frame!.insetBottom;

        let sizableWidth = width - leftWidth - rightWidth;
        let sizableHeight = height - topHeight - bottomHeight;
        let xScale = width / (leftWidth + rightWidth);
        let yScale = height / (topHeight + bottomHeight);
        xScale = (isNaN(xScale) || xScale > 1) ? 1 : xScale;
        yScale = (isNaN(yScale) || yScale > 1) ? 1 : yScale;
        sizableWidth = sizableWidth < 0 ? 0 : sizableWidth;
        sizableHeight = sizableHeight < 0 ? 0 : sizableHeight;

        datas[0].x = -appx;
        datas[0].y = -appy;
        datas[1].x = leftWidth * xScale - appx;
        datas[1].y = bottomHeight * yScale - appy;
        datas[2].x = datas[1].x + sizableWidth;
        datas[2].y = datas[1].y + sizableHeight;
        datas[3].x = width - appx;
        datas[3].y = height - appy;

        renderData!.vertDirty = false;
    },

    fillBuffers (sprite: SpriteComponent, renderer: UI) {
        if (sprite.node.hasChanged) {
            this.updateWorldVerts(sprite);
        }

        let buffer = renderer.currBufferBatch!;
        const renderData: RenderData|null = sprite.renderData;
        // const node: Node = sprite.node;
        // const color: Color = sprite.color;
        const datas: IRenderData[] = renderData!.datas;

        let vertexOffset = buffer.byteOffset >> 2;
        const vertexCount = renderData!.vertexCount;
        let indiceOffset: number = buffer.indiceOffset;
        let vertexId: number = buffer.vertexOffset;

        const uvSliced: IUV[] = sprite!.spriteFrame!.uvSliced;

        const isRecreate = buffer.request(vertexCount, renderData!.indiceCount);
        if (!isRecreate) {
            buffer = renderer.currBufferBatch!;
            vertexOffset = 0;
            indiceOffset = 0;
            vertexId = 0;
        }

        // buffer data may be realloc, need get reference after request.
        const vbuf: Float32Array|null = buffer.vData;
        // const  uintbuf = buffer._uintVData,
        const ibuf: Uint16Array|null = buffer.iData;

        for (let i = 4; i < 20; ++i) {
            const vert = datas[i];
            const uvs = uvSliced[i - 4];

            vbuf![vertexOffset++] = vert.x;
            vbuf![vertexOffset++] = vert.y;
            vbuf![vertexOffset++] = vert.z;
            vbuf![vertexOffset++] = uvs.u;
            vbuf![vertexOffset++] = uvs.v;
            color4.array(vbuf!, sprite.color, vertexOffset);
            vertexOffset += 4;
            // uintbuf[vertexOffset++] = color;
        }

        for (let r = 0; r < 3; ++r) {
            for (let c = 0; c < 3; ++c) {
                const start = vertexId + r * 4 + c;
                ibuf![indiceOffset++] = start;
                ibuf![indiceOffset++] = start + 1;
                ibuf![indiceOffset++] = start + 4;
                ibuf![indiceOffset++] = start + 1;
                ibuf![indiceOffset++] = start + 5;
                ibuf![indiceOffset++] = start + 4;
            }
        }
    },

    updateWorldVerts (sprite: SpriteComponent) {
        const node = sprite.node;
        const datas: IRenderData[] = sprite!.renderData!.datas;

        node.getWorldMatrix(matrix);
        for (let row = 0; row < 4; ++row) {
            const rowD = datas[row];
            for (let col = 0; col < 4; ++col) {
                const colD = datas[col];
                const world = datas[4 + row * 4 + col];

                vec3.set(vec3_temp, colD.x, rowD.y, 0);
                vec3.transformMat4(world, vec3_temp, matrix);
            }
        }
    },
};
