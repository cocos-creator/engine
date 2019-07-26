/*
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2012 James Chen
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
*/

/**
 * @hidden
 */

import { ccclass } from '../../../../core/data/class-decorator';
import { macro } from '../../../../core/platform/CCMacro';
import { INode } from '../../../../core/utils/interfaces';
import { contains } from '../../../../core/utils/misc';
import { Color, Mat4, Size, Vec3 } from '../../../../core/value-types';
import * as math from '../../../../core/vmath';
import { UIRenderComponent } from '../ui-render-component';
import { EditBoxComponent} from './edit-box-component';
import { InputFlag, InputMode, KeyboardReturnType } from './types';

// https://segmentfault.com/q/1010000002914610
const SCROLLY = 40;
const LEFT_PADDING = 2;
const DELAY_TIME = 400;
const FOCUS_DELAY_UC = 400;
const FOCUS_DELAY_FIREFOX = 0;

const _matrix = new Mat4();
const _matrix_temp = new Mat4();
const _vec3 = new Vec3();

let _currentEditBoxImpl: EditBoxImpl | null = null;

// polyfill
const polyfill = {
    zoomInvalid: false,
};

if (cc.sys.OS_ANDROID === cc.sys.os &&
    (cc.sys.browserType === cc.sys.BROWSER_TYPE_SOUGOU ||
        cc.sys.browserType === cc.sys.BROWSER_TYPE_360)) {
    polyfill.zoomInvalid = true;
}

function getKeyboardReturnType (type) {
    switch (type) {
        case KeyboardReturnType.DEFAULT:
        case KeyboardReturnType.DONE:
            return 'done';
        case KeyboardReturnType.SEND:
            return 'send';
        case KeyboardReturnType.SEARCH:
            return 'search';
        case KeyboardReturnType.GO:
            return 'go';
        case KeyboardReturnType.NEXT:
            return 'next';
    }
    return 'done';
}

@ccclass
export class EditBoxImpl {
    public _delegate: EditBoxComponent | null = null;
    public _inputMode = -1;
    public _inputFlag = -1;
    public _returnType = KeyboardReturnType.DEFAULT;
    public _maxLength = 50;
    public _text = '';
    public _placeholderText = '';
    public _alwaysOnTop = false;
    public _size: Size = cc.size();
    public _node: INode | null = null;
    public _editing = false;
    public __eventListeners: any = {};
    public __fullscreen = false;
    public __autoResize = false;
    public __rotateScreen = false;
    public __orientationChanged: any;
    public _edTxt: HTMLInputElement | HTMLTextAreaElement | null = null;
    public _textColor: Color = Color.WHITE;
    public _edFontSize = 14;

    get text () {
        return this._text;
    }

    set text (value: string) {
        this._text = value;
    }

    get textColor () {
        return this._textColor;
    }

    get fontSize () {
        return this._edFontSize;
    }

    set returnType (value: KeyboardReturnType) {
        this._returnType = value;
    }

    get alwayOnTop () {
        return this._alwaysOnTop;
    }

    get editing (){
        return this._editing;
    }

    set editing (value: boolean) {
        this._editing = value;
    }

    get delegate () {
        return this._delegate;
    }

    get eventListeners () {
        return this.__eventListeners;
    }

    public onEnable () {
        if (!this._edTxt) {
            return;
        }
        if (this._alwaysOnTop) {
            this._edTxt.style.display = '';
        } else {
            this._edTxt.style.display = 'none';
        }
    }

    public onDisable () {
        if (!this._edTxt) {
            return;
        }
        this._edTxt.style.display = 'none';
    }

    public setTabIndex (index: number) {
        if (this._edTxt) {
            this._edTxt.tabIndex = index;
        }
    }

    public setFocus () {
        this._beginEditing();
    }

    public isFocused () {
        if (this._edTxt) {
            return document.activeElement === this._edTxt;
        }
        cc.warnID(4700);
        return false;
    }

    public stayOnTop (flag) {
        if (this._alwaysOnTop === flag || !this._edTxt) { return; }

        this._alwaysOnTop = flag;

        if (flag) {
            this._edTxt.style.display = '';
        } else {
            this._edTxt.style.display = 'none';
        }
    }

    public setMaxLength (maxLength: number) {
        if (!isNaN(maxLength)) {
            if (maxLength < 0) {
                // we can't set Number.MAX_VALUE to input's maxLength property
                // so we use a magic number here, it should works at most use cases.
                maxLength = 65535;
            }
            this._maxLength = maxLength;
            if (this._edTxt) {
                this._edTxt.maxLength = maxLength;
            }
        }
    }

    public setString (text: string) {
        this._text = text;
        if (this._edTxt) {
            this._edTxt.value = text;
        }
    }

    public getString () {
        return this._text;
    }

    public setPlaceholderText (text: string) {
        this._placeholderText = text;
    }

    public getPlaceholderText () {
        return this._placeholderText;
    }

    public setDelegate (delegate: EditBoxComponent | null) {
        this._delegate = delegate;
    }

    public setInputMode (inputMode: InputMode) {
        if (this._inputMode === inputMode) { return; }

        this._inputMode = inputMode;
        this.createInput();

        this._updateDomInputType();
        this._updateSize(this._size.width, this._size.height);
    }

    public setInputFlag (inputFlag: InputFlag) {
        if (this._inputFlag === inputFlag) { return; }

        this._inputFlag = inputFlag;
        this._updateDomInputType();

        let textTransform = 'none';

        if (inputFlag === InputFlag.INITIAL_CAPS_ALL_CHARACTERS) {
            textTransform = 'uppercase';
        } else if (inputFlag === InputFlag.INITIAL_CAPS_WORD) {
            textTransform = 'capitalize';
        }

        if (this._edTxt) {
            this._edTxt.style.textTransform = textTransform;
            this._edTxt.value = this._text;
        }
    }

    public setReturnType (returnType: KeyboardReturnType) {
        this._returnType = returnType;
        this._updateDomInputType();
    }

    public setFontSize (fontSize: number) {
        this._edFontSize = fontSize || this._edFontSize;
        if (this._edTxt) {
            this._edTxt.style.fontSize = this._edFontSize + 'px';
        }
    }

    public setFontColor (color: Color) {
        this._textColor = color;
        if (this._edTxt) {
            this._edTxt.style.color = color.toCSS('rgba');
        }
    }

    public setSize (width: number, height: number) {
        this._size.width = width;
        this._size.height = height;
        this._updateSize(width, height);
    }

    public setNode (node: INode) {
        this._node = node;
    }

    public update () {
        // TODO: find better way to update matrix
        // if (this._editing) {
        this._updateMatrix();
        // }
    }

    public clear () {
        this._node = null;
        this.setDelegate(null);
        this.removeDom();
    }

    public _onTouchBegan (touch) {

    }

    public _onTouchEnded () {
        this._beginEditing();
    }

    public _beginEditing () {
        if (cc.sys.isMobile && !this._editing) {
            // Pre adaptation
            this._beginEditingOnMobile();
        }

        const self = this;
        function startFocus () {
            self._edTxt && self._edTxt.focus();
        }

        if (this._edTxt) {
            this._edTxt.style.display = '';

            if (cc.sys.browserType === cc.sys.BROWSER_TYPE_UC) {
                setTimeout(startFocus, FOCUS_DELAY_UC);
            } else if (cc.sys.browserType === cc.sys.BROWSER_TYPE_FIREFOX) {
                setTimeout(startFocus, FOCUS_DELAY_FIREFOX);
            } else {
                startFocus();
            }
        }

        this._editing = true;
    }

    public _endEditing () {
        const self = this;
        const hideDomInputAndShowLabel = () => {
            if (!self._alwaysOnTop && self._edTxt) {
                self._edTxt.style.display = 'none';
            }
            if (self._delegate && self._delegate.editBoxEditingDidEnded) {
                self._delegate.editBoxEditingDidEnded();
            }
        };
        if (this._editing) {
            if (cc.sys.isMobile) {
                // Delay end editing adaptation to ensure virtual keyboard is disapeared
                setTimeout(() => {
                    self._endEditingOnMobile();
                    hideDomInputAndShowLabel();
                }, DELAY_TIME);
            } else {
                hideDomInputAndShowLabel();
            }
        }
        this._editing = false;
    }

    public _updateDomInputType () {
        const inputMode = this._inputMode;
        const edTxt = this._edTxt as HTMLInputElement;
        if (!edTxt) { return; }

        if (this._inputFlag === InputFlag.PASSWORD) {
            edTxt!.type = 'password';
            return;
        }

        let type = edTxt.type;
        if (inputMode === InputMode.EMAIL_ADDR) {
            type = 'email';
        } else if (inputMode === InputMode.NUMERIC || inputMode === InputMode.DECIMAL) {
            type = 'number';
        } else if (inputMode === InputMode.PHONE_NUMBER) {
            type = 'number';
            edTxt.pattern = '[0-9]*';
        } else if (inputMode === InputMode.URL) {
            type = 'url';
        } else {
            type = 'text';

            if (this._returnType === KeyboardReturnType.SEARCH) {
                type = 'search';
            }
        }

        edTxt.type = type;
    }

    public _updateSize (newWidth, newHeight) {
        const edTxt = this._edTxt;
        if (!edTxt) { return; }

        edTxt.style.width = newWidth + 'px';
        edTxt.style.height = newHeight + 'px';
    }

    public _updateMatrix () {
        if (!this._edTxt) { return; }

        const node = this._node;
        let scaleX = cc.view._scaleX;
        let scaleY = cc.view._scaleY;
        const viewport = cc.view._viewportRect;
        const dpr = cc.view._devicePixelRatio;

        node!.getWorldMatrix(_matrix);
        const transform = node!.uiTransfromComp;
        if (transform) {
            math.vec3.set(_vec3, -transform.anchorX * transform.width, -transform.anchorY * transform.height, _vec3.z);
        }

        math.mat4.translate(_matrix, _matrix, _vec3);

        // let camera;
        // can't find camera in editor
        // if (CC_EDITOR) {
        //     camera = cc.Camera.main;
        // }
        // else {
        //     camera = cc.Camera.findCamera(node);
        // }
        const renderComp = node!.getComponent(UIRenderComponent);
        if (!renderComp) {
            return false;
        }
        // let canvas = cc.CanvasComponent.findView(renderComp);
        const canvas = cc.director.root.ui.getScreen(renderComp.visibility);
        if (!canvas) {
            return;
        }

        // camera.getWorldToCameraMatrix(_matrix_temp);
        canvas.node.getWorldRT(_matrix_temp);
        const m12 = _matrix_temp.m12;
        const m13 = _matrix_temp.m13;
        const center = cc.visibleRect.center;
        _matrix_temp.m12 = center.x - (_matrix_temp.m00 * m12 + _matrix_temp.m04 * m13);
        _matrix_temp.m13 = center.y - (_matrix_temp.m01 * m12 + _matrix_temp.m05 * m13);

        math.mat4.multiply(_matrix_temp, _matrix_temp, _matrix);

        scaleX /= dpr;
        scaleY /= dpr;

        const container = cc.game.container;
        let a = _matrix_temp.m00 * scaleX;
        const b = _matrix.m01;
        const c = _matrix.m04;
        let d = _matrix_temp.m05 * scaleY;

        let offsetX = container && container.style.paddingLeft && parseInt(container.style.paddingLeft);
        offsetX += viewport.x / dpr;
        let offsetY = container && container.style.paddingBottom && parseInt(container.style.paddingBottom);
        offsetY += viewport.y / dpr;
        const tx = _matrix_temp.m12 * scaleX + offsetX;
        const ty = _matrix_temp.m13 * scaleY + offsetY;

        if (polyfill.zoomInvalid) {
            this._updateSize(this._size.width * a, this._size.height * d);
            a = 1;
            d = 1;
        }

        const matrix = 'matrix(' + a + ',' + -b + ',' + -c + ',' + d + ',' + tx + ',' + -ty + ')';
        this._edTxt.style.transform = matrix;
        this._edTxt.style['-webkit-transform'] = matrix;
        this._edTxt.style['transform-origin'] = '0px 100% 0px';
        this._edTxt.style['-webkit-transform-origin'] = '0px 100% 0px';
    }

    public _adjustEditBoxPosition () {
        this._node!.getWorldMatrix(_matrix);
        const y = _matrix.m13;
        const windowHeight = cc.visibleRect.height;
        const windowWidth = cc.visibleRect.width;
        let factor = 0.5;
        if (windowWidth > windowHeight) {
            factor = 0.7;
        }
        setTimeout(() => {
            if (window.scrollY < SCROLLY && y < windowHeight * factor) {
                let scrollOffset = windowHeight * factor - y - window.scrollY;
                if (scrollOffset < 35) { scrollOffset = 35; }
                if (scrollOffset > 320) { scrollOffset = 320; }
                window.scrollTo(0, scrollOffset);
            }
        }, DELAY_TIME);
    }

    public createInput () {
        if (this._inputMode === InputMode.ANY) {
            this._createDomTextArea();
        } else {
            this._createDomInput();
        }
    }

    // Called before editbox focus to register cc.view status
    public _beginEditingOnMobile () {
        const self = this;
        this.__orientationChanged = () => {
            self._adjustEditBoxPosition();
        };
        window.addEventListener('orientationchange', this.__orientationChanged);

        if (cc.view.isAutoFullScreenEnabled()) {
            this.__fullscreen = true;
            cc.view.enableAutoFullScreen(false);
            cc.screen.exitFullScreen();
        } else {
            this.__fullscreen = false;
        }
        this.__autoResize = cc.view._resizeWithBrowserSize;
        cc.view.resizeWithBrowserSize(false);
        _currentEditBoxImpl = this;
    }

    // Called after keyboard disappeared to readapte the game view
    public _endEditingOnMobile () {
        if (this.__rotateScreen) {
            cc.game.container.style['-webkit-transform'] = 'rotate(90deg)';
            cc.game.container.style.transform = 'rotate(90deg)';

            const view = cc.view;
            const width = view._originalDesignResolutionSize.width;
            const height = view._originalDesignResolutionSize.height;
            if (width > 0) {
                view.setDesignResolutionSize(width, height, view._resolutionPolicy);
            }
            this.__rotateScreen = false;
        }

        if (this.__orientationChanged) {
            window.removeEventListener('orientationchange', this.__orientationChanged);
        }

        if (this.__fullscreen) {
            cc.view.enableAutoFullScreen(true);
        }

        // In case focus on editBox A from editBox B
        // A disable resizeWithBrowserSize
        // whilte B enable resizeWithBrowserSize
        // Only _currentEditBoxImpl can enable resizeWithBrowserSize
        if (this.__autoResize && _currentEditBoxImpl === this) {
            cc.view.resizeWithBrowserSize(true);
        }
    }

    public _createDomInput () {
        this.removeDom();

        const tmpEdTxt = this._edTxt = document.createElement('input');
        tmpEdTxt.type = 'text';
        tmpEdTxt.style.fontSize = this._edFontSize + 'px';
        tmpEdTxt.style.color = '#000000';
        tmpEdTxt.style.border = '0px';
        tmpEdTxt.style.background = 'transparent';
        tmpEdTxt.style.width = '100%';
        tmpEdTxt.style.height = '100%';
        // tmpEdTxt.style.active = 0;
        tmpEdTxt.style.outline = 'medium';
        tmpEdTxt.style.padding = '0';
        tmpEdTxt.style.textTransform = 'uppercase';
        tmpEdTxt.style.display = 'none';
        tmpEdTxt.style.position = 'absolute';
        tmpEdTxt.style.bottom = '0px';
        tmpEdTxt.style.left = LEFT_PADDING + 'px';
        tmpEdTxt.style['-moz-appearance'] = 'textfield';
        tmpEdTxt.className = 'cocosEditBox';
        tmpEdTxt.style.fontFamily = 'Arial';

        registerInputEventListener(tmpEdTxt, this);

        return tmpEdTxt;
    }

    public _createDomTextArea () {
        this.removeDom();

        const tmpEdTxt = this._edTxt = document.createElement('textarea');
        // tmpEdTxt.type = 'text';
        tmpEdTxt.style.fontSize = this._edFontSize + 'px';
        tmpEdTxt.style.color = '#000000';
        tmpEdTxt.style.border = '0';
        tmpEdTxt.style.background = 'transparent';
        tmpEdTxt.style.width = '100%';
        tmpEdTxt.style.height = '100%';
        // tmpEdTxt.style.active = 0;
        tmpEdTxt.style.outline = 'medium';
        tmpEdTxt.style.padding = '0';
        tmpEdTxt.style.resize = 'none';
        tmpEdTxt.style.textTransform = 'uppercase';
        tmpEdTxt.style.overflowY = 'scroll';
        tmpEdTxt.style.display = 'none';
        tmpEdTxt.style.position = 'absolute';
        tmpEdTxt.style.bottom = '0px';
        tmpEdTxt.style.left = LEFT_PADDING + 'px';
        tmpEdTxt.className = 'cocosEditBox';
        tmpEdTxt.style.fontFamily = 'Arial';

        registerInputEventListener(tmpEdTxt, this, true);

        return tmpEdTxt;
    }

    public _addDomToGameContainer () {
        cc.game.container.appendChild(this._edTxt);
    }

    public removeDom () {
        const edTxt = this._edTxt;
        if (edTxt) {
            // Remove listeners
            const cbs = this.__eventListeners;
            edTxt.removeEventListener('compositionstart', cbs.compositionstart);
            edTxt.removeEventListener('compositionend', cbs.compositionend);
            edTxt.removeEventListener('input', cbs.input);
            edTxt.removeEventListener('focus', cbs.focus);
            edTxt.removeEventListener('keypress', cbs.keypress);
            edTxt.removeEventListener('blur', cbs.blur);
            cbs.compositionstart = null;
            cbs.compositionend = null;
            cbs.input = null;
            cbs.focus = null;
            cbs.keypress = null;
            cbs.blur = null;

            const hasChild = contains(cc.game.container, edTxt);
            if (hasChild) {
                cc.game.container.removeChild(edTxt);
            }
        }
        this._edTxt = null;
    }
}

function _inputValueHandle (input: any, editBoxImpl: EditBoxImpl) {
    if (input.value.length > editBoxImpl._maxLength) {
        input.value = input.value.slice(0, editBoxImpl._maxLength);
    }
    if (editBoxImpl._delegate && editBoxImpl._delegate.editBoxTextChanged) {
        if (editBoxImpl._text !== input.value) {
            editBoxImpl._text = input.value;
            editBoxImpl._delegate.editBoxTextChanged(editBoxImpl._text);
        }
    }
}

function registerInputEventListener (tmpEdTxt: HTMLInputElement | HTMLTextAreaElement, editBoxImpl: EditBoxImpl, isTextarea = false) {
    let inputLock = false;
    const cbs = editBoxImpl.eventListeners;
    cbs.compositionstart = () => {
        inputLock = true;
    };
    tmpEdTxt.addEventListener('compositionstart', cbs.compositionstart);

    cbs.compositionend = function () {
        inputLock = false;
        _inputValueHandle(this, editBoxImpl);
    };
    tmpEdTxt.addEventListener('compositionend', cbs.compositionend);

    cbs.input = function () {
        if (inputLock) {
            return;
        }
        _inputValueHandle(this, editBoxImpl);
    };
    tmpEdTxt.addEventListener('input', cbs.input);

    cbs.focus = function () {
        this.style.fontSize = editBoxImpl.fontSize + 'px';
        this.style.color = editBoxImpl.textColor.toCSS('rgba');
        // When stayOnTop, input will swallow touch event
        if (editBoxImpl.alwayOnTop) {
            editBoxImpl.editing = true;
        }

        if (cc.sys.isMobile) {
            editBoxImpl._beginEditingOnMobile();
        }

        if (editBoxImpl.delegate && editBoxImpl.delegate.editBoxEditingDidBegan) {
            editBoxImpl.delegate.editBoxEditingDidBegan();
        }

    };
    tmpEdTxt.addEventListener('focus', cbs.focus);

    cbs.keypress = function (e) {
        if (e.keyCode === macro.KEY.enter) {
            e.propagationStopped = true;

            if (editBoxImpl.delegate && editBoxImpl.delegate.editBoxEditingReturn) {
                editBoxImpl.delegate.editBoxEditingReturn();
            }
            if (!isTextarea) {
                editBoxImpl.text = this.value;
                editBoxImpl._endEditing();
                cc.game.canvas.focus();
            }
        }
    };
    tmpEdTxt.addEventListener('keypress', cbs.keypress);

    cbs.blur = function () {
        editBoxImpl.text = this.value;
        editBoxImpl._endEditing();
    };
    tmpEdTxt.addEventListener('blur', cbs.blur);

    editBoxImpl._addDomToGameContainer();
}
