
import * as cc from 'cc';
import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { runTest } from '../utils';

@cc._decorator.ccclass('Foo')
@cc._decorator.uniquelyReferenced
class Foo { }

const value = {
    foo: new Foo(),
};

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});
