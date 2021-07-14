
import { _decorator } from 'cc';
import { Port } from './port';
import ps from 'path';
// @ts-expect-error Virtual module
import { runTest as runTest_ } from 'serialization-test-helper/run-test';

export const runTest: RunTest = runTest_;

export function getCaseName(fileName: string) {
    const baseName = ps.basename(fileName, ps.dirname(fileName));
    if (baseName.endsWith('.test.ts')) {
        return baseName.substr(0, baseName.length - '.test.ts'.length);
    } else {
        return baseName;
    }
}

export const ccclassAutoNamed = (fileName: string): ClassDecorator => {
    const caseName = getCaseName(fileName);
    return (target) => {
        const className = target.name;
        const ccName = `${caseName}.${className}`;
        return cc._decorator.ccclass(ccName)(target);
    };
};

export type RunTest = (
    caseModulePath: string,
    port: Readonly<Port>,
    value: unknown,
    verify?: (serialized: any) => void | Promise<void>,
    env?: Record<string, any>,
) => Promise<void>;

