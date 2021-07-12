/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

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

import WebglBmfontAssembler from '../../webgl/assemblers/label/2d/bmfont';

const Label = require('../../../components/CCLabel');
const LabelOutline = require('../../../components/CCLabelOutline');
const textUtils = require('../../../utils/text-utils');
const Component = require('../../../components/CCComponent');
const RenderTexture = require('../../../assets/CCRenderTexture');
const OUTLINE_SUPPORTED = cc.js.isChildClassOf(LabelOutline, Component);
const getFontFamily = require('../utils').getFontFamily;
const shareLabelInfo = require('../utils').shareLabelInfo;


const FontLetterDefinition = cc.BitmapFont.FontLetterDefinition;
const FontAtlas = cc.BitmapFont.FontAtlas;

const WHITE = cc.Color.WHITE;
const space = 0;
const bleed = 2;
const _invisibleAlpha = (1 / 255).toFixed(3);

function LetterTexture(char, labelInfo) {
    this._texture = null;
    this._labelInfo = labelInfo;
    this._char = char;
    this._hash = null;
    this._data = null;
    this._canvas = null;
    this._context = null;
    this._width = 0;
    this._height = 0;
    this._offsetY = 0;
    this._hash = char.charCodeAt(0) + labelInfo.hash;
}

LetterTexture.prototype = {
    constructor: LetterTexture,

    updateRenderData () {
        this._updateProperties();
        this._updateTexture();
    },
    _updateProperties () {
        this._texture = new cc.Texture2D();
        if (this._labelInfo.premultiply) {
            this._texture.setPremultiplyAlpha(true)
        }
        this._data = Label._canvasPool.get();
        this._canvas = this._data.canvas;
        this._context = this._data.context;
        this._context.font = this._labelInfo.fontDesc;
        let width = textUtils.safeMeasureText(this._context, this._char, this._labelInfo.fontDesc);
        let blank = this._labelInfo.margin * 2 + bleed;
        this._width = parseFloat(width.toFixed(2)) + blank;
        this._height = (1 + textUtils.BASELINE_RATIO) * this._labelInfo.fontSize + blank;
        this._offsetY = - (this._labelInfo.fontSize * textUtils.BASELINE_RATIO) / 2;

        if (this._canvas.width !== this._width) {
            this._canvas.width = this._width;
        }

        if (this._canvas.height !== this._height) {
            this._canvas.height = this._height;
        }

        this._texture.initWithElement(this._canvas);
    },
    _updateTexture () {
        let context = this._context;
        let labelInfo = this._labelInfo,
            width = this._canvas.width,
            height = this._canvas.height;

        const premultiply = labelInfo.premultiply;

        const fontSize = this._labelInfo.fontSize;
        let startX = width / 2;
        let startY = height / 2 +  fontSize * textUtils.MIDDLE_RATIO + fontSize * textUtils.BASELINE_OFFSET;
        let color = labelInfo.color;

        // use round for line join to avoid sharp intersect point
        context.lineJoin = 'round';
        context.textAlign = 'center';
        context.clearRect(0, 0, width, height);

        //Add a white background to avoid black edges.
        if (premultiply) {
            let _fillColor = labelInfo.isOutlined ? labelInfo.out : color;
            context.fillStyle = `rgba(${_fillColor.r}, ${_fillColor.g}, ${_fillColor.b}, ${_invisibleAlpha})`;
            context.fillRect(0, 0, width, height);
        }
        context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;

        context.font = labelInfo.fontDesc;
        if (labelInfo.isOutlined && labelInfo.margin > 0) {
            let strokeColor = labelInfo.out || WHITE;
            context.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a / 255})`;
            context.lineWidth = labelInfo.margin * 2;
            context.strokeText(this._char, startX, startY);
        }
        context.fillText(this._char, startX, startY);

        this._texture.handleLoadedTexture();
    },

    destroy () {
        this._texture.destroy();
        this._texture = null;
        Label._canvasPool.put(this._data);
    },
}

function LetterAtlas (width, height) {
    let texture = new RenderTexture();
    texture.initWithSize(width, height);
    texture.update();

    this._fontDefDictionary = new FontAtlas(texture);

    this._x = space;
    this._y = space;
    this._nexty = space;

    this._width = width;
    this._height = height;

    cc.director.on(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, this.beforeSceneLoad, this);
}

cc.js.mixin(LetterAtlas.prototype, {
    insertLetterTexture (letterTexture) {
        let texture = letterTexture._texture;
        let width = texture.width, height = texture.height;

        if ((this._x + width + space) > this._width) {
            this._x = space;
            this._y = this._nexty;
        }

        if ((this._y + height) > this._nexty) {
            this._nexty = this._y + height + space;
        }

        if (this._nexty > this._height) {
            return null;
        }

        this._fontDefDictionary._texture.drawTextureAt(texture, this._x, this._y);

        this._dirty = true;

        let letter = new FontLetterDefinition();
        letter.u = this._x + bleed/2;
        letter.v = this._y + bleed/2;
        letter.texture = this._fontDefDictionary._texture;
        letter.valid = true;
        letter.w = letterTexture._width - bleed;
        letter.h = letterTexture._height - bleed;
        letter.xAdvance = letter.w;
        letter.offsetY = letterTexture._offsetY;

        this._x += width + space;

        this._fontDefDictionary.addLetterDefinitions(letterTexture._hash, letter);

        return letter;
    },

    update () {
        if (!this._dirty) return;
        this._fontDefDictionary._texture.update();
        this._dirty = false;
    },

    reset () {
        this._x = space;
        this._y = space;
        this._nexty = space;

        let chars = this._fontDefDictionary._letterDefinitions;
        for (let i = 0, l = chars.length; i < l; i++) {
            let char = chars[i];
            if (!char.isValid) {
                continue;
            }
            char.destroy();
        }

        this._fontDefDictionary.clear();
    },

    destroy () {
        this.reset();
        this._fontDefDictionary._texture.destroy();
        this._fontDefDictionary._texture = null;
    },

    beforeSceneLoad () {
        this.clearAllCache();
    },

    clearAllCache () {
        this.destroy();

        let texture = new RenderTexture();
        texture.initWithSize(this._width, this._height);
        texture.update();

        this._fontDefDictionary._texture = texture;
    },

    getLetter (key) {
        return this._fontDefDictionary._letterDefinitions[key];
    },

    getTexture () {
        return this._fontDefDictionary.getTexture();
    },

    getLetterDefinitionForChar: function(char, labelInfo) {
        let hash = char.charCodeAt(0) + labelInfo.hash;
        let letter = this._fontDefDictionary._letterDefinitions[hash];
        if (!letter) {
            let temp = new LetterTexture(char, labelInfo);
            temp.updateRenderData();
            letter = this.insertLetterTexture(temp);
            temp.destroy();
        }

        return letter;
    }
});

function computeHash (labelInfo) {
    let hashData = '';
    let color = labelInfo.color.toHEX();
    let out = '';
    let premultiply = labelInfo.premultiply ? 'P' : '';
    if (labelInfo.isOutlined && labelInfo.margin > 0) {
        out = out + labelInfo.margin + labelInfo.out.toHEX();
    }

    return hashData + labelInfo.fontSize + labelInfo.fontFamily + color + out + premultiply;
}

let _shareAtlas = null;

let _atlasWidth = 2048;
let _atlasHeight = 2048;
let _isBold = false;

export default class LetterFontAssembler extends WebglBmfontAssembler {
    _getAssemblerData () {
        if (!_shareAtlas) {
            _shareAtlas = new LetterAtlas(_atlasWidth, _atlasHeight);
            cc.Label._shareAtlas = _shareAtlas;
        }

        return _shareAtlas.getTexture();
    }

    _updateFontFamily (comp) {
        shareLabelInfo.fontAtlas = _shareAtlas;
        shareLabelInfo.fontFamily = getFontFamily(comp);

        // outline
        let outline = OUTLINE_SUPPORTED && comp.getComponent(LabelOutline);
        if (outline && outline.enabled) {
            shareLabelInfo.isOutlined = true;
            shareLabelInfo.margin = outline.width;
            shareLabelInfo.out = outline.color.clone();
            shareLabelInfo.out.a = outline.color.a * comp.node.color.a / 255.0;
        }
        else {
            shareLabelInfo.isOutlined = false;
            shareLabelInfo.margin = 0;
        }
    }

    _updateLabelInfo (comp) {
        shareLabelInfo.fontDesc = this._getFontDesc();
        shareLabelInfo.color = comp.node.color;
        shareLabelInfo.premultiply = comp._srcBlendFactor === cc.macro.BlendFactor.ONE;
        shareLabelInfo.hash = computeHash(shareLabelInfo);
    }

    _getFontDesc () {
        let fontDesc = shareLabelInfo.fontSize.toString() + 'px ';
        fontDesc = fontDesc + shareLabelInfo.fontFamily;
        if (_isBold) {
            fontDesc = "bold " + fontDesc;
        }

        return fontDesc;
    }
    _computeHorizontalKerningForText () {}
    _determineRect (tempRect) {
        return false;
    }
}
