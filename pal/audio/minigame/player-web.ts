import { minigame } from 'pal/minigame';
import { systemInfo } from 'pal/system-info';
import { clamp, clamp01, EventTarget } from '../../../cocos/core';
import AudioTimer from '../audio-timer';
import { enqueueOperation, OperationInfo, OperationQueueable } from '../operation-queue';
import { AudioEvent, AudioState, AudioType } from '../type';

declare const fsUtils: any;
const audioContext = minigame.tt?.getAudioContext?.();

export class OneShotAudioWeb {
    private _bufferSourceNode: AudioBufferSourceNode;
    private _onPlayCb?: () => void;
    get onPlay () {
        return this._onPlayCb;
    }
    set onPlay (cb) {
        this._onPlayCb = cb;
    }

    private _onEndCb?: () => void;
    get onEnd () {
        return this._onEndCb;
    }
    set onEnd (cb) {
        this._onEndCb = cb;
    }

    private constructor (audioBuffer: AudioBuffer, volume: number) {
        this._bufferSourceNode = audioContext!.createBufferSource();
        this._bufferSourceNode.buffer = audioBuffer;
        this._bufferSourceNode.loop = false;

        const gainNode = audioContext!.createGain();
        gainNode.gain.value = volume;

        this._bufferSourceNode.connect(gainNode);
        gainNode.connect(audioContext!.destination);
    }

    public play (): void {
        this._bufferSourceNode.start();
        this.onPlay?.();
        this._bufferSourceNode.onended = () => {
            this._onEndCb?.();
        };
    }

    public stop (): void {
        this._bufferSourceNode.onended = null;  // stop will call ended callback
        this._bufferSourceNode.stop();
    }
}

export class AudioPlayerWeb implements OperationQueueable {
    private _src: string;
    private _audioBuffer: AudioBuffer;
    private _sourceNode?: AudioBufferSourceNode;
    private _gainNode: GainNode;
    private _volume = 1;
    private _loop = false;
    private _state: AudioState = AudioState.INIT;
    private _audioTimer: AudioTimer;

    private static _audioBufferCacheMap: Record<string, AudioBuffer> = {};

    // NOTE: the implemented interface properties need to be public access
    public _eventTarget: EventTarget = new EventTarget();
    public _operationQueue: OperationInfo[] = [];

    constructor (audioBuffer: AudioBuffer, url: string) {
        this._audioBuffer = audioBuffer;
        this._audioTimer = new AudioTimer(audioBuffer.duration);
        this._gainNode = audioContext!.createGain();
        this._gainNode.connect(audioContext!.destination);

        this._src = url;
        // event
        systemInfo.on('hide', this._onHide, this);
        systemInfo.on('show', this._onShow, this);
    }
    destroy () {
        if (this._audioBuffer) {
            // @ts-expect-error need to release AudioBuffer instance
            this._audioBuffer = undefined;
        }
        systemInfo.off('hide', this._onHide, this);
        systemInfo.off('show', this._onShow, this);
    }
    private _onHide () {
        if (this._state === AudioState.PLAYING) {
            this.pause().then(() => {
                this._state = AudioState.INTERRUPTED;
                this._eventTarget.emit(AudioEvent.INTERRUPTION_BEGIN);
            }).catch((e) => {});
        }
    }
    private _onShow () {
        if (this._state === AudioState.INTERRUPTED) {
            this.play().then(() => {
                this._eventTarget.emit(AudioEvent.INTERRUPTION_END);
            }).catch((e) => {});
        }
    }
    static load (url: string): Promise<AudioPlayerWeb> {
        return new Promise((resolve) => {
            AudioPlayerWeb.loadNative(url).then((audioBuffer) => {
                resolve(new AudioPlayerWeb(audioBuffer, url));
            }).catch((e) => {});
        });
    }
    static loadNative (url: string): Promise<AudioBuffer> {
        return new Promise((resolve, reject) => {
            // NOTE: maybe url is a temp path, which is not reliable.
            // need to cache the decoded audio buffer.
            const cachedAudioBuffer = AudioPlayerWeb._audioBufferCacheMap[url];
            if (cachedAudioBuffer) {
                resolve(cachedAudioBuffer);
                return;
            }
            // TODO: use pal/fs
            fsUtils.readArrayBuffer(url, (err: Error, arrayBuffer: ArrayBuffer) => {
                if (err) {
                    reject(err);
                    return;
                }
                audioContext!.decodeAudioData(arrayBuffer).then((buffer) => {
                    AudioPlayerWeb._audioBufferCacheMap[url] = buffer;
                    resolve(buffer);
                }).catch((e) => {});
            });
        });
    }

    static loadOneShotAudio (url: string, volume: number): Promise<OneShotAudioWeb> {
        return new Promise((resolve, reject) => {
            AudioPlayerWeb.loadNative(url).then((audioBuffer) => {
                // @ts-expect-error AudioPlayer should be a friend class in OneShotAudio
                const oneShotAudio = new OneShotAudioWeb(audioBuffer, volume);
                resolve(oneShotAudio);
            }).catch(reject);
        });
    }

    get src (): string {
        return this._src;
    }
    get type (): AudioType {
        return AudioType.WEB_AUDIO;
    }
    get state (): AudioState {
        return this._state;
    }
    get loop (): boolean {
        return this._loop;
    }
    set loop (val: boolean) {
        this._loop = val;
        if (this._sourceNode) {
            this._sourceNode.loop = val;
        }
    }
    get volume (): number {
        return this._volume;
    }
    set volume (val: number) {
        val = clamp01(val);
        this._volume = val;
        this._gainNode.gain.value = val;
    }
    get duration (): number {
        return this._audioBuffer.duration;
    }
    get currentTime (): number {
        return this._audioTimer.currentTime;
    }

    @enqueueOperation
    seek (time: number): Promise<void> {
        return new Promise((resolve) => {
            this._audioTimer.seek(time);
            if (this._state === AudioState.PLAYING) {
                // one AudioBufferSourceNode can't start twice
                // need to create a new one to start from the offset
                this._doPlay().then(resolve).catch((e) => {});
            } else {
                resolve();
            }
        });
    }

    @enqueueOperation
    play (): Promise<void> {
        return this._doPlay();
    }

    // The decorated play() method can't be call in seek()
    // so we define this method to ensure that the audio seeking works.
    private _doPlay (): Promise<void> {
        return new Promise((resolve) => {
            // one AudioBufferSourceNode can't start twice
            this._stopSourceNode();
            this._sourceNode = audioContext!.createBufferSource();
            this._sourceNode.buffer = this._audioBuffer;
            this._sourceNode.loop = this._loop;
            this._sourceNode.connect(this._gainNode);

            this._sourceNode.start(0, this._audioTimer.currentTime);
            this._state = AudioState.PLAYING;
            this._audioTimer.start();

            this._sourceNode.onended = () => {
                this._audioTimer.stop();
                this._eventTarget.emit(AudioEvent.ENDED);
                this._state = AudioState.INIT;
            };
            resolve();
        });
    }

    private _stopSourceNode () {
        try {
            if (this._sourceNode) {
                this._sourceNode.onended = null;  // stop will call ended callback
                this._sourceNode.stop();
            }
        } catch (e) {
            // sourceNode can't be stopped twice, especially on Safari.
        }
    }

    @enqueueOperation
    pause (): Promise<void> {
        if (this._state !== AudioState.PLAYING || !this._sourceNode) {
            return Promise.resolve();
        }
        this._audioTimer.pause();
        this._state = AudioState.PAUSED;
        this._stopSourceNode();
        return Promise.resolve();
    }

    @enqueueOperation
    stop (): Promise<void> {
        if (!this._sourceNode) {
            return Promise.resolve();
        }
        this._audioTimer.stop();
        this._state = AudioState.STOPPED;
        this._stopSourceNode();
        return Promise.resolve();
    }

    onInterruptionBegin (cb: () => void) { this._eventTarget.on(AudioEvent.INTERRUPTION_BEGIN, cb); }
    offInterruptionBegin (cb?: () => void) { this._eventTarget.off(AudioEvent.INTERRUPTION_BEGIN, cb); }
    onInterruptionEnd (cb: () => void) { this._eventTarget.on(AudioEvent.INTERRUPTION_END, cb); }
    offInterruptionEnd (cb?: () => void) { this._eventTarget.off(AudioEvent.INTERRUPTION_END, cb); }
    onEnded (cb: () => void) { this._eventTarget.on(AudioEvent.ENDED, cb); }
    offEnded (cb?: () => void) { this._eventTarget.off(AudioEvent.ENDED, cb); }
}
