import { ccclass, serializable, uniquelyReferenced } from 'cc.decorator';
import type { Component } from '../../components';
import type { IntegerCurve, ObjectCurve, QuaternionCurve, RealCurve } from '../../curves';
import { assertIsTrue } from '../../data/utils/asserts';
import { error, warn } from '../../platform';
import { Node } from '../../scene-graph';
import { js } from '../../utils/js';
import { CLASS_NAME_PREFIX_ANIM, createEvalSymbol } from '../define';
import { PoseOutput } from '../pose-output';
import { ComponentPath, HierarchyPath, isPropertyPath, TargetPath } from '../target-path';
import { IValueProxyFactory } from '../value-proxy';
import { Range } from './utils';

const normalizedFollowTag = Symbol('NormalizedFollow');

const parseTrsPathTag = Symbol('ConvertAsTrsPath');

export const trackBindingTag = Symbol('TrackBinding');

/**
 * A track describes the path of animate a target.
 * It's the basic unit of animation clip.
 */
@ccclass(`${CLASS_NAME_PREFIX_ANIM}Track`)
export class Track {
    get path () {
        return this._binding.path;
    }

    set path (value) {
        this._binding.path = value;
    }

    get proxy () {
        return this._binding.proxy;
    }

    set proxy (value) {
        this._binding.proxy = value;
    }

    get [trackBindingTag] () {
        return this._binding;
    }

    public channels (): Iterable<Channel> {
        return [];
    }

    public range (): Range {
        const range: Range = { min: Infinity, max: -Infinity };
        for (const channel of this.channels()) {
            range.min = Math.min(range.min, channel.curve.rangeMin);
            range.max = Math.max(range.max, channel.curve.rangeMax);
        }
        return range;
    }

    public [createEvalSymbol] (runtimeBinding: RuntimeBinding): TrackEval {
        throw new Error(`No Impl`);
    }

    @serializable
    private _binding = new TrackBinding();
}

export interface TrackEval {
    /**
     * Evaluates the track.
     * @param time The time.
     */
    evaluate(time: number, runtimeBinding: RuntimeBinding): unknown;
}

export type Curve = RealCurve | IntegerCurve | QuaternionCurve | ObjectCurve<unknown>;

@ccclass(`${CLASS_NAME_PREFIX_ANIM}Channel`)
export class Channel<T = Curve> {
    constructor (curve: T) {
        this._curve = curve;
    }

    // @serializable
    public name = '';

    get curve () {
        return this._curve;
    }

    @serializable
    private _curve!: T;
}

export type RealChannel = Channel<RealCurve>;

export type IntegerChannel = Channel<IntegerCurve>;

export type QuaternionChannel = Channel<QuaternionCurve>;

@ccclass(`${CLASS_NAME_PREFIX_ANIM}SingleChannelTrack`)
export abstract class SingleChannelTrack<TCurve extends Curve> extends Track {
    constructor () {
        super();
        this._channel = new Channel<TCurve>(this.createCurve());
    }

    get channel () {
        return this._channel;
    }

    public channels (): Iterable<Channel<TCurve>> {
        return [this._channel];
    }

    protected createCurve (): TCurve {
        throw new Error(`Not impl`);
    }

    public [createEvalSymbol] (_runtimeBinding: RuntimeBinding): TrackEval {
        const { curve } = this._channel;
        return {
            evaluate: (time) => curve.evaluate(time),
        };
    }

    @serializable
    private _channel: Channel<TCurve>;
}

export type RuntimeBinding = {
    setValue(value: unknown): void;

    getValue?(): unknown;
};

export type Binder = (binding: TrackBinding) => undefined | RuntimeBinding;

export type TrsTrackPath = [HierarchyPath, 'position' | 'rotation' | 'scale' | 'eulerAngles'];

@ccclass(`${CLASS_NAME_PREFIX_ANIM}TrackPath`)
class TrackPath {
    get length () {
        return this._paths.length;
    }

    public property (name: string) {
        this._paths.push(name);
        return this;
    }

    public element (index: number) {
        this._paths.push(index);
        return this;
    }

    public hierarchy (nodePath: string) {
        this._paths.push(new HierarchyPath(nodePath));
        return this;
    }

    public component<T extends Component> (constructor: Constructor<T> | string) {
        const path = new ComponentPath(typeof constructor === 'string' ? constructor : js.getClassName(constructor));
        this._paths.push(path);
        return this;
    }

    public customized (resolver: CustomizedTrackPathResolver) {
        this._paths.push(resolver);
        return this;
    }

    public append (...trackPaths: TrackPath[]) {
        const paths = this._paths.concat(...trackPaths.map((trackPath) => trackPath._paths));
        this._paths = paths;
        return this;
    }

    public isPropertyAt (index: number) {
        return typeof (this._paths[index]) === 'string';
    }

    public parsePropertyAt (index: number): string {
        return this._paths[index] as string;
    }

    public isElementAt (index: number) {
        return typeof this._paths[index] === 'number';
    }

    public parseElementAt (index: number): number {
        return this._paths[index] as number;
    }

    public isHierarchyAt (index: number) {
        return this._paths[index] instanceof HierarchyPath;
    }

    public parseHierarchyAt (index: number) {
        assertIsTrue(this.isHierarchyAt(index));
        return (this._paths[index] as HierarchyPath).path;
    }

    public isComponentAt (index: number) {
        return this._paths[index] instanceof ComponentPath;
    }

    public parseComponentAt (index: number) {
        assertIsTrue(this.isComponentAt(index));
        return (this._paths[index] as ComponentPath).component;
    }

    public slice (beginIndex?: number, endIndex?: number) {
        const trackPath = new TrackPath();
        trackPath._paths = this._paths.slice(beginIndex, endIndex);
        return trackPath;
    }

    public follow (object: unknown, beginIndex?: number, endIndex?: number) {
        beginIndex ??= 0;
        endIndex ??= this._paths.length;
        return this[normalizedFollowTag](object, beginIndex, endIndex, undefined, false);
    }

    public [parseTrsPathTag] () {
        const { _paths: paths } = this;
        const nPaths = paths.length;

        let iPath = 0;

        let nodePath = '';
        for (; iPath < nPaths; ++iPath) {
            const path = paths[iPath];
            if (!(path instanceof HierarchyPath)) {
                break;
            } else if (!path.path) {
                continue;
            }  else if (nodePath) {
                nodePath += `/${path.path}`;
            } else {
                nodePath = path.path;
            }
        }

        if (iPath === nPaths) {
            return null;
        }

        let prs: 'position' | 'scale' | 'rotation' | 'eulerAngles';
        if (iPath !== nPaths - 1) {
            return null;
        }

        switch (paths[iPath]) {
        case 'position':
        case 'scale':
        case 'rotation':
        case 'eulerAngles':
            prs = paths[iPath] as typeof prs;
            break;
        default:
            return null;
        }

        return { node: nodePath, property: prs };
    }

    public [normalizedFollowTag] (root: unknown, beginIndex: number, endIndex: number, poseOutput: PoseOutput | undefined, isConstant: boolean) {
        const { _paths: paths } = this;
        let result = root;
        for (let iPath = beginIndex; iPath < endIndex; ++iPath) {
            const path = paths[iPath];
            if (isPropertyPath(path)) {
                if (!(path in (result as any))) {
                    warn(`Target object has no property "${path}"`);
                    return null;
                } else {
                    if (poseOutput && iPath === endIndex - 1 && result instanceof Node && isTrsPropertyName(path)) {
                        const blendStateWriter = poseOutput.createPoseWriter(result, path, isConstant);
                        return blendStateWriter;
                    }
                    result = (result as any)[path];
                }
            } else {
                result = path.get(result);
            }
            if (result === null) {
                break;
            }
        }
        return result;
    }

    @serializable
    private _paths: TargetPath[] = [];
}

/**
 * Composite of track path and value proxy.
 * Not exposed to external. If there is any reason it should be exposed,
 * please redesign the public interfaces.
 */
@ccclass(`${CLASS_NAME_PREFIX_ANIM}TrackBinding`)
@uniquelyReferenced
export class TrackBinding {
    @serializable
    public path: Readonly<TrackPath> = new TrackPath();

    @serializable
    public proxy: IValueProxyFactory | undefined;

    public parseTrsPath () {
        if (this.proxy) {
            return null;
        } else {
            return this.path[parseTrsPathTag]();
        }
    }

    public createRuntimeBinding (target: unknown, poseOutput: PoseOutput | undefined, isConstant: boolean) {
        const { path, proxy } = this;
        const nPaths = path.length;
        const iLastPath = nPaths - 1;
        if (nPaths !== 0 && (path.isPropertyAt(iLastPath) || path.isElementAt(iLastPath)) && !proxy) {
            const lastPropertyKey = path.isPropertyAt(iLastPath)
                ? path.parsePropertyAt(iLastPath)
                : path.parseElementAt(iLastPath);
            const resultTarget = path[normalizedFollowTag](target, 0, nPaths - 1, poseOutput, isConstant) as any;
            if (resultTarget === null) {
                return null;
            }
            return {
                setValue: (value: unknown) => {
                    resultTarget[lastPropertyKey] = value;
                },
                // eslint-disable-next-line arrow-body-style
                getValue: () => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return resultTarget[lastPropertyKey];
                },
            };
        } else if (!proxy) {
            error(
                `You provided a ill-formed track path.`
                + `The last component of track path should be property key, or the setter should not be empty.`,
            );
            return null;
        } else {
            const resultTarget = path[normalizedFollowTag](target, 0, nPaths, poseOutput, isConstant);
            if (resultTarget === null) {
                return null;
            }
            const runtimeProxy = proxy.forTarget(resultTarget);
            const binding: RuntimeBinding = {
                setValue: (value) => {
                    runtimeProxy.set(value);
                },
            };
            const proxyGet = runtimeProxy.get;
            if (proxyGet) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                binding.getValue = () => proxyGet.call(runtimeProxy);
            }
            return binding;
        }
    }
}

function isTrsPropertyName (name: string | number): name is 'position' | 'rotation' | 'scale' | 'eulerAngles' {
    return name === 'position' || name === 'rotation' || name === 'scale' || name === 'eulerAngles';
}

interface CustomizedTrackPathResolver {
    get (target: unknown): unknown;
}

export { TrackPath };
