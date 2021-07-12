// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

import gfx from '../../../../renderer/gfx'
import InputAssembler from '../../../../renderer/core/input-assembler'
import { MeshData } from '../../../mesh/mesh-data'

const renderer = require('../../../renderer');

export default class ParticleBatchModel{
    _capacity = 0;
    _vertFormat = null;
    _vertAttrsFloatCount = 0;
    _mesh = null;
    _vertCount = 0;
    _indexCount = 0;
    _material = null;

    constructor () {
        this._capacity = 0;
        this._vertFormat = null;
        this._vertAttrsFloatCount = 0;
        this._mesh = null;

        this._subDatas = [];
        this._subMeshes = [];
    }

    setCapacity (capacity) {
        const capChanged = this._capacity !== capacity;
        this._capacity = capacity;
        if (this._inited && capChanged) {
            this._recreateBuffer();
        }
    }

    setVertexAttributes (mesh, vfmt) {
        if (this._mesh === mesh && this._vertFormat === vfmt) {
            return;
        }
        this._mesh = mesh;
        this._vertFormat = vfmt;
        this._vertAttrsFloatCount = this._vertFormat._bytes / 4; // number of float
        // rebuid
        this._createParticleData();
        this._inited = true;
    }

    _recreateBuffer () {
        this._createParticleData();
    }

    _createParticleData () {
        this.destroyIAData();
        this._vertCount = 4;
        this._indexCount = 6;

        let vbData = null;
        let ibData = null;
        let vertSize = this._vertFormat._bytes

        if (this._mesh) {
            let subData = this._mesh._subDatas[0];

            this._vertCount = subData.vData.byteLength / subData.vfm._bytes;
            this._indexCount = subData.iData.byteLength / 2;

            vbData = new Float32Array(vertSize * this._capacity * this._vertCount / 4);
            ibData = new Uint16Array(this._capacity * this._indexCount);

            let posEle = this._vertFormat.element(gfx.ATTR_TEX_COORD3);
            let normalEle = this._vertFormat.element(gfx.ATTR_NORMAL);
            let uvEle = this._vertFormat.element(gfx.ATTR_TEX_COORD);
            let colorEle = this._vertFormat.element(gfx.ATTR_COLOR1);

            this._mesh.copyAttribute(0, gfx.ATTR_POSITION, vbData.buffer, vertSize, posEle.offset, posEle.bytes, posEle.num);
            this._mesh.copyAttribute(0, gfx.ATTR_NORMAL, vbData.buffer, vertSize, normalEle.offset, normalEle.bytes, normalEle.num);
            this._mesh.copyAttribute(0, gfx.ATTR_UV0, vbData.buffer, vertSize, uvEle.offset, uvEle.bytes, uvEle.num);

            if (!this._mesh.copyAttribute(0, gfx.ATTR_COLOR0, vbData.buffer, vertSize, colorEle.offset, colorEle.bytes, colorEle.num)) {  // copy mesh color to ATTR_COLOR1
                const vb = new Float32Array(vbData.buffer);
                for (var i = 0; i < this._vertCount; ++i) {
                    vb[i * this._vertAttrsFloatCount + colorEle.offset / 4] = 1.0;
                    vb[i * this._vertAttrsFloatCount + colorEle.offset / 4 + 1] = 1.0;
                    vb[i * this._vertAttrsFloatCount + colorEle.offset / 4 + 2] = 1.0;
                    vb[i * this._vertAttrsFloatCount + colorEle.offset / 4 + 3] = 1.0;
                }
            }

            const vbFloatArray = new Float32Array(vbData.buffer);
            for (var i = 1; i < this._capacity; i++) {
                vbFloatArray.copyWithin(i * vertSize * this._vertCount / 4, 0, vertSize * this._vertCount / 4);
            }
            
            this._mesh.copyIndices(0, ibData);
            // indices
            for (var i = 1; i < this._capacity; i++) {
                for (var j = 0; j < this._indexCount; j++) {
                    ibData[i * this._indexCount + j] = ibData[j] + i * this._vertCount;
                }
            }
        } else {
            vbData = new Float32Array(vertSize * this._capacity * this._vertCount / 4);
            ibData = new Uint16Array(this._capacity * this._indexCount);

            let dst = 0;
            for (var i = 0; i < this._capacity; ++i) {
                const baseIdx = 4 * i;
                ibData[dst++] = baseIdx;
                ibData[dst++] = baseIdx + 1;
                ibData[dst++] = baseIdx + 2;
                ibData[dst++] = baseIdx + 3;
                ibData[dst++] = baseIdx + 2;
                ibData[dst++] = baseIdx + 1;
            }
        }

        let meshData = new MeshData();
        meshData.vData = vbData;
        meshData.iData = ibData;
        meshData.vfm = this._vertFormat;
        meshData.vDirty = true;
        meshData.iDirty = true;
        meshData.enable = true;
        this._subDatas[0] = meshData;

        if (CC_JSB && CC_NATIVERENDERER) {
            meshData.vDirty = true;
        } else {
            let vb = new gfx.VertexBuffer(
                renderer.device,
                this._vertFormat,
                gfx.USAGE_DYNAMIC,
                vbData
            );

            let ib = new gfx.IndexBuffer(
                renderer.device,
                gfx.INDEX_FMT_UINT16,
                gfx.USAGE_STATIC,
                ibData,
                ibData.length
            );
            
            this._subMeshes[0] = new InputAssembler(vb, ib);
        }
    }

    createTrailData (vfmt, num) {
        if (this._subDatas[1]) {
            return
        }

        let vertSize = vfmt._bytes;
        let vBuffer = new ArrayBuffer(vertSize * (num + 1) * 2);
        let ibData = new Uint16Array(num * 6);

        let meshData = new MeshData();
        meshData.vData = new Float32Array(vBuffer);
        meshData.iData = ibData;
        meshData.vfm = vfmt;
        meshData.vDirty = true;
        meshData.iDirty = true;
        meshData.enable = true;
        this._subDatas[1] = meshData;
        
        if (CC_JSB && CC_NATIVERENDERER) {
            meshData.vDirty = true;
        } else {
            let vb = new gfx.VertexBuffer(
                renderer.device,
                vfmt,
                gfx.USAGE_DYNAMIC,
                vBuffer
            );
            let ib = new gfx.IndexBuffer(
                renderer.device,
                gfx.INDEX_FMT_UINT16,
                gfx.USAGE_DYNAMIC,
                ibData,
                num * 6
            );
            
            this._subMeshes[1] = new InputAssembler(vb, ib);
        }
    }

    setModelMaterial (mat) {
        this._material = mat;
    }

    addParticleVertexData (index, pvdata) {
        let subData = this._subDatas[0];
        let vData = subData.getVData();
        let uintVData = subData.getVData(Uint32Array);

        if (!this._mesh) {
            let offset = index * this._vertAttrsFloatCount;
            vData[offset++] = pvdata[0].x; // position
            vData[offset++] = pvdata[0].y;
            vData[offset++] = pvdata[0].z;
            vData[offset++] = pvdata[1].x; // uv
            vData[offset++] = pvdata[1].y;
            vData[offset++] = pvdata[1].z; // frame idx
            vData[offset++] = pvdata[2].x; // size
            vData[offset++] = pvdata[2].y;
            vData[offset++] = pvdata[2].z;
            vData[offset++] = pvdata[3].x; // rotation
            vData[offset++] = pvdata[3].y;
            vData[offset++] = pvdata[3].z;
            uintVData[offset++] = pvdata[4]; // color
            if (pvdata[5]) {
                vData[offset++] = pvdata[5].x; // velocity
                vData[offset++] = pvdata[5].y;
                vData[offset++] = pvdata[5].z;
            }
        } else {
            for (let i = 0; i < this._vertCount; i++) {
                let offset = (index * this._vertCount + i) * this._vertAttrsFloatCount;
                vData[offset++] = pvdata[0].x; // position
                vData[offset++] = pvdata[0].y;
                vData[offset++] = pvdata[0].z;
                offset += 2;
                vData[offset++] = pvdata[1].z; // frame idx
                vData[offset++] = pvdata[2].x; // size
                vData[offset++] = pvdata[2].y;
                vData[offset++] = pvdata[2].z;
                vData[offset++] = pvdata[3].x; // rotation
                vData[offset++] = pvdata[3].y;
                vData[offset++] = pvdata[3].z;
                uintVData[offset++] = pvdata[4]; // color
            }
        }
    }

    _uploadData () {
        let subDatas = this._subDatas;
        let subMeshes = this._subMeshes;
        for (let i = 0, len = subDatas.length; i < len; i++) {
            let subData = subDatas[i];
            let subMesh = subMeshes[i];
            if (subData.vDirty) {
                let vBuffer = subMesh._vertexBuffer, vData = subData.vData;
                vBuffer.update(0, vData);
                subData.vDirty = false;
            }

            if (subData.iDirty) {
                let iBuffer = subMesh._indexBuffer, iData = subData.iData;
                iBuffer.update(0, iData);
                subData.iDirty = false;
            }
        }
    }

    updateIA (index, count, vDirty, iDirty) {
        if (CC_JSB && CC_NATIVERENDERER) return

        this._subMeshes[index]._count = count;

        let subData = this._subDatas[index];
        subData.vDirty = vDirty;
        subData.iDirty = iDirty;
    }

    clear () {
        let subMesh = this._subMeshes[0];
        if (subMesh) {
            subMesh.indexCount = 0;
        }
    }

    destroy () {
        this._subDatas.length = 0;

        let subMeshes = this._subMeshes;
        for (let i = 0, len = subMeshes.length; i < len; i++) {
            let vb = subMeshes[i]._vertexBuffer;
            if (vb) {
                vb.destroy();
            }
            
            let ib = subMeshes[i]._indexBuffer;
            if (ib) {
                ib.destroy();
            }
        }
        subMeshes.length = 0;
    }

    destroyIAData () {
        if (this._subMeshes[0]) {
            this._subMeshes[0]._vertexBuffer.destroy();
            this._subMeshes[0]._indexBuffer.destroy();
            this._subMeshes[0] = null;
        }

        this._subDatas[0] = null;
    }
}
