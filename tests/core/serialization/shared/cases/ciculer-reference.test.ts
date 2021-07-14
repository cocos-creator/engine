
import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { ccclassAutoNamed, runTest } from "../utils";
import * as cc from 'cc';
@ccclassAutoNamed(__filename)
class CCClassSelfCircularReference { @cc._decorator.property me: CCClassSelfCircularReference = this; }

@ccclassAutoNamed(__filename)
class CCClassIndirectCircularReferenceFoo { @cc._decorator.property bar!: CCClassIndirectCircularReferenceBar; }

@ccclassAutoNamed(__filename)
class CCClassIndirectCircularReferenceBar { @cc._decorator.property foo!: CCClassIndirectCircularReferenceFoo; }

const ccClassIndirectCircularReferenceFoo = new CCClassIndirectCircularReferenceFoo();
const ccClassIndirectCircularReferenceBar = new CCClassIndirectCircularReferenceBar();
ccClassIndirectCircularReferenceFoo.bar = ccClassIndirectCircularReferenceBar;
ccClassIndirectCircularReferenceBar.foo = ccClassIndirectCircularReferenceFoo;

// Not supported by now
// class PlainObjectSelfCircularReference { me: PlainObjectSelfCircularReference = this; }

// class PlainObjectIndirectCircularReferenceFoo { bar!: PlainObjectIndirectCircularReferenceBar; }

// class PlainObjectIndirectCircularReferenceBar { foo!: PlainObjectIndirectCircularReferenceFoo; }

// const plainObjectIndirectCircularReferenceFoo = new PlainObjectIndirectCircularReferenceFoo();
// const plainObjectIndirectCircularReferenceBar = new PlainObjectIndirectCircularReferenceBar();
// plainObjectIndirectCircularReferenceFoo.bar = plainObjectIndirectCircularReferenceBar;
// plainObjectIndirectCircularReferenceBar.foo = plainObjectIndirectCircularReferenceFoo;

const value = {
    selfCircularReference: new CCClassSelfCircularReference(),
    ccClassIndirectCircularReference: ccClassIndirectCircularReferenceFoo,
    // plainObjectSelfCircularReference: new PlainObjectSelfCircularReference(),
    // plainObjectIndirectCircularReference: plainObjectIndirectCircularReferenceFoo,
};

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});
