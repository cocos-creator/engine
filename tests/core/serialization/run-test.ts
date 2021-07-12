
import fs from 'fs-extra';
import { CCON } from '../../../cocos/core/data/ccon';
import { deserialize } from '../../../cocos/core/data/deserialize';
import { calculatePortSnapshotPath } from './shared/port';
import type { RunTest } from './shared/utils';

export const runTest: RunTest = async (caseModulePath, port, value, verify) => {
    const snapshotPath = calculatePortSnapshotPath(caseModulePath, port.name);
    if (!await fs.pathExists(snapshotPath)) {
        throw new Error(`Serialization snapshot of case ${caseModulePath} doesn't exist`);
    }

    const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));

    let serialized: unknown;
    if (!port.serializeOptions.ccon) {
        serialized = snapshot;
    } else {
        const { document, chunks } = snapshot;
        serialized = new CCON(document, (chunks as number[][]).map((bytes) => Uint8Array.from(bytes)));
    }

    const deserialized = deserialize(serialized, undefined, port.deserializeOptions);
    if (verify) {
        verify(deserialized);
    } else {
        expect(deserialized).toStrictEqual(value);
    }
};
