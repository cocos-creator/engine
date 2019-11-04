/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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
 ****************************************************************************/

import Assembler from '../renderer/assembler';

const Component = require('./CCComponent');
const RenderFlow = require('../renderer/render-flow');
const Material = require('../assets/material/CCMaterial');

/**
 * !#en
 * Base class for components which supports rendering features.
 * !#zh
 * 所有支持渲染的组件的基类
 *
 * @class RenderComponent
 * @extends Component
 */
let RenderComponent = cc.Class({
    name: 'RenderComponent',
    extends: Component,

    editor: CC_EDITOR && {
        executeInEditMode: true,
        disallowMultiple: true
    },

    properties: {
        _materials: {
            default: [],
            type: Material,
        },

        /**
         * !#en The materials used by this render component.
         * !#zh 渲染组件使用的材质。
         * @property {[Material]} sharedMaterials
         */
        sharedMaterials: {
            get () {
                return this._materials;
            },
            set (val) {
                this._materials = val;
                this._activateMaterial();
            },
            type: [Material],
            displayName: 'Materials',
            animatable: false
        }
    },
    
    ctor () {
        this._vertsDirty = true;
        this._material = null;
        this._assembler = null;
    },

    _resetAssembler () {
        Assembler.init(this);
        this._updateColor();
    },

    __preload () {
        this._resetAssembler();
        this._activateMaterial();
    },

    onEnable () {
        if (this.node._renderComponent) {
            this.node._renderComponent.enabled = false;
        }
        this.node._renderComponent = this;
        this.node._renderFlag |= RenderFlow.FLAG_OPACITY_COLOR;
        
        this.setVertsDirty();
    },

    onDisable () {
        this.node._renderComponent = null;
        this.disableRender();
    },

    onDestroy () {
        this._materials.length = 0;

        if (CC_JSB && CC_NATIVERENDERER) {
            this._assembler && this._assembler.destroy && this._assembler.destroy();
        }
    },

    setVertsDirty () {
        this._vertsDirty = true;
        this.markForRender(true);
    },

    _on3DNodeChanged () {
        this._resetAssembler();
    },
    
    _validateRender () {
    },

    markForValidate () {
        cc.RenderFlow.registerValidate(this);
    },

    markForRender (enable) {
        let flag = RenderFlow.FLAG_RENDER | RenderFlow.FLAG_UPDATE_RENDER_DATA;
        if (enable) {
            this.node._renderFlag |= flag;
            this.markForValidate();
        }
        else {
            this.node._renderFlag &= ~flag;
        }
    },

    disableRender () {
        this.node._renderFlag &= ~(RenderFlow.FLAG_RENDER | RenderFlow.FLAG_UPDATE_RENDER_DATA);
    },

    /**
     * !#en Get the material by index.
     * !#zh 根据指定索引获取材质
     * @method getMaterial
     * @param {Number} index 
     * @return {Material}
     */
    getMaterial (index) {
        if (index < 0 || index >= this._materials.length) {
            return null;
        }

        let material = this._materials[index];
        if (!material) return null;
        
        let instantiated = Material.getInstantiatedMaterial(material, this);
        if (instantiated !== material) {
            this.setMaterial(index, instantiated);
        }

        return this._materials[index];
    },
    
    /**
     * !#en Set the material by index.
     * !#zh 根据指定索引设置材质
     * @method setMaterial
     * @param {Number} index 
     * @param {Material} material
     * @return {Material}
     */
    setMaterial (index, material) {
        if (material !== this._materials[index]) {
            material = Material.getInstantiatedMaterial(material, this);
            this._materials[index] = material;
        }
        return material;
    },

    /**
     * Init material.
     */
    _activateMaterial () {
        if (cc.game.renderType === cc.game.RENDER_TYPE_CANVAS) return;

        // make sure material is belong to self.
        let material = this.sharedMaterials[0];
        if (!material) {
            material = Material.getInstantiatedBuiltinMaterial('2d-sprite', this);
        }
        else {
            material = Material.getInstantiatedMaterial(material, this);
        }
        
        this.setMaterial(0, material);

        this._updateMaterial();
    },

    /**
     * Update material properties.
     */
    _updateMaterial () {

    },

    _updateColor () {
        if (this._assembler.updateColor) {
            this._assembler.updateColor(this);
        }
    },

    _checkBacth (renderer, cullingMask) {
        let material = this.sharedMaterials[0];
        if ((material && material.getHash() !== renderer.material.getHash()) || 
            renderer.cullingMask !== cullingMask) {
            renderer._flush();
    
            renderer.node = material.getDefine('CC_USE_MODEL') ? this.node : renderer._dummyNode;
            renderer.material = material;
            renderer.cullingMask = cullingMask;
        }
    }
});

cc.RenderComponent = module.exports = RenderComponent;
