// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

import { Vec3, Vec4, Mat4 } from '../../core/value-types';
import BaseRenderer from '../core/base-renderer';
import enums from '../enums';
import { RecyclePool } from '../memop';

let _a16_view = new Float32Array(16);
let _a16_view_inv = new Float32Array(16);
let _a16_proj = new Float32Array(16);
let _a16_viewProj = new Float32Array(16);
let _a4_camPos = new Float32Array(4);

let _a64_shadow_lightViewProj = new Float32Array(64);
let _a16_shadow_lightViewProjs = [];
let _a4_shadow_info = new Float32Array(4);

let _camPos = new Vec4(0, 0, 0, 0);
let _camFwd = new Vec3(0, 0, 0);
let _v3_tmp1 = new Vec3(0, 0, 0);

const CC_MAX_LIGHTS = 4;
const CC_MAX_SHADOW_LIGHTS = 2;

let _float16_pool = new RecyclePool(() => {
  return new Float32Array(16);
}, 8);

function sortView (a, b) {
  return (a._priority - b._priority);
}

export default class ForwardRenderer extends BaseRenderer {
  constructor(device, builtin) {
    super(device, builtin);

    this._time = new Float32Array(4);

    this._lights = [];
    this._shadowLights = [];

    this._numLights = 0;

    this._defines = {
    };

    this._registerStage('shadowcast', this._shadowStage.bind(this));
    this._registerStage('opaque', this._opaqueStage.bind(this));
    this._registerStage('transparent', this._transparentStage.bind(this));
  }

  reset () {
    _float16_pool.reset();
    super.reset();
  }

  render (scene, dt) {
    this.reset();

    if (!CC_EDITOR) {
      if (dt) {
        this._time[0] += dt;
        this._time[1] = dt;
        this._time[2] ++;
      }
      this._device.setUniform('cc_time', this._time);
    }

    this._updateLights(scene);

    const canvas = this._device._gl.canvas;
    for (let i = 0; i < scene._cameras.length; ++i) {
      let view = this._requestView();
      let width = canvas.width;
      let height = canvas.height;
      let camera = scene._cameras.data[i];
      camera.extractView(view, width, height);
    }

    // render by cameras
    this._viewPools.sort(sortView);

    for (let i = 0; i < this._viewPools.length; ++i) {
      let view = this._viewPools.data[i];
      this._render(view, scene);
    }
  }

  // direct render a single camera
  renderCamera (camera, scene) {
    this.reset();

    this._updateLights(scene);

    const canvas = this._device._gl.canvas;
    let width = canvas.width;
    let height = canvas.height;

    let view = this._requestView();
    camera.extractView(view, width, height);

    // render by cameras
    this._viewPools.sort(sortView);

    for (let i = 0; i < this._viewPools.length; ++i) {
      let view = this._viewPools.data[i];
      this._render(view, scene);
    }
  }

  _updateLights (scene) {
    this._lights.length = 0;
    this._shadowLights.length = 0;

    let lights = scene._lights;
    for (let i = 0; i < lights.length; ++i) {
      let light = lights.data[i];
      light.update(this._device);

      if (light.shadowType !== enums.SHADOW_NONE) {
        if (this._shadowLights.length < CC_MAX_SHADOW_LIGHTS) {
          this._shadowLights.unshift(light);
        }
        let view = this._requestView();
        light.extractView(view, ['shadowcast']);

        this._lights.splice(0, 0, light);
      }
      else {
        this._lights.push(light);
      }
    }

    this._updateLightDefines();
    this._numLights = lights._count;
  }

  _updateLightDefines () {
    let defines = this._defines;

    for (let i = 0; i < this._lights.length; ++i) {
      let light = this._lights[i];
      let lightKey = `CC_LIGHT_${i}_TYPE`;
      let shadowKey = `CC_SHADOW_${i}_TYPE`;
      if (defines[lightKey] !== light._type){
        defines[lightKey] = light._type;
        this._definesChanged = true;
      }
      if (defines[shadowKey] !== light._shadowType){
        defines[shadowKey] = light._shadowType;
        this._definesChanged = true;
      }
    }

    let newCount = Math.min(CC_MAX_LIGHTS, this._lights.length);
    if (defines.CC_NUM_LIGHTS !== newCount) {
      defines.CC_NUM_LIGHTS = newCount;
      this._definesChanged = true;
    }
    newCount = Math.min(CC_MAX_LIGHTS, this._shadowLights.length);
    if (defines.CC_NUM_SHADOW_LIGHTS !== newCount) {
      defines.CC_NUM_SHADOW_LIGHTS = newCount;
      this._definesChanged = true;
    }
  }

  _submitLightsUniforms () {
    let device = this._device;

    if (this._lights.length > 0) {
      let positionAndRanges = _float16_pool.add();
      let directions = _float16_pool.add();
      let colors = _float16_pool.add();
      let lightNum = Math.min(CC_MAX_LIGHTS, this._lights.length);
      for (let i = 0; i < lightNum; ++i) {
        let light = this._lights[i];
        let index = i * 4;

        colors.set(light._colorUniform, index);
        directions.set(light._directionUniform, index);
        positionAndRanges.set(light._positionUniform, index);
        positionAndRanges[index+3] = light._range;

        if (light._type === enums.LIGHT_SPOT) {
          directions[index+3] = light._spotUniform[0];
          colors[index+3] = light._spotUniform[1];
        }
        else {
          directions[index+3] = 0;
          colors[index+3] = 0;
        }
      }

      device.setUniform('cc_lightDirection', directions);
      device.setUniform('cc_lightColor', colors);
      device.setUniform('cc_lightPositionAndRange', positionAndRanges);
    }
  }

  _submitShadowStageUniforms(view) {

    let light = view._shadowLight;

    let shadowInfo = _a4_shadow_info;
    shadowInfo[0] = light.shadowMinDepth;
    shadowInfo[1] = light.shadowMaxDepth;
    shadowInfo[2] = light.shadowDepthScale;
    shadowInfo[3] = light.shadowDarkness;

    this._device.setUniform('cc_shadow_map_lightViewProjMatrix', Mat4.toArray(_a16_viewProj, view._matViewProj));
    this._device.setUniform('cc_shadow_map_info', shadowInfo);
    this._device.setUniform('cc_shadow_map_bias', light.shadowBias);

    this._defines.CC_SHADOW_TYPE = light._shadowType;
  }

  _submitOtherStagesUniforms() {
    let shadowInfo = _float16_pool.add();

    for (let i = 0; i < this._shadowLights.length; ++i) {
      let light = this._shadowLights[i];
      let view = _a16_shadow_lightViewProjs[i];
      if (!view) {
        view = _a16_shadow_lightViewProjs[i] = new Float32Array(_a64_shadow_lightViewProj.buffer, i * 64, 16);
      }
      Mat4.toArray(view, light.viewProjMatrix);

      let index = i*4;
      shadowInfo[index] = light.shadowMinDepth;
      shadowInfo[index+1] = light.shadowMaxDepth;
      shadowInfo[index+2] = light._shadowResolution;
      shadowInfo[index+3] = light.shadowDarkness;
    }

    this._device.setUniform(`cc_shadow_lightViewProjMatrix`, _a64_shadow_lightViewProj);
    this._device.setUniform(`cc_shadow_info`, shadowInfo);
    // this._device.setUniform(`cc_frustumEdgeFalloff_${index}`, light.frustumEdgeFalloff);
  }

  _sortItems (items) {
    // sort items
    items.sort((a, b) => {
      // if (a.layer !== b.layer) {
      //   return a.layer - b.layer;
      // }

      if (a.passes.length !== b.passes.length) {
        return a.passes.length - b.passes.length;
      }

      return a.sortKey - b.sortKey;
    });
  }

  _shadowStage (view, items) {
    // update rendering
    this._submitShadowStageUniforms(view);

    // this._sortItems(items);

    // draw it
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];
      if (item.effect.getDefine('CC_CASTING_SHADOW')) {
        this._draw(item);
      }
    }
  }

  _drawItems (view, items) {
    let shadowLights = this._shadowLights;
    if (shadowLights.length === 0 && this._numLights === 0) {
      for (let i = 0; i < items.length; ++i) {
        let item = items.data[i];
        this._draw(item);
      }
    }
    else {
      for (let i = 0; i < items.length; ++i) {
        let item = items.data[i];

        for (let shadowIdx = 0; shadowIdx < shadowLights.length; ++shadowIdx) {
          this._device.setTexture('cc_shadow_map_'+shadowIdx, shadowLights[shadowIdx].shadowMap, this._allocTextureUnit());
        }

        this._draw(item);
      }
    }
  }

  _opaqueStage (view, items) {
    view.getPosition(_camPos);

    // update uniforms
    this._device.setUniform('cc_matView', Mat4.toArray(_a16_view, view._matView));
    this._device.setUniform('cc_matViewInv', Mat4.toArray(_a16_view_inv, view._matViewInv));
    this._device.setUniform('cc_matProj', Mat4.toArray(_a16_proj, view._matProj));
    this._device.setUniform('cc_matViewProj', Mat4.toArray(_a16_viewProj, view._matViewProj));
    this._device.setUniform('cc_cameraPos', Vec4.toArray(_a4_camPos, _camPos));

    // update rendering
    this._submitLightsUniforms();
    this._submitOtherStagesUniforms();

    this._drawItems(view, items);
  }

  _transparentStage (view, items) {
    view.getPosition(_camPos);
    view.getForward(_camFwd);

    // update uniforms
    this._device.setUniform('cc_matView', Mat4.toArray(_a16_view, view._matView));
    this._device.setUniform('cc_matViewInv', Mat4.toArray(_a16_view_inv, view._matViewInv));
    this._device.setUniform('cc_matProj', Mat4.toArray(_a16_proj, view._matProj));
    this._device.setUniform('cc_matViewProj', Mat4.toArray(_a16_viewProj, view._matViewProj));
    this._device.setUniform('cc_cameraPos', Vec4.toArray(_a4_camPos, _camPos));

    this._submitLightsUniforms();
    this._submitOtherStagesUniforms();

    // calculate zdist
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];

      // TODO: we should use mesh center instead!
      item.node.getWorldPosition(_v3_tmp1);

      Vec3.sub(_v3_tmp1, _v3_tmp1, _camPos);
      item.sortKey = -Vec3.dot(_v3_tmp1, _camFwd);
    }

    this._sortItems(items);
    this._drawItems(view, items);
  }
}
