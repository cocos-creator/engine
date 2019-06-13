import { IGFXColor } from '../gfx/define';

/**
 * @zh
 * SRGB颜色空间转换为线性空间。
 * @param gamma SRGB颜色空间下的GAMMA值。
 */
export function SRGBToLinear (gamma: IGFXColor): IGFXColor {
    const r = Math.pow(gamma.r, 2.2);
    const g = Math.pow(gamma.g, 2.2);
    const b = Math.pow(gamma.b, 2.2);
    return { r, g, b, a: 1.0 };
}

/**
 * @zh
 * 线性空间转换为SRGB颜色空间。
 * @param linear 线性空间下的颜色值。
 */
export function LinearToSRGB (linear: IGFXColor): IGFXColor {
    const r = Math.pow(linear.r, 0.454545);
    const g = Math.pow(linear.g, 0.454545);
    const b = Math.pow(linear.b, 0.454545);
    return { r, g, b, a: 1.0 };
}
