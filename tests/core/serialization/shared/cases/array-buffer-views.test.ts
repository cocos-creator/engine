import { PORT_DYNAMIC, testEachPort } from "../port";
import { runTest } from "../utils";

const value = [
    Int8Array.from([-128, 0, 1, 127]),
    Uint8Array.from([0, 1, 255]),

    Uint8ClampedArray.from([0, 1, 255]),

    Int16Array.from([-32768, 0, 1, 32767]),
    Uint16Array.from([0, 1, 65535]),

    Int32Array.from([-2147483648, 0, 1, 2147483647]),
    Uint32Array.from([0, 1, 4294967295]),

    Float32Array.from([
        0.0,
        1.0,
        3.1415926,
        -0.618,
        // Infinities and NaN can bot be serialized as JSON
        // -Infinity,
        // Infinity,
        // NaN,
    ]),
    Float64Array.from([
        0.0,
        1.0,
        3.1415926,
        -0.618,
        // Infinities and NaN can bot be serialized as JSON
        // -Infinity,
        // Infinity,
        // NaN,
    ]),
];

testEachPort([PORT_DYNAMIC], async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});
