import { clamp } from '../../cocos/core/math/utils';

/**
 * Tool class to calculate audio current time.
 * For some platforms where audio.currentTime doesn't work well or isn't implemented.
 */
export default class AudioTimer {
    private _duration: number;
    private _startTime = 0;
    private _startOffset = 0;
    private _isPaused = true;

    constructor (duration: number) {
        this._duration = duration;
    }

    /**
     * Get the current time of audio timer.
     */
    get currentTime () {
        if (this._isPaused) {
            return this._startOffset;
        } else {
            return this._calculateCurrentTime();
        }
    }

    private _now () {
        return performance.now() / 1000;
    }

    private _calculateCurrentTime () {
        const timePassed = this._now() - this._startTime;
        const currentTime = this._startOffset + timePassed;
        if (currentTime >= this._duration) {
            // timer loop
            this._startTime = this._now();
            this._startOffset = 0;
        }
        return currentTime % this._duration;
    }

    /**
     * Start the audio timer.
     * Call this method when audio is played.
     */
    start () {
        this._isPaused = false;
        this._startTime = this._now();
    }

    /**
     * Pause the audio timer.
     * Call this method when audio is paused or interrupted.
     */
    pause () {
        this._isPaused = true;
        this._startOffset = this._calculateCurrentTime();
    }

    /**
     * Stop the audio timer.
     * Call this method when audio playing ended or audio is stopped.
     */
    stop () {
        this._isPaused = true;
        this._startOffset = 0;
    }

    /**
     * Seek the audio timer.
     * Call this method when audio is seeked.
     */
    seek (time: number) {
        this._startTime = this._now();
        this._startOffset = clamp(time, 0, this._duration);
    }
}
