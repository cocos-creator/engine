/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
*/
/**
 * @packageDocumentation
 * @module core
 */

import { EDITOR, JSB, PREVIEW, RUNTIME_BASED, TEST } from 'internal:constants';
import { systemInfo } from 'pal/system-info';
import { IAssetManagerOptions } from './asset-manager/asset-manager';
import { EventTarget } from './event/event-target';
import * as debug from './platform/debug';
import inputManager from './platform/event-manager/input-manager';
import { Device, DeviceInfo } from './gfx';
import { sys } from './platform/sys';
import { macro } from './platform/macro';
import { ICustomJointTextureLayout } from '../3d/skeletal-animation/skeletal-animation-utils';
import { legacyCC, VERSION } from './global-exports';
import { IPhysicsConfig } from '../physics/framework/physics-config';
import { bindingMappingInfo } from './pipeline/define';
import { SplashScreen } from './splash-screen';
import { RenderPipeline } from './pipeline';
import { Node } from './scene-graph/node';
import { BrowserType } from '../../pal/system-info/enum-type';
import { Layers } from './scene-graph';
import { log2 } from './math/bits';

interface ISceneInfo {
    url: string;
    uuid: string;
}

export interface LayerItem {
    name: string;
    value: number;
}

/**
 * @zh
 * 游戏配置。
 * @en
 * Game configuration.
 */
export interface IGameConfig {
    /**
     * @zh
     * 设置 debug 模式，在浏览器中这个选项会被忽略。
     * @en
     * Set debug mode, only valid in non-browser environment.
     */
    debugMode?: debug.DebugMode;

    /**
     * @zh
     * 当 showFPS 为 true 的时候界面的左下角将显示 fps 的信息，否则被隐藏。
     * @en
     * Left bottom corner fps information will show when "showFPS" equals true, otherwise it will be hide.
     */
    showFPS?: boolean;

    /**
     * @zh
     * 暴露类名让 Chrome DevTools 可以识别，如果开启会稍稍降低类的创建过程的性能，但对对象构造没有影响。
     * @en
     * Expose class name to chrome debug tools, the class intantiate performance is a little bit slower when exposed.
     */
    exposeClassName?: boolean;

    /**
     * @zh
     * 设置想要的帧率你的游戏，但真正的FPS取决于你的游戏实现和运行环境。
     * @en
     * Set the wanted frame rate for your game, but the real fps depends on your game implementation and the running environment.
     */
    frameRate?: number;

    /**
     * @zh
     * Web 页面上的 Canvas Element ID，仅适用于 web 端。
     * @en
     * Sets the id of your canvas element on the web page, it's useful only on web.
     */
    id?: string | HTMLElement;

    /**
     * @zh
     * 渲染模式。
     * 设置渲染器类型，仅适用于 web 端：
     * - 0 - 通过引擎自动选择。
     * - 1 - 强制使用 canvas 渲染。
     * - 2 - 强制使用 WebGL 渲染，但是在部分 Android 浏览器中这个选项会被忽略。
     * @en
     * Sets the renderer type, only useful on web:
     * - 0 - Automatically chosen by engine.
     * - 1 - Forced to use canvas renderer.
     * - 2 - Forced to use WebGL renderer, but this will be ignored on mobile browsers.
     */
    renderMode?: 0 | 1 | 2;

    /**
     * @zh
     * 当前包中可用场景。
     * @en
     * Include available scenes in the current bundle.
     */
    scenes?: ISceneInfo[];

    /**
     * For internal use.
     */
    jsList?: string[];

    /**
     * Render pipeline resources
     */
    renderPipeline?: string;

    /**
     * Asset Manager initialization options
     */
    assetOptions?: IAssetManagerOptions;

    /**
     * GPU instancing options
     */
    customJointTextureLayouts?: ICustomJointTextureLayout[];

    /**
     * Physics system config
     */
    physics?: IPhysicsConfig;

    /**
     * User layers config
     */
    layers?: LayerItem[];

    /**
     * The adapter stores various platform-related objects.
     */
    adapter?: {
        canvas: HTMLCanvasElement,
        frame: HTMLDivElement,
        container: HTMLDivElement,
        [x: string]: any,
    };
}

/**
 * @en An object to boot the game.
 * @zh 包含游戏主体信息并负责驱动游戏的游戏对象。
 */
export class Game extends EventTarget {
    /**
     * @en Event triggered when game hide to background.<br>
     * Please note that this event is not 100% guaranteed to be fired on Web platform,<br>
     * on native platforms, it corresponds to enter background event, os status bar or notification center may not trigger this event.
     * @zh 游戏进入后台时触发的事件。<br>
     * 请注意，在 WEB 平台，这个事件不一定会 100% 触发，这完全取决于浏览器的回调行为。<br>
     * 在原生平台，它对应的是应用被切换到后台事件，下拉菜单和上拉状态栏等不一定会触发这个事件，这取决于系统行为。
     * @example
     * ```ts
     * import { game, audioEngine } from 'cc';
     * game.on(Game.EVENT_HIDE, function () {
     *     audioEngine.pauseMusic();
     *     audioEngine.pauseAllEffects();
     * });
     * ```
     */
    public static EVENT_HIDE = 'game_on_hide';

    /**
     * @en Event triggered when game back to foreground<br>
     * Please note that this event is not 100% guaranteed to be fired on Web platform,<br>
     * on native platforms, it corresponds to enter foreground event.
     * @zh 游戏进入前台运行时触发的事件。<br>
     * 请注意，在 WEB 平台，这个事件不一定会 100% 触发，这完全取决于浏览器的回调行为。<br>
     * 在原生平台，它对应的是应用被切换到前台事件。
     */
    public static readonly EVENT_SHOW: string = 'game_on_show';

    /**
     * @en Event triggered when system in low memory status.<br>
     * This event is only triggered on native iOS/Android platform.
     * @zh 程序在内存不足时触发的事件。<br>
     * 该事件只会在 iOS/Android 平台触发。
     */
    public static readonly EVENT_LOW_MEMORY: string = 'game_on_low_memory';

    /**
     * @en Event triggered after game inited, at this point all engine objects and game scripts are loaded
     * @zh 游戏启动后的触发事件，此时加载所有的引擎对象和游戏脚本。
     */
    public static EVENT_GAME_INITED = 'game_inited';

    /**
     * @en Event triggered after engine inited, at this point you will be able to use all engine classes.<br>
     * It was defined as EVENT_RENDERER_INITED in cocos creator v1.x and renamed in v2.0.
     * Since Cocos Creator v3.0, EVENT_RENDERER_INITED is a new event, look up define for details.
     * @zh 在引擎初始化之后触发的事件，此时您能够使用引擎所有的类。<br>
     * 它在 Cocos Creator v1.x 版本中名字为 EVENT_RENDERER_INITED，在 v2.0 更名为 EVENT_ENGINE_INITED
     * 并在 Cocos Creator v3.0 中将 EVENT_RENDERER_INITED 用作为渲染器初始化的事件。
     */
    public static EVENT_ENGINE_INITED = 'engine_inited';

    /**
     * @en Event triggered after renderer inited, at this point you will be able to use all gfx renderer feature.<br>
     * @zh 在渲染器初始化之后触发的事件，此事件在 EVENT_ENGINE_INITED 之前触发，此时开始可使用 gfx 渲染框架。
     */
    public static readonly EVENT_RENDERER_INITED: string = 'renderer_inited';

    /**
     * @en Event triggered when game restart
     * @zh 调用restart后，触发事件
     */
    public static EVENT_RESTART = 'game_on_restart';

    /**
     * @en Web Canvas 2d API as renderer backend.
     * @zh 使用 Web Canvas 2d API 作为渲染器后端。
     */
    public static RENDER_TYPE_CANVAS = 0;
    /**
     * @en WebGL API as renderer backend.
     * @zh 使用 WebGL API 作为渲染器后端。
     */
    public static RENDER_TYPE_WEBGL = 1;
    /**
     * @en OpenGL API as renderer backend.
     * @zh 使用 OpenGL API 作为渲染器后端。
     */
    public static RENDER_TYPE_OPENGL = 2;

    /**
     * @en The outer frame of the game canvas; parent of game container.
     * @zh 游戏画布的外框，container 的父容器。
     */
    public frame: HTMLDivElement | null = null;
    /**
     * @en The container of game canvas.
     * @zh 游戏画布的容器。
     */
    public container: HTMLDivElement | null = null;
    /**
     * @en The canvas of the game.
     * @zh 游戏的画布。
     */
    public canvas: HTMLCanvasElement | null = null;

    /**
     * @en The renderer backend of the game.
     * @zh 游戏的渲染器类型。
     */
    public renderType = -1;

    public eventTargetOn = super.on;
    public eventTargetOnce = super.once;

    /**
     * @en
     * The current game configuration,
     * please be noticed any modification directly on this object after the game initialization won't take effect.
     * @zh
     * 当前的游戏配置
     * 注意：请不要直接修改这个对象，它不会有任何效果。
     */
    public config: NormalizedGameConfig = {} as NormalizedGameConfig;

    /**
     * @en Callback when the scripts of engine have been load.
     * @zh 当引擎完成启动后的回调函数。
     * @method onStart
     */
    public onStart: Game.OnStart | null = null;

    /**
     * @en Indicates whether the engine and the renderer has been initialized
     * @zh 引擎和渲染器是否以完成初始化
     */
    public get inited () {
        return this._inited;
    }

    /**
     * @en Expected frame rate of the game.
     * @zh 游戏的设定帧率。
     */
    public get frameRate () {
        return this._frameRate;
    }
    public set frameRate (frameRate: number | string) {
        if (typeof frameRate !== 'number') {
            frameRate = parseInt(frameRate, 10);
            if (Number.isNaN(frameRate)) {
                frameRate = 60;
            }
        }
        this._frameRate = frameRate;
        this.frameTime = 1000 / frameRate;
        this._setAnimFrame();
    }

    /**
     * @en The delta time since last frame, unit: s.
     * @zh 获取上一帧的增量时间，以秒为单位。
     */
    public get deltaTime () {
        return this._deltaTime;
    }

    /**
     * @en The total passed time since game start, unit: ms
     * @zh 获取从游戏开始到现在总共经过的时间，以毫秒为单位
     */
    public get totalTime () {
        return performance.now() - this._initTime;
    }

    /**
     * @en The start time of the current frame.
     * @zh 获取当前帧开始的时间。
     */
    public get frameStartTime () {
        return this._startTime;
    }

    /**
     * @en The expected delta time of each frame
     * @zh 期望帧率对应的每帧时间
     */
    public frameTime = 1000 / 60;

    public collisionMatrix = [];
    public groupList: any[] = [];

    public _persistRootNodes = {};

    private _gfxDevice: Device | null = null;
    // states
    public _configLoaded = false; // whether config loaded
    public _isCloning = false;    // deserializing or instantiating
    private _inited = false;
    private _engineInited = false; // whether the engine has inited
    private _rendererInitialized = false;
    private _paused = true;
    // frame control
    private _frameRate = 60;
    private _intervalId = 0; // interval target of main
    private _initTime = 0;
    private _startTime = 0;
    private _deltaTime = 0.0;
    private declare _frameCB: (time: number) => void;

    // @Methods

    //  @Game play control

    /**
     * @en Set frame rate of game.
     * @zh 设置游戏帧率。
     * @deprecated since v3.3.0 please use [[game.frameRate]]
     */
    public setFrameRate (frameRate: number | string) {
        this.frameRate = frameRate;
    }

    /**
     * @en Get frame rate set for the game, it doesn't represent the real frame rate.
     * @zh 获取设置的游戏帧率（不等同于实际帧率）。
     * @return frame rate
     * @deprecated since v3.3.0 please use [[game.frameRate]]
     */
    public getFrameRate (): number {
        return this.frameRate as number;
    }

    /**
     * @en Run the game frame by frame with a fixed delta time correspond to frame rate.
     * @zh 以固定帧间隔执行一帧游戏循环，帧间隔与设定的帧率匹配。
     */
    public step () {
        legacyCC.director.tick(this.frameTime);
    }

    /**
     * @en Pause the game main loop. This will pause:<br>
     * game logic execution, rendering process, event manager, background music and all audio effects.<br>
     * This is different with `director.pause` which only pause the game logic execution.<br>
     * @zh 暂停游戏主循环。包含：游戏逻辑，渲染，事件处理，背景音乐和所有音效。这点和只暂停游戏逻辑的 `director.pause` 不同。
     */
    public pause () {
        if (this._paused) { return; }
        this._paused = true;
        if (this._intervalId) {
            window.cAF(this._intervalId);
            this._intervalId = 0;
        }
    }

    /**
     * @en Resume the game from pause. This will resume:<br>
     * game logic execution, rendering process, event manager, background music and all audio effects.<br>
     * @zh 恢复游戏主循环。包含：游戏逻辑，渲染，事件处理，背景音乐和所有音效。
     */
    public resume () {
        if (!this._paused) { return; }
        inputManager.clearEvents();
        if (this._intervalId) {
            window.cAF(this._intervalId);
            this._intervalId = 0;
        }
        this._paused = false;
        this._updateCallback();
        this._intervalId = window.rAF(this._frameCB);
    }

    /**
     * @en Check whether the game is paused.
     * @zh 判断游戏是否暂停。
     */
    public isPaused (): boolean {
        return this._paused;
    }

    /**
     * @en Restart game.
     * @zh 重新开始游戏
     */
    public restart (): Promise<void> {
        const afterDrawPromise = new Promise<void>((resolve) => legacyCC.director.once(legacyCC.Director.EVENT_AFTER_DRAW, () => resolve()) as void);
        return afterDrawPromise.then(() => {
            for (const id in this._persistRootNodes) {
                this.removePersistRootNode(this._persistRootNodes[id]);
            }

            // Clear scene
            legacyCC.director.getScene().destroy();
            legacyCC.Object._deferredDestroy();

            legacyCC.director.reset();
            this.pause();
            return this._setRenderPipelineNShowSplash().then(() => {
                this.resume();
                this._safeEmit(Game.EVENT_RESTART);
            });
        });
    }

    /**
     * @en End game, it will close the game window
     * @zh 退出游戏
     */
    public end () {
        systemInfo.close();
    }

    /**
     * @en
     * Register an callback of a specific event type on the game object.<br>
     * This type of event should be triggered via `emit`.<br>
     * @zh
     * 注册 game 的特定事件类型回调。这种类型的事件应该被 `emit` 触发。<br>
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.<br>
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     * @param once - After the first invocation, whether the callback should be unregistered.
     * @return - Just returns the incoming callback so you can save the anonymous function easier.
     */
    public on (type: string, callback: () => void, target?: any, once?: boolean): any {
        // Make sure EVENT_ENGINE_INITED callbacks to be invoked
        if ((this._engineInited && type === Game.EVENT_ENGINE_INITED)
        || (this._inited && type === Game.EVENT_GAME_INITED)
        || (this._rendererInitialized && type === Game.EVENT_RENDERER_INITED)) {
            callback.call(target);
        }
        return this.eventTargetOn(type, callback, target, once);
    }

    /**
     * @en
     * Register an callback of a specific event type on the game object,<br>
     * the callback will remove itself after the first time it is triggered.<br>
     * @zh
     * 注册 game 的特定事件类型回调，回调会在第一时间被触发后删除自身。
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.<br>
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     */
    public once (type: string, callback: () => void, target?: any): any {
        // Make sure EVENT_ENGINE_INITED callbacks to be invoked
        if (this._engineInited && type === Game.EVENT_ENGINE_INITED) {
            return callback.call(target);
        }
        return this.eventTargetOnce(type, callback, target);
    }

    /**
     * @en Init game with configuration object.
     * @zh 使用指定的配置初始化引擎。
     * @param config - Pass configuration object
     */
    public init (config: IGameConfig) {
        this._initConfig(config);
        // Init assetManager
        if (this.config.assetOptions) {
            legacyCC.assetManager.init(this.config.assetOptions);
        }

        if (this.config.layers) {
            const userLayers: LayerItem[] = this.config.layers;
            for (let i = 0; i < userLayers.length; i++) {
                const layer = userLayers[i];
                const bitNum = log2(layer.value);
                Layers.addLayer(layer.name, bitNum);
            }
        }

        return this._initEngine().then(() => {
            if (!EDITOR) {
                this._initEvents();
            }

            if (legacyCC.director.root && legacyCC.director.root.dataPoolManager) {
                legacyCC.director.root.dataPoolManager.jointTexturePool.registerCustomTextureLayouts(config.customJointTextureLayouts);
            }
            return this._engineInited;
        });
    }

    /**
     * @en Run game with configuration object and onStart function.
     * @zh 运行游戏，并且指定引擎配置和 onStart 的回调。
     * @param onStart - function to be executed after game initialized
     */
    public run(onStart?: Game.OnStart): Promise<void>;

    public run (configOrCallback?: Game.OnStart | IGameConfig, onStart?: Game.OnStart) {
        // To compatible with older version,
        // we allow the `run(config, onstart?)` form. But it's deprecated.
        let initPromise: Promise<boolean> | undefined;
        if (typeof configOrCallback !== 'function' && configOrCallback) {
            initPromise = this.init(configOrCallback);
            this.onStart = onStart ?? null;
        } else {
            this.onStart = configOrCallback ?? null;
        }

        return Promise.resolve(initPromise).then(() => this._setRenderPipelineNShowSplash());
    }

    //  @ Persist root node section
    /**
     * @en
     * Add a persistent root node to the game, the persistent node won't be destroyed during scene transition.<br>
     * The target node must be placed in the root level of hierarchy, otherwise this API won't have any effect.
     * @zh
     * 声明常驻根节点，该节点不会在场景切换中被销毁。<br>
     * 目标节点必须位于为层级的根节点，否则无效。
     * @param node - The node to be made persistent
     */
    public addPersistRootNode (node: Node) {
        if (!legacyCC.Node.isNode(node) || !node.uuid) {
            debug.warnID(3800);
            return;
        }
        const id = node.uuid;
        if (!this._persistRootNodes[id]) {
            const scene = legacyCC.director._scene;
            if (legacyCC.isValid(scene)) {
                if (!node.parent) {
                    node.parent = scene;
                } else if (!(node.parent instanceof legacyCC.Scene)) {
                    debug.warnID(3801);
                    return;
                } else if (node.parent !== scene) {
                    debug.warnID(3802);
                    return;
                } else {
                    node._originalSceneId = scene.uuid;
                }
            }
            this._persistRootNodes[id] = node;
            node._persistNode = true;
            legacyCC.assetManager._releaseManager._addPersistNodeRef(node);
        }
    }

    /**
     * @en Remove a persistent root node.
     * @zh 取消常驻根节点。
     * @param node - The node to be removed from persistent node list
     */
    public removePersistRootNode (node: Node) {
        const id = node.uuid || '';
        if (node === this._persistRootNodes[id]) {
            delete this._persistRootNodes[id];
            node._persistNode = false;
            node._originalSceneId = '';
            legacyCC.assetManager._releaseManager._removePersistNodeRef(node);
        }
    }

    /**
     * @en Check whether the node is a persistent root node.
     * @zh 检查节点是否是常驻根节点。
     * @param node - The node to be checked
     */
    public isPersistRootNode (node: { _persistNode: any; }): boolean {
        return !!node._persistNode;
    }

    //  @Engine loading

    private _initEngine () {
        this._initDevice();
        return Promise.resolve(legacyCC.director._init()).then(() => {
            // Log engine version
            debug.log(`Cocos Creator v${VERSION}`);
            this.emit(Game.EVENT_ENGINE_INITED);
            this._engineInited = true;
            if (legacyCC.internal.dynamicAtlasManager) { legacyCC.internal.dynamicAtlasManager.enabled = !macro.CLEANUP_IMAGE_CACHE; }
        });
    }

    // @Methods

    //  @Time ticker section
    private _setAnimFrame () {
        const frameRate = this._frameRate;
        if (JSB) {
            // @ts-expect-error JSB Call
            jsb.setPreferredFramesPerSecond(frameRate);
            window.rAF = window.requestAnimationFrame;
            window.cAF = window.cancelAnimationFrame;
        } else {
            const rAF = window.requestAnimationFrame = window.requestAnimationFrame
                     || window.webkitRequestAnimationFrame
                     || window.mozRequestAnimationFrame
                     || window.oRequestAnimationFrame
                     || window.msRequestAnimationFrame;
            if (frameRate !== 60 && frameRate !== 30) {
                window.rAF = this._stTime.bind(this);
                window.cAF = this._ctTime;
            } else {
                window.rAF = rAF || this._stTime.bind(this);
                window.cAF = window.cancelAnimationFrame
                    || window.cancelRequestAnimationFrame
                    || window.msCancelRequestAnimationFrame
                    || window.mozCancelRequestAnimationFrame
                    || window.oCancelRequestAnimationFrame
                    || window.webkitCancelRequestAnimationFrame
                    || window.msCancelAnimationFrame
                    || window.mozCancelAnimationFrame
                    || window.webkitCancelAnimationFrame
                    || window.ocancelAnimationFrame
                    || this._ctTime;

                // update callback function for 30 fps version
                this._updateCallback();
            }
        }
    }
    private _stTime (callback: () => void) {
        const currTime = performance.now();
        const elapseTime = Math.max(0, (currTime - this._startTime));
        const timeToCall = Math.max(0, this.frameTime - elapseTime);
        const id = window.setTimeout(callback, timeToCall);
        return id;
    }
    private _ctTime (id: number | undefined) {
        window.clearTimeout(id);
    }
    private _calculateDT (now?: number) {
        if (!now) now = performance.now();
        this._deltaTime = now > this._startTime ? (now - this._startTime) / 1000 : 0;
        this._startTime = now;
        return this._deltaTime;
    }

    private _updateCallback () {
        const director = legacyCC.director;
        let callback;
        if (!JSB && !RUNTIME_BASED && this._frameRate === 30) {
            let skip = true;
            callback = (time: number) => {
                this._intervalId = window.rAF(this._frameCB);
                skip = !skip;
                if (skip) {
                    return;
                }
                director.tick(this._calculateDT(time));
            };
        } else {
            callback = (time: number) => {
                director.tick(this._calculateDT(time));
                this._intervalId = window.rAF(this._frameCB);
            };
        }
        this._frameCB = callback;
    }

    // Run game.
    private _runMainLoop () {
        if (!this._inited || (EDITOR && !legacyCC.GAME_VIEW)) {
            return;
        }
        const config = this.config;
        const director = legacyCC.director;

        debug.setDisplayStats(!!config.showFPS);
        director.startAnimation();
        this.resume();
    }

    // @Game loading section
    private _initConfig (config: IGameConfig) {
        // Configs adjustment
        if (typeof config.debugMode !== 'number') {
            config.debugMode = debug.DebugMode.NONE;
        }
        config.exposeClassName = !!config.exposeClassName;
        if (typeof config.frameRate !== 'number') {
            config.frameRate = 60;
        }
        const renderMode = config.renderMode;
        if (typeof renderMode !== 'number' || renderMode > 2 || renderMode < 0) {
            config.renderMode = 0;
        }
        config.showFPS = !!config.showFPS;

        debug._resetDebugSetting(config.debugMode);

        this.config = config as NormalizedGameConfig;
        this._configLoaded = true;

        this.frameRate = config.frameRate;
    }

    private _determineRenderType () {
        const config = this.config;
        const userRenderMode = parseInt(config.renderMode as any, 10);

        // Determine RenderType
        this.renderType = Game.RENDER_TYPE_CANVAS;
        let supportRender = false;

        if (userRenderMode === 0) {
            if (sys.capabilities.opengl) {
                this.renderType = Game.RENDER_TYPE_WEBGL;
                supportRender = true;
            } else if (sys.capabilities.canvas) {
                this.renderType = Game.RENDER_TYPE_CANVAS;
                supportRender = true;
            }
        } else if (userRenderMode === 1 && sys.capabilities.canvas) {
            this.renderType = Game.RENDER_TYPE_CANVAS;
            supportRender = true;
        } else if (userRenderMode === 2 && sys.capabilities.opengl) {
            this.renderType = Game.RENDER_TYPE_WEBGL;
            supportRender = true;
        }

        if (!supportRender) {
            throw new Error(debug.getError(3820, userRenderMode));
        }
    }

    private _initDevice () {
        // Avoid setup to be called twice.
        if (this._rendererInitialized) { return; }

        // Obtain platform-related objects through the adapter
        const adapter = this.config.adapter;
        if (adapter) {
            this.canvas = adapter.canvas;
            this.frame = adapter.frame;
            this.container = adapter.container;
        }

        // The test environment does not currently support the renderer
        if (TEST) return;

        this._determineRenderType();

        // WebGL context created successfully
        if (this.renderType === Game.RENDER_TYPE_WEBGL) {
            const ctors: Constructor<Device>[] = [];

            const opts = new DeviceInfo(
                this.canvas as HTMLCanvasElement,
                EDITOR || macro.ENABLE_WEBGL_ANTIALIAS,
                false,
                window.devicePixelRatio,
                sys.windowPixelResolution.width,
                sys.windowPixelResolution.height,
                bindingMappingInfo,
            );

            if (JSB && window.gfx) {
                this._gfxDevice = gfx.DeviceManager.create(opts);
            } else {
                let useWebGL2 = (!!window.WebGL2RenderingContext);
                const userAgent = window.navigator.userAgent.toLowerCase();
                if (userAgent.indexOf('safari') !== -1 && userAgent.indexOf('chrome') === -1
                    || sys.browserType === BrowserType.UC // UC browser implementation doesn't conform to WebGL2 standard
                ) {
                    useWebGL2 = false;
                }
                if (useWebGL2 && legacyCC.WebGL2Device) {
                    ctors.push(legacyCC.WebGL2Device);
                }
                if (legacyCC.WebGLDevice) {
                    ctors.push(legacyCC.WebGLDevice);
                }

                for (let i = 0; i < ctors.length; i++) {
                    this._gfxDevice = new ctors[i]();
                    if (this._gfxDevice.initialize(opts)) { break; }
                }
            }
        }

        if (!this._gfxDevice) {
            // todo fix here for wechat game
            debug.error('can not support canvas rendering in 3D');
            this.renderType = Game.RENDER_TYPE_CANVAS;
            return;
        }

        this.canvas!.oncontextmenu = () => false;
    }

    private _initEvents () {
        systemInfo.on('show', this._onShow, this);
        systemInfo.on('hide', this._onHide, this);
    }

    private _onHide () {
        this.emit(Game.EVENT_HIDE);
        this.pause();
    }

    private _onShow () {
        this.emit(Game.EVENT_SHOW);
        this.resume();
    }

    private _setRenderPipelineNShowSplash () {
        // The test environment does not currently support the renderer
        if (TEST) {
            return Promise.resolve((() => {
                this._rendererInitialized = true;
                this._safeEmit(Game.EVENT_RENDERER_INITED);
                this._inited = true;
                this._setAnimFrame();
                this._runMainLoop();
                this._safeEmit(Game.EVENT_GAME_INITED);
                if (this.onStart) {
                    this.onStart();
                }
            })());
        }
        return Promise.resolve(this._setupRenderPipeline()).then(
            () => Promise.resolve(this._showSplashScreen()).then(
                () => {
                    this._inited = true;
                    this._initTime = performance.now();
                    this._runMainLoop();
                    this._safeEmit(Game.EVENT_GAME_INITED);
                    if (this.onStart) {
                        this.onStart();
                    }
                },
            ),
        );
    }

    private _setupRenderPipeline () {
        const { renderPipeline } = this.config;
        if (!renderPipeline) {
            return this._setRenderPipeline();
        }
        return new Promise<RenderPipeline>((resolve, reject) => {
            legacyCC.assetManager.loadAny(renderPipeline, (err, asset) => ((err || !(asset instanceof RenderPipeline))
                ? reject(err)
                : resolve(asset)));
        }).then((asset) => {
            this._setRenderPipeline(asset);
        }).catch((reason) => {
            debug.warn(reason);
            debug.warn(`Failed load render pipeline: ${renderPipeline}, engine failed to initialize, will fallback to default pipeline`);
            this._setRenderPipeline();
        });
    }

    private _showSplashScreen () {
        if (!EDITOR && !PREVIEW && legacyCC.internal.SplashScreen) {
            const splashScreen = legacyCC.internal.SplashScreen.instance as SplashScreen;
            splashScreen.main(legacyCC.director.root);
            return new Promise<void>((resolve) => {
                splashScreen.setOnFinish(() => resolve());
                splashScreen.loadFinish = true;
            });
        }
        return null;
    }

    private _setRenderPipeline (rppl?: RenderPipeline) {
        if (!legacyCC.director.root.setRenderPipeline(rppl)) {
            this._setRenderPipeline();
        }

        this._rendererInitialized = true;
        this._safeEmit(Game.EVENT_RENDERER_INITED);
    }

    private _safeEmit (event) {
        if (EDITOR) {
            try {
                this.emit(event);
            } catch (e) {
                debug.warn(e);
            }
        } else {
            this.emit(event);
        }
    }
}

export declare namespace Game {
    export type OnStart = () => void;
}

legacyCC.Game = Game;

/**
 * @en
 * This is a Game instance.
 * @zh
 * 这是一个 Game 类的实例，包含游戏主体信息并负责驱动游戏的游戏对象。
 */
export const game = legacyCC.game = new Game();

type NormalizedGameConfig = IGameConfig & {
    frameRate: NonNullable<IGameConfig['frameRate']>;
};
