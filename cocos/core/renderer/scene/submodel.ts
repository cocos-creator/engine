import { RenderingSubMesh } from '../../assets/mesh';
import { RenderPriority } from '../../pipeline/define';
import { BatchingSchemes, IMacroPatch, Pass } from '../core/pass';
import { DSPool, IAPool, SubModelPool, SubModelView, SubModelHandle, NULL_HANDLE, SubMeshPool } from '../core/memory-pools';
import { DescriptorSet, DescriptorSetInfo, Device, InputAssembler } from '../../gfx';
import { legacyCC } from '../../global-exports';

const _dsInfo = new DescriptorSetInfo(null!);

export class SubModel {
    protected _device: Device | null = null;
    protected _passes: Pass[] | null = null;
    protected _subMesh: RenderingSubMesh | null = null;
    protected _patches: IMacroPatch[] | null = null;
    protected _handle: SubModelHandle = NULL_HANDLE;
    protected _priority: RenderPriority = RenderPriority.DEFAULT;
    protected _inputAssembler: InputAssembler | null = null;
    protected _descriptorSet: DescriptorSet | null = null;

    set passes (passes) {
        this._passes = passes;
        this._flushPassInfo();

        // DS layout might change too
        if (this._descriptorSet) {
            DSPool.free(SubModelPool.get(this._handle, SubModelView.DESCRIPTOR_SET));
            _dsInfo.layout = passes[0].localSetLayout;
            const dsHandle = DSPool.alloc(this._device!, _dsInfo);
            SubModelPool.set(this._handle, SubModelView.DESCRIPTOR_SET, dsHandle);
            this._descriptorSet = DSPool.get(dsHandle);
        }
    }

    get passes () {
        return this._passes!;
    }

    set subMesh (subMesh) {
        this._subMesh = subMesh;
        this._inputAssembler!.destroy();
        this._inputAssembler!.initialize(subMesh.iaInfo);
        if(this._passes![0].batchingScheme === BatchingSchemes.VB_MERGING) this._subMesh.genFlatBuffers();
        SubModelPool.set(this._handle, SubModelView.SUB_MESH, subMesh.handle);
    }

    get subMesh () {
        return this._subMesh!;
    }

    set priority (val) {
        this._priority = val;
        SubModelPool.set(this._handle, SubModelView.PRIORITY, val);
    }

    get priority () {
        return this._priority;
    }

    get handle () {
        return this._handle;
    }

    get inputAssembler () {
        return this._inputAssembler!;
    }

    get descriptorSet () {
        return this._descriptorSet!;
    }

    get patches () {
        return this._patches;
    }

    public initialize (subMesh: RenderingSubMesh, passes: Pass[], patches: IMacroPatch[] | null = null) {
        this._device = legacyCC.director.root.device as Device;

        this._subMesh = subMesh;
        this._patches = patches;
        this._passes = passes;

        this._handle = SubModelPool.alloc();
        this._flushPassInfo();
        if(passes[0].batchingScheme === BatchingSchemes.VB_MERGING) this._subMesh.genFlatBuffers();

        _dsInfo.layout = passes[0].localSetLayout;
        const dsHandle = DSPool.alloc(this._device, _dsInfo);
        const iaHandle = IAPool.alloc(this._device, subMesh.iaInfo);
        SubModelPool.set(this._handle, SubModelView.PRIORITY, RenderPriority.DEFAULT);
        SubModelPool.set(this._handle, SubModelView.INPUT_ASSEMBLER, iaHandle);
        SubModelPool.set(this._handle, SubModelView.DESCRIPTOR_SET, dsHandle);
        SubModelPool.set(this._handle, SubModelView.SUB_MESH, subMesh.handle);

        this._inputAssembler = IAPool.get(iaHandle);
        this._descriptorSet = DSPool.get(dsHandle);
    }

    public destroy () {
        DSPool.free(SubModelPool.get(this._handle, SubModelView.DESCRIPTOR_SET));
        IAPool.free(SubModelPool.get(this._handle, SubModelView.INPUT_ASSEMBLER));
        SubMeshPool.free(SubModelPool.get(this._handle, SubModelView.SUB_MESH));
        SubModelPool.free(this._handle);

        this._descriptorSet = null;
        this._inputAssembler = null;
        this._priority = RenderPriority.DEFAULT;
        this._handle = NULL_HANDLE;

        this._patches = null;
        this._subMesh = null;
        this._passes = null;
    }

    public update () {
        for (let i = 0; i < this._passes!.length; ++i) {
            const pass = this._passes![i];
            pass.update();
        }
        this._descriptorSet!.update();
    }

    public onPipelineStateChanged () {
        const passes = this._passes;
        if (!passes) { return; }

        for (let i = 0; i < passes.length; i++) {
            const pass = passes[i];
            pass.beginChangeStatesSilently();
            pass.tryCompile(); // force update shaders
            pass.endChangeStatesSilently();
        }

        this._flushPassInfo();
    }

    public onMacroPatchesStateChanged (patches) {
        this._patches = patches;

        const passes = this._passes;
        if (!passes) { return; }

        for (let i = 0; i < passes.length; i++) {
            const pass = passes[i];
            pass.beginChangeStatesSilently();
            pass.tryCompile(); // force update shaders
            pass.endChangeStatesSilently();
        }

        this._flushPassInfo();
    }

    protected _flushPassInfo () {
        const passes = this._passes;
        if (!passes) { return; }

        SubModelPool.set(this._handle, SubModelView.PASS_COUNT, passes.length);
        let passOffset = SubModelView.PASS_0 as const;
        let shaderOffset = SubModelView.SHADER_0 as const;
        for (let i = 0; i < passes.length; i++, passOffset++, shaderOffset++) {
            SubModelPool.set(this._handle, passOffset, passes[i].handle);
            SubModelPool.set(this._handle, shaderOffset, passes[i].getShaderVariant(this._patches));
        }
    }
}
