import { ccclass } from 'cc.decorator';
import { QuaternionCurve } from '../../curves';
import { CLASS_NAME_PREFIX_ANIM, createEvalSymbol } from '../define';
import { SingleChannelTrack } from './track';
import { Quat } from '../../math';

@ccclass(`${CLASS_NAME_PREFIX_ANIM}QuaternionTrack`)
export class QuaternionTrack extends SingleChannelTrack<QuaternionCurve> {
    protected createCurve () {
        return new QuaternionCurve();
    }

    public [createEvalSymbol] () {
        return new QuatTrackEval(this.channels()[0].curve);
    }
}

export class QuatTrackEval {
    constructor (private _curve: QuaternionCurve) {

    }

    public evaluate (time: number) {
        this._curve.evaluate(time, this._result);
        return this._result;
    }

    private _result: Quat = new Quat();
}
