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
 * @module ui
 */
import { EDITOR } from 'internal:constants';
import { ccclass, executeInEditMode, requireComponent, disallowMultiple, tooltip,
    type, displayOrder, serializable, override, visible, displayName } from 'cc.decorator';
import { Color } from '../../core/math';
import { ccenum } from '../../core/value-types/enum';
import { builtinResMgr } from '../../core/builtin';
import { Material } from '../../core/assets';
import { BlendFactor, BlendState, BlendTarget } from '../../core/gfx';
import { IMaterialInstanceInfo } from '../../core/renderer/core/material-instance';
import { IAssembler, IAssemblerManager } from '../renderer/base';
import { RenderData } from '../renderer/render-data';
import { Batcher2D } from '../renderer/batcher-2d';
import { Node } from '../../core/scene-graph';
import { TransformBit } from '../../core/scene-graph/node-enum';
import { UITransform } from './ui-transform';
import { RenderableComponent } from '../../core/components/renderable-component';
import { Stage } from '../renderer/stencil-manager';
import { warnID } from '../../core/platform/debug';
import { legacyCC } from '../../core/global-exports';
import { NodeEventType } from '../../core/scene-graph/node-event';

// hack
ccenum(BlendFactor);

/**
 * @en
 * The shader property type of the material after instantiation.
 *
 * @zh
 * 实例后的材质的着色器属性类型。
 */
export enum InstanceMaterialType {
    /**
     * @en
     * The shader only has color properties.
     *
     * @zh
     * 着色器只带颜色属性。
     */
    ADD_COLOR = 0,

    /**
     * @en
     * The shader has color and texture properties.
     *
     * @zh
     * 着色器带颜色和贴图属性。
     */
    ADD_COLOR_AND_TEXTURE = 1,

    /**
     * @en
     * The shader has color and texture properties and uses grayscale mode.
     *
     * @zh
     * 着色器带颜色和贴图属性,并使用灰度模式。
     */
    GRAYSCALE = 2,

    /**
     * @en
     * The shader has color and texture properties and uses embedded alpha mode.
     *
     * @zh
     * 着色器带颜色和贴图属性,并使用透明通道分离贴图。
     */
    USE_ALPHA_SEPARATED = 3,

    /**
     * @en
     * The shader has color and texture properties and uses embedded alpha and grayscale mode.
     *
     * @zh
     * 着色器带颜色和贴图属性,并使用灰度模式。
     */
    USE_ALPHA_SEPARATED_AND_GRAY = 4,
}

const _matInsInfo: IMaterialInstanceInfo = {
    parent: null!,
    owner: null!,
    subModelIdx: 0,
};

/**
 * @en Base class for 2D components which supports rendering features.
 * This component will setup [[NodeUIProperties.uiComp]] in its owner [[Node]]
 *
 * @zh 所有支持渲染的 2D 组件的基类。
 * 这个组件会设置 [[Node]] 上的 [[NodeUIProperties.uiComp]]。
 */
@ccclass('cc.Renderable2D')
@requireComponent(UITransform)
@disallowMultiple
@executeInEditMode
export class Renderable2D extends RenderableComponent {
    @override
    protected _materials: (Material | null)[] = [];

    @override
    @visible(false)
    get sharedMaterials () {
        // if we don't create an array copy, the editor will modify the original array directly.
        return EDITOR && this._materials.slice() || this._materials;
    }

    set sharedMaterials (val) {
        for (let i = 0; i < val.length; i++) {
            if (val[i] !== this._materials[i]) {
                this.setMaterial(val[i], i);
            }
        }
        if (val.length < this._materials.length) {
            for (let i = val.length; i < this._materials.length; i++) {
                this.setMaterial(null, i);
            }
            this._materials.splice(val.length);
        }
    }

    @type(Material)
    protected _customMaterial: Material| null = null;

    /**
     * @en The customMaterial
     * @zh 用户自定材质
     */
    @type(Material)
    @displayOrder(0)
    @displayName('CustomMaterial')
    get customMaterial () {
        return this._customMaterial;
    }

    set customMaterial (val) {
        this._customMaterial = val;
        this.updateMaterial();
    }

    protected updateMaterial () {
        if (this._customMaterial) {
            this.setMaterial(this._customMaterial, 0);
            this._blendHash = -1; // a flag to check merge
            return;
        }
        const mat = this._updateBuiltinMaterial();
        this.setMaterial(mat, 0);
        this._updateBlendFunc();
    }

    /**
     * @en Specifies the source blend mode, it will clone a new material object.
     * @zh 指定源的混合模式，这会克隆一个新的材质对象，注意这带来的性能和内存损耗。
     * @example
     * ```ts
     * sprite.srcBlendFactor = BlendFactor.ONE;
     * ```
     * @deprecated
     */
    get srcBlendFactor () {
        if (!EDITOR && this._customMaterial) {
            warnID(12001);
        }
        return this._srcBlendFactor;
    }

    set srcBlendFactor (value: BlendFactor) {
        if (this._customMaterial) {
            warnID(12001);
            return;
        }
        if (this._srcBlendFactor === value) {
            return;
        }

        this._srcBlendFactor = value;
        this._updateBlendFunc();
    }

    /**
     * @en Specifies the destination blend mode.
     * @zh 指定目标的混合模式，这会克隆一个新的材质对象，注意这带来的性能和内存损耗。
     * @example
     * ```ts
     * sprite.dstBlendFactor = BlendFactor.ONE_MINUS_SRC_ALPHA;
     * ```
     * @deprecated
     */
    get dstBlendFactor () {
        if (!EDITOR && this._customMaterial) {
            warnID(12001);
        }
        return this._dstBlendFactor;
    }

    set dstBlendFactor (value: BlendFactor) {
        if (this._customMaterial) {
            warnID(12001);
            return;
        }
        if (this._dstBlendFactor === value) {
            return;
        }

        this._dstBlendFactor = value;
        this._updateBlendFunc();
    }

    /**
     * @en Main color for rendering, it normally multiplies with texture color.
     * @zh 渲染颜色，一般情况下会和贴图颜色相乘。
     */
    @displayOrder(2)
    @tooltip('i18n:renderable2D.color')
    get color (): Readonly<Color> {
        return this._color;
    }

    set color (value) {
        if (this._color.equals(value)) {
            return;
        }

        this._color.set(value);
        this._colorDirty = true;
        if (EDITOR) {
            const clone = value.clone();
            this.node.emit(NodeEventType.COLOR_CHANGED, clone);
        }
    }

    get renderData () {
        return this._renderData;
    }

    // Render data can be submitted even if it is not on the node tree
    set delegateSrc (value: Node) {
        this._delegateSrc = value;
    }

    /**
     * @en The component stencil stage (please do not any modification directly on this object)
     * @zh 组件模板缓冲状态 (注意：请不要直接修改它的值)
     */
    public stencilStage : Stage = Stage.DISABLED;

    /**
     * @en The blend factor enums
     * @zh 混合模式枚举类型
     * @see [[BlendFactor]]
     */
    public static BlendState = BlendFactor;
    /**
     * @en The render data assembler
     * @zh 渲染数据组装器
     */
    public static Assembler: IAssemblerManager | null = null;
    /**
     * @en The post render data assembler
     * @zh 后置渲染数据组装器
     */
    public static PostAssembler: IAssemblerManager | null = null;

    @serializable
    protected _srcBlendFactor = BlendFactor.SRC_ALPHA;
    @serializable
    protected _dstBlendFactor = BlendFactor.ONE_MINUS_SRC_ALPHA;
    @serializable
    protected _color: Color = Color.WHITE.clone();

    protected _assembler: IAssembler | null = null;
    protected _postAssembler: IAssembler | null = null;
    protected _renderData: RenderData | null = null;
    protected _renderDataFlag = true;
    protected _renderFlag = true;
    // 特殊渲染节点，给一些不在节点树上的组件做依赖渲染（例如 mask 组件内置两个 graphics 来渲染）
    protected _delegateSrc: Node | null = null;
    protected _instanceMaterialType = InstanceMaterialType.ADD_COLOR_AND_TEXTURE;
    protected _blendState: BlendState = new BlendState();
    protected _blendHash = 0;

    protected _colorDirty = true;
    protected _cacheAlpha = 1;

    get blendHash () {
        return this._blendHash;
    }

    public updateBlendHash () {
        const dst = this._blendState.targets[0].blendDst << 4;
        this._blendHash = dst | this._blendState.targets[0].blendSrc;
    }

    protected _lastParent: Node | null = null;

    public __preload () {
        this.node._uiProps.uiComp = this;
        if (this._flushAssembler) {
            this._flushAssembler();
        }
    }

    public onEnable () {
        this.node.on(NodeEventType.ANCHOR_CHANGED, this._nodeStateChange, this);
        this.node.on(NodeEventType.SIZE_CHANGED, this._nodeStateChange, this);
        this.updateMaterial();
        this._renderFlag = this._canRender();
    }

    // For Redo, Undo
    public onRestore () {
        this.updateMaterial();
        this._renderFlag = this._canRender();
    }

    public onDisable () {
        this.node.off(NodeEventType.ANCHOR_CHANGED, this._nodeStateChange, this);
        this.node.off(NodeEventType.SIZE_CHANGED, this._nodeStateChange, this);
        this._renderFlag = false;
    }

    public onDestroy () {
        if (this.node._uiProps.uiComp === this) {
            this.node._uiProps.uiComp = null;
        }
        this.destroyRenderData();
        if (this._materialInstances) {
            for (let i = 0; i < this._materialInstances.length; i++) {
                this._materialInstances[i] && this._materialInstances[i]!.destroy();
            }
        }
        this._renderData = null;
        if (this._blendState) {
            this._blendState.destroy();
        }
    }

    /**
     * @en Marks the render data of the current component as modified so that the render data is recalculated.
     * @zh 标记当前组件的渲染数据为已修改状态，这样渲染数据才会重新计算。
     * @param enable Marked necessary to update or not
     */
    public markForUpdateRenderData (enable = true) {
        this._renderFlag = this._canRender();
        if (enable && this._renderFlag) {
            const renderData = this._renderData;
            if (renderData) {
                renderData.vertDirty = true;
            }

            this._renderDataFlag = enable;
        } else if (!enable) {
            this._renderDataFlag = enable;
        }
    }

    /**
     * @en Request new render data object.
     * @zh 请求新的渲染数据对象。
     * @return The new render data
     */
    public requestRenderData () {
        const data = RenderData.add();
        this._renderData = data;
        return data;
    }

    /**
     * @en Destroy current render data.
     * @zh 销毁当前渲染数据。
     */
    public destroyRenderData () {
        if (!this._renderData) {
            return;
        }

        RenderData.remove(this._renderData);
        this._renderData = null;
    }

    /**
     * @en Render data submission procedure, it update and assemble the render data to 2D data buffers before all children submission process.
     * Usually called each frame when the ui flow assemble all render data to geometry buffers.
     * Don't call it unless you know what you are doing.
     * @zh 渲染数据组装程序，这个方法会在所有子节点数据组装之前更新并组装当前组件的渲染数据到 UI 的顶点数据缓冲区中。
     * 一般在 UI 渲染流程中调用，用于组装所有的渲染数据到顶点数据缓冲区。
     * 注意：不要手动调用该函数，除非你理解整个流程。
     */
    public updateAssembler (render: Batcher2D) {
        this._updateColor();
        if (this._renderFlag) {
            this._checkAndUpdateRenderData();
            this._render(render);
        }
    }

    /**
     * @en Post render data submission procedure, it's executed after assembler updated for all children.
     * It may assemble some extra render data to the geometry buffers, or it may only change some render states.
     * Don't call it unless you know what you are doing.
     * @zh 后置渲染数据组装程序，它会在所有子节点的渲染数据组装完成后被调用。
     * 它可能会组装额外的渲染数据到顶点数据缓冲区，也可能只是重置一些渲染状态。
     * 注意：不要手动调用该函数，除非你理解整个流程。
     */
    public postUpdateAssembler (render: Batcher2D) {
        if (this._renderFlag) {
            this._postRender(render);
        }
    }

    protected _render (render: Batcher2D) {}

    protected _postRender (render: Batcher2D) {}

    protected _checkAndUpdateRenderData () {
        if (this._renderDataFlag) {
            this._assembler!.updateRenderData!(this);
            this._renderDataFlag = false;
        }
    }

    protected _canRender () {
        return this.isValid
               && this.getMaterial(0) !== null
               && this.enabled
               && (this._delegateSrc ? this._delegateSrc.activeInHierarchy : this.enabledInHierarchy)
               && this.node._uiProps.opacity > 0;
    }

    protected _postCanRender () {}

    protected _updateColor () {
        this._updateWorldAlpha();
        if (this._colorDirty && this._assembler && this._assembler.updateColor) {
            this._assembler.updateColor(this);
            this._colorDirty = false;
        }
    }

    protected _updateWorldAlpha () {
        if (this.color === undefined || this.color === null) {
            return;
        }
        let localAlpha = this.color.a / 255;
        if (localAlpha === 1) localAlpha = this.node._uiProps.localOpacity; // Hack for Mask use ui-opacity
        const parent = this.node.parent;
        const alpha = (parent && parent._uiProps) ? parent._uiProps.opacity * localAlpha : localAlpha;
        this.node._uiProps.opacity = alpha;
        this._colorDirty = this._colorDirty || alpha !== this._cacheAlpha;
        this._cacheAlpha = alpha;
    }

    public _updateBlendFunc () {
        // todo: Not only Pass[0].target[0]
        let target = this._blendState.targets[0];
        if (!target) {
            target = new BlendTarget();
            this._blendState.setTarget(0, target);
        }
        if (target.blendDst !== this._dstBlendFactor || target.blendSrc !== this._srcBlendFactor) {
            target.blend = true;
            target.blendDstAlpha = BlendFactor.ONE_MINUS_SRC_ALPHA;
            target.blendDst = this._dstBlendFactor;
            target.blendSrc = this._srcBlendFactor;
        }
        this.updateBlendHash();
    }

    public getBlendState () {
        return this._blendState;
    }

    // pos, rot, scale changed
    protected _nodeStateChange (transformType: TransformBit) {
        if (this._renderData) {
            this.markForUpdateRenderData();
        }

        for (let i = 0; i < this.node.children.length; ++i) {
            const child = this.node.children[i];
            const renderComp = child.getComponent(Renderable2D);
            if (renderComp) {
                renderComp.markForUpdateRenderData();
            }
        }
    }

    protected _updateBuiltinMaterial () : Material {
        let mat : Material;
        switch (this._instanceMaterialType) {
        case InstanceMaterialType.ADD_COLOR:
            mat = builtinResMgr.get('ui-base-material');
            break;
        case InstanceMaterialType.GRAYSCALE:
            mat = builtinResMgr.get('ui-sprite-gray-material');
            break;
        case InstanceMaterialType.USE_ALPHA_SEPARATED:
            mat = builtinResMgr.get('ui-sprite-alpha-sep-material');
            break;
        case InstanceMaterialType.USE_ALPHA_SEPARATED_AND_GRAY:
            mat = builtinResMgr.get('ui-sprite-gray-alpha-sep-material');
            break;
        default:
            mat = builtinResMgr.get('ui-sprite-material');
            break;
        }
        return mat;
    }

    protected _flushAssembler? (): void;

    public _setCacheAlpha (value) {
        this._cacheAlpha = value;
    }
}

legacyCC.internal.Renderable2D = Renderable2D;
