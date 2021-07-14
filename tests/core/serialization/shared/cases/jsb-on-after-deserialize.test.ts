import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { ccclassAutoNamed, runTest } from '../utils';

@ccclassAutoNamed(__dirname)
class Foo{
    numberOfCalls = 0;

    onAfterDeserialize_JSB() {
        ++this.numberOfCalls;
    }
}

const value = new Foo();

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
        (serialized: typeof value) => {
            expect(serialized.numberOfCalls).toBe(1);
        },
        {
            JSB: true,
        },
    );
});
