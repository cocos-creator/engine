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
 * @hidden
 */
import { Vec3 } from '../../core';
import { IVec3Like, IQuatLike } from '../../core/math/type-define';
import { Collider, CollisionEventType, IContactEquation, TriggerEventType } from '../framework';

interface IWrapped<T> {
    __cc_wrapper__: T;
}

export function setWrap<Wrapper> (object: any, wrapper: Wrapper) {
    (object as IWrapped<Wrapper>).__cc_wrapper__ = wrapper;
}

export function getWrap<Wrapper> (object: any) {
    return (object as IWrapped<Wrapper>).__cc_wrapper__;
}

export function maxComponent (v: IVec3Like) {
    return Math.max(v.x, Math.max(v.y, v.z));
}

export const VEC3_0 = new Vec3();

export const TriggerEventObject = {
    type: 'onTriggerEnter' as TriggerEventType,
    selfCollider: null as Collider | null,
    otherCollider: null as Collider | null,
    impl: null as any,
};

export const CollisionEventObject = {
    type: 'onCollisionEnter' as CollisionEventType,
    selfCollider: null as unknown as Collider,
    otherCollider: null as unknown as Collider,
    contacts: [] as IContactEquation[],
    impl: null as any,
};
