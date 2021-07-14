import { ccclass, serializable } from '../data/decorators';
import { RealCurve } from './curve';
import { deserializeSymbol, serializeSymbol } from '../data/serialization-symbols';

export enum RoundType {
    /**
     * Returns the integer part of the result by removing any fractional digits.
     */
    TRUNC,

    /**
     * Returns the largest integer less than or equal to the result.
     */
    FLOOR,

    /**
     * Rounds the result up to the next largest integer.
     */
    CEIL,

    /**
     * Returns the result rounded to the nearest integer.
     */
    ROUND,
}

@ccclass('cc.IntegerCurve')
export class IntegerCurve extends RealCurve {
    @serializable
    public truncType: RoundType = RoundType.TRUNC;

    public evaluate (time: number) {
        const value = super.evaluate(time);
        switch (this.truncType) {
        default:
        case RoundType.TRUNC: return Math.trunc(value);
        case RoundType.FLOOR: return Math.floor(value);
        case RoundType.CEIL: return Math.ceil(value);
        case RoundType.ROUND: return Math.round(value);
        }
    }

    public [serializeSymbol] () {
        const baseSerialized = super[serializeSymbol]();
        const buffer = new Uint8Array(baseSerialized.byteLength + 1);
        buffer[0] = this.truncType;
        buffer.set(baseSerialized, 1);
        return buffer;
    }

    public [deserializeSymbol] (serialized: ReturnType<RealCurve[typeof serializeSymbol]>) {
        this.truncType = serialized[0];
        super[deserializeSymbol](new Uint8Array(serialized, 1));
    }
}
