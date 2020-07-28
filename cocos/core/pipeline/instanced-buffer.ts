/**
 * @hidden
 */

import { GFXBufferUsageBit, GFXMemoryUsageBit, GFXDevice } from '../gfx';
import { GFXBuffer } from '../gfx/buffer';
import { GFXInputAssembler, IGFXAttribute } from '../gfx/input-assembler';
import { IInstancedAttributeBlock, Pass, Light, LightType, IMacroPatch } from '../renderer';
import { SubModel, IPSOCreateInfo } from '../renderer/scene/submodel';
import { IRenderObject, UBOForwardLight } from './define';

export interface IInstancedItem {
    count: number;
    capacity: number;
    vb: GFXBuffer;
    data: Uint8Array;
    ia: GFXInputAssembler;
    stride: number;
}

const INITIAL_CAPACITY = 32;
const MAX_CAPACITY = 1024;

const spherePatches: IMacroPatch[] = [
    { name: 'CC_FORWARD_ADD', value: true },
];
const spotPatches: IMacroPatch[] = [
    { name: 'CC_FORWARD_ADD', value: true },
    { name: 'CC_SPOTLIGHT', value: true },
];

export class InstancedBuffer {

    private static _buffers = new Map<Pass, InstancedBuffer>();
    private static _lightBuffers = new Map<number, InstancedBuffer>();

    // references
    private _validLights: Light[] = [];
    private _lightBuffers: GFXBuffer[] = [];

    public static get (pass: Pass) {
        if (!InstancedBuffer._buffers.has(pass)) {
            InstancedBuffer._buffers.set(pass, new InstancedBuffer(pass.device));
        }
        return InstancedBuffer._buffers.get(pass)!;
    }

    public static getLightInstanced (pass: Pass, index: number) {
        if (!InstancedBuffer._lightBuffers.has(index)) {
            InstancedBuffer._lightBuffers.set(index, new InstancedBuffer(pass.device));
        }
        return InstancedBuffer._lightBuffers.get(index)!;
    }

    public instances: IInstancedItem[] = [];
    public psoci: IPSOCreateInfo | null = null;
    private _device: GFXDevice;

    constructor (device: GFXDevice) {
        this._device = device;
    }

    public destroy () {
        for (let i = 0; i < this.instances.length; ++i) {
            const instance = this.instances[i];
            instance.vb.destroy();
            instance.ia.destroy();
        }
        this.instances.length = 0;
    }

    public merge (renderObj: IRenderObject, subModelIdx: number, attrs: IInstancedAttributeBlock, pass: Pass, lightIdx: number) {
        const modelPatches = renderObj.model.getMacroPatches(subModelIdx);
        const subModel = renderObj.model.subModelNum[subModelIdx];
        const light = this._validLights[lightIdx];
        const lightBuffer = this._lightBuffers[lightIdx];
        let fullPatches: IMacroPatch[];
        switch (light.type) {
            case LightType.SPHERE:
                fullPatches = modelPatches ? spherePatches.concat(modelPatches) : spherePatches;
                if (!this.psoci) {
                    this.psoci = pass.createPipelineStateCI(fullPatches)!;
                    renderObj.model.updateLocalBindings(this.psoci, subModelIdx);
                    this.psoci.bindingLayout.bindBuffer(UBOForwardLight.BLOCK.binding, lightBuffer);
                    this.psoci.bindingLayout.update();
                }
                break;
            case LightType.SPOT:
                fullPatches = modelPatches ? spotPatches.concat(modelPatches) : spotPatches;
                if (!this.psoci) {
                    this.psoci = pass.createPipelineStateCI(fullPatches)!;
                    renderObj.model.updateLocalBindings(this.psoci, subModelIdx);
                    this.psoci.bindingLayout.bindBuffer(UBOForwardLight.BLOCK.binding, lightBuffer);
                    this.psoci.bindingLayout.update();
                }
                break;
        }
        this.attach(subModel, attrs, this.psoci!);
    }

    public attach (subModel: SubModel, attrs: IInstancedAttributeBlock, psoci: IPSOCreateInfo) {
        const stride = attrs.buffer.length;
        if (!stride) { return; } // we assume per-instance attributes are always present
        if (!this.psoci) { this.psoci = psoci; }
        const sourceIA = subModel.inputAssembler!;
        for (let i = 0; i < this.instances.length; ++i) {
            const instance = this.instances[i];
            if (instance.ia.indexBuffer !== sourceIA.indexBuffer || instance.count >= MAX_CAPACITY) { continue; }
            if (instance.stride !== stride) {
                // console.error(`instanced buffer stride mismatch! ${stride}/${instance.stride}`);
                return;
            }
            if (instance.count >= instance.capacity) { // resize buffers
                instance.capacity <<= 1;
                const newSize = instance.stride * instance.capacity;
                const oldData = instance.data;
                instance.data = new Uint8Array(newSize);
                instance.data.set(oldData);
                instance.vb.resize(newSize);
            }
            instance.data.set(attrs.buffer, instance.stride * instance.count++);
            return;
        }

        // Create a new instance
        const vb = this._device.createBuffer({
            usage: GFXBufferUsageBit.VERTEX | GFXBufferUsageBit.TRANSFER_DST,
            memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            size: stride * INITIAL_CAPACITY, stride,
        });
        const data = new Uint8Array(stride * INITIAL_CAPACITY);
        const vertexBuffers = sourceIA.vertexBuffers.slice();
        const attributes = sourceIA.attributes.slice();
        const indexBuffer = sourceIA.indexBuffer || undefined;

        for (let i = 0; i < attrs.list.length; i++) {
            const attr = attrs.list[i];
            const newAttr: IGFXAttribute = {
                name: attr.name,
                format: attr.format,
                stream: vertexBuffers.length,
                isInstanced: true,
            };
            if (attr.isNormalized !== undefined) { newAttr.isNormalized = attr.isNormalized; }
            attributes.push(newAttr);
        }
        data.set(attrs.buffer);

        vertexBuffers.push(vb);
        const ia = this._device.createInputAssembler({ attributes, vertexBuffers, indexBuffer });
        this.instances.push({ count: 1, capacity: INITIAL_CAPACITY, vb, data, ia, stride });
    }

    public uploadBuffers () {
        for (let i = 0; i < this.instances.length; ++i) {
            const instance = this.instances[i];
            if (!instance.count) { continue; }
            instance.ia.instanceCount = instance.count;
            instance.vb.update(instance.data);
        }
    }

    public clearLightInstanced (validLights: Light[], lightBuffers: GFXBuffer[]) {
        this._validLights = validLights;
        this._lightBuffers = lightBuffers;
        this.clear();
    }

    public clear () {
        for (let i = 0; i < this.instances.length; ++i) {
            const instance = this.instances[i];
            instance.count = 0;
        }
        this.psoci = null;
    }
}
