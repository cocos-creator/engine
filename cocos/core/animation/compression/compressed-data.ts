import { QuaternionCurve, RealCurve } from '../../curves';
import { KeySharedQuaternionCurves, KeySharedRealCurves } from '../../curves/keys-shared-curves';
import { ccclass, serializable } from '../../data/decorators';
import { Quat, Vec2, Vec3, Vec4 } from '../../math';
import { CLASS_NAME_PREFIX_ANIM } from '../define';
import { QuaternionTrack } from '../tracks/quat-track';
import { RealTrack } from '../tracks/real-track';
import { Binder, RuntimeBinding, TrackBinding, trackBindingTag, TrackPath } from '../tracks/track';
import { VectorTrack } from '../tracks/vector-track';

@ccclass(`${CLASS_NAME_PREFIX_ANIM}CompressedData`)
export class CompressedData {
    public compressRealTrack (track: RealTrack) {
        const curve = track.channel.curve;
        const mayBeCompressed = KeySharedRealCurves.allowedForCurve(curve);
        if (!mayBeCompressed) {
            return false;
        }
        this._tracks.push({
            type: CompressedDataTrackType.FLOAT,
            binding: track[trackBindingTag],
            components: [this._addRealCurve(curve)],
        });
        return true;
    }

    public compressVectorTrack (vectorTrack: VectorTrack) {
        const nComponents = vectorTrack.componentsCount;
        const channels = vectorTrack.channels();
        const mayBeCompressed = channels.every(({ curve }) => KeySharedRealCurves.allowedForCurve(curve));
        if (!mayBeCompressed) {
            return false;
        }
        const components = new Array<CompressedCurvePointer>(nComponents);
        for (let i = 0; i < nComponents; ++i) {
            const channel = channels[i];
            components[i] = this._addRealCurve(channel.curve);
        }
        this._tracks.push({
            type:
                nComponents === 2
                    ? CompressedDataTrackType.VEC2
                    : nComponents === 3
                        ? CompressedDataTrackType.VEC3
                        : CompressedDataTrackType.VEC4,
            binding: vectorTrack[trackBindingTag],
            components,
        });
        return true;
    }

    public compressQuatTrack (track: QuaternionTrack) {
        const curve = track.channel.curve;
        const mayBeCompressed = KeySharedQuaternionCurves.allowedForCurve(curve);
        if (!mayBeCompressed) {
            return false;
        }
        this._quatTracks.push({
            binding: track[trackBindingTag],
            pointer: this._addQuaternionCurve(curve),
        });
        return true;
    }

    public createEval (binder: Binder) {
        const compressedDataEvalStatus: CompressedDataEvalStatus = {
            keySharedCurvesEvalStatuses: [],
            trackEvalStatuses: [],
            keysSharedQuatCurvesEvalStatues: [],
            quatTrackEvalStatuses: [],
        };

        const {
            keySharedCurvesEvalStatuses,
            trackEvalStatuses,
            keysSharedQuatCurvesEvalStatues,
            quatTrackEvalStatuses,
        } = compressedDataEvalStatus;

        for (const curves of this._curves) {
            keySharedCurvesEvalStatuses.push({
                curves,
                result: new Array(curves.curveCount).fill(0.0),
            });
        }

        for (const track of this._tracks) {
            const trackTarget = binder(track.binding);
            if (!trackTarget) {
                continue;
            }
            let immediate: CompressedTrackImmediate | undefined;
            switch (track.type) {
            default:
            case CompressedDataTrackType.FLOAT:
                break;
            case CompressedDataTrackType.VEC2:
                immediate = new Vec2();
                break;
            case CompressedDataTrackType.VEC3:
                immediate = new Vec3();
                break;
            case CompressedDataTrackType.VEC4:
                immediate = new Vec4();
                break;
            }
            trackEvalStatuses.push({
                type: track.type,
                target: trackTarget,
                curves: track.components,
                immediate,
            });
        }

        for (const curves of this._quatCurves) {
            keysSharedQuatCurvesEvalStatues.push({
                curves,
                result: Array.from({ length: curves.curveCount }, () => new Quat()),
            });
        }

        for (const track of this._quatTracks) {
            const trackTarget = binder(track.binding);
            if (!trackTarget) {
                continue;
            }
            quatTrackEvalStatuses.push({
                target: trackTarget,
                curve: track.pointer,
            });
        }

        return new CompressedDataEvaluator(compressedDataEvalStatus);
    }

    public collectAnimatedJoints () {
        const joints: string[] = [];

        for (const track of this._tracks) {
            const trsPath = track.binding.parseTrsPath();
            if (trsPath) {
                joints.push(trsPath.node);
            }
        }

        return joints;
    }

    @serializable
    private _curves: KeySharedRealCurves[] = [];

    @serializable
    private _tracks: CompressedTrack[] = [];

    @serializable
    private _quatCurves: KeySharedQuaternionCurves[] = [];

    @serializable
    private _quatTracks: CompressedQuatTrack[] = [];

    private _addRealCurve (curve: RealCurve): CompressedCurvePointer {
        const times = Array.from(curve.times());
        let iKeySharedCurves = this._curves.findIndex((shared) => shared.matchCurve(curve));
        if (iKeySharedCurves < 0) {
            iKeySharedCurves = this._curves.length;
            const keySharedCurves = new KeySharedRealCurves(times);
            this._curves.push(keySharedCurves);
        }
        const iCurve = this._curves[iKeySharedCurves].curveCount;
        this._curves[iKeySharedCurves].addCurve(curve);
        return {
            shared: iKeySharedCurves,
            component: iCurve,
        };
    }

    public _addQuaternionCurve (curve: QuaternionCurve): CompressedQuatCurvePointer {
        const times = Array.from(curve.times());
        let iKeySharedCurves = this._quatCurves.findIndex((shared) => shared.matchCurve(curve));
        if (iKeySharedCurves < 0) {
            iKeySharedCurves = this._quatCurves.length;
            const keySharedCurves = new KeySharedQuaternionCurves(times);
            this._quatCurves.push(keySharedCurves);
        }
        const iCurve = this._quatCurves[iKeySharedCurves].curveCount;
        this._quatCurves[iKeySharedCurves].addCurve(curve);
        return {
            shared: iKeySharedCurves,
            curve: iCurve,
        };
    }

    public validate () {
        return this._tracks.length > 0;
    }
}

export class CompressedDataEvaluator {
    constructor (compressedDataEvalStatus: CompressedDataEvalStatus) {
        this._compressedDataEvalStatus = compressedDataEvalStatus;
    }

    public evaluate (time: number) {
        const {
            keySharedCurvesEvalStatuses,
            trackEvalStatuses: compressedTrackEvalStatuses,
            keysSharedQuatCurvesEvalStatues,
            quatTrackEvalStatuses,
        } = this._compressedDataEvalStatus;

        const getPreEvaluated = (pointer: CompressedCurvePointer) => keySharedCurvesEvalStatuses[pointer.shared].result[pointer.component];

        for (const { curves, result } of keySharedCurvesEvalStatuses) {
            curves.evaluate(time, result);
        }

        for (const { type, target, immediate, curves } of compressedTrackEvalStatuses) {
            let value: unknown = immediate;
            switch (type) {
            default:
                break;
            case CompressedDataTrackType.FLOAT:
                value = getPreEvaluated(curves[0]);
                break;
            case CompressedDataTrackType.VEC2:
                Vec2.set(
                    value as Vec2,
                    getPreEvaluated(curves[0]),
                    getPreEvaluated(curves[1]),
                );
                break;
            case CompressedDataTrackType.VEC3:
                Vec3.set(
                    value as Vec3,
                    getPreEvaluated(curves[0]),
                    getPreEvaluated(curves[1]),
                    getPreEvaluated(curves[2]),
                );
                break;
            case CompressedDataTrackType.VEC4:
                Vec4.set(
                    value as Vec4,
                    getPreEvaluated(curves[0]),
                    getPreEvaluated(curves[1]),
                    getPreEvaluated(curves[2]),
                    getPreEvaluated(curves[4]),
                );
                break;
            }
            target.setValue(value);
        }

        for (const { curves, result } of keysSharedQuatCurvesEvalStatues) {
            curves.evaluate(time, result);
        }

        for (const { target, curve } of quatTrackEvalStatuses) {
            target.setValue(keysSharedQuatCurvesEvalStatues[curve.shared].result[curve.curve]);
        }
    }

    private _compressedDataEvalStatus: CompressedDataEvalStatus;
}

interface CompressedTrack {
    binding: TrackBinding;
    type: CompressedDataTrackType;
    components: CompressedCurvePointer[];
}

interface CompressedQuatTrack {
    binding: TrackBinding;
    pointer: CompressedQuatCurvePointer;
}

enum CompressedDataTrackType {
    FLOAT,
    VEC2,
    VEC3,
    VEC4,
}

type CompressedTrackImmediate = Vec2 | Vec3 | Vec4;

interface CompressedDataEvalStatus {
    keySharedCurvesEvalStatuses: Array<{
        curves: KeySharedRealCurves;
        result: number[];
    }>;

    trackEvalStatuses: Array<{
        type: CompressedDataTrackType;
        target: RuntimeBinding;
        immediate: CompressedTrackImmediate | undefined;
        curves: CompressedCurvePointer[];
    }>;

    keysSharedQuatCurvesEvalStatues: Array<{
        curves: KeySharedQuaternionCurves;
        result: Quat[];
    }>;

    quatTrackEvalStatuses: Array<{
        target: RuntimeBinding;
        curve: CompressedQuatCurvePointer;
    }>;
}

interface CompressedCurvePointer {
    shared: number;
    component: number;
}

interface CompressedQuatCurvePointer {
    shared: number;
    curve: number;
}
