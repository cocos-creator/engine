/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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
 * @module core
 */
import { legacyCC, VERSION } from './global-exports';

import * as geometry from './geometry';
import * as math from './math';
import * as memop from './memop';
import * as gfx from './gfx';

import './splash-screen';
import './deprecated';

legacyCC.math = math;
legacyCC.geometry = geometry;

export { math, memop, geometry, gfx, VERSION };

export * from './math';
export * from './memop';
export * from './value-types';
export * from './utils';
export * from './data';
export * from './event';
export * from './assets';
export * from './platform';
export * from './game';
export * from './scheduler';
export * from './director';

export * from './gfx/deprecated-3.0.0';
export * from './pipeline';
export * from './asset-manager';
export * from './scene-graph';
export * from './components';
export * from './builtin';
export * from './animation';
export * from './curves';
