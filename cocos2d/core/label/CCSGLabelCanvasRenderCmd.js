/****************************************************************************
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2014 Chukong Technologies Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

 ****************************************************************************/
(function () {
    _ccsg.Label.TTFLabelBaker = function () {

    };

    var proto = _ccsg.Label.TTFLabelBaker.prototype = Object.create(Object.prototype);

    proto._getLineHeight = function () {
        //todo refine it
        var nodeSpacingY = this._node.getLineHeight();
        if (nodeSpacingY === 0) {
            nodeSpacingY = this._drawFontsize;
        }
        else {
            nodeSpacingY = nodeSpacingY * this._drawFontsize / this._node._fontSize;
        }
        return nodeSpacingY | 0;
    };

    proto._prepareQuad = function () {
        var quad = this._quad;
        var white = cc.color(255, 255, 255, this._displayedOpacity);
        var width = this._node._contentSize.width;
        var height = this._node._contentSize.height;
        quad._bl.colors = white;
        quad._br.colors = white;
        quad._tl.colors = white;
        quad._tr.colors = white;

        quad._bl.vertices = new cc.Vertex3F(0, 0, 0);
        quad._br.vertices = new cc.Vertex3F(width, 0, 0);
        quad._tl.vertices = new cc.Vertex3F(0, height, 0);
        quad._tr.vertices = new cc.Vertex3F(width, height, 0);

        //texture coordinate should be y-flipped
        quad._bl.texCoords = new cc.Tex2F(0, 1);
        quad._br.texCoords = new cc.Tex2F(1, 1);
        quad._tl.texCoords = new cc.Tex2F(0, 0);
        quad._tr.texCoords = new cc.Tex2F(1, 0);

        this._quadDirty = true;
    };

    var label_wrapinspection = true;

    //Support: English French German
    //Other as Oriental Language
    var label_wordRex = /([a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôû]+|\S)/;
    var label_symbolRex = /^[!,.:;}\]%\?>、‘“》？。，！]/;
    var label_lastWordRex = /([a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôû]+|\S)$/;
    var label_lastEnglish = /[a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôû]+$/;
    var label_firsrEnglish = /^[a-zA-Z0-9ÄÖÜäöüßéèçàùêâîôû]/;

    proto._fragmentText = function (strArr, maxWidth, ctx) {
        //check the first character

        var wrappedWords = [];
        //fast return if strArr is empty
        if(strArr.length === 0) {
            wrappedWords.push('');
            return wrappedWords;
        }
        var text = strArr;
        var allWidth = ctx.measureText(text).width;
        while (allWidth > maxWidth && text.length > 1) {

            var fuzzyLen = text.length * ( maxWidth / allWidth ) | 0;
            var tmpText = text.substr(fuzzyLen);
            var width = allWidth - ctx.measureText(tmpText).width;
            var sLine = tmpText;
            var pushNum = 0;

            //Increased while cycle maximum ceiling. default 100 time
            var checkWhile = 0;

            //Exceeded the size
            while (width > maxWidth && checkWhile++ < 100) {
                fuzzyLen *= maxWidth / width;
                fuzzyLen = fuzzyLen | 0;
                tmpText = text.substr(fuzzyLen);
                width = allWidth - ctx.measureText(tmpText).width;
            }

            checkWhile = 0;

            //Find the truncation point
            while (width < maxWidth && checkWhile++ < 100) {
                if (tmpText) {
                    var exec = label_wordRex.exec(tmpText);
                    pushNum = exec ? exec[0].length : 1;
                    sLine = tmpText;
                }

                fuzzyLen = fuzzyLen + pushNum;
                tmpText = text.substr(fuzzyLen);
                width = allWidth - ctx.measureText(tmpText).width;
            }

            fuzzyLen -= pushNum;
            if (fuzzyLen === 0) {
                fuzzyLen = 1;
                sLine = sLine.substr(1);
            }

            var sText = text.substr(0, fuzzyLen), result;

            //symbol in the first
            if (label_wrapinspection) {
                if (label_symbolRex.test(sLine || tmpText)) {
                    result = label_lastWordRex.exec(sText);
                    fuzzyLen -= result ? result[0].length : 0;
                    if (fuzzyLen === 0) fuzzyLen = 1;

                    sLine = text.substr(fuzzyLen);
                    sText = text.substr(0, fuzzyLen);
                }
            }

            //To judge whether a English words are truncated
            if (label_firsrEnglish.test(sLine)) {
                result = label_lastEnglish.exec(sText);
                if (result && sText !== result[0]) {
                    fuzzyLen -= result[0].length;
                    sLine = text.substr(fuzzyLen);
                    sText = text.substr(0, fuzzyLen);
                }
            }
            wrappedWords.push(sText);
            text = sLine || tmpText;
            allWidth = ctx.measureText(text).width;
        }
        if (text.length > 0) {
            wrappedWords.push(text);
        }

        return wrappedWords;
    };

    proto._updateDisplayOpacity = function (parentOpacity) {
        _ccsg.Node.RenderCmd.prototype._updateDisplayOpacity.call(this, parentOpacity);
        //specify opacity to quad
        var color = cc.color(255, 255, 255, this._displayedOpacity);
        var quad = this._quad;
        quad._bl.colors = color;
        quad._br.colors = color;
        quad._tl.colors = color;
        quad._tr.colors = color;
        this._quadDirty = true;
    };

    proto._updateDisplayColor = function (parentColor) {
        _ccsg.Node.RenderCmd.prototype._updateDisplayColor.call(this, parentColor);
        var node = this._node;
        node._labelSkinDirty = true;
    };

    proto._calculateLabelFont = function(canvasSize) {
        var node = this._node;
        var paragraphedStrings = node._string.split('\n');

        this._drawFontsize = node._fontSize;
        var fontDesc = this._drawFontsize.toString() + 'px ';
        var fontFamily = node._fontHandle.length === 0 ? 'serif' : node._fontHandle;
        fontDesc = fontDesc + fontFamily;
        this._labelContext.font = fontDesc;

        var paragraphLength = this._calculateParagraphLength(paragraphedStrings, this._labelContext);

        if (_ccsg.Label.Overflow.SHRINK === node._overFlow) {
            this._splitedStrings = paragraphedStrings;
            var i;

            if (node._isWrapText) {
                var totalLength = 0;
                for (i = 0; i < paragraphedStrings.length; ++i) {
                    totalLength += ((paragraphLength[i] / canvasSize.width + 1) | 0) * canvasSize.width;
                }
                var scale = canvasSize.width * ((canvasSize.height / this._getLineHeight()) | 0) / totalLength;
                this._drawFontsize = (this._drawFontsize * Math.min(Math.sqrt(scale), 1)) | 0;
                fontDesc = this._drawFontsize.toString() + 'px ' + fontFamily;
                this._labelContext.font = fontDesc;
            }
            else {
                var maxLength = 0;
                var totalHeight = paragraphedStrings.length * this._getLineHeight();

                for (i = 0; i < paragraphedStrings.length; ++i) {
                    if (maxLength < paragraphLength[i]) maxLength = paragraphLength[i];
                }
                var scaleX = canvasSize.width / maxLength;
                var scaleY = canvasSize.height / totalHeight;

                this._drawFontsize = (this._drawFontsize * Math.min(1, scaleX, scaleY)) | 0;
                fontDesc = this._drawFontsize.toString() + 'px ' + fontFamily;
            }
        }

        return fontDesc;
    };

    proto._calculateParagraphLength = function(paragraphedStrings, ctx) {
        var paragraphLength = [];

        for (var i = 0; i < paragraphedStrings.length; ++i) {
            var textMetric = ctx.measureText(paragraphedStrings[i]);
            paragraphLength.push(textMetric.width);
        }

        return paragraphLength;
    };

    proto._calculateCanvasSize = function() {
        var node = this._node;
        var canvasWidth = node._contentSize.width;
        var canvasHeight = node._contentSize.height;
        if (canvasWidth <= 0) canvasWidth = 1;
        if (canvasHeight <= 0) canvasHeight = 1;

        return cc.size(canvasWidth, canvasHeight);
    };

    proto._calculateSplitedStrings = function(canvasSize) {
        var node = this._node;
        var ctx = this._labelContext;

        var paragraphedStrings = node._string.split('\n');

        var i;
        if (node._isWrapText) {
            this._splitedStrings = [];
            for (i = 0; i < paragraphedStrings.length; ++i) {
                this._splitedStrings = this._splitedStrings.concat(this._fragmentText(paragraphedStrings[i], canvasSize.width, ctx));
            }
        }
        else {
            this._splitedStrings = paragraphedStrings;
        }

    };

    proto._updateLabelDimensions = function(canvasSize, ctx) {
        var node = this._node;
        var paragraphedStrings = node._string.split('\n');
        var i;

        if (_ccsg.Label.Overflow.RESIZE_HEIGHT === node._overFlow) {
            canvasSize.height = this._splitedStrings.length * this._getLineHeight();
            _ccsg.Node.prototype.setContentSize.call(node, canvasSize);
        }
        else if(_ccsg.Label.Overflow.NONE === node._overFlow) {
            this._splitedStrings = paragraphedStrings;
            var canvasSizeX = 0;
            var canvasSizeY = 0;
            for (i = 0; i < paragraphedStrings.length; ++i) {
                var paraLength = ctx.measureText(paragraphedStrings[i]).width;
                canvasSizeX = canvasSizeX > paraLength ? canvasSizeX : paraLength;
            }
            canvasSizeY = this._splitedStrings.length * this._getLineHeight();

            canvasSize.width = canvasSizeX;
            canvasSize.height = canvasSizeY;
            _ccsg.Node.prototype.setContentSize.call(node, canvasSize);
        }

        this._labelCanvas.width = canvasSize.width;
        this._labelCanvas.height = canvasSize.height;

        this._labelContext.clearRect(0, 0, this._labelCanvas.width, this._labelCanvas.height);
    };

    proto._calculateFillTextStartPosition = function(canvasSize) {
        var node = this._node;
        var lineHeight = this._getLineHeight();
        var lineCount = this._splitedStrings.length;
        var labelX;
        var firstLinelabelY;

        if (cc.TextAlignment.RIGHT === node._hAlign) {
            labelX = canvasSize.width;
        }
        else if (cc.TextAlignment.CENTER === node._hAlign) {
            labelX = canvasSize.width / 2;
        }
        else {
            labelX = 0;
        }

        if (cc.VerticalTextAlignment.TOP === node._vAlign) {
            firstLinelabelY = 0;
        }
        else if (cc.VerticalTextAlignment.CENTER === node._vAlign) {
            firstLinelabelY = canvasSize.height / 2 - lineHeight * (lineCount - 1) / 2;
        }
        else {
            firstLinelabelY = canvasSize.height - lineHeight * (lineCount - 1);
        }

        return cc.p(labelX, firstLinelabelY);
    };

    proto._calculateTextBaseline = function() {
        var node = this._node;
        var hAlign;
        var vAlign;

        if (cc.TextAlignment.RIGHT === node._hAlign) {
            hAlign = 'right';
        }
        else if (cc.TextAlignment.CENTER === node._hAlign) {
            hAlign = 'center';
        }
        else {
            hAlign = 'left';
        }

        this._labelContext.textAlign = hAlign;
        if (cc.VerticalTextAlignment.TOP === node._vAlign) {
            vAlign = 'top';
        }
        else if (cc.VerticalTextAlignment.CENTER === node._vAlign) {
            vAlign = 'middle';
        }
        else {
            vAlign = 'bottom';
        }
        this._labelContext.textBaseline = vAlign;
    };

    proto._bakeLabel = function () {
        var node = this._node;
        this._drawFontsize = node._fontSize;

        var canvasSize = this._calculateCanvasSize();

        //Note: don't change the calling order of the following 3 statements
        var fontDesc = this._calculateLabelFont(canvasSize);
        this._calculateSplitedStrings(canvasSize);
        this._updateLabelDimensions(canvasSize, this._labelContext);

        //this._labelContext.fillStyle = "rgb(128,128,128)";
        //this._labelContext.fillRect(0,0,this._labelCanvas.width,this._labelCanvas.height);
        var color = this._displayedColor;
        this._labelContext.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';

        this._calculateTextBaseline();

        var startPosition = this._calculateFillTextStartPosition(canvasSize);
        var lineHeight = this._getLineHeight();

        this._labelContext.font = fontDesc;
        //do real rendering
        for (var i = 0; i < this._splitedStrings.length; ++i) {
            this._labelContext.fillText(this._splitedStrings[i], startPosition.x, startPosition.y + i * lineHeight);
        }

        this._labelTexture._textureLoaded = false;
        this._labelTexture.handleLoadedTexture();
    };

    proto._rebuildLabelSkin = function () {
        var node = this._node;
        if (node._labelSkinDirty) {
            if (node._labelType === _ccsg.Label.Type.TTF ||
                node._labelType === _ccsg.Label.Type.SystemFont) {
                this._bakeLabel();
                this._prepareQuad();
            }
            else {
                node._updateContent();
            }
            this._node._labelSkinDirty = false;
        }
    };
})();

(function () {
    _ccsg.Label.CanvasRenderCmd = function (renderableObject) {
        _ccsg.Node.CanvasRenderCmd.call(this, renderableObject);
        this._needDraw = true;
        this._labelTexture = new cc.Texture2D();
        this._labelCanvas = document.createElement('canvas');
        this._labelCanvas.width = 1;
        this._labelCanvas.height = 1;
        this._labelContext = this._labelCanvas.getContext('2d');
        this._labelTexture.initWithElement(this._labelCanvas);
        this._quad = new cc.V3F_C4B_T2F_Quad();
        this._quadDirty = true;
        this._splitedStrings = null;
        this._drawFontsize = 0;
        this._realRenderingSize = cc.size(-10, -10);
    };

    var proto = _ccsg.Label.CanvasRenderCmd.prototype = Object.create(_ccsg.Node.CanvasRenderCmd.prototype);
    cc.js.mixin(proto, _ccsg.Label.TTFLabelBaker.prototype);

    proto.constructor = _ccsg.Label.CanvasRenderCmd;

    proto.rendering = function (ctx, scaleX, scaleY) {
        this._rebuildLabelSkin();

        var node = this._node;
        this._realRenderingSize = _ccsg.Node.prototype.getContentSize.call(node);

        if (node._labelType === _ccsg.Label.Type.TTF ||
            node._labelType === _ccsg.Label.Type.SystemFont) {
            var locDisplayOpacity = this._displayedOpacity;
            var alpha = locDisplayOpacity / 255;

            if (locDisplayOpacity === 0)
                return;

            var wrapper = ctx || cc._renderContext,
                context = wrapper.getContext();
            wrapper.setTransform(this._worldTransform, scaleX, scaleY);
            wrapper.setCompositeOperation(_ccsg.Node.CanvasRenderCmd._getCompositeOperationByBlendFunc(node._blendFunc));
            wrapper.setGlobalAlpha(alpha);

            if (this._labelTexture) {
                var sx, sy, sw, sh;
                var x, y, w, h;

                x = 0;
                y = -this._node._contentSize.height;
                w = this._node._contentSize.width;
                h = this._node._contentSize.height;


                var textureWidth = this._labelTexture.getPixelWidth();
                var textureHeight = this._labelTexture.getPixelHeight();

                sx = 0;
                sy = 0;
                sw = textureWidth;
                sh = textureHeight;

                x = x * scaleX;
                y = y * scaleY;
                w = w * scaleX;
                h = h * scaleY;

                var image = this._labelTexture._htmlElementObj;
                if (this._labelTexture._pattern !== '') {
                    wrapper.setFillStyle(context.createPattern(image, this._labelTexture._pattern));
                    context.fillRect(x, y, w, h);
                }
                else {
                    if(sw !== 0 && sh !== 0 && w !== 0 && h !== 0) {
                        context.drawImage(image,
                            sx, sy, sw, sh,
                            x, y, w, h);
                    }
                }
            }
            cc.g_NumberOfDraws = cc.g_NumberOfDraws + 1;
        }

    };

})();
