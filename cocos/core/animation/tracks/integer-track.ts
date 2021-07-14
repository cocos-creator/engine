import { ccclass } from 'cc.decorator';
import { IntegerCurve } from '../../curves';
import { CLASS_NAME_PREFIX_ANIM } from '../define';
import { SingleChannelTrack } from './track';

@ccclass(`${CLASS_NAME_PREFIX_ANIM}IntegerTrack`)
export class IntegerTrack extends SingleChannelTrack<IntegerCurve> {
    protected createCurve () {
        return new IntegerCurve();
    }
}
