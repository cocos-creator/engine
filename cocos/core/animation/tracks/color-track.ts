import { ccclass, serializable } from 'cc.decorator';
import { IntegerCurve, RealCurve } from '../../curves';
import { Color } from '../../math';
import { CLASS_NAME_PREFIX_ANIM, createEvalSymbol } from '../define';
import { Channel, IntegerChannel, RuntimeBinding, Track } from './track';
import { maskIfEmpty } from './utils';

const CHANNEL_NAMES: ReadonlyArray<string> = ['Red', 'Green', 'Blue', 'Alpha'];

@ccclass(`${CLASS_NAME_PREFIX_ANIM}ColorTrack`)
export class ColorTrack extends Track {
    constructor () {
        super();
        this._channels = new Array(4) as ColorTrack['_channels'];
        for (let i = 0; i < this._channels.length; ++i) {
            const channel = new Channel<IntegerCurve>(new IntegerCurve());
            channel.name = CHANNEL_NAMES[i];
            this._channels[i] = channel;
        }
    }

    public channels () {
        return this._channels;
    }

    public [createEvalSymbol] () {
        return new ColorTrackEval(
            maskIfEmpty(this._channels[0].curve),
            maskIfEmpty(this._channels[1].curve),
            maskIfEmpty(this._channels[2].curve),
            maskIfEmpty(this._channels[3].curve),
        );
    }

    @serializable
    private _channels: [IntegerChannel, IntegerChannel, IntegerChannel, IntegerChannel];
}

export class ColorTrackEval<TCurve extends IntegerCurve | RealCurve = IntegerCurve> {
    constructor (
        private _x: TCurve | undefined,
        private _y: TCurve | undefined,
        private _z: TCurve | undefined,
        private _w: TCurve | undefined,
    ) {

    }

    public evaluate (time: number, runtimeBinding: RuntimeBinding) {
        if ((!this._x || !this._y || !this._z || !this._w) && runtimeBinding.getValue) {
            Color.copy(this._result, runtimeBinding.getValue() as Color);
        }

        if (this._x) {
            this._result.r = this._x.evaluate(time);
        }
        if (this._y) {
            this._result.g = this._y.evaluate(time);
        }
        if (this._z) {
            this._result.b = this._z.evaluate(time);
        }
        if (this._w) {
            this._result.a = this._w.evaluate(time);
        }

        return this._result;
    }

    private _result: Color = new Color();
}
