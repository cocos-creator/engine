import { ccclass } from 'cc.decorator';
import { RealCurve } from '../../curves';
import { CLASS_NAME_PREFIX_ANIM } from '../define';
import { SingleChannelTrack } from './track';

@ccclass(`${CLASS_NAME_PREFIX_ANIM}RealTrack`)
export class RealTrack extends SingleChannelTrack<RealCurve> {
    protected createCurve () {
        return new RealCurve();
    }
}
