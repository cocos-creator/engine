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

import { ccclass, serializable } from 'cc.decorator';
import { Node } from '../scene-graph/node';
import { warn } from '../platform/debug';

export type PropertyPath = string | number;

export interface ICustomTargetPath {
    /**
     * If errors are encountered, `null` should be returned.
     * @param target
     */
    get(target: any): any;
}

export type TargetPath = PropertyPath | ICustomTargetPath;

export function isPropertyPath (path: TargetPath): path is PropertyPath {
    return typeof path === 'string' || typeof path === 'number';
}

export function isCustomPath<T extends ICustomTargetPath> (path: TargetPath, constructor: Constructor<T>): path is T {
    return path instanceof constructor;
}

@ccclass('cc.animation.HierarchyPath')
export class HierarchyPath implements ICustomTargetPath {
    @serializable
    public path = '';

    constructor (path?: string) {
        this.path = path || '';
    }

    public get (target: Node) {
        if (!(target instanceof Node)) {
            warn(`Target of hierarchy path should be of type Node.`);
            return null;
        }
        const result = target.getChildByPath(this.path);
        if (!result) {
            warn(`Node "${target.name}" has no path "${this.path}"`);
            return null;
        }
        return result;
    }
}

@ccclass('cc.animation.ComponentPath')
export class ComponentPath implements ICustomTargetPath {
    @serializable
    public component = '';

    constructor (component?: string) {
        this.component = component || '';
    }

    public get (target: Node) {
        if (!(target instanceof Node)) {
            warn(`Target of component path should be of type Node.`);
            return null;
        }
        const result = target.getComponent(this.component);
        if (!result) {
            warn(`Node "${target.name}" has no component "${this.component}"`);
            return null;
        }
        return result;
    }
}
