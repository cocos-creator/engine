import { ccclass, serializable } from 'cc.decorator';
import { RealCurve } from '../../curves';
import { Color, Size, Vec2, Vec3, Vec4 } from '../../math';
import { CLASS_NAME_PREFIX_ANIM, createEvalSymbol } from '../define';
import { IValueProxyFactory } from '../value-proxy';
import { ColorTrack, ColorTrackEval } from './color-track';
import { Channel, RealChannel, RuntimeBinding, Track, TrackPath } from './track';
import { Vec2TrackEval, Vec3TrackEval, Vec4TrackEval, VectorTrack } from './vector-track';

@ccclass(`${CLASS_NAME_PREFIX_ANIM}UntypedTrackChannel`)
class UntypedTrackChannel extends Channel<RealCurve> {
    @serializable
    public property!: string;

    constructor () {
        super(new RealCurve());
    }
}

@ccclass(`${CLASS_NAME_PREFIX_ANIM}UntypedTrack`)
export class UntypedTrack extends Track {
    @serializable
    private _channels: UntypedTrackChannel[] = [];

    public channels () {
        return this._channels;
    }

    public [createEvalSymbol] (runtimeBinding: RuntimeBinding) {
        if (!runtimeBinding.getValue) {
            throw new Error(`Can not decide type for untyped track: runtime binding does not provide a getter.`);
        }
        const trySearchCurve = (property: string) => this._channels.find((channel) => channel.property === property)?.curve;
        const value = runtimeBinding.getValue();
        switch (true) {
        case value instanceof Size:
        default:
            throw new Error(`Can not decide type for untyped track: got a unsupported value from runtime binding.`);
        case value instanceof Vec2:
            return new Vec2TrackEval(
                trySearchCurve('x'),
                trySearchCurve('y'),
            );
        case value instanceof Vec3:
            return new Vec3TrackEval(
                trySearchCurve('x'),
                trySearchCurve('y'),
                trySearchCurve('z'),
            );
        case value instanceof Vec4:
            return new Vec4TrackEval(
                trySearchCurve('x'),
                trySearchCurve('y'),
                trySearchCurve('z'),
                trySearchCurve('w'),
            );
        case value instanceof Color:
            // TODO: what if x, y, z, w?
            return new ColorTrackEval(
                trySearchCurve('r'),
                trySearchCurve('g'),
                trySearchCurve('b'),
                trySearchCurve('a'),
            );
        }
    }

    public addChannel (property: string): UntypedTrackChannel {
        const channel = new UntypedTrackChannel();
        channel.property = property;
        this._channels.push(channel);
        return channel;
    }

    public upgrade (refine: UntypedTrackRefine): Track | null {
        const trySearchChannel = (property: string, outChannel: RealChannel) => {
            const untypedChannel = this.channels().find((channel) => channel.property === property);
            if (untypedChannel) {
                outChannel.name = untypedChannel.name;
                outChannel.curve.assignSorted(
                    Array.from(untypedChannel.curve.times()),
                    Array.from(untypedChannel.curve.values()),
                );
            }
        };
        const kind = refine(this.path, this.proxy);
        switch (kind) {
        default:
            break;
        case 'vec2': case 'vec3': case 'vec4': {
            const track = new VectorTrack();
            track.componentsCount = kind === 'vec2' ? 2 : kind === 'vec3' ? 3 : 4;
            const [x, y, z, w] = track.channels();
            switch (kind) {
            case 'vec4':
                trySearchChannel('w', w);
                // fall through
            case 'vec3':
                trySearchChannel('z', z);
                // fall through
            default:
            case 'vec2':
                trySearchChannel('x', x);
                trySearchChannel('y', y);
            }
            return track;
        }
        case 'color': {
            const track = new ColorTrack();
            const [r, g, b, a] = track.channels();
            trySearchChannel('r', r);
            trySearchChannel('g', g);
            trySearchChannel('b', b);
            trySearchChannel('a', a);
            // TODO: we need float-int conversion if xyzw
            trySearchChannel('x', r);
            trySearchChannel('y', g);
            trySearchChannel('z', b);
            trySearchChannel('w', a);
            return track;
        }
        case 'size':
            break;
        }

        return null;
    }
}

export type UntypedTrackRefine = (path: Readonly<TrackPath>, proxy: IValueProxyFactory | undefined) => 'vec2' | 'vec3' | 'vec4' | 'color' | 'size';
