/**
 * @hidden
 */

import { Material } from '../../3d/assets/material';
import Pool from '../../3d/memop/pool';
import RecyclePool from '../../3d/memop/recycle-pool';
import { Color, Rect } from '../../core/value-types';

export interface IRenderData {
    x: number;
    y: number;
    z: number;
    u: number;
    v: number;
    color: Color;
}

export class BaseRenderData {
    public material: Material | null = null;
    public vertexCount: number = 0;
    public indiceCount: number = 0;
}

export class RenderData extends BaseRenderData {
    public vData: Float32Array | null = null;

    get dataLength () {
        return this._datas.length;
    }

    set dataLength (length: number) {
        const data: IRenderData[] = this._datas;
        if (data.length !== length) {
            // // Free extra data
            const value = data.length;
            let i = 0;
            for (i = length; i < value; i++) {
                _dataPool.free(data[i]);
            }

            for (i = value; i < length; i++) {
                data[i] = _dataPool.alloc();
            }

            data.length = length;
        }
    }

    get datas () {
        return this._datas;
    }

    public static add () {
        return _pool.add();
    }

    public static remove (data: RenderData) {
        const idx = _pool.data.indexOf(data);
        if (idx === -1){
            return;
        }

        _pool.data[idx].clear();
        _pool.removeAt(idx);
    }

    public uvDirty: boolean = true;
    public vertDirty: boolean = true;
    private _datas: IRenderData[] = [];
    private _indices: number[] = [];
    private _pivotX: number = 0;
    private _pivotY: number = 0;
    private _width: number = 0;
    private _height: number = 0;

    public updateSizeNPivot (width: number, height: number, pivotX: number, pivotY: number) {
        if (width !== this._width ||
            height !== this._height ||
            pivotX !== this._pivotX ||
            pivotY !== this._pivotY) {
            this._width = width;
            this._height = height;
            this._pivotX = pivotX;
            this._pivotY = pivotY;
            this.vertDirty = true;
        }
    }

    public clear () {
        this._datas.length = 0;
        this._indices.length = 0;
        this._pivotX = 0;
        this._pivotY = 0;
        this._width = 0;
        this._height = 0;
        this.uvDirty = true;
        this.vertDirty = true;
        this.material = null;
        this.vertexCount = 0;
        this.indiceCount = 0;
    }
}

export class IARenderData extends BaseRenderData {
    public vData: Float32Array = new Float32Array(256 * 9 * Float32Array.BYTES_PER_ELEMENT);
    public iData: Uint16Array = new Uint16Array(256 * 6);
    public vertexStart = 0;
    public indiceStart = 0;
    public byteStart = 0;
    public byteCount = 0;
    private _formatByte = 9 * Float32Array.BYTES_PER_ELEMENT;

    public request (vertexCount: number, indiceCount: number) {
        const byteOffset = this.byteCount + vertexCount * this._formatByte;
        const indiceOffset = this.indiceCount + indiceCount;

        if (vertexCount + this.vertexCount > 65535) {
            return false;
        }

        let byteLength = this.vData!.byteLength;
        let indiceLength = this.iData!.length;
        let vCount = this.vData.length;
        let iCount = this.iData.length;
        if (byteOffset > byteLength || indiceOffset > indiceLength) {
            while (byteLength < byteOffset || indiceLength < indiceOffset) {
                vCount *= 2;
                iCount *= 2;

                byteLength = vCount * 4;
                indiceLength = iCount;
            }
            // copy old data
            const oldvData = new Float32Array(this.vData.buffer);
            this.vData = new Float32Array(vCount);
            this.vData.set(oldvData, 0);
            const oldiData = new Uint16Array(this.iData.buffer);
            this.iData = new Uint16Array(iCount);
            this.iData.set(oldiData, 0);

        }

        this.vertexCount += vertexCount; // vertexOffset
        this.indiceCount += indiceCount; // indiceOffset
        this.byteCount = byteOffset; // byteOffset
        return true;
    }

    public reset () {
        this.vertexCount = 0;
        this.indiceCount = 0;
        this.byteCount = 0;
        this.vertexStart = 0;
        this.indiceStart = 0;
        this.byteStart = 0;
    }
}

const _dataPool = new Pool(() => {
    return {
        x: 0,
        y: 0,
        z: 0,
        u: 0,
        v: 0,
        color: Color.WHITE,
    } as IRenderData;
}, 128);

const _pool = new RecyclePool(() => {
    return new RenderData();
}, 32);
