import { BlendStateBuffer, BlendingProperty, BlendStateWriter } from '../../3d/skeletal-animation/skeletal-animation-blending';
import type { Node } from '../scene-graph';

export type Pose = BlendStateBuffer;

export class PoseOutput {
    public weight = 0.0;

    constructor (pose: Pose) {
        this._pose = pose;
    }

    public destroy () {
        for (let iBlendStateWriter = 0; iBlendStateWriter < this._blendStateWriters.length; ++iBlendStateWriter) {
            this._pose.destroyWriter(this._blendStateWriters[iBlendStateWriter]);
        }
        this._blendStateWriters.length = 0;
    }

    public createPoseWriter (node: Node, property: BlendingProperty, constants: boolean) {
        const writer = this._pose.createWriter(node, property, this, constants);
        this._blendStateWriters.push(writer);
        return writer;
    }

    private _pose: Pose;

    private _blendStateWriters: BlendStateWriter<any>[] = [];
}
