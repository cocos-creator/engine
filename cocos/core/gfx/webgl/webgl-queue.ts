import { GFXCommandBuffer } from '../command-buffer';
import { GFXQueue, IGFXQueueInfo } from '../queue';
import { GFXFence } from '../fence';

export class WebGLQueue extends GFXQueue {

    public numDrawCalls: number = 0;
    public numInstances: number = 0;
    public numTris: number = 0;

    public initialize (info: IGFXQueueInfo): boolean {

        this._type = info.type;

        return true;
    }

    public destroy () {
    }

    public submit (cmdBuffs: GFXCommandBuffer[], fence?: GFXFence) {
        if (!this._isAsync) {
            const len = cmdBuffs.length;
            for (let i = 0; i < len; i++) {
                const cmdBuff = cmdBuffs[i];
                // WebGLCmdFuncExecuteCmds( this._device as WebGLDevice, (cmdBuff as WebGLCommandBuffer).cmdPackage); // opted out
                this.numDrawCalls += cmdBuff.numDrawCalls;
                this.numInstances += cmdBuff.numInstances;
                this.numTris += cmdBuff.numTris;
            }
        }
    }

    public clear () {
        this.numDrawCalls = 0;
        this.numInstances = 0;
        this.numTris = 0;
    }
}
