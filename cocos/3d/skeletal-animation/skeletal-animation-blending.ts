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

import { Vec3, Quat } from '../../core/math';
import { Node } from '../../core/scene-graph';
import { RuntimeBinding } from '../../core/animation/tracks/track';

export class BlendStateBuffer {
    private _nodeBlendStates: Map<Node, NodeBlendState> = new Map();

    public createWriter<P extends BlendingProperty> (
        node: Node,
        property: P,
        host: BlendStateWriterHost,
        constants: boolean,
    ): BlendStateWriter<P> {
        const propertyBlendState = this.ref(node, property);
        return new BlendStateWriterInternal<P>(
            node,
            property,
            propertyBlendState,
            host,
            constants,
        );
    }

    public destroyWriter<P extends BlendingProperty> (writer: BlendStateWriter<P>) {
        const internal = writer as BlendStateWriterInternal<P>;
        this.deRef(internal.node, internal.property);
    }

    public ref<P extends BlendingProperty> (node: Node, property: P): PropertyBlendStateTypeMap[P] {
        let nodeBlendState = this._nodeBlendStates.get(node);
        if (!nodeBlendState) {
            nodeBlendState = new NodeBlendState();
            this._nodeBlendStates.set(node, nodeBlendState);
        }
        const propertyBlendState = nodeBlendState.refProperty(property);
        return propertyBlendState as PropertyBlendStateTypeMap[P];
    }

    public deRef (node: Node, property: BlendingProperty) {
        const nodeBlendState = this._nodeBlendStates.get(node);
        if (!nodeBlendState) {
            return;
        }
        nodeBlendState.deRefProperty(property);
        if (nodeBlendState.empty) {
            this._nodeBlendStates.delete(node);
        }
    }

    public apply () {
        this._nodeBlendStates.forEach((nodeBlendState, node) => {
            nodeBlendState.apply(node);
        });
    }
}

export interface BlendStateWriterHost {
    readonly weight: number;
}

class BlendStateWriterInternal<P extends BlendingProperty> implements RuntimeBinding {
    constructor (
        private _node: Node,
        private _property: P,
        private _propertyBlendState: PropertyBlendStateTypeMap[P],
        private _host: BlendStateWriterHost,
        private _constants: boolean,
    ) {
    }

    get node () {
        return this._node;
    }

    get property () {
        return this._property;
    }

    public getValue () {
        return this._node[this._property];
    }

    public setValue (value: BlendingPropertyValue<P>) {
        const {
            _propertyBlendState: propertyBlendState,
            _host: host,
        } = this;
        const weight = host.weight;
        // @ts-expect-error Complex typing
        propertyBlendState.blend(value, weight);
    }
}

export type BlendStateWriter<P extends BlendingProperty> = Omit<BlendStateWriterInternal<P>, 'node' | 'property'>;

export type BlendingProperty = keyof NodeBlendState['_properties'];

type BlendingPropertyValue<P extends BlendingProperty> = NonNullable<NodeBlendState['_properties'][P]>['blendedValue'];

class PropertyBlendState<T> {
    /**
     * Sum of all weights to blend.
     */
    public blendedWeight = 0.0;

    /**
     * Current blended value.
     */
    public blendedValue: T;

    /**
     * How many writer reference this property.
     */
    public refCount = 0;

    constructor (value: T) {
        this.blendedValue = value;
    }
}

class Vec3PropertyBlendState extends PropertyBlendState<Vec3> {
    constructor () {
        super(new Vec3());
    }

    public blend (value: Readonly<Vec3>, weight: number) {
        const { blendedValue } = this;
        if (weight === 1.0) {
            Vec3.copy(blendedValue, value);
        } else {
            Vec3.scaleAndAdd(blendedValue, blendedValue, value, weight);
        }
        this.blendedWeight += weight;
    }

    public reset () {
        this.blendedWeight = 0.0;
        Vec3.zero(this.blendedValue);
    }
}

class QuatPropertyBlendState extends PropertyBlendState<Quat> {
    constructor () {
        super(new Quat());
    }

    public blend (value: Readonly<Quat>, weight: number) {
        if (weight === 0.0) {
            return;
        }
        const { blendedValue, blendedWeight } = this;
        if (weight === 1.0) {
            Quat.copy(blendedValue, value);
        } else {
            const t = weight / (blendedWeight + weight);
            Quat.slerp(blendedValue, blendedValue, value, t);
        }
        this.blendedWeight += weight;
    }

    public reset () {
        this.blendedWeight = 0.0;
        Quat.identity(this.blendedValue);
    }
}

interface PropertyBlendStateTypeMap {
    'rotation': QuatPropertyBlendState;
    'position': Vec3PropertyBlendState;
    'scale': Vec3PropertyBlendState;
    'eulerAngles': Vec3PropertyBlendState;
}

class NodeBlendState {
    get empty () {
        const { _properties: properties } = this;
        return !properties.position
            && !properties.rotation
            && !properties.eulerAngles
            && !properties.scale;
    }

    public refProperty<P extends BlendingProperty> (property: BlendingProperty): PropertyBlendStateTypeMap[P] {
        const { _properties: properties } = this;
        let propertyBlendState: Vec3PropertyBlendState | QuatPropertyBlendState;
        switch (property) {
        default:
        case 'position':
        case 'scale':
        case 'eulerAngles':
            propertyBlendState = properties[property] ??= new Vec3PropertyBlendState();
            break;
        case 'rotation':
            propertyBlendState = properties[property] ??= new QuatPropertyBlendState();
            break;
        }
        ++propertyBlendState.refCount;
        return propertyBlendState as PropertyBlendStateTypeMap[P];
    }

    public deRefProperty (property: BlendingProperty) {
        const { _properties: properties } = this;

        const propertyBlendState = properties[property];
        if (!propertyBlendState) {
            return;
        }

        --propertyBlendState.refCount;
        if (propertyBlendState.refCount > 0) {
            return;
        }

        delete properties[property];
    }

    public apply (node: Node) {
        const { _properties: { position, scale, rotation, eulerAngles } } = this;

        let t: Vec3 | undefined;
        let s: Vec3 | undefined;
        let r: Quat | Vec3 | undefined;

        let tFlags = false;
        let sFlags = false;
        let rFlags = false;
        let eFlags = false;

        if (position && position.blendedWeight) {
            tFlags = true;
            if (position.blendedWeight < 1.0) {
                position.blend(node.position, 1.0 - position.blendedWeight);
            }
            t = position.blendedValue;
        }

        if (scale && scale.blendedWeight) {
            sFlags = true;
            if (scale.blendedWeight < 1.0) {
                scale.blend(node.scale, 1.0 - scale.blendedWeight);
            }
            s = scale.blendedValue;
        }

        if (eulerAngles && eulerAngles.blendedWeight) {
            eFlags = true;
            if (eulerAngles.blendedWeight < 1.0) {
                eulerAngles.blend(node.eulerAngles, 1.0 - eulerAngles.blendedWeight);
            }
            r = eulerAngles.blendedValue;
        }

        if (rotation && rotation.blendedWeight) {
            rFlags = true;
            if (rotation.blendedWeight < 1.0) {
                rotation.blend(node.rotation, 1.0 - rotation.blendedWeight);
            }
            r = rotation.blendedValue;
        }

        if (r || t || s) {
            node.setRTS(r, t, s);
        }

        // Reset transforms
        if (tFlags) {
            position!.reset();
        }
        if (sFlags) {
            scale!.reset();
        }
        if (rFlags) {
            rotation!.reset();
        }
        if (eFlags) {
            eulerAngles!.reset();
        }
    }

    private _properties: {
        position?: PropertyBlendStateTypeMap['position'];
        rotation?: PropertyBlendStateTypeMap['rotation'];
        eulerAngles?: PropertyBlendStateTypeMap['eulerAngles'];
        scale?: PropertyBlendStateTypeMap['scale'];
    } = {};
}
