/*
 Copyright (c) 2019 Xiamen Yaji Software Co., Ltd.

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

import { Size, Vec3, Vec2, Mat4, Quat } from "../value-types";
import { SystemEventType } from "../platform/event-manager/event-enum";

export interface INode {
    _persistNode: boolean;

    name: string;
    uuid: string;
    scene;
    parent;
    children;
    hasChanged: boolean;
    activeInHierarchy: boolean;
    eventProcessor;

    worldScale: Vec3;
    width: number;
    height: number;
    uiTransfromComp;

    isChildOf (parent: this): boolean;
    addChild (child: this);

    addComponent (typeOrClassName: string | Function);
    _removeComponent (component);
    getComponent (typeOrClassName: string | Function);
    getComponents (typeOrClassName: string | Function);
    getComponentInChildren (typeOrClassName: string | Function);
    getComponentsInChildren (typeOrClassName: string | Function);

    getWorldMatrix (out?: Mat4): Mat4;
    getPosition (out?: Vec3): Vec3;
    setPosition (val: Vec3 | number, y?: number, z?: number);
    getWorldPosition (out?: Vec3): Vec3;
    setWorldPosition (val: Vec3 | number, y?: number, z?: number);
    getWorldRotation (out?: Quat): Quat;
    getScale (out?: Vec3): Vec3;
    getContentSize (out?: Size): Size;
    setContentSize (size: Size | number, height?: number);
    getAnchorPoint (out?: Vec2): Vec2;

    on (type: string | SystemEventType, callback: Function, target?: Object, useCapture?: any);
    off (type: string, callback?: Function, target?: Object, useCapture?: any);
    dispatchEvent (event);
}