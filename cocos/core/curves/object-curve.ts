import { ccclass } from '../data/decorators';
import { clamp } from '../math';
import { KeyframeCurve } from './keyframe-curve';

export type ObjectCurveKeyframe<T> = T;

@ccclass('cc.ObjectCurve')
export class ObjectCurve<T> extends KeyframeCurve<ObjectCurveKeyframe<T>> {
    public evaluate (time: number) {
        const iSearch = this.searchKeyframe(time);
        if (iSearch >= 0) {
            return this._values[iSearch];
        }
        const iPrev = clamp((~iSearch) - 1, 0, this._values.length - 1);
        return this._values[iPrev];
    }
}
