/**
 * @category gfx
 */

import { GFXBuffer } from './buffer';
import { GFXBindingType, GFXObject, GFXObjectType } from './define';
import { GFXDevice } from './device';
import { GFXSampler } from './sampler';
import { GFXTextureView } from './texture-view';

export interface IGFXBinding {
    binding: number;
    bindingType: GFXBindingType;
    name: string;
}

export interface IGFXBindingLayoutInfo {
    bindings: IGFXBinding[];
}

export class GFXBindingUnit {
    public binding: number = 0;
    public type: GFXBindingType = GFXBindingType.UNKNOWN;
    public name: string = '';
    public buffer: GFXBuffer | null = null;
    public texView: GFXTextureView | null = null;
    public sampler: GFXSampler | null = null;
}

/**
 * @en GFX binding layout.
 * @zh GFX 绑定布局。
 */
export abstract class GFXBindingLayout extends GFXObject {

    protected _device: GFXDevice;

    protected _bindingUnits: GFXBindingUnit[] = [];

    protected _isDirty = false;

    constructor (device: GFXDevice) {
        super(GFXObjectType.BINDING_LAYOUT);
        this._device = device;
    }

    public abstract initialize (info: IGFXBindingLayoutInfo): boolean;

    public abstract destroy (): void;

    public abstract update (): void;

    /**
     * @en Bind buffer to the specified binding unit.
     * @zh 在指定的 binding 位置上绑定缓冲。
     * @param binding The target binding.
     * @param buffer The buffer to be bound.
     */
    public bindBuffer (binding: number, buffer: GFXBuffer) {
        for (const bindingUnit of this._bindingUnits) {
            if (bindingUnit.binding === binding) {
                if (bindingUnit.type === GFXBindingType.UNIFORM_BUFFER) {
                    if (bindingUnit.buffer !== buffer) {
                        bindingUnit.buffer = buffer;
                        this._isDirty = true;
                    }
                } else {
                    console.error('Setting binding is not GFXBindingType.UNIFORM_BUFFER.');
                }
                return;
            }
        }
    }

    /**
     * @en Bind sampler to the specified binding unit.
     * @zh 在指定的 binding 位置上绑定采样器。
     * @param binding The target binding.
     * @param sampler The sampler to be bound.
     */
    public bindSampler (binding: number, sampler: GFXSampler) {
        for (const bindingUnit of this._bindingUnits) {
            if (bindingUnit.binding === binding) {
                if (bindingUnit.type === GFXBindingType.SAMPLER) {
                    if (bindingUnit.sampler !== sampler) {
                        bindingUnit.sampler = sampler;
                        this._isDirty = true;
                    }
                } else {
                    console.error('Setting binding is not GFXBindingType.SAMPLER.');
                }
                return;
            }
        }
    }

    /**
     * @en Bind texture view to the specified binding unit.
     * @zh 在指定的 binding 位置上绑定纹理视图。
     * @param binding The target binding.
     * @param texView The texture view to be bound.
     */
    public bindTextureView (binding: number, texView: GFXTextureView) {
        for (const bindingUnit of this._bindingUnits) {
            if (bindingUnit.binding === binding) {
                if (bindingUnit.type === GFXBindingType.SAMPLER) {
                    if (bindingUnit.texView !== texView) {
                        bindingUnit.texView = texView;
                        this._isDirty = true;
                    }
                } else {
                    console.error('Setting binding is not GFXBindingType.SAMPLER.');
                }
                return;
            }
        }
    }

    /**
     * @en Get the specified binding unit.
     * @zh 得到指定的 binding 位置上的GFX绑定单元。
     * @param binding The target binding.
     */
    public getBindingUnit (binding: number): GFXBindingUnit | null {
        for (const unit of this._bindingUnits) {
            if (unit.binding === binding) {
                return unit;
            }
        }
        return null;
    }
}
