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
 * @category event
 */

import Event from '../../event/event';
import { Vec2 } from '../../math/vec2';
import { Touch } from './touch';

/**
 * @en The mouse event
 * @zh 鼠标事件类型
 * @class Event.EventMouse
 * @extends Event
 */
export class EventMouse extends Event {
    // Inner event types of MouseEvent

    /**
     * @en
     * The none event code of mouse event.
     *
     * @zh
     * 无。
     */
    public static NONE = 0;

    /**
     * @en
     * The event type code of mouse down event.
     *
     * @zh
     * 鼠标按下事件。
     */
    public static DOWN = 1;

    /**
     * @en
     * The event type code of mouse up event.
     *
     * @zh
     * 鼠标按下后释放事件。
     */
    public static UP = 2;

    /**
     * @en
     * The event type code of mouse move event.
     *
     * @zh
     * 鼠标移动事件。
     */
    public static MOVE = 3;

    /**
     * @en
     * The event type code of mouse scroll event.
     *
     * @zh
     * 鼠标滚轮事件。
     */
    public static SCROLL = 4;

    /**
     * @en
     * The tag of Mouse left button.
     *
     * @zh
     * 鼠标左键的标签。
     */
    public static BUTTON_LEFT = 0;

    /**
     * @en
     * The tag of Mouse right button  (The right button number is 2 on browser).
     *
     * @zh
     * 鼠标右键的标签。
     */
    public static BUTTON_RIGHT = 2;

    /**
     * @en
     * The tag of Mouse middle button  (The right button number is 1 on browser).
     *
     * @zh
     * 鼠标中键的标签。
     */
    public static BUTTON_MIDDLE = 1;

    /**
     * @en
     * The tag of Mouse button 4.
     *
     * @zh
     * 鼠标按键 4 的标签。
     */
    public static BUTTON_4 = 3;

    /**
     * @en
     * The tag of Mouse button 5.
     *
     * @zh
     * 鼠标按键 5 的标签。
     */
    public static BUTTON_5 = 4;

    /**
     * @en
     * The tag of Mouse button 6.
     *
     * @zh
     * 鼠标按键 6 的标签。
     */
    public static BUTTON_6 = 5;

    /**
     * @en
     * The tag of Mouse button 7.
     *
     * @zh
     * 鼠标按键 7 的标签。
     */
    public static BUTTON_7 = 6;

    /**
     * @en
     * The tag of Mouse button 8.
     *
     * @zh
     * 鼠标按键 8 的标签。
     */
    public static BUTTON_8 = 7;

    public movementX: number = 0;

    public movementY: number = 0;

    public eventType: number;

    private _button: number | null = 0;

    private _x: number = 0;

    private _y: number = 0;

    private _prevX: number = 0;

    private _prevY: number = 0;

    private _scrollX: number = 0;

    private _scrollY: number = 0;

    /**
     * @param eventType - 鼠标时间类型 UP, DOWN, MOVE, CANCELED。
     * @param bubbles - 事件是否通过树结构冒泡。默认为 false。
     */
    constructor (eventType: number, bubbles?: boolean, prevLoc?: Vec2) {
        super(Event.MOUSE, bubbles);
        this.eventType = eventType;
        if (prevLoc) {
            this._prevX = prevLoc.x;
            this._prevY = prevLoc.y;
        }
    }

    /**
     * @en
     * Sets scroll data.
     *
     * @zh
     * 设置鼠标的滚动数据。
     */
    public setScrollData (scrollX: number, scrollY: number) {
        this._scrollX = scrollX;
        this._scrollY = scrollY;
    }

    /**
     * @en
     * Returns the x axis scroll value.
     *
     * @zh
     * 获取鼠标滚动的X轴距离，只有滚动时才有效。
     */
    public getScrollX () {
        return this._scrollX;
    }

    /**
     * @en
     * Returns the y axis scroll value.
     *
     * @zh
     * 获取滚轮滚动的 Y 轴距离，只有滚动时才有效。
     */
    public getScrollY () {
        return this._scrollY;
    }

    /**
     * @en
     * Sets cursor location.
     *
     * @zh
     * 设置当前鼠标位置。
     */
    public setLocation (x: number, y: number) {
        this._x = x;
        this._y = y;
    }

    /**
     * @en
     * Returns cursor location.
     *
     * @zh
     * 获取鼠标相对于左下角位置对象，对象包含 x 和 y 属性。
     */
    public getLocation (out?: Vec2) {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x, this._y);
        return out;
    }

    /**
     * @en
     * Returns the current cursor location in screen coordinates.
     *
     * @zh
     * 获取当前事件在游戏窗口内的坐标位置对象，对象包含 x 和 y 属性。
     */
    public getLocationInView (out?: Vec2) {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x, cc.view._designResolutionSize.height - this._y);
        return out;
    }

    /**
     * @en
     * Returns the current cursor location in ui coordinates.
     *
     * @zh
     * 获取当前事件在 UI 窗口内的坐标位置，对象包含 x 和 y 属性。
     */
    public getUILocation (out?: Vec2){
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x, this._y);
        cc.view._convertPointWithScale(out);
        return out;
    }

    /**
     * @en
     * Returns the previous touch location.
     *
     * @zh
     * 获取鼠标点击在上一次事件时的位置对象，对象包含 x 和 y 属性。
     */
    public getPreviousLocation (out?: Vec2) {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._prevX, this._prevY);
        return out;
    }

    /**
     * @en
     * Returns the previous touch location.
     *
     * @zh
     * 获取鼠标点击在上一次事件时的位置对象，对象包含 x 和 y 属性。
     */
    public getUIPreviousLocation (out?: Vec2) {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._prevX, this._prevY);
        cc.view._convertPointWithScale(out);
        return out;
    }

    /**
     * @en
     * Returns the delta distance from the previous location to current location.
     *
     * @zh
     * 获取鼠标距离上一次事件移动的距离对象，对象包含 x 和 y 属性。
     */
    public getDelta (out?: Vec2) {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x - this._prevX, this._y - this._prevY);
        return out;
    }

    /**
     * @en
     * Returns the X axis delta distance from the previous location to current location.
     *
     * @zh
     * 获取鼠标距离上一次事件移动的 X 轴距离。
     */
    public getDeltaX () {
        return this._x - this._prevX;
    }

    /**
     * @en
     * Returns the Y axis delta distance from the previous location to current location.
     *
     * @zh
     * 获取鼠标距离上一次事件移动的 Y 轴距离。
     */
    public getDeltaY () {
        return this._y - this._prevY;
    }

    /**
     * @en
     * Returns the delta distance from the previous location to current location.
     *
     * @zh
     * 获取鼠标距离上一次事件移动的距离对象，对象包含 x 和 y 属性。
     */
    public getUIDelta (out?: Vec2) {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, (this._x - this._prevX) / cc.view.getScaleX(), (this._y - this._prevY) / cc.view.getScaleY());
        return out;
    }

    /**
     * @en
     * Returns the X axis delta distance from the previous location to current location.
     *
     * @zh
     * 获取鼠标距离上一次事件移动的 X 轴距离。
     */
    public getUIDeltaX () {
        return (this._x - this._prevX) / cc.view.getScaleX();
    }

    /**
     * @en
     * Returns the Y axis delta distance from the previous location to current location.
     *
     * @zh
     * 获取鼠标距离上一次事件移动的 Y 轴距离。
     */
    public getUIDeltaY () {
        return (this._y - this._prevY) / cc.view.getScaleY();
    }

    /**
     * @en
     * Sets mouse button.
     *
     * @zh
     * 设置鼠标按键。
     */
    public setButton (button: number | null) {
        this._button = button;
    }

    /**
     * @en
     * Returns mouse button.
     *
     * @zh
     * 获取鼠标按键。
     */
    public getButton () {
        return this._button;
    }

    /**
     * @en
     * Returns location X axis data.
     *
     * @zh
     * 获取鼠标当前位置 X 轴。
     */
    public getLocationX () {
        return this._x;
    }

    /**
     * @en Returns location Y axis data.
     * @zh 获取鼠标当前位置 Y 轴。
     */
    public getLocationY () {
        return this._y;
    }

    /**
     * @en
     * Returns location X axis data.
     *
     * @zh
     * 获取鼠标当前位置 X 轴。
     */
    public getUILocationX () {
        const viewport = cc.view.getViewportRect();
        return (this._x - viewport.x) / cc.view.getScaleX();
    }

    /**
     * @en
     * Returns location Y axis data.
     *
     * @zh
     * 获取鼠标当前位置 Y 轴。
     */
    public getUILocationY () {
        const viewport = cc.view.getViewportRect();
        return (this._y - viewport.y) / cc.view.getScaleY();
    }
}

/**
 * @en
 * The touch event.
 *
 * @zh
 * 触摸事件。
 */
export class EventTouch extends Event {
    /**
     * @en
     * The maximum touch numbers
     *
     * @zh
     * 最大触摸数量。
     */
    public static MAX_TOUCHES = 5;

    /**
     * @en
     * The event type code of touch began event.
     *
     * @zh
     * 开始触摸事件。
     */
    public static BEGAN = 0;
    /**
     * @en
     * The event type code of touch moved event.
     *
     * @zh
     * 触摸后移动事件。
     */
    public static MOVED = 1;
    /**
     * @en
     * The event type code of touch ended event.
     *
     * @zh
     * 结束触摸事件。
     */
    public static ENDED = 2;
    /**
     * @en
     * The event type code of touch cancelled event.
     *
     * @zh 取消触摸事件。
     */
    public static CANCELLED = 3;

    /**
     * @en
     * The current touch object
     *
     * @zh
     * 当前触点对象
     */
    public touch: Touch | null = null;

    public simulate = false;

    private _eventCode: number;

    private _touches: Touch[];

    /**
     * @param touches - touch 数组
     * @param bubbles - 事件是否通过树结构冒泡。默认为 false。
     */
    constructor (touches?: Touch[], bubbles?: boolean, eventCode?: number) {
        super(Event.TOUCH, bubbles);
        this._eventCode = eventCode || 0;
        this._touches = touches || [];
    }

    /**
     * @en
     * Returns event code.
     *
     * @zh
     * 获取事件类型。
     */
    public getEventCode () {
        return this._eventCode;
    }

    /**
     * @en
     * Returns touches of event.
     *
     * @zh
     * 获取触摸点的列表。
     */
    public getTouches () {
        return this._touches;
    }

    /**
     * @en
     * Sets touch location.
     *
     * @zh
     * 设置当前触点位置
     */
    public setLocation (x: number, y: number) {
        if (this.touch) {
            this.touch.setTouchInfo(this.touch.getID(), x, y);
        }
    }

    /**
     * @en
     * Returns touch location.
     *
     * @zh
     * 获取触点位置。
     */
    public getLocation (out?: Vec2) {
        return this.touch ? this.touch.getLocation(out) : new Vec2();
    }

    /**
     * @en
     * Returns touch location.
     *
     * @zh
     * 获取触点位置。
     */
    public getUILocation(out?: Vec2) {
        return this.touch ? this.touch.getUILocation(out) : new Vec2();
    }

    /**
     * @en
     * Returns the current touch location in screen coordinates.
     *
     * @zh
     * 获取当前触点在游戏窗口中的位置。
     */
    public getLocationInView (out?: Vec2) {
        return this.touch ? this.touch.getLocationInView(out) : new Vec2();
    }

    /**
     * @en
     * Returns the current touch location in screen coordinates.
     *
     * @zh
     * 获取当前触点在游戏窗口中的位置。
     */
    public getUILocationInView(out?: Vec2) {
        return this.touch ? this.touch.getLocationInView(out) : new Vec2();
    }

    /**
     * @en Returns the previous touch location.
     * @zh 获取触点在上一次事件时的位置对象，对象包含 x 和 y 属性。
     */
    public getPreviousLocation (out?: Vec2) {
        return this.touch ? this.touch.getPreviousLocation(out) : new Vec2();
    }

    /**
     * @en
     * Returns the start touch location.
     *
     * @zh
     * 获获取触点落下时的位置对象，对象包含 x 和 y 属性。
     */
    public getStartLocation (out?: Vec2) {
        return this.touch ? this.touch.getStartLocation(out) : new Vec2();
    }

    /**
     * @en
     * Returns the start touch location.
     *
     * @zh
     * 获获取触点落下时的 UI 世界下位置对象，对象包含 x 和 y 属性。
     */
    public getUIStartLocation(out?: Vec2) {
        return this.touch ? this.touch.getUIStartLocation(out) : new Vec2();
    }

    /**
     * @en
     * Returns the id of cc.Touch.
     *
     * @zh
     * 触点的标识 ID，可以用来在多点触摸中跟踪触点。
     */
    public getID () {
        return this.touch ? this.touch.getID() : null;
    }

    /**
     * @en
     * Returns the delta distance from the previous location to current location.
     *
     * @zh
     * 获取触点距离上一次事件移动的距离对象，对象包含 x 和 y 属性。
     */
    public getDelta (out?: Vec2) {
        return this.touch ? this.touch.getDelta(out) : new Vec2();
    }

    /**
    * @en
    * Returns the delta distance from the previous location to current location.
    *
    * @zh
    * 获取触点距离上一次事件 UI 世界下移动的距离对象，对象包含 x 和 y 属性。
    */
    public getUIDelta(out?: Vec2) {
        return this.touch ? this.touch.getUIDelta(out) : new Vec2();
    }

    /**
     * @en
     * Returns the X axis delta distance from the previous location to current location.
     *
     * @zh
     * 获取触点距离上一次事件移动的 x 轴距离。
     */
    public getDeltaX (out?: Vec2) {
        return this.touch ? this.touch.getDelta(out).x : 0;
    }

    /**
     * @en
     * Returns the Y axis delta distance from the previous location to current location.
     *
     * @zh
     * 获取触点距离上一次事件移动的 y 轴距离。
     */
    public getDeltaY (out?: Vec2) {
        return this.touch ? this.touch.getDelta(out).y : 0;
    }

    /**
     * @en
     * Returns location X axis data.
     *
     * @zh
     * 获取当前触点 X 轴位置。
     */
    public getLocationX () {
        return this.touch ? this.touch.getLocationX() : 0;
    }

    /**
     * @en
     * Returns location Y axis data.
     *
     * @zh
     * 获取当前触点 Y 轴位置。
     */
    public getLocationY () {
        return this.touch ? this.touch.getLocationY() : 0;
    }
}

/**
 * @en
 * The acceleration event.
 *
 * @zh
 * 加速度事件。
 */
export class EventAcceleration extends Event {
    public acc: Object;

    /**
     * @param acc - 加速度
     * @param bubbles - 事件是否通过树结构冒泡。默认为 false。
     */
    constructor (acc: Object, bubbles?: boolean) {
        super(Event.ACCELERATION, bubbles);
        this.acc = acc;
    }
}

/**
 * @en
 * The keyboard event.
 *
 * @zh
 * 键盘事件。
 */
export class EventKeyboard extends Event {
    /**
     * @en
     * The keyCode read-only property represents a system and implementation dependent numerical code
     * identifying the unmodified value of the pressed key.
     * This is usually the decimal ASCII (RFC 20) or Windows 1252 code corresponding to the key.
     * If the key can't be identified, this value is 0.
     *
     * @zh
     * keyCode 是只读属性它表示一个系统和依赖于实现的数字代码，可以识别按键的未修改值。
     * 这通常是十进制 ASCII (RFC20) 或者 Windows 1252 代码，所对应的密钥。
     * 如果无法识别该键，则该值为 0。
     */
    public keyCode: number;

    /**
     * Raw DOM event.
     */
    public rawEvent?: KeyboardEvent;

    public isPressed: boolean;

    /**
     * @param keyCode - 事件触发的键值。
     * @param isPressed - 指示键是否已按下。
     * @param bubbles - 事件是否通过树结构冒泡。默认为 false。
     */
    constructor (keyCode: number | KeyboardEvent, isPressed: boolean, bubbles?: boolean) {
        super(Event.KEYBOARD, bubbles);
        if (typeof keyCode === 'number') {
            this.keyCode = keyCode;
        } else {
            this.keyCode = keyCode.keyCode;
            this.rawEvent = keyCode;
        }
        this.isPressed = isPressed;
    }
}

// TODO
// @ts-ignore
Event.EventMouse = EventMouse;

// TODO
// @ts-ignore
Event.EventTouch = EventTouch;

// TODO
// @ts-ignore
Event.EventAcceleration = EventAcceleration;

// TODO
// @ts-ignore
Event.EventKeyboard = EventKeyboard;
