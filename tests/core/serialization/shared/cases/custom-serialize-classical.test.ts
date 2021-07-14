import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { ccclassAutoNamed, runTest } from "../utils";

@ccclassAutoNamed(__filename)
class Foo {
    constructor (public a: number, public b: number) {

    }

    _deserialize (serialized: ReturnType<Foo['_serialize']>) {
        const { 1: a, 2: b } = /(\d+)\+(\d+)/.exec(serialized.str);
        this.a = parseInt(a);
        this.b = parseInt(b);
    }

    _serialize() {
        return {
            str: `${this.a}+${this.b}`,
        };
    }
}

@ccclassAutoNamed(__filename)
class Bar {
    constructor (public a: number) {

    }

    _deserialize (serialized: ReturnType<Bar['_serialize']>) {
        this.a = serialized - 1;
    }

    _serialize() {
        return this.a + 1;
    }
}

const value = {
    returnObject: new Foo(6, 8),
    returnNonObject: new Bar(6),
};

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});