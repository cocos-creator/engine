/*
 Copyright (c) 2019-2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
 * @packageDocumentation
 * @module ui
 */
import { BufferUsageBit, MemoryUsageBit, InputAssemblerInfo, Attribute, Buffer, BufferInfo, InputAssembler } from '../../core/gfx';
import { Batcher2D } from './batcher-2d';
import { getComponentPerVertex } from './vertex-format';
import { IAPool } from '../../core/renderer';

export class MeshBuffer {
    public static OPACITY_OFFSET = 8;

    get attributes () { return this._attributes; }
    get vertexBuffers () { return this._vertexBuffers; }
    get indexBuffer () { return this._indexBuffer; }

    public vData: Float32Array | null = null;
    public iData: Uint16Array | null = null;

    public byteStart = 0;
    public byteOffset = 0;
    public indicesStart = 0;
    public indicesOffset = 0;
    public vertexStart = 0;
    public vertexOffset = 0;
    public lastByteOffset = 1;

    private _attributes: Attribute[] = null!;
    private _vertexBuffers: Buffer[] = [];
    private _indexBuffer: Buffer = null!;
    private _iaInfo: InputAssemblerInfo = null!;

    // NOTE:
    // actually 256 * 4 * (vertexFormat._bytes / 4)
    // include pos, uv, color in ui attributes
    private _batcher: Batcher2D;
    private _dirty = false;
    private _vertexFormatBytes = 0;
    private _initVDataCount = 0;
    private _initIDataCount = 256 * 6;
    private _outOfCallback: ((...args: number[]) => void) | null = null;
    private _hInputAssemblers: InputAssembler[] = [];
    private _nextFreeIAHandle = 0;

    constructor (batcher: Batcher2D) {
        this._batcher = batcher;
    }

    get vertexFormatBytes (): number {
        return this._vertexFormatBytes;
    }

    public initialize (attrs: Attribute[], outOfCallback: ((...args: number[]) => void) | null) {
        this._outOfCallback = outOfCallback;
        const formatBytes = getComponentPerVertex(attrs);
        this._vertexFormatBytes = formatBytes * Float32Array.BYTES_PER_ELEMENT;
        this._initVDataCount = 256 * this._vertexFormatBytes;
        const vbStride = Float32Array.BYTES_PER_ELEMENT * formatBytes;

        if (!this.vertexBuffers.length) {
            this.vertexBuffers.push(this._batcher.device.createBuffer(new BufferInfo(
                BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
                vbStride,
                vbStride,
            )));
        }

        const ibStride = Uint16Array.BYTES_PER_ELEMENT;

        if (!this.indexBuffer) {
            this._indexBuffer = this._batcher.device.createBuffer(new BufferInfo(
                BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
                ibStride,
                ibStride,
            ));
        }

        this._attributes = attrs;
        this._iaInfo = new InputAssemblerInfo(this.attributes, this.vertexBuffers, this.indexBuffer);

        this._reallocBuffer();
    }

    public request (vertexCount = 4, indicesCount = 6) {
        this.lastByteOffset = this.byteOffset;
        const byteOffset = this.byteOffset + vertexCount * this._vertexFormatBytes;
        const indicesOffset = this.indicesOffset + indicesCount;

        if (vertexCount + this.vertexOffset > 65535) {
            if (this._outOfCallback) {
                this._outOfCallback.call(this._batcher, vertexCount, indicesCount);
            }
            return false;
        }

        let byteLength = this.vData!.byteLength;
        let indicesLength = this.iData!.length;
        if (byteOffset > byteLength || indicesOffset > indicesLength) {
            while (byteLength < byteOffset || indicesLength < indicesOffset) {
                this._initVDataCount *= 2;
                this._initIDataCount *= 2;

                byteLength = this._initVDataCount * 4;
                indicesLength = this._initIDataCount;
            }

            this._reallocBuffer();
        }

        this.vertexOffset += vertexCount;
        this.indicesOffset += indicesCount;
        this.byteOffset = byteOffset;

        this._dirty = true;
        return true;
    }

    public reset () {
        this.byteStart = 0;
        this.byteOffset = 0;
        this.indicesStart = 0;
        this.indicesOffset = 0;
        this.vertexStart = 0;
        this.vertexOffset = 0;
        this.lastByteOffset = 0;
        this._nextFreeIAHandle = 0;

        this._dirty = false;
    }

    public destroy () {
        this._attributes = null!;

        this.vertexBuffers[0].destroy();
        this.vertexBuffers.length = 0;

        this.indexBuffer.destroy();
        this._indexBuffer = null!;

        for (let i = 0; i < this._hInputAssemblers.length; i++) {
            IAPool.free(this._hInputAssemblers[i]);
        }
        this._hInputAssemblers.length = 0;
    }

    public recordBatch (): InputAssembler | null {
        const vCount = this.indicesOffset - this.indicesStart;
        if (!vCount) {
            return null;
        }

        if (this._hInputAssemblers.length <= this._nextFreeIAHandle) {
            this._hInputAssemblers.push(IAPool.alloc(this._batcher.device, this._iaInfo));
        }

        const ia = this._hInputAssemblers[this._nextFreeIAHandle++];

        ia.firstIndex = this.indicesStart;
        ia.indexCount = vCount;

        return ia;
    }

    public uploadBuffers () {
        if (this.byteOffset === 0 || !this._dirty) {
            return;
        }

        const verticesData = new Float32Array(this.vData!.buffer, 0, this.byteOffset >> 2);
        const indicesData = new Uint16Array(this.iData!.buffer, 0, this.indicesOffset);

        if (this.byteOffset > this.vertexBuffers[0].size) {
            this.vertexBuffers[0].resize(this.byteOffset);
        }
        this.vertexBuffers[0].update(verticesData);

        if (this.indicesOffset * 2 > this.indexBuffer.size) {
            this.indexBuffer.resize(this.indicesOffset * 2);
        }
        this.indexBuffer.update(indicesData);
        this._dirty = false;
    }

    private _reallocBuffer () {
        this._reallocVData(true);
        this._reallocIData(true);
    }

    private _reallocVData (copyOldData: boolean) {
        let oldVData;
        if (this.vData) {
            oldVData = new Uint8Array(this.vData.buffer);
        }

        this.vData = new Float32Array(this._initVDataCount);

        if (oldVData && copyOldData) {
            const newData = new Uint8Array(this.vData.buffer);
            for (let i = 0, l = oldVData.length; i < l; i++) {
                newData[i] = oldVData[i];
            }
        }
    }

    private _reallocIData (copyOldData: boolean) {
        const oldIData = this.iData;

        this.iData = new Uint16Array(this._initIDataCount);

        if (oldIData && copyOldData) {
            const iData = this.iData;
            for (let i = 0, l = oldIData.length; i < l; i++) {
                iData[i] = oldIData[i];
            }
        }
    }
}
