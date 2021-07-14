/**
 * The method used for interpolation between values of a keyframe and its next keyframe.
 */
export enum RealInterpMode {
    /**
     * Perform linear interpolation.
     */
    LINEAR,

    /**
     * Always use the value from this keyframe.
     */
    CONSTANT,

    /**
     * Perform cubic(hermite) interpolation.
     */
    CUBIC,
}

/**
 * Specifies how to extrapolate the value
 * if input time is underflow(less than the the first frame time) or
 * overflow(greater than the last frame time) when evaluating an animation curve.
 */
export enum ExtrapMode {
    /**
     * Compute the result
     * according to the first two frame's linear trend in the case of underflow and
     * according to the last two frame's linear trend in the case of overflow.
     * If there are less than two frames, fallback to `CLAMP`.
     */
    LINEAR,

    /**
     * Use first frame's value in the case of underflow,
     * use last frame's value in the case of overflow.
     */
    CLAMP,

    /**
     * Before evaluation, repeatedly mapping the input time into the allowed range.
     */
    REPEAT,

    /**
     * Before evaluation, mapping the input time into the allowed range like ping pong.
     */
    PING_PONG,
}

export enum TangentWeightMode {
    NONE = 0,

    START = 1,

    END = 2,

    BOTH = 1 | 2,
}
