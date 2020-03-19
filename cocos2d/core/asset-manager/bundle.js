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
const Config = require('./config');
const Task = require('./task');
const Cache = require('./cache');
const finalizer = require('./finalizer');
const { parseParameters, parseLoadResArgs, asyncify } = require('./utilities');
const { pipeline, fetchPipeline, initializePipeline, LoadStrategy, RequestType, assets, bundles } = require('./shared');

/**
 * @module cc.AssetManager
 */

/**
 * !#en
 * A bundle contains an amount of assets(includes scene), you can load, preload, release asset which is in this bundle
 * 
 * !#zh
 * 一个包含一定数量资源（包括场景）的包，你可以加载，预加载，释放此包内的资源
 * 
 * @class Bundle
 */
function Bundle () {
    /**
     * !#en
     * The information about bundle
     * 
     * !#zh
     * bundle 所有信息
     * 
     * @property config
     * @type {Config}
     */
    this.config = new Config();
    this._preloadedScene = new Cache();
}

Bundle.prototype = {
    
    /**
     * !#en
     * Create a bundle
     * 
     * !#zh
     * 创建一个 bundle
     * 
     * @method constructor
     * 
     * @typescript
     * constructor()
     */
    constructor: Bundle,

    /**
     * !#en
     * Initialize this bundle with options
     * 
     * !#zh
     * 初始化此 bundle
     * 
     * @method init
     * @param {Object} options 
     * 
     * @typescript
     * init(options: Record<string, any>): void
     */
    init (options) {
        this._preloadedScene.clear();
        this.config.init(options);
        bundles.add(options.name, this);
    },
    
    /**
     * !#en
     * Refer to {{#crossLink "AssetManager/load:method"}}{{/crossLink}} for detailed informations. Everything are the same as `cc.assetManager.load`, but
     * only can load asset which is in this bundle
     * 
     * !#zh
     * 参考 {{#crossLink "AssetManager/load:method"}}{{/crossLink}} 获取更多详细信息，所有一切和 `cc.assetManager.load` 一样，但只能加载此包内的资源
     * 
     * @method load
     * @param {string|string[]|Object|Object[]|Task} requests - The request you want to load or a preloaded task
     * @param {Object} [options] - Optional parameters
     * @param {RequestType} [options.requestType] - Indicates that which type the requests is
     * @param {Function} [options.type] - When request's type is path or dir, indicates which type of asset you want to load
     * @param {Function} [onProgress] - Callback invoked when progression change
     * @param {Number} onProgress.finished - The number of the items that are already completed
     * @param {Number} onProgress.total - The total number of the items
     * @param {RequestItem} onProgress.item - The current request item
     * @param {Function} [onComplete] - Callback invoked when finish loading
     * @param {Error} onComplete.err - The error occured in loading process.
     * @param {*} onComplete.data - The loaded content
     * @returns {Task} loading task
     * 
     * @typescript
     * load(requests: string | string[] | Record<string, any> | Record<string, any>[] | Task, options?: Record<string, any>, onProgress?: (finished: number, total: number, item: RequestItem) => void, onComplete?: (err: Error, data: any) => void): Task
     * load(requests: string | string[] | Record<string, any> | Record<string, any>[] | Task, onProgress?: (finished: number, total: number, item: RequestItem) => void, onComplete?: (err: Error, data: any) => void): Task
     * load(requests: string | string[] | Record<string, any> | Record<string, any>[] | Task, options?: Record<string, any>, onComplete?: (err: Error, data: any) => void): Task
     * load(requests: string | string[] | Record<string, any> | Record<string, any>[] | Task, onComplete?: (err: Error, data: any) => void): Task
     */
    load (requests, options, onProgress, onComplete) {
        var { options, onProgress, onComplete } = parseParameters(options, onProgress, onComplete);

        if (requests instanceof Task) {
            if (requests.isFinish !== true) {
                cc.error('preloading task is not finished');
                return null;
            }
            requests.onComplete = asyncify(onComplete);
            initializePipeline.async(requests);
            return requests;
        }
        
        options = options || Object.create(null);
        options.bundle = this.config.name;
        var task = new Task({input: requests, onProgress, onComplete: asyncify(onComplete), options});
        pipeline.async(task);
        return task;
    },

    /**
     * !#en
     * Refer to {{#crossLink "AssetManager/preload:method"}}{{/crossLink}} for detailed informations. Everything are same as `cc.assetManager.preload`, but
     * only can preload asset in this bundle
     * 
     * !#zh
     * 参考 {{#crossLink "AssetManager/preload:method"}}{{/crossLink}} 获取更多详细信息，所有一切和 `cc.assetManager.preload` 一样，但只能预加载此包内的资源
     * 
     * @method preload
     * @param {string|string[]|Object|Object[]} requests - The request you want to preload
     * @param {Object} [options] - Optional parameters
     * @param {RequestType} [options.requestType] - Indicates that which type the requests is
     * @param {Function} [options.type] - When request's type is path or dir, indicates which type of asset you want to preload
     * @param {Function} [onProgress] - Callback invoked when progression change
     * @param {Number} onProgress.finished - The number of the items that are already completed
     * @param {Number} onProgress.total - The total number of the items
     * @param {RequestItem} onProgress.item - The current request item
     * @param {Function} [onComplete] - Callback invoked when finish preloading
     * @param {Error} onComplete.err - The error occured in preloading process.
     * @param {RequestItem[]} onComplete.items - The preloaded content
     * @returns {Task} preloading task
     * 
     * @typescript
     * preload(requests: string | string[] | Record<string, any> | Record<string, any>[], options?: Record<string, any>, onProgress?: (finished: number, total: number, item: RequestItem) => void, onComplete?: (err: Error, items: RequestItem[]) => void): Task
     * preload(requests: string | string[] | Record<string, any> | Record<string, any>[], onProgress?: (finished: number, total: number, item: RequestItem) => void, onComplete?: (err: Error, items: RequestItem[]) => void): Task
     * preload(requests: string | string[] | Record<string, any> | Record<string, any>[], options?: Record<string, any>, onComplete?: (err: Error, items: RequestItem[]) => void): Task
     * preload(requests: string | string[] | Record<string, any> | Record<string, any>[], onComplete?: (err: Error, items: RequestItem[]) => void): Task
     */
    preload (requests, options, onProgress, onComplete) {
        var { options, onProgress, onComplete } = parseParameters(options, onProgress, onComplete);

        options.loadStrategy = LoadStrategy.PRELOAD;
        options.bundle = this.config.name;
        options.priority = -1;
        var task = new Task({input: requests, onProgress, onComplete: asyncify(onComplete), options});
        fetchPipeline.async(task);
        return task;
    },

    /**
     * !#en
     * Everything is the same like {{#crossLink "AssetManager/loadRes:method"}}{{/crossLink}}, but not load asset which in folder `resources`. The path is 
     * relative to bundle's folder path in project
     * 
     * !#zh
     * 所有一切与 {{#crossLink "AssetManager/loadRes:method"}}{{/crossLink}} 类似，但不是加载 `resources` 目录下的资源。路径是相对 bundle 在工程中的文件夹路径的相对路径
     *
     * @method loadAsset
     * @param {String|String[]|Task} paths - Paths of the target assets or a preloaded task.The path is relative to the bundle's folder, extensions must be omitted.
     * @param {Function} [type] - Only asset of type will be loaded if this argument is supplied.
     * @param {Function} [onProgress] - Callback invoked when progression change.
     * @param {Number} onProgress.finish - The number of the items that are already completed.
     * @param {Number} onProgress.total - The total number of the items.
     * @param {RequestItem} onProgress.item - The finished request item.
     * @param {Function} [onComplete] - Callback invoked when all assets loaded.
     * @param {Error} onComplete.error - The error info or null if loaded successfully.
     * @param {Asset|Asset[]} onComplete.assets - The loaded assets.
     * @return {Task} loading task
     *
     * @example
     * // load the prefab (project/assets/bundle1/misc/character/cocos) from bundle1 folder
     * bundle1.loadAsset('misc/character/cocos', (err, prefab) => console.log(err));
     *
     * // load the sprite frame of (project/assets/bundle2/imgs/cocos.png) from bundle2 folder
     * bundle2.loadAsset('imgs/cocos', cc.SpriteFrame, null, (err, spriteFrame) => console.log(err));
     * 
     * @typescript
     * loadAsset(paths: string|string[]|Task, type?: typeof cc.Asset, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, assets: cc.Asset|cc.Asset[]) => void): Task
     * loadAsset(paths: string|string[]|Task, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, assets: cc.Asset|cc.Asset[]) => void): Task
     * loadAsset(paths: string|string[]|Task, type?: typeof cc.Asset, onComplete?: (error: Error, assets: cc.Asset|cc.Asset[]) => void): Task
     * loadAsset(paths: string|string[]|Task, onComplete?: (error: Error, assets: cc.Asset|cc.Asset[]) => void): Task
     */
    loadAsset (paths, type, onProgress, onComplete) {
        var { type, onProgress, onComplete } = parseLoadResArgs(type, onProgress, onComplete);
        return this.load(paths, {requestType: RequestType.PATH, type: type}, onProgress, onComplete);
    },

    /**
     * !#en
     * Preload assets from the bundle folder<br>
     * Everything are like {{#crossLink "AssetManager/preloadRes:method"}}{{/crossLink}}
     * 
     * !#zh
     * 预加载 bundle 目录下的资源，其他都和 {{#crossLink "AssetManager/preloadRes:method"}}{{/crossLink}} 相同
     *
     * @method preloadAsset
     * @param {String|String[]} paths - Paths of the target asset.The path is relative to bundle folder, extensions must be omitted.
     * @param {Function} [type] - Only asset of type will be loaded if this argument is supplied.
     * @param {Function} [onProgress] - Callback invoked when progression change.
     * @param {Number} onProgress.finish - The number of the items that are already completed.
     * @param {Number} onProgress.total - The total number of the items.
     * @param {RequestItem} onProgress.item - The finished request item.
     * @param {Function} [onComplete] - Callback invoked when the resource loaded.
     * @param {Error} onComplete.error - The error info or null if loaded successfully.
     * @param {RequestItem[]} onComplete.items - The preloaded items.
     * @return {Task} preloading task
     * 
     * @typescript
     * preloadAsset(paths: string|string[], type?: typeof cc.Asset, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, items: RequestItem[]) => void): Task
     * preloadAsset(paths: string|string[], onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, items: RequestItem[]) => void): Task
     * preloadAsset(paths: string|string[], type?: typeof cc.Asset, onComplete?: (error: Error, items: RequestItem[]) => void): Task
     * preloadAsset(paths: string|string[], onComplete?: (error: Error, items: RequestItem[]) => void): Task
     */
    preloadAsset (paths, type, onProgress, onComplete) {
        var { type, onProgress, onComplete } = parseLoadResArgs(type, onProgress, onComplete);
        return this.preload(paths, {requestType: RequestType.PATH, type: type}, onProgress, onComplete);
    },

    /**
     * !#en
     * Load all assets in a folder inside the bundle folder.<br>
     * <br>
     * Note: All asset paths in Creator use forward slashes, paths using backslashes will not work.
     * 
     * !#zh
     * 加载目标文件夹中的所有资源, 注意：路径中只能使用斜杠，反斜杠将停止工作
     *
     * @method loadDir
     * @param {string|Task} dir - path of the target folder or a preloaded task.
     *                       The path is relative to the bundle folder, extensions must be omitted.
     * @param {Function} [type] - Only asset of type will be loaded if this argument is supplied.
     * @param {Function} [onProgress] - Callback invoked when progression change.
     * @param {Number} onProgress.finish - The number of the items that are already completed.
     * @param {Number} onProgress.total - The total number of the items.
     * @param {Object} onProgress.item - The latest request item
     * @param {Function} [onComplete] - A callback which is called when all assets have been loaded, or an error occurs.
     * @param {Error} onComplete.error - If one of the asset failed, the complete callback is immediately called
     *                                         with the error. If all assets are loaded successfully, error will be null.
     * @param {Asset[]|Asset} onComplete.assets - An array of all loaded assets.
     * @returns {Task} loading task
     *
     * @typescript
     * loadDir(dir: string|Task, type?: typeof cc.Asset, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, assets: Asset[]|Asset) => void): Task
     * loadDir(dir: string|Task, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, assets: Asset[]|Asset) => void): Task
     * loadDir(dir: string|Task, type?: typeof cc.Asset, onComplete?: (error: Error, assets: Asset[]|Asset) => void): Task
     * loadDir(dir: string|Task, onComplete?: (error: Error, assets: Asset[]|Asset) => void): Task
     */
    loadDir (dir, type, onProgress, onComplete) {
        var { type, onProgress, onComplete } = parseLoadResArgs(type, onProgress, onComplete);
        return this.load(dir, {requestType: RequestType.DIR, type: type}, onProgress, onComplete);
    },

    /**
     * !#en
     * Preload all assets in a folder inside the bundle folder.<br>
     * <br>
     * Everything are like `loadDir`
     * 
     * !#zh
     * 预加载目标文件夹中的所有资源, 其他和 `loadDir` 一样
     *
     * @method preloadDir
     * @param {string} dir - path of the target folder.
     *                       The path is relative to the bundle folder, extensions must be omitted.
     * @param {Function} [type] - Only asset of type will be preloaded if this argument is supplied.
     * @param {Function} [onProgress] - Callback invoked when progression change.
     * @param {Number} onProgress.finish - The number of the items that are already completed.
     * @param {Number} onProgress.total - The total number of the items.
     * @param {Object} onProgress.item - The latest request item
     * @param {Function} [onComplete] - A callback which is called when all assets have been loaded, or an error occurs.
     * @param {Error} onComplete.error - If one of the asset failed, the complete callback is immediately called
     *                                         with the error. If all assets are preloaded successfully, error will be null.
     * @param {RequestItem[]} onComplete.items - An array of all preloaded items.
     * 
     * @returns {Task} preloading task
     *                                             
     * @typescript
     * preloadDir(dir: string, type?: typeof cc.Asset, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, items: RequestItem[]) => void): Task
     * preloadDir(dir: string, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, items: RequestItem[]) => void): Task
     * preloadDir(dir: string, type?: typeof cc.Asset, onComplete?: (error: Error, items: RequestItem[]) => void): Task
     * preloadDir(dir: string, onComplete?: (error: Error, items: RequestItem[]) => void): Task
     */
    preloadDir (dir, type, onProgress, onComplete) {
        var { type, onProgress, onComplete } = parseLoadResArgs(type, onProgress, onComplete);
        return this.preload(dir, {requestType: RequestType.DIR, type: type}, onProgress, onComplete);
    },

    /**
     * !#en 
     * Loads the scene by its name. Everything are like {{#crossLink "AssetManager/loadScene:method"}}{{/crossLink}}, 
     * but can only load scene from this bundle
     * 
     * !#zh 
     * 通过场景名称进行加载场景。所有和 {{#crossLink "AssetManager/loadScene:method"}}{{/crossLink}} 一样，但只能加载此包中的场景
     *
     * @method loadScene
     * @param {String|Task} sceneName - The name of the scene to load.
     * @param {Object} [options] - Some optional parameters
     * @param {Function} [onProgress] - Callback invoked when progression change.
     * @param {Number} onProgress.finish - The number of the items that are already completed.
     * @param {Number} onProgress.total - The total number of the items.
     * @param {Object} onProgress.item - The latest request item
     * @param {Function} [onComplete] - callback, will be called after scene launched.
     * @param {Error} onComplete.err - The occurred error, null indicetes success
     * @param {Scene} onComplete.scene - The scene
     * @return {Task} loading task
     * 
     * @example
     * bundle1.loadScene('first', (err, scene) => cc.director.runScene(scene));
     * 
     * @typescript
     * loadScene(sceneName: string|Task, options?: Record<string, any>, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, scene: cc.Scene) => void): Task
     * loadScene(sceneName: string|Task, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error, scene: cc.Scene) => void): Task
     * loadScene(sceneName: string|Task, options?: Record<string, any>, onComplete?: (error: Error, scene: cc.Scene) => void): Task
     * loadScene(sceneName: string|Task, onComplete?: (error: Error, scene: cc.Scene) => void): Task
     */
    loadScene (sceneName, options, onProgress, onComplete) {
        var { options, onProgress, onComplete } = parseParameters(options, onProgress, onComplete);

        var request = null;
        if (sceneName instanceof Task) {
            request = sceneName;
        } else {
            if (this._preloadedScene.has(sceneName)) {
                request = this._preloadedScene.get(sceneName);
                if (!request.isFinish) {
                    request = {'scene': sceneName};
                }
                this._preloadedScene.remove(sceneName);
            }
            else {
                request = {'scene': sceneName};
            }
        }
    
        options.priority = options.priority !== undefined ? options.priority : 1;
        return this.load(request, options, onProgress, function (err, sceneAsset) {
            if (err) {
                onComplete && onComplete(err);
            }
            else if (sceneAsset instanceof cc.SceneAsset) {
                var scene = sceneAsset.scene;
                scene._id = sceneAsset._uuid;
                scene._name = sceneAsset._name;
                onComplete && onComplete(null, scene);
            }
            else {
                onComplete && onComplete(new Error('The asset ' + sceneAsset._uuid + ' is not a scene'));
            }
        });
    },

    /**
     * !#en
     * Everything are like {{#crossLink "AssetManager/preloadScene:method"}}{{/crossLink}},
     * but can only preload scene from this bundle
     * 
     * !#zh 
     * 所有一切与 {{#crossLink "AssetManager/preloadScene:method"}}{{/crossLink}} 类似，但只能预加载此包中的场景
     *
     * @method preloadScene
     * @param {String} sceneName - The name of the scene to preload.
     * @param {Object} [options] - Some optional parameters
     * @param {Function} [onProgress] - callback, will be called when the load progression change.
     * @param {Number} onProgress.finish - The number of the items that are already completed
     * @param {Number} onProgress.total - The total number of the items
     * @param {RequestItem} onProgress.item The latest request item
     * @param {Function} [onComplete] - callback, will be called after scene loaded.
     * @param {Error} onComplete.error - null or the error object.
     * @return {Task} The preloading task
     * 
     * @example
     * bundle1.preloadScene('first', (err) => bundle1.loadScene('first'));
     * 
     * @typescript
     * preloadScene(sceneName: string, options?: Record<string, any>, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error) => void): Task
     * preloadScene(sceneName: string, onProgress?: (finish: number, total: number, item: RequestItem) => void, onComplete?: (error: Error) => void): Task
     * preloadScene(sceneName: string, options?: Record<string, any>, onComplete?: (error: Error) => void): Task
     * preloadScene(sceneName: string, onComplete?: (error: Error) => void): Task
     */
    preloadScene (sceneName, options, onProgress, onComplete) {
        var { options, onProgress, onComplete } = parseParameters(options, onProgress, onComplete);

        var self = this;
        var task = this.preload({'scene': sceneName}, options, onProgress, function (err) {
            if (err) {
                self._preloadedScene.remove(sceneName);
                cc.errorID(1210, sceneName, err.message);
            }
            onComplete && onComplete(err);
        });
        if (!task.isFinish) this._preloadedScene.add(sceneName, task);   
        return task;
    },

    /**
     * !#en
     * Everything are like {{#crossLink "AssetManager/getRes:method"}}{{/crossLink}}
     * but can only get asset from this bundle
     * 
     * !#zh
     * 所有一切与 {{#crossLink "AssetManager/getRes:method"}}{{/crossLink}} 类似，但只能
     * 获取到此包中的资源
     * 
     * @method getAsset
     * @param {String} path - The path of asset
     * @param {Function} [type] - Only asset of type will be returned if this argument is supplied.
     * @returns {Asset} 
     * 
     * @typescript
     * getAsset(path: string, type?: typeof cc.Asset): cc.Asset
     */
    getAsset (path, type) {
        var info = this.config.getInfoWithPath(path, type);
        return assets.get(info && info.uuid);
    },

    /**
     * !#en
     * Everything are like {{#crossLink "AssetManager/releaseRes:method"}}{{/crossLink}}
     * but can only release asset from this bundle
     * 
     * !#zh
     * 所有一切与 {{#crossLink "AssetManager/releaseRes:method"}}{{/crossLink}} 类似，但只能
     * 释放此包中的资源
     * 
     * @method releaseAsset
     * @param {String} path - The path of asset
     * @param {Function} [type] - Only asset of type will be released if this argument is supplied.
     * @param {boolean} [force] - Indicates whether or not release this asset forcely
     * 
     * @example
     * // release a texture which is no longer need
     * bundle1.releaseAsset('misc/character/cocos');
     *
     * @typescript
     * releaseAsset(path: string, type: typeof cc.Asset, force?: boolean): void
     * releaseAsset(path: string): void
     */
    releaseAsset (path, type, force) {
        finalizer.release(this.getAsset(path, type), force);
    },

    /**
     * !#en 
     * Release all assets from this bundle. Refer to {{#crossLink "AssetManager/releaseAll:method"}}{{/crossLink}} for detailed informations.
     * 
     * !#zh 
     * 释放此包中的所有资源。详细信息请参考 {{#crossLink "AssetManager/release:method"}}{{/crossLink}}
     *
     * @method releaseAll
     * @param {boolean} [force] - Indicates whether or not release this asset forcely
     * 
     * @typescript
     * releaseAll(force?: boolean): void
     */
    releaseAll (force) {
        var self = this;
        assets.forEach(function (asset) {
            if (self.config.getAssetInfo(asset.uuid)) {
                finalizer.release(asset, force);
            }
        });
    },

    /**
     * !#en 
     * Destroy this bundle. NOTE: The asset whthin this bundle will not be released automatically, you can call {{#crossLink "Bundle/releaseAll:method"}}{{/crossLink}} manually before destroy it if you need
     * 
     * !#zh 
     * 销毁此包, 注意：这个包内的资源不会自动释放, 如果需要的话你可以在摧毁之前手动调用 {{#crossLink "Bundle/releaseAll:method"}}{{/crossLink}} 进行释放
     *
     * @method destroy
     * 
     * @typescript
     * destroy(): void
     */
    destroy () {
        this._preloadedScene.destroy();
        this.config.destroy();
        bundles.remove(this.config.name);
    }

};

module.exports = Bundle;