/*
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
 * @hidden
 */

export class NativeBufferPool {
    private _arrayBuffers: ArrayBuffer[] = [];
    private _chunkSize: number;
    constructor (dataType: number, entryBits: number, stride: number) {
        this._chunkSize = stride * (1 << entryBits);
    }
    public allocateNewChunk () { return new ArrayBuffer(this._chunkSize); }
}

export class NativeObjectPool<T> {
    constructor (dataType: number, array: T[]) {}
    public bind (index: number, obj: T, handle: any) {}
}

export class NativeBufferAllocator {
    constructor (poolType: number) {}
    public alloc (index: number, bytes: number) { return new ArrayBuffer(bytes); }
    public free (index: number) {}
}

export const NativeBlendState: Constructor<{
}> = null!;
export type NativeBlendState = InstanceType<typeof NativeBlendState>;

export const NativeDepthStencilState: Constructor<{
}> = null!;
export type NativeDepthStencilState = InstanceType<typeof NativeDepthStencilState>;

export const NativeRasterizerState: Constructor<{
}> = null!;
export type NativeRasterizerState = InstanceType<typeof NativeRasterizerState>;
