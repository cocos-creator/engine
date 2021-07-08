import { ccclass, type } from '../../data/class-decorator';
import { AnimationClip } from '../animation-clip';
import { AnimationState } from '../animation-state';
import { createEval } from './create-eval';
import { PoseEvalContext, Pose, PoseEval } from './pose';

@ccclass('cc.animation.AnimatedPose')
export class AnimatedPose implements Pose {
    @type(AnimationClip)
    public clip: AnimationClip | null = null;

    public [createEval] (context: PoseEvalContext) {
        return !this.clip ? null : new AnimatedPoseEval(context, this.clip);
    }
}

class AnimatedPoseEval implements PoseEval {
    private declare _state: AnimationState;
    private _weight = 1.0;

    public declare readonly duration: number;

    constructor (context: PoseEvalContext, clip: AnimationClip) {
        this.duration = clip.duration;
        this._state = new AnimationState(clip);
        this._state.initialize(context.node, undefined, context.mask);
    }

    public active () {
        // this._state.play();
    }

    public inactive () {
        // this._state.stop();
    }

    public update (deltaTime: number) {
        this._state.update(deltaTime);
    }

    public setBaseWeight (weight: number) {
        this._weight = weight;
        this._state.weight = this._weight;
    }
}
