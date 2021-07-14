/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * @packageDocumentation
 * @module animation
 */

import { ccclass, serializable } from 'cc.decorator';
import { Asset } from '../assets/asset';
import { SpriteFrame } from '../../2d/assets/sprite-frame';
import { error, errorID, warn } from '../platform/debug';
import { DataPoolManager } from '../../3d/skeletal-animation/data-pool-manager';
import { binarySearchEpsilon } from '../algorithm/binary-search';
import { murmurhash2_32_gc } from '../utils/murmurhash2_gc';
import { SkelAnimDataHub } from '../../3d/skeletal-animation/skeletal-animation-data-hub';
import { WrapMode as AnimationWrapMode, WrapMode, WrapModeMask } from './types';
import { legacyCC } from '../global-exports';
import { Mat4, Quat, Vec3 } from '../math';
import { Node } from '../scene-graph/node';
import { assertIsTrue } from '../data/utils/asserts';
import type { PoseOutput } from './pose-output';
import * as legacy from './legacy-clip-data';
import { BAKE_SKELETON_CURVE_SYMBOL } from './internal-symbols';
import { Binder, RuntimeBinding, Track, TrackBinding, trackBindingTag, TrackEval, TrackPath, TrsTrackPath } from './tracks/track';
import { createEvalSymbol } from './define';
import { VectorTrack } from './tracks/vector-track';
import { UntypedTrack, UntypedTrackRefine } from './tracks/untyped-track';
import { Range } from './tracks/utils';
import { ObjectTrack } from './tracks/object-track';
import { CompressedData, CompressedDataEvaluator } from './compression/compressed-data';
import { RealTrack } from './tracks/real-track';
import { QuaternionTrack } from './tracks/quat-track';

export declare namespace AnimationClip {
    export interface IEvent {
        frame: number;
        func: string;
        params: string[];
    }

    export type { legacy as _legacy };
}

// #region Tracks

// Export for test
export const searchForRootBonePathSymbol = Symbol('SearchForRootBonePath');

// #endregion

interface SkeletonAnimationBakeInfo {
    samples: number;

    frames: number;

    joints: Record<string, {
        transforms?: Mat4[];
    }>;
}

/**
 * @zh 动画剪辑表示一段使用动画编辑器编辑的关键帧动画或是外部美术工具生产的骨骼动画。
 * 它的数据主要被分为几层：轨道、关键帧和曲线。
 * @en The animation clip represents a sequence of key frame animation created with the animation editor or skeletal animation other DCC tools.
 * The data is divided in different levels: tracks, key frames, curves.
 */
@ccclass('cc.AnimationClip')
export class AnimationClip extends Asset {
    public static WrapMode = AnimationWrapMode;

    /**
     * @en Crate clip with a set of sprite frames
     * @zh 使用一组序列帧图片来创建动画剪辑
     * @example
     * ```
     * import { AnimationClip } from 'cc';
     * const clip = AnimationClip.createWithSpriteFrames(spriteFrames, 10);
     * ```
     */
    public static createWithSpriteFrames (spriteFrames: SpriteFrame[], sample: number) {
        const clip = new AnimationClip();
        clip.sample = sample || clip.sample;
        clip.duration = spriteFrames.length / clip.sample;
        const step = 1 / clip.sample;
        const track = new ObjectTrack<SpriteFrame>();
        track.path =  new TrackPath().component('cc.Sprite').property('spriteFrame');
        const curve = track.channels()[0].curve;
        curve.assignSorted(spriteFrames.map((spriteFrame, index) => [step * index, spriteFrame]));
        return clip;
    }

    /**
     * @zh 动画帧率，单位为帧/秒。注意此属性仅用于编辑器动画编辑。
     * @en Animation frame rate: frames per second.
     * Note this property is only used for animation editing in Editor.
     */
    @serializable
    public sample = 60;

    /**
     * @zh 动画的播放速度。
     * @en Animation playback speed.
     */
    @serializable
    public speed = 1;

    /**
     * @zh 动画的循环模式。
     * @en Animation loop mode.
     */
    @serializable
    public wrapMode = AnimationWrapMode.Normal;

    /**
     * Sets if node TRS curves in this animation can be blended.
     * Normally this flag is enabled for model animation and disabled for other case.
     * @internal This is an internal slot. Never use it in your code.
     */
    @serializable
    public enableTrsBlending = false;

    /**
     * @zh 动画的周期。
     * @en Animation duration.
     */
    get duration () {
        return this._duration;
    }

    set duration (value) {
        this._duration = value;
    }

    /**
     * Gets the count of tracks this animation owns.
     */
    get tracksCount () {
        return this._tracks.length;
    }

    /**
     * Gets an iterable to tracks.
     */
    get tracks (): Iterable<Track> {
        return this._tracks;
    }

    /**
     * Gets or sets if compression is enabled for this animation.
     * When compression is enabled,
     * both space and performance may be optimized at production phase.
     * The price is that you can not flexible edit the animation at run time.
     */
    get compressionEnabled () {
        return this._compressionEnabled;
    }

    set compressionEnabled (value) {
        this._compressionEnabled = value;
    }

    get hash () {
        // hashes should already be computed offline, but if not, make one
        if (this._hash) { return this._hash; }
        const data = this._nativeAsset;
        const buffer = new Uint8Array(ArrayBuffer.isView(data) ? data.buffer : data);
        return this._hash = murmurhash2_32_gc(buffer, 666);
    }

    /**
     * @zh 动画包含的事件数据。
     * @en Associated event data.
     */
    get events () {
        return this._events;
    }

    set events (value) {
        this._events = value;

        const ratios: number[] = [];
        const eventGroups: IAnimationEventGroup[] = [];
        const events = this.events.sort((a, b) => a.frame - b.frame);
        for (const eventData of events) {
            const ratio = eventData.frame / this._duration;
            let i = ratios.findIndex((r) => r === ratio);
            if (i < 0) {
                i = ratios.length;
                ratios.push(ratio);
                eventGroups.push({
                    events: [],
                });
            }
            eventGroups[i].events.push({
                functionName: eventData.func,
                parameters: eventData.params,
            });
        }

        this._runtimeEvents = {
            ratios,
            eventGroups,
        };
    }

    public onLoaded () {
        this.frameRate = this.sample;
    }

    /**
     * Counts the time range this animation spans.
     * @returns The time range.
     */
    public range () {
        const range: Range = { min: Infinity, max: -Infinity };
        for (const track of this._tracks) {
            const trackRange = track.range();
            range.min = Math.min(range.min, trackRange.min);
            range.max = Math.max(range.max, trackRange.max);
        }
        return range;
    }

    /**
     * Gets the specified track.
     * @param index Index to the track.
     * @returns The track.
     */
    public getTrack (index: number) {
        return this._tracks[index];
    }

    /**
     * Adds a track into this animation.
     * @param track The track.
     * @returns Index to the track.
     */
    public addTrack (track: Track) {
        const index = this._tracks.length;
        this._tracks.push(track);
        return index;
    }

    /**
     * Removes a track from this animation.
     * @param index Index to the track.
     */
    public removeTrack (index: number) {
        this._tracks.splice(index, 1);
    }

    /**
     * Removes all tracks from this animation.
     */
    public clearTracks () {
        this._tracks.length = 0;
    }

    /**
     * Creates an event evaluator for this animation.
     * @param targetNode Target node used to fire events.
     * @returns @internal Do not use this in your code.
     */
    public createEventEvaluator (targetNode: Node) {
        return new EventEvaluator(
            targetNode,
            this._runtimeEvents.ratios,
            this._runtimeEvents.eventGroups,
            this.wrapMode,
        );
    }

    /**
     * Creates an evaluator for this animation.
     * @param context The context.
     * @returns The evaluator.
     * @internal Do not use this in your code.
     */
    public createEvaluator (context: AnimationClipEvalContext) {
        const {
            target,
        } = context;

        const binder: Binder = (binding: TrackBinding) => {
            const trackTarget = binding.createRuntimeBinding(
                target,
                this.enableTrsBlending ? context.pose : undefined,
                false,
            );
            // TODO: warning
            return trackTarget ?? undefined;
        };

        return this._createEvalWithBinder(target, binder, context.rootMotion);
    }

    /**
     * Compresses this animation.
     * @internal Do not use this in your code.
     */
    public compress () {
        const compressedData = new CompressedData();
        const compressedTracks = new Set<Track>();
        for (const track of this._tracks) {
            let mayBeCompressed = false;
            if (track instanceof RealTrack) {
                mayBeCompressed = compressedData.compressRealTrack(track);
            } else if (track instanceof VectorTrack) {
                mayBeCompressed = compressedData.compressVectorTrack(track);
            } else if (track instanceof QuaternionTrack) {
                mayBeCompressed = compressedData.compressQuatTrack(track);
            }
            if (mayBeCompressed) {
                compressedTracks.add(track);
            }
        }
        this._compression = {
            data: compressedData,
            compressedTracks: Array.from(compressedTracks),
        };
    }

    /**
     * @internal Do not use this in your code.
     */
    public purgeCompressedTracks () {
        const { _compression: compression } = this;
        if (!compression) {
            return;
        }
        const compressedTracks = compression.compressedTracks;
        if (!compressedTracks) {
            return;
        }
        this._tracks = this._tracks.filter((track) => !compressedTracks.includes(track));
        compression.compressedTracks = undefined;
    }

    public destroy () {
        if (legacyCC.director.root.dataPoolManager) {
            (legacyCC.director.root.dataPoolManager as DataPoolManager).releaseAnimationClip(this);
        }
        SkelAnimDataHub.destroy(this);
        return super.destroy();
    }

    public [BAKE_SKELETON_CURVE_SYMBOL] (start: number, samples: number, frames: number): SkeletonAnimationBakeInfo {
        const step = 1.0 / samples;

        const animatedJoints = this._collectAnimatedJoints();

        const jointsBakeInfo: Record<string, {
            transforms: Mat4[];
        }> = {};
        for (const joint of animatedJoints) {
            jointsBakeInfo[joint] = {
                transforms: Array.from({ length: frames }, () => new Mat4()),
            };
        }

        const skeletonFrames = animatedJoints.reduce((result, joint) => {
            result[joint] = new BoneGlobalTransform();
            return result;
        }, {} as Record<string, BoneGlobalTransform>);
        for (const joint of Object.keys(skeletonFrames)) {
            const skeletonFrame = skeletonFrames[joint];
            const parentJoint = joint.lastIndexOf('/');
            if (parentJoint >= 0) {
                const parentJointName = joint.substring(0, parentJoint);
                const parentJointFrame = skeletonFrames[parentJointName];
                if (!parentJointFrame) {
                    warn(`Seems like we have animation for ${joint} but are missing its parent joint ${parentJointName} in animation?`);
                } else {
                    skeletonFrame.parent = parentJointFrame;
                }
            }
        }

        const binder: Binder = (binding: TrackBinding) => {
            const trsPath = binding.parseTrsPath();
            if (!trsPath) {
                return undefined;
            }

            const jointFrame = skeletonFrames[trsPath.node];
            if (!jointFrame) {
                return undefined;
            }

            return createBoneTransformBinding(jointFrame, trsPath.property);
        };

        const evaluator = this._createEvalWithBinder(undefined, binder, undefined);

        for (let iFrame = 0; iFrame < frames; ++iFrame) {
            const time = start + step * iFrame;
            evaluator.evaluate(time);
            for (const joint of animatedJoints) {
                Mat4.copy(
                    jointsBakeInfo[joint].transforms[iFrame],
                    skeletonFrames[joint].globalTransform,
                );
            }
            for (const joint of animatedJoints) {
                skeletonFrames[joint].invalidate();
            }
        }

        return {
            samples,

            frames,

            joints: jointsBakeInfo,
        };
    }

    /**
     * Convert all untyped tracks into typed ones and delete the original.
     * @param refine How to decide the type on specified path.
     * @internal DO NOT USE THIS IN YOUR CODE.
     */
    public upgradeUntypedTracks (refine: UntypedTrackRefine) {
        const newTracks: Track[] = [];
        for (const track of this._tracks) {
            if (!(track instanceof UntypedTrack)) {
                continue;
            }
            const newTrack = track.upgrade(refine);
            if (newTrack) {
                newTracks.push(newTrack);
            }
        }
    }

    /**
     * Export for test.
     */
    public [searchForRootBonePathSymbol] () {
        return this._searchForRootBonePath();
    }

    // #region Legacy area
    // The following are significantly refactored and deprecated since 3.1.
    // We deprecates the direct exposure of keys, values, events.
    // Instead, we use track to organize them together.

    /**
     * @zh 曲线可引用的所有时间轴。
     * @en Frame keys referenced by curves.
     * @deprecated Since V3.1.
     */
    get keys () {
        return this._getLegacyData().keys;
    }

    set keys (value) {
        this._legacyDataDirty = true;
        this._getLegacyData().keys = value;
    }

    /**
     * @zh 此动画包含的所有曲线。
     * @en Curves this animation contains.
     * @deprecated Since V3.1.
     */
    get curves () {
        this._legacyDataDirty = true;
        return this._getLegacyData().curves;
    }

    set curves (value) {
        this._getLegacyData().curves = value;
    }

    /**
     * @deprecated Since V3.1.
     */
    get commonTargets () {
        return this._getLegacyData().commonTargets;
    }

    set commonTargets (value) {
        this._legacyDataDirty = true;
        this._getLegacyData().commonTargets = value;
    }

    /**
     * 此动画的数据。
     * @deprecated Since V3.1.
     */
    get data () {
        return this._getLegacyData().data;
    }

    /**
     * @internal
     * @deprecated Since V3.1.
     */
    public getPropertyCurves () {
        return this._getLegacyData().getPropertyCurves();
    }

    /**
     * @protected
     * @deprecated Since V3.1.
     */
    get eventGroups (): readonly IAnimationEventGroup[] {
        return this._runtimeEvents.eventGroups;
    }

    /**
     * @zh 提交事件数据的修改。
     * 当你修改了 `this.events` 时，必须调用 `this.updateEventDatas()` 使修改生效。
     * @en
     * Commit event data update.
     * You should call this function after you changed the `events` data to take effect.
     * @internal
     * @deprecated Since V3.1.
     */
    public updateEventDatas () {
        // EMPTY
    }

    /**
     * @zh 返回本动画是否包含事件数据。
     * @en Returns if this animation contains event data.
     * @protected
     */
    public hasEvents () {
        return this.events.length !== 0;
    }

    /**
     * Migrates legacy data into tracks.
     * @internal This method tend to be used as internal purpose or patch.
     * DO NOT use it in your code since it might be removed for the future at any time.
     * @deprecated Since V3.1.
     */
    public syncLegacyData () {
        if (this._legacyData) {
            this._fromLegacy(this._legacyData);
            this._legacyData = undefined;
        }
    }

    // #endregion

    @serializable
    private _duration = 0;

    @serializable
    private _hash = 0;

    private frameRate = 0;

    @serializable
    private _tracks: Track[] = [];

    @serializable
    private _compressionEnabled = false;

    @serializable
    private _compression: {
        data: CompressedData;
        compressedTracks: Track[] | undefined;
    } | undefined = undefined;

    private _legacyData: legacy.AnimationClipLegacyData | undefined = undefined;

    private _legacyDataDirty = false;

    @serializable
    private _events: AnimationClip.IEvent[] = [];

    private _runtimeEvents: {
        ratios: number[];
        eventGroups: IAnimationEventGroup[];
    } = {
        ratios: [],
        eventGroups: [],
    };

    private _createEvalWithBinder (target: unknown, binder: Binder, rootMotionOptions: RootMotionOptions | undefined) {
        if (this._legacyDataDirty) {
            this._legacyDataDirty = false;
            this.syncLegacyData();
        }

        const rootMotionTrackExcludes: Track[] = [];
        let rootMotionEvaluation: RootMotionEvaluation | undefined;
        if (rootMotionOptions) {
            rootMotionEvaluation = this._createRootMotionEvaluation(
                target,
                rootMotionOptions,
                rootMotionTrackExcludes,
            );
        }

        const trackEvalStatues: TrackEvalStatus[] = [];
        let compressedDataEvaluator: CompressedDataEvaluator | undefined;

        for (const track of this._tracks) {
            if (this._compression?.compressedTracks?.includes(track)) {
                continue;
            }
            if (rootMotionTrackExcludes.includes(track)) {
                continue;
            }
            const trackTarget = binder(track[trackBindingTag]);
            if (!trackTarget) {
                continue;
            }
            const trackEval = track[createEvalSymbol](trackTarget);
            trackEvalStatues.push({
                binding: trackTarget,
                trackEval,
            });
        }

        if (this._compression) {
            compressedDataEvaluator = this._compression.data.createEval(binder);
        }

        const evaluation = new AnimationClipEvaluation(
            trackEvalStatues,
            compressedDataEvaluator,
            rootMotionEvaluation,
        );

        return evaluation;
    }

    private _createRootMotionEvaluation (
        target: unknown,
        rootMotionOptions: RootMotionOptions,
        rootMotionTrackExcludes: Track[],
    ) {
        if (!(target instanceof Node)) {
            error(`Current context does not allow root motion.`);
            return undefined;
        }

        const rootBonePath = this._searchForRootBonePath();
        if (!rootBonePath) {
            warn(`Root motion is ignored since root bone could not be located in animation.`);
            return undefined;
        }

        const rootBone = target.getChildByPath(rootBonePath);
        if (!rootBone) {
            warn(`Root motion is ignored since the root bone could not be located in scene.`);
            return undefined;
        }

        // const { } = rootMotionOptions;

        const boneTransform = new BoneTransform();
        const rootMotionsTrackEvaluations: TrackEvalStatus[] = [];
        for (const track of this._tracks) {
            const { [trackBindingTag]: trackBinding } = track;
            const trsPath = trackBinding.parseTrsPath();
            if (!trsPath) {
                continue;
            }
            const bonePath = trsPath.node;
            if (bonePath !== rootBonePath) {
                continue;
            }
            rootMotionTrackExcludes.push(track);
            const property = trsPath.property;
            const trackTarget = createBoneTransformBinding(boneTransform, property);
            if (!trackTarget) {
                continue;
            }
            const trackEval = track[createEvalSymbol](trackTarget);
            rootMotionsTrackEvaluations.push({
                binding: trackTarget,
                trackEval,
            });
        }
        const rootMotionEvaluation = new RootMotionEvaluation(
            rootBone,
            this._duration,
            boneTransform,
            rootMotionsTrackEvaluations,
        );

        return rootMotionEvaluation;
    }

    private _searchForRootBonePath () {
        const paths = this._tracks.map((track) => {
            const trsPath = track[trackBindingTag].parseTrsPath();
            if (trsPath) {
                const nodePath = trsPath.node;
                return {
                    path: nodePath,
                    rank: nodePath.split('/').length,
                };
            } else {
                return {
                    path: '',
                    rank: 0,
                };
            }
        });

        paths.sort((a, b) => a.rank - b.rank);

        const iNonEmptyPath = paths.findIndex((p) => p.rank !== 0);
        if (iNonEmptyPath < 0) {
            return '';
        }

        const nPaths = paths.length;
        const firstPath = paths[iNonEmptyPath];
        let highestPathsAreSame = true;
        for (let iPath = iNonEmptyPath + 1; iPath < nPaths; ++iPath) {
            const path = paths[iPath];
            if (path.rank !== firstPath.rank) {
                break;
            }
            if (path.path !== firstPath.path) {
                highestPathsAreSame = false;
                break;
            }
        }

        return highestPathsAreSame ? firstPath.path : '';
    }

    private _getLegacyData () {
        if (!this._legacyData) {
            this._legacyData = this._toLegacy();
        }
        return this._legacyData;
    }

    private _toLegacy (): legacy.AnimationClipLegacyData {
        const keys: number[][] = [];
        const legacyCurves: legacy.LegacyClipCurve[] = [];
        const commonTargets: legacy.LegacyCommonTarget[] = [];

        const legacyClipData = new legacy.AnimationClipLegacyData(this._duration);
        legacyClipData.keys = keys;
        legacyClipData.curves = legacyCurves;
        legacyClipData.commonTargets = commonTargets;
        return legacyClipData;
    }

    private _fromLegacy (legacyData: legacy.AnimationClipLegacyData) {
        const newTracks = legacyData.toTracks();
        for (const track of newTracks) {
            this.addTrack(track);
        }
    }

    private _collectAnimatedJoints () {
        const joints = new Set<string>();

        for (const track of this._tracks) {
            const trsPath = track[trackBindingTag].parseTrsPath();
            if (trsPath) {
                joints.add(trsPath.node);
            }
        }

        if (this._compression) {
            for (const joint of this._compression.data.collectAnimatedJoints()) {
                joints.add(joint);
            }
        }

        return Array.from(joints);
    }
}

legacyCC.AnimationClip = AnimationClip;

// #region Data compression

interface TrackEvalStatus {
    binding: RuntimeBinding;
    trackEval: TrackEval;
}

// #endregion
interface AnimationClipEvalContext {
    /**
     * The output pose.
     */
    pose?: PoseOutput;

    /**
     * The root animating target(should be scene node now).
     */
    target: unknown;

    /**
     * Path to the root bone.
     */
    rootMotion?: RootMotionOptions;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RootMotionOptions {
}

class AnimationClipEvaluation {
    /**
     * @internal
     * @param trackEvalStatuses
     * @param compressedDataEvaluator
     */
    constructor (
        trackEvalStatuses: TrackEvalStatus[],
        compressedDataEvaluator: CompressedDataEvaluator | undefined,
        rootMotionEvaluation: RootMotionEvaluation | undefined,
    ) {
        this._trackEvalStatues = trackEvalStatuses;
        this._compressedDataEvaluator = compressedDataEvaluator;
        this._rootMotionEvaluation = rootMotionEvaluation;
    }

    /**
     * Evaluates this animation.
     * @param time The time.
     */
    public evaluate (time: number) {
        const {
            _trackEvalStatues: trackEvalStatuses,
            _compressedDataEvaluator: compressedDataEvaluator,
        } = this;

        for (const trackEvalStatus of trackEvalStatuses) {
            const value = trackEvalStatus.trackEval.evaluate(time, trackEvalStatus.binding);
            trackEvalStatus.binding.setValue(value);
        }

        if (compressedDataEvaluator) {
            compressedDataEvaluator.evaluate(time);
        }
    }

    /**
     * Gets the root bone motion.
     * @param startTime Start time.
     * @param endTime End time.
     */
    public evaluateRootMotion (time: number, motionLength: number) {
        const { _rootMotionEvaluation: rootMotionEvaluation } = this;
        if (rootMotionEvaluation) {
            rootMotionEvaluation.evaluate(time, motionLength);
        }
    }

    private _compressedDataEvaluator: CompressedDataEvaluator | undefined;
    private _trackEvalStatues:TrackEvalStatus[] = [];
    private _rootMotionEvaluation: RootMotionEvaluation | undefined = undefined;
}

class BoneTransform {
    public position = new Vec3();
    public scale = new Vec3(1.0, 1.0, 1.0);
    public rotation = new Quat();
    public eulerAngles = new Vec3();

    public getTransform (out: Mat4) {
        Mat4.fromRTS(out, this.rotation, this.position, this.scale);
    }
}

class BoneGlobalTransform extends BoneTransform {
    public parent: BoneGlobalTransform | null = null;

    public get globalTransform (): Readonly<Mat4> {
        const transform = this._transform;
        if (this._dirty) {
            this._dirty = false;
            Mat4.fromRTS(transform, this.rotation, this.position, this.scale);
            if (this.parent) {
                Mat4.multiply(transform, this.parent.globalTransform, transform);
            }
        }
        return this._transform;
    }

    public invalidate () {
        this._dirty = true;
    }

    private _dirty = true;
    private _transform = new Mat4();
}

const motionTransformCache = new Mat4();

class RootMotionEvaluation {
    constructor (
        private _rootBone: Node,
        private _duration: number,
        private _boneTransform: BoneTransform,
        private _trackEvalStatuses: TrackEvalStatus[],
    ) {

    }

    public evaluate (time: number, motionLength: number) {
        const motionTransform = this._calcMotionTransform(time, motionLength, this._motionTransformCache);

        const {
            _translationMotionCache: translationMotion,
            _rotationMotionCache: rotationMotion,
            _scaleMotionCache: scaleMotion,
            _rootBone: rootBone,
        } = this;

        Mat4.toRTS(motionTransform, rotationMotion, translationMotion, scaleMotion);

        Vec3.add(translationMotion, translationMotion, rootBone.position);
        rootBone.setPosition(translationMotion);

        Quat.multiply(rotationMotion, rotationMotion, rootBone.rotation);
        rootBone.setRotation(rotationMotion);

        Vec3.multiply(scaleMotion, scaleMotion, rootBone.scale);
        rootBone.setScale(scaleMotion);
    }

    private _calcMotionTransform (time: number, motionLength: number, outTransform: Mat4) {
        const { _duration: duration } = this;
        const remainLength = duration - time;
        assertIsTrue(remainLength >= 0);
        const startTransform = this._evaluateAt(time, this._startTransformCache);
        if (motionLength < remainLength) {
            const endTransform = this._evaluateAt(time + motionLength, this._endTransformCache);
            relativeTransform(outTransform, startTransform, endTransform);
        } else {
            Mat4.identity(outTransform);

            const accumulateMotionTransform = (from: Mat4, to: Mat4) => {
                relativeTransform(motionTransformCache, from, to);
                Mat4.multiply(outTransform, outTransform, motionTransformCache);
            };

            const diff = motionLength - remainLength;
            const repeatCount = Math.floor(diff / duration);
            const lastRemainTime = diff - repeatCount * duration;
            const clipStartTransform = this._evaluateAt(0, this._initialTransformCache);
            const clipEndTransform = this._evaluateAt(duration, this._clipEndTransformCache);
            const endTransform = this._evaluateAt(lastRemainTime, this._endTransformCache);

            // Start -> Clip End
            accumulateMotionTransform(startTransform, clipEndTransform);

            // Whole clip x Repeat Count
            relativeTransform(motionTransformCache, clipStartTransform, clipEndTransform);
            for (let i = 0; i < repeatCount; ++i) {
                Mat4.multiply(outTransform, outTransform, motionTransformCache);
            }

            // Clip Start -> End
            accumulateMotionTransform(clipStartTransform, endTransform);
        }
        return outTransform;
    }

    private _evaluateAt (time: number, outTransform: Mat4) {
        const {
            _trackEvalStatuses: trackEvalStatuses,
        } = this;

        for (const trackEvalStatus of trackEvalStatuses) {
            const value = trackEvalStatus.trackEval.evaluate(time, trackEvalStatus.binding);
            trackEvalStatus.binding.setValue(value);
        }

        this._boneTransform.getTransform(outTransform);
        return outTransform;
    }

    private _initialTransformCache = new Mat4();
    private _clipEndTransformCache = new Mat4();
    private _startTransformCache = new Mat4();
    private _endTransformCache = new Mat4();
    private _motionTransformCache = new Mat4();
    private _translationMotionCache = new Vec3();
    private _rotationMotionCache = new Quat();
    private _scaleMotionCache = new Vec3();
}

function relativeTransform (out: Mat4, from: Mat4, to: Mat4) {
    Mat4.invert(out, from);
    Mat4.multiply(out, to, out);
}

function createBoneTransformBinding (boneTransform: BoneTransform, property: TrsTrackPath[1]) {
    switch (property) {
    default:
        return undefined;
    case 'position':
        return {
            setValue (value: Vec3) {
                Vec3.copy(boneTransform.position, value);
            },
        };
    case 'rotation':
        return {
            setValue (value: Quat) {
                Quat.copy(boneTransform.rotation, value);
            },
        };
    case 'scale':
        return {
            setValue (value: Vec3) {
                Vec3.copy(boneTransform.scale, value);
            },
        };
    case 'eulerAngles':
        return {
            setValue (value: Vec3) {
                Vec3.copy(boneTransform.eulerAngles, value);
            },
        };
    }
}

// #region Events

interface IAnimationEvent {
    functionName: string;
    parameters: string[];
}

interface IAnimationEventGroup {
    events: IAnimationEvent[];
}

const InvalidIndex = -1;

class EventEvaluator {
    constructor (
        private _targetNode: Node,
        private _ratios: readonly number[],
        private _eventGroups: readonly IAnimationEventGroup[],
        private _wrapMode: WrapMode,
    ) {

    }

    public setWrapMode (wrapMode: WrapMode) {
        this._wrapMode = wrapMode;
    }

    public ignore (ratio: number, direction: number) {
        this._ignoreIndex = InvalidIndex;
        this._sampled = false;

        let frameIndex = getEventGroupIndexAtRatio(ratio, this._ratios);

        // only ignore when time not on a frame index
        if (frameIndex < 0) {
            frameIndex = ~frameIndex - 1;

            // if direction is inverse, then increase index
            if (direction < 0) { frameIndex += 1; }

            this._ignoreIndex = frameIndex;
        }
    }

    public sample (ratio: number, direction: number, iterations: number) {
        const length = this._eventGroups.length;
        let eventIndex = getEventGroupIndexAtRatio(ratio, this._ratios);
        if (eventIndex < 0) {
            eventIndex = ~eventIndex - 1;
            // If direction is inverse, increase index.
            if (direction < 0) {
                eventIndex += 1;
            }
        }

        if (this._ignoreIndex !== eventIndex) {
            this._ignoreIndex = InvalidIndex;
        }

        if (!this._sampled) {
            this._sampled = true;
            this._doFire(eventIndex, false);
            this._lastFrameIndex = eventIndex;
            this._lastIterations = iterations;
            this._lastDirection = direction;
            return;
        }

        const wrapMode = this._wrapMode;
        const currentIterations = wrapIterations(iterations);

        let lastIterations = wrapIterations(this._lastIterations);
        let lastIndex = this._lastFrameIndex;
        const lastDirection = this._lastDirection;

        const iterationsChanged = lastIterations !== -1 && currentIterations !== lastIterations;

        if (lastIndex === eventIndex && iterationsChanged && length === 1) {
            this._doFire(0, false);
        } else if (lastIndex !== eventIndex || iterationsChanged) {
            direction = lastDirection;

            do {
                if (lastIndex !== eventIndex) {
                    if (direction === -1 && lastIndex === 0 && eventIndex > 0) {
                        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
                            direction *= -1;
                        } else {
                            lastIndex = length;
                        }
                        lastIterations++;
                    } else if (direction === 1 && lastIndex === length - 1 && eventIndex < length - 1) {
                        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
                            direction *= -1;
                        } else {
                            lastIndex = -1;
                        }
                        lastIterations++;
                    }

                    if (lastIndex === eventIndex) {
                        break;
                    }
                    if (lastIterations > currentIterations) {
                        break;
                    }
                }

                lastIndex += direction;
                this._doFire(lastIndex, true);
            } while (lastIndex !== eventIndex && lastIndex > -1 && lastIndex < length);
        }

        this._lastFrameIndex = eventIndex;
        this._lastIterations = iterations;
        this._lastDirection = direction;
    }

    private _lastFrameIndex = -1;
    private _lastIterations = 0.0;
    private _lastDirection = 0;
    private _ignoreIndex = InvalidIndex;
    private _sampled = false;

    private _doFire (eventIndex: number, delay: boolean) {
        if (delay) {
            legacyCC.director.getAnimationManager().pushDelayEvent(this._checkAndFire, this, [eventIndex]);
        } else {
            this._checkAndFire(eventIndex);
        }
    }

    private _checkAndFire (eventIndex: number) {
        if (!this._targetNode || !this._targetNode.isValid) {
            return;
        }

        const { _eventGroups: eventGroups } = this;
        if (eventIndex < 0 || eventIndex >= eventGroups.length || this._ignoreIndex === eventIndex) {
            return;
        }

        const eventGroup = eventGroups[eventIndex];
        const components = this._targetNode.components;
        for (const event of eventGroup.events) {
            const { functionName } = event;
            for (const component of components) {
                const fx = component[functionName];
                if (typeof fx === 'function') {
                    fx.apply(component, event.parameters);
                }
            }
        }
    }
}

function wrapIterations (iterations: number) {
    if (iterations - (iterations | 0) === 0) {
        iterations -= 1;
    }
    return iterations | 0;
}

function getEventGroupIndexAtRatio (ratio: number, ratios: readonly number[]) {
    const result = binarySearchEpsilon(ratios, ratio);
    return result;
}

// #endregion
