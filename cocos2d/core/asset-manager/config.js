/****************************************************************************
 Copyright (c) 2019 Xiamen Yaji Software Co., Ltd.

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
 ****************************************************************************/
const js = require('../platform/js');
const Cache = require('./cache');
const { normalize } = require('./helper');
const { processOptions } = require('./utilities');

function Config () {

    this.name = '';

    this.base = '';

    this.importBase = '';

    this.nativeBase = '';

    this.deps = null;

    this.assetInfos = new Cache();

    this.scenes = new Cache();

    this.paths = new Cache();
}

Config.prototype = {

    constructor: Config,

    init: function (options) {
        processOptions(options);

        this.importBase = options.importBase || '';
        this.nativeBase = options.nativeBase || '';
        this.base = options.base || '';
        this.name = options.name || '';
        this.deps = options.deps || [];
        // init
        this._initUuid(options.uuids);
        this._initPath(options.paths);
        this._initScene(options.scenes);
        this._initPackage(options.packs);
        this._initVersion(options.versions);
        this._initRedirect(options.redirect);
    },

    _initUuid: function (uuidList) {
        if (!uuidList) return;
        this.assetInfos.clear();
        for (var i = 0, l = uuidList.length; i < l; i++) {
            var uuid = uuidList[i];
            this.assetInfos.add(uuid, {uuid});
        }
    },

    _initPath: function (pathList) {
        if (!pathList) return;
        var paths = this.paths;
        paths.clear();
        for (var uuid in pathList) {
            var info = pathList[uuid];
            var path = info[0];
            var type = info[1];
            var isSubAsset = info.length === 3;

            var assetInfo = this.assetInfos.get(uuid);
            assetInfo.path = path;
            assetInfo.ctor = js._getClassById(type);
            if (paths.has(path)) {
                if (isSubAsset) {
                    paths.get(path).push(assetInfo);
                }
                else {
                    paths.get(path).unshift(assetInfo);
                } 
            }
            else {
                paths.add(path, [assetInfo]);
            }
        }
    },

    _initScene: function (sceneList) {
        if (!sceneList) return;
        var scenes = this.scenes;
        scenes.clear();
        var assetInfos = this.assetInfos;
        for (var sceneName in sceneList) {
            var uuid = sceneList[sceneName];
            var assetInfo = assetInfos.get(uuid);
            assetInfo.url = sceneName;
            scenes.add(sceneName, assetInfo);
        }
    },

    _initPackage: function (packageList) {
        if (!packageList) return;
        var assetInfos = this.assetInfos;
        for (var packUuid in packageList) {
            var uuids = packageList[packUuid];
            var pack = {uuid: packUuid, packs: uuids, ext:'.json'};
            assetInfos.add(packUuid, pack);

            for (var i = 0, l = uuids.length; i < l; i++) {
                var uuid = uuids[i];
                var assetInfo = assetInfos.get(uuid);
                var assetPacks = assetInfo.packs;
                if (assetPacks) {
                    if (l === 1) {
                        assetPacks.unshift(pack);
                    }
                    else {
                        assetPacks.push(pack);
                    }
                }
                else {
                    assetInfo.packs = [pack];
                }
            }
        }
    },

    _initVersion: function (versions) {
        if (!versions) return;
        var assetInfos = this.assetInfos;
        var entries = versions.import;
        if (entries) {
            for (var i = 0, l = entries.length; i < l; i += 2) {
                var uuid = entries[i];
                var assetInfo = assetInfos.get(uuid);
                assetInfo.ver = entries[i + 1];
            }
        }
        entries = versions.native;
        if (entries) {
            for (var i = 0, l = entries.length; i < l; i += 2) {
                var uuid = entries[i];
                var assetInfo = assetInfos.get(uuid);
                assetInfo.nativeVer = entries[i + 1];
            }
        }
    },

    _initRedirect: function (redirect) {
        if (!redirect) return;
        var assetInfos = this.assetInfos;
        for (var i = 0, l = redirect.length; i < l; i += 2) {
            var uuid = redirect[i];
            var assetInfo = assetInfos.get(uuid);
            assetInfo.redirect = redirect[i + 1];
        }
    },

    getInfoWithPath: function (path, type) {

        if (!path) {
            return null;
        }
        path = normalize(path);
        var items = this.paths.get(path);
        if (items) {
            if (type) {
                for (var i = 0, l = items.length; i < l; i++) {
                    var assetInfo = items[i];
                    if (js.isChildClassOf(assetInfo.ctor, type)) {
                        return assetInfo;
                    }
                }
            }
            else {
                return items[0];
            }
        }
        return null;
    },

    getDirWithPath: function (path, type, out) {
        path = normalize(path);
        if (path[path.length - 1] === '/') {
            path = path.slice(0, -1);
        }

        var infos = out || [];
        function isMatchByWord (path, test) {
            if (path.length > test.length) {
                var nextAscii = path.charCodeAt(test.length);
                return nextAscii === 47; // '/'
            }
            return true;
        }
        this.paths.forEach(function (items, p) {
            if ((p.startsWith(path) && isMatchByWord(p, path)) || !path) {
                for (var i = 0, l = items.length; i < l; i++) {
                    var entry = items[i];
                    if (!type || js.isChildClassOf(entry.ctor, type)) {
                        infos.push(entry);
                    }
                }
            }
        });

        return infos;
    },

    getAssetInfo: function (uuid) {
        return this.assetInfos.get(uuid);
    },

    getSceneInfo: function (name) {
        if (!name.endsWith('.fire')) {
            name += '.fire';
        }
        if (name[0] !== '/' && !name.startsWith('db://')) {
            name = '/' + name;    // 使用全名匹配
        }
        // search scene
        var info = this.scenes.find(function (val, key) {
            return key.endsWith(name);
        });
        return info;
    },

    destroy: function () {
        this.paths.destroy();
        this.scenes.destroy();
        this.assetInfos.destroy();
    }
};

if (CC_TEST) {
    cc._Test.Config = Config;
}

module.exports = Config;