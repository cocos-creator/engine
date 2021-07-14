/*
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @packageDocumentation
 * @module animation
 */
import { DataPoolManager } from './data-pool-manager';
import type { AnimationClip } from '../../core/animation/animation-clip';
import { legacyCC } from '../../core/global-exports';
import { BAKE_SKELETON_CURVE_SYMBOL } from '../../core/animation/internal-symbols';

type BakeData = ReturnType<AnimationClip[typeof BAKE_SKELETON_CURVE_SYMBOL]>;

/**
 * 骨骼动画数据转换中心。
 */
export class SkelAnimDataHub {
    public static getOrExtract (clip: AnimationClip): BakeData {
        let data = SkelAnimDataHub.pool.get(clip);
        if (!data || data.samples !== clip.sample) {
            // release outdated render data
            if (data) { (legacyCC.director.root.dataPoolManager as DataPoolManager).releaseAnimationClip(clip); }
            const frames = Math.ceil(clip.sample * clip.duration) + 1;
            const step = clip.sample;
            data = clip[BAKE_SKELETON_CURVE_SYMBOL](0, step, frames);
            SkelAnimDataHub.pool.set(clip, data);
        }
        return data;
    }

    public static destroy (clip: AnimationClip) {
        SkelAnimDataHub.pool.delete(clip);
    }

    private static pool = new Map<AnimationClip, BakeData>();
}
