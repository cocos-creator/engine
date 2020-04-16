﻿/*
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

import * as js from '../utils/js';
import { CallbacksInvoker } from './callbacks-invoker';

const fastRemove = js.array.fastRemove;

export interface ITargetImpl extends Object {
    __eventTargets?: Object[];
    node?: ITargetImpl;
}

/**
 * !#en
 * EventTarget is an object to which an event is dispatched when something has occurred.
 * Entity are the most common event targets, but other objects can be event targets too.
 *
 * Event targets are an important part of the Fireball event model.
 * The event target serves as the focal point for how events flow through the scene graph.
 * When an event such as a mouse click or a keypress occurs, Fireball dispatches an event object
 * into the event flow from the root of the hierarchy. The event object then makes its way through
 * the scene graph until it reaches the event target, at which point it begins its return trip through
 * the scene graph. This round-trip journey to the event target is conceptually divided into three phases:
 * - The capture phase comprises the journey from the root to the last node before the event target's node
 * - The target phase comprises only the event target node
 * - The bubbling phase comprises any subsequent nodes encountered on the return trip to the root of the tree
 * See also: http://www.w3.org/TR/DOM-Level-3-Events/#event-flow
 *
 * Event targets can implement the following methods:
 *  - _getCapturingTargets
 *  - _getBubblingTargets
 * 
 * If a class cannot extend from EventTarget, it can consider implements IEventTarget interface.
 *
 * !#zh
 * 事件目标是具有注册监听器、派发事件能力的类，Node 是最常见的事件目标，
 * 但是其他类也可以继承自事件目标以获得管理监听器和派发事件的能力。
 * 如果无法继承自 EventTarget，也可以考虑自实现 IEventTarget
 */
export class EventTarget extends CallbacksInvoker {
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
     * @param target - The target (this object) to invoke the callback, can be null
     * @return - Just returns the incoming callback so you can save the anonymous function easier.
     * @example
     * eventTarget.on('fire', function () {
     *     cc.log("fire in the hole");
     * }, node);
     */
    public on (type: string, callback: Function, target?: Object) {
        if (!callback) {
            cc.errorID(6800);
            return;
        }

        if (!this.hasEventListener(type, callback, target)) {
            super.on(type, callback, target);

            const targetImpl = target as ITargetImpl;
            if (target) {
                if (targetImpl.__eventTargets) {
                    targetImpl.__eventTargets.push(this);
                } else if (targetImpl.node && targetImpl.node.__eventTargets) {
                    targetImpl.node.__eventTargets.push(this);
                }
            }
        }
        return callback;
    }

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
     * // register fire eventListener
     * var callback = eventTarget.on('fire', function () {
     *     cc.log("fire in the hole");
     * }, target);
     * // remove fire event listener
     * eventTarget.off('fire', callback, target);
     * // remove all fire event listeners
     * eventTarget.off('fire');
     */
    public off (type: string, callback?: Function, target?: Object) {
        if (!callback) {
            this.removeAll(type);
        }
        else {
            super.off(type, callback, target);

            const targetImpl = target as ITargetImpl;
            if (target) {
                if (targetImpl.__eventTargets) {
                    fastRemove(targetImpl.__eventTargets, this);
                } else if (targetImpl.node && targetImpl.node.__eventTargets) {
                    fastRemove(targetImpl.node.__eventTargets, this);
                }
            }
        }
    }

    /**
     * @en Removes all callbacks previously registered with the same target (passed as parameter).
     * This is not for removing all listeners in the current event target,
     * and this is not for removing all listeners the target parameter have registered.
     * It's only for removing all listeners (callback and target couple) registered on the current event target by the target parameter.
     * @zh 在当前 EventTarget 上删除指定目标（target 参数）注册的所有事件监听器。
     * 这个函数无法删除当前 EventTarget 的所有事件监听器，也无法删除 target 参数所注册的所有事件监听器。
     * 这个函数只能删除 target 参数在当前 EventTarget 上注册的所有事件监听器。
     * @param target - The target to be searched for all related listeners
     */
    public targetOff (keyOrTarget?: string | Object) {
        this.removeAll(keyOrTarget);
    }

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
     * eventTarget.once('fire', function () {
     *     cc.log("this is the callback and will be invoked only once");
     * }, node);
     */
    public once (type: string, callback: Function, target?: Object) {
        if (!callback) {
            cc.errorID(6800);
            return;
        }

        if (!this.hasEventListener(type, callback, target)) {
            super.on(type, callback, target, true);

            const targetImpl = target as ITargetImpl;
            if (target) {
                if (targetImpl.__eventTargets) {
                    targetImpl.__eventTargets.push(this);
                } else if (targetImpl.node && targetImpl.node.__eventTargets) {
                    targetImpl.node.__eventTargets.push(this);
                }
            }
        }
        return callback;
    }
}

cc.EventTarget = EventTarget;
