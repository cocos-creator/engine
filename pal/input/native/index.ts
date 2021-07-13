import { TouchInputEvent, MouseInputEvent, KeyboardInputEvent, AccelerometerInputEvent } from 'pal/input';
import { js } from '../../../cocos/core/utils/js';
import { AccelerometerInputSource } from './accelerometer';
import { InputBox } from './input-box';
import { KeyboardInputSource } from './keyboard';
import { MouseInputSource } from './mouse';
import { TouchInputSource } from './touch';

export class Input {
    public _touch = new TouchInputSource();
    public _mouse = new MouseInputSource();
    public _keyboard = new KeyboardInputSource();
    public _accelerometer = new AccelerometerInputSource();
    public _inputBox = new InputBox();

    private _touchEvents: TouchInputEvent[] = [];
    private _mouseEvents: MouseInputEvent[] = [];
    private _keyboardEvents: KeyboardInputEvent[] = [];
    private _accelerometerEvents: AccelerometerInputEvent[] = [];

    constructor () {
        this._registerEvent();
    }

    private _registerEvent () {
        if (this._touch.support) {
            const touchEvents = this._touchEvents;
            this._touch.onStart((event) => { touchEvents.push(event); });
            this._touch.onMove((event) => { touchEvents.push(event); });
            this._touch.onEnd((event) => { touchEvents.push(event); });
            this._touch.onCancel((event) => { touchEvents.push(event); });
        }

        if (this._mouse.support) {
            const mouseEvents = this._mouseEvents;
            this._mouse.onDown((event) => { mouseEvents.push(event); });
            this._mouse.onMove((event) => { mouseEvents.push(event); });
            this._mouse.onUp((event) => { mouseEvents.push(event); });
            this._mouse.onWheel((event) => { mouseEvents.push(event); });
        }

        if (this._keyboard.support) {
            const keyboardEvents = this._keyboardEvents;
            // this._keyboard.onDown((event) => { keyboardEvents.push(event); });
            this._keyboard.onPressing((event) => { keyboardEvents.push(event); });
            this._keyboard.onUp((event) => { keyboardEvents.push(event); });
        }

        if (this._accelerometer.support) {
            const accelerometerEvents = this._accelerometerEvents;
            this._accelerometer.onChange((event) => { accelerometerEvents.push(event); });
        }
    }

    // accelerometer
    public startAccelerometer (): void {
        this._accelerometer.start();
    }
    public stopAccelerometer (): void {
        this._accelerometer.stop();
    }
    public setAccelerometerInterval (interval: number): void {
        this._accelerometer.setInterval(interval);
    }

    // // input box
    // public showInputBox (): Promise<void>;
    // public hideInputBox (): Promise<void>;
    // public onInputBoxChange (cb: Function);
    // public onInputBoxComplete (cb: Function);

    public pollTouchEvents (): TouchInputEvent[] {
        const events = js.array.copy(this._touchEvents);
        this._touchEvents.length = 0;
        return events;
    }
    public pollMouseEvents (): MouseInputEvent[] {
        const events = js.array.copy(this._mouseEvents);
        this._mouseEvents.length = 0;
        return events;
    }
    public pollKeyboardEvents (): KeyboardInputEvent[] {
        const events = js.array.copy(this._keyboardEvents);
        this._keyboardEvents.length = 0;
        return events;
    }
    public pollAccelerometerEvents (): AccelerometerInputEvent[] {
        const events = js.array.copy(this._accelerometerEvents);
        this._accelerometerEvents.length = 0;
        return events;
    }
}

export const input = new Input();
