
import ps from 'path';
import { getCaseName } from './utils';

export interface Port {
    name: string;
    serializeOptions: {
        compiled?: boolean;
        useCCON?: boolean;
    };
    deserializeOptions: {
    };
}

export const PORT_DYNAMIC: Readonly<Port> = {
    name: 'Dynamic',
    serializeOptions: {},
    deserializeOptions: {},
};

export const PORT_COMPILED: Readonly<Port> = {
    name: 'Compiled',
    serializeOptions: {
        compiled: true,
    },
    deserializeOptions: {},
};

export const PORT_CCOB: Readonly<Port> = {
    name: 'CCON',
    serializeOptions: {
        useCCON: true,
    },
    deserializeOptions: {
    },
};

export const PORTS_BOTH_DYNAMIC_COMPILED: Readonly<Port[]> = [
    PORT_DYNAMIC,
    // PORT_COMPILED,
];

export function calculatePortSnapshotPath (caseModulePath: string, portName: string) {
    const caseName = getCaseName(caseModulePath);
    return ps.join(__dirname, '__snapshots__', `case-${caseName}_port-${portName}.json`);
}

export function testEachPort (ports: ReadonlyArray<Port>, fn: (port: Port) => Promise<void>) {
    const table = ports.map((port) => {
        return [port.name, port] as [string, Readonly<Port>];
    });
    test.each(table)(`%s`, async (_, port) => {
        await fn(port);
    });
}
