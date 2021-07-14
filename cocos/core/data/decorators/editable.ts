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
 * @module decorator
 */

import { DEV, EDITOR } from 'internal:constants';
import { IExposedAttributes } from '../utils/attribute-defines';
import { IPropertyOptions, property } from './property';

import { LegacyPropertyDecorator, emptyDecorator, makeSmartEditorClassDecorator, makeEditorClassDecoratorFn, emptySmartClassDecorator, emptyDecoratorFn } from './utils';

/**
 * @en Makes a CCClass that inherit from component execute in edit mode.<br/>
 * By default, all components are only executed in play mode,<br/>
 * which means they will not have their callback functions executed while the Editor is in edit mode.<br/>
 * @zh 允许继承自 Component 的 CCClass 在编辑器里执行。<br/>
 * 默认情况下，所有 Component 都只会在运行时才会执行，也就是说它们的生命周期回调不会在编辑器里触发。
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, executeInEditMode} = _decorator;
 *
 *  @ccclass
 *  @executeInEditMode
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const executeInEditMode: ClassDecorator & ((yes?: boolean) => ClassDecorator) =    DEV ? makeSmartEditorClassDecorator('executeInEditMode', true) : emptySmartClassDecorator;

/**
 * @en Add the current component to the specific menu path in `Add Component` selector of the inspector panel
 * @zh 将当前组件添加到组件菜单中，方便用户查找。例如 "Rendering/CameraCtrl"。
 * @param path - The path is the menu represented like a pathname. For example the menu could be "Rendering/CameraCtrl".
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, menu} = _decorator;
 *
 * @ccclass
 * @menu("Rendering/CameraCtrl")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const menu: (path: string) => ClassDecorator =    DEV ? makeEditorClassDecoratorFn('menu') : emptyDecoratorFn;

/**
 * @en When {{executeInEditMode}} is set, this decorator will decide when a node with the component is on focus whether the editor should running in high FPS mode.
 * @zh 当指定了 "executeInEditMode" 以后，playOnFocus 可以在选中当前组件所在的节点时，提高编辑器的场景刷新频率到 60 FPS，否则场景就只会在必要的时候进行重绘。
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, playOnFocus, executeInEditMode} = _decorator;
 *
 * @ccclass
 * @executeInEditMode
 * @playOnFocus
 * class CameraCtrl extends Component {
 *     // ...
 * }
 * ```
 */
export const playOnFocus: ClassDecorator & ((yes?: boolean) => ClassDecorator) =    DEV ? makeSmartEditorClassDecorator<boolean>('playOnFocus', true) : emptySmartClassDecorator;

/**
 * @en Use a customized inspector page in the **inspector**
 * @zh 自定义当前组件在 **属性检查器** 中渲染时所用的 UI 页面描述。
 * @param url The url of the page definition in js
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, inspector} = _decorator;
 *
 * @ccclass
 * @inspector("packages://inspector/inspectors/comps/camera-ctrl.js")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const inspector: (url: string) => ClassDecorator =    DEV ? makeEditorClassDecoratorFn('inspector') : emptyDecoratorFn;

/**
 * @en Define the icon of the component.
 * @zh 自定义当前组件在编辑器中显示的图标 url。
 * @param url
 * @private
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, icon} = _decorator;
 *
 *  @ccclass
 *  @icon("xxxx.png")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const icon: (url: string) => ClassDecorator =    DEV ? makeEditorClassDecoratorFn('icon') : emptyDecoratorFn;

/**
 * @en Define the help documentation url, if given, the component section in the **inspector** will have a help documentation icon reference to the web page given.
 * @zh 指定当前组件的帮助文档的 url，设置过后，在 **属性检查器** 中就会出现一个帮助图标，用户点击将打开指定的网页。
 * @param url The url of the help documentation
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, help} = _decorator;
 *
 * @ccclass
 * @help("app://docs/html/components/spine.html")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const help: (url: string) => ClassDecorator =    DEV ? makeEditorClassDecoratorFn('help') : emptyDecoratorFn;

/**
 * @en
 * Enables the editor interoperability of the property.
 * @zh
 * 允许该属性与编辑器交互。
 */
export const editable: LegacyPropertyDecorator = !DEV ? emptyDecorator : (target, propertyKey, descriptor) => property(makeEditable({ }))(target, propertyKey, descriptor);

/**
 * @en
 * Sets the condition to show the property.
 * @zh
 * 设置在编辑器展示该属性的条件。
 * @param condition 展示条件，当返回 `true` 时展示；否则不展示。
 */
export const visible: (condition: boolean | (() => boolean)) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (condition) => property(makeEditable({
        visible: condition,
    }));

/**
 * @en
 * Sets the property to be read only in editor.
 * @zh
 * 设置该属性在编辑器中仅是可读的。
 */
export const readOnly: LegacyPropertyDecorator = !DEV ? emptyDecorator : (target, propertyKey, descriptor) => property(makeEditable({
    readonly: true,
}))(target, propertyKey, descriptor);

/**
 * @en
 * Sets the display name of the property in editor.
 * @zh
 * 设置该属性在编辑器中的显示名称。
 * @param text 显示名称。
 */
export const displayName: (text: string) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (text) => property(makeEditable({
        displayName: text,
    }));

/**
 * @en
 * Sets the tooltip content of the property in editor.
 * @zh
 * 设置该属性在编辑器中的工具提示内容。
 * @param text 工具提示。
 */
export const tooltip: (text: string) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (text) => property(makeEditable({
        tooltip: text,
    }));

/**
 * @en
 * Sets the group where this property is organized into, on property inspector.
 * @zh
 * 设置在属性检查器上该属性所属的分类标签。
 * @param options 分组的配置。
 */
export const group: (options: NonNullable<IExposedAttributes['group']>) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (options) => property(makeEditable({
        group: options,
    }));

/**
 * @en
 * Sets the allowed range of the property in editor.
 * @zh
 * 设置该属性在编辑器中允许设置的范围。
 * @param values 范围。
 */
export const range: (values: [number, number, number] | [number, number]) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (values) => property(makeEditable({
        range: values,
    }));

/**
 * @en
 * Sets the allowed min value of the property in editor.
 * @zh
 * 设置该属性在编辑器中允许的最小值。
 * @param value 最小值。
 */
export const rangeMin: (value: number) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (value) => property(makeEditable({
        min: value,
    }));

/**
 * @en
 * Sets the allowed max value of the property in editor.
 * @zh
 * 设置该属性在编辑器中允许的最大值。
 * @param value 最大值。
 */
export const rangeMax: (value: number) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (value) => property(makeEditable({
        max: value,
    }));

/**
 * @en
 * Sets the step of the property in editor.
 * @zh
 * 设置该属性在编辑器中的步进值。
 * @param value 步进值。
 */
export const rangeStep: (value: number) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (value) => property(makeEditable({
        step: value,
    }));

/**
 * @en
 * Enable a slider be given to coordinate the property in editor.
 * @zh
 * 允许在编辑器中提供滑动条来调节值
 */
export const slide: LegacyPropertyDecorator = !DEV ? emptyDecorator
    : (target, propertyKey, descriptor) => property(makeEditable({
        slide: true,
    }))(target, propertyKey, descriptor);

/**
 * @en
 * Sets the display order of the property in editor.
 * @zh
 * 设置该属性在编辑器中的显示顺序。
 * @param order 显示顺序。
 */
export const displayOrder: (order: number) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (order) => property(makeEditable({
        displayOrder: order,
    }));

/**
 * @en
 * Sets the unit of the property in editor.
 * @zh
 * 设置该属性在编辑器中的计量单位。
 * @param name 计量单位的名称。
 */
export const unit: (name:
| 'lm'
| 'lx'
| 'cd/m²'
) => LegacyPropertyDecorator = !DEV ? emptyDecoratorFn
    : (name) => property(makeEditable({
        unit: name,
    }));

/**
 * @en
 * Sets to convert the value into radian before feed it to the property in editor.
 * @zh
 * 设置在编辑器中赋值该属性前将值先转换为弧度制。
 */
export const radian: LegacyPropertyDecorator = !DEV ? emptyDecorator
    : (target, propertyKey, descriptor) => property(makeEditable({
        radian: true,
    }))(target, propertyKey, descriptor);

/**
 * @en
 * Enable multi-line display of the property in editor.
 * @zh
 * 允许在编辑器中对该属性进行多行显示。
 */
export const multiline: LegacyPropertyDecorator = !DEV ? emptyDecorator
    : (target, propertyKey, descriptor) => property(makeEditable({
        multiline: true,
    }))(target, propertyKey, descriptor);

/**
 * @en
 * Sets the property so that it does not interop with the animation parts in editor.
 * @zh
 * 设置该属性不参与编辑器中动画相关的交互。
 */
export const disallowAnimation: LegacyPropertyDecorator = !EDITOR ? emptyDecorator : (target, propertyKey, descriptor) => property({
    __noImplicit: true,
    animatable: false,
})(target, propertyKey, descriptor);

function makeEditable (options: IPropertyOptions) {
    options.__noImplicit = true;
    if (!('visible' in options)) {
        options.visible = true;
    }
    return options;
}
