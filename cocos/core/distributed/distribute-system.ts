/*
 Copyright (c) 2021 Xiamen Yaji Software Co., Ltd.

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
 * @packageDocumentation
 * @module core/distributed
 */

import { Director, director } from '../director';
import System from '../components/system';

export interface IDistributedEvent {
    invoke: () => void;
}

/**
 * @en
 * System for sync distributed events.
 * @zh
 * 分布式消息系统。
 */
export class DistributeEventSystem extends System {
    /**
     * @en
     * The ID flag of the system.
     * @zh
     * 此系统的 ID 标记。
     */
    public static readonly ID = 'DISTRIBUTE';

    public static get instance () {
        if (!DistributeEventSystem._instance) {
            DistributeEventSystem._instance = new DistributeEventSystem();
        }
        return DistributeEventSystem._instance;
    }

    private static _instance: DistributeEventSystem;

    private _eventMap: Map<string, (...args:any)=>IDistributedEvent> = new Map();

    private _events: IDistributedEvent[] = [];

    public postUpdate (dt: number) {
        for (let i = 0, l = this._events.length; i < l; i++) {
            this._events[i].invoke();
        }
        this._events.length = 0;
    }

    public registerEventType (eventType: string, createFunc: (...args:any)=>IDistributedEvent) {
        this._eventMap[eventType] = createFunc;
    }

    public enqueueEvent (eventType: string, ...args: any) {
        const createFunc = this._eventMap[eventType];
        if (createFunc) {
            const event = createFunc(...args);
            this._events.push(event);
        }
    }
}

director.on(Director.EVENT_INIT, () => {
    // Distributed system is invoked after component and other system update
    director.registerSystem(DistributeEventSystem.ID, DistributeEventSystem.instance, System.Priority.LOW);
});
