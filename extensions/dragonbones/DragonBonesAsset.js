/****************************************************************************
 Copyright (c) 2016 Chukong Technologies Inc.
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

/**
 * @module dragonBones
 */
let ArmatureCache = require('./ArmatureCache').sharedCache;

/**
 * !#en The skeleton data of dragonBones.
 * !#zh dragonBones 的 骨骼数据。
 * @class DragonBonesAsset
 * @extends Asset
 */
var DragonBonesAsset = cc.Class({
    name: 'dragonBones.DragonBonesAsset',
    extends: cc.Asset,

    ctor () {
        this.reset();
    },

    properties: {
        _dragonBonesJson : '',

        /**
         * !#en See http://developer.egret.com/cn/github/egret-docs/DB/dbLibs/dataFormat/index.html
         * !#zh 可查看 DragonBones 官方文档 http://developer.egret.com/cn/github/egret-docs/DB/dbLibs/dataFormat/index.html
         * @property {string} dragonBonesJson
         */
        dragonBonesJson : {
            get: function () {
                return this._dragonBonesJson;
            },
            set: function (value) {
                this._dragonBonesJson = value;
                this.reset();
            }
        },

        _nativeAsset: {
            get () {
                return this._buffer;
            },
            set (bin) {
                this._buffer = bin.buffer || bin;
                this.reset();
            },
            override: true
        },
    },

    statics: {
        preventDeferredLoadDependents: true
    },

    createNode: CC_EDITOR &&  function (callback) {
        var node = new cc.Node(this.name);
        var armatureDisplay = node.addComponent(dragonBones.ArmatureDisplay);
        armatureDisplay.dragonAsset = this;

        return callback(null, node);
    },

    reset () {
        this._dragonBonesData = null;
        if (CC_EDITOR) {
            this._armaturesEnum = null;
        }
    },

    init (factory) {
        if (CC_EDITOR) {
            this._factory = factory || new dragonBones.CCFactory();
        } else {
            this._factory = factory;
        }

        if (this._dragonBonesData) {
            let hasSame = this.checkSameNameData(this._dragonBonesData);
            if (!hasSame) {
                this._factory.addDragonBonesData(this._dragonBonesData);
            }
        }
        else {
            if (this.dragonBonesJson) {
                this.initWithRawData(JSON.parse(this.dragonBonesJson), false);
            } else {
                this.initWithRawData(this._nativeAsset, true);
            }
        }
    },

    checkSameNameData (dragonBonesData) {
        let sameNamedDragonBonesData = this._factory.getDragonBonesData(dragonBonesData.name);
        if (sameNamedDragonBonesData) {
            // already added asset, see #2002
            let armatureNames = dragonBonesData.armatureNames;
            for (let i = 0; i < armatureNames.length; i++) {
                let armatureName = armatureNames[i];
                if (!sameNamedDragonBonesData.armatures[armatureName]) {
                    sameNamedDragonBonesData.addArmature(dragonBonesData.armatures[armatureName]);
                }
            }
            this._dragonBonesData = sameNamedDragonBonesData;
            return true;
        }
        return false;
    },

    initWithRawData (rawData, isBinary) {
        if (!rawData) {
            return;
        }

        let dragonBonesData = this._factory.parseDragonBonesDataOnly(rawData);
        let hasSame = this.checkSameNameData(dragonBonesData);
        if (!hasSame) {
            this._dragonBonesData = dragonBonesData;
            this._factory.handleTextureAtlasData(isBinary);
            this._factory.addDragonBonesData(dragonBonesData);
        }
    },

    // EDITOR

    getArmatureEnum: CC_EDITOR && function () {
        if (this._armaturesEnum) {
            return this._armaturesEnum;
        }
        this.init();
        if (this._dragonBonesData) {
            var armatureNames = this._dragonBonesData.armatureNames;
            var enumDef = {};
            for (var i = 0; i < armatureNames.length; i++) {
                var name = armatureNames[i];
                enumDef[name] = i;
            }
            return this._armaturesEnum = cc.Enum(enumDef);
        }
        return null;
    },

    getAnimsEnum: CC_EDITOR && function (armatureName) {
        this.init();
        if (this._dragonBonesData) {
            var armature = this._dragonBonesData.getArmature(armatureName);
            if (!armature) {
                return null;
            }

            var enumDef = { '<None>': 0 };
            var anims = armature.animations;
            var i = 0;
            for (var animName in anims) {
                if (anims.hasOwnProperty(animName)) {
                    enumDef[animName] = i + 1;
                    i++;
                }
            }
            return cc.Enum(enumDef);
        }
        return null;
    },

    destroy () {
        var useGlobalFactory = !CC_JSB;
        if (useGlobalFactory && this._dragonBonesData) {
            var factory = dragonBones.CCFactory.getInstance();
            let name = this._dragonBonesData.name;
            factory.removeDragonBonesData(name, true);
            ArmatureCache.clearByDBName(name);
        }
        this._super();
    },
});

dragonBones.DragonBonesAsset = module.exports = DragonBonesAsset;
