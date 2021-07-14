
import { removeLinearKeys, removeTrivialKeys } from '../../cocos/core/animation/compression';

describe('Curve compression', () => {
    describe('Remove linear keys', () => {
        test('Curves with only zero/one/two keys are not effected', () => {
            expect(runRemoveLinearKeys([], [])).toBeRemovedWith([]);
            expect(runRemoveLinearKeys([0.3], [0.4])).toBeRemovedWith([]);
            expect(runRemoveLinearKeys([0.3, 0.4], [4.0, 5.0])).toBeRemovedWith([]);
        });

        test('Linear', () => {
            expect(runRemoveLinearKeys([0.3, 0.4, 0.5], [3.0, 4.0, 5.0])).toBeRemovedWith([1]);
            expect(runRemoveLinearKeys([0.3, 0.4, 0.5, 0.7], [3.0, 4.0, 5.0, 10.0])).toBeRemovedWith([1]);
        });

        test('Successive linear', () => {
            expect(runRemoveLinearKeys([0.3, 0.4, 0.5, 0.6], [3.0, 4.0, 5.0, 6.0])).toBeRemovedWith([1, 2]);
            expect(runRemoveLinearKeys([0.3, 0.4, 0.5, 0.6, 0.7], [3.0, 4.0, 5.0, 6.0, 10.0])).toBeRemovedWith([1, 2]);
        });

        test('Max error', () => {
            expect(runRemoveLinearKeys([0.3, 0.4, 0.5], [3.0, 4.0002, 5.0], 1e-3)).toBeRemovedWith([1]);
            expect(runRemoveLinearKeys([0.3, 0.4, 0.5], [3.0, 4.002, 5.0], 1e-3)).toBeRemovedWith([]);
        });
    });

    describe('Remove trivial keys', () => {
        test('Zero/One length', () => {
            expect(runRemoveTrivialKeys([], [])).toBeRemovedWith([]);
            expect(runRemoveTrivialKeys([0.3], [0.4])).toBeRemovedWith([]);
        });
    });
});

type CompressionResult = ReturnType<typeof runCompression>;

function runCompression<TArgs extends any[]>(
    keys: number[],
    values: number[],
    fn: (keys: number[], values: number[], ...args: TArgs) => { keys: number[], values: number[] },
    ...args: TArgs
) {
    const { keys: newKeys, values: newValues } = fn(keys, values, ...args);
    return {
        keys, values,
        newKeys, newValues,
    };
}

function runRemoveLinearKeys (keys: number[], values: number[], maxError?: number) {
    return runCompression(
        keys,
        values,
        removeLinearKeys,
        maxError,
    );
}

function runRemoveTrivialKeys (keys: number[], values: number[], maxError?: number) {
    return runCompression(
        keys,
        values,
        removeTrivialKeys,
        maxError,
    );
}

expect.extend({
    toBeRemovedWith(received: CompressionResult, removals: number[]): jest.CustomMatcherResult {
        const { keys, values, newKeys, newValues } = received;
        const actualRemovals = keys.map((_, index) => index).filter((index) => !newKeys.includes(keys[index]));
        return {
            pass: actualRemovals.length === removals.length &&
                actualRemovals.every((actualRemoval, index) => actualRemoval === removals[index]),
            message: () =>
                `Expected removals: ${removals.join(', ')}\n` +
                `Actual removals: ${actualRemovals.join(', ')}`,
        };
    },
});

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeRemovedWith(expected: number[]): CustomMatcherResult
        }
    }
}
