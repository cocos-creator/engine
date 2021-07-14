import { Node, Prefab } from 'cc';
import { PORTS_BOTH_DYNAMIC_COMPILED, testEachPort } from "../port";
import { runTest } from '../utils';

const prefabs: Prefab[] = [];

function setPrefabNode(node: Node, prefabInfo: Prefab._utils.PrefabInfo) {
    (node as unknown as { _prefab?: Prefab._utils.PrefabInfo })._prefab = prefabInfo;
    return node;
}

const value = prefabs;

testEachPort(PORTS_BOTH_DYNAMIC_COMPILED, async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});

