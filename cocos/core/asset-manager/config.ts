/*
 Copyright (c) 2019-2020 Xiamen Yaji Software Co., Ltd.

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
 * @hidden
 */
import { EDITOR, TEST } from 'internal:constants';
import { Asset } from '../assets';
import { legacyCC } from '../global-exports';
import { js } from '../utils/js';
import Cache from './cache';
import { decodeUuid, normalize } from './helper';
import { AssetType } from './shared';

export interface IConfigOption {
    importBase: string;
    nativeBase: string;
    base: string;
    name: string;
    deps: string[];
    uuids: string[];
    paths: Record<string, any[]>;
    scenes: Record<string, string>;
    packs: Record<string, string[]>;
    versions: { import: string[], native: string[] };
    redirect: string[];
    debug: boolean;
    types: string[];
}

export interface IAssetInfo {
    uuid: string;
    packs?: IPackInfo[];
    redirect?: string;
    ver?: string;
    nativeVer?: string;
}

export interface IPackInfo extends IAssetInfo {
    packedUuids: string[];
    ext: string;
}

export interface IAddressableInfo extends IAssetInfo {
    path: string;
    ctor: AssetType;
}

export interface ISceneInfo extends IAssetInfo {
    url: string;
}

const isMatchByWord = (path: string, test: string): boolean => {
    if (path.length > test.length) {
        const nextAscii = path.charCodeAt(test.length);
        return nextAscii === 47; // '/'
    }
    return true;
};

const processOptions = (options: IConfigOption) => {
    if (EDITOR) { return; }
    let uuids = options.uuids;
    const paths = options.paths;
    const types = options.types;
    const bundles = options.deps;
    const realEntries = options.paths = Object.create(null);

    if (options.debug === false) {
        for (let i = 0, l = uuids.length; i < l; i++) {
            uuids[i] = decodeUuid(uuids[i]);
        }

        for (const id in paths) {
            const entry = paths[id];
            const type = entry[1];
            entry[1] = types[type];
        }
    } else {
        const out = Object.create(null);
        for (let i = 0, l = uuids.length; i < l; i++) {
            const uuid = uuids[i];
            uuids[i] = out[uuid] = decodeUuid(uuid);
        }
        uuids = out;
    }

    for (const id in paths) {
        const entry = paths[id];
        realEntries[uuids[id]] = entry;
    }

    const scenes = options.scenes;
    for (const name in scenes) {
        const uuid = scenes[name];
        scenes[name] = uuids[uuid];
    }

    const packs = options.packs;
    for (const packId in packs) {
        const packedIds = packs[packId];
        for (let j = 0; j < packedIds.length; ++j) {
            packedIds[j] = uuids[packedIds[j]];
        }
    }

    const versions = options.versions;
    if (versions) {
        for (const folder in versions) {
            const entries = versions[folder];
            for (let i = 0; i < entries.length; i += 2) {
                const uuid = entries[i];
                entries[i] = uuids[uuid] || uuid;
            }
        }
    }

    const redirect = options.redirect;
    if (redirect) {
        for (let i = 0; i < redirect.length; i += 2) {
            redirect[i] = uuids[redirect[i]];
            redirect[i + 1] = bundles[redirect[i + 1]];
        }
    }
};

export default class Config {
    public name = '';

    public base = '';

    public importBase = '';

    public nativeBase = '';

    public deps: string[] | null = null;

    public assetInfos = new Cache<IAssetInfo>();

    public scenes = new Cache<ISceneInfo>();

    public paths = new Cache<IAddressableInfo[]>();

    public init (options: IConfigOption) {
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
    }

    public getInfoWithPath (path: string, type?: AssetType | null): IAddressableInfo | null {
        if (!path) {
            return null;
        }
        path = normalize(path);
        const items = this.paths.get(path);
        if (items) {
            if (type) {
                for (let i = 0, l = items.length; i < l; i++) {
                    const assetInfo = items[i];
                    if (js.isChildClassOf(assetInfo.ctor, type)) {
                        return assetInfo;
                    }
                }
            } else {
                return items[0];
            }
        }
        return null;
    }

    public getDirWithPath (path: string, type?: AssetType | null, out?: IAddressableInfo[]): IAddressableInfo[] {
        path = normalize(path);
        if (path[path.length - 1] === '/') {
            path = path.slice(0, -1);
        }

        const infos = out || [];
        this.paths.forEach((items, p) => {
            if ((p.startsWith(path) && isMatchByWord(p, path)) || !path) {
                for (let i = 0, l = items.length; i < l; i++) {
                    const entry = items[i];
                    if (!type || js.isChildClassOf(entry.ctor, type)) {
                        infos.push(entry);
                    }
                }
            }
        });

        return infos;
    }

    public getAssetInfo (uuid: string): IAssetInfo | null {
        return this.assetInfos.get(uuid) || null;
    }

    public getSceneInfo (name: string): ISceneInfo | null {
        if (!name.endsWith('.scene')) {
            name += '.scene';
        }
        if (name[0] !== '/' && !name.startsWith('db://')) {
            name = `/${name}`;
        }
        // search scene
        const info = this.scenes.find((val, key) => key.endsWith(name));
        return info;
    }

    public destroy () {
        this.paths.destroy();
        this.scenes.destroy();
        this.assetInfos.destroy();
    }

    private _initUuid (uuidList: string[]) {
        if (!uuidList) {
            return;
        }
        this.assetInfos.clear();
        for (let i = 0, l = uuidList.length; i < l; i++) {
            const uuid = uuidList[i];
            this.assetInfos.add(uuid, { uuid });
        }
    }

    private _initPath (pathList: Record<string, string[]>) {
        if (!pathList) { return; }
        const paths = this.paths;
        paths.clear();
        for (const uuid in pathList) {
            const info = pathList[uuid];
            const path = info[0];
            const type = info[1];
            const isSubAsset = info.length === 3;

            const assetInfo = this.assetInfos.get(uuid) as IAddressableInfo;
            assetInfo.path = path;
            assetInfo.ctor = js._getClassById(type) as Constructor<Asset>;
            if (paths.has(path)) {
                if (isSubAsset) {
                    paths.get(path)!.push(assetInfo);
                } else {
                    paths.get(path)!.unshift(assetInfo);
                }
            } else {
                paths.add(path, [assetInfo]);
            }
        }
    }

    private _initScene (sceneList: Record<string, string>) {
        if (!sceneList) { return; }
        const scenes = this.scenes;
        scenes.clear();
        const assetInfos = this.assetInfos;
        for (const sceneName in sceneList) {
            const uuid = sceneList[sceneName];
            const assetInfo = assetInfos.get(uuid) as ISceneInfo;
            assetInfo.url = sceneName;
            scenes.add(sceneName, assetInfo);
        }
    }

    private _initPackage (packageList: Record<string, string[]>) {
        if (!packageList) { return; }
        const assetInfos = this.assetInfos;
        for (const packUuid in packageList) {
            const uuids = packageList[packUuid];
            const pack = { uuid: packUuid, packedUuids: uuids, ext: '.json' };
            assetInfos.add(packUuid, pack);

            for (let i = 0, l = uuids.length; i < l; i++) {
                const uuid = uuids[i];
                const assetInfo = assetInfos.get(uuid)!;
                const assetPacks = assetInfo.packs;
                if (assetPacks) {
                    if (l === 1) {
                        assetPacks.unshift(pack);
                    } else {
                        assetPacks.push(pack);
                    }
                } else {
                    assetInfo.packs = [pack];
                }
            }
        }
    }

    private _initVersion (versions: { import?: string[], native?: string[] }) {
        if (!versions) { return; }
        const assetInfos = this.assetInfos;
        let entries = versions.import;
        if (entries) {
            for (let i = 0, l = entries.length; i < l; i += 2) {
                const uuid = entries[i];
                const assetInfo = assetInfos.get(uuid)!;
                assetInfo.ver = entries[i + 1];
            }
        }
        entries = versions.native;
        if (entries) {
            for (let i = 0, l = entries.length; i < l; i += 2) {
                const uuid = entries[i];
                const assetInfo = assetInfos.get(uuid)!;
                assetInfo.nativeVer = entries[i + 1];
            }
        }
    }

    private _initRedirect (redirect: string[]) {
        if (!redirect) { return; }
        const assetInfos = this.assetInfos;
        for (let i = 0, l = redirect.length; i < l; i += 2) {
            const uuid = redirect[i];
            const assetInfo = assetInfos.get(uuid)!;
            assetInfo.redirect = redirect[i + 1];
        }
    }
}

if (TEST) {
    legacyCC._Test.Config = Config;
}
