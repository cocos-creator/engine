import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { runTest } from "../utils";

const value = [
    // Floats
    0.0,
    1.0,
    3.1415926,
    -0.618,
    Number.MIN_VALUE,
    Number.MAX_VALUE,
    // Infinities and NaN can bot be serialized as JSON
    // -Infinity,
    // Infinity,
    // NaN,

    // Booleans
    true,
    false,

    // Integers
    0,
    1,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,

    // Strings
    'blah blah',
];

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});
