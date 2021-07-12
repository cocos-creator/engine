/*
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
 * @packageDocumentation
 * @hidden
 */

import { DEBUG, JSB } from 'internal:constants';
import { NativeBufferPool, NativeObjectPool, NativeBlendState, NativeDepthStencilState, NativeRasterizerState } from './native-pools';
import {
    DescriptorSetInfo,
    Device, DescriptorSet, ShaderInfo, Shader, InputAssemblerInfo, InputAssembler,
} from '../../gfx';
import { NativePass } from '../scene/native-scene';

const contains = (a: number[], t: number) => {
    for (let i = 0; i < a.length; ++i) {
        if (a[i] === t) return true;
    }
    return false;
};

type PoolType = BufferPoolType | ObjectPoolType;

interface IMemoryPool<P extends PoolType> {
    free (handle: IHandle<P>): void;
}

// a little hacky, but works (different specializations should not be assignable to each other)
interface IHandle<P extends PoolType> extends Number {
    // we make this non-optional so that even plain numbers would not be directly assignable to handles.
    // this strictness will introduce some casting hassle in the pool implementation itself
    // but becomes generally more useful for client code type checking.
    _: P;
}

enum BufferDataType {
    UINT32,
    FLOAT32,
    NEVER,
}

type BufferManifest = { [key: string]: number | string; COUNT: number };
type BufferDataTypeManifest<E extends BufferManifest> = { [key in E[keyof E]]: BufferDataType };
type BufferDataMembersManifest<E extends BufferManifest> = { [key in E[keyof E]]: number };
type BufferArrayType = Float32Array | Uint32Array;

class BufferPool<P extends PoolType, E extends BufferManifest> implements IMemoryPool<P> {
    // naming convension:
    // this._bufferViews[chunk][entry][element]

    private _dataType: BufferDataTypeManifest<E>;
    private _dataMembers: BufferDataMembersManifest<E>;
    private _elementCount: number;
    private _entryBits: number;
    private _stride: number;
    private _entriesPerChunk: number;
    private _entryMask: number;
    private _chunkMask: number;
    private _poolFlag: number;
    private _arrayBuffers: ArrayBuffer[] = [];
    private _freeLists: number[][] = [];
    private _uint32BufferViews: Uint32Array[][] = [];
    private _float32BufferViews: Float32Array[][] = [];
    private _hasUint32 = false;
    private _hasFloat32 = false;
    private _nativePool: NativeBufferPool;

    constructor (poolType: P, dataType: BufferDataTypeManifest<E>, dataMembers: BufferDataMembersManifest<E>, enumType: E, bytesPerElement: number, entryBits = 8) {
        this._elementCount = enumType.COUNT;
        this._entryBits = entryBits;
        this._dataType = dataType;
        this._dataMembers = dataMembers;

        this._stride = bytesPerElement * this._elementCount;
        this._entriesPerChunk = 1 << entryBits;
        this._entryMask = this._entriesPerChunk - 1;
        this._poolFlag = 1 << 30;
        this._chunkMask = ~(this._entryMask | this._poolFlag);
        this._nativePool = new NativeBufferPool(poolType, entryBits, this._stride);

        let type: BufferDataType = BufferDataType.NEVER;
        let hasFloat32 = false; let hasUint32 = false;
        for (const e in dataType) {
            hasFloat32 = this._hasFloat32;
            hasUint32 = this._hasUint32;
            if (hasUint32 && hasFloat32) {
                break;
            }

            type = dataType[e as E[keyof E]];
            if (!hasFloat32 && type === BufferDataType.FLOAT32) {
                this._hasFloat32 = true;
            } else if (!hasUint32 && type === BufferDataType.UINT32) {
                this._hasUint32 = true;
            }
        }
    }

    public alloc (): IHandle<P> {
        let i = 0;
        for (; i < this._freeLists.length; i++) {
            const list = this._freeLists[i];
            if (list.length) {
                const j = list[list.length - 1]; list.length--;
                return (i << this._entryBits) + j + this._poolFlag as unknown as IHandle<P>;
            }
        }
        // add a new chunk
        const buffer = this._nativePool.allocateNewChunk();
        const float32BufferViews: Float32Array[] = [];
        const uint32BufferViews: Uint32Array[] = [];
        const freeList: number[] = [];
        const hasFloat32 = this._hasFloat32;
        const hasUint32 = this._hasUint32;
        for (let j = 0; j < this._entriesPerChunk; j++) {
            if (hasFloat32) { float32BufferViews.push(new Float32Array(buffer, this._stride * j, this._elementCount)); }
            if (hasUint32) { uint32BufferViews.push(new Uint32Array(buffer, this._stride * j, this._elementCount)); }
            if (j) { freeList.push(j); }
        }
        if (hasUint32) { this._uint32BufferViews.push(uint32BufferViews); }
        if (hasFloat32) { this._float32BufferViews.push(float32BufferViews); }
        this._freeLists.push(freeList);
        this._arrayBuffers.push(buffer);
        const handle = (i << this._entryBits) + this._poolFlag as unknown as IHandle<P>;
        return handle; // guarantees the handle is always not zero
    }

    public getBuffer (handle: IHandle<P>): BufferArrayType {
        const chunk = (this._chunkMask & handle as unknown as number) >> this._entryBits;
        const entry = this._entryMask & handle as unknown as number;
        const bufferViews = this._hasFloat32 ? this._float32BufferViews : this._uint32BufferViews;
        if (DEBUG && (!handle || chunk < 0 || chunk >= bufferViews.length
           || entry < 0 || entry >= this._entriesPerChunk || contains(this._freeLists[chunk], entry))) {
            console.warn('invalid buffer pool handle');
            return [] as unknown as BufferArrayType;
        }

        return bufferViews[chunk][entry];
    }

    public getTypedArray<K extends E[keyof E]> (handle: IHandle<P>, element: K): BufferArrayType {
        const chunk = (this._chunkMask & handle as unknown as number) >> this._entryBits;
        const entry = this._entryMask & handle as unknown as number;
        const bufferViews = this._dataType[element] === BufferDataType.UINT32 ? this._uint32BufferViews : this._float32BufferViews;
        if (DEBUG && (!handle || chunk < 0 || chunk >= bufferViews.length
             || entry < 0 || entry >= this._entriesPerChunk || contains(this._freeLists[chunk], entry))) {
            console.warn('invalid buffer pool handle');
            return [] as unknown as BufferArrayType;
        }
        const index = element as unknown as number;
        const view = bufferViews[chunk][entry];
        const count = this._dataMembers[element];

        return view.subarray(index, index + count);
    }

    public free (handle: IHandle<P>) {
        const chunk = (this._chunkMask & handle as unknown as number) >> this._entryBits;
        const entry = this._entryMask & handle as unknown as number;
        if (DEBUG && (!handle || chunk < 0 || chunk >= this._freeLists.length
             || entry < 0 || entry >= this._entriesPerChunk || contains(this._freeLists[chunk], entry))) {
            console.warn('invalid buffer pool handle');
            return;
        }
        const bufferViews = this._hasUint32 ? this._uint32BufferViews : this._float32BufferViews;
        bufferViews[chunk][entry].fill(0);
        this._freeLists[chunk].push(entry);
        // free
        if (this._freeLists[chunk].length === this._entriesPerChunk && this._freeLists.length > 1) {
            this._freeLists.splice(chunk, 1);
            this._arrayBuffers.splice(chunk, 1);
        }
    }
}

export enum BufferPoolType {
    // buffers
    NODE,
    PASS,
    AABB,
    DRAW_BATCH
}

export const NULL_HANDLE = 0 as unknown as IHandle<any>;

export type NodeBufferHandle = IHandle<BufferPoolType.NODE>;

export enum NodeView {
    DIRTY_FLAG,
    FLAGS_CHANGED,
    LAYER,
    WORLD_SCALE,        // Vec3
    WORLD_POSITION = 6, // Vec3
    WORLD_ROTATION = 9, // Quat
    WORLD_MATRIX = 13,  // Mat4
    LOCAL_SCALE = 29,   // Vec3
    LOCAL_POSITION = 32, // Vec3
    LOCAL_ROTATION = 35, // Quat
    COUNT = 39
}

const NodeViewDataType: BufferDataTypeManifest<typeof NodeView> = {
    [NodeView.DIRTY_FLAG]: BufferDataType.UINT32,
    [NodeView.FLAGS_CHANGED]: BufferDataType.UINT32,
    [NodeView.LAYER]: BufferDataType.UINT32,
    [NodeView.WORLD_SCALE]: BufferDataType.FLOAT32,
    [NodeView.WORLD_POSITION]: BufferDataType.FLOAT32,
    [NodeView.WORLD_ROTATION]: BufferDataType.FLOAT32,
    [NodeView.WORLD_MATRIX]: BufferDataType.FLOAT32,
    [NodeView.LOCAL_SCALE]: BufferDataType.FLOAT32,
    [NodeView.LOCAL_POSITION]: BufferDataType.FLOAT32,
    [NodeView.LOCAL_ROTATION]: BufferDataType.FLOAT32,
    [NodeView.COUNT]: BufferDataType.NEVER,
};

const NodeViewDataMembers: BufferDataMembersManifest<typeof NodeView> = {
    [NodeView.DIRTY_FLAG]: NodeView.FLAGS_CHANGED - NodeView.DIRTY_FLAG,
    [NodeView.FLAGS_CHANGED]: NodeView.LAYER - NodeView.FLAGS_CHANGED,
    [NodeView.LAYER]: NodeView.WORLD_SCALE - NodeView.LAYER,
    [NodeView.WORLD_SCALE]: NodeView.WORLD_POSITION - NodeView.WORLD_SCALE,
    [NodeView.WORLD_POSITION]: NodeView.WORLD_ROTATION - NodeView.WORLD_POSITION,
    [NodeView.WORLD_ROTATION]: NodeView.WORLD_MATRIX - NodeView.WORLD_ROTATION,
    [NodeView.WORLD_MATRIX]: NodeView.LOCAL_SCALE - NodeView.WORLD_MATRIX,
    [NodeView.LOCAL_SCALE]: NodeView.LOCAL_POSITION - NodeView.LOCAL_SCALE,
    [NodeView.LOCAL_POSITION]: NodeView.LOCAL_ROTATION - NodeView.LOCAL_POSITION,
    [NodeView.LOCAL_ROTATION]: NodeView.COUNT - NodeView.LOCAL_ROTATION,
    [NodeView.COUNT]: 1,
};

export const NodePool = new BufferPool<BufferPoolType.NODE, typeof NodeView>(BufferPoolType.NODE, NodeViewDataType, NodeViewDataMembers, NodeView, 4);

export type PassBufferHandle = IHandle<BufferPoolType.PASS>;

export enum PassView {
    PRIORITY,
    STAGE,
    PHASE,
    PRIMITIVE,
    BATCHING_SCHEME,
    DYNAMIC_STATE,
    HASH,
    ROOT_BUFFER_DIRTY,
    DESCRIPTOR_SET,
    BLEND_STATE,
    DEPTH_STENCIL_STATE,
    RASTERIZER_STATE,
    COUNT
}

const PassViewDataType: BufferDataTypeManifest<typeof PassView> = {
    [PassView.PRIORITY]: BufferDataType.UINT32,
    [PassView.STAGE]: BufferDataType.UINT32,
    [PassView.PHASE]: BufferDataType.UINT32,
    [PassView.PRIMITIVE]: BufferDataType.UINT32,
    [PassView.BATCHING_SCHEME]: BufferDataType.UINT32,
    [PassView.DYNAMIC_STATE]: BufferDataType.UINT32,
    [PassView.HASH]: BufferDataType.UINT32,
    [PassView.ROOT_BUFFER_DIRTY]: BufferDataType.UINT32,
    [PassView.DESCRIPTOR_SET]: BufferDataType.UINT32,
    [PassView.BLEND_STATE]: BufferDataType.UINT32,
    [PassView.DEPTH_STENCIL_STATE]: BufferDataType.UINT32,
    [PassView.RASTERIZER_STATE]: BufferDataType.UINT32,
    [PassView.COUNT]: BufferDataType.NEVER,
};

const PassViewDataMembers: BufferDataMembersManifest<typeof PassView> = {
    [PassView.PRIORITY]: PassView.STAGE - PassView.PRIORITY,
    [PassView.STAGE]: PassView.PHASE - PassView.STAGE,
    [PassView.PHASE]: PassView.PRIMITIVE - PassView.PHASE,
    [PassView.PRIMITIVE]: PassView.BATCHING_SCHEME - PassView.PRIMITIVE,
    [PassView.BATCHING_SCHEME]: PassView.DYNAMIC_STATE - PassView.BATCHING_SCHEME,
    [PassView.DYNAMIC_STATE]: PassView.HASH - PassView.DYNAMIC_STATE,
    [PassView.HASH]: PassView.ROOT_BUFFER_DIRTY - PassView.HASH,
    [PassView.ROOT_BUFFER_DIRTY]: PassView.DESCRIPTOR_SET - PassView.ROOT_BUFFER_DIRTY,
    [PassView.DESCRIPTOR_SET]: PassView.BLEND_STATE - PassView.DESCRIPTOR_SET,
    [PassView.BLEND_STATE]: PassView.DEPTH_STENCIL_STATE - PassView.BLEND_STATE,
    [PassView.DEPTH_STENCIL_STATE]: PassView.RASTERIZER_STATE - PassView.DEPTH_STENCIL_STATE,
    [PassView.RASTERIZER_STATE]: PassView.COUNT - PassView.RASTERIZER_STATE,
    [PassView.COUNT]: 1,
};

export const PassBufferPool = new BufferPool<BufferPoolType.PASS, typeof PassView>(BufferPoolType.PASS, PassViewDataType, PassViewDataMembers, PassView, 4);

export type AABBHandle = IHandle<BufferPoolType.AABB>;

export enum AABBView {
    CENTER, // Vec3
    HALFEXTENTS = 3, // Vec3
    COUNT = 6
}

const AABBViewDataType: BufferDataTypeManifest<typeof AABBView> = {
    [AABBView.CENTER]: BufferDataType.FLOAT32,
    [AABBView.HALFEXTENTS]: BufferDataType.FLOAT32,
    [AABBView.COUNT]: BufferDataType.NEVER,
};

const AABBViewDataMembers: BufferDataMembersManifest<typeof AABBView> = {
    [AABBView.CENTER]: AABBView.HALFEXTENTS - AABBView.CENTER,
    [AABBView.HALFEXTENTS]: AABBView.COUNT - AABBView.HALFEXTENTS,
    [AABBView.COUNT]: 1,
};

export const AABBPool = new BufferPool<BufferPoolType.AABB, typeof AABBView>(BufferPoolType.AABB, AABBViewDataType, AABBViewDataMembers, AABBView, 4);

export type DrawBatchBufferHandle = IHandle<BufferPoolType.DRAW_BATCH>;

export enum DrawBatchView {
    VIS_FLAGS,
    PASS_COUNT,
    DESCRIPTOR_SET,
    INPUT_ASSEMBLER,
    PASSES,
    SHADERS = 12,
    COUNT = 20
}

const DrawBatchViewDataType: BufferDataTypeManifest<typeof DrawBatchView> = {
    [DrawBatchView.VIS_FLAGS]: BufferDataType.UINT32,
    [DrawBatchView.PASS_COUNT]: BufferDataType.UINT32,
    [DrawBatchView.DESCRIPTOR_SET]: BufferDataType.UINT32,
    [DrawBatchView.INPUT_ASSEMBLER]: BufferDataType.UINT32,
    [DrawBatchView.PASSES]: BufferDataType.UINT32,
    [DrawBatchView.SHADERS]: BufferDataType.UINT32,
    [DrawBatchView.COUNT]: BufferDataType.NEVER,
};

const DrawBatchViewDataMembers: BufferDataMembersManifest<typeof DrawBatchView> = {
    [DrawBatchView.VIS_FLAGS]: DrawBatchView.PASS_COUNT - DrawBatchView.VIS_FLAGS,
    [DrawBatchView.PASS_COUNT]: DrawBatchView.DESCRIPTOR_SET - DrawBatchView.PASS_COUNT,
    [DrawBatchView.DESCRIPTOR_SET]: DrawBatchView.INPUT_ASSEMBLER - DrawBatchView.DESCRIPTOR_SET,
    [DrawBatchView.INPUT_ASSEMBLER]: DrawBatchView.PASSES - DrawBatchView.INPUT_ASSEMBLER,
    [DrawBatchView.PASSES]: DrawBatchView.SHADERS - DrawBatchView.PASSES,
    [DrawBatchView.SHADERS]: DrawBatchView.COUNT - DrawBatchView.SHADERS,
    [DrawBatchView.COUNT]: 1,
};

export const DrawBatchPool = new BufferPool<BufferPoolType.DRAW_BATCH, typeof DrawBatchView>(BufferPoolType.DRAW_BATCH, DrawBatchViewDataType, DrawBatchViewDataMembers, DrawBatchView, 4);

export enum ObjectPoolType {
    // buffers
    PASS,
    SHADER,
    INPUT_ASSEMBLER,
    DESCRIPTOR_SET,
    BLEND_STATE,
    DEPTH_STENCIL_STATE,
    RASTERIZER_STATE
}

interface IObjectPool<P extends ObjectPoolType> {
    free (obj: any): void;
}

// Object Pool
export class ObjectPool<T, P extends ObjectPoolType, A extends any[]> implements IObjectPool<P> {
    private _ctor: (args: A, obj?: T) => T;
    private _dtor?: (obj: T) => T | undefined;
    private _indexMask: number;
    private _poolFlag: number;
    private _array: (T | undefined)[] = [];
    private _handles: Map<T, IHandle<P>> = new Map<T, IHandle<P>>();
    private _freelist: number[] = [];

    private _nativePool: NativeObjectPool<T>;

    constructor (poolType: P, ctor: (args: A, obj?: T) => T, dtor?: (obj: T) => T | undefined) {
        this._ctor = ctor;
        if (dtor) { this._dtor = dtor; }
        this._poolFlag = 1 << 29;
        this._indexMask = ~this._poolFlag;
        this._nativePool = new NativeObjectPool(poolType, this._array);
    }

    public alloc (...args: A): T {
        const freelist = this._freelist;
        let i = -1;
        if (freelist.length) {
            i = freelist[freelist.length - 1];
            freelist.length--;
            this._array[i] = this._ctor(arguments as unknown as A, this._array[i]);
        } else {
            i = this._array.length;
            const obj = this._ctor(arguments as unknown as A);
            this._array.push(obj);
        }
        const handle = i + this._poolFlag as unknown as IHandle<P>;
        this._nativePool.bind(i, this._array[i] as T, handle);
        this._handles.set(this._array[i] as T, handle);
        return this._array[i] as T; // guarantees the handle is always not zero
    }

    public get<R extends T> (handle: IHandle<P>): R {
        const index = this._indexMask & handle as unknown as number;
        if (DEBUG && (!handle || index < 0 || index >= this._array.length || this._freelist.find((n) => n === index))) {
            console.warn('invalid object pool handle');
            return null!;
        }
        return this._array[index] as R;
    }

    public getHandle<R extends T> (obj: T): IHandle<P> {
        const handle = this._handles.get(obj);
        if (DEBUG && (!handle)) {
            console.warn('invalid object get pool handle');
            return 0 as unknown as IHandle<P>;
        }
        return handle as unknown as IHandle<P>;
    }

    public free (obj: T): void {
        const handle = this._handles.get(obj);
        this._handles.delete(obj);
        const index = this._indexMask & handle as unknown as number;
        if (DEBUG && (!handle || index < 0 || index >= this._array.length || this._freelist.find((n) => n === index))) {
            console.warn('invalid object pool handle');
            return;
        }
        if (this._dtor) { this._array[index] = this._dtor(this._array[index]!); }
        this._freelist.push(index);
    }
}

export const PassPool = new ObjectPool(ObjectPoolType.PASS,
    (args: [device: Device], obj?: NativePass) => (
        obj || new NativePass()),
    (obj: NativePass) => (obj));
export const ShaderPool = new ObjectPool(ObjectPoolType.SHADER,
    (args: [device: Device, info: ShaderInfo], obj?: Shader) => (
        obj ? (obj.initialize(args[1]), obj) : args[0].createShader(args[1])),
    (obj: Shader) => (obj && obj.destroy(), obj));
export const IAPool = new ObjectPool(ObjectPoolType.INPUT_ASSEMBLER,
    (args: [device: Device, info: InputAssemblerInfo], obj?: InputAssembler) => (
        obj ? (obj.initialize(args[1]), obj) : args[0].createInputAssembler(args[1])),
    (obj: InputAssembler) => (obj && obj.destroy(), obj));
export const DSPool = new ObjectPool(ObjectPoolType.DESCRIPTOR_SET,
    (args: [device: Device, info: DescriptorSetInfo], obj?: DescriptorSet) => (
        obj ? (obj.initialize(args[1]), obj) : args[0].createDescriptorSet(args[1])),
    (obj: DescriptorSet) => (obj && obj.destroy(), obj));

// only for native
export const BSPool = new ObjectPool(ObjectPoolType.BLEND_STATE,
    (args: [device: Device], obj?: NativeBlendState) => (
        obj || new NativeBlendState()),
    (obj: NativeBlendState) => (obj));
export const DSSPool = new ObjectPool(ObjectPoolType.DEPTH_STENCIL_STATE,
    (args: [device: Device], obj?: NativeDepthStencilState) => (
        obj || new NativeDepthStencilState()),
    (obj: NativeDepthStencilState) => (obj));
export const RSPool = new ObjectPool(ObjectPoolType.RASTERIZER_STATE,
    (args: [device: Device], obj?: NativeRasterizerState) => (
        obj || new NativeRasterizerState()),
    (obj: NativeRasterizerState) => (obj));
