import { GFXShader, GFXShaderInfo } from '../shader';
import { WebGLCmdFuncCreateShader, WebGLCmdFuncDestroyShader } from './webgl-commands';
import { WebGLDevice } from './webgl-device';
import { IWebGLGPUShader, IWebGLGPUShaderStage } from './webgl-gpu-objects';

export class WebGLShader extends GFXShader {

    get gpuShader (): IWebGLGPUShader {
        return  this._gpuShader!;
    }

    private _gpuShader: IWebGLGPUShader | null = null;

    public initialize (info: GFXShaderInfo): boolean {

        this._name = info.name;
        this._stages = info.stages;
        this._attributes = info.attributes;
        this._blocks = info.blocks;
        this._samplers = info.samplers;

        this._gpuShader = {
            name: info.name,
            blocks: info.blocks,
            samplers: info.samplers,

            gpuStages: new Array<IWebGLGPUShaderStage>(info.stages.length),
            glProgram: null,
            glInputs: [],
            glUniforms: [],
            glBlocks: [],
            glSamplers: [],
        };

        for (let i = 0; i < info.stages.length; ++i) {
            const stage = info.stages[i];
            this._gpuShader.gpuStages[i] = {
                type: stage.stage,
                source: stage.source,
                glShader: null,
            };
        }

        WebGLCmdFuncCreateShader(this._device as WebGLDevice, this._gpuShader);

        return true;
    }

    public destroy () {
        if (this._gpuShader) {
            WebGLCmdFuncDestroyShader(this._device as WebGLDevice, this._gpuShader);
            this._gpuShader = null;
        }
    }
}
