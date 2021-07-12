/****************************************************************************
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

const EventTarget = require('./event/event-target');
const ComponentScheduler = require('./component-scheduler');
const NodeActivator = require('./node-activator');
const Obj = require('./platform/CCObject');
const game = require('./CCGame');
const renderer = require('./renderer');
const eventManager = require('./event-manager');
const Scheduler = require('./CCScheduler');

//----------------------------------------------------------------------------------------------------------------------

/**
 * !#en
 * <p>
 *    ATTENTION: USE cc.director INSTEAD OF cc.Director.<br/>
 *    cc.director is a singleton object which manage your game's logic flow.<br/>
 *    Since the cc.director is a singleton, you don't need to call any constructor or create functions,<br/>
 *    the standard way to use it is by calling:<br/>
 *      - cc.director.methodName(); <br/>
 *
 *    It creates and handle the main Window and manages how and when to execute the Scenes.<br/>
 *    <br/>
 *    The cc.director is also responsible for:<br/>
 *      - initializing the OpenGL context<br/>
 *      - setting the OpenGL pixel format (default on is RGB565)<br/>
 *      - setting the OpenGL buffer depth (default on is 0-bit)<br/>
 *      - setting the color for clear screen (default one is BLACK)<br/>
 *      - setting the projection (default one is 3D)<br/>
 *      - setting the orientation (default one is Portrait)<br/>
 *      <br/>
 *    <br/>
 *    The cc.director also sets the default OpenGL context:<br/>
 *      - GL_TEXTURE_2D is enabled<br/>
 *      - GL_VERTEX_ARRAY is enabled<br/>
 *      - GL_COLOR_ARRAY is enabled<br/>
 *      - GL_TEXTURE_COORD_ARRAY is enabled<br/>
 * </p>
 * <p>
 *   cc.director also synchronizes timers with the refresh rate of the display.<br/>
 *   Features and Limitations:<br/>
 *      - Scheduled timers & drawing are synchronizes with the refresh rate of the display<br/>
 *      - Only supports animation intervals of 1/60 1/30 & 1/15<br/>
 * </p>
 *
 * !#zh
 * <p>
 *     注意：用 cc.director 代替 cc.Director。<br/>
 *     cc.director 一个管理你的游戏的逻辑流程的单例对象。<br/>
 *     由于 cc.director 是一个单例，你不需要调用任何构造函数或创建函数，<br/>
 *     使用它的标准方法是通过调用：<br/>
 *       - cc.director.methodName();
 *     <br/>
 *     它创建和处理主窗口并且管理什么时候执行场景。<br/>
 *     <br/>
 *     cc.director 还负责：<br/>
 *      - 初始化 OpenGL 环境。<br/>
 *      - 设置OpenGL像素格式。(默认是 RGB565)<br/>
 *      - 设置OpenGL缓冲区深度 (默认是 0-bit)<br/>
 *      - 设置空白场景的颜色 (默认是 黑色)<br/>
 *      - 设置投影 (默认是 3D)<br/>
 *      - 设置方向 (默认是 Portrait)<br/>
 *    <br/>
 *    cc.director 设置了 OpenGL 默认环境 <br/>
 *      - GL_TEXTURE_2D   启用。<br/>
 *      - GL_VERTEX_ARRAY 启用。<br/>
 *      - GL_COLOR_ARRAY  启用。<br/>
 *      - GL_TEXTURE_COORD_ARRAY 启用。<br/>
 * </p>
 * <p>
 *   cc.director 也同步定时器与显示器的刷新速率。
 *   <br/>
 *   特点和局限性: <br/>
 *      - 将计时器 & 渲染与显示器的刷新频率同步。<br/>
 *      - 只支持动画的间隔 1/60 1/30 & 1/15。<br/>
 * </p>
 *
 * @class Director
 * @extends EventTarget
 */
cc.Director = function () {
    EventTarget.call(this);

    // paused?
    this._paused = false;
    // purge?
    this._purgeDirectorInNextLoop = false;

    this._winSizeInPoints = null;

    // scenes
    this._scene = null;
    this._loadingScene = '';

    // FPS
    this._totalFrames = 0;
    this._lastUpdate = 0;
    this._deltaTime = 0.0;
    this._startTime = 0.0;

    // ParticleSystem max step delta time
    this._maxParticleDeltaTime = 0.0;

    // Scheduler for user registration update
    this._scheduler = null;
    // Scheduler for life-cycle methods in component
    this._compScheduler = null;
    // Node activator
    this._nodeActivator = null;
    // Action manager
    this._actionManager = null;

    var self = this;
    game.on(game.EVENT_SHOW, function () {
        self._lastUpdate = performance.now();
    });

    game.once(game.EVENT_ENGINE_INITED, this.init, this);
};

cc.Director.prototype = {
    constructor: cc.Director,
    init: function () {
        this._totalFrames = 0;
        this._lastUpdate = performance.now();
        this._startTime = this._lastUpdate;
        this._paused = false;
        this._purgeDirectorInNextLoop = false;
        this._winSizeInPoints = cc.size(0, 0);
        this._scheduler = new Scheduler();

        if (cc.ActionManager) {
            this._actionManager = new cc.ActionManager();
            this._scheduler.scheduleUpdate(this._actionManager, Scheduler.PRIORITY_SYSTEM, false);
        } else {
            this._actionManager = null;
        }

        this.sharedInit();
        return true;
    },

    /*
     * Manage all init process shared between the web engine and jsb engine.
     * All platform independent init process should be occupied here.
     */
    sharedInit: function () {
        this._compScheduler = new ComponentScheduler();
        this._nodeActivator = new NodeActivator();

        // Event manager
        if (eventManager) {
            eventManager.setEnabled(true);
        }

        // Animation manager
        if (cc.AnimationManager) {
            this._animationManager = new cc.AnimationManager();
            this._scheduler.scheduleUpdate(this._animationManager, Scheduler.PRIORITY_SYSTEM, false);
        }
        else {
            this._animationManager = null;
        }

        // collision manager
        if (cc.CollisionManager) {
            this._collisionManager = new cc.CollisionManager();
            this._scheduler.scheduleUpdate(this._collisionManager, Scheduler.PRIORITY_SYSTEM, false);
        }
        else {
            this._collisionManager = null;
        }

        // physics manager
        if (cc.PhysicsManager) {
            this._physicsManager = new cc.PhysicsManager();
            this._scheduler.scheduleUpdate(this._physicsManager, Scheduler.PRIORITY_SYSTEM, false);
        }
        else {
            this._physicsManager = null;
        }

        // physics 3d manager
        if (cc.Physics3DManager && (CC_PHYSICS_BUILTIN || CC_PHYSICS_CANNON)) {
            this._physics3DManager = new cc.Physics3DManager();
            this._scheduler.scheduleUpdate(this._physics3DManager, Scheduler.PRIORITY_SYSTEM, false);
        } else {
            this._physics3DManager = null;
        }

        // WidgetManager
        if (cc._widgetManager) {
            cc._widgetManager.init(this);
        }
    },

    /**
     * calculates delta time since last time it was called
     */
    calculateDeltaTime: function (now) {
        if (!now) now = performance.now();

        // avoid delta time from being negative
        // negative deltaTime would be caused by the precision of now's value, for details please see: https://developer.mozilla.org/zh-CN/docs/Web/API/window/requestAnimationFrame
        this._deltaTime = now > this._lastUpdate ? (now - this._lastUpdate) / 1000 : 0;
        if (CC_DEBUG && (this._deltaTime > 1))
            this._deltaTime = 1 / 60.0;

        this._lastUpdate = now;
    },

    /**
     * !#en
     * Converts a view coordinate to an WebGL coordinate<br/>
     * Useful to convert (multi) touches coordinates to the current layout (portrait or landscape)<br/>
     * Implementation can be found in CCDirectorWebGL.
     * !#zh 将触摸点的屏幕坐标转换为 WebGL View 下的坐标。
     * @method convertToGL
     * @param {Vec2} uiPoint
     * @return {Vec2}
     * @deprecated since v2.0
     */
    convertToGL: function (uiPoint) {
        var container = game.container;
        var view = cc.view;
        var box = container.getBoundingClientRect();
        var left = box.left + window.pageXOffset - container.clientLeft;
        var top = box.top + window.pageYOffset - container.clientTop;
        var x = view._devicePixelRatio * (uiPoint.x - left);
        var y = view._devicePixelRatio * (top + box.height - uiPoint.y);
        return view._isRotated ? cc.v2(view._viewportRect.width - y, x) : cc.v2(x, y);
    },

    /**
     * !#en
     * Converts an OpenGL coordinate to a view coordinate<br/>
     * Useful to convert node points to window points for calls such as glScissor<br/>
     * Implementation can be found in CCDirectorWebGL.
     * !#zh 将触摸点的 WebGL View 坐标转换为屏幕坐标。
     * @method convertToUI
     * @param {Vec2} glPoint
     * @return {Vec2}
     * @deprecated since v2.0
     */
    convertToUI: function (glPoint) {
        var container = game.container;
        var view = cc.view;
        var box = container.getBoundingClientRect();
        var left = box.left + window.pageXOffset - container.clientLeft;
        var top = box.top + window.pageYOffset - container.clientTop;
        var uiPoint = cc.v2(0, 0);
        if (view._isRotated) {
            uiPoint.x = left + glPoint.y / view._devicePixelRatio;
            uiPoint.y = top + box.height - (view._viewportRect.width - glPoint.x) / view._devicePixelRatio;
        }
        else {
            uiPoint.x = left + glPoint.x * view._devicePixelRatio;
            uiPoint.y = top + box.height - glPoint.y * view._devicePixelRatio;
        }
        return uiPoint;
    },

    /**
     * End the life of director in the next frame
     * @method end
     */
    end: function () {
        this._purgeDirectorInNextLoop = true;
    },

    /**
     * !#en
     * Returns the size of the WebGL view in points.<br/>
     * It takes into account any possible rotation (device orientation) of the window.
     * !#zh 获取视图的大小，以点为单位。
     * @method getWinSize
     * @return {Size}
     * @deprecated since v2.0
     */
    getWinSize: function () {
        return cc.size(cc.winSize);
    },

    /**
     * !#en
     * Returns the size of the OpenGL view in pixels.<br/>
     * It takes into account any possible rotation (device orientation) of the window.<br/>
     * On Mac winSize and winSizeInPixels return the same value.
     * (The pixel here refers to the resource resolution. If you want to get the physics resolution of device, you need to use cc.view.getFrameSize())
     * !#zh
     * 获取视图大小，以像素为单位（这里的像素指的是资源分辨率。
     * 如果要获取屏幕物理分辨率，需要用 cc.view.getFrameSize()）
     * @method getWinSizeInPixels
     * @return {Size}
     * @deprecated since v2.0
     */
    getWinSizeInPixels: function () {
        return cc.size(cc.winSize);
    },

    /**
     * !#en Pause the director's ticker, only involve the game logic execution.
     * It won't pause the rendering process nor the event manager.
     * If you want to pause the entier game including rendering, audio and event, 
     * please use {{#crossLink "Game.pause"}}cc.game.pause{{/crossLink}}
     * !#zh 暂停正在运行的场景，该暂停只会停止游戏逻辑执行，但是不会停止渲染和 UI 响应。
     * 如果想要更彻底得暂停游戏，包含渲染，音频和事件，请使用 {{#crossLink "Game.pause"}}cc.game.pause{{/crossLink}}。
     * @method pause
     */
    pause: function () {
        if (this._paused)
            return;
        this._paused = true;
    },

    /**
     * Removes cached all cocos2d cached data.
     * @deprecated since v2.0
     */
    purgeCachedData: function () {
        cc.assetManager.releaseAll();
    },

    /**
     * Purge the cc.director itself, including unschedule all schedule, remove all event listeners, clean up and exit the running scene, stops all animations, clear cached data.
     */
    purgeDirector: function () {
        //cleanup scheduler
        this._scheduler.unscheduleAll();
        this._compScheduler.unscheduleAll();

        this._nodeActivator.reset();

        // Disable event dispatching
        if (eventManager)
            eventManager.setEnabled(false);

        if (!CC_EDITOR) {
            if (cc.isValid(this._scene)) {
                this._scene.destroy();
            }
            this._scene = null;

            cc.renderer.clear();
            cc.assetManager.builtins.clear();
        }

        cc.game.pause();

        // Clear all caches
        cc.assetManager.releaseAll();
    },

    /**
     * Reset the cc.director, can be used to restart the director after purge
     */
    reset: function () {
        this.purgeDirector();

        if (eventManager)
            eventManager.setEnabled(true);

        // Action manager
        if (this._actionManager){
            this._scheduler.scheduleUpdate(this._actionManager, cc.Scheduler.PRIORITY_SYSTEM, false);
        }

        // Animation manager
        if (this._animationManager) {
            this._scheduler.scheduleUpdate(this._animationManager, cc.Scheduler.PRIORITY_SYSTEM, false);
        }

        // Collider manager
        if (this._collisionManager) {
            this._scheduler.scheduleUpdate(this._collisionManager, cc.Scheduler.PRIORITY_SYSTEM, false);
        }

        // Physics manager
        if (this._physicsManager) {
            this._scheduler.scheduleUpdate(this._physicsManager, cc.Scheduler.PRIORITY_SYSTEM, false);
        }

        cc.game.resume();
    },

    /**
     * !#en
     * Run a scene. Replaces the running scene with a new one or enter the first scene.<br/>
     * The new scene will be launched immediately.
     * !#zh 立刻切换指定场景。
     * @method runSceneImmediate
     * @param {Scene|SceneAsset} scene - The need run scene.
     * @param {Function} [onBeforeLoadScene] - The function invoked at the scene before loading.
     * @param {Function} [onLaunched] - The function invoked at the scene after launch.
     */
    runSceneImmediate: function (scene, onBeforeLoadScene, onLaunched) {
        cc.assertID(scene instanceof cc.Scene || scene instanceof cc.SceneAsset, 1216);

        if (scene instanceof cc.SceneAsset) scene = scene.scene;

        CC_BUILD && CC_DEBUG && console.time('InitScene');
        scene._load();  // ensure scene initialized
        CC_BUILD && CC_DEBUG && console.timeEnd('InitScene');

        // Re-attach or replace persist nodes
        CC_BUILD && CC_DEBUG && console.time('AttachPersist');
        var persistNodeList = Object.keys(game._persistRootNodes).map(function (x) {
            return game._persistRootNodes[x];
        });
        for (let i = 0; i < persistNodeList.length; i++) {
            let node = persistNodeList[i];
            var existNode = scene.getChildByUuid(node.uuid);
            var index = -1;
            if (existNode) {
                // scene also contains the persist node, remove the old one
                existNode.removeFromParent(false);
                index = existNode.getSiblingIndex();
            }
            else {
                index = node.getSiblingIndex();
            }
            scene.insertChild(node, index);
        }
        CC_BUILD && CC_DEBUG && console.timeEnd('AttachPersist');

        var oldScene = this._scene;
        if (!CC_EDITOR) {
            // auto release assets
            CC_BUILD && CC_DEBUG && console.time('AutoRelease');
            cc.assetManager._releaseManager._autoRelease(oldScene, scene, game._persistRootNodes);
            CC_BUILD && CC_DEBUG && console.timeEnd('AutoRelease');
        }

        // unload scene
        CC_BUILD && CC_DEBUG && console.time('Destroy');
        if (cc.isValid(oldScene)) {
            oldScene.destroy();
        }

        this._scene = null;

        // purge destroyed nodes belongs to old scene
        Obj._deferredDestroy();
        CC_BUILD && CC_DEBUG && console.timeEnd('Destroy');

        if (onBeforeLoadScene) {
            onBeforeLoadScene();
        }
        this.emit(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, scene);

        // Run an Entity Scene
        this._scene = scene;

        CC_BUILD && CC_DEBUG && console.time('Activate');
        scene._activate();
        CC_BUILD && CC_DEBUG && console.timeEnd('Activate');

        //start scene
        cc.game.resume();

        if (onLaunched) {
            onLaunched(null, scene);
        }
        this.emit(cc.Director.EVENT_AFTER_SCENE_LAUNCH, scene);
    },

    /**
     * !#en
     * Run a scene. Replaces the running scene with a new one or enter the first scene.
     * The new scene will be launched at the end of the current frame.
     * !#zh 运行指定场景。
     * @method runScene
     * @param {Scene|SceneAsset} scene - The need run scene.
     * @param {Function} [onBeforeLoadScene] - The function invoked at the scene before loading.
     * @param {Function} [onLaunched] - The function invoked at the scene after launch.
     */
    runScene: function (scene, onBeforeLoadScene, onLaunched) {
        cc.assertID(scene, 1205);
        cc.assertID(scene instanceof cc.Scene || scene instanceof cc.SceneAsset, 1216);

        if (scene instanceof cc.SceneAsset) scene = scene.scene;
        // ensure scene initialized
        scene._load();

        // Delay run / replace scene to the end of the frame
        this.once(cc.Director.EVENT_AFTER_DRAW, function () {
            this.runSceneImmediate(scene, onBeforeLoadScene, onLaunched);
        }, this);
    },

    /**
     * !#en Loads the scene by its name.
     * !#zh 通过场景名称进行加载场景。
     *
     * @method loadScene
     * @param {String} sceneName - The name of the scene to load.
     * @param {Function} [onLaunched] - callback, will be called after scene launched.
     * @return {Boolean} if error, return false
     */
    loadScene: function (sceneName, onLaunched, _onUnloaded) {
        if (this._loadingScene) {
            cc.warnID(1208, sceneName, this._loadingScene);
            return false;
        }
        var bundle = cc.assetManager.bundles.find(function (bundle) {
            return bundle.getSceneInfo(sceneName);
        });
        if (bundle) {
            this.emit(cc.Director.EVENT_BEFORE_SCENE_LOADING, sceneName);
            this._loadingScene = sceneName;
            var self = this;
            console.time('LoadScene ' + sceneName);
            bundle.loadScene(sceneName, function (err, scene) {
                console.timeEnd('LoadScene ' + sceneName);
                self._loadingScene = '';
                if (err) {
                    err = 'Failed to load scene: ' + err;
                    cc.error(err);
                    onLaunched && onLaunched(err);
                }
                else {
                    self.runSceneImmediate(scene, _onUnloaded, onLaunched);
                }
            });
            return true;
        }
        else {
            cc.errorID(1209, sceneName);
            return false;
        }
    },

     /**
     * !#en
     * Preloads the scene to reduces loading time. You can call this method at any time you want.
     * After calling this method, you still need to launch the scene by `cc.director.loadScene`.
     * It will be totally fine to call `cc.director.loadScene` at any time even if the preloading is not
     * yet finished, the scene will be launched after loaded automatically.
     * !#zh 预加载场景，你可以在任何时候调用这个方法。
     * 调用完后，你仍然需要通过 `cc.director.loadScene` 来启动场景，因为这个方法不会执行场景加载操作。
     * 就算预加载还没完成，你也可以直接调用 `cc.director.loadScene`，加载完成后场景就会启动。
     *
     * @method preloadScene
     * @param {String} sceneName - The name of the scene to preload.
     * @param {Function} [onProgress] - callback, will be called when the load progression change.
     * @param {Number} onProgress.completedCount - The number of the items that are already completed
     * @param {Number} onProgress.totalCount - The total number of the items
     * @param {Object} onProgress.item - The latest item which flow out the pipeline
     * @param {Function} [onLoaded] - callback, will be called after scene loaded.
     * @param {Error} onLoaded.error - null or the error object.
     */
    preloadScene (sceneName, onProgress, onLoaded) {
        var bundle = cc.assetManager.bundles.find(function (bundle) {
            return bundle.getSceneInfo(sceneName);
        });
        if (bundle) {
            bundle.preloadScene(sceneName, null, onProgress, onLoaded);
        }
        else {
            cc.errorID(1209, sceneName);
            return null;
        }
    },


    /**
     * !#en Resume game logic execution after pause, if the current scene is not paused, nothing will happen.
     * !#zh 恢复暂停场景的游戏逻辑，如果当前场景没有暂停将没任何事情发生。
     * @method resume
     */
    resume: function () {
        if (!this._paused) {
            return;
        }

        this._lastUpdate = performance.now();
        if (!this._lastUpdate) {
            cc.logID(1200);
        }

        this._paused = false;
        this._deltaTime = 0;
    },

    /**
     * !#en
     * Enables or disables WebGL depth test.<br/>
     * Implementation can be found in CCDirectorCanvas.js/CCDirectorWebGL.js
     * !#zh 启用/禁用深度测试（在 Canvas 渲染模式下不会生效）。
     * @method setDepthTest
     * @param {Boolean} on
     * @deprecated since v2.0
     */
    setDepthTest: function (value) {
        if (!cc.Camera.main) {
            return;
        }
        cc.Camera.main.depth = !!value;
    },

    /**
     * !#en
     * Set color for clear screen.<br/>
     * (Implementation can be found in CCDirectorCanvas.js/CCDirectorWebGL.js)
     * !#zh
     * 设置场景的默认擦除颜色。<br/>
     * 支持全透明，但不支持透明度为中间值。要支持全透明需手工开启 cc.macro.ENABLE_TRANSPARENT_CANVAS。
     * @method setClearColor
     * @param {Color} clearColor
     * @deprecated since v2.0
     */
    setClearColor: function (clearColor) {
        if (!cc.Camera.main) {
            return;
        }
        cc.Camera.main.backgroundColor = clearColor;
    },

    /**
     * !#en Returns current logic Scene.
     * !#zh 获取当前逻辑场景。
     * @method getRunningScene
     * @private
     * @return {Scene}
     * @deprecated since v2.0
     */
    getRunningScene: function () {
        return this._scene;
    },

    /**
     * !#en Returns current logic Scene.
     * !#zh 获取当前逻辑场景。
     * @method getScene
     * @return {Scene}
     * @example
     *  // This will help you to get the Canvas node in scene
     *  cc.director.getScene().getChildByName('Canvas');
     */
    getScene: function () {
        return this._scene;
    },

    /**
     * !#en Returns the FPS value. Please use {{#crossLink "Game.setFrameRate"}}cc.game.setFrameRate{{/crossLink}} to control animation interval.
     * !#zh 获取单位帧执行时间。请使用 {{#crossLink "Game.setFrameRate"}}cc.game.setFrameRate{{/crossLink}} 来控制游戏帧率。
     * @method getAnimationInterval
     * @deprecated since v2.0
     * @return {Number}
     */
    getAnimationInterval: function () {
        return 1000 / game.getFrameRate();
    },

    /**
     * Sets animation interval, this doesn't control the main loop.
     * To control the game's frame rate overall, please use {{#crossLink "Game.setFrameRate"}}cc.game.setFrameRate{{/crossLink}}
     * @method setAnimationInterval
     * @deprecated since v2.0
     * @param {Number} value - The animation interval desired.
     */
    setAnimationInterval: function (value) {
        game.setFrameRate(Math.round(1000 / value));
    },

    /**
     * !#en Returns the delta time since last frame.
     * !#zh 获取上一帧的增量时间。
     * @method getDeltaTime
     * @return {Number}
     */
    getDeltaTime: function () {
        return this._deltaTime;
    },

    /**
     * !#en Returns the total passed time since game start, unit: ms
     * !#zh 获取从游戏开始到现在总共经过的时间，单位为 ms
     * @method getTotalTime
     * @return {Number}
     */
    getTotalTime: function () {
        return performance.now() - this._startTime;
    },

    /**
     * !#en Returns how many frames were called since the director started.
     * !#zh 获取 director 启动以来游戏运行的总帧数。
     * @method getTotalFrames
     * @return {Number}
     */
    getTotalFrames: function () {
        return this._totalFrames;
    },

    /**
     * !#en Returns whether or not the Director is paused.
     * !#zh 是否处于暂停状态。
     * @method isPaused
     * @return {Boolean}
     */
    isPaused: function () {
        return this._paused;
    },

    /**
     * !#en Returns the cc.Scheduler associated with this director.
     * !#zh 获取和 director 相关联的 cc.Scheduler。
     * @method getScheduler
     * @return {Scheduler}
     */
    getScheduler: function () {
        return this._scheduler;
    },

    /**
     * !#en Sets the cc.Scheduler associated with this director.
     * !#zh 设置和 director 相关联的 cc.Scheduler。
     * @method setScheduler
     * @param {Scheduler} scheduler
     */
    setScheduler: function (scheduler) {
        if (this._scheduler !== scheduler) {
            this._scheduler = scheduler;
        }
    },

    /**
     * !#en Returns the cc.ActionManager associated with this director.
     * !#zh 获取和 director 相关联的 cc.ActionManager（动作管理器）。
     * @method getActionManager
     * @return {ActionManager}
     */
    getActionManager: function () {
        return this._actionManager;
    },
    /**
     * !#en Sets the cc.ActionManager associated with this director.
     * !#zh 设置和 director 相关联的 cc.ActionManager（动作管理器）。
     * @method setActionManager
     * @param {ActionManager} actionManager
     */
    setActionManager: function (actionManager) {
        if (this._actionManager !== actionManager) {
            if (this._actionManager) {
                this._scheduler.unscheduleUpdate(this._actionManager);
            }
            this._actionManager = actionManager;
            this._scheduler.scheduleUpdate(this._actionManager, cc.Scheduler.PRIORITY_SYSTEM, false);
        }
    },

    /* 
     * !#en Returns the cc.AnimationManager associated with this director.
     * !#zh 获取和 director 相关联的 cc.AnimationManager（动画管理器）。
     * @method getAnimationManager
     * @return {AnimationManager}
     */
    getAnimationManager: function () {
        return this._animationManager;
    },

    /**
     * !#en Returns the cc.CollisionManager associated with this director.
     * !#zh 获取和 director 相关联的 cc.CollisionManager （碰撞管理器）。
     * @method getCollisionManager
     * @return {CollisionManager}
     */
    getCollisionManager: function () {
        return this._collisionManager;
    },

    /**
     * !#en Returns the cc.PhysicsManager associated with this director.
     * !#zh 返回与 director 相关联的 cc.PhysicsManager （物理管理器）。
     * @method getPhysicsManager
     * @return {PhysicsManager}
     */
    getPhysicsManager: function () {
        return this._physicsManager;
    },

    /**
     * !#en Returns the cc.Physics3DManager associated with this director.
     * !#zh 返回与 director 相关联的 cc.Physics3DManager （物理管理器）。
     * @method getPhysics3DManager
     * @return {Physics3DManager}
     */
    getPhysics3DManager: function () {
        return this._physics3DManager;
    },

    // Loop management
    /*
     * Starts Animation
     * @deprecated since v2.1.2
     */
    startAnimation: function () {
        cc.game.resume();
    },

    /*
     * Stops animation
     * @deprecated since v2.1.2
     */
    stopAnimation: function () {
        cc.game.pause();
    },

    _resetDeltaTime () {
        this._lastUpdate = performance.now();
        this._deltaTime = 0;
    },

    /*
     * Run main loop of director
     */
    mainLoop: CC_EDITOR ? function (deltaTime, updateAnimate) {
        this._deltaTime = deltaTime;

        // Update
        if (!this._paused) {
            this.emit(cc.Director.EVENT_BEFORE_UPDATE);

            this._compScheduler.startPhase();
            this._compScheduler.updatePhase(deltaTime);

            if (updateAnimate) {
                this._scheduler.update(deltaTime);
            }

            this._compScheduler.lateUpdatePhase(deltaTime);

            this.emit(cc.Director.EVENT_AFTER_UPDATE);
        }

        // Render
        this.emit(cc.Director.EVENT_BEFORE_DRAW);
        renderer.render(this._scene, deltaTime);
        
        // After draw
        this.emit(cc.Director.EVENT_AFTER_DRAW);

        this._totalFrames++;

    } : function (now) {
        if (this._purgeDirectorInNextLoop) {
            this._purgeDirectorInNextLoop = false;
            this.purgeDirector();
        }
        else {
            // calculate "global" dt
            this.calculateDeltaTime(now);

            // Update
            if (!this._paused) {
                // before update
                this.emit(cc.Director.EVENT_BEFORE_UPDATE);

                // Call start for new added components
                this._compScheduler.startPhase();

                // Update for components
                this._compScheduler.updatePhase(this._deltaTime);
                // Engine update with scheduler
                this._scheduler.update(this._deltaTime);

                // Late update for components
                this._compScheduler.lateUpdatePhase(this._deltaTime);

                // User can use this event to do things after update
                this.emit(cc.Director.EVENT_AFTER_UPDATE);
                
                // Destroy entities that have been removed recently
                Obj._deferredDestroy();
            }

            // Render
            this.emit(cc.Director.EVENT_BEFORE_DRAW);
            renderer.render(this._scene, this._deltaTime);

            // After draw
            this.emit(cc.Director.EVENT_AFTER_DRAW);

            eventManager.frameUpdateListeners();
            this._totalFrames++;
        }
    },

    __fastOn: function (type, callback, target) {
        this.on(type, callback, target);
    },

    __fastOff: function (type, callback, target) {
        this.off(type, callback, target);
    },
};

// Event target
cc.js.addon(cc.Director.prototype, EventTarget.prototype);

/**
 * !#en The event projection changed of cc.Director. This event will not get triggered since v2.0
 * !#zh cc.Director 投影变化的事件。从 v2.0 开始这个事件不会再被触发
 * @property {String} EVENT_PROJECTION_CHANGED
 * @readonly
 * @static
 * @deprecated since v2.0
 */
cc.Director.EVENT_PROJECTION_CHANGED = "director_projection_changed";

/**
 * !#en The event which will be triggered before loading a new scene.
 * !#zh 加载新场景之前所触发的事件。
 * @event cc.Director.EVENT_BEFORE_SCENE_LOADING
 * @param {String} sceneName - The loading scene name
 */
/**
 * !#en The event which will be triggered before loading a new scene.
 * !#zh 加载新场景之前所触发的事件。
 * @property {String} EVENT_BEFORE_SCENE_LOADING
 * @readonly
 * @static
 */
cc.Director.EVENT_BEFORE_SCENE_LOADING = "director_before_scene_loading";

/*
 * !#en The event which will be triggered before launching a new scene.
 * !#zh 运行新场景之前所触发的事件。
 * @event cc.Director.EVENT_BEFORE_SCENE_LAUNCH
 * @param {String} sceneName - New scene which will be launched
 */
/**
 * !#en The event which will be triggered before launching a new scene.
 * !#zh 运行新场景之前所触发的事件。
 * @property {String} EVENT_BEFORE_SCENE_LAUNCH
 * @readonly
 * @static
 */
cc.Director.EVENT_BEFORE_SCENE_LAUNCH = "director_before_scene_launch";

/**
 * !#en The event which will be triggered after launching a new scene.
 * !#zh 运行新场景之后所触发的事件。
 * @event cc.Director.EVENT_AFTER_SCENE_LAUNCH
 * @param {String} sceneName - New scene which is launched
 */
/**
 * !#en The event which will be triggered after launching a new scene.
 * !#zh 运行新场景之后所触发的事件。
 * @property {String} EVENT_AFTER_SCENE_LAUNCH
 * @readonly
 * @static
 */
cc.Director.EVENT_AFTER_SCENE_LAUNCH = "director_after_scene_launch";

/**
 * !#en The event which will be triggered at the beginning of every frame.
 * !#zh 每个帧的开始时所触发的事件。
 * @event cc.Director.EVENT_BEFORE_UPDATE
 */
/**
 * !#en The event which will be triggered at the beginning of every frame.
 * !#zh 每个帧的开始时所触发的事件。
 * @property {String} EVENT_BEFORE_UPDATE
 * @readonly
 * @static
 */
cc.Director.EVENT_BEFORE_UPDATE = "director_before_update";

/**
 * !#en The event which will be triggered after engine and components update logic.
 * !#zh 将在引擎和组件 “update” 逻辑之后所触发的事件。
 * @event cc.Director.EVENT_AFTER_UPDATE
 */
/**
 * !#en The event which will be triggered after engine and components update logic.
 * !#zh 将在引擎和组件 “update” 逻辑之后所触发的事件。
 * @property {String} EVENT_AFTER_UPDATE
 * @readonly
 * @static
 */
cc.Director.EVENT_AFTER_UPDATE = "director_after_update";

/**
 * !#en The event is deprecated since v2.0, please use cc.Director.EVENT_BEFORE_DRAW instead
 * !#zh 这个事件从 v2.0 开始被废弃，请直接使用 cc.Director.EVENT_BEFORE_DRAW
 * @property {String} EVENT_BEFORE_VISIT
 * @readonly
 * @deprecated since v2.0
 * @static
 */
cc.Director.EVENT_BEFORE_VISIT = "director_before_draw";

/**
 * !#en The event is deprecated since v2.0, please use cc.Director.EVENT_BEFORE_DRAW instead
 * !#zh 这个事件从 v2.0 开始被废弃，请直接使用 cc.Director.EVENT_BEFORE_DRAW
 * @property {String} EVENT_AFTER_VISIT
 * @readonly
 * @deprecated since v2.0
 * @static
 */
cc.Director.EVENT_AFTER_VISIT = "director_before_draw";

/**
 * !#en The event which will be triggered before the rendering process.
 * !#zh 渲染过程之前所触发的事件。
 * @event cc.Director.EVENT_BEFORE_DRAW
 */
/**
 * !#en The event which will be triggered before the rendering process.
 * !#zh 渲染过程之前所触发的事件。
 * @property {String} EVENT_BEFORE_DRAW
 * @readonly
 * @static
 */
cc.Director.EVENT_BEFORE_DRAW = "director_before_draw";

/**
 * !#en The event which will be triggered after the rendering process.
 * !#zh 渲染过程之后所触发的事件。
 * @event cc.Director.EVENT_AFTER_DRAW
 */
/**
 * !#en The event which will be triggered after the rendering process.
 * !#zh 渲染过程之后所触发的事件。
 * @property {String} EVENT_AFTER_DRAW
 * @readonly
 * @static
 */
cc.Director.EVENT_AFTER_DRAW = "director_after_draw";

//Possible OpenGL projections used by director

/**
 * Constant for 2D projection (orthogonal projection)
 * @property {Number} PROJECTION_2D
 * @default 0
 * @readonly
 * @static
 * @deprecated since v2.0
 */
cc.Director.PROJECTION_2D = 0;

/**
 * Constant for 3D projection with a fovy=60, znear=0.5f and zfar=1500.
 * @property {Number} PROJECTION_3D
 * @default 1
 * @readonly
 * @static
 * @deprecated since v2.0
 */
cc.Director.PROJECTION_3D = 1;

/**
 * Constant for custom projection, if cc.Director's projection set to it, it calls "updateProjection" on the projection delegate.
 * @property {Number} PROJECTION_CUSTOM
 * @default 3
 * @readonly
 * @static
 * @deprecated since v2.0
 */
cc.Director.PROJECTION_CUSTOM = 3;

/**
 * Constant for default projection of cc.Director, default projection is 2D projection
 * @property {Number} PROJECTION_DEFAULT
 * @default cc.Director.PROJECTION_2D
 * @readonly
 * @static
 * @deprecated since v2.0
 */
cc.Director.PROJECTION_DEFAULT = cc.Director.PROJECTION_2D;

/**
 * The event which will be triggered before the physics process.<br/>
 * 物理过程之前所触发的事件。
 * @event Director.EVENT_BEFORE_PHYSICS
 * @readonly
 */
cc.Director.EVENT_BEFORE_PHYSICS = 'director_before_physics';

/**
 * The event which will be triggered after the physics process.<br/>
 * 物理过程之后所触发的事件。
 * @event Director.EVENT_AFTER_PHYSICS
 * @readonly
 */
cc.Director.EVENT_AFTER_PHYSICS = 'director_after_physics';

/**
 * @module cc
 */

/**
 * !#en Director
 * !#zh 导演类。
 * @property director
 * @type {Director}
 */
cc.director = new cc.Director();

module.exports = cc.director;