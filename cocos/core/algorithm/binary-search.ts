/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
 * Searches the **sorted** number array for an element and returns the index of that element.
 * @param array The array to search in.
 * @param value The value to search.
 * @return The index of the searched element in the sorted array, if one is found;
 * otherwise, a negative number that is the bitwise complement of the index of the next element that is large than the searched value or,
 * if there is no larger element(include the case that the array is empty), the bitwise complement of array's length.
 */
export function binarySearch (array: number[], value: number) {
    return binarySearchEpsilon(array, value, 0);
}

/**
 * Searches the **sorted** number array for an element and returns the index of that element.
 * @param array The array to search in.
 * @param value The value to search.
 * @param EPSILON The epsilon to compare the numbers. Default to `1e-6`.
 * @return The index of the searched element in the sorted array, if one is found;
 * otherwise, a negative number that is the bitwise complement of the index of the next element that is large than the searched value or,
 * if there is no larger element(include the case that the array is empty), the bitwise complement of array's length.
 */
export function binarySearchEpsilon (array: readonly number[], value: number, EPSILON = 1e-6) {
    let low = 0;
    let high = array.length - 1;
    let middle = high >>> 1;
    for (; low <= high; middle = (low + high) >>> 1) {
        const test = array[middle];
        if (test > (value + EPSILON)) {
            high = middle - 1;
        } else if (test < (value - EPSILON)) {
            low = middle + 1;
        } else {
            return middle;
        }
    }
    return ~low;
}

/**
 * Searches the **sorted** array for an element and returns the index of that element.
 * @param array The array to search in.
 * @param value The value to search.
 * @param lessThan The predicate which implements the less than semantic.
 * @return The index of the searched element in the sorted array, if one is found;
 * otherwise, a negative number that is the bitwise complement of the index of the next element that is large than the searched value or,
 * if there is no larger element(include the case that the array is empty), the bitwise complement of array's length.
 */
export function binarySearchBy<T, U> (array: T[], value: U, lessThan: (lhs: T, rhs: U) => number) {
    let low = 0;
    let high = array.length - 1;
    let middle = high >>> 1;
    for (; low <= high; middle = (low + high) >>> 1) {
        const test = array[middle];
        if (lessThan(test, value) < 0) {
            high = middle - 1;
        } else if (lessThan(test, value) > 0) {
            low = middle + 1;
        } else {
            return middle;
        }
    }
    return ~low;
}
