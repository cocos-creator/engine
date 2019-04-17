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

/**
 * !#en Outline effect used to change the display, only used for TTF font
 * !#zh 描边效果组件,用于字体描边,只能用于系统字体
 * @class LabelOutline
 * @extends Component
 * @example
 *  // Create a new node and add label components.
 *  var node = new cc.Node("New Label");
 *  var label = node.addComponent(cc.Label);
 *  var outline = node.addComponent(cc.LabelOutline);
 *  node.parent = this.node;
 */

import { Color } from '../../../core/value-types';
import { LabelComponent } from './label-component';
import { UIComponent } from './ui-component';

export class LabelOutlineComponent extends UIComponent {
    private _color = new Color(255, 255, 255, 255);
    private _width = 1;

    /**
     * !#en Change the outline color
     * !#zh 改变描边的颜色
     * @property color
     * @type {Color}
     * @example
     * outline.color = new cc.Color(0.5, 0.3, 0.7, 1.0);;
     */
    get color () {
        return this._color;
    }
    set color (value) {
        if (this._color === value){
            return;
        }

        this._color = value;
        this._updateRenderData();
    }

    /**
     * !#en Change the outline width
     * !#zh 改变描边的宽度
     * @property width
     * @type {Number}
     * @example
     * outline.width = 3;
     */
    get width () {
        return this._width;
    }

    set width (value) {
        if (this._width === value) {
            return;
        }

        this._width = value;
        this._updateRenderData();
    }

    private _updateRenderData () {
        const label = this.node.getComponent(LabelComponent);
        if (label) {
            label.updateRenderData(true);
        }
    }
}

cc.LabelOutlineComponent = LabelOutlineComponent;
