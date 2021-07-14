/*
 Copyright (c) 2021 Xiamen Yaji Software Co., Ltd.

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
 * @module core/distributed
 */

 import { SERVER_MODE } from 'internal:constants';
import { director } from '../../director';
import { DistributeEventSystem } from '../distribute-system';

export enum ReplicateType {
    SERVER_ONLY,
    CLIENT_ONLY,
    CLIENT_SERVER,
    ALL_CLIENTS,
}

function onServerSet (target: any, key: string, value: any) {
    if (target.replicated) {
        const sys = director.getSystem(DistributeEventSystem.ID) as DistributeEventSystem;
        sys.enqueueEvent('property-update', target, key, value);
    }
}

function onClientSet (target: any, key: string, value: any, callback? : string) {
    if (!callback) {
        return;
    }
    const onFunc = target[callback];
    if (onFunc) {
        onFunc.call(target, key, value);
    }
}

export function sync (replicateType: ReplicateType, callback? : string) {
    return function (proto: any, propertyKey: any, descriptor?: any): any {
        if (descriptor.get || descriptor.set) {
            const originSet = descriptor.set;
            if (originSet) {
                descriptor.set = function (val: any) {
                    originSet.call(this, val);
                    if (SERVER_MODE && replicateType === ReplicateType.CLIENT_SERVER) {
                        onServerSet(this, propertyKey, val);
                    }
                    if (!SERVER_MODE && callback) {
                        onClientSet(this, propertyKey, val, callback);
                    }
                };
            }
        } else {
            const desc: PropertyDescriptor = {};
            const instancePropName = `__${propertyKey}__`;
            const initializer = descriptor.initializer;
            desc.set = function (val) {
                (this as Record<string, any>)[instancePropName] = val;
                if (SERVER_MODE && replicateType === ReplicateType.CLIENT_SERVER) {
                    onServerSet(this, propertyKey, val);
                }
                if (!SERVER_MODE && callback) {
                    onClientSet(this, propertyKey, val, callback);
                }
            };
            desc.get = function () {
                if (instancePropName in this) {
                    return (this as Record<string, any>)[instancePropName];
                } else {
                    return initializer.call(this);
                }
            };
            return desc;
        }
    };
}
