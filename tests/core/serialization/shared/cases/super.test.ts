
import { ccclassAutoNamed, runTest } from '../utils';
import { _decorator } from 'cc';
import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from '../port';

@ccclassAutoNamed(__filename)
class CCClassBase {
    @_decorator.property
    superField = 'superField';

    @_decorator.property
    superFieldToBeOverwritten = 'superFieldToBeOverwritten.Super';
}

class TrivialClassBase {
    @_decorator.property
    superField = 'superField';

    @_decorator.property
    superFieldToBeOverwritten = 'superFieldToBeOverwritten.Super';
}

@ccclassAutoNamed(__filename)
class CCClassInheritsFromCCClass extends CCClassBase {
    @_decorator.property
    derivedField = 'derivedField';

    @_decorator.property
    superFieldToBeOverwritten = 'superFieldToBeOverwritten.Derived';
}

@ccclassAutoNamed(__filename)
class CCClassInheritsFromTrivialClass extends TrivialClassBase {
    @_decorator.property
    derivedField = 'derivedField';

    @_decorator.property
    superFieldToBeOverwritten = 'superFieldToBeOverwritten.Derived';
}

class TrivialClassInheritsFromCCClass extends CCClassBase {
    derivedField = 'derivedField';

    superFieldToBeOverwritten = 'superFieldToBeOverwritten.Derived';
}

class TrivialClassInheritsFromTrivialClass extends TrivialClassBase {
    derivedField = 'derivedField';

    superFieldToBeOverwritten = 'superFieldToBeOverwritten.Derived';
}

const value = {
    ccClassInheritsFromCCClass: new CCClassInheritsFromCCClass(),
    ccClassInheritsFromTrivialClass: new CCClassInheritsFromTrivialClass(),
    // trivialClassInheritsFromCCClass: new TrivialClassInheritsFromCCClass(),
    // trivialClassInheritsFromTrivialClass: new TrivialClassInheritsFromTrivialClass(),
};

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});
