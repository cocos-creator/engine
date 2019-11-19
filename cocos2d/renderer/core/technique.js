// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

import config from '../config';

let _genID = 0;

export default class Technique {
  constructor(name, passes) {
    this._id = _genID++;
    this._name = name;
    this._passes = passes;
  }

  get name () {
    return this._name;
  }

  get passes() {
    return this._passes;
  }

  clone () {
    let passes = [];
    for (let i = 0; i < this._passes.length; i++) {
      passes.push(this._passes[i].clone());
    }
    return new Technique(this._name, passes);
  }
}