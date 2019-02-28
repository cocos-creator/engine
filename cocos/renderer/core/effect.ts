// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

import { EffectAsset } from '../../3d/assets/effect-asset';
import { IPassInfoFull, Pass } from './pass';

export interface IDefineMap { [name: string]: number | boolean; }
export interface IEffectInfo {
    techIdx?: number;
    defines?: IDefineMap[];
}

export class Effect {
    public static getPassInfos (effect: EffectAsset, techIdx: number) {
        return effect.techniques[techIdx].passes;
    }

    public static parseEffect (effect: EffectAsset, info?: IEffectInfo) {
        // techniques
        const { techIdx, defines } = info || {} as IEffectInfo;
        const tech = effect.techniques[techIdx || 0];
        const passNum = tech.passes.length;
        const passes: Pass[] = new Array(passNum);
        for (let k = 0; k < passNum; ++k) {
            const passInfo = tech.passes[k] as IPassInfoFull;
            passInfo.defines = defines && defines[k] || {};
            const pass = new Pass(cc.game._gfxDevice);
            pass.initialize(passInfo);
            passes[k] = pass;
        }
        return passes;
    }
}
