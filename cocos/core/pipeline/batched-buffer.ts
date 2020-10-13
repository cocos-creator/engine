/**
 * @packageDocumentation
 * @hidden
 */

import { GFXBufferUsageBit, GFXFormat, GFXMemoryUsageBit, GFXDevice, GFXDescriptorSet, GFXInputAssembler, GFXInputAssemblerInfo, GFXAttribute, GFXBuffer, GFXBufferInfo } from '../gfx';
import { Mat4 } from '../math';
import { SubModel } from '../renderer/scene/submodel';
import { IRenderObject, UBOLocalBatched } from './define';
import { Pass } from '../renderer';
import { SubModelPool, SubModelView, PassHandle, ShaderHandle } from '../renderer/core/memory-pools';

export interface IBatchedItem {
    vbs: GFXBuffer[];
    vbDatas: Uint8Array[];
    vbIdx: GFXBuffer;
    vbIdxData: Float32Array;
    vbCount: number;
    mergeCount: number;
    ia: GFXInputAssembler;
    ubo: GFXBuffer;
    uboData: Float32Array;
    descriptorSet: GFXDescriptorSet;
    hPass: PassHandle;
    hShader: ShaderHandle;
}

export class BatchedBuffer {

    private static _buffers = new Map<Pass, Record<number, BatchedBuffer>>();

    public static get (pass: Pass, extraKey = 0) {
        const buffers = BatchedBuffer._buffers;
        if (!buffers.has(pass)) buffers.set(pass, {});
        const record = buffers.get(pass)!;
        return record[extraKey] || (record[extraKey] = new BatchedBuffer(pass));
    }

    public batches: IBatchedItem[] = [];
    public dynamicOffsets: number[] = [];
    private _device: GFXDevice;

    constructor (pass: Pass) {
        this._device = pass.device;
    }

    public destroy () {
        for (let i = 0; i < this.batches.length; ++i) {
            const batch = this.batches[i];
            for (let j = 0; j < batch.vbs.length; ++j) {
                batch.vbs[j].destroy();
            }
            batch.vbIdx.destroy();
            batch.ia.destroy();
            batch.ubo.destroy();
        }
        this.batches.length = 0;
    }

    public merge (subModel: SubModel, passIdx: number, ro: IRenderObject) {
        const flatBuffers = subModel.subMesh.flatBuffers;
        if (flatBuffers.length === 0) { return; }
        let vbSize = 0;
        let vbIdxSize = 0;
        const vbCount = flatBuffers[0].count;
        const hPass = SubModelPool.get(subModel.handle, SubModelView.PASS_0 + passIdx) as PassHandle;
        const hShader = SubModelPool.get(subModel.handle, SubModelView.SHADER_0 + passIdx) as ShaderHandle;
        const descriptorSet = subModel.descriptorSet;
        let isBatchExist = false;
        for (let i = 0; i < this.batches.length; ++i) {
            const batch = this.batches[i];
            if (batch.vbs.length === flatBuffers.length && batch.mergeCount < UBOLocalBatched.BATCHING_COUNT) {
                isBatchExist = true;
                for (let j = 0; j < batch.vbs.length; ++j) {
                    const vb = batch.vbs[j];
                    if (vb.stride !== flatBuffers[j].stride) {
                        isBatchExist = false;
                        break;
                    }
                }

                if (isBatchExist) {
                    for (let j = 0; j < batch.vbs.length; ++j) {
                        const flatBuff = flatBuffers[j];
                        const batchVB = batch.vbs[j];
                        const vbBuf = batch.vbDatas[j];
                        vbSize = (vbCount + batch.vbCount) * flatBuff.stride;
                        if (vbSize > batchVB.size) {
                            batchVB.resize(vbSize);
                            batch.vbDatas[j] = new Uint8Array(vbSize);
                            batch.vbDatas[j].set(vbBuf);
                        }
                        batch.vbDatas[j].set(flatBuff.buffer, batch.vbCount * flatBuff.stride);
                    }

                    let vbIdxBuf = batch.vbIdxData;
                    vbIdxSize = (vbCount + batch.vbCount) * 4;
                    if (vbIdxSize > batch.vbIdx.size) {
                        batch.vbIdx.resize(vbIdxSize);
                        batch.vbIdxData = new Float32Array(vbIdxSize / Float32Array.BYTES_PER_ELEMENT);
                        batch.vbIdxData.set(vbIdxBuf);
                        vbIdxBuf = batch.vbIdxData;
                    }

                    const start = batch.vbCount;
                    const end = start + vbCount;
                    const mergeCount = batch.mergeCount;
                    if (vbIdxBuf[start] !== mergeCount || vbIdxBuf[end - 1] !== mergeCount) {
                        for (let j = start; j < end; j++) {
                            vbIdxBuf[j] = mergeCount + 0.1; // guard against underflow
                        }
                    }

                    // update world matrix
                    Mat4.toArray(batch.uboData, ro.model.transform.worldMatrix, UBOLocalBatched.MAT_WORLDS_OFFSET + batch.mergeCount * 16);
                    if (!batch.mergeCount) {
                        descriptorSet.bindBuffer(UBOLocalBatched.BINDING, batch.ubo);
                        descriptorSet.update();
                        batch.hPass = hPass;
                        batch.hShader = hShader;
                        batch.descriptorSet = descriptorSet;
                    }

                    ++batch.mergeCount;
                    batch.vbCount += vbCount;
                    batch.ia.vertexCount += vbCount;

                    return;
                }
            }
        }

        // Create a new batch
        const vbs: GFXBuffer[] = [];
        const vbDatas: Uint8Array[] = [];
        const totalVBs: GFXBuffer[] = [];
        for (let i = 0; i < flatBuffers.length; ++i) {
            const flatBuff = flatBuffers[i];
            const newVB = this._device.createBuffer(new GFXBufferInfo(
                GFXBufferUsageBit.VERTEX | GFXBufferUsageBit.TRANSFER_DST,
                GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                flatBuff.count * flatBuff.stride,
                flatBuff.stride,
            ));
            newVB.update(flatBuff.buffer.buffer);
            vbs.push(newVB);
            vbDatas.push(new Uint8Array(newVB.size));
            totalVBs.push(newVB);
        }

        const vbIdx = this._device.createBuffer(new GFXBufferInfo(
            GFXBufferUsageBit.VERTEX | GFXBufferUsageBit.TRANSFER_DST,
            GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            vbCount * 4,
            4,
        ));
        const vbIdxData = new Float32Array(vbCount);
        vbIdxData.fill(0);
        vbIdx.update(vbIdxData);
        totalVBs.push(vbIdx);

        const attributes = subModel.inputAssembler!.attributes;
        const attrs = new Array<GFXAttribute>(attributes.length + 1);
        for (let a = 0; a < attributes.length; ++a) {
            attrs[a] = attributes[a];
        }
        attrs[attributes.length] = new GFXAttribute('a_dyn_batch_id', GFXFormat.R32F, false, flatBuffers.length);

        const iaInfo = new GFXInputAssemblerInfo(attrs, totalVBs);
        const ia = this._device.createInputAssembler(iaInfo);

        const ubo = this._device.createBuffer(new GFXBufferInfo(
            GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
            GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            UBOLocalBatched.SIZE,
            UBOLocalBatched.SIZE,
        ));

        descriptorSet.bindBuffer(UBOLocalBatched.BINDING, ubo);
        descriptorSet.update();

        const uboData = new Float32Array(UBOLocalBatched.COUNT);
        Mat4.toArray(uboData, ro.model.transform.worldMatrix, UBOLocalBatched.MAT_WORLDS_OFFSET);

        this.batches.push({
            mergeCount: 1,
            vbs, vbDatas, vbIdx, vbIdxData, vbCount, ia, ubo, uboData, hPass, hShader, descriptorSet,
        });
    }

    public clear () {
        for (let i = 0; i < this.batches.length; ++i) {
            const batch = this.batches[i];
            batch.vbCount = 0;
            batch.mergeCount = 0;
            batch.ia.vertexCount = 0;
        }
    }
}
