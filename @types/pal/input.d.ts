declare module 'pal/input' {
    interface BaseInputEvent {
        /**
         * Type of the input event used to quickly distinguish between event types.
         */
        readonly type: import('../../cocos/core/platform/event-manager/event-enum').SystemEventTypeUnion;
        /**
         * Timestamp when the input event is triggered.
         */
        readonly timestamp: number;
    }
    /**
     * Basic class for all input sources.
     */
    abstract class BaseInputSource {
        /**
         * Query whether this input source is supported.
         */
        public readonly support: boolean;
    }

    interface TouchData {
        /**
         * A unique identifier for this touch.
         * A given touch point will have the same identifier for the duration of its movement around the surface.
         * This lets you ensure that you're tracking the same touch all the time.
         */
        readonly identifier: number;
        /**
         * The x-coordinate of the touch whose origin is at the bottom-left of the canvas.
         */
        readonly x: number;
        /**
         * The y-coordinate of the touch whose origin is at the bottom-left of the canvas.
         */
        readonly y: number;
        /**
         * The amount of pressure being applied to the surface by the user, ranged from 0 to 1.
         */
        readonly force: number;
    }
    export interface TouchInputEvent extends BaseInputEvent {
        /**
         * Individual points of contact whose states changed between the previous touch event and this one.
         */
        readonly changedTouches: TouchData[];
    }
    type TouchCallback = (res: TouchInputEvent) => void;
    /**
     * Class designed for touch input.
     */
    export class TouchInputSource extends BaseInputSource {
        /**
         * Register the touch start event callback.
         * @param cb
         */
        public onStart (cb: TouchCallback);
        /**
         * Register the touch move event callback.
         * @param cb
         */
        public onMove (cb: TouchCallback);
        /**
         * Register the touch end event callback.
         * @param cb
         */
        public onEnd (cb: TouchCallback);
        /**
         * Register the touch cancel event callback.
         * @param cb
         */
        public onCancel (cb: TouchCallback);
    }

    export interface MouseInputEvent extends BaseInputEvent {
        /**
         * The x-coordinate of the mouse whose origin is at the bottom-left of the canvas.
         */
        readonly x: number;
        /**
         * The y-coordinate of the mouse whose origin is at the bottom-left of the canvas.
         */
        readonly y: number;
        /**
         * The pressed mouse button during the related mouse event.
         * The valid value maybe `EventMouse.BUTTON_LEFT`, `EventMouse.BUTTON_RIGHT` and `EventMouse.BUTTON_MIDDLE`.
         */
        readonly button: number;
        // this is web only property, should be removed in the futrure.
        movementX?: number;
        movementY?: number;
    }
    type MouseCallback = (res: MouseInputEvent) => void;
    export interface MouseWheelInputEvent extends MouseInputEvent {
        /**
         * The horizontal scroll amount.
         */
        readonly deltaX: number;
        /**
         * The vertical scroll amount.
         */
        readonly deltaY: number;
    }
    type MouseWheelCallback = (res: MouseWheelInputEvent) => void;
    /**
     * Class designed for mouse input.
     */
    export class MouseInputSource extends BaseInputSource {
        /**
         * Register the mouse down event callback.
         * @param cb
         */
        public onDown (cb: MouseCallback);
        /**
         * Register the mouse move event callback.
         * @param cb
         */
        public onMove (cb: MouseCallback);
        /**
         * Register the mouse up event callback.
         * @param cb
         */
        public onUp (cb: MouseCallback);
        /**
         * Register the mouse wheel event callback.
         * @param cb
         */
        public onWheel (cb: MouseWheelCallback);
    }

    export interface KeyboardInputEvent extends BaseInputEvent {
        /**
         * Numerical code identifying the unique value of the pressed key.
         */
        readonly code: import('../../cocos/core/platform/event-manager/key-code').KeyCode;
    }
    type KeyboardCallback = (res: KeyboardInputEvent) => void;
    /**
     * Class Designed for keyboard input.
     */
    export class KeyboardInputSource extends BaseInputSource {
        /**
         * Register the key down event callback.
         * @param cb
         */
        public onDown (cb: KeyboardCallback);
        /**
         * Register the key pressing event callback.
         * NOTE: Compability for the deprecated KEY_DOWN event type. It should be removed in the future.
         * @param cb
         */
        public onPressing (cb: KeyboardCallback);
        /**
         * Register the key up event callback.
         * @param cb
         */
        public onUp (cb: KeyboardCallback);
    }

    /**
     * Class designed for gamepad input
     */
    export class GamepadInputSource extends BaseInputSource {
        // TODO: add more details for GamepadInputSource class
    }

    export interface AccelerometerInputEvent extends BaseInputEvent {
        /**
         * The current x value of the accelerometer ranged from -1 to 1.
         */
        readonly x: number;
        /**
         * The current y value of the accelerometer ranged from -1 to 1.
         */
        readonly y: number;
        /**
         * The current z value of the accelerometer ranged from -1 to 1.
         */
        readonly z: number;
    }
    type AccelerometerCallback = (res: AccelerometerInputEvent) => void;
    /**
     * Class designed for accelerometer input
     */
    export class AccelerometerInputSource extends BaseInputSource {
        /**
         * Asynchronously start the accelerometer.
         * TODO: return a promise.
         */
        public start ();
        /**
         * Stop the accelerometer.
         * TODO: return a promise.
         */
        public stop ();
        /**
         * Set interval of the accelerometer callback.
         * The interval is in mileseconds.
         * @param intervalInMileseconds interval in mileseconds
         */
        public setInterval (intervalInMileseconds: number);
        /**
         * Register the accelerometer change event callback.
         * @param cb
         */
        public onChange (cb: AccelerometerCallback);
    }

    /**
     * Class designed for UI input box.
     * TODO: add more description for this class
     */
    export class InputBox extends BaseInputSource {
        /**
         * Asynchronously show the UI input box, also show the soft keyboard on mobile.
         */
        public show (): Promise<void>;
        /**
         * Asynchronously hide the UI input box, also hide the soft keyboard on mobile.
         */
        public hide (): Promise<void>;
        /**
         * Register the UI input box change event callback.
         * @param cb
         */
        public onChange (cb: ()=>void);
        /**
         * Register the UI input box complete event callback.
         * @param cb
         */
        public onComplete (cb: ()=>void);
        /**
         * Unregister the UI input box change event callback.
         * @param cb If not specified, all callback would be unregistered.
         */
        public offChange (cb?: ()=>void);
        /**
         * Unregister the UI input box complete event callback.
         * @param cb If not specified, all callback would be unregistered.
         */
        public offComplete (cb?: ()=>void);
    }

    /**
     * Class designed to manage all input sources.
     */
    class Input {
        private _touch: TouchInputSource;
        private _mouse: MouseInputSource;
        private _keyboard: KeyboardInputSource;
        private _accelerometer: AccelerometerInputSource;
        private _inputBox: InputBox;

        private _touchEvents: TouchInputEvent[];
        private _mouseEvents: MouseInputEvent[];
        private _keyboardEvents: KeyboardInputEvent[];
        private _accelerometerEvents: AccelerometerInputEvent[];

        public pollTouchEvents (): TouchInputEvent[];
        public pollMouseEvents (): MouseInputEvent[];
        public pollKeyboardEvents (): KeyboardInputEvent[];
        public pollAccelerometerEvents (): AccelerometerInputEvent[];

        public startAccelerometer (): void;
        public stopAccelerometer (): void;
        public setAccelerometerInterval (interval: number): void;

        // // input box
        // public showInputBox (): Promise<void>;
        // public hideInputBox (): Promise<void>;
        // public onInputBoxChange (cb: Function);  // TODO: don't use Function
        // public onInputBoxComplete (cb: Function);

        // public pollEvent(): BaseInputEvent | undefined;
    }

    export const input: Input;
}
