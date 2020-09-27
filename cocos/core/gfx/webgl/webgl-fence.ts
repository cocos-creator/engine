import { GFXFence, GFXFenceInfo } from '../fence';

export class WebGLFence extends GFXFence {

    public initialize (info: GFXFenceInfo): boolean {
        return true;
    }

    public destroy () {
    }

    // WebGL 1 doesn't have any syncing mechanism
    public wait () {}
    public reset () {}
}
