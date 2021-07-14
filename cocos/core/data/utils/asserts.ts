/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

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

import { DEBUG } from 'internal:constants';

/**
 * Asserts that the expression is non-nullable, i.e. is neither `null` nor `undefined`.
 * @param expr Testing expression.
 * @param message Optional message.
 */
export function assertIsNonNullable<T> (expr: T, message?: string): asserts expr is NonNullable<T> {
    assertIsTrue(!(expr === null || expr === undefined), message);
}

/**
 * Asserts that the expression evaluated to `true`.
 * @param expr Testing expression.
 * @param message Optional message.
 */
export function assertIsTrue (expr: unknown, message?: string): asserts expr {
    if (DEBUG && !expr) {
        throw new Error(`Assertion failed: ${message ?? '<no-message>'}`);
    }
}

export function assertsArrayIndex<T> (array: T[], index: number) {
    assertIsTrue(index >= 0 && index < array.length, `Array index ${index} out of bounds: [0, ${array.length})`);
}
