/*
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
 * @category ui
 */

import { math } from '../../../core';
import { SpriteFrame } from '../../../core/assets/sprite-frame';
import { Component } from '../../../core/components/component';
import { EventHandler as ComponentEventHandler } from '../../../core/components/component-event-handler';
import { ccclass, help, executeInEditMode, executionOrder, menu, property } from '../../../core/data/class-decorator';
import { Color, Size, Vec3 } from '../../../core/math';
import { EventTouch } from '../../../core/platform';
import { SystemEventType } from '../../../core/platform/event-manager/event-enum';
import { Node } from '../../../core/scene-graph/node';
import { LabelComponent, VerticalTextAlignment } from '../label-component';
import { SpriteComponent } from '../sprite-component';
import { EditBoxImpl } from './edit-box-impl';
import { EditBoxImplBase } from './edit-box-impl-base';
import { InputFlag, InputMode, KeyboardReturnType } from './types';
import { sys } from '../../../core/platform/sys';
import { EDITOR } from 'internal:constants';
import { legacyGlobalExports } from '../../../core/global-exports';

const LEFT_PADDING = 2;

function capitalize (str: string) {
    return str.replace(/(?:^|\s)\S/g, (a) => {
        return a.toUpperCase();
    });
}

function capitalizeFirstLetter (str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

enum EventType {
    EDITING_DID_BEGAN = 'editing-did-began',
    EDITING_DID_ENDED = 'editing-did-ended',
    TEXT_CHANGED = 'text-changed',
    EDITING_RETURN = 'editing-return',
}
/**
 * @en
 * cc.EditBoxComponent is a component for inputing text, you can use it to gather small amounts of text from users.
 *
 * @zh
 * EditBoxComponent 组件，用于获取用户的输入文本。
 */

@ccclass('cc.EditBoxComponent')
@help('i18n:cc.EditBoxComponent')
@executionOrder(100)
@menu('UI/EditBox')
@executeInEditMode
export class EditBoxComponent extends Component {

    /**
     * @en
     * Input string of EditBox.
     *
     * @zh
     * 输入框的初始输入内容，如果为空则会显示占位符的文本。
     */
    @property({
        tooltip: '输入框的初始输入内容，如果为空则会显示占位符的文本',
    })
    get string () {
        return this._string;
    }

    set string (value) {
        if (this._maxLength >= 0 && value.length >= this._maxLength) {
            value = value.slice(0, this._maxLength);
        }

        this._string = value;
        this._updateString(value);
    }

    /**
     * @en
     * The Label component attached to the node for EditBox's input text label
     *
     * @zh
     * 输入框输入文本节点上挂载的 Label 组件对象
     */
    @property({
        tooltip: '输入框输入文本节点上挂载的 Label 组件对象',
        type: LabelComponent,
    })
    get textLabel () {
        return this._textLabel;
    }

    set textLabel (oldValue) {
        if (this._textLabel !== oldValue) {
            this._textLabel = oldValue;
            if (this._textLabel){
                this._updateTextLabel();
                this._updateLabels();
            }
        }
    }
    /**
     * @en
     * The Label component attached to the node for EditBox's placeholder text label.
     *
     * @zh
     * 输入框占位符节点上挂载的 Label 组件对象。
     */
    @property({
        tooltip: '输入框占位符节点上挂载的 Label 组件对象',
        type: LabelComponent,
    })
    get placeholderLabel () {
        return this._placeholderLabel;
    }

    set placeholderLabel (oldValue) {
        if (this._placeholderLabel !== oldValue) {
            this._placeholderLabel = oldValue;
            if (this._placeholderLabel){
                this._updatePlaceholderLabel();
                this._updateLabels();
            }
        }
    }
    /**
     * @en
     * The background image of EditBox.
     *
     * @zh
     * 输入框的背景图片。
     */
    @property({
        type: SpriteFrame,
        tooltip: '输入框的背景图片',
    })
    get backgroundImage () {
        return this._backgroundImage;
    }

    set backgroundImage (value: SpriteFrame | null) {
        if (this._backgroundImage === value) {
            return;
        }

        this._backgroundImage = value;
        this._createBackgroundSprite();
    }

    /**
     * @en
     * The return key type of EditBox.
     * Note: it is meaningless for web platforms and desktop platforms.
     *
     * @zh
     * 指定移动设备上面回车按钮的样式。
     * 注意：这个选项对 web 平台与 desktop 平台无效。
     */
    @property({
        type: KeyboardReturnType,
        tooltip: '指定移动设备上面回车按钮的样式',
    })
    get returnType () {
        return this._returnType;
    }

    set returnType (value: KeyboardReturnType) {
        this._returnType = value;
    }

    /**
     * @en
     * Set the input flags that are to be applied to the EditBox.
     *
     * @zh
     * 指定输入标志位，可以指定输入方式为密码或者单词首字母大写。
     */
    @property({
        type: InputFlag,
        tooltip: '指定输入标志位，可以指定输入方式为密码或者单词首字母大写',
    })
    get inputFlag () {
        return this._inputFlag;
    }

    set inputFlag (value) {
        this._inputFlag = value;
        this._updateString(this._string);
    }
    /**
     * @en
     * Set the input mode of the edit box.
     * If you pass ANY, it will create a multiline EditBox.
     *
     * @zh
     * 指定输入模式: ANY表示多行输入，其它都是单行输入，移动平台上还可以指定键盘样式。
     */
    @property({
        type: InputMode,
        tooltip: '指定输入模式: ANY 表示多行输入，其它都是单行输入，移动平台上还可以指定键盘样式',
    })
    get inputMode () {
        return this._inputMode;
    }

    set inputMode (oldValue) {
       if (this._inputMode !== oldValue) {
            this._inputMode = oldValue;
            this._updateTextLabel();
            this._updatePlaceholderLabel();
       }

    }

    /**
     * @en
     * Font size of the input text.
     *
     * @zh
     * 输入框文本的字体大小。该属性会在将来的版本中移除，请使用 editBox.textLabel.fontSize。
     */
    @property({
        tooltip: '输入框文本的字体大小',
    })
    get fontSize () {
            if (!this._textLabel){
                return 20;
            }
            return this._textLabel!.fontSize;
    }

    set fontSize (value) {
        if (this._textLabel) {
            this._textLabel.fontSize = value;
        }
    }

    /**
     * @en
     * Change the lineHeight of displayed text.
     *
     * @zh
     * 输入框文本的行高。
     */
    @property({
        tooltip: '输入框文本的行高',
    })
    get lineHeight () {
        if (!this._textLabel){
            return 40;
        }
        return this._textLabel!.lineHeight;
    }
    set lineHeight (value: number) {
        if (this._textLabel) {
            this._textLabel.lineHeight = value;
        }
    }

    /**
     * @en
     * Font color of the input text.
     *
     * @zh
     * 输入框文本的颜色。该属性会在将来的版本中移除，请使用 editBox.textLabel.color
     */
    @property({
        type: Color,
        tooltip: '输入框文本的颜色',
    })
    get fontColor () {
        if (!this._textLabel){
            return math.Color.WHITE.clone();
        }
        return this._textLabel!.color;
    }

    set fontColor (value) {
        if (this._textLabel) {
                this._textLabel.color = value;
        }
    }

    /**
     * @en
     * The display text of placeholder.
     *
     * @zh
     * 输入框占位符的文本内容。
     */
    @property({
        tooltip: '输入框占位符的文本内容',
    })
    get placeholder () {
        if (!this._placeholderLabel) {
            return '';
        }
        return this._placeholderLabel.string;
    }

    set placeholder (value) {
        if (this._placeholderLabel) {
            this._placeholderLabel.string = value;
        }
    }

    /**
     * @en
     * The font size of placeholder.
     *
     * @zh
     * 输入框占位符的字体大小。该属性会在将来的版本中移除，请使用 editBox.placeholderLabel.fontSize
     */
    @property({
        tooltip: '输入框占位符的字体大小',
    })
    get placeholderFontSize () {
        if (!this._placeholderLabel){
            return 20;
        }
        return this._placeholderLabel!.fontSize;
    }
    set placeholderFontSize (value) {
        if (this._placeholderLabel) {
            this._placeholderLabel.fontSize = value;
        }
    }

    /**
     * @en
     * The font color of placeholder.
     *
     * @zh
     * 输入框占位符的字体颜色。该属性会在将来的版本中移除，请使用 editBox.placeholderLabel.color
     */
    @property({
        tooltip: '输入框占位符的字体颜色',
    })
    get placeholderFontColor () {
        if (!this._placeholderLabel) {
            return math.Color.GRAY.clone();
        }
        return this._placeholderLabel!.color;
    }

    set placeholderFontColor (value) {
        if (this._placeholderLabel) {
            this._placeholderLabel.color = value;
        }

    }

    /**
     * @en
     * The maximize input length of EditBox.
     * - If pass a value less than 0, it won't limit the input number of characters.
     * - If pass 0, it doesn't allow input any characters.
     *
     * @zh
     * 输入框最大允许输入的字符个数。
     * - 如果值为小于 0 的值，则不会限制输入字符个数。
     * - 如果值为 0，则不允许用户进行任何输入。
     */
    @property({
        tooltip: '输入框最大允许输入的字符个数',
    })
    get maxLength () {
        return this._maxLength;
    }
    set maxLength (value: number) {
        this._maxLength = value;
    }

    /**
     * @en
     * The input is always visible and be on top of the game view (only useful on Web).
     *
     * @zh
     * 输入框总是可见，并且永远在游戏视图的上面（这个属性只有在 Web 上面修改有意义）
     * Note: only available on Web at the moment.
     *
     * @deprecated
     */
    @property({
        tooltip: '输入框总是可见，并且永远在游戏视图的上面（这个属性只有在 Web 上面修改有意义）',
    })
    get stayOnTop () {
        return;
    }

    set stayOnTop (value) {
        console.warn('stayOnTop is removed.');
    }

    /**
     * @en
     * Set the tabIndex of the DOM input element (only useful on Web).
     *
     * @zh
     * 修改 DOM 输入元素的 tabIndex（这个属性只有在 Web 上面修改有意义）。
     */
    @property({
        tooltip: '修改 DOM 输入元素的 tabIndex（这个属性只有在 Web 上面修改有意义）',
    })
    get tabIndex () {
        return this._tabIndex;
    }

    set tabIndex (value) {
        if (this._tabIndex !== value) {
            this._tabIndex = value;
            if (this._impl) {
                this._impl.setTabIndex(value);
            }
        }
    }

    public static _EditBoxImpl = EditBoxImplBase;
    public static KeyboardReturnType = KeyboardReturnType;
    public static InputFlag = InputFlag;
    public static InputMode = InputMode;
    public static EventType = EventType;
    /**
     * @en
     * The event handler to be called when EditBox began to edit text.
     *
     * @zh
     * 开始编辑文本输入框触发的事件回调。
     */
    @property({
        type: [ComponentEventHandler],
        tooltip: '该事件在用户点击输入框获取焦点的时候被触发',
    })
    public editingDidBegan: ComponentEventHandler[] = [];

    /**
     * @en
     * The event handler to be called when EditBox text changes.
     *
     * @zh
     * 编辑文本输入框时触发的事件回调。
     */
    @property({
        type: [ComponentEventHandler],
        tooltip: '编辑文本输入框时触发的事件回调',
    })
    public textChanged: ComponentEventHandler[] = [];

    /**
     * @en
     * The event handler to be called when EditBox edit ends.
     *
     * @zh
     * 结束编辑文本输入框时触发的事件回调。
     */
    @property({
        type: [ComponentEventHandler],
        tooltip: '在单行模式下面，一般是在用户按下回车或者点击屏幕输入框以外的地方调用该函数。 如果是多行输入，一般是在用户点击屏幕输入框以外的地方调用该函数',
    })
    public editingDidEnded: ComponentEventHandler[] = [];

    /**
     * @en
     * The event handler to be called when return key is pressed. Windows is not supported.
     *
     * @zh
     * 当用户按下回车按键时的事件回调，目前不支持 windows 平台
     */
    @property({
        type: [ComponentEventHandler],
        tooltip: '该事件在用户按下回车键的时候被触发, 如果是单行输入框，按回车键还会使输入框失去焦点',
    })
    public editingReturn: ComponentEventHandler[] = [];

    public _impl: EditBoxImplBase | null = null;
    public _background: SpriteComponent | null = null;

    @property
    protected _textLabel: LabelComponent | null = null;
    @property
    protected _placeholderLabel: LabelComponent | null = null;
    @property
    protected  _returnType = KeyboardReturnType.DEFAULT;
    @property
    protected  _useOriginalSize = true;
    @property
    protected  _string = '';
    @property
    protected  _tabIndex = 0;
    @property
    protected  _backgroundImage: SpriteFrame | null = null;
    @property
    protected  _inputFlag = InputFlag.DEFAULT;
    @property
    protected  _inputMode = InputMode.ANY;
    @property
    protected  _maxLength = 20;

    private _isLabelVisible = false;

    public __preload () {
        this._init();
    }

    public onEnable () {
        if (!EDITOR) {
            this._registerEvent();
        }
        if (this._impl) {
            this._impl.onEnable();
        }
    }

    public update () {
        if (this._impl) {
            this._impl.update();
        }
    }

    public onDisable () {
        if (!EDITOR) {
            this._unregisterEvent();
        }
        if (this._impl) {
            this._impl.onDisable();
        }
    }

    public onDestroy () {
        if (this._impl) {
            this._impl.clear();
        }
    }

    /**
     * @en Let the EditBox get focus
     * @zh 让当前 EditBox 获得焦点。
     */
    public setFocus () {
        if (this._impl) {
            this._impl.setFocus(true);
        }
    }

    /**
     * @en Let the EditBox get focus
     * @zh 让当前 EditBox 获得焦点
     */
    public focus () {
        if (this._impl) {
            this._impl.setFocus(true);
        }
    }

    /**
     * @en Let the EditBox lose focus
     * @zh 让当前 EditBox 失去焦点
     */
    public blur () {
        if (this._impl) {
            this._impl.setFocus(false);
        }
    }

    /**
     * @en Determine whether EditBox is getting focus or not.
     * @zh 判断 EditBox 是否获得了焦点。
     * Note: only available on Web at the moment.
     */
    public isFocused () {
        if (this._impl) {
            return this._impl.isFocused();
        }
        return false;
    }

    public _editBoxEditingDidBegan () {
        ComponentEventHandler.emitEvents(this.editingDidBegan, this);
        this.node.emit(EventType.EDITING_DID_BEGAN, this);
    }

    public _editBoxEditingDidEnded () {
        ComponentEventHandler.emitEvents(this.editingDidEnded, this);
        this.node.emit(EventType.EDITING_DID_ENDED, this);
    }

    public _editBoxTextChanged (text: string) {
        text = this._updateLabelStringStyle(text, true);
        this.string = text;
        ComponentEventHandler.emitEvents(this.textChanged, text, this);
        this.node.emit(EventType.TEXT_CHANGED, this);
    }

    public _editBoxEditingReturn () {
        ComponentEventHandler.emitEvents(this.editingReturn, this);
        this.node.emit(EventType.EDITING_RETURN, this);
    }

    public _showLabels () {
        this._isLabelVisible = true;
        this._updateLabels();
    }

    public _hideLabels () {
        this._isLabelVisible = false;
        if (this._textLabel) {
            this._textLabel.node.active = false;
        }
        if (this._placeholderLabel) {
            this._placeholderLabel.node.active = false;
        }
    }

    protected _onTouchBegan (event: EventTouch) {
        event.propagationStopped = true;
    }

    protected _onTouchCancel (event: EventTouch) {
        event.propagationStopped = true;
    }

    protected _onTouchEnded (event: EventTouch) {
        if (this._impl) {
            this._impl.beginEditing();
        }
        event.propagationStopped = true;
    }

    protected _init () {
        this._createBackgroundSprite();
        this._updatePlaceholderLabel();
        this._updateTextLabel();
        this._isLabelVisible = true;
        this.node.on(SystemEventType.SIZE_CHANGED, this._resizeChildNodes, this);

        const impl = this._impl = new EditBoxComponent._EditBoxImpl();
        impl.init(this);
        this._updateString(this._string);
        this._syncSize();
    }

    protected _createBackgroundSprite () {
        if (!this._background) {
            this._background = this.node.getComponent(SpriteComponent);
            if (!this._background) {
                this._background = this.node.addComponent(SpriteComponent);
            }

        }

        this._background!.type = SpriteComponent.Type.SLICED;
        this._background!.spriteFrame = this._backgroundImage;
    }

    protected _updateTextLabel () {
        let textLabel = this._textLabel;

        // If textLabel doesn't exist, create one.
        if (!textLabel) {
            let node = this.node.getChildByName('TEXT_LABEL');
            if (!node) {
                node = new Node('TEXT_LABEL');
            }
            textLabel = node!.getComponent(LabelComponent);
            if (!textLabel) {
                textLabel = node!.addComponent(LabelComponent);
            }
            node!.parent = this.node;
            this._textLabel = textLabel;
        }

        // update
        const transformComp = this._textLabel!.node._uiProps.uiTransformComp;
        transformComp!.setAnchorPoint(0, 1);
        textLabel!.overflow = LabelComponent.Overflow.CLAMP;
        if (this._inputMode === InputMode.ANY) {
            textLabel!.verticalAlign = VerticalTextAlignment.TOP;
            textLabel!.enableWrapText = true;
        }
        else {
            textLabel!.verticalAlign = VerticalTextAlignment.CENTER;
            textLabel!.enableWrapText = false;
        }
        textLabel!.string = this._updateLabelStringStyle(this._string);
    }

    protected _updatePlaceholderLabel () {
        let placeholderLabel = this._placeholderLabel;

        // If placeholderLabel doesn't exist, create one.
        if (!placeholderLabel) {
            let node = this.node.getChildByName('PLACEHOLDER_LABEL');
            if (!node) {
                node = new Node('PLACEHOLDER_LABEL');
            }
            placeholderLabel = node!.getComponent(LabelComponent);
            if (!placeholderLabel) {
                placeholderLabel = node!.addComponent(LabelComponent);
            }
            node!.parent = this.node;
            this._placeholderLabel = placeholderLabel;
        }

        // update
        const transform = this._placeholderLabel!.node._uiProps.uiTransformComp;
        transform!.setAnchorPoint(0, 1);
        placeholderLabel!.overflow = LabelComponent.Overflow.CLAMP;
        if (this._inputMode === InputMode.ANY) {
            placeholderLabel!.verticalAlign = VerticalTextAlignment.TOP;
            placeholderLabel!.enableWrapText = true;
        }
        else {
            placeholderLabel!.verticalAlign = VerticalTextAlignment.CENTER;
            placeholderLabel!.enableWrapText = false;
        }
        placeholderLabel!.string = this.placeholder;
    }

    protected _syncSize () {
        const size = this.node.getContentSize();

        if (this._background) {
            this._background.node._uiProps.uiTransformComp!.anchorPoint = this.node._uiProps.uiTransformComp!.anchorPoint;
            this._background.node.setContentSize(size);
        }

        this._updateLabelPosition(size);
        if (this._impl) {
            this._impl.setSize(size.width, size.height);
        }
    }

    protected _updateLabels () {
        if (this._isLabelVisible) {
            const content = this._string;
            if (this._textLabel) {
                this._textLabel.node.active = (content !== '');
            }
            if (this._placeholderLabel) {
                this._placeholderLabel.node.active = (content === '');
            }
        }
    }

    protected _updateString (text: string) {
        const textLabel = this._textLabel;
        // Not inited yet
        if (!textLabel) {
            return;
        }

        let displayText = text;
        if (displayText) {
            displayText = this._updateLabelStringStyle(displayText);
        }

        textLabel.string = displayText;

        this._updateLabels();
    }

    protected _updateLabelStringStyle (text: string, ignorePassword: boolean = false) {
        const inputFlag = this._inputFlag;
        if (!ignorePassword && inputFlag === InputFlag.PASSWORD) {
            let passwordString = '';
            const len = text.length;
            for (let i = 0; i < len; ++i) {
                passwordString += '\u25CF';
            }
            text = passwordString;
        } else if (inputFlag === InputFlag.INITIAL_CAPS_ALL_CHARACTERS) {
            text = text.toUpperCase();
        } else if (inputFlag === InputFlag.INITIAL_CAPS_WORD) {
            text = capitalize(text);
        } else if (inputFlag === InputFlag.INITIAL_CAPS_SENTENCE) {
            text = capitalizeFirstLetter(text);
        }

        return text;
    }

    protected _registerEvent () {
        this.node.on(SystemEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.on(SystemEventType.TOUCH_END, this._onTouchEnded, this);
    }

    protected _unregisterEvent () {
        this.node.off(SystemEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.off(SystemEventType.TOUCH_END, this._onTouchEnded, this);
    }

    protected _updateLabelPosition (size: Size) {
        const node = this.node;
        const offX = -node.anchorX * node.width;
        const offY = -node.anchorY * node.height;

        const placeholderLabel = this._placeholderLabel;
        const textLabel = this._textLabel;
        if (textLabel) {
            textLabel.node.setContentSize(size.width - LEFT_PADDING, size.height);
            textLabel.node.position = new Vec3 (offX + LEFT_PADDING, offY + size.height, textLabel.node.position.z);
            textLabel.verticalAlign = this._inputMode === InputMode.ANY ? VerticalTextAlignment.TOP : VerticalTextAlignment.CENTER;
            textLabel.enableWrapText = this._inputMode === InputMode.ANY ? true : false;
        }

        if (placeholderLabel) {
            placeholderLabel.node.setContentSize(size.width - LEFT_PADDING, size.height);
            placeholderLabel.lineHeight = size.height;
            placeholderLabel.node.position = new Vec3 (offX + LEFT_PADDING, offY + size.height, placeholderLabel.node.position.z);
            placeholderLabel.verticalAlign = this._inputMode === InputMode.ANY ?
                VerticalTextAlignment.TOP : VerticalTextAlignment.CENTER;
            placeholderLabel.enableWrapText = this._inputMode === InputMode.ANY ? true : false;
        }
    }

    protected _resizeChildNodes () {
        const textLabelNode = this._textLabel && this._textLabel.node;
        if (textLabelNode) {
            textLabelNode.position = new Vec3(-this.node.width / 2, this.node.height / 2, textLabelNode.position.z);
            textLabelNode.width = this.node.width;
            textLabelNode.height = this.node.height;
        }
        const placeholderLabelNode = this._placeholderLabel && this._placeholderLabel.node;
        if (placeholderLabelNode) {
            placeholderLabelNode.position = new Vec3(-this.node.width / 2, this.node.height / 2, placeholderLabelNode.position.z);
            placeholderLabelNode.width = this.node.width;
            placeholderLabelNode.height = this.node.height;
        }
        const backgroundNode = this._background && this._background.node;
        if (backgroundNode) {
            backgroundNode.width = this.node.width;
            backgroundNode.height = this.node.height;
        }
    }
}

if (sys.isBrowser){
    EditBoxComponent._EditBoxImpl = EditBoxImpl;
}

legacyGlobalExports.EditBoxComponent = EditBoxComponent;

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event editing-did-began
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event editing-did-ended
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event text-changed
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event editing-return
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * @en if you don't need the EditBox and it isn't in any running Scene, you should
 * call the destroy method on this component or the associated node explicitly.
 * Otherwise, the created DOM element won't be removed from web page.
 * @zh
 * 如果你不再使用 EditBox，并且组件未添加到场景中，那么你必须手动对组件或所在节点调用 destroy。
 * 这样才能移除网页上的 DOM 节点，避免 Web 平台内存泄露。
 * @example
 * ```
 * editbox.node.parent = null;  // or  editbox.node.removeFromParent(false);
 * // when you don't need editbox anymore
 * editbox.node.destroy();
 * ```
 * @return {Boolean} whether it is the first time the destroy being called
 */
