/**
 * @hidden
 */

import { GFXPipelineState, GFXInputState } from '../gfx/pipeline-state';
import { IPSOCreateInfo } from '../renderer/scene/submodel';
import { GFXRenderPass } from '../gfx/render-pass';
import { GFXInputAssembler } from '../gfx/input-assembler';
import { GFXDevice } from '../gfx/device';

export class PipelineStateManager {
    private static _PSOHashMap: Map<number, GFXPipelineState> = new Map<number, GFXPipelineState>();
    private static _inputState: GFXInputState = new GFXInputState();

    static getOrCreatePipelineState (
        device: GFXDevice,
        psoCreateInfo: IPSOCreateInfo,
        renderPass: GFXRenderPass,
        ia: GFXInputAssembler
        ): GFXPipelineState {

        const hash1 = psoCreateInfo.hash;
        const hash2 = renderPass.hash;
        const hash3 = ia.attributesHash;

        const newHash = hash1 ^ hash2 ^ hash3;
        let pso = this._PSOHashMap.get(newHash);
        if (!pso) {
            const pipelineLayout = device.createPipelineLayout({
                layouts: [psoCreateInfo.bindingLayout]
            });
            const iaAttrs = this._inputState.attributes = ia.attributes;
            const shaderAttrs = psoCreateInfo.shaderInput.attributes;
            for (let i = 0; i < iaAttrs.length; i++) {
                const attr = iaAttrs[i]; let j = 0;
                for (; j < shaderAttrs.length; j++) {
                    const shaderAttr = shaderAttrs[j];
                    if (shaderAttr.name === attr.name) {
                        attr.location = shaderAttr.location;
                        break;
                    }
                }
            }
            pso = device.createPipelineState({
                primitive: psoCreateInfo.primitive,
                shader: psoCreateInfo.shader,
                inputState: this._inputState,
                rasterizerState: psoCreateInfo.rasterizerState,
                depthStencilState: psoCreateInfo.depthStencilState,
                blendState: psoCreateInfo.blendState,
                dynamicStates: psoCreateInfo.dynamicStates,
                layout: pipelineLayout,
                renderPass,
                hash: newHash,
            });
            this._PSOHashMap.set(newHash, pso);
        }

        return pso;
    }
}
