/**
 * @packageDocumentation
 * @module 3d/primitive
 */

import { applyDefaultGeometryOptions, IGeometry, IGeometryOptions } from './define';

/**
 * @en
 * Generate a quad with width and height both to 1, centered at origin.
 * @zh
 * 生成一个四边形，宽高都为1，中心在原点。
 * @param options 参数选项。
 */
export default function quad (options?: IGeometryOptions): IGeometry {
    const normalizedOptions = applyDefaultGeometryOptions(options);
    const result: IGeometry = {
        positions: [
            -0.5, -0.5, 0, // bottom-left
            -0.5,  0.5, 0, // top-left
             0.5,  0.5, 0, // top-right
             0.5, -0.5, 0, // bottom-right
          ],
        indices: [
            0, 3, 1,
            3, 2, 1,
        ],
        minPos: {
            x: -0.5, y: -0.5, z: 0,
        },
        maxPos: {
            x: 0.5, y: 0.5, z: 0,
        },
        boundingRadius: Math.sqrt(0.5 * 0.5 + 0.5 * 0.5),
    };
    if (normalizedOptions.includeNormal !== false) {
        result.normals = [
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
          ];
    }
    if (normalizedOptions.includeUV !== false) {
        result.uvs = [
            0, 0,
            0, 1,
            1, 1,
            1, 0,
        ];
    }
    return result;
}
