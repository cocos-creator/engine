/*
 Copyright (c) 2017-2018 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
 */

/**
 * @packageDocumentation
 * @module particle2d
 */

import { IAssembler, IAssemblerManager } from '../2d/renderer/base';
import { MotionStreak } from './motion-streak-2d';
import { Vec2, Color } from '../core/math';
import { Batcher2D } from '../2d/renderer/batcher-2d';

const _tangent = new Vec2();
// const _miter = new Vec2();
const _normal = new Vec2();
const _vec2 = new Vec2();

function normal (out:Vec2, dir:Vec2) {
    // get perpendicular
    out.x = -dir.y;
    out.y = dir.x;
    return out;
}

function computeMiter (miter, lineA, lineB, halfThick, maxMultiple) {
    // get tangent line
    lineA.add(lineB, _tangent);
    _tangent.normalize();

    // get miter as a unit vector
    miter.x = -_tangent.y;
    miter.y = _tangent.x;
    _vec2.x = -lineA.y;
    _vec2.y = lineA.x;

    // get the necessary length of our miter
    let multiple = 1 / miter.dot(_vec2);
    if (maxMultiple) {
        multiple = Math.min(multiple, maxMultiple);
    }
    return halfThick * multiple;
}

export const MotionStreakAssembler: IAssembler = {
    createData (comp: MotionStreak) {
        const renderData = comp.requestRenderData();
        renderData.dataLength = 4;
        renderData.vertexCount = 16;
        renderData.indicesCount = (16 - 2) * 3;
        return renderData;
    },

    update (comp: MotionStreak, dt: number) {
        const stroke = comp.stroke / 2;

        const node = comp.node;
        const matrix = node.worldMatrix;
        const tx = matrix.m12;
        const ty = matrix.m13;

        const points = comp.points;

        let cur;
        if (points.length > 1) {
            const point = points[0];
            const difx = point.point.x - tx;
            const dify = point.point.y - ty;
            if ((difx * difx + dify * dify) < comp.minSeg) {
                cur = point;
            }
        }

        if (!cur) {
            cur = new MotionStreak.Point();
            points.unshift(cur);
        }

        cur.setPoint(tx, ty);
        cur.time = comp.fadeTime + dt;

        let verticesCount = 0;
        let indicesCount = 0;

        if (points.length < 2) {
            return;
        }

        const renderData = comp.renderData!;

        const color = comp.color;
        const cr = color.r;
        const cg = color.g;
        const cb = color.b;
        const ca = color.a;

        const prev = points[1];
        prev.distance = Vec2.subtract(_vec2, cur.point, prev.point).length();
        _vec2.normalize();
        prev.setDir(_vec2.x, _vec2.y);
        cur.setDir(_vec2.x, _vec2.y);

        renderData.dataLength = points.length * 2;

        const data = renderData.data;
        const fadeTime = comp.fadeTime;
        let findLast = false;
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            const point = p.point;
            const dir = p.dir;
            p.time -= dt;

            if (p.time < 0) {
                points.splice(i, 1);
                continue;
            }

            const progress = p.time / fadeTime;

            const next = points[i - 1];
            if (!findLast) {
                if (!next) {
                    points.splice(i, 1);
                    continue;
                }

                point.x = next.point.x - dir.x * progress;
                point.y = next.point.y - dir.y * progress;
            }
            findLast = true;

            normal(_normal, dir);

            const da = progress * ca;
            const c = ((da << 24) >>> 0) + (cb << 16) + (cg << 8) + cr;

            let offset = verticesCount;

            data[offset].x = point.x + _normal.x * stroke;
            data[offset].y = point.y + _normal.y * stroke;
            data[offset].u = 1;
            data[offset].v = progress;
            data[offset].color._val = c;

            offset += 1;

            data[offset].x = point.x - _normal.x * stroke;
            data[offset].y = point.y - _normal.y * stroke;
            data[offset].u = 0;
            data[offset].v = progress;
            data[offset].color._val = c;

            verticesCount += 2;
        }

        indicesCount = verticesCount <= 2 ? 0 : (verticesCount - 2) * 3;

        renderData.vertexCount = verticesCount;
        renderData.indicesCount = indicesCount;
    },

    updateRenderData (comp: MotionStreak) {
    },

    fillBuffers (comp: MotionStreak, renderer: Batcher2D) {
        const renderData = comp.renderData!;
        const dataList = renderData.data;
        const node = comp.node;

        let buffer = renderer.acquireBufferBatch()!;
        let vertexOffset = buffer.byteOffset >> 2;
        let indicesOffset = buffer.indicesOffset;
        let vertexId = buffer.vertexOffset;
        const isRecreate = buffer.request(renderData.vertexCount, renderData.indicesCount);
        if (!isRecreate) {
            buffer = renderer.currBufferBatch!;
            indicesOffset = 0;
            vertexId = 0;
        }

        // buffer data may be reallocated, need get reference after request.
        const vBuf = buffer.vData!;
        const iBuf = buffer.iData!;
        const vertexCount = renderData.vertexCount;
        const indicesCount = renderData.indicesCount;

        for (let i = 0; i < vertexCount; i++) {
            const vert = dataList[i];
            vBuf[vertexOffset++] = vert.x;
            vBuf[vertexOffset++] = vert.y;
            vBuf[vertexOffset++] = vert.z;
            vBuf[vertexOffset++] = vert.u;
            vBuf[vertexOffset++] = vert.v;
            Color.toArray(vBuf, vert.color, vertexOffset);
            vertexOffset += 4;
        }

        // fill index data
        for (let i = 0, l = indicesCount; i < l; i += 2) {
            const start = vertexId + i;
            iBuf[indicesOffset++] = start;
            iBuf[indicesOffset++] = start + 2;
            iBuf[indicesOffset++] = start + 1;
            iBuf[indicesOffset++] = start + 1;
            iBuf[indicesOffset++] = start + 2;
            iBuf[indicesOffset++] = start + 3;
        }
    },
};

export const MotionStreakAssemblerManager: IAssemblerManager = {
    getAssembler (comp: MotionStreak) {
        return MotionStreakAssembler;
    },
};

MotionStreak.Assembler = MotionStreakAssemblerManager;
