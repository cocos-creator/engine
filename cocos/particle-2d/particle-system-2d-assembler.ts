/****************************************************************************
 Copyright (c) 2017-2018 Chukong Technologies Inc.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Chukong Aipu reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

import { IAssembler, IAssemblerManager } from '../core/renderer/ui/base';
import { ParticleSystem2D } from './particle-system-2d';
import { MeshRenderData } from '../core/renderer/ui/render-data';
import { UI } from '../core/renderer/ui/ui';
import { PositionType } from './define';

export const ParticleAssembler: IAssembler = {
    renderData: MeshRenderData,
    createData (comp: ParticleSystem2D) {
        this.renderData = MeshRenderData.add();
    },
    requestData (vertexCount: number, indicesCount: number) {
        let offset = this.renderData.indicesCount;
        this.renderData.request(vertexCount, indicesCount);
        const count = this.renderData.indicesCount / 6;
        const buffer = this.renderData.iData;
        for (let i = offset; i < count; i++) {
            const vId = i * 4;
            buffer[offset++] = vId;
            buffer[offset++] = vId + 1;
            buffer[offset++] = vId + 2;
            buffer[offset++] = vId + 1;
            buffer[offset++] = vId + 3;
            buffer[offset++] = vId + 2;
        }
    },
    reset () {
        this.renderData.reset();
    },
    updateRenderData () {
    },

    fillBuffers (comp: ParticleSystem2D, renderer: UI) {
        if (comp === null) {
            return;
        }

        const renderData = this.renderData;
        if (renderData.vertexCount === 0 || renderData.indicesCount == 0) {
            return;
        }

        let node;
        if (comp.positionType === PositionType.RELATIVE) {
            node = comp.node.parent;
        } else {
            node = comp.node;
        }

        let buffer = renderer.currBufferBatch!;
        let vertexOffset = buffer.byteOffset >> 2;
        let indicesOffset = buffer.indicesOffset;
        let vertexId = buffer.vertexOffset;
        const isRecreate = buffer.request(renderData.vertexCount, renderData.indicesCount);
        if (!isRecreate) {
            buffer = renderer.currBufferBatch!;
            indicesOffset = 0;
            vertexId = 0;
        }

         // buffer data may be realloc, need get reference after request.
        const vBuf = buffer.vData!;
        const iBuf = buffer.iData!;

        const vData = renderData.vData;
        const iData = renderData.iData;

        const vLen = renderData.vertexCount * 9;
        for (let i = 0; i < vLen; i++) {
            vBuf[vertexOffset++] = vData[i];
        }

        const iLen = renderData.indicesCount;
        for (let i = 0; i < iLen; i++) {
            iBuf[indicesOffset++] = iData[i];
        }
    }
}

export const ParticleSystem2DAssembler: IAssemblerManager = {
    getAssembler (comp: ParticleSystem2D) {
        return ParticleAssembler;
    },
};

ParticleSystem2D.Assembler = ParticleSystem2DAssembler;