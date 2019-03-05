import { Vec3 } from '../../core/value-types';
import { vec3 } from '../../core/vmath';
import { Node } from '../../scene-graph';
import { Light, LightType } from './light';
import { RenderScene } from './render-scene';

const _v3 = new Vec3();

export class PointLight extends Light {
    protected _positionAndRange = Float32Array.from([0, 0, 0, 10]);

    set position (val: Vec3) {
        vec3.array(this._positionAndRange, val);
    }
    set range (val: number) {
        this._positionAndRange[3] = val;
    }

    get positionAndRange () {
        return this._positionAndRange;
    }

    constructor (scene: RenderScene, name: string, node: Node) {
        super(scene, name, node);
        this._type = LightType.POINT;
    }

    public update () {
        if (this._node) {
            this.position = this._node.getWorldPosition(_v3);
        }
    }
}
