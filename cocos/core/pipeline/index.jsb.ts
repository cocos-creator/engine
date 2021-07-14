/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

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


declare const nr: any;

import { getPhaseID } from './pass-phase'
import { setClassName } from '../../core/utils/js';
import { PipelineSceneData } from './pipeline-scene-data';
import { DeferredPipelineSceneData } from './deferred/deferred-pipeline-scene-data';
import { legacyCC } from '../../core/global-exports';

nr.getPhaseID = getPhaseID;

export const RenderPipeline = nr.RenderPipeline;
export const RenderFlow = nr.RenderFlow;
export const RenderStage = nr.RenderStage;
export const InstancedBuffer = nr.InstancedBuffer;
export const PipelineStateManager = nr.PipelineStateManager;

let instancedBufferProto = nr.InstancedBuffer;
let oldGetFunc = instancedBufferProto.get;

let getOrCreatePipelineState = nr.PipelineStateManager.getOrCreatePipelineState;
nr.PipelineStateManager.getOrCreatePipelineState = function(device, pass, shader, renderPass, ia) {
    return getOrCreatePipelineState.call(device, pass.native, shader, renderPass, ia);
}

export function createDefaultPipeline () {
    const pipeline = new ForwardPipeline();
    pipeline.init();
    return pipeline;
}

// ForwardPipeline
export class ForwardPipeline extends nr.ForwardPipeline {
    public pipelineSceneData = new PipelineSceneData();

    constructor() {
      super();
      this._tag = 0;
      this._flows = [];
      this.renderTextures = [];
      this.materials = [];
    }
  
    public init () {
        this.setPipelineSharedSceneData(this.pipelineSceneData.native);
        for (let i = 0; i < this._flows.length; i++) {
            this._flows[i].init();
        }
        const info = new nr.RenderPipelineInfo(this._tag, this._flows);
        this.initialize(info);
    }

    public activate () {
        return super.activate() && this.pipelineSceneData.activate(legacyCC.director.root.device, this as any);
    }

    public render (cameras) {
      let nativeObjs = [];
      for (let i = 0, len = cameras.length; i < len; ++i) {
          nativeObjs.push(cameras[i].native)
      }
      super.render(nativeObjs);
    }

    public destroy () {
        this.pipelineSceneData.destroy();
        super.destroy();
    }
}
// hook to invoke init after deserialization
ForwardPipeline.prototype.onAfterDeserialize_JSB = ForwardPipeline.prototype.init;

export class ForwardFlow extends nr.ForwardFlow {
    constructor() {
        super();
        this._name = 0;
        this._priority = 0;
        this._tag = 0;
        this._stages = [];
    }
    init() {
        for (let i = 0; i < this._stages.length; i++) {
            this._stages[i].init();
        }
        const info = new nr.RenderFlowInfo(this._name, this._priority, this._tag, this._stages);
        this.initialize(info);
    }
}

export class ShadowFlow extends nr.ShadowFlow {
    constructor() {
        super();
        this._name = 0;
        this._priority = 0;
        this._tag = 0;
        this._stages = [];
    }
    init() {
        for (let i = 0; i < this._stages.length; i++) {
            this._stages[i].init();
        }
        const info = new nr.RenderFlowInfo(this._name, this._priority, this._tag, this._stages);
        this.initialize(info);
    }
}

export class ForwardStage extends nr.ForwardStage {
    constructor() {
        super();
        this._name = 0;
        this._priority = 0;
        this._tag = 0;
        this.renderQueues = [];
    }
    public init() {
        const queues = [];
        for (let i = 0; i < this.renderQueues.length; i++) {
            queues.push(this.renderQueues[i].init());
        }
        const info = new nr.RenderStageInfo(this._name, this._priority, this._tag, queues);
        this.initialize(info);
    }
}

export class ShadowStage extends nr.ShadowStage {
    constructor() {
        super();
        this._name = 0;
        this._priority = 0;
        this._tag = 0;
    }
    public init() {
        const info = new nr.RenderStageInfo(this._name, this._priority, this._tag, []);
        this.initialize(info);
    }
}

export class RenderQueueDesc {
    public isTransparent = false;
    public sortMode = 0;
    public stages = [];

    constructor() {
        this.isTransparent = false;
        this.sortMode = 0;
        this.stages = [];
    }

    public init() {
        return new nr.RenderQueueDesc(this.isTransparent, this.sortMode, this.stages);
    }
}

export class DeferredPipeline extends nr.DeferredPipeline {
  public pipelineSceneData = new DeferredPipelineSceneData();
  constructor() {
    super();
    this._tag = 0;
    this._flows = [];
    this.renderTextures = [];
    this.materials = [];
  }

  init() {
    this.setPipelineSharedSceneData(this.pipelineSceneData.native);
    for (let i = 0; i < this._flows.length; i++) {
      this._flows[i].init(this);
    }
    let info = new nr.RenderPipelineInfo(this._tag, this._flows);
    this.initialize(info);
  }

  public activate () {
    return super.activate() && this.pipelineSceneData.activate(legacyCC.director.root.device, this as any);
  }

  public render (cameras) {
    let nativeObjs = [];
    for (let i = 0, len = cameras.length; i < len; ++i) {
        nativeObjs.push(cameras[i].native)
    }
    super.render(nativeObjs);
  }

  destroy () {
    this.fog.destroy();
    this.ambient.destroy();
    this.skybox.destroy();
    this.shadows.destroy();
    this.pipelineSceneData.destroy();
    super.destroy();
  }

}

// hook to invoke init after deserialization
DeferredPipeline.prototype.onAfterDeserialize_JSB = DeferredPipeline.prototype.init;

export class GbufferFlow extends nr.GbufferFlow {
  constructor() {
    super();
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this._stages = [];
  }

  init(pipeline) {
    for (let i = 0; i < this._stages.length; i++) {
      this._stages[i].init(pipeline);
    }
    let info = new nr.RenderFlowInfo(
        this._name, this._priority, this._tag, this._stages);
    this.initialize(info);
  }
}

export class GbufferStage extends nr.GbufferStage {
  constructor() {
    super();
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = []
  }

  init(pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
      queues.push(this.renderQueues[i].init());
    }
    let info =
        new nr.RenderStageInfo(this._name, this._priority, this._tag, queues);
    this.initialize(info);
  }
}

class LightingFlow extends nr.LightingFlow {
  constructor() {
    super();
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this._stages = [];
  }
  init(pipeline) {
    for (let i = 0; i < this._stages.length; i++) {
      this._stages[i].init(pipeline);
    }
    let info = new nr.RenderFlowInfo(
        this._name, this._priority, this._tag, this._stages);
    this.initialize(info);
  }
}

export class LightingStage extends nr.LightingStage {
  constructor() {
    super();
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
    this._deferredMaterial = null;
  }
  init(pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
      queues.push(this.renderQueues[i].init());
    }
    pipeline.pipelineSceneData.deferredLightingMaterial = this._deferredMaterial;
    let info =
        new nr.RenderStageInfo(this._name, this._priority, this._tag, queues);
    this.initialize(info);
  }
}

export class PostprocessStage extends nr.PostprocessStage {
  constructor() {
    super();
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
    this._postProcessMaterial = null;
  }
  init(pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
      queues.push(this.renderQueues[i].init());
    }
    pipeline.pipelineSceneData.deferredPostMaterial = this._postProcessMaterial;
    let info =
        new nr.RenderStageInfo(this._name, this._priority, this._tag, queues);
    this.initialize(info);
  }
}

setClassName('DeferredPipeline', DeferredPipeline);
setClassName('GbufferFlow', GbufferFlow);
setClassName('GbufferStage', GbufferStage);
setClassName('LightingFlow', LightingFlow);
setClassName('LightingStage', LightingStage);
setClassName('PostprocessStage',PostprocessStage);
setClassName('ForwardPipeline', ForwardPipeline);
setClassName('ForwardFlow', ForwardFlow);
setClassName('ShadowFlow', ShadowFlow);
setClassName('ForwardStage', ForwardStage);
setClassName('ShadowStage', ShadowStage);
setClassName('RenderQueueDesc', RenderQueueDesc);
