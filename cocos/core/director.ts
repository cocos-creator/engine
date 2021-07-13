/*
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
*/

/* spell-checker:words COORD, Quesada, INITED, Renerer */

/**
 * @packageDocumentation
 * @module core
 */

import { DEBUG, EDITOR, BUILD, TEST } from 'internal:constants';
import { SceneAsset } from './assets';
import System from './components/system';
import { CCObject } from './data/object';
import { EventTarget } from './event/event-target';
import { game, Game } from './game';
import { v2, Vec2 } from './math';
import { eventManager } from './platform/event-manager/event-manager';
import { Root } from './root';
import { Node, Scene } from './scene-graph';
import { ComponentScheduler } from './scene-graph/component-scheduler';
import NodeActivator from './scene-graph/node-activator';
import { Scheduler } from './scheduler';
import { js } from './utils';
import { legacyCC } from './global-exports';
import { errorID, error, assertID, warnID } from './platform/debug';
import inputManager from './platform/event-manager/input-manager';

// ----------------------------------------------------------------------------------------------------------------------

/**
 * @en
 * ATTENTION: USE `director` INSTEAD OF `Director`.
 * `director` is a singleton object which manage your game's logic flow.
 * Since the `director` is a singleton, you don't need to call any constructor or create functions,
 * the standard way to use it is by calling:
 * `director.methodName();`
 * It creates and handle the main Window and manages how and when to execute the Scenes.
 *
 * @zh
 * 注意：用 `director` 代替 `Director`。
 * `director` 一个管理你的游戏的逻辑流程的单例对象。
 * 由于 `director` 是一个单例，你不需要调用任何构造函数或创建函数，
 * 使用它的标准方法是通过调用：
 * `director.methodName();`
 * 它创建和处理主窗口并且管理什么时候执行场景。
 */
export class Director extends EventTarget {
    /**
     * @en The event which will be triggered when the singleton of Director initialized.
     * @zh Director 单例初始化时触发的事件
     * @event Director.EVENT_INIT
     */
    /**
     * @en The event which will be triggered when the singleton of Director initialized.
     * @zh Director 单例初始化时触发的事件
     */
    public static readonly EVENT_INIT = 'director_init';

    /**
     * @en The event which will be triggered when the singleton of Director reset.
     * @zh Director 单例重置时触发的事件
     * @event Director.EVENT_RESET
     */
    /**
     * @en The event which will be triggered when the singleton of Director reset.
     * @zh Director 单例重置时触发的事件
     */
    public static readonly EVENT_RESET = 'director_reset';

    /**
     * @en The event which will be triggered before loading a new scene.
     * @zh 加载新场景之前所触发的事件。
     * @event Director.EVENT_BEFORE_SCENE_LOADING
     * @param {String} sceneName - The loading scene name
     */
    /**
     * @en The event which will be triggered before loading a new scene.
     * @zh 加载新场景之前所触发的事件。
     */
    public static readonly EVENT_BEFORE_SCENE_LOADING = 'director_before_scene_loading';

    /**
     * @en The event which will be triggered before launching a new scene.
     * @zh 运行新场景之前所触发的事件。
     * @event Director.EVENT_BEFORE_SCENE_LAUNCH
     * @param {String} sceneName - New scene which will be launched
     */
    /**
     * @en The event which will be triggered before launching a new scene.
     * @zh 运行新场景之前所触发的事件。
     */
    public static readonly EVENT_BEFORE_SCENE_LAUNCH = 'director_before_scene_launch';

    /**
     * @en The event which will be triggered after launching a new scene.
     * @zh 运行新场景之后所触发的事件。
     * @event Director.EVENT_AFTER_SCENE_LAUNCH
     * @param {String} sceneName - New scene which is launched
     */
    /**
     * @en The event which will be triggered after launching a new scene.
     * @zh 运行新场景之后所触发的事件。
     */
    public static readonly EVENT_AFTER_SCENE_LAUNCH = 'director_after_scene_launch';

    /**
     * @en The event which will be triggered at the beginning of every frame.
     * @zh 每个帧的开始时所触发的事件。
     * @event Director.EVENT_BEFORE_UPDATE
     */
    /**
     * @en The event which will be triggered at the beginning of every frame.
     * @zh 每个帧的开始时所触发的事件。
     */
    public static readonly EVENT_BEFORE_UPDATE = 'director_before_update';

    /**
     * @en The event which will be triggered after engine and components update logic.
     * @zh 将在引擎和组件 “update” 逻辑之后所触发的事件。
     * @event Director.EVENT_AFTER_UPDATE
     */
    /**
     * @en The event which will be triggered after engine and components update logic.
     * @zh 将在引擎和组件 “update” 逻辑之后所触发的事件。
     */
    public static readonly EVENT_AFTER_UPDATE = 'director_after_update';

    /**
     * @en The event which will be triggered before the rendering process.
     * @zh 渲染过程之前所触发的事件。
     * @event Director.EVENT_BEFORE_DRAW
     */
    public static readonly EVENT_BEFORE_DRAW = 'director_before_draw';

    /**
     * @en The event which will be triggered after the rendering process.
     * @zh 渲染过程之后所触发的事件。
     * @event Director.EVENT_AFTER_DRAW
     */
    public static readonly EVENT_AFTER_DRAW = 'director_after_draw';

    /**
     * @en The event which will be triggered before the pipeline render commit.
     * @zh 当前渲染帧提交前所触发的事件。
     * @event Director.EVENT_BEFORE_COMMIT
     */
    public static readonly EVENT_BEFORE_COMMIT = 'director_before_commit';

    /**
     * The event which will be triggered before the physics process.<br/>
     * 物理过程之前所触发的事件。
     * @event Director.EVENT_BEFORE_PHYSICS
     */
    public static readonly EVENT_BEFORE_PHYSICS = 'director_before_physics';

    /**
     * The event which will be triggered after the physics process.<br/>
     * 物理过程之后所触发的事件。
     * @event Director.EVENT_AFTER_PHYSICS
     */
    public static readonly EVENT_AFTER_PHYSICS = 'director_after_physics';

    /**
     * The event which will be triggered at the frame begin.<br/>
     * 一帧开始时所触发的事件。
     * @event Director.EVENT_BEGIN_FRAME
     */
    public static readonly EVENT_BEGIN_FRAME = 'director_begin_frame';

    /**
     * The event which will be triggered at the frame end.<br/>
     * 一帧结束之后所触发的事件。
     * @event Director.EVENT_END_FRAME
     */
    public static readonly EVENT_END_FRAME = 'director_end_frame';

    public static instance: Director;

    public _compScheduler: ComponentScheduler;
    public _nodeActivator: NodeActivator;
    private _invalid: boolean;
    private _paused: boolean;
    private _root: Root | null;
    private _loadingScene: string;
    private _scene: Scene | null;
    private _totalFrames: number;
    private _scheduler: Scheduler;
    private _systems: System[];

    constructor () {
        super();

        this._invalid = false;
        // paused?
        this._paused = false;

        // root
        this._root = null;

        // scenes
        this._loadingScene = '';
        this._scene = null;

        // FPS
        this._totalFrames = 0;

        // Scheduler for user registration update
        this._scheduler = new Scheduler();
        // Scheduler for life-cycle methods in component
        this._compScheduler = new ComponentScheduler();
        // Node activator
        this._nodeActivator = new NodeActivator();

        this._systems = [];

        game.once(Game.EVENT_RENDERER_INITED, this._initOnRendererInitialized, this);
    }

    /**
     * @en Calculates delta time since last time it was called, the result is saved to an internal property.
     * @zh 计算从上一帧到现在的时间间隔，结果保存在私有属性中
     * @deprecated since v3.3.0 no need to use it anymore
     */
    public calculateDeltaTime (now) {}

    /**
     * @en
     * Converts a view coordinate to an WebGL coordinate<br/>
     * Useful to convert (multi) touches coordinates to the current layout (portrait or landscape)<br/>
     * Implementation can be found in directorWebGL.
     * @zh 将触摸点的屏幕坐标转换为 WebGL View 下的坐标。
     * @deprecated since v2.0
     */
    public convertToGL (uiPoint: Vec2) {
        const container = game.container as Element;
        const view = legacyCC.view;
        const box = container.getBoundingClientRect();
        const left = box.left + window.pageXOffset - container.clientLeft;
        const top = box.top + window.pageYOffset - container.clientTop;
        const x = view._devicePixelRatio * (uiPoint.x - left);
        const y = view._devicePixelRatio * (top + box.height - uiPoint.y);
        return view._isRotated ? v2(view._viewportRect.width - y, x) : v2(x, y);
    }

    /**
     * @en
     * Converts an OpenGL coordinate to a view coordinate<br/>
     * Useful to convert node points to window points for calls such as glScissor<br/>
     * Implementation can be found in directorWebGL.
     * @zh 将触摸点的 WebGL View 坐标转换为屏幕坐标。
     * @deprecated since v2.0
     */
    public convertToUI (glPoint: Vec2) {
        const container = game.container as Element;
        const view = legacyCC.view;
        const box = container.getBoundingClientRect();
        const left = box.left + window.pageXOffset - container.clientLeft;
        const top = box.top + window.pageYOffset - container.clientTop;
        const uiPoint = v2(0, 0);
        if (view._isRotated) {
            uiPoint.x = left + glPoint.y / view._devicePixelRatio;
            uiPoint.y = top + box.height - (view._viewportRect.width - glPoint.x) / view._devicePixelRatio;
        } else {
            uiPoint.x = left + glPoint.x * view._devicePixelRatio;
            uiPoint.y = top + box.height - glPoint.y * view._devicePixelRatio;
        }
        return uiPoint;
    }

    /**
     * @en End the life of director in the next frame
     * @zh 执行完当前帧后停止 director 的执行
     */
    public end () {
        this.once(Director.EVENT_END_FRAME, () => {
            this.purgeDirector();
        });
    }

    /**
     * @en Pause the director's ticker, only involve the game logic execution.<br>
     * It won't pause the rendering process nor the event manager.<br>
     * If you want to pause the entire game including rendering, audio and event,<br>
     * please use `game.pause`.
     * @zh 暂停正在运行的场景，该暂停只会停止游戏逻辑执行，但是不会停止渲染和 UI 响应。<br>
     * 如果想要更彻底得暂停游戏，包含渲染，音频和事件，请使用 `game.pause` 。
     */
    public pause () {
        if (this._paused) {
            return;
        }
        this._paused = true;
    }

    /**
     * @en Purge the `director` itself, including unschedule all schedule,<br>
     * remove all event listeners, clean up and exit the running scene, stops all animations, clear cached data.
     * @zh 清除 `director` 本身，包括停止所有的计时器，<br>
     * 移除所有的事件监听器，清理并退出当前运行的场景，停止所有动画，清理缓存数据。
     */
    public purgeDirector () {
        // cleanup scheduler
        this._scheduler.unscheduleAll();
        this._compScheduler.unscheduleAll();

        this._nodeActivator.reset();

        // Disable event dispatching
        if (eventManager) {
            eventManager.setEnabled(false);
        }

        if (!EDITOR) {
            if (legacyCC.isValid(this._scene)) {
                this._scene!.destroy();
            }
            this._scene = null;
        }

        this.stopAnimation();

        // Clear all caches
        legacyCC.assetManager.releaseAll();
    }

    /**
     * @en Reset the director, can be used to restart the director after purge
     * @zh 重置此 Director，可用于在清除后重启 Director。
     */
    public reset () {
        this.purgeDirector();

        this.emit(Director.EVENT_RESET);

        if (eventManager) {
            eventManager.setEnabled(true);
        }

        this.startAnimation();
    }

    /**
     * @en
     * Run a scene. Replaces the running scene with a new one or enter the first scene.<br>
     * The new scene will be launched immediately.
     * @zh 运行指定场景。将正在运行的场景替换为（或重入为）新场景。新场景将立即启动。
     * @param scene - The need run scene.
     * @param onBeforeLoadScene - The function invoked at the scene before loading.
     * @param onLaunched - The function invoked at the scene after launch.
     */
    public runSceneImmediate (scene: Scene|SceneAsset, onBeforeLoadScene?: Director.OnBeforeLoadScene, onLaunched?: Director.OnSceneLaunched) {
        if (scene instanceof SceneAsset) scene = scene.scene!;
        assertID(scene instanceof Scene, 1216);

        if (BUILD && DEBUG) {
            console.time('InitScene');
        }
        // @ts-expect-error run private method
        scene._load();  // ensure scene initialized
        if (BUILD && DEBUG) {
            console.timeEnd('InitScene');
        }
        // Re-attach or replace persist nodes
        if (BUILD && DEBUG) {
            console.time('AttachPersist');
        }
        const persistNodeList = Object.keys(game._persistRootNodes).map((x) => game._persistRootNodes[x] as Node);
        for (let i = 0; i < persistNodeList.length; i++) {
            const node = persistNodeList[i];
            node.emit(legacyCC.Node.SCENE_CHANGED_FOR_PERSISTS, scene.renderScene);
            const existNode = scene.uuid === node._originalSceneId && scene.getChildByUuid(node.uuid);
            if (existNode) {
                // scene also contains the persist node, select the old one
                const index = existNode.getSiblingIndex();
                existNode._destroyImmediate();
                scene.insertChild(node, index);
            } else {
                // @ts-expect-error insert to new scene
                node.parent = scene;
            }
        }
        if (BUILD && DEBUG) {
            console.timeEnd('AttachPersist');
        }
        const oldScene = this._scene;

        // unload scene
        if (BUILD && DEBUG) {
            console.time('Destroy');
        }
        if (legacyCC.isValid(oldScene)) {
            oldScene!.destroy();
        }
        if (!EDITOR) {
            // auto release assets
            if (BUILD && DEBUG) {
                console.time('AutoRelease');
            }
            legacyCC.assetManager._releaseManager._autoRelease(oldScene, scene, game._persistRootNodes);
            if (BUILD && DEBUG) {
                console.timeEnd('AutoRelease');
            }
        }

        this._scene = null;

        // purge destroyed nodes belongs to old scene
        CCObject._deferredDestroy();
        if (BUILD && DEBUG) { console.timeEnd('Destroy'); }

        if (onBeforeLoadScene) {
            onBeforeLoadScene();
        }
        this.emit(legacyCC.Director.EVENT_BEFORE_SCENE_LAUNCH, scene);

        // Run an Entity Scene
        this._scene = scene;

        if (BUILD && DEBUG) {
            console.time('Activate');
        }
        // @ts-expect-error run private method
        scene._activate();
        if (BUILD && DEBUG) {
            console.timeEnd('Activate');
        }
        // start scene
        if (this._root) {
            this._root.resetCumulativeTime();
        }
        this.startAnimation();
        if (onLaunched) {
            onLaunched(null, scene);
        }
        this.emit(legacyCC.Director.EVENT_AFTER_SCENE_LAUNCH, scene);
    }

    /**
     * @en
     * Run a scene. Replaces the running scene with a new one or enter the first scene.<br>
     * The new scene will be launched at the end of the current frame.<br>
     * @zh 运行指定场景。
     * @param scene - The need run scene.
     * @param onBeforeLoadScene - The function invoked at the scene before loading.
     * @param onLaunched - The function invoked at the scene after launch.
     * @private
     */
    public runScene (scene: Scene | SceneAsset, onBeforeLoadScene?: Director.OnBeforeLoadScene, onLaunched?: Director.OnSceneLaunched) {
        if (scene instanceof SceneAsset) scene = scene.scene!;
        assertID(scene, 1205);
        assertID(scene instanceof Scene, 1216);

        // ensure scene initialized
        // @ts-expect-error run private method
        scene._load();

        // Delay run / replace scene to the end of the frame
        this.once(legacyCC.Director.EVENT_AFTER_DRAW, () => {
            this.runSceneImmediate(scene, onBeforeLoadScene, onLaunched);
        });
    }

    /**
     * @en Loads the scene by its name.
     * @zh 通过场景名称进行加载场景。
     *
     * @param sceneName - The name of the scene to load.
     * @param onLaunched - callback, will be called after scene launched.
     * @return if error, return false
     */
    public loadScene (sceneName: string, onLaunched?: Director.OnSceneLaunched, onUnloaded?: Director.OnUnload) {
        if (this._loadingScene) {
            warnID(1208, sceneName, this._loadingScene);
            return false;
        }
        const bundle = legacyCC.assetManager.bundles.find((bundle) => !!bundle.getSceneInfo(sceneName));
        if (bundle) {
            this.emit(legacyCC.Director.EVENT_BEFORE_SCENE_LOADING, sceneName);
            this._loadingScene = sceneName;
            console.time(`LoadScene ${sceneName}`);
            bundle.loadScene(sceneName, (err, scene) => {
                console.timeEnd(`LoadScene ${sceneName}`);
                this._loadingScene = '';
                if (err) {
                    error(err);
                    if (onLaunched) {
                        onLaunched(err);
                    }
                } else {
                    this.runSceneImmediate(scene, onUnloaded, onLaunched);
                }
            });
            return true;
        } else {
            errorID(1209, sceneName);
            return false;
        }
    }

    /**
     * @en
     * Pre-loads the scene to reduces loading time. You can call this method at any time you want.<br>
     * After calling this method, you still need to launch the scene by `director.loadScene`.<br>
     * It will be totally fine to call `director.loadScene` at any time even if the preloading is not<br>
     * yet finished, the scene will be launched after loaded automatically.
     * @zh 预加载场景，你可以在任何时候调用这个方法。
     * 调用完后，你仍然需要通过 `director.loadScene` 来启动场景，因为这个方法不会执行场景加载操作。<br>
     * 就算预加载还没完成，你也可以直接调用 `director.loadScene`，加载完成后场景就会启动。
     * @param sceneName 场景名称。
     * @param onLoaded 加载回调。
     */
    public preloadScene (sceneName: string, onLoaded?: Director.OnSceneLoaded): void;

    /**
     * @en
     * Pre-loads the scene to reduces loading time. You can call this method at any time you want.<br>
     * After calling this method, you still need to launch the scene by `director.loadScene`.<br>
     * It will be totally fine to call `director.loadScene` at any time even if the preloading is not<br>
     * yet finished, the scene will be launched after loaded automatically.
     * @zh 预加载场景，你可以在任何时候调用这个方法。
     * 调用完后，你仍然需要通过 `director.loadScene` 来启动场景，因为这个方法不会执行场景加载操作。<br>
     * 就算预加载还没完成，你也可以直接调用 `director.loadScene`，加载完成后场景就会启动。
     * @param sceneName 场景名称。
     * @param onProgress 加载进度回调。
     * @param onLoaded 加载回调。
     */
    public preloadScene (sceneName: string, onProgress: Director.OnLoadSceneProgress, onLoaded: Director.OnSceneLoaded): void;

    public preloadScene (
        sceneName: string,
        onProgress?: Director.OnLoadSceneProgress | Director.OnSceneLoaded,
        onLoaded?: Director.OnSceneLoaded,
    ) {
        const bundle = legacyCC.assetManager.bundles.find((bundle) => !!bundle.getSceneInfo(sceneName));
        if (bundle) {
            bundle.preloadScene(sceneName, null, onProgress, onLoaded);
        } else {
            const err = `Can not preload the scene "${sceneName}" because it is not in the build settings.`;
            if (onLoaded) {
                onLoaded(new Error(err));
            }
            error(`preloadScene: ${err}`);
        }
    }

    /**
     * @en Resume game logic execution after pause, if the current scene is not paused, nothing will happen.
     * @zh 恢复暂停场景的游戏逻辑，如果当前场景没有暂停将没任何事情发生。
     */
    public resume () {
        if (!this._paused) {
            return;
        }
        this._paused = false;
    }

    get root () {
        return this._root;
    }

    /**
     * @en Returns current logic Scene.
     * @zh 获取当前逻辑场景。
     * @example
     * ```
     * import { director } from 'cc';
     * // This will help you to get the Canvas node in scene
     * director.getScene().getChildByName('Canvas');
     * ```
     */
    public getScene (): Scene | null {
        return this._scene;
    }

    /**
     * @en Returns the delta time since last frame.
     * @zh 获取上一帧的增量时间。
     * @deprecated since v3.3.0, please use game.deltaTime instead
     */
    public getDeltaTime () {
        return game.deltaTime;
    }

    /**
     * @en Returns the total passed time since game start, unit: ms
     * @zh 获取从游戏开始到现在总共经过的时间，单位为 ms
     * @deprecated since v3.3.0, please use game.totalTime instead
     */
    public getTotalTime () {
        return game.totalTime;
    }

    /**
     * @en Returns the current time.
     * @zh 获取当前帧的时间。
     * @deprecated since v3.3.0, please use game.frameStartTime instead
     */
    public getCurrentTime () {
        return game.frameStartTime;
    }

    /**
     * @en Returns how many frames were called since the director started.
     * @zh 获取 director 启动以来游戏运行的总帧数。
     */
    public getTotalFrames () {
        return this._totalFrames;
    }

    /**
     * @en Returns whether or not the Director is paused.
     * @zh 是否处于暂停状态。
     */
    public isPaused () {
        return this._paused;
    }

    /**
     * @en Returns the scheduler associated with this director.
     * @zh 获取和 director 相关联的调度器。
     */
    public getScheduler () {
        return this._scheduler;
    }

    /**
     * @en Sets the scheduler associated with this director.
     * @zh 设置和 director 相关联的调度器。
     */
    public setScheduler (scheduler: Scheduler) {
        if (this._scheduler !== scheduler) {
            this.unregisterSystem(this._scheduler);
            this._scheduler = scheduler;
            this.registerSystem(Scheduler.ID, scheduler, 200);
        }
    }

    /**
     * @en Register a system.
     * @zh 注册一个系统。
     */
    public registerSystem (name: string, sys: System, priority: number) {
        sys.id = name;
        sys.priority = priority;
        sys.init();
        this._systems.push(sys);
        this._systems.sort(System.sortByPriority);
    }

    public unregisterSystem (sys: System) {
        js.array.fastRemove(this._systems, sys);
        this._systems.sort(System.sortByPriority);
    }

    /**
     * @en get a system.
     * @zh 获取一个 system。
     */
    public getSystem (name: string) {
        return this._systems.find((sys) => sys.id === name);
    }

    /**
     * @en Returns the `AnimationManager` associated with this director. Please use getSystem(AnimationManager.ID)
     * @zh 获取和 director 相关联的 `AnimationManager`（动画管理器）。请使用 getSystem(AnimationManager.ID) 来替代
     * @deprecated since 3.0.0
     */
    public getAnimationManager (): any {
        return this.getSystem(legacyCC.AnimationManager.ID);
    }

    // Loop management
    /**
     * @en Starts the director
     * @zh 开始执行游戏逻辑
     */
    public startAnimation () {
        this._invalid = false;
    }

    /**
     * @en Stops the director
     * @zh 停止执行游戏逻辑，每帧渲染会继续执行
     */
    public stopAnimation () {
        this._invalid = true;
    }

    /**
     * @en Run main loop of director
     * @zh 运行主循环
     * @deprecated please use [tick] instead
     */
    public mainLoop (now: number) {
        let dt;
        if (EDITOR && !legacyCC.GAME_VIEW || TEST) {
            dt = now;
        } else {
            // @ts-expect-error using internal API for deprecation
            dt = game._calculateDT(now);
        }
        this.tick(dt);
    }

    /**
     * @en Run main loop of director
     * @zh 运行主循环
     */
    public tick (dt: number) {
        if (!this._invalid) {
            this.emit(Director.EVENT_BEGIN_FRAME);
            if (!EDITOR) {
                inputManager.frameDispatchEvents();
            }
            // Update
            if (!this._paused) {
                this.emit(Director.EVENT_BEFORE_UPDATE);
                // Call start for new added components
                this._compScheduler.startPhase();
                // Update for components
                this._compScheduler.updatePhase(dt);
                // Update systems
                for (let i = 0; i < this._systems.length; ++i) {
                    this._systems[i].update(dt);
                }
                // Late update for components
                this._compScheduler.lateUpdatePhase(dt);
                // User can use this event to do things after update
                this.emit(Director.EVENT_AFTER_UPDATE);
                // Destroy entities that have been removed recently
                CCObject._deferredDestroy();

                // Post update systems
                for (let i = 0; i < this._systems.length; ++i) {
                    this._systems[i].postUpdate(dt);
                }
            }

            this.emit(Director.EVENT_BEFORE_DRAW);
            // The test environment does not currently support the renderer
            if (!TEST) this._root!.frameMove(dt);
            this.emit(Director.EVENT_AFTER_DRAW);

            eventManager.frameUpdateListeners();
            Node.resetHasChangedFlags();
            Node.clearNodeArray();
            this.emit(Director.EVENT_END_FRAME);
            this._totalFrames++;
        }
    }

    private _initOnRendererInitialized () {
        this._totalFrames = 0;
        this._paused = false;

        // Event manager
        if (eventManager) {
            eventManager.setEnabled(true);
        }

        // Scheduler
        // TODO: have a solid organization of priority and expose to user
        this.registerSystem(Scheduler.ID, this._scheduler, 200);

        this.emit(Director.EVENT_INIT);
    }

    private _init () {
        // The test environment does not currently support the renderer
        if (TEST) return Promise.resolve();
        // @ts-expect-error internal api usage
        this._root = new Root(game._gfxDevice);
        const rootInfo = {};
        return this._root.initialize(rootInfo).catch((error) => {
            errorID(1217);
            return Promise.reject(error);
        });
    }
}

export declare namespace Director {
    export type OnBeforeLoadScene = () => void;

    export type OnUnload = () => void;

    export type OnSceneLoaded = (error: null | Error, sceneAsset?: SceneAsset) => void;

    export type OnSceneLaunched = (error: null | Error, scene?: Scene) => void;

    /**
     * @param completedCount - The number of the items that are already completed.
     * @param totalCount - The total number of the items.
     * @param item - The latest item which flow out the pipeline.
     */
    export type OnLoadSceneProgress = (completedCount: number, totalCount: number, item: any) => void;
}

legacyCC.Director = Director;

/**
 * 导演类。
 */
export const director: Director = Director.instance = legacyCC.director = new Director();
