import { PORT_DYNAMIC, testEachPort } from "../port";
import { runTest } from "../utils";

const value = {
    el: new Float32Array(58).fill(6),
};

testEachPort([PORT_DYNAMIC], async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});
