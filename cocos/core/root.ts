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

/**
 * @packageDocumentation
 * @module core
 */

import { JSB } from 'internal:constants';
import { builtinResMgr } from './builtin';
import { Pool } from './memop';
import { RenderPipeline, createDefaultPipeline, DeferredPipeline } from './pipeline';
import { Camera, Light, Model, NativeRoot } from './renderer/scene';
import { DataPoolManager } from '../3d/skeletal-animation/data-pool-manager';
import { LightType } from './renderer/scene/light';
import { IRenderSceneInfo, RenderScene } from './renderer/scene/render-scene';
import { SphereLight } from './renderer/scene/sphere-light';
import { SpotLight } from './renderer/scene/spot-light';
import { Batcher2D } from '../2d/renderer/batcher-2d';
import { legacyCC } from './global-exports';
import { RenderWindow, IRenderWindowInfo } from './renderer/core/render-window';
import { ColorAttachment, DepthStencilAttachment, RenderPassInfo, StoreOp, Device } from './gfx';
import { warnID } from './platform/debug';

/**
 * @zh
 * Root描述信息
 */
export interface IRootInfo {
    enableHDR?: boolean;
}

/**
 * @zh
 * 场景描述信息
 */
export interface ISceneInfo {
    name: string;
}

/**
 * @zh
 * Root类
 */
export class Root {
    private _init (): void {
        if (JSB) {
            this._naitveObj = new NativeRoot();
        }
    }

    private _destroy (): void {
        if (JSB) {
            this._naitveObj = null;
        }
    }

    private _setCumulativeTime (deltaTime: number): void {
        this._cumulativeTime += deltaTime;
        if (JSB) {
            this._naitveObj.cumulativeTime = this._cumulativeTime;
        }
    }

    private _setFrameTime (deltaTime: number): void {
        this._frameTime = deltaTime;
        if (JSB) {
            this._naitveObj.frameTime = deltaTime;
        }
    }

    /**
     * @zh
     * GFX 设备
     */
    public get device (): Device {
        return this._device;
    }

    /**
     * @zh
     * 主窗口
     */
    public get mainWindow (): RenderWindow | null {
        return this._mainWindow;
    }

    /**
     * @zh
     * 当前窗口
     */
    public set curWindow (window: RenderWindow | null) {
        this._curWindow = window;
    }

    public get curWindow (): RenderWindow | null {
        return this._curWindow;
    }

    /**
     * @zh
     * 临时窗口（用于数据传输）
     */
    public set tempWindow (window: RenderWindow | null) {
        this._tempWindow = window;
    }

    public get tempWindow (): RenderWindow | null {
        return this._tempWindow;
    }

    /**
     * @zh
     * 窗口列表
     */
    public get windows (): RenderWindow[] {
        return this._windows;
    }

    /**
     * @zh
     * 渲染管线
     */
    public get pipeline (): RenderPipeline {
        return this._pipeline!;
    }

    /**
     * @zh
     * UI实例
     * 引擎内部使用，用户无需调用此接口
     */
    public get batcher2D (): Batcher2D {
        return this._batcher as Batcher2D;
    }

    /**
     * @zh
     * 场景列表
     */
    public get scenes (): RenderScene[] {
        return this._scenes;
    }

    /**
     * @zh
     * 累计时间（秒）
     */
    public get cumulativeTime (): number {
        return this._cumulativeTime;
    }

    /**
     * @zh
     * 帧时间（秒）
     */
    public get frameTime (): number {
        return this._frameTime;
    }

    /**
     * @zh
     * 一秒内的累计帧数
     */
    public get frameCount (): number {
        return this._frameCount;
    }

    /**
     * @zh
     * 每秒帧率
     */
    public get fps (): number {
        return this._fps;
    }

    /**
     * @zh
     * 每秒固定帧率
     */
    public set fixedFPS (fps: number) {
        if (fps > 0) {
            this._fixedFPS = fps;
            this._fixedFPSFrameTime = 1000.0 / fps;
        } else {
            this._fixedFPSFrameTime = 0;
        }
    }

    public get fixedFPS (): number {
        return this._fixedFPS;
    }

    public get dataPoolManager () {
        return this._dataPoolMgr;
    }

    get useDeferredPipeline () : boolean {
        return this._useDeferredPipeline;
    }

    public _createSceneFun: (root: Root) => RenderScene = null!;
    public _createWindowFun: (root: Root) => RenderWindow = null!;

    private _device: Device;
    private _windows: RenderWindow[] = [];
    private _mainWindow: RenderWindow | null = null;
    private _curWindow: RenderWindow | null = null;
    private _tempWindow: RenderWindow | null = null;
    private _pipeline: RenderPipeline | null = null;
    private _batcher: Batcher2D | null = null;
    private _dataPoolMgr: DataPoolManager;
    private _scenes: RenderScene[] = [];
    private _modelPools = new Map<Constructor<Model>, Pool<Model>>();
    private _cameraPool: Pool<Camera> | null = null;
    private _lightPools = new Map<Constructor<Light>, Pool<Light>>();
    private _fpsTime = 0;
    private _frameCount = 0;
    private _fps = 0;
    private _fixedFPS = 0;
    private _useDeferredPipeline = false;
    private _fixedFPSFrameTime = 0;
    private _cumulativeTime = 0;
    private _frameTime = 0;
    private declare _naitveObj: any;

    /**
     * 构造函数
     * @param device GFX 设备
     */
    constructor (device: Device) {
        this._device = device;
        this._dataPoolMgr = legacyCC.internal.DataPoolManager && new legacyCC.internal.DataPoolManager(device) as DataPoolManager;

        RenderScene.registerCreateFunc(this);
        RenderWindow.registerCreateFunc(this);

        this._cameraPool = new Pool(() => new Camera(this._device), 4);
    }

    /**
     * @zh
     * 初始化函数
     * @param info Root描述信息
     */
    public initialize (info: IRootInfo): Promise<void> {
        this._init();

        const colorAttachment = new ColorAttachment();
        const depthStencilAttachment = new DepthStencilAttachment();
        depthStencilAttachment.depthStoreOp = StoreOp.DISCARD;
        depthStencilAttachment.stencilStoreOp = StoreOp.DISCARD;
        const renderPassInfo = new RenderPassInfo([colorAttachment], depthStencilAttachment);
        this._mainWindow = this.createWindow({
            title: 'rootMainWindow',
            width: this._device.width,
            height: this._device.height,
            renderPassInfo,
            swapchainBufferIndices: -1, // always on screen
        });
        this._curWindow = this._mainWindow;

        return Promise.resolve(builtinResMgr.initBuiltinRes(this._device)).then(() => {
            legacyCC.view.on('design-resolution-changed', () => {
                const width = legacyCC.game.canvas.width;
                const height = legacyCC.game.canvas.height;
                this.resize(width, height);
            }, this);
        });
    }

    public destroy () {
        this.destroyScenes();

        if (this._pipeline) {
            this._pipeline.destroy();
            this._pipeline = null;
        }

        if (this._batcher) {
            this._batcher.destroy();
            this._batcher = null;
        }

        this._curWindow = null;
        this._mainWindow = null;
        this.dataPoolManager.clear();

        this._destroy();
    }

    /**
     * @zh
     * 重置大小
     * @param width 屏幕宽度
     * @param height 屏幕高度
     */
    public resize (width: number, height: number) {
        // const w = width / cc.view._devicePixelRatio;
        // const h = height / cc.view._devicePixelRatio;

        this._device.resize(width, height);

        this._mainWindow!.resize(width, height);

        for (const window of this._windows) {
            if (window.shouldSyncSizeWithSwapchain) {
                window.resize(width, height);
            }
        }

        if (this._pipeline) {
            this._pipeline.resize(width, height);
        }
    }

    public setRenderPipeline (rppl: RenderPipeline): boolean {
        if (rppl instanceof DeferredPipeline) {
            this._useDeferredPipeline = true;
        }

        if (!rppl) {
            rppl = createDefaultPipeline();
        }
        this._pipeline = rppl;

        if (!this._pipeline.activate()) {
            return false;
        }

        const scene = legacyCC.director.getScene();
        if (scene) {
            scene.globals.activate();
        }

        this.onGlobalPipelineStateChanged();
        if (!this._batcher && legacyCC.internal.Batcher2D) {
            this._batcher = new legacyCC.internal.Batcher2D(this) as Batcher2D;
            if (!this._batcher.initialize()) {
                this.destroy();
                return false;
            }
        }

        return true;
    }

    public onGlobalPipelineStateChanged () {
        for (let i = 0; i < this._scenes.length; i++) {
            this._scenes[i].onGlobalPipelineStateChanged();
        }

        this._pipeline!.pipelineSceneData.onGlobalPipelineStateChanged();
    }

    /**
     * @zh
     * 激活指定窗口为当前窗口
     * @param window GFX 窗口
     */
    public activeWindow (window: RenderWindow) {
        this._curWindow = window;
    }

    /**
     * @zh
     * 重置累计时间
     */
    public resetCumulativeTime () {
        this._setCumulativeTime(0);
    }

    /**
     * @zh
     * 每帧执行函数
     * @param deltaTime 间隔时间
     */
    public frameMove (deltaTime: number) {
        this._setFrameTime(deltaTime);

        /*
        if (this._fixedFPSFrameTime > 0) {

            const elapsed = this._frameTime * 1000.0;
            if (this._fixedFPSFrameTime > elapsed) {

                setTimeout(function () {}, this._fixedFPSFrameTime - elapsed);
            }
        }
        */

        ++this._frameCount;
        this._setCumulativeTime(deltaTime);
        this._fpsTime += deltaTime;
        if (this._fpsTime > 1.0) {
            this._fps = this._frameCount;
            this._frameCount = 0;
            this._fpsTime = 0.0;
        }
        for (let i = 0; i < this._scenes.length; ++i) {
            this._scenes[i].removeBatches();
        }
        if (this._batcher) this._batcher.update();

        const windows = this._windows;
        const cameraList: Camera[] = [];
        for (let i = 0; i < windows.length; i++) {
            const window = windows[i];
            window.extractRenderCameras(cameraList);
        }

        if (this._pipeline && cameraList.length > 0) {
            this._device.acquire();
            const scenes = this._scenes;
            const stamp = legacyCC.director.getTotalFrames();
            if (this._batcher) this._batcher.uploadBuffers();

            for (let i = 0; i < scenes.length; i++) {
                scenes[i].update(stamp);
            }

            legacyCC.director.emit(legacyCC.Director.EVENT_BEFORE_COMMIT);
            cameraList.sort((a: Camera, b: Camera) => a.priority - b.priority);
            this._pipeline.render(cameraList);
            this._device.present();
        }

        if (this._batcher) this._batcher.reset();
    }

    /**
     * @zh
     * 创建窗口
     * @param info GFX 窗口描述信息
     */
    public createWindow (info: IRenderWindowInfo): RenderWindow | null {
        const window = this._createWindowFun(this);
        window.initialize(this.device, info);
        this._windows.push(window);
        return window;
    }

    /**
     * @zh
     * 销毁指定的窗口
     * @param window GFX 窗口
     */
    public destroyWindow (window: RenderWindow) {
        for (let i = 0; i < this._windows.length; ++i) {
            if (this._windows[i] === window) {
                window.destroy();
                this._windows.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @zh
     * 销毁全部窗口
     */
    public destroyWindows () {
        for (const window of this._windows) {
            window.destroy();
        }
        this._windows = [];
    }

    /**
     * @zh
     * 创建渲染场景
     * @param info 渲染场景描述信息
     */
    public createScene (info: IRenderSceneInfo): RenderScene {
        const scene: RenderScene = this._createSceneFun(this);
        scene.initialize(info);
        this._scenes.push(scene);
        return scene;
    }

    /**
     * @zh
     * 销毁指定的渲染场景
     * @param scene 渲染场景
     */
    public destroyScene (scene: RenderScene) {
        for (let i = 0; i < this._scenes.length; ++i) {
            if (this._scenes[i] === scene) {
                scene.destroy();
                this._scenes.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @zh
     * 销毁全部场景
     */
    public destroyScenes () {
        for (const scene of this._scenes) {
            scene.destroy();
        }
        this._scenes = [];
    }

    public createModel<T extends Model> (ModelCtor: typeof Model): T {
        let p = this._modelPools.get(ModelCtor);
        if (!p) {
            this._modelPools.set(ModelCtor, new Pool(() => new ModelCtor(), 10));
            p = this._modelPools.get(ModelCtor)!;
        }
        const model = p.alloc() as T;
        model.initialize();
        return model;
    }

    public destroyModel (m: Model) {
        const p = this._modelPools.get(m.constructor as Constructor<Model>);
        if (p) {
            p.free(m);
            m.destroy();
            if (m.scene) {
                m.scene.removeModel(m);
            }
        } else {
            warnID(1300, m.constructor.name);
        }
    }

    public createCamera (): Camera {
        return this._cameraPool!.alloc();
    }

    public createLight<T extends Light> (LightCtor: new () => T): T {
        let l = this._lightPools.get(LightCtor);
        if (!l) {
            this._lightPools.set(LightCtor, new Pool(() => new LightCtor(), 4));
            l = this._lightPools.get(LightCtor)!;
        }
        const light = l.alloc() as T;
        light.initialize();
        return light;
    }

    public destroyLight (l: Light) {
        const p = this._lightPools.get(l.constructor as Constructor<Light>);
        l.destroy();
        if (p) {
            p.free(l);
            if (l.scene) {
                switch (l.type) {
                case LightType.SPHERE:
                    l.scene.removeSphereLight(l as SphereLight);
                    break;
                case LightType.SPOT:
                    l.scene.removeSpotLight(l as SpotLight);
                    break;
                default:
                    break;
                }
            }
        }
    }
}

legacyCC.Root = Root;
