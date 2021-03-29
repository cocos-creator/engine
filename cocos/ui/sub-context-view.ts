/*
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
 * @module component
 */

import { ccclass, help, menu, executionOrder, requireComponent, tooltip, serializable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { mg } from 'pal/minigame';
import { Component } from '../core/components/component';
import { view } from '../core/platform/view';
import { Sprite } from '../2d/components/sprite';
import { Node } from '../core/scene-graph';
import { UITransform } from '../2d/framework/ui-transform';

import { SpriteFrame } from '../2d/assets';
import { ImageAsset } from '../core/assets/image-asset';
import { Rect, Size } from '../core/math';

import { legacyCC } from '../core/global-exports';
import { CCObject } from '../core';

/**
 * @en SubContextView is a view component which controls open data context viewport in WeChat game platform.<br/>
 * The component's node size decide the viewport of the sub context content in main context,
 * the entire sub context texture will be scaled to the node's bounding box area.<br/>
 * This component provides multiple important features:<br/>
 * 1. Sub context could use its own resolution size and policy.<br/>
 * 2. Sub context could be minized to smallest size it needed.<br/>
 * 3. Resolution of sub context content could be increased.<br/>
 * 4. User touch input is transformed to the correct viewport.<br/>
 * 5. Texture update is handled by this component. User don't need to worry.<br/>
 * One important thing to be noted, whenever the node's bounding box change,
 * you need to manually reset the viewport of sub context using updateSubContextViewport.
 * @zh SubContextView 可以用来控制微信小游戏平台开放数据域在主域中的视窗的位置。<br/>
 * 这个组件的节点尺寸决定了开放数据域内容在主域中的尺寸，整个开放数据域会被缩放到节点的包围盒范围内。<br/>
 * 在这个组件的控制下，用户可以更自由得控制开放数据域：<br/>
 * 1. 子域中可以使用独立的设计分辨率和适配模式<br/>
 * 2. 子域区域尺寸可以缩小到只容纳内容即可<br/>
 * 3. 子域的分辨率也可以被放大，以便获得更清晰的显示效果<br/>
 * 4. 用户输入坐标会被自动转换到正确的子域视窗中<br/>
 * 5. 子域内容贴图的更新由组件负责，用户不需要处理<br/>
 * 唯一需要注意的是，当子域节点的包围盒发生改变时，开发者需要使用 `updateSubContextViewport` 来手动更新子域视窗。
 */
@ccclass('cc.SubContextView')
@help('i18n:cc.SubContextView')
@executionOrder(110)
@requireComponent(UITransform)
@menu('Miscellaneous/SubContextView')
export class SubContextView extends Component {
    @tooltip('i18n:subContextView.design_size')
    get designResolutionSize () {
        return this._designResolutionSize;
    }
    set designResolutionSize (value) {
        if (!EDITOR || value.equals(this._designResolutionSize)) {
            return;
        }
        this._designResolutionSize.set(value);
    }

    @tooltip('i18n:subContextView.fps')
    get fps () {
        return this._fps;
    }
    set fps (value) {
        if (this._fps === value) {
            return;
        }
        this._fps = value;
        this._updateInterval = 1000 / value;
    }

    @serializable
    private _fps = 60;
    private _sprite: Sprite | null;
    private _imageAsset: ImageAsset;
    private _updatedTime = 0;
    private _updateInterval = 0;
    private _openDataContext: any;
    private _content: Node;
    @serializable
    private _designResolutionSize: Size = new Size(640, 960);

    constructor () {
        super();
        this._content = new Node('content');
        this._content.hideFlags = CCObject.HideFlags.DontSave;
        this._sprite = null;
        this._imageAsset = new ImageAsset();
        this._openDataContext = null;
        this._updatedTime = performance.now();
    }

    public onLoad () {
        if (mg.getOpenDataContext) {
            this._updateInterval = 1000 / this._fps;
            this._openDataContext = mg.getOpenDataContext();
            this._initSharedCanvas();
            this._initContentNode();
            this._updateSubContextView();
        } else {
            this.enabled = false;
        }
    }

    public onEnable () {
        this._registerNodeEvent();
    }

    public onDisable () {
        this._unregisterNodeEvent();
    }

    private _initSharedCanvas () {
        if (this._openDataContext) {
            const sharedCanvas = this._openDataContext.canvas;
            sharedCanvas.width = this._designResolutionSize.width;
            sharedCanvas.height = this._designResolutionSize.height;
        }
    }

    private _initContentNode () {
        if (this._openDataContext) {
            const sharedCanvas = this._openDataContext.canvas;

            const image = this._imageAsset;
            image.reset(sharedCanvas);
            image._texture.create(sharedCanvas.width, sharedCanvas.height);

            this._sprite = this._content.getComponent(Sprite);
            if (!this._sprite) {
                this._sprite = this._content.addComponent(Sprite);
            }

            if (this._sprite.spriteFrame) {
                this._sprite.spriteFrame.texture = this._imageAsset._texture;
            } else {
                const sp = new SpriteFrame();
                sp.texture = this._imageAsset._texture;
                this._sprite.spriteFrame = sp;
            }

            this._content.parent = this.node;
        }
    }

    private _updateSubContextView () {
        if (!(this._openDataContext && mg.getSystemInfoSync)) {
            return;
        }

        // update subContextView size
        // use SHOW_ALL policy to adapt subContextView
        const nodeTrans = this.node.getComponent(UITransform) as UITransform;
        const contentTrans = this._content.getComponent(UITransform) as UITransform;

        const scaleX = nodeTrans.width / contentTrans.width;
        const scaleY = nodeTrans.height / contentTrans.height;
        const scale = scaleX > scaleY ? scaleY : scaleX;
        contentTrans.width *= scale;
        contentTrans.height *= scale;

        // update viewport in subContextView
        const systemInfo = mg.getSystemInfoSync();
        const box = contentTrans.getBoundingBoxToWorld();
        const visibleSize = view.getVisibleSize();

        const x = systemInfo.screenWidth * (box.x / visibleSize.width);
        const y = systemInfo.screenHeight * (box.y / visibleSize.height);
        const width = systemInfo.screenWidth * (box.width / visibleSize.width);
        const height = systemInfo.screenHeight * (box.height / visibleSize.height);

        this._openDataContext.postMessage({
            fromEngine: true,  // compatible deprecated property
            type: 'engine',
            event: 'viewport',
            x,
            y,
            width,
            height,
        });
    }

    private _updateSubContextTexture () {
        const img = this._imageAsset;
        if (!img || !this._openDataContext) {
            return;
        }

        if (img.width <= 0 || img.height <= 0) {
            return;
        }

        const sharedCanvas = this._openDataContext.canvas;
        img.reset(sharedCanvas);
        if (sharedCanvas.width > img.width || sharedCanvas.height > img.height) {
            this._imageAsset._texture.create(sharedCanvas.width, sharedCanvas.height);
        }

        this._imageAsset._texture.uploadData(sharedCanvas);
    }

    private _registerNodeEvent () {
        this.node.on(Node.EventType.TRANSFORM_CHANGED, this._updateSubContextView, this);
        this.node.on(Node.EventType.SIZE_CHANGED, this._updateSubContextView, this);
    }

    private _unregisterNodeEvent () {
        this.node.off(Node.EventType.TRANSFORM_CHANGED, this._updateSubContextView, this);
        this.node.off(Node.EventType.SIZE_CHANGED, this._updateSubContextView, this);
    }

    public update (dt?: number) {
        const calledUpdateManually = (dt === undefined);
        if (calledUpdateManually) {
            this._updateSubContextTexture();
            return;
        }
        const now = performance.now();
        const deltaTime = (now - this._updatedTime);
        if (deltaTime >= this._updateInterval) {
            this._updatedTime += this._updateInterval;
            this._updateSubContextTexture();
        }
    }
}
legacyCC.SubContextView = SubContextView;
