/*
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
 * @packageDocumentation
 * @module scene-graph
 */

import { ccclass, editable, serializable } from 'cc.decorator';
import { DEV, DEBUG, EDITOR } from 'internal:constants';
import { Component } from '../components/component';
import { property } from '../data/decorators/property';
import { CCObject, distributedManager } from '../data/object';
import { Event } from '../event';
import { errorID, warnID, error, log, getError } from '../platform/debug';
import { ISchedulable } from '../scheduler';
import IdGenerator from '../utils/id-generator';
import * as js from '../utils/js';
import { baseNodePolyfill } from './base-node-dev';
import { legacyCC } from '../global-exports';
import { Node } from './node';
import type { Scene } from './scene';
import { PrefabInfo } from '../utils/prefab/prefab-info';
import { NodeEventType } from './node-event';

const Destroying = CCObject.Flags.Destroying;
const DontDestroy = CCObject.Flags.DontDestroy;
const Deactivating = CCObject.Flags.Deactivating;

export const TRANSFORM_ON = 1 << 0;

// const CHILD_ADDED = 'child-added';
// const CHILD_REMOVED = 'child-removed';

const idGenerator = new IdGenerator('Node');

function getConstructor<T> (typeOrClassName: string | Constructor<T>): Constructor<T> | null | undefined {
    if (!typeOrClassName) {
        errorID(3804);
        return null;
    }
    if (typeof typeOrClassName === 'string') {
        return js.getClassByName(typeOrClassName) as Constructor<T> | undefined;
    }

    return typeOrClassName;
}

/**
 * @en The base class for [[Node]], it:
 * - maintains scene hierarchy and life cycle logic
 * - provides EventTarget ability
 * - emits events if some properties changed, ref: [[Node.EventType]]
 * - manages components
 * @zh [[Node]] 的基类，他会负责：
 * - 维护场景树以及节点生命周期管理
 * - 提供 EventTarget 的事件管理和注册能力
 * - 派发节点状态相关的事件，参考：[[Node.EventType]]
 * - 管理组件
 */
@ccclass('cc.BaseNode')
export class BaseNode extends CCObject implements ISchedulable {
    /**
     * @en Gets all components attached to this node.
     * @zh 获取附加到此节点的所有组件。
     */
    get components (): ReadonlyArray<Component> {
        return this._components;
    }

    /**
     * @en If true, the node is an persist node which won't be destroyed during scene transition.
     * If false, the node will be destroyed automatically when loading a new scene. Default is false.
     * @zh 如果为true，则该节点是一个常驻节点，不会在场景转换期间被销毁。
     * 如果为false，节点将在加载新场景时自动销毁。默认为 false。
     * @default false
     * @protected
     */
    @property
    get _persistNode (): boolean {
        return (this._objFlags & DontDestroy) > 0;
    }
    set _persistNode (value) {
        if (value) {
            this._objFlags |= DontDestroy;
        } else {
            this._objFlags &= ~DontDestroy;
        }
    }

    // API

    /**
     * @en Name of node.
     * @zh 该节点名称。
     */
    @editable
    get name (): string {
        return this._name;
    }
    set name (value) {
        if (DEV && value.indexOf('/') !== -1) {
            errorID(1632);
            return;
        }
        this._name = value;
    }

    /**
     * @en All children nodes.
     * @zh 节点的所有子节点。
     * @readOnly
     */
    @editable
    get children () {
        return this._children;
    }

    /**
     * @en
     * The local active state of this node.
     * Note that a Node may be inactive because a parent is not active, even if this returns true.
     * Use [[activeInHierarchy]]
     * if you want to check if the Node is actually treated as active in the scene.
     * @zh
     * 当前节点的自身激活状态。
     * 值得注意的是，一个节点的父节点如果不被激活，那么即使它自身设为激活，它仍然无法激活。
     * 如果你想检查节点在场景中实际的激活状态可以使用 [[activeInHierarchy]]
     * @default true
     */
    @editable
    get active () {
        return this._active;
    }
    set active (isActive: boolean) {
        if (this._active !== isActive) {
            this._active = isActive;
            const parent = this._parent;
            if (parent) {
                const couldActiveInScene = parent._activeInHierarchy;
                if (couldActiveInScene) {
                    legacyCC.director._nodeActivator.activateNode(this, isActive);
                }
            }
        }
    }

    /**
     * @en Indicates whether this node is active in the scene.
     * @zh 表示此节点是否在场景中激活。
     */
    @editable
    get activeInHierarchy () {
        return this._activeInHierarchy;
    }

    /**
     * @en The parent node
     * @zh 父节点
     */
    @editable
    get parent () {
        return this._parent;
    }
    set parent (value) {
        this.setParent(value);
    }

    /**
     * @en Which scene this node belongs to.
     * @zh 此节点属于哪个场景。
     * @readonly
     */
    get scene () {
        return this._scene;
    }

    /**
     * @en The event processor of the current node, it provides EventTarget ability.
     * @zh 当前节点的事件处理器，提供 EventTarget 能力。
     * @readonly
     */
    get eventProcessor () {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._eventProcessor;
    }

    protected static idGenerator = idGenerator;

    // For walk
    protected static _stacks: Array<Array<(BaseNode | null)>> = [[]];
    protected static _stackId = 0;

    /**
     * Call `_updateScene` of specified node.
     * @param node The node.
     */
    protected static _setScene (node: BaseNode) {
        node._updateScene();
    }

    protected static _findComponent<T extends Component> (node: BaseNode, constructor: Constructor<T>): T | null {
        const cls = constructor as any;
        const comps = node._components;
        if (cls._sealed) {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp.constructor === constructor) {
                    return comp as T;
                }
            }
        } else {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp instanceof constructor) {
                    return comp;
                }
            }
        }
        return null;
    }

    protected static _findComponents<T extends Component> (node: BaseNode, constructor: Constructor<T>, components: Component[]) {
        const cls = constructor as any;
        const comps = node._components;
        if (cls._sealed) {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp.constructor === constructor) {
                    components.push(comp);
                }
            }
        } else {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp instanceof constructor) {
                    components.push(comp);
                }
            }
        }
    }

    protected static _findChildComponent<T extends Component> (children: BaseNode[], constructor: Constructor<T>): T | null {
        for (let i = 0; i < children.length; ++i) {
            const node = children[i];
            let comp = BaseNode._findComponent(node, constructor);
            if (comp) {
                return comp;
            }

            if (node._children.length > 0) {
                comp = BaseNode._findChildComponent(node._children, constructor);
                if (comp) {
                    return comp;
                }
            }
        }
        return null;
    }

    protected static _findChildComponents (children: BaseNode[], constructor, components) {
        for (let i = 0; i < children.length; ++i) {
            const node = children[i];
            BaseNode._findComponents(node, constructor, components);
            if (node._children.length > 0) {
                BaseNode._findChildComponents(node._children, constructor, components);
            }
        }
    }

    @serializable
    protected _parent: this | null = null;

    @serializable
    protected _children: this[] = [];

    @serializable
    protected _active = true;

    @serializable
    protected _components: Component[] = [];

    // The PrefabInfo object
    @serializable
    protected _prefab: PrefabInfo|null = null;

    protected _scene: Scene = null!;

    protected _activeInHierarchy = false;

    protected _id: string = idGenerator.getNewId();

    protected _name: string;

    protected _eventProcessor: any = new legacyCC.NodeEventProcessor(this);
    protected _eventMask = 0;

    protected _siblingIndex = 0;

    // record scene's id when set this node as persist node
    public _originalSceneId = '';

    /**
     * Set `_scene` field of this node.
     * The derived `Scene` overrides this method to behavior differently.
     */
    protected _updateScene () {
        if (this._parent == null) {
            error('Node %s(%s) has not attached to a scene.', this.name, this.uuid);
        } else {
            this._scene = this._parent._scene;
        }
    }

    protected _registerIfAttached = !EDITOR ? undefined : function _registerIfAttached (this: BaseNode, register) {
        if (EditorExtends.Node && EditorExtends.Component) {
            if (register) {
                EditorExtends.Node.add(this._id, this);

                for (let i = 0; i < this._components.length; i++) {
                    const comp = this._components[i];
                    EditorExtends.Component.add(comp._id, comp);
                }
            } else {
                for (let i = 0; i < this._components.length; i++) {
                    const comp = this._components[i];
                    EditorExtends.Component.remove(comp._id);
                }

                EditorExtends.Node.remove(this._id);
            }
        }

        const children = this._children;
        for (let i = 0, len = children.length; i < len; ++i) {
            const child = children[i];
            child._registerIfAttached!(register);
        }
    };

    constructor (name?: string) {
        super(name);
        this._name = name !== undefined ? name : 'New Node';
    }

    /**
     * @en
     * Properties configuration function.
     * All properties in attrs will be set to the node,
     * when the setter of the node is available,
     * the property will be set via setter function.
     * @zh 属性配置函数。在 attrs 的所有属性将被设置为节点属性。
     * @param attrs - Properties to be set to node
     * @example
     * ```
     * var attrs = { name: 'New Name', active: false };
     * node.attr(attrs);
     * ```
     */
    public attr (attrs: unknown) {
        js.mixin(this, attrs);
    }

    // HIERARCHY METHODS

    /**
     * @en Get parent of the node.
     * @zh 获取该节点的父节点。
     */
    public getParent () {
        return this._parent;
    }

    /**
     * @en Set parent of the node.
     * @zh 设置该节点的父节点。
     */
    public setParent (value: this | Scene | null, keepWorldTransform = false) {
        if (this._parent === value) {
            return;
        }
        const oldParent = this._parent;
        const newParent = value as this;
        if (DEBUG && oldParent
            // Change parent when old parent deactivating or activating
            && (oldParent._objFlags & Deactivating)) {
            errorID(3821);
        }

        this._parent = newParent;
        // Reset sibling index
        this._siblingIndex = 0;

        this._onSetParent(oldParent, keepWorldTransform);

        if (this.emit) {
            this.emit(NodeEventType.PARENT_CHANGED, oldParent);
        }

        if (oldParent) {
            if (!(oldParent._objFlags & Destroying)) {
                const removeAt = oldParent._children.indexOf(this);
                if (DEV && removeAt < 0) {
                    errorID(1633);
                    return;
                }
                oldParent._children.splice(removeAt, 1);
                oldParent._updateSiblingIndex();
                if (oldParent.emit) {
                    oldParent.emit(NodeEventType.CHILD_REMOVED, this);
                }
            }
        }

        if (newParent) {
            if (DEBUG && (newParent._objFlags & Deactivating)) {
                errorID(3821);
            }
            newParent._children.push(this);
            this._siblingIndex = newParent._children.length - 1;
            if (newParent.emit) {
                newParent.emit(NodeEventType.CHILD_ADDED, this);
            }
        }

        this._onHierarchyChanged(oldParent);
    }

    /**
     * @en Returns a child with the same uuid.
     * @zh 通过 uuid 获取节点的子节点。
     * @param uuid - The uuid to find the child node.
     * @return a Node whose uuid equals to the input parameter
     */
    public getChildByUuid (uuid: string) {
        if (!uuid) {
            log('Invalid uuid');
            return null;
        }

        const locChildren = this._children;
        for (let i = 0, len = locChildren.length; i < len; i++) {
            if (locChildren[i]._id === uuid) {
                return locChildren[i];
            }
        }
        return null;
    }

    /**
     * @en Returns a child with the same name.
     * @zh 通过名称获取节点的子节点。
     * @param name - A name to find the child node.
     * @return a CCNode object whose name equals to the input parameter
     * @example
     * ```
     * var child = node.getChildByName("Test Node");
     * ```
     */
    public getChildByName (name: string) {
        if (!name) {
            log('Invalid name');
            return null;
        }

        const locChildren = this._children;
        for (let i = 0, len = locChildren.length; i < len; i++) {
            if (locChildren[i]._name === name) {
                return locChildren[i];
            }
        }
        return null;
    }

    /**
     * @en Returns a child with the given path.
     * @zh 通过路径获取节点的子节点。
     * @param path - A path to find the child node.
     * @return a Node object whose path equals to the input parameter
     * @example
     * ```
     * var child = node.getChildByPath("subNode/Test Node");
     * ```
     */
    public getChildByPath (path: string) {
        const segments = path.split('/');
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let lastNode: this = this;
        for (let i = 0; i < segments.length; ++i) {
            const segment = segments[i];
            if (segment.length === 0) {
                continue;
            }
            const next = lastNode.children.find((childNode) => childNode.name === segment);
            if (!next) {
                return null;
            }
            lastNode = next;
        }
        return lastNode;
    }

    /**
     * @en Add a child to the current node.
     * @zh 添加一个子节点。
     * @param child - the child node to be added
     */
    public addChild (child: this | Node): void {
        (child as this).setParent(this);
    }

    /**
     * @en Inserts a child to the node at a specified index.
     * @zh 插入子节点到指定位置
     * @param child - the child node to be inserted
     * @param siblingIndex - the sibling index to place the child in
     * @example
     * ```
     * node.insertChild(child, 2);
     * ```
     */
    public insertChild (child: this | Node, siblingIndex: number) {
        child.parent = this;
        child.setSiblingIndex(siblingIndex);
    }

    /**
     * @en Get the sibling index of the current node in its parent's children array.
     * @zh 获取当前节点在父节点的 children 数组中的位置。
     */
    public getSiblingIndex () {
        return this._siblingIndex;
    }

    /**
     * @en Set the sibling index of the current node in its parent's children array.
     * @zh 设置当前节点在父节点的 children 数组中的位置。
     */
    public setSiblingIndex (index: number) {
        if (!this._parent) {
            return;
        }
        if (this._parent._objFlags & Deactivating) {
            errorID(3821);
            return;
        }
        const siblings = this._parent._children;
        index = index !== -1 ? index : siblings.length - 1;
        const oldIndex = siblings.indexOf(this);
        if (index !== oldIndex) {
            siblings.splice(oldIndex, 1);
            if (index < siblings.length) {
                siblings.splice(index, 0, this);
            } else {
                siblings.push(this);
            }
            this._parent._updateSiblingIndex();
            if (this._onSiblingIndexChanged) {
                this._onSiblingIndexChanged(index);
            }
        }
    }

    /**
     * @en Walk though the sub children tree of the current node.
     * Each node, including the current node, in the sub tree will be visited two times,
     * before all children and after all children.
     * This function call is not recursive, it's based on stack.
     * Please don't walk any other node inside the walk process.
     * @zh 遍历该节点的子树里的所有节点并按规则执行回调函数。
     * 对子树中的所有节点，包含当前节点，会执行两次回调，preFunc 会在访问它的子节点之前调用，postFunc 会在访问所有子节点之后调用。
     * 这个函数的实现不是基于递归的，而是基于栈展开递归的方式。
     * 请不要在 walk 过程中对任何其他的节点嵌套执行 walk。
     * @param preFunc The callback to process node when reach the node for the first time
     * @param postFunc The callback to process node when re-visit the node after walked all children in its sub tree
     * @example
     * ```
     * node.walk(function (target) {
     *     console.log('Walked through node ' + target.name + ' for the first time');
     * }, function (target) {
     *     console.log('Walked through node ' + target.name + ' after walked all children in its sub tree');
     * });
     * ```
     */
    public walk (preFunc: (target: this) => void, postFunc?: (target: this) => void) {
        // const BaseNode = cc._BaseNode;
        let index = 1;
        let children: this[] | null = null;
        let curr: this | null = null;
        let i = 0;
        let stack = BaseNode._stacks[BaseNode._stackId];
        if (!stack) {
            stack = [];
            BaseNode._stacks.push(stack);
        }
        BaseNode._stackId++;

        stack.length = 0;
        stack[0] = this;
        let parent: this | null = null;
        let afterChildren = false;
        while (index) {
            index--;
            curr = stack[index] as (this | null);
            if (!curr) {
                continue;
            }
            if (!afterChildren && preFunc) {
                // pre call
                preFunc(curr);
            } else if (afterChildren && postFunc) {
                // post call
                postFunc(curr);
            }

            // Avoid memory leak
            stack[index] = null;
            // Do not repeatedly visit child tree, just do post call and continue walk
            if (afterChildren) {
                if (parent === this._parent) break;
                afterChildren = false;
            } else {
                // Children not proceeded and has children, proceed to child tree
                if (curr._children.length > 0) {
                    parent = curr;
                    children = curr._children;
                    i = 0;
                    stack[index] = children[i];
                    index++;
                } else {
                    stack[index] = curr;
                    index++;
                    afterChildren = true;
                }
                continue;
            }
            // curr has no sub tree, so look into the siblings in parent children
            if (children) {
                i++;
                // Proceed to next sibling in parent children
                if (children[i]) {
                    stack[index] = children[i];
                    index++;
                } else if (parent) {
                    stack[index] = parent;
                    index++;
                    // Setup parent walk env
                    afterChildren = true;
                    if (parent._parent) {
                        children = parent._parent._children;
                        i = children.indexOf(parent);
                        parent = parent._parent;
                    } else {
                        // At root
                        parent = null;
                        children = null;
                    }

                    // ERROR
                    if (i < 0) {
                        break;
                    }
                }
            }
        }
        stack.length = 0;
        BaseNode._stackId--;
    }

    /**
     * @en
     * Remove itself from its parent node.
     * If the node have no parent, then nothing happens.
     * @zh
     * 从父节点中删除该节点。
     * 如果这个节点是一个孤立节点，那么什么都不会发生。
     */
    public removeFromParent () {
        if (this._parent) {
            this._parent.removeChild(this);
        }
    }

    /**
     * @en Removes a child from the container.
     * @zh 移除节点中指定的子节点。
     * @param child - The child node which will be removed.
     */
    public removeChild (child: this | Node) {
        if (this._children.indexOf(child as this) > -1) {
            // invoke the parent setter
            child.parent = null;
        }
    }

    /**
     * @en Removes all children from the container.
     * @zh 移除节点所有的子节点。
     */
    public removeAllChildren () {
        // not using detachChild improves speed here
        const children = this._children;
        for (let i = children.length - 1; i >= 0; i--) {
            const node = children[i];
            if (node) {
                node.parent = null;
            }
        }
        this._children.length = 0;
    }

    /**
     * @en Is this node a child of the given node?
     * @zh 是否是指定节点的子节点？
     * @return True if this node is a child, deep child or identical to the given node.
     */
    public isChildOf (parent: this | Scene | null): boolean {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let child: BaseNode | null = this;
        do {
            if (child === parent) {
                return true;
            }
            child = child._parent;
        }
        while (child);
        return false;
    }

    // COMPONENT

    /**
     * @en
     * Returns the component of supplied type if the node has one attached, null if it doesn't.
     * You can also get component in the node by passing in the name of the script.
     * @zh
     * 获取节点上指定类型的组件，如果节点有附加指定类型的组件，则返回，如果没有则为空。
     * 传入参数也可以是脚本的名称。
     * @param classConstructor The class of the target component
     * @example
     * ```
     * // get sprite component.
     * var sprite = node.getComponent(Sprite);
     * ```
     */
    public getComponent<T extends Component> (classConstructor: Constructor<T>): T | null;

    /**
     * @en
     * Returns the component of supplied type if the node has one attached, null if it doesn't.
     * You can also get component in the node by passing in the name of the script.
     * @zh
     * 获取节点上指定类型的组件，如果节点有附加指定类型的组件，则返回，如果没有则为空。
     * 传入参数也可以是脚本的名称。
     * @param className The class name of the target component
     * @example
     * ```
     * // get custom test class.
     * var test = node.getComponent("Test");
     * ```
     */
    public getComponent (className: string): Component | null;

    public getComponent<T extends Component> (typeOrClassName: string | Constructor<T>) {
        const constructor = getConstructor(typeOrClassName);
        if (constructor) {
            return BaseNode._findComponent(this, constructor);
        }
        return null;
    }

    /**
     * @en Returns all components of given type in the node.
     * @zh 返回节点上指定类型的所有组件。
     * @param classConstructor The class of the target component
     */
    public getComponents<T extends Component> (classConstructor: Constructor<T>): T[];

    /**
     * @en Returns all components of given type in the node.
     * @zh 返回节点上指定类型的所有组件。
     * @param className The class name of the target component
     */
    public getComponents (className: string): Component[];

    public getComponents<T extends Component> (typeOrClassName: string | Constructor<T>) {
        const constructor = getConstructor(typeOrClassName);
        const components: Component[] = [];
        if (constructor) {
            BaseNode._findComponents(this, constructor, components);
        }
        return components;
    }

    /**
     * @en Returns the component of given type in any of its children using depth first search.
     * @zh 递归查找所有子节点中第一个匹配指定类型的组件。
     * @param classConstructor The class of the target component
     * @example
     * ```
     * var sprite = node.getComponentInChildren(Sprite);
     * ```
     */
    public getComponentInChildren<T extends Component> (classConstructor: Constructor<T>): T | null;

    /**
     * @en Returns the component of given type in any of its children using depth first search.
     * @zh 递归查找所有子节点中第一个匹配指定类型的组件。
     * @param className The class name of the target component
     * @example
     * ```
     * var Test = node.getComponentInChildren("Test");
     * ```
     */
    public getComponentInChildren (className: string): Component | null;

    public getComponentInChildren<T extends Component> (typeOrClassName: string | Constructor<T>) {
        const constructor = getConstructor(typeOrClassName);
        if (constructor) {
            return BaseNode._findChildComponent(this._children, constructor);
        }
        return null;
    }

    /**
     * @en Returns all components of given type in self or any of its children.
     * @zh 递归查找自身或所有子节点中指定类型的组件
     * @param classConstructor The class of the target component
     * @example
     * ```
     * var sprites = node.getComponentsInChildren(Sprite);
     * ```
     */
    public getComponentsInChildren<T extends Component> (classConstructor: Constructor<T>): T[];

    /**
     * @en Returns all components of given type in self or any of its children.
     * @zh 递归查找自身或所有子节点中指定类型的组件
     * @param className The class name of the target component
     * @example
     * ```
     * var tests = node.getComponentsInChildren("Test");
     * ```
     */
    public getComponentsInChildren (className: string): Component[];

    public getComponentsInChildren<T extends Component> (typeOrClassName: string | Constructor<T>) {
        const constructor = getConstructor(typeOrClassName);
        const components: Component[] = [];
        if (constructor) {
            BaseNode._findComponents(this, constructor, components);
            BaseNode._findChildComponents(this._children, constructor, components);
        }
        return components;
    }

    /**
     * @en Adds a component class to the node. You can also add component to node by passing in the name of the script.
     * @zh 向节点添加一个指定类型的组件类，你还可以通过传入脚本的名称来添加组件。
     * @param classConstructor The class of the component to add
     * @throws `TypeError` if the `classConstructor` does not specify a cc-class constructor extending the `Component`.
     * @example
     * ```
     * var sprite = node.addComponent(Sprite);
     * ```
     */
    public addComponent<T extends Component> (classConstructor: Constructor<T>): T;

    /**
     * @en Adds a component class to the node. You can also add component to node by passing in the name of the script.
     * @zh 向节点添加一个指定类型的组件类，你还可以通过传入脚本的名称来添加组件。
     * @param className The class name of the component to add
     * @throws `TypeError` if the `className` does not specify a cc-class constructor extending the `Component`.
     * @example
     * ```
     * var test = node.addComponent("Test");
     * ```
     */
    public addComponent (className: string): Component;

    public addComponent<T extends Component> (typeOrClassName: string | Constructor<T>) {
        if (EDITOR && (this._objFlags & Destroying)) {
            throw Error('isDestroying');
        }

        // get component
        let constructor: Constructor<T> | null | undefined;
        if (typeof typeOrClassName === 'string') {
            constructor = js.getClassByName(typeOrClassName) as Constructor<T> | undefined;
            if (!constructor) {
                if (legacyCC._RF.peek()) {
                    errorID(3808, typeOrClassName);
                }
                throw TypeError(getError(3807, typeOrClassName));
            }
        } else {
            if (!typeOrClassName) {
                throw TypeError(getError(3804));
            }
            constructor = typeOrClassName;
        }

        // check component
        if (typeof constructor !== 'function') {
            throw TypeError(getError(3809));
        }
        if (!js.isChildClassOf(constructor, legacyCC.Component)) {
            throw TypeError(getError(3810));
        }

        if (EDITOR && (constructor as typeof constructor & { _disallowMultiple?: unknown })._disallowMultiple) {
            this._checkMultipleComp!(constructor);
        }

        // check requirement
        const ReqComp = (constructor as typeof constructor & { _requireComponent?: typeof Component })._requireComponent;
        if (ReqComp && !this.getComponent(ReqComp)) {
            this.addComponent(ReqComp);
        }

        /// / check conflict
        //
        // if (EDITOR && !_Scene.DetectConflict.beforeAddComponent(this, constructor)) {
        //    return null;
        // }

        // Construct component
        const component = new constructor();
        component.node = (this as unknown as Node); // TODO: HACK here
        this._components.push(component);
        if (EDITOR && EditorExtends.Node && EditorExtends.Component) {
            const node = EditorExtends.Node.getNode(this._id);
            if (node) {
                EditorExtends.Component.add(component._id, component);
            }
        }
        if (this._activeInHierarchy) {
            legacyCC.director._nodeActivator.activateComp(component);
        }

        return component;
    }

    /**
     * @en
     * Removes a component identified by the given name or removes the component object given.
     * You can also use component.destroy() if you already have the reference.
     * @zh
     * 删除节点上的指定组件，传入参数可以是一个组件构造函数或组件名，也可以是已经获得的组件引用。
     * 如果你已经获得组件引用，你也可以直接调用 component.destroy()
     * @param classConstructor The class of the component to remove
     * @deprecated please destroy the component to remove it.
     * @example
     * ```
     * node.removeComponent(Sprite);
     * ```
     */
    public removeComponent<T extends Component> (classConstructor: Constructor<T>): void;

    /**
     * @en
     * Removes a component identified by the given name or removes the component object given.
     * You can also use component.destroy() if you already have the reference.
     * @zh
     * 删除节点上的指定组件，传入参数可以是一个组件构造函数或组件名，也可以是已经获得的组件引用。
     * 如果你已经获得组件引用，你也可以直接调用 component.destroy()
     * @param classNameOrInstance The class name of the component to remove or the component instance to be removed
     * @deprecated please destroy the component to remove it.
     * @example
     * ```
     * import { Sprite } from 'cc';
     * const sprite = node.getComponent(Sprite);
     * if (sprite) {
     *     node.removeComponent(sprite);
     * }
     * node.removeComponent('Sprite');
     * ```
     */
    public removeComponent (classNameOrInstance: string | Component): void;

    public removeComponent (component: any) {
        if (!component) {
            errorID(3813);
            return;
        }
        let componentInstance: Component | null = null;
        if (component instanceof Component) {
            componentInstance = component;
        } else {
            componentInstance = this.getComponent(component);
        }
        if (componentInstance) {
            // Distributed destroy, the node may never be registered to the distributed manager
            if (this.replicated) {
                distributedManager.fireRemoveComponentEvent(this, componentInstance);
            }

            componentInstance.destroy();
        }
    }

    // EVENT PROCESSING

    /**
     * @en
     * Register a callback of a specific event type on Node.
     * Use this method to register touch or mouse event permit propagation based on scene graph,
     * These kinds of event are triggered with dispatchEvent, the dispatch process has three steps:
     * 1. Capturing phase: dispatch in capture targets (`_getCapturingTargets`), e.g. parents in node tree, from root to the real target
     * 2. At target phase: dispatch to the listeners of the real target
     * 3. Bubbling phase: dispatch in bubble targets (`_getBubblingTargets`), e.g. parents in node tree, from the real target to root
     * In any moment of the dispatching process, it can be stopped via `event.stopPropagation()` or `event.stopPropagationImmediate()`.
     * It's the recommended way to register touch/mouse event for Node,
     * please do not use `eventManager` directly for Node.
     * You can also register custom event and use `emit` to trigger custom event on Node.
     * For such events, there won't be capturing and bubbling phase, your event will be dispatched directly to its listeners registered on the same node.
     * You can also pass event callback parameters with `emit` by passing parameters after `type`.
     * @zh
     * 在节点上注册指定类型的回调函数，也可以设置 target 用于绑定响应函数的 this 对象。
     * 鼠标或触摸事件会被系统调用 dispatchEvent 方法触发，触发的过程包含三个阶段：
     * 1. 捕获阶段：派发事件给捕获目标（通过 `_getCapturingTargets` 获取），比如，节点树中注册了捕获阶段的父节点，从根节点开始派发直到目标节点。
     * 2. 目标阶段：派发给目标节点的监听器。
     * 3. 冒泡阶段：派发事件给冒泡目标（通过 `_getBubblingTargets` 获取），比如，节点树中注册了冒泡阶段的父节点，从目标节点开始派发直到根节点。
     * 同时您可以将事件派发到父节点或者通过调用 stopPropagation 拦截它。
     * 推荐使用这种方式来监听节点上的触摸或鼠标事件，请不要在节点上直接使用 `eventManager`。
     * 你也可以注册自定义事件到节点上，并通过 emit 方法触发此类事件，对于这类事件，不会发生捕获冒泡阶段，只会直接派发给注册在该节点上的监听器
     * 你可以通过在 emit 方法调用时在 type 之后传递额外的参数作为事件回调的参数列表
     * @param type - A string representing the event type to listen for.<br>See {{#crossLink "Node/EventType/POSITION_CHANGED"}}Node Events{{/crossLink}} for all builtin events.
     * @param callback - The callback that will be invoked when the event is dispatched. The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     * @param useCapture - When set to true, the listener will be triggered at capturing phase which is ahead of the final target emit, otherwise it will be triggered during bubbling phase.
     * @return - Just returns the incoming callback so you can save the anonymous function easier.
     * @example
     * ```ts
     * this.node.on(NodeEventType.TOUCH_START, this.memberFunction, this);  // if "this" is component and the "memberFunction" declared in CCClass.
     * node.on(NodeEventType.TOUCH_START, callback, this);
     * node.on(NodeEventType.TOUCH_MOVE, callback, this);
     * node.on(NodeEventType.TOUCH_END, callback, this);
     * ```
     */
    public on (type: string | NodeEventType, callback: AnyFunction, target?: unknown, useCapture: any = false) {
        switch (type) {
        case NodeEventType.TRANSFORM_CHANGED:
            this._eventMask |= TRANSFORM_ON;
            break;
        default:
            break;
        }
        this._eventProcessor.on(type, callback, target, useCapture);
    }

    /**
     * @en
     * Removes the callback previously registered with the same type, callback, target and or useCapture.
     * This method is merely an alias to removeEventListener.
     * @zh 删除之前与同类型，回调，目标或 useCapture 注册的回调。
     * @param type - A string representing the event type being removed.
     * @param callback - The callback to remove.
     * @param target - The target (this object) to invoke the callback, if it's not given, only callback without target will be removed
     * @param useCapture - When set to true, the listener will be triggered at capturing phase which is ahead of the final target emit, otherwise it will be triggered during bubbling phase.
     * @example
     * ```ts
     * this.node.off(NodeEventType.TOUCH_START, this.memberFunction, this);
     * node.off(NodeEventType.TOUCH_START, callback, this.node);
     * ```
     */
    public off (type: string, callback?: AnyFunction, target?: unknown, useCapture: any = false) {
        this._eventProcessor.off(type, callback, target, useCapture);

        const hasListeners = this._eventProcessor.hasEventListener(type);
        // All listener removed
        if (!hasListeners) {
            switch (type) {
            case NodeEventType.TRANSFORM_CHANGED:
                this._eventMask &= ~TRANSFORM_ON;
                break;
            default:
                break;
            }
        }
    }

    /**
     * @en
     * Register an callback of a specific event type on the Node,
     * the callback will remove itself after the first time it is triggered.
     * @zh
     * 注册节点的特定事件类型回调，回调会在第一时间被触发后删除自身。
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     */
    public once (type: string, callback: AnyFunction, target?: unknown, useCapture?: any) {
        this._eventProcessor.once(type, callback, target, useCapture);
    }

    /**
     * @en
     * Trigger an event directly with the event name and necessary arguments.
     * @zh
     * 通过事件名发送自定义事件
     * @param type - event type
     * @param arg1 - First argument in callback
     * @param arg2 - Second argument in callback
     * @param arg3 - Third argument in callback
     * @param arg4 - Fourth argument in callback
     * @param arg5 - Fifth argument in callback
     * @example
     * ```ts
     * eventTarget.emit('fire', event);
     * eventTarget.emit('fire', message, emitter);
     * ```
     */
    public emit (type: string, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
        this._eventProcessor.emit(type, arg0, arg1, arg2, arg3, arg4);
    }

    /**
     * @en
     * Dispatches an event into the event flow.
     * The event target is the EventTarget object upon which the dispatchEvent() method is called.
     * @zh 分发事件到事件流中。
     * @param event - The Event object that is dispatched into the event flow
     */
    public dispatchEvent (event: Event) {
        this._eventProcessor.dispatchEvent(event);
    }

    /**
     * @en Checks whether the EventTarget object has any callback registered for a specific type of event.
     * @zh 检查事件目标对象是否有为特定类型的事件注册的回调。
     * @param type - The type of event.
     * @param callback - The callback function of the event listener, if absent all event listeners for the given type will be removed
     * @param target - The callback callee of the event listener
     * @return True if a callback of the specified type is registered; false otherwise.
     */
    public hasEventListener (type: string, callback?: AnyFunction, target?: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._eventProcessor.hasEventListener(type, callback, target);
    }

    /**
     * @en Removes all callbacks previously registered with the same target.
     * @zh 移除目标上的所有注册事件。
     * @param target - The target to be searched for all related callbacks
     */
    public targetOff (target: string | unknown) {
        this._eventProcessor.targetOff(target);
        // Check for event mask reset
        if ((this._eventMask & TRANSFORM_ON) && !this._eventProcessor.hasEventListener(NodeEventType.TRANSFORM_CHANGED)) {
            this._eventMask &= ~TRANSFORM_ON;
        }
    }

    public destroy () {
        if (super.destroy()) {
            this.active = false;
            return true;
        }

        return false;
    }

    /**
     * @en
     * Destroy all children from the node, and release all their own references to other objects.
     * Actual destruct operation will delayed until before rendering.
     * @zh
     * 销毁所有子节点，并释放所有它们对其它对象的引用。
     * 实际销毁操作会延迟到当前帧渲染前执行。
     */
    public destroyAllChildren () {
        const children = this._children;
        for (let i = 0; i < children.length; ++i) {
            children[i].destroy();
        }
    }

    // Do remove component, only used internally.
    public _removeComponent (component: Component) {
        if (!component) {
            errorID(3814);
            return;
        }

        if (!(this._objFlags & Destroying)) {
            const i = this._components.indexOf(component);
            if (i !== -1) {
                this._components.splice(i, 1);
                if (EDITOR && EditorExtends.Component) {
                    EditorExtends.Component.remove(component._id);
                }
            } else if (component.node !== (this as unknown as BaseNode)) {
                errorID(3815);
            }
        }
    }

    public _updateSiblingIndex () {
        for (let i = 0; i < this._children.length; ++i) {
            this._children[i]._siblingIndex = i;
        }

        this.emit(NodeEventType.SIBLING_ORDER_CHANGED);
    }

    protected _onSetParent (oldParent: this | null, keepWorldTransform = false) {
        if (this._parent) {
            if ((oldParent == null || oldParent._scene !== this._parent._scene) && this._parent._scene != null) {
                this.walk(BaseNode._setScene);
            }
        }
    }

    // PRIVATE

    protected _onPostActivated (active: boolean) {

    }

    protected _onBatchCreated (dontSyncChildPrefab: boolean) {
        if (this._parent) {
            this._siblingIndex = this._parent.children.indexOf(this);
        }
    }

    protected _onPreDestroy () {
        this._onPreDestroyBase();
    }

    protected _onHierarchyChanged (oldParent: this | null) {
        return this._onHierarchyChangedBase(oldParent);
    }

    protected _instantiate (cloned, isSyncedNode) {
        if (!cloned) {
            cloned = legacyCC.instantiate._clone(this, this);
        }

        const newPrefabInfo = cloned._prefab;
        if (EDITOR && newPrefabInfo) {
            if (cloned === newPrefabInfo.root) {
                // newPrefabInfo.fileId = '';
            } else {
                // var PrefabUtils = Editor.require('scene://utils/prefab');
                // PrefabUtils.unlinkPrefab(cloned);
            }
        }
        if (EDITOR && legacyCC.GAME_VIEW) {
            const syncing = newPrefabInfo && cloned === newPrefabInfo.root && newPrefabInfo.sync;
            if (!syncing) {
                cloned._name += ' (Clone)';
            }
        }

        // reset and init
        cloned._parent = null;
        cloned._onBatchCreated(isSyncedNode);

        // Distributed instantiate prefab
        if (this.replicated && newPrefabInfo && newPrefabInfo.asset) {
            distributedManager.firePrefabInstantiate(cloned, newPrefabInfo.asset);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return cloned;
    }

    protected _onHierarchyChangedBase (oldParent: this | null) {
        const newParent = this._parent;
        if (this._persistNode && !(newParent instanceof legacyCC.Scene)) {
            legacyCC.game.removePersistRootNode(this);
            if (EDITOR) {
                warnID(1623);
            }
        }

        if (EDITOR) {
            const scene = legacyCC.director.getScene() as this | null;
            const inCurrentSceneBefore = oldParent && oldParent.isChildOf(scene);
            const inCurrentSceneNow = newParent && newParent.isChildOf(scene);
            if (!inCurrentSceneBefore && inCurrentSceneNow) {
                // attached
                this._registerIfAttached!(true);
            } else if (inCurrentSceneBefore && !inCurrentSceneNow) {
                // detached
                this._registerIfAttached!(false);
            }

            // conflict detection
            // _Scene.DetectConflict.afterAddChild(this);
        }

        const shouldActiveNow = this._active && !!(newParent && newParent._activeInHierarchy);
        if (this._activeInHierarchy !== shouldActiveNow) {
            legacyCC.director._nodeActivator.activateNode(this, shouldActiveNow);
        }
    }

    protected _onPreDestroyBase () {
        // Distributed destroy, the node may never be registered to the distributed manager
        if (this.replicated) {
            distributedManager.fireObjectDestroyEvent(this);
        }

        // marked as destroying
        this._objFlags |= Destroying;

        // detach self and children from editor
        const parent = this._parent;
        const destroyByParent: boolean = (!!parent) && ((parent._objFlags & Destroying) !== 0);
        if (!destroyByParent && EDITOR) {
            this._registerIfAttached!(false);
        }

        // remove from persist
        if (this._persistNode) {
            legacyCC.game.removePersistRootNode(this);
        }

        if (!destroyByParent) {
            // remove from parent
            if (parent) {
                this.emit(NodeEventType.PARENT_CHANGED, this);
                // During destroy process, sibling index is not reliable
                const childIndex = parent._children.indexOf(this);
                parent._children.splice(childIndex, 1);
                this._siblingIndex = 0;
                parent._updateSiblingIndex();
                if (parent.emit) {
                    parent.emit(NodeEventType.CHILD_REMOVED, this);
                }
            }
        }

        // emit node destroy event (this should before event processor destroy)
        this.emit(NodeEventType.NODE_DESTROYED, this);

        // Destroy node event processor
        this._eventProcessor.destroy();

        // destroy children
        const children = this._children;
        for (let i = 0; i < children.length; ++i) {
            // destroy immediate so its _onPreDestroy can be called
            children[i]._destroyImmediate();
        }

        // destroy self components
        const comps = this._components;
        for (let i = 0; i < comps.length; ++i) {
            // destroy immediate so its _onPreDestroy can be called
            // TO DO
            comps[i]._destroyImmediate();
        }

        return destroyByParent;
    }

    protected _onSiblingIndexChanged? (siblingIndex: number): void;

    /**
     * Ensures that this node has already had the specified component(s). If not, this method throws.
     * @param constructor Constructor of the component.
     * @throws If one or more component of same type have been existed in this node.
     */
    protected _checkMultipleComp?<T extends Component> (constructor: Constructor<T>): void;
}

baseNodePolyfill(BaseNode);

/**
 * @en
 * Note: This event is only emitted from the top most node whose active value did changed,
 * not including its child nodes.
 * @zh
 * 注意：此节点激活时，此事件仅从最顶部的节点发出。
 * @event active-in-hierarchy-changed
 * @param {Event.EventCustom} event
 */

legacyCC._BaseNode = BaseNode;
