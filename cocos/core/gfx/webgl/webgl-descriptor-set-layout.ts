import { GFXDescriptorSetLayout, IGFXDescriptorSetLayoutInfo, DESCRIPTOR_DYNAMIC_TYPE } from '../descriptor-set-layout';
import { IWebGLGPUDescriptorSetLayout } from './webgl-gpu-objects';

export class WebGLDescriptorSetLayout extends GFXDescriptorSetLayout {

    get gpuDescriptorSetLayout () { return this._gpuDescriptorSetLayout!; }

    private _gpuDescriptorSetLayout: IWebGLGPUDescriptorSetLayout | null = null;

    public initialize (info: IGFXDescriptorSetLayoutInfo) {
        Array.prototype.push.apply(this._bindings, info.bindings);

        const dynamicBindings: number[] = [];
        for (let i = 0; i < this._bindings.length; i++) {
            const binding = this._bindings[i];
            if (binding.descriptorType & DESCRIPTOR_DYNAMIC_TYPE) {
                for (let j = 0; j < binding.count; j++) {
                    dynamicBindings.push(i);
                }
            }
        }

        this._gpuDescriptorSetLayout = {
            bindings: this._bindings,
            dynamicBindings,
        };

        return true;
    }

    public destroy () {
        this._bindings.length = 0;
    }
}
