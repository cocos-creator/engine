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
import { ccclass } from 'cc.decorator';
import * as animation from './animation';
import * as easing from './easing';
import { ComponentPath, HierarchyPath, ICustomTargetPath, TargetPath } from './target-path';
import { IValueProxyFactory } from './value-proxy';
import { UniformProxyFactory } from './value-proxy-factories/uniform';
import { legacyCC } from '../global-exports';

export * from './deprecated';

legacyCC.easing = easing;
export * from './bezier';
export { easing };
export * from './animation-curve';
export { AnimationClip } from './animation-clip';
export * from './animation-manager';
export {
    AnimationState,
} from './animation-state';
export * from './animation-component';
export * from './transform-utils';
export { animation };

/**
 * Use stuffs in `import('cc').animation` instead.
 * @deprecated Since v1.1.
 */
export * from './cubic-spline-value';

/**
 * Alias of `HierarchyPath`.
 * @deprecated Since v1.1.
 */
@ccclass('cc.HierachyModifier')
export class HierachyModifier extends HierarchyPath {}
legacyCC.HierachyModifier = HierachyModifier;

/**
 * Alias of `ComponentPath`.
 * @deprecated Since v1.1.
 */
@ccclass('cc.ComponentModifier')
export class ComponentModifier extends ComponentPath {}
legacyCC.ComponentModifier = ComponentModifier;

/**
 * Implements `IValueProxyFactory` but do nothing.
 * @deprecated Since v1.1.
 */
@ccclass('cc.CurveValueAdapter')
export class CurveValueAdapter implements IValueProxyFactory {
    public forTarget (target: any) {
        return {
            set: () => {

            },
        };
    }
}
legacyCC.CurveValueAdapter = CurveValueAdapter;

/**
 * Alias of `UniformProxyFactory`.
 * @deprecated Since v1.1.
 */
@ccclass('cc.UniformCurveValueAdapter')
export class UniformCurveValueAdapter extends UniformProxyFactory {}
legacyCC.UniformCurveValueAdapter = UniformCurveValueAdapter;

/**
 * Alias of `isPropertyPath(path) && typeof path === 'string'`.
 * @deprecated Since v1.1.
 */
export function isPropertyModifier (path: TargetPath): path is string {
    return typeof path === 'string';
}
legacyCC.isPropertyModifier = isPropertyModifier;

/**
 * Alias of `isPropertyPath(path) && typeof path === 'number'`.
 * @deprecated Since v1.1.
 */
export function isElementModifier (path: TargetPath): path is number {
    return typeof path === 'number';
}
legacyCC.isElementModifier = isElementModifier;

/**
 * Alias of `isCustomPath()`.
 * @deprecated Since v1.1.
 */
export function isCustomTargetModifier<T extends ICustomTargetPath> (path: TargetPath, constructor: Constructor<T>): path is T {
    return path instanceof constructor;
}
legacyCC.isCustomTargetModifier = isCustomTargetModifier;
