import { ccclass, property } from '../../../platform/CCClassDecorator';
import { lerp, pseudoRandom, vec3 } from '../../../vmath';
import { Space } from '../enum';
import CurveRange from './curve-range';

// tslint:disable: max-line-length
const LIMIT_VELOCITY_RAND_OFFSET = 23541;

const _temp_v3 = cc.v3();

function dampenBeyondLimit (vel, limit, dampen) {
    const sgn = Math.sign(vel);
    let abs = Math.abs(vel);
    if (abs > limit) {
        abs = lerp(abs, limit, dampen);
    }
    return abs * sgn;
}

@ccclass('cc.LimitVelocityOvertimeModule')
export default class LimitVelocityOvertimeModule {

    /**
     * @zh 是否启用。
     */
    @property
    enable = false;

    /**
     * @zh 计算速度下限时采用的坐标系 [[Space]]。
     */
    @property({
        type: Space,
    })
    space = Space.Local;

    /**
     * @zh 是否三个轴分开限制。
     */
    @property
    separateAxes = false;

    /**
     * @zh 速度下限。
     */
    @property({
        type: CurveRange,
        range: [-1, 1],
    })
    limit = new CurveRange();

    /**
     * @zh X 轴方向上的速度下限。
     */
    @property({
        type: CurveRange,
        range: [-1, 1],
    })
    limitX = new CurveRange();

    /**
     * @zh Y 轴方向上的速度下限。
     */
    @property({
        type: CurveRange,
        range: [-1, 1],
    })
    limitY = new CurveRange();

    /**
     * @zh Z 轴方向上的速度下限。
     */
    @property({
        type: CurveRange,
        range: [-1, 1],
    })
    limitZ = new CurveRange();

    /**
     * @zh 当前速度与速度下限的插值。
     */
    @property
    dampen = 3;

    // TODO:functions related to drag are temporarily not supported
    drag = null;

    multiplyDragByParticleSize = false;

    multiplyDragByParticleVelocity = false;

    constructor () {
    }

    animate (p) {
        const normalizedTime = 1 - p.remainingLifetime / p.startLifetime;
        const dampedVel = _temp_v3;
        if (this.separateAxes) {
            vec3.set(dampedVel,
                dampenBeyondLimit(p.ultimateVelocity.x, this.limitX.evaluate(normalizedTime, pseudoRandom(p.randomSeed + LIMIT_VELOCITY_RAND_OFFSET)), this.dampen),
                dampenBeyondLimit(p.ultimateVelocity.y, this.limitY.evaluate(normalizedTime, pseudoRandom(p.randomSeed + LIMIT_VELOCITY_RAND_OFFSET)), this.dampen),
                dampenBeyondLimit(p.ultimateVelocity.z, this.limitZ.evaluate(normalizedTime, pseudoRandom(p.randomSeed + LIMIT_VELOCITY_RAND_OFFSET)), this.dampen));
        }
        else {
            vec3.normalize(dampedVel, p.ultimateVelocity);
            vec3.scale(dampedVel, dampedVel, dampenBeyondLimit(p.ultimateVelocity.length(), this.limit.evaluate(normalizedTime, pseudoRandom(p.randomSeed + LIMIT_VELOCITY_RAND_OFFSET)), this.dampen));
        }
        vec3.copy(p.ultimateVelocity, dampedVel);
    }

}

