import { AudioEvent, AudioState, AudioType } from '../type';
import { EventTarget } from '../../../cocos/core/event/event-target';
import { legacyCC } from '../../../cocos/core/global-exports';
import { clamp, clamp01 } from '../../../cocos/core';
import { enqueueOperation, OperationInfo, OperationQueueable } from '../operation-queue';

// NOTE: fix CI
const AudioContextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext);
export class AudioContextAgent {
    public static support = !!AudioContextClass;
    public _context: AudioContext;
    constructor () {
        this._context = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
    }

    get currentTime () {
        return this._context.currentTime;
    }

    public decodeAudioData (audioData: ArrayBuffer): Promise<AudioBuffer> {
        return new Promise((resolve) => {
            const promise = this._context.decodeAudioData(audioData, (audioBuffer) => {
                resolve(audioBuffer);
            });
            promise?.catch((e) => {});  // Safari doesn't support the promise based decodeAudioData
        });
    }

    public runContext (): Promise<void> {
        return new Promise((resolve) => {
            const context = this._context;
            if (!context.resume) {
                return resolve();
            }
            if (context.state === 'running') {
                return resolve();
            }
            context.resume().catch((e) => {});
            // promise rejection cannot be caught, need to check running state again
            if (<string>context.state !== 'running') {
                const canvas = document.getElementById('GameCanvas') as HTMLCanvasElement;
                const onGesture = () => {
                    context.resume().then(resolve).catch((e) => {});
                };
                canvas?.addEventListener('touchend', onGesture, { once: true });
                canvas?.addEventListener('mousedown', onGesture, { once: true });
            }
            return null;
        });
    }

    public createBufferSource (audioBuffer?: AudioBuffer, loop?: boolean) {
        const sourceBufferNode = this._context.createBufferSource();
        if (audioBuffer !== undefined) {
            sourceBufferNode.buffer = audioBuffer;
        }
        if (loop !== undefined) {
            sourceBufferNode.loop = loop;
        }
        return sourceBufferNode;
    }

    public createGain (volume?: number) {
        const gainNode = this._context.createGain();
        if (volume !== undefined) {
            this.setGainValue(gainNode, volume);
        }
        return gainNode;
    }

    public setGainValue (gain: GainNode, volume: number) {
        if (gain.gain.setTargetAtTime) {
            try {
                gain.gain.setTargetAtTime(volume, this._context.currentTime, 0);
            } catch (e) {
                // Some unknown browsers may crash if timeConstant is 0
                gain.gain.setTargetAtTime(volume, this._context.currentTime, 0.01);
            }
        } else {
            gain.gain.value = volume;
        }
    }

    public connectContext (audioNode: GainNode) {
        if (!this._context) {
            return;
        }
        audioNode.connect(this._context.destination);
    }
}

let audioContextAgent: AudioContextAgent | undefined;
if (AudioContextAgent.support) {
    audioContextAgent = new AudioContextAgent();
}

export class OneShotAudioWeb {
    private _duration: number;
    private _bufferSourceNode: AudioBufferSourceNode;

    private constructor (audioBuffer: AudioBuffer, volume: number) {
        this._duration = audioBuffer.duration;
        this._bufferSourceNode = audioContextAgent!.createBufferSource(audioBuffer, false);
        const gainNode = audioContextAgent!.createGain(volume);
        this._bufferSourceNode.connect(gainNode);
        audioContextAgent!.connectContext(gainNode);
    }

    public play (onPlayCb: () => void, onEndCb: () => void): void {
        // audioContextAgent does exist
        audioContextAgent!.runContext().then(() => {
            this._bufferSourceNode.start();
            onPlayCb();
            setTimeout(onEndCb, this._duration * 1000);
        }).catch((e) => {});
    }

    public stop (): void {
        this._bufferSourceNode.stop();
    }
}

export class AudioPlayerWeb implements OperationQueueable {
    private _src: string;
    private _audioBuffer: AudioBuffer;
    private _sourceNode?: AudioBufferSourceNode;
    private _gainNode: GainNode;
    private _currentTimer = 0;
    private _volume = 1;
    private _loop = false;
    private _startTime = 0;
    private _offset = 0;
    private _state: AudioState = AudioState.INIT;

    // NOTE: the implemented interface properties need to be public access
    public _eventTarget: EventTarget = new EventTarget();
    public _operationQueue: OperationInfo[] = [];

    private _onHide?: () => void;
    private _onShow?: () => void;

    constructor (audioBuffer: AudioBuffer, url: string) {
        this._audioBuffer = audioBuffer;
        this._gainNode = audioContextAgent!.createGain();
        audioContextAgent!.connectContext(this._gainNode);
        this._src = url;
        // event
        // TODO: should not call engine API in pal
        this._onHide = () => {
            if (this._state === AudioState.PLAYING) {
                this.pause().then(() => {
                    this._state = AudioState.INTERRUPTED;
                    this._eventTarget.emit(AudioEvent.INTERRUPTION_BEGIN);
                }).catch((e) => {});
            }
        };
        legacyCC.game.on(legacyCC.Game.EVENT_HIDE, this._onHide);
        this._onShow = () => {
            if (this._state === AudioState.INTERRUPTED) {
                this.play().then(() => {
                    this._eventTarget.emit(AudioEvent.INTERRUPTION_END);
                }).catch((e) => {});
            }
        };
        legacyCC.game.on(legacyCC.Game.EVENT_SHOW, this._onShow);
    }
    destroy () {
        if (this._audioBuffer) {
            // @ts-expect-error need to release AudioBuffer instance
            this._audioBuffer = undefined;
        }
        if (this._onShow) {
            legacyCC.game.off(legacyCC.Game.EVENT_SHOW, this._onShow);
            this._onShow = undefined;
        }
        if (this._onHide) {
            legacyCC.game.off(legacyCC.Game.EVENT_HIDE, this._onHide);
            this._onHide = undefined;
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
            const xhr = new XMLHttpRequest();
            const errInfo = `load audio failed: ${url}, status: `;
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) {
                    audioContextAgent!.decodeAudioData(xhr.response).then((buffer) => {
                        resolve(buffer);
                    }).catch((e) => {});
                } else {
                    reject(new Error(`${errInfo}${xhr.status}(no response)`));
                }
            };
            xhr.onerror = () => { reject(new Error(`${errInfo}${xhr.status}(error)`)); };
            xhr.ontimeout = () => { reject(new Error(`${errInfo}${xhr.status}(time out)`)); };
            xhr.onabort = () => { reject(new Error(`${errInfo}${xhr.status}(abort)`)); };

            xhr.send(null);
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
        this._sourceNode && (this._sourceNode.loop = val);
    }
    get volume (): number {
        return this._volume;
    }
    set volume (val: number) {
        val = clamp01(val);
        this._volume = val;
        audioContextAgent!.setGainValue(this._gainNode, val);
    }
    get duration (): number {
        return this._audioBuffer.duration;
    }
    get currentTime (): number {
        if (this._state !== AudioState.PLAYING) { return this._offset; }
        return audioContextAgent!.currentTime - this._startTime + this._offset;
    }

    @enqueueOperation
    seek (time: number): Promise<void> {
        return new Promise((resolve) => {
            this._offset = clamp(time, 0, this._audioBuffer.duration);
            if (this._state === AudioState.PLAYING) {
                this.stop().then(() => {
                    this.play().catch((e) => {});
                }).catch((e) => {});
                this.play().catch((e) => {});
            }
            resolve();
        });
    }

    @enqueueOperation
    play (): Promise<void> {
        return new Promise((resolve) => {
            audioContextAgent!.runContext().then(() => {
                // one AudioBufferSourceNode can't start twice
                this._sourceNode?.stop();
                this._sourceNode = audioContextAgent!.createBufferSource(this._audioBuffer, this.loop);
                this._sourceNode.connect(this._gainNode);
                this._sourceNode.start(0, this._offset);

                this._state = AudioState.PLAYING;
                this._startTime = audioContextAgent!.currentTime;

                /* still not supported by all platforms *
                this._sourceNode.onended = this._onEnded;
                /* doing it manually for now */
                const checkEnded = () => {
                    if (this.loop) {
                        this._currentTimer = window.setInterval(checkEnded, this._audioBuffer.duration * 1000);
                    } else {  // do ended
                        this._eventTarget.emit(AudioEvent.ENDED);
                        clearInterval(this._currentTimer);
                        this._offset = 0;
                        this._startTime = audioContextAgent!.currentTime;
                        this._state = AudioState.INIT;
                    }
                };
                clearInterval(this._currentTimer);
                this._currentTimer = window.setInterval(checkEnded, (this._audioBuffer.duration - this._offset) * 1000);
                resolve();
            }).catch((e) => {});
        });
    }

    @enqueueOperation
    pause (): Promise<void> {
        if (this._state !== AudioState.PLAYING || !this._sourceNode) {
            return Promise.resolve();
        }
        this._offset += audioContextAgent!.currentTime - this._startTime;
        this._state = AudioState.PAUSED;
        clearInterval(this._currentTimer);
        this._sourceNode.stop();
        return Promise.resolve();
    }

    @enqueueOperation
    stop (): Promise<void> {
        if (!this._sourceNode) {
            return Promise.resolve();
        }
        this._offset = 0;
        this._state = AudioState.STOPPED;
        clearInterval(this._currentTimer);
        this._sourceNode.stop();
        return Promise.resolve();
    }

    onInterruptionBegin (cb: () => void) { this._eventTarget.on(AudioEvent.INTERRUPTION_BEGIN, cb); }
    offInterruptionBegin (cb?: () => void) { this._eventTarget.off(AudioEvent.INTERRUPTION_BEGIN, cb); }
    onInterruptionEnd (cb: () => void) { this._eventTarget.on(AudioEvent.INTERRUPTION_END, cb); }
    offInterruptionEnd (cb?: () => void) { this._eventTarget.off(AudioEvent.INTERRUPTION_END, cb); }
    onEnded (cb: () => void) { this._eventTarget.on(AudioEvent.ENDED, cb); }
    offEnded (cb?: () => void) { this._eventTarget.off(AudioEvent.ENDED, cb); }
}
