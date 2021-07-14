
import { MissingScript } from '../../../cocos/core';
import { deserialize } from '../../../cocos/core/data/deserialize';
import { js } from '../../../cocos/core/utils/js';

describe(`Missing class deserialization`, () => {
    const serialized = {
        '__type__': '__type_that_can_never_be_found__',
        foo: 2,
    };

    const mockReportMissingClass = jest.fn();

    test(`Customized reporter`, () => {
        const deserialized = deserialize(serialized, undefined, {
            reportMissingClass: mockReportMissingClass,
        });
        expect(deserialized).toBe(null);
        expect(mockReportMissingClass).toBeCalledTimes(1);
        expect(mockReportMissingClass).toBeCalledWith('__type_that_can_never_be_found__');
    });

    test(`Customized reporter by changing deserialize.reportMissingClass`, () => {
        const spy = jest.spyOn(deserialize, 'reportMissingClass');
        const deserialized = deserialize(serialized, undefined, {
            reportMissingClass: undefined,
        });
        expect(deserialized).toBe(null);
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith('__type_that_can_never_be_found__');
        spy.mockRestore();
    });

    test(`Class finder returns MissingScript`, () => {
        function classFinder(type: any) {
            const result = js._getClassById(type);
            if (result) {
                return result;
            } else {
                return MissingScript;
            }
        }

        const deserialized = deserialize(serialized, undefined, {
            classFinder,
            reportMissingClass: mockReportMissingClass,
        }) as MissingScript;
    
        expect(mockReportMissingClass).toBeCalledTimes(1);
        expect(mockReportMissingClass).toBeCalledWith('__type_that_can_never_be_found__');
        expect(deserialized).toBeInstanceOf(MissingScript);
        expect(deserialized._$erialized).toStrictEqual({
            '__type__': '__type_that_can_never_be_found__',
            foo: 2,
        });
    });
});

