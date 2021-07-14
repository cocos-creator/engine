import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { runTest } from "../utils";

const value = Object.assign(Object.create(null), {
    foo: 'a',

    bar: Object.assign(Object.create(null), {
        baz: 2,

        __baz: 3,
    }),

    __foo: 'b',
});

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
        (serialized) => {
            expect(serialized).toHaveProperty('foo', 'a');
            expect(serialized).not.toHaveProperty('__foo');
            expect(serialized).toHaveProperty('bar.baz', 2);
            expect(serialized).not.toHaveProperty('bar.__baz');
        },
    );
});
