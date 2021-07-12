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

import Assembler2D from '../../assembler-2d';

const textUtils = require('../../../utils/text-utils');
const macro = require('../../../platform/CCMacro');
const Label = require('../../../components/CCLabel');
const Overflow = Label.Overflow;

const shareLabelInfo = require('../utils').shareLabelInfo;

const GraphemeSplitter = require('../../../utils/grapheme-splitter');
const splitter = new GraphemeSplitter();

let LetterInfo = function() {
    this.char = '';
    this.valid = true;
    this.x = 0;
    this.y = 0;
    this.line = 0;
    this.hash = "";
};

let _tmpRect = cc.rect();

let _comp = null;

let _horizontalKernings = [];
let _lettersInfo = [];
let _linesWidth = [];
let _linesOffsetX = [];

let _fntConfig = null;
let _numberOfLines = 0;
let _textDesiredHeight =  0;
let _letterOffsetY =  0;
let _tailoredTopY =  0;

let _tailoredBottomY =  0;
let _bmfontScale =  1.0;

let _lineBreakWithoutSpaces =  false;
let _spriteFrame = null;
let _lineSpacing = 0;
let _contentSize = cc.size();
let _string = '';
let _fontSize = 0;
let _originFontSize = 0;
let _hAlign = 0;
let _vAlign = 0;
let _spacingX = 0;
let _lineHeight = 0;
let _overflow = 0;
let _isWrapText = false;
let _labelWidth = 0;
let _labelHeight = 0;
let _maxLineWidth = 0;

export default class BmfontAssembler extends Assembler2D {
    updateRenderData (comp) {
        if (!comp._vertsDirty) return;
        if (_comp === comp) return;

        _comp = comp;
        
        this._reserveQuads(comp, splitter.splitGraphemes(comp.string.toString()).length);
        this._updateFontFamily(comp);
        this._updateProperties(comp);
        this._updateLabelInfo(comp);
        this._updateContent();
        this.updateWorldVerts(comp);
        
        _comp._actualFontSize = _fontSize;
        _comp.node.setContentSize(_contentSize);

        _comp._vertsDirty = false;
        _comp = null;
        this._resetProperties();
    }

    _updateFontScale () {
        _bmfontScale = _fontSize / _originFontSize;
    }

    _updateFontFamily (comp) {
        let fontAsset = comp.font;
        _spriteFrame = fontAsset.spriteFrame;
        _fntConfig = fontAsset._fntConfig;
        shareLabelInfo.fontAtlas = fontAsset._fontDefDictionary;

        this.packToDynamicAtlas(comp, _spriteFrame);
    }

    _updateLabelInfo() {
        // clear
        shareLabelInfo.hash = "";
        shareLabelInfo.margin = 0;
    }

    _updateProperties (comp) {
        _string = splitter.splitGraphemes(comp.string.toString());
        _fontSize = comp.fontSize;
        _originFontSize = _fntConfig ? _fntConfig.fontSize : comp.fontSize;
        _hAlign = comp.horizontalAlign;
        _vAlign = comp.verticalAlign;
        _spacingX = comp.spacingX;
        _overflow = comp.overflow;
        _lineHeight = comp._lineHeight;
        
        _contentSize.width = comp.node.width;
        _contentSize.height = comp.node.height;

        // should wrap text
        if (_overflow === Overflow.NONE) {
            _isWrapText = false;
            _contentSize.width += shareLabelInfo.margin * 2;
            _contentSize.height += shareLabelInfo.margin * 2;
        }
        else if (_overflow === Overflow.RESIZE_HEIGHT) {
            _isWrapText = true;
            _contentSize.height += shareLabelInfo.margin * 2;
        }
        else {
            _isWrapText = comp.enableWrapText;
        }
        
        shareLabelInfo.lineHeight = _lineHeight;
        shareLabelInfo.fontSize = _fontSize;

        this._setupBMFontOverflowMetrics();
    }

    _resetProperties () {
        _fntConfig = null;
        _spriteFrame = null;
        shareLabelInfo.hash = "";
        shareLabelInfo.margin = 0;
    }

    _updateContent () {
        this._updateFontScale();
        this._computeHorizontalKerningForText();
        this._alignText();
    }

    _computeHorizontalKerningForText () {
        let string = _string;
        let stringLen = string.length;

        let horizontalKernings = _horizontalKernings;
        let kerningDict;
        _fntConfig && (kerningDict = _fntConfig.kerningDict);
        if (kerningDict && !cc.js.isEmptyObject(kerningDict)) {
            let prev = -1;
            for (let i = 0; i < stringLen; ++i) {
                let key = string[i];
                let kerningAmount = kerningDict[(prev << 16) | (key & 0xffff)] || 0;
                if (i < stringLen - 1) {
                    horizontalKernings[i] = kerningAmount;
                } else {
                    horizontalKernings[i] = 0;
                }
                prev = key;
            }
        } else {
            horizontalKernings.length = 0;
        }
    }

    _multilineTextWrap (nextTokenFunc) {
        let textLen = _string.length;

        let lineIndex = 0;
        let nextTokenX = 0;
        let nextTokenY = 0;
        let longestLine = 0;
        let letterRight = 0;

        let highestY = 0;
        let lowestY = 0;
        let letterDef = null;
        let letterPosition = cc.v2(0, 0);

        for (let index = 0; index < textLen;) {
            let character = _string[index];
            if (character === "\n") {
                _linesWidth.push(letterRight);
                letterRight = 0;
                lineIndex++;
                nextTokenX = 0;
                nextTokenY -= _lineHeight * this._getFontScale() + _lineSpacing;
                this._recordPlaceholderInfo(index, character);
                index++;
                continue;
            }

            let tokenLen = nextTokenFunc(_string, index, textLen);
            let tokenHighestY = highestY;
            let tokenLowestY = lowestY;
            let tokenRight = letterRight;
            let nextLetterX = nextTokenX;
            let newLine = false;

            for (let tmp = 0; tmp < tokenLen; ++tmp) {
                let letterIndex = index + tmp;
                character = _string[letterIndex];
                if (character === "\r") {
                    this._recordPlaceholderInfo(letterIndex, character);
                    continue;
                }
                letterDef = shareLabelInfo.fontAtlas.getLetterDefinitionForChar(character, shareLabelInfo);
                if (!letterDef) {
                    this._recordPlaceholderInfo(letterIndex, character);
                    let atlasName = "";
                    _fntConfig && (atlasName = _fntConfig.atlasName);
                    console.log("Can't find letter definition in texture atlas " + atlasName + " for letter:" + character);
                    continue;
                }

                let letterX = nextLetterX + letterDef.offsetX * _bmfontScale - shareLabelInfo.margin;

                if (_isWrapText
                    && _maxLineWidth > 0
                    && nextTokenX > 0
                    && letterX + letterDef.w * _bmfontScale > _maxLineWidth
                    && !textUtils.isUnicodeSpace(character)) {
                    _linesWidth.push(letterRight);
                    letterRight = 0;
                    lineIndex++;
                    nextTokenX = 0;
                    nextTokenY -= (_lineHeight * this._getFontScale() + _lineSpacing);
                    newLine = true;
                    break;
                } else {
                    letterPosition.x = letterX;
                }

                letterPosition.y = nextTokenY - letterDef.offsetY * _bmfontScale  + shareLabelInfo.margin;
                this._recordLetterInfo(letterPosition, character, letterIndex, lineIndex);

                if (letterIndex + 1 < _horizontalKernings.length && letterIndex < textLen - 1) {
                    nextLetterX += _horizontalKernings[letterIndex + 1];
                }

                nextLetterX += letterDef.xAdvance * _bmfontScale + _spacingX  - shareLabelInfo.margin * 2;

                tokenRight = letterPosition.x + letterDef.w * _bmfontScale  - shareLabelInfo.margin;

                if (tokenHighestY < letterPosition.y) {
                    tokenHighestY = letterPosition.y;
                }

                if (tokenLowestY > letterPosition.y - letterDef.h * _bmfontScale) {
                    tokenLowestY = letterPosition.y - letterDef.h * _bmfontScale;
                }

            } //end of for loop

            if (newLine) continue;

            nextTokenX = nextLetterX;
            letterRight = tokenRight;

            if (highestY < tokenHighestY) {
                highestY = tokenHighestY;
            }
            if (lowestY > tokenLowestY) {
                lowestY = tokenLowestY;
            }
            if (longestLine < letterRight) {
                longestLine = letterRight;
            }

            index += tokenLen;
        } //end of for loop

        _linesWidth.push(letterRight);

        _numberOfLines = lineIndex + 1;
        _textDesiredHeight = _numberOfLines * _lineHeight * this._getFontScale();
        if (_numberOfLines > 1) {
            _textDesiredHeight += (_numberOfLines - 1) * _lineSpacing;
        }

        _contentSize.width = _labelWidth;
        _contentSize.height = _labelHeight;
        if (_labelWidth <= 0) {
            _contentSize.width = parseFloat(longestLine.toFixed(2)) + shareLabelInfo.margin * 2;
        }
        if (_labelHeight <= 0) {
            _contentSize.height = parseFloat(_textDesiredHeight.toFixed(2)) + shareLabelInfo.margin * 2;
        }

        _tailoredTopY = _contentSize.height;
        _tailoredBottomY = 0;

        if (_overflow !== Overflow.CLAMP) {
            if (highestY > 0) {
                _tailoredTopY = _contentSize.height + highestY;
            }
    
            if (lowestY < -_textDesiredHeight) {
                _tailoredBottomY = _textDesiredHeight + lowestY;
            }
        }

        return true;
    }

    _getFirstCharLen () {
        return 1;
    }

    _getFontScale () {
        return _overflow === Overflow.SHRINK ? _bmfontScale : 1;
    }

    _getFirstWordLen (text, startIndex, textLen) {
        let character = text[startIndex];
        if (textUtils.isUnicodeCJK(character)
            || character === "\n"
            || textUtils.isUnicodeSpace(character)) {
            return 1;
        }

        let len = 1;
        let letterDef = shareLabelInfo.fontAtlas.getLetterDefinitionForChar(character, shareLabelInfo);
        if (!letterDef) {
            return len;
        }
        let nextLetterX = letterDef.xAdvance * _bmfontScale + _spacingX;
        let letterX;
        for (let index = startIndex + 1; index < textLen; ++index) {
            character = text[index];

            letterDef = shareLabelInfo.fontAtlas.getLetterDefinitionForChar(character, shareLabelInfo);
            if (!letterDef) {
                break;
            }
            letterX = nextLetterX + letterDef.offsetX * _bmfontScale;

            if(letterX + letterDef.w * _bmfontScale > _maxLineWidth
               && !textUtils.isUnicodeSpace(character)
               && _maxLineWidth > 0) {
                return len;
            }
            nextLetterX += letterDef.xAdvance * _bmfontScale + _spacingX;
            if (character === "\n"
                || textUtils.isUnicodeSpace(character)
                || textUtils.isUnicodeCJK(character)) {
                break;
            }
            len++;
        }

        return len;
    }

    _multilineTextWrapByWord () {
        return this._multilineTextWrap(this._getFirstWordLen);
    }

    _multilineTextWrapByChar () {
        return this._multilineTextWrap(this._getFirstCharLen);
    }

    _recordPlaceholderInfo (letterIndex, char) {
        if (letterIndex >= _lettersInfo.length) {
            let tmpInfo = new LetterInfo();
            _lettersInfo.push(tmpInfo);
        }

        _lettersInfo[letterIndex].char = char;
        _lettersInfo[letterIndex].hash = textUtils.charToCodeString(char) + shareLabelInfo.hash;
        _lettersInfo[letterIndex].valid = false;
    }

    _recordLetterInfo (letterPosition, character, letterIndex, lineIndex) {
        if (letterIndex >= _lettersInfo.length) {
            let tmpInfo = new LetterInfo();
            _lettersInfo.push(tmpInfo);
        }
        let char = textUtils.charToCodeString(character);
        let key = char + shareLabelInfo.hash;

        _lettersInfo[letterIndex].line= lineIndex;
        _lettersInfo[letterIndex].char = character;
        _lettersInfo[letterIndex].hash = key;
        _lettersInfo[letterIndex].valid = shareLabelInfo.fontAtlas.getLetter(key).valid;
        _lettersInfo[letterIndex].x = letterPosition.x;
        _lettersInfo[letterIndex].y = letterPosition.y;
    }

    _alignText () {
        _textDesiredHeight = 0;
        _linesWidth.length = 0;

        if (!_lineBreakWithoutSpaces) {
            this._multilineTextWrapByWord();
        } else {
            this._multilineTextWrapByChar();
        }

        this._computeAlignmentOffset();

        //shrink
        if (_overflow === Overflow.SHRINK) {
            if (_fontSize > 0 && this._isVerticalClamp()) {
                this._shrinkLabelToContentSize(this._isVerticalClamp);
            }
        }

        if (!this._updateQuads()) {
            if (_overflow === Overflow.SHRINK) {
                this._shrinkLabelToContentSize(this._isHorizontalClamp);
            }
        }
    }

    _scaleFontSizeDown (fontSize) {
        let shouldUpdateContent = true;
        if (!fontSize) {
            fontSize = 0.1;
            shouldUpdateContent = false;
        }
        _fontSize = fontSize;

        if (shouldUpdateContent) {
            this._updateContent();
        }
    }

    _shrinkLabelToContentSize (lambda) {
        let fontSize = _fontSize;

        let left = 0, right = fontSize | 0, mid = 0;
        while (left < right) {
            mid = (left + right + 1) >> 1;

            let newFontSize = mid;
            if (newFontSize <= 0) {
                break;
            }

            _bmfontScale = newFontSize / _originFontSize;
            
            if (!_lineBreakWithoutSpaces) {
                this._multilineTextWrapByWord();
            } else {
                this._multilineTextWrapByChar();
            }
            this._computeAlignmentOffset();

            if (lambda()) {
                right = mid - 1;
            } else {
                left = mid;
            }
        }

        let actualFontSize = left;
        if (actualFontSize >= 0) {
            this._scaleFontSizeDown(actualFontSize);
        }
    }

    _isVerticalClamp () {
        if (_textDesiredHeight > _contentSize.height) {
            return true;
        } else {
            return false;
        }
    }

    _isHorizontalClamp () {
        let letterClamp = false;
        for (let ctr = 0, l = _string.length; ctr < l; ++ctr) {
            let letterInfo = _lettersInfo[ctr];
            if (letterInfo.valid) {
                let letterDef = shareLabelInfo.fontAtlas.getLetter(letterInfo.hash);

                let px = letterInfo.x + letterDef.w * _bmfontScale;
                let lineIndex = letterInfo.line;
                if (_labelWidth > 0) {
                    if (!_isWrapText) {
                        if(px > _contentSize.width){
                            letterClamp = true;
                            break;
                        }
                    }else{
                        let wordWidth = _linesWidth[lineIndex];
                        if (wordWidth > _contentSize.width && (px > _contentSize.width || px < 0)) {
                            letterClamp = true;
                            break;
                        }
                    }
                }
            }
        }

        return letterClamp;
    }

    _isHorizontalClamped (px, lineIndex) {
        let wordWidth = _linesWidth[lineIndex];
        let letterOverClamp = (px > _contentSize.width || px < 0);

        if(!_isWrapText){
            return letterOverClamp;
        }else{
            return (wordWidth > _contentSize.width && letterOverClamp);
        }
    }

    _updateQuads () {
        let texture = _spriteFrame ? _spriteFrame._texture : shareLabelInfo.fontAtlas.getTexture();

        let node = _comp.node;

        this.verticesCount = this.indicesCount = 0;
        
        // Need to reset dataLength in Canvas rendering mode.
        this._renderData && (this._renderData.dataLength = 0);

        let contentSize = _contentSize,
            appx = node._anchorPoint.x * contentSize.width,
            appy = node._anchorPoint.y * contentSize.height;
        
        let ret = true;
        for (let ctr = 0, l = _string.length; ctr < l; ++ctr) {
            let letterInfo = _lettersInfo[ctr];
            if (!letterInfo.valid) continue;
            let letterDef = shareLabelInfo.fontAtlas.getLetter(letterInfo.hash);

            _tmpRect.height = letterDef.h;
            _tmpRect.width = letterDef.w;
            _tmpRect.x = letterDef.u;
            _tmpRect.y = letterDef.v;

            let py = letterInfo.y + _letterOffsetY;

            if (_labelHeight > 0) {
                if (py > _tailoredTopY) {
                    let clipTop = py - _tailoredTopY;
                    _tmpRect.y += clipTop;
                    _tmpRect.height -= clipTop;
                    py = py - clipTop;
                }

                if ((py - letterDef.h * _bmfontScale < _tailoredBottomY) && _overflow === Overflow.CLAMP) {
                    _tmpRect.height = (py < _tailoredBottomY) ? 0 : (py - _tailoredBottomY) / _bmfontScale;
                }
            }

            let lineIndex = letterInfo.line;
            let px = letterInfo.x + letterDef.w / 2 * _bmfontScale + _linesOffsetX[lineIndex];

            if (_labelWidth > 0) {
                if (this._isHorizontalClamped(px, lineIndex)) {
                    if (_overflow === Overflow.CLAMP) {
                        _tmpRect.width = 0;
                    } else if (_overflow === Overflow.SHRINK) {
                        if (_contentSize.width > letterDef.w) {
                            ret = false;
                            break;
                        } else {
                            _tmpRect.width = 0;
                        }
                    }
                }
            }

            if (_tmpRect.height > 0 && _tmpRect.width > 0) {
                let isRotated = this._determineRect(_tmpRect);
                let letterPositionX = letterInfo.x + _linesOffsetX[letterInfo.line];
                this.appendQuad(_comp, texture, _tmpRect, isRotated, letterPositionX - appx, py - appy, _bmfontScale);
            }
        }
        this._quadsUpdated(_comp);

        return ret;
    }

    _determineRect (tempRect) {
        let isRotated = _spriteFrame.isRotated();

        let originalSize = _spriteFrame._originalSize;
        let rect = _spriteFrame._rect;
        let offset = _spriteFrame._offset;
        let trimmedLeft = offset.x + (originalSize.width - rect.width) / 2;
        let trimmedTop = offset.y - (originalSize.height - rect.height) / 2;

        if(!isRotated) {
            tempRect.x += (rect.x - trimmedLeft);
            tempRect.y += (rect.y + trimmedTop);
        } else {
            let originalX = tempRect.x;
            tempRect.x = rect.x + rect.height - tempRect.y - tempRect.height - trimmedTop;
            tempRect.y = originalX + rect.y - trimmedLeft;
            if (tempRect.y < 0) {
                tempRect.height = tempRect.height + trimmedTop;
            }
        }

        return isRotated;
    }

    _computeAlignmentOffset () {
        _linesOffsetX.length = 0;
        
        switch (_hAlign) {
            case macro.TextAlignment.LEFT:
                for (let i = 0; i < _numberOfLines; ++i) {
                    _linesOffsetX.push(0);
                }
                break;
            case macro.TextAlignment.CENTER:
                for (let i = 0, l = _linesWidth.length; i < l; i++) {
                    _linesOffsetX.push((_contentSize.width - _linesWidth[i]) / 2);
                }
                break;
            case macro.TextAlignment.RIGHT:
                for (let i = 0, l = _linesWidth.length; i < l; i++) {
                    _linesOffsetX.push(_contentSize.width - _linesWidth[i]);
                }
                break;
            default:
                break;
        }

        // TOP
        _letterOffsetY = _contentSize.height;
        if (_vAlign !== macro.VerticalTextAlignment.TOP) {
            let blank = _contentSize.height - _textDesiredHeight + _lineHeight * this._getFontScale() - _originFontSize * _bmfontScale;
            if (_vAlign === macro.VerticalTextAlignment.BOTTOM) {
                // BOTTOM
                _letterOffsetY -= blank;
            } else {
                // CENTER:
                _letterOffsetY -= blank / 2;
            }
        }
    }

    _setupBMFontOverflowMetrics () {
        let newWidth = _contentSize.width,
            newHeight = _contentSize.height;

        if (_overflow === Overflow.RESIZE_HEIGHT) {
            newHeight = 0;
        }

        if (_overflow === Overflow.NONE) {
            newWidth = 0;
            newHeight = 0;
        }

        _labelWidth = newWidth;
        _labelHeight = newHeight;
        _maxLineWidth = newWidth;
    }

    updateWorldVerts() {}

    appendQuad (comp, texture, rect, rotated, x, y, scale) {}
    _quadsUpdated (comp) {}

    _reserveQuads () {}
}