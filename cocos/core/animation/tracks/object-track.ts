import { ccclass } from 'cc.decorator';
import { ObjectCurve } from '../../curves';
import { CLASS_NAME_PREFIX_ANIM, createEvalSymbol } from '../define';
import { SingleChannelTrack } from './track';

@ccclass(`${CLASS_NAME_PREFIX_ANIM}ObjectTrack`)
export class ObjectTrack<T> extends SingleChannelTrack<ObjectCurve<T>> {
    protected createCurve () {
        return new ObjectCurve<T>();
    }
}
