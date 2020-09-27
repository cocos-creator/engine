/**
 * @packageDocumentation
 * @hidden
 */

import { GFXAttributeName, GFXBufferUsageBit, GFXFormat, GFXMemoryUsageBit } from '../gfx/define';

export function createIA (device, data) {
    if (!data.positions) {
        console.error('The data must have positions field');
        return null;
    }

    const verts: number[] = [];
    const vcount = data.positions.length / 3;

    for (let i = 0; i < vcount; ++i) {
        verts.push(data.positions[3 * i], data.positions[3 * i + 1], data.positions[3 * i + 2]);

        if (data.normals) {
            verts.push(data.normals[3 * i], data.normals[3 * i + 1], data.normals[3 * i + 2]);
        }
        if (data.uvs) {
            verts.push(data.uvs[2 * i], data.uvs[2 * i + 1]);
        }
        if (data.colors) {
            verts.push(data.colors[3 * i], data.uvs[3 * i + 1], data.colors[3 * i + 2]);
        }
    }

    const vfmt: Array<{ name: GFXAttributeName; format: GFXFormat; }> = [];
    vfmt.push({ name: GFXAttributeName.ATTR_POSITION, format: GFXFormat.RGB32F });
    if (data.normals) {
        vfmt.push({ name: GFXAttributeName.ATTR_NORMAL, format: GFXFormat.RGB32F });
    }
    if (data.uvs) {
        vfmt.push({ name: GFXAttributeName.ATTR_TEX_COORD, format: GFXFormat.RG32F });
    }
    if (data.colors) {
        vfmt.push({ name: GFXAttributeName.ATTR_COLOR, format: GFXFormat.RGB32F });
    }

    const vb = device.createBuffer({
        usage: GFXBufferUsageBit.VERTEX | GFXBufferUsageBit.TRANSFER_DST,
        memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
        size: verts.length * 4,
        stride: verts.length * 4 / vcount,
    });

    vb.update(new Float32Array(verts));

    const ib = device.createBuffer({
        usage: GFXBufferUsageBit.INDEX | GFXBufferUsageBit.TRANSFER_DST,
        memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
        size: data.indices.length * 2,
        stride: 2,
    });

    ib.update(new Uint16Array(data.indices));

    return device.createInputAssembler({
        attributes: vfmt,
        vertexBuffers: [vb],
        indexBuffer: ib,
    });
}
