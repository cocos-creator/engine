/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

import { BitmapFont, Font, ImageAsset, SpriteFrame } from '../../../assets';
import { ccclass, executionOrder, menu, property } from '../../../core/data/class-decorator';
import { ccenum } from '../../../core/value-types/enum';
import { UI } from '../../../renderer/ui/ui';
import { FontAtlas } from '../assembler/label/bmfontUtils';
import { CanvasPool, ISharedLabelData } from '../assembler/label/font-utils';
import { LetterRenderTexture } from '../assembler/label/letter-font';
import { UIRenderComponent } from './ui-render-component';

/**
 * !#en Enum for vertical text alignment.
 * !#zh 文本横向对齐类型
 * @enum Label.HorizontalTextAlignment
 */
export enum HorizontalTextAlignment {
    /**
     * @property {Number} LEFT
     */
    LEFT = 0,
    /**
     * @property {Number} CENTER
     */
    CENTER = 1,
    /**
     * @property {Number} RIGHT
     */
    RIGHT = 2,
}

ccenum(HorizontalTextAlignment);

/**
 * !#en Enum for vertical text alignment.
 * !#zh 文本垂直对齐类型
 * @enum Label.VerticalTextAlignment
 */
export enum VerticalTextAlignment {
    /**
     * @property {Number} TOP
     */
    TOP = 0,
    /**
     * @property {Number} CENTER
     */
    CENTER = 1,
    /**
     * @property {Number} BOTTOM
     */
    BOTTOM = 2,
}

ccenum(VerticalTextAlignment);

/**
 * !#en Enum for Overflow.
 * !#zh Overflow 类型
 * @enum Label.Overflow
 */
/**
 * !#en NONE.
 * !#zh 不做任何限制。
 * @property {Number} NONE
 */
/**
 * !#en In CLAMP mode, when label content goes out of the bounding box, it will be clipped.
 * !#zh CLAMP 模式中，当文本内容超出边界框时，多余的会被截断。
 * @property {Number} CLAMP
 */
/**
 * !#en In SHRINK mode, the font size will change dynamically to adapt the content size.
 * !#zh SHRINK 模式，字体大小会动态变化，以适应内容大小。
 * @property {Number} SHRINK
 */
/**
 * !#en In RESIZE_HEIGHT mode, you can only change the width of label and the height is changed automatically.
 * !#zh 在 RESIZE_HEIGHT 模式下，只能更改文本的宽度，高度是自动改变的。
 * @property {Number} RESIZE_HEIGHT
 */
export enum Overflow {
    NONE = 0,
    CLAMP = 1,
    SHRINK = 2,
    RESIZE_HEIGHT = 3,
}

ccenum(Overflow);

/**
 * !#en Do not do any caching.
 * !#zh 不做任何缓存。
 * @property {Number} NONE
 */
/**
 * !#en In BITMAP mode, cache the label as a static image and add it to the dynamic atlas for batch rendering,
 * and can batching with Sprites using broken images.
 * !#zh BITMAP 模式，将 label 缓存成静态图像并加入到动态图集，以便进行批次合并，可与使用碎图的 Sprite 进行合批（注：动态图集在 Chrome 以及微信小游戏暂时关闭，该功能无效）。
 * @property {Number} BITMAP
 */
/**
 * !#en In CHAR mode, split text into characters and cache characters into a dynamic atlas which the size of 2048*2048.
 * !#zh CHAR 模式，将文本拆分为字符，并将字符缓存到一张单独的大小为 2048*2048 的图集中进行重复使用，不再使用动态图集（注：当图集满时将不再进行缓存，暂时不支持 SHRINK 自适应文本尺寸（后续完善））。
 * @property {Number} CHAR
 */
enum CacheMode {
    NONE = 0,
    BITMAP = 1,
    CHAR = 2,
}

ccenum(CacheMode);

/**
 * !#en Enum for font type.
 * !#zh Type 类型
 * @enum Label.Type
 */
/**
 * !#en The TTF font type.
 * !#zh TTF字体
 * @property {Number} TTF
 */
/**
 * !#en The bitmap font type.
 * !#zh 位图字体
 * @property {Number} BMFont
 */
/**
 * !#en The system font type.
 * !#zh 系统字体
 * @property {Number} SystemFont
 */

/**
 * !#en The Label Component.
 * !#zh 文字标签组件
 * @class Label
 * @extends UIRenderComponent
 */
@ccclass('cc.LabelComponent')
@executionOrder(100)
@menu('UI/Render/Label')
export class LabelComponent extends UIRenderComponent {
    /**
     * !#en Content string of label.
     * !#zh 标签显示的文本内容。
     * @property {String} string
     */
    @property
    get string () {
        return this._string;
    }
    set string (value) {
        value = value.toString();
        if (this._string === value) {
            return;
        }

        this._string = value;
        this.updateRenderData();
        this._checkStringEmpty();
    }

    /**
     * !#en Horizontal Alignment of label.
     * !#zh 文本内容的水平对齐方式。
     * @property {Label.HorizontalAlign} horizontalAlign
     */
    @property({
        type: HorizontalTextAlignment,
    })
    get horizontalAlign () {
        return this._horizontalAlign;
    }

    set horizontalAlign (value) {
        if (this._horizontalAlign === value) {
            return;
        }

        this._horizontalAlign = value;
        this.updateRenderData();
    }

    /**
     * !#en Vertical Alignment of label.
     * !#zh 文本内容的垂直对齐方式。
     * @property {Label.VerticalAlign} VerticalTextAlignment
     */
    @property({
        type: VerticalTextAlignment,
    })
    get verticalAlign () {
        return this._verticalAlign;
    }

    set verticalAlign (value) {
        if (this._verticalAlign === value) {
            return;
        }

        this._verticalAlign = value;
        this.updateRenderData();
    }

    /**
     * !#en The actual rendering font size in shrink mode
     * !#zh SHRINK 模式下面文本实际渲染的字体大小
     * @property {Number} actualFontSize
     */
    @property({
        readonly: true,
        displayName: 'Actual Font Size',
    })
    get actualFontSize () {
        return this._actualFontSize;
    }

    set actualFontSize (value) {
        this._actualFontSize = value;
    }

    /**
     * !#en Font size of label.
     * !#zh 文本字体大小。
     * @property {Number} fontSize
     */
    @property
    get fontSize () {
        return this._fontSize;
    }

    set fontSize (value) {
        if (this._fontSize === value) {
            return;
        }

        this._fontSize = value;
        this.updateRenderData();
    }

    /**
     * !#en Font family of label, only take effect when useSystemFont property is true.
     * !#zh 文本字体名称, 只在 useSystemFont 属性为 true 的时候生效。
     * @property {String} fontFamily
     */
    @property
    get fontFamily () {
        return this._fontFamily;
    }

    set fontFamily (value) {
        if (this._fontFamily === value) {
            return;
        }

        this._fontFamily = value;
        this.updateRenderData();
    }

    /**
     * !#en Line Height of label.
     * !#zh 文本行高。
     * @property {Number} lineHeight
     */
    @property
    get lineHeight () {
        return this._lineHeight;
    }
    set lineHeight (value) {
        if (this._lineHeight === value) {
            return;
        }

        this._lineHeight = value;
        this.updateRenderData();
    }

    /**
     * !#en Overflow of label.
     * !#zh 文字显示超出范围时的处理方式。
     * @property {Overflow} overflow
     */
    @property({
        type: Overflow,
    })
    get overflow () {
        return this._overflow;
    }

    set overflow (value) {
        if (this._overflow === value) {
            return;
        }

        this._overflow = value;
        this.updateRenderData();
    }

    /**
     * !#en Whether auto wrap label when string width is large than label width.
     * !#zh 是否自动换行。
     * @property {Boolean} enableWrapText
     */
    @property()
    get enableWrapText () {
        return this._enableWrapText;
    }
    set enableWrapText (value) {
        if (this._enableWrapText === value) {
            return;
        }

        this._enableWrapText = value;
        this.updateRenderData();
    }

    /**
     * !#en The font of label.
     * !#zh 文本字体。
     * @property {Font} font
     */
    @property({
        type: Font,
    })
    get font () {
        // return this._N$file;
        return this._font;
    }

    set font (value) {
        if (this._font === value) {
            return;
        }

        // if delete the font, we should change isSystemFontUsed to true
        this._isSystemFontUsed = !value;

        if (CC_EDITOR && value) {
            this._userDefinedFont = value;
        }

        // this._N$file = value;
        this._font = value;
        // if (value && this._isSystemFontUsed)
        //     this._isSystemFontUsed = false;

        if (typeof value === 'string') {
            cc.warnID(4000);
        }

        if (this._renderData) {
            this.destroyRenderData();
            this._renderData = null;
        }
        // this._fontAtlas = null;
        this._flushAssembler();
        this._applyFontTexture(true);
        this.updateRenderData();
    }

    /**
     * !#en Whether use system font name or not.
     * !#zh 是否使用系统字体。
     * @property {Boolean} isSystemFontUsed
     */
    @property
    get useSystemFont () {
        return this._isSystemFontUsed;
    }

    set useSystemFont (value) {
        if (this._isSystemFontUsed === value) {
            return;
        }

        this.destroyRenderData();
        this._renderData = null;

        if (CC_EDITOR) {
            if (!value && this._isSystemFontUsed && this._userDefinedFont) {
                this.font = this._userDefinedFont;
                this.spacingX = this._spacingX;
                return;
            }
        }

        this._isSystemFontUsed = !!value;
        if (value) {
            this.font = null;
            this._flushAssembler();
            this.updateRenderData();
            this._checkStringEmpty();
        }
        // else if (!this._userDefinedFont) {
        //     this.disableRender();
        // }

    }

    /**
     * !#en The cache mode of label. This mode only supports system fonts.
     * !#zh 文本缓存模式, 该模式只支持系统字体。
     * @property {Label.CacheMode} cacheMode
     */
    @property({
        type: CacheMode,
    })
    get cacheMode () {
        return this._cacheMode;
    }

    set cacheMode (value) {
        if (this._cacheMode === value) {
            return;
        }

        // if (this._cacheMode === CacheMode.BITMAP && !(this._font instanceof BitmapFont) && this._frame) {
        //     this._frame._resetDynamicAtlasFrame();
        // }

        if (this._cacheMode === CacheMode.CHAR) {
            this._ttfTexture = null;
        }

        this._cacheMode = value;
        this.updateRenderData(true);
    }

    get spriteFrame () {
        return this._texture;
    }

    /**
     * !#en Whether the font is bold or not.
     * !#zh 字体是否加粗。
     * @property {Boolean} isBold
     */
    @property({
        // visible: false,
    })
    get isBold () {
        return this._isBold;
    }

    set isBold (value) {
        if (this._isBold === value) {
            return;
        }

        this._isBold = value;
        this.updateRenderData();
    }

    /**
     * !#en Whether the font is tilted or not.
     * !#zh 字体是否倾斜。
     * @property {Boolean} isItalic
     */
    @property({
        // visible: false,
    })
    get isItalic () {
        return this._isItalic;
    }

    set isItalic (value) {
        if (this._isItalic === value) {
            return;
        }

        this._isItalic = value;
        this.updateRenderData();
    }

    /**
     * !#en Whether the font is underlined.
     * !#zh 字体是否加下划线。
     * @property {Boolean} isUnderline
     */
    @property({
        // visible: false,
    })
    get isUnderline () {
        return this._isUnderline;
    }

    set isUnderline (value) {
        if (this._isUnderline === value) {
            return;
        }

        this._isUnderline = value;
        this.updateRenderData();
    }

    get assemblerData (){
        return this._assemblerData;
    }

    get fontAtlas () {
        return this._fontAtlas;
    }

    set fontAtlas (value) {
        this._fontAtlas = value;
    }

    get spacingX () {
        return this._spacingX;
    }

    set spacingX (value) {
        if (this._spacingX === value) {
            return;
        }

        this._spacingX = value;
        this.updateRenderData();
    }

    get _bmFontOriginalSize (){
        if (this._font instanceof BitmapFont) {
            return this._font.fontSize;
        }
        else {
            return -1;
        }
    }

    public static HorizontalAlign = HorizontalTextAlignment;
    public static VerticalAlign = VerticalTextAlignment;
    public static Overflow = Overflow;
    public static CacheMode = CacheMode;
    public static CanvasPool = new CanvasPool();

    @property
    private _useOriginalSize = true;
    @property
    private _string = 'label';
    @property
    private _horizontalAlign = HorizontalTextAlignment.LEFT;
    @property
    private _verticalAlign = VerticalTextAlignment.TOP;
    @property
    private _actualFontSize = 0;
    @property
    private _fontSize = 40;
    @property
    private _fontFamily = 'Arial';
    @property
    private _lineHeight = 40;
    @property
    private _overflow: Overflow = Overflow.NONE;
    @property
    private _enableWrapText = true;
    @property
    private _font: Font | null = null;
    @property
    private _isSystemFontUsed = true;
    private _spacingX = 0;
    @property
    private _isItalic = false;
    @property
    private _isBold = false;
    @property
    private _isUnderline = false;
    @property
    private _cacheMode = CacheMode.NONE;

    // don't need serialize
    // 这个保存了旧项目的 file 数据
    private _N$file: Font | null = null;
    private _texture: SpriteFrame | LetterRenderTexture | null = null;
    private _ttfTexture: SpriteFrame | null = null;
    private _userDefinedFont: Font | null = null;
    private _assemblerData: ISharedLabelData | null = null;
    private _fontAtlas: FontAtlas | null = null;
    private _letterTexture: LetterRenderTexture | null = null;

    constructor () {
        super();
        if (CC_EDITOR) {
            this._userDefinedFont = null;
        }

        this._ttfTexture = null;
    }

    public onEnable () {
        super.onEnable();

        // TODO: Hack for barbarians
        if (!this._font && !this._isSystemFontUsed) {
            this.useSystemFont = true;
        }
        // Reapply default font family if necessary
        if (this._isSystemFontUsed && !this._fontFamily) {
            this.fontFamily = 'Arial';
        }

        this._checkStringEmpty();
        this.updateRenderData(true);
    }

    public onDisable () {
        super.onDisable();
    }

    public onDestroy () {
        if (this._assembler && this._assembler.resetAssemblerData) {
            this._assembler.resetAssemblerData(this._assemblerData!);
        }

        this._assemblerData = null;
        if (this._ttfTexture) {
            this._ttfTexture.destroy();
            this._ttfTexture = null;
        }

        super.onDestroy();
    }

    public updateRenderData (force = false) {
        this.markForUpdateRenderData(true);

        if (force) {
            this._flushAssembler();
            this._applyFontTexture(force);
        }
    }

    public updateAssembler (render: UI) {
        if (super.updateAssembler(render) && this._texture) {
            render.commitComp(this, this._texture.getGFXTextureView(), this._assembler!);
            return true;
        }

        return false;
    }

    protected _updateColor () {
        if (this._font instanceof BitmapFont) {
           super._updateColor();
        } else {
            this.updateRenderData(false);
        }
    }

    protected _canRender () {
        if (!super._canRender()){
            return false;
        }

        const font = this._font;
        if (font && font instanceof BitmapFont) {
            const spriteFrame = font.spriteFrame;
            // cannot be activated if texture not loaded yet
            if (!spriteFrame || !spriteFrame.textureLoaded()) {
                return false;
            }
        }

        return true;
    }

    protected _flushAssembler () {
        const assembler = LabelComponent.Assembler!.getAssembler(this);

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this._renderData) {
            if (this._assembler && this._assembler.createData){
                this._renderData = this._assembler.createData(this);
                this._renderData!.material = this._material;
            }
        }
    }

    private _checkStringEmpty () {
        this._renderPermit = !!this.string;
    }

    private _flushMaterial () {
        const material = this._material;
        // Setup blend function for premultiplied ttf label texture
        // if (this._texture === this._ttfTexture) {
        //     this._srcBlendFactor = macro.BlendFactor.ONE;
        // } else {
        //     this._srcBlendFactor = macro.BlendFactor.SRC_ALPHA;
        // }

        if (material) {
            material.setProperty('mainTexture', this._texture);
        }

        this._updateMaterial(material);
    }

    private _applyFontTexture (force: boolean) {
        const font = this._font;
        if (font instanceof BitmapFont) {
            const spriteFrame = font.spriteFrame;
            const self = this;
            const onBMFontTextureLoaded = () => {
                // TODO: old texture in material have been released by loader
                self._texture = spriteFrame;
                self._flushMaterial();
            };
            // cannot be activated if texture not loaded yet
            if (spriteFrame && spriteFrame.textureLoaded()) {
                onBMFontTextureLoaded();
            } else {
                // this.disableRender();

                if (spriteFrame) {
                    spriteFrame.once('load', onBMFontTextureLoaded, this);
                    spriteFrame.ensureLoadTexture();
                }
            }
        } else {
            if (this.cacheMode === CacheMode.CHAR && cc.sys.browserType !== cc.sys.BROWSER_TYPE_WECHAT_GAME_SUB) {
                this._letterTexture = this._assembler!.getAssemblerData();
                this._texture = this._letterTexture;
            } else if (!this._ttfTexture) {
                this._ttfTexture = new SpriteFrame();
                this._assemblerData = this._assembler!.getAssemblerData();
                // this._ttfTexture.initWithElement(this._assemblerData.canvas);
                const image = new ImageAsset(this._assemblerData!.canvas);
                this._ttfTexture.image = image;
            }

            if (this.cacheMode !== CacheMode.CHAR) {
                // this._frame._refreshTexture(this._texture);
                this._texture = this._ttfTexture;
            }

            this._flushMaterial();
        }

        if (force && this._assembler && this._assembler.updateRenderData) {
            this._assembler.updateRenderData(this);
        }
    }
}

cc.LabelComponent = LabelComponent;
