/*
 Copyright (c) 2018-2020 Xiamen Yaji Software Co., Ltd.

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
 * @module core
 */

import { logID } from '../platform/debug';

export { default as MutableForwardIterator } from './mutable-forward-iterator';

/**
 * @zh
 * 移除指定索引的数组元素。
 * @en
 * Removes the array item at the specified index.
 * @param array 数组。
 * @param index 待移除元素的索引。
 */
export function removeAt<T> (array: T[], index: number) {
    array.splice(index, 1);
}

/**
 * @zh
 * 移除指定索引的数组元素。
 * 此函数十分高效，但会改变数组的元素次序。
 * @en
 * Removes the array item at the specified index.
 * It's faster but the order of the array will be changed.
 * @param array 数组。
 * @param index 待移除元素的索引。
 */
export function fastRemoveAt<T> (array: T[], index: number) {
    const length = array.length;
    if (index < 0 || index >= length) {
        return;
    }
    array[index] = array[length - 1];
    array.length = length - 1;
}

/**
 * @zh
 * 移除首个指定的数组元素。判定元素相等时相当于于使用了 `Array.prototype.indexOf`。
 * @en
 * Removes the first occurrence of a specific object from the array.
 * Decision of the equality of elements is similar to `Array.prototype.indexOf`.
 * @param array 数组。
 * @param value 待移除元素。
 */
export function remove<T> (array: T[], value: T) {
    const index = array.indexOf(value);
    if (index >= 0) {
        removeAt(array, index);
        return true;
    } else {
        return false;
    }
}

/**
 * @zh
 * 移除首个指定的数组元素。判定元素相等时相当于于使用了 `Array.prototype.indexOf`。
 * 此函数十分高效，但会改变数组的元素次序。
 * @en
 * Removes the first occurrence of a specific object from the array.
 * Decision of the equality of elements is similar to `Array.prototype.indexOf`.
 * It's faster but the order of the array will be changed.
 * @param array 数组。
 * @param value 待移除元素。
 */
export function fastRemove<T> (array: T[], value: T) {
    const index = array.indexOf(value);
    if (index >= 0) {
        array[index] = array[array.length - 1];
        --array.length;
    }
}

/**
 * @zh
 * 移除首个使谓词满足的数组元素。
 * @en
 * Removes the first occurrence of a specific object from the array where `predicate` is `true`.
 * @param array 数组。
 * @param predicate 谓词。
 */
export function removeIf<T> (array: T[], predicate: (value: T) => boolean) {
    const index = array.findIndex(predicate);
    if (index >= 0) {
        const value = array[index];
        removeAt(array, index);
        return value;
    }
}

/**
 * @zh
 * 验证数组的类型。
 * 此函数将用 `instanceof` 操作符验证每一个元素。
 * @en
 * Verify array's Type.
 * This function tests each element using `instanceof` operator.
 * @param array 数组。
 * @param type 类型。
 * @returns 当每一个元素都是指定类型时返回 `true`，否则返回 `false`。
 */
export function verifyType<T extends Function> (array: any[], type: T): array is T[] {
    if (array && array.length > 0) {
        for (const item of array) {
            if (!(item instanceof type)) {
                logID(1300);
                return false;
            }
        }
    }
    return true;
}

/**
 * @zh
 * 移除多个数组元素。
 * @en
 * Removes multiple array elements.
 * @param array 源数组。
 * @param removals 所有待移除的元素。此数组的每个元素所对应的首个源数组的元素都会被移除。
 */
export function removeArray<T> (array: T[], removals: T[]) {
    for (let i = 0, l = removals.length; i < l; i++) {
        remove(array, removals[i]);
    }
}

/**
 * @zh
 * 在数组的指定索引上插入对象。
 * @en
 * Inserts some objects at specified index.
 * @param array 数组。
 * @param objects 插入的所有对象。
 * @param index 插入的索引。
 * @returns `array`。
 */
export function appendObjectsAt<T> (array: T[], objects: T[], index: number) {
    array.splice.apply(array, [index, 0, ...objects]);
    return array;
}

/**
 * @zh
 * 返回数组是否包含指定的元素。
 * @en
 * Determines whether the array contains a specific element.
 * @returns 返回数组是否包含指定的元素。
 */
export function contains<T> (array: T[], value: T) {
    return array.indexOf(value) >= 0;
}

/**
 * @zh
 * 拷贝数组。
 * @en
 * Copy an array.
 * @param 源数组。
 * @returns 数组的副本。
 */
export function copy<T> (array: T[]) {
    const len = array.length;
    const cloned = new Array<T>(len);
    for (let i = 0; i < len; i += 1) {
        cloned[i] = array[i];
    }
    return cloned;
}
