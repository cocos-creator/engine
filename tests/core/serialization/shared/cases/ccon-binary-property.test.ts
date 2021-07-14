import { runTest } from "../utils";
import { PORT_CCOB, testEachPort } from "../port";

const value = {
    arr: new Float32Array(58).fill(6),
};

testEachPort([PORT_CCOB], async (port) => {
    await runTest(
        __filename,
        port,
        value,
    );
});
