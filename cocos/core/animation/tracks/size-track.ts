import { ccclass, serializable } from 'cc.decorator';
import { RealCurve } from '../../curves';
import { Size } from '../../math';
import { CLASS_NAME_PREFIX_ANIM, createEvalSymbol } from '../define';
import { Channel, RealChannel, RuntimeBinding, Track } from './track';
import { maskIfEmpty } from './utils';

const CHANNEL_NAMES: ReadonlyArray<string> = ['Width', 'Height'];

@ccclass(`${CLASS_NAME_PREFIX_ANIM}SizeTrack`)
export class SizeTrack extends Track {
    constructor () {
        super();
        this._channels = new Array(2) as SizeTrack['_channels'];
        for (let i = 0; i < this._channels.length; ++i) {
            const channel = new Channel<RealCurve>(new RealCurve());
            channel.name = CHANNEL_NAMES[i];
            this._channels[i] = channel;
        }
    }

    public channels () {
        return this._channels;
    }

    public [createEvalSymbol] () {
        return new SizeTrackEval(
            maskIfEmpty(this._channels[0].curve),
            maskIfEmpty(this._channels[1].curve),
        );
    }

    @serializable
    private _channels: [RealChannel, RealChannel];
}

class SizeTrackEval {
    constructor (
        private _width: RealCurve | undefined,
        private _height: RealCurve | undefined,
    ) {

    }

    public evaluate (time: number, runtimeBinding: RuntimeBinding) {
        if ((!this._width || !this._height) && runtimeBinding.getValue) {
            const size = runtimeBinding.getValue() as Size;
            this._result.x = size.x;
            this._result.y = size.y;
        }

        if (this._width) {
            this._result.width = this._width.evaluate(time);
        }
        if (this._height) {
            this._result.height = this._height.evaluate(time);
        }

        return this._result;
    }

    private _result: Size = new Size();
}
