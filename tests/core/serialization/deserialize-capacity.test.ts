
import { ccclass } from '../../../cocos/core/data/decorators';
import { property } from '../../../cocos/core/data/decorators/property';
import { deserialize } from '../../../cocos/core/data/deserialize';

@ccclass('Foo')
class Foo { @property foo!: Foo | null; }

const EXPECTED_CAPACITY = 900;

test(`Deserialization capacity`, () => {
    const fooSerialized = createVeryDeepFoo(EXPECTED_CAPACITY);
    expect(() => deserialize(fooSerialized, undefined, undefined)).not.toThrow();
});

function createVeryDeepFoo (depth: number) {
    const serializedDocument: Record<string, unknown>[] = [];
    for (let i = 0; i < depth; ++i) {
        serializedDocument.push({
            __type__: 'Foo',
            foo: i === depth - 1 ? null : { __id__: i + 1 },
        });
    }
    return serializedDocument;
}
