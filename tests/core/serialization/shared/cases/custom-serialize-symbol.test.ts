import {
    _decorator,
    serializeTag,
    deserializeTag,
    CustomSerializable,
    SerializationOutput,
    SerializationInput,
    SerializationContext,
} from 'cc';
import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { ccclassAutoNamed, runTest } from '../utils';

@ccclassAutoNamed(__filename)
class SerializationOutputProperty implements CustomSerializable {
    x = 0.1;

    y = 0.2;

    z = 0.3;

    [serializeTag](serializationOutput: SerializationOutput, _context: SerializationContext) {
        serializationOutput.writeProperty('values', [this.x, this.y, this.z]);
    }

    [deserializeTag](serializationInput: SerializationInput) {
        const values = serializationInput.readProperty('values') as number[];
        this.x = values[0];
        this.y = values[1];
        this.z = values[2];
    }
}

@ccclassAutoNamed(__filename)
class Base {
    @_decorator.property
    baseProperty = '';
}

@ccclassAutoNamed(__filename)
class ContextSerializeSuper extends Base implements CustomSerializable {
    bar = 'SuperProperty';

    [serializeTag](serializationOutput: SerializationOutput, context: SerializationContext) {
        serializationOutput.writeSuper();
        serializationOutput.writeProperty('bar', this.bar);
    }
}

@ccclassAutoNamed(__filename)
class ContextSerializeSuper1 extends Base implements CustomSerializable {
    bar = 'SuperProperty';

    [serializeTag](serializationOutput: SerializationOutput, context: SerializationContext) {
        serializationOutput.writeSuper();
        serializationOutput.writeProperty('baseProperty', 'CustomOverrideSuper');
    }
}

@ccclassAutoNamed(__filename)
class ContextSerializeSuper2 extends Base implements CustomSerializable {
    bar = 'SuperProperty';

    [serializeTag](serializationOutput: SerializationOutput, context: SerializationContext) {
        serializationOutput.writeProperty('baseProperty', 'CustomOverrideSuper');
        serializationOutput.writeSuper();
    }
}

@ccclassAutoNamed(__filename)
class ContextSerializeThis {
    @_decorator.property
    foo = 1;

    [serializeTag](serializationOutput: SerializationOutput, context: SerializationContext) {
        serializationOutput.writeThis();
    }
}

@ccclassAutoNamed(__filename)
class ContextSerializeThis1 {
    @_decorator.property
    foo = 'Original';

    [serializeTag](serializationOutput: SerializationOutput, context: SerializationContext) {
        serializationOutput.writeProperty('foo', 'CustomOverride');
        serializationOutput.writeThis();
    }
}

@ccclassAutoNamed(__filename)
class ContextSerializeThis2 {
    @_decorator.property
    foo = 'Original';

    [serializeTag](serializationOutput: SerializationOutput, context: SerializationContext) {
        serializationOutput.writeThis();
        serializationOutput.writeProperty('foo', 'CustomOverride');
    }
}

export const value = {
    serializationOutputProperty: new SerializationOutputProperty(),
    contextSerializeSuper: new ContextSerializeSuper(),
    contextSerializeSuper1: new ContextSerializeSuper1(),
    contextSerializeSuper2: new ContextSerializeSuper2(),
    contextSerializeThis: new ContextSerializeThis(),
    contextSerializeThis1: new ContextSerializeThis1(),
    contextSerializeThis2: new ContextSerializeThis2(),
};

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
        (serialized: typeof value) => {
            expect(serialized.serializationOutputProperty).toStrictEqual(value.serializationOutputProperty);
            expect(serialized.contextSerializeSuper).toStrictEqual(value.contextSerializeSuper);
            expect(serialized.contextSerializeSuper1.baseProperty).toStrictEqual('CustomOverrideSuper');
            expect(serialized.contextSerializeSuper2).toStrictEqual(value.contextSerializeSuper2);
            expect(serialized.contextSerializeThis).toStrictEqual(value.contextSerializeThis);
            expect(serialized.contextSerializeThis1).toStrictEqual(value.contextSerializeThis1);
            expect(serialized.contextSerializeThis2.foo).toStrictEqual('CustomOverride');
        }
    );
});
