/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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
 ****************************************************************************/

const MeshRenderer = require('../mesh/CCMeshRenderer');
const renderEngine = require('../renderer/render-engine');
const mat4 = cc.vmath.mat4;

let _m4_tmp = mat4.create();

let SkinnedMeshRenderer = cc.Class({
    name: 'cc.SkinnedMeshRenderer',
    extends: MeshRenderer,

    ctor() {
        this._jointsTextureData = null;
        this._jointsTexture = null;
        this._skinning = null;
        this._matrices = [];

        this._assembler = MeshRenderer._assembler;
    },

    properties: {
        _joints: [cc.Node],
        _skinID: -1
    },

    _createMaterial() {
        let material = new renderEngine.MeshMaterial();
        material.color = cc.Color.WHITE;
        if (cc.macro.ENABLE_3D) {
            material._mainTech._passes[0].setDepth(true, true);
        }
        material.useModel = false;
        material.useSkinning = true;

        if (this._jointsTexture) {
            material.useJointsTexture = true;
            material.jointsTexture = this._jointsTexture;
            material.jointsTextureSize = this._jointsTexture.width;
        }
        else {
            material.useJointsTexture = false;
            material.jointMatrices = this._jointsTextureData;
        }

        return material;
    },

    _reset() {
        this._super();
        this._initSkinning();
        this._initJointsTexture();
        this._initMatrices();
    },

    _initSkinning() {
        if (this._skinID === -1 || !this._mesh || !this._mesh._model) return;
        this._skinning = this._mesh._model.createSkinning(this._skinID);
    },

    _initJointsTexture() {
        if (this._jointsTexture) {
            this._jointsTexture.destroy();
            this._jointsTexture = null;
        }

        let skinning = this._skinning;
        if (!skinning) return;

        let jointCount = skinning.jointIndices.length;

        let ALLOW_FLOAT_TEXTURE = !!cc.renderer.device.ext('OES_texture_float');
        if (ALLOW_FLOAT_TEXTURE) {
            // set jointsTexture
            let size;
            if (jointCount > 256) {
                size = 64;
            } else if (jointCount > 64) {
                size = 32;
            } else if (jointCount > 16) {
                size = 16;
            } else {
                size = 8;
            }

            this._jointsTextureData = new Float32Array(size * size * 4);
            
            let texture = new cc.Texture2D();
            texture.image = new cc.ImageAsset({ 
                _data: this._jointsTextureData,
                format: cc.Texture2D.PixelFormat.RGBA32F,
                width: size,
                height: size,
                _compressed : false
            });

            this._jointsTexture = texture;
        }
        else {
            this._jointsTextureData = new Float32Array(jointCount * 16);
        }
    },

    _initMatrices() {
        let joints = this._joints;
        let matrices = this._matrices;

        matrices.length = 0;
        for (let i = 0; i < joints.length; i++) {
            matrices.push(mat4.create());
        }

        this.updateMatrices();
    },

    _setJointsTextureData(iMatrix, matrix) {
        let arr = this._jointsTextureData;
        arr[16 * iMatrix + 0] = matrix.m00;
        arr[16 * iMatrix + 1] = matrix.m01;
        arr[16 * iMatrix + 2] = matrix.m02;
        arr[16 * iMatrix + 3] = matrix.m03;
        arr[16 * iMatrix + 4] = matrix.m04;
        arr[16 * iMatrix + 5] = matrix.m05;
        arr[16 * iMatrix + 6] = matrix.m06;
        arr[16 * iMatrix + 7] = matrix.m07;
        arr[16 * iMatrix + 8] = matrix.m08;
        arr[16 * iMatrix + 9] = matrix.m09;
        arr[16 * iMatrix + 10] = matrix.m10;
        arr[16 * iMatrix + 11] = matrix.m11;
        arr[16 * iMatrix + 12] = matrix.m12;
        arr[16 * iMatrix + 13] = matrix.m13;
        arr[16 * iMatrix + 14] = matrix.m14;
        arr[16 * iMatrix + 15] = matrix.m15;
    },

    _commitJointsData () {
        if (this._jointsTexture) {
            this._jointsTexture.update({image: this._jointsTextureData});
        }
    },

    updateMatrices() {
        for (let i = 0; i < this._joints.length; ++i) {
            this._joints[i].getWorldMatrix(this._matrices[i]);
        }
    },

    update() {
        if (!this._skinning) return;
        const bindposes = this._skinning.bindposes;
        const matrices = this._matrices;

        this.updateMatrices();

        for (let i = 0; i < bindposes.length; ++i) {
            let bindpose = bindposes[i];
            let worldMatrix = matrices[i];

            mat4.multiply(_m4_tmp, worldMatrix, bindpose);
            this._setJointsTextureData(i, _m4_tmp);
        }

        this._commitJointsData();
    }
});

cc.SkinnedMeshRenderer = module.exports = SkinnedMeshRenderer;
