/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

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
 */

/**
 * @packageDocumentation
 * @module event
 */

import { CallbacksInvoker } from './callbacks-invoker';
import { createMap } from '../utils/js';

type Constructor<T = {}> = new (...args: any[]) => T;

type EventType = string | number;

/**
 * @zh
 * 实现该接口的对象具有处理事件的能力。
 * @en
 * Objects those implement this interface have essentially the capability to process events.
 */
export interface IEventified {
    /**
     * @zh 检查指定事件是否已注册回调。
     * @en Checks whether there is correspond event listener registered on the given event.
     * @param type - Event type.
     * @param callback - Callback function when event triggered.
     * @param target - Callback callee.
     */
    hasEventListener (type: string, callback?: (...any) => void, target?: any): boolean;

    /**
     * @en
     * Register an callback of a specific event type on the EventTarget.
     * This type of event should be triggered via `emit`.
     * @zh
     * 注册事件目标的特定事件类型回调。这种类型的事件应该被 `emit` 触发。
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param thisArg - The target (this object) to invoke the callback, can be null
     * @return - Just returns the incoming callback so you can save the anonymous function easier.
     * @example
     * import { log } from 'cc';
     * eventTarget.on('fire', function () {
     *     log("fire in the hole");
     * }, node);
     */
    on<TFunction extends (...any) => void> (type: EventType, callback: TFunction, thisArg?: any, once?: boolean): typeof callback;

    /**
     * @en
     * Register an callback of a specific event type on the EventTarget,
     * the callback will remove itself after the first time it is triggered.
     * @zh
     * 注册事件目标的特定事件类型回调，回调会在第一时间被触发后删除自身。
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     * @example
     * import { log } from 'cc';
     * eventTarget.once('fire', function () {
     *     log("this is the callback and will be invoked only once");
     * }, node);
     */
    once<TFunction extends (...any) => void> (type: EventType, callback: TFunction, thisArg?: any): typeof callback;

    /**
     * @en
     * Removes the listeners previously registered with the same type, callback, target and or useCapture,
     * if only type is passed as parameter, all listeners registered with that type will be removed.
     * @zh
     * 删除之前用同类型，回调，目标或 useCapture 注册的事件监听器，如果只传递 type，将会删除 type 类型的所有事件监听器。
     *
     * @param type - A string representing the event type being removed.
     * @param callback - The callback to remove.
     * @param target - The target (this object) to invoke the callback, if it's not given, only callback without target will be removed
     * @example
     * import { log } from 'cc';
     * // register fire eventListener
     * var callback = eventTarget.on('fire', function () {
     *     log("fire in the hole");
     * }, target);
     * // remove fire event listener
     * eventTarget.off('fire', callback, target);
     * // remove all fire event listeners
     * eventTarget.off('fire');
     */
    off<TFunction extends (...any) => void> (type: EventType, callback?: TFunction, thisArg?: any): void;

    /**
     * @en Removes all callbacks previously registered with the same target (passed as parameter).
     * This is not for removing all listeners in the current event target,
     * and this is not for removing all listeners the target parameter have registered.
     * It's only for removing all listeners (callback and target couple) registered on the current event target by the target parameter.
     * @zh 在当前 EventTarget 上删除指定目标（target 参数）注册的所有事件监听器。
     * 这个函数无法删除当前 EventTarget 的所有事件监听器，也无法删除 target 参数所注册的所有事件监听器。
     * 这个函数只能删除 target 参数在当前 EventTarget 上注册的所有事件监听器。
     * @param typeOrTarget - The target to be searched for all related listeners
     */
    targetOff (typeOrTarget: any): void;

    /**
     * @zh 移除在特定事件类型中注册的所有回调或在某个目标中注册的所有回调。
     * @en Removes all callbacks registered in a certain event type or all callbacks registered with a certain target
     * @param typeOrTarget - The event type or target with which the listeners will be removed
     */
    removeAll (typeOrTarget: any): void;

    /**
     * @zh 派发一个指定事件，并传递需要的参数
     * @en Trigger an event directly with the event name and necessary arguments.
     * @param type - event type
     * @param args - Arguments when the event triggered
     */
    emit (type: EventType, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void;
}

/**
 * @en Generate a new class from the given base class, after polyfill all functionalities in [[IEventified]] as if it's extended from [[EventTarget]]
 * @zh 生成一个类，该类继承自指定的基类，并以和 [[EventTarget]] 等同的方式实现了 [[IEventified]] 的所有接口。
 * @param base The base class
 * @example
 * ```ts
 * class Base { say() { console.log('Hello!'); } }
 * class MyClass extends Eventify(Base) { }
 * function (o: MyClass) {
 *     o.say(); // Ok: Extend from `Base`
 *     o.emit('sing', 'The ghost'); // Ok: `MyClass` implements IEventified
 * }
 * ```
 */
export function Eventify<TBase> (base: Constructor<TBase>): Constructor<TBase & IEventified> {
    class Eventified extends (base as unknown as any) {
        private _callbackTable = createMap(true);

        public once<Callback extends (...any) => void> (type: EventType, callback: Callback, target?: any) {
            return this.on(type, callback, target, true) as Callback;
        }

        public targetOff (typeOrTarget: any) {
            this.removeAll(typeOrTarget);
        }
    }

    // Mixin with `CallbacksInvokers`'s prototype
    const callbacksInvokerPrototype = CallbacksInvoker.prototype;
    const propertyKeys: (string | symbol)[] =        (Object.getOwnPropertyNames(callbacksInvokerPrototype) as (string | symbol)[]).concat(
        Object.getOwnPropertySymbols(callbacksInvokerPrototype),
    );
    for (let iPropertyKey = 0; iPropertyKey < propertyKeys.length; ++iPropertyKey) {
        const propertyKey = propertyKeys[iPropertyKey];
        if (!(propertyKey in Eventified.prototype)) {
            const propertyDescriptor = Object.getOwnPropertyDescriptor(callbacksInvokerPrototype, propertyKey);
            if (propertyDescriptor) {
                Object.defineProperty(Eventified.prototype, propertyKey, propertyDescriptor);
            }
        }
    }

    return Eventified as unknown as any;
}
