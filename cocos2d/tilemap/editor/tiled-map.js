/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
 ****************************************************************************/

'use strict';

const CustomAssetMeta = Editor.metas['custom-asset'];

const Fs = require('fire-fs');
const Path = require('fire-path');
const Url = require('fire-url');

const DOMParser = require('xmldom').DOMParser;
const TMX_ENCODING = { encoding: 'utf-8' };

function searchDependFiles(tmxFile, tmxFileData, cb) {
  var doc = new DOMParser().parseFromString(tmxFileData);
  if (!doc) {
    return cb(new Error(cc._getError(7222, tmxFile)));
  }

  var textures = [];
  var tsxFiles = [];
  function parseTilesetImages(tilesetNode, sourcePath) {
    var images = tilesetNode.getElementsByTagName('image');
    for (var i = 0, n = images.length; i < n ; i++) {
      var imageCfg = images[i].getAttribute('source');
      if (imageCfg) {
        var imgPath = Path.normalize(Path.join(Path.dirname(sourcePath), imageCfg));
        textures.push(imgPath);
      }
    }
  }

  var rootElement = doc.documentElement;
  var tilesetElements = rootElement.getElementsByTagName('tileset');
  for (var i = 0, n = tilesetElements.length; i < n; i++) {
    var tileset = tilesetElements[i];
    var sourceTSX = tileset.getAttribute('source');
    if (sourceTSX) {
      var tsxPath = Path.normalize(Path.join(Path.dirname(tmxFile), sourceTSX));

      if (Fs.existsSync(tsxPath)) {
        tsxFiles.push(tsxPath);
        var tsxContent = Fs.readFileSync(tsxPath, 'utf-8');
        var tsxDoc = new DOMParser().parseFromString(tsxContent);
        if (tsxDoc) {
          parseTilesetImages(tsxDoc, tsxPath);
        } else {
          Editor.warn('Parse %s failed.', tsxPath);
        }
      }
    }

    // import images
    parseTilesetImages(tileset, tmxFile);
  }

  cb(null, { textures: textures, tsxFiles: tsxFiles });
}

const AssetRootUrl = 'db://assets/';

class TiledMapMeta extends CustomAssetMeta {
  constructor (assetdb) {
    super(assetdb);
    this._tmxData = '';
    this._textures = [];
    this._tsxFiles = [];
  }

  static version () { return '2.0.0'; }
  static defaultType() { return 'tiled-map'; }

  import (fspath, cb) {
    Fs.readFile(fspath, TMX_ENCODING, (err, data) => {
      if (err) {
        return cb(err);
      }

      this._tmxData = data;
      searchDependFiles(fspath, data, (err, info) => {
        if (err) {
          return cb(err);
        }

        this._textures = info.textures;
        this._tsxFiles = info.tsxFiles;

        cb();
      });
    });
  }

  postImport ( fspath, cb ) {
    var db = this._assetdb;
    var asset = new cc.TiledMapAsset();
    asset.name = Path.basenameNoExt(fspath);
    asset.tmxXmlStr = this._tmxData;
    asset.tmxFolderPath = Path.relative(AssetRootUrl, Url.dirname(db.fspathToUrl(fspath)));
    asset.tmxFolderPath = asset.tmxFolderPath.replace(/\\/g, '/');
    asset.textures = this._textures.map(p => {
      var uuid = db.fspathToUuid(p);
      return uuid ? Editor.serialize.asAsset(uuid) : null;
    });
    asset.textureNames = this._textures.map(p => Path.basename(p));
    asset.tsxFiles = this._tsxFiles.map(p =>{
        var tsxFileName = Path.basename(p);
        asset.tsxFileNames.push(tsxFileName);

        var uuid = db.fspathToUuid(p);
        if (uuid) {
            return Editor.serialize.asAsset(uuid);
        }
        return null;
    });
    db.saveAssetToLibrary(this.uuid, asset);
    cb();
  }
}

TiledMapMeta.prototype.export = null;

module.exports = TiledMapMeta;
