/*
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
*/

/**
 * 内置资源
 * @category asset
 */

import { ccclass } from '../core/data/class-decorator';
import { Rect, Size, Vec2 } from '../core/value-types';
import { vec2 } from '../core/vmath';
import { ImageAsset } from './image-asset';
import { ITexture2DSerializeData, Texture2D } from './texture-2d';
import * as textureUtil from './texture-util';

const INSET_LEFT = 0;
const INSET_TOP = 1;
const INSET_RIGHT = 2;
const INSET_BOTTOM = 3;

export interface IUV {
    u: number;
    v: number;
}

interface IVertices {
    x: any;
    y: any;
    triangles: any;
    nu: number[];
    u: number[];
    nv: number[];
    v: number[];
}

interface ISpriteFramesSerializeData extends ITexture2DSerializeData{
    name: string;
    texture: string | undefined;
    atlas: string | undefined;
    rect: number[] | undefined;
    offset: number[] | undefined;
    originalSize: number[] | undefined;
    rotated: boolean | undefined;
    capInsets: number[];
    vertices: IVertices;
}

interface ISpriteFrameOriginal{
    texture: Texture2D;
    x: number;
    y: number;
}

const temp_uvs: IUV[] = [{ u: 0, v: 0 }, { u: 0, v: 0 }, { u: 0, v: 0 }, { u: 0, v: 0 }];

/**
 * @en
 * A cc.SpriteFrame has:<br/>
 *  - texture: A cc.Texture2D that will be used by render components<br/>
 *  - rectangle: A rectangle of the texture
 *
 * @zh
 * 精灵帧资源。
 * 一个 SpriteFrame 包含：<br/>
 *  - 纹理：会被渲染组件使用的 Texture2D 对象。<br/>
 *  - 矩形：在纹理中的矩形区域。
 * 可通过 cc.SpriteFrame 获取该组件。
 *
 * @example
 * ```typescript
 * var self = this;
 * var url = "assets/PurpleMonster/icon/icon";
 * cc.loader.loadRes(url, function (err, spriteFrame) {
 *   var node = new cc.Node("New Sprite");
 *   var sprite = node.addComponent(cc.SpriteComponent);
 *   sprite.spriteFrame = spriteFrame;
 *   node.parent = self.node;
 * });
 * ```
 */
@ccclass('cc.SpriteFrame')
export class SpriteFrame extends Texture2D {
    // Use this property to set texture when loading dependency
    // @property
    // set _textureSetter(texture) {
    //     if (texture) {
    //         if (CC_EDITOR && !(texture instanceof cc.Texture2D)) {
    //             // just building
    //             this._texture = texture;
    //             return;
    //         }
    //         if (this._texture !== texture) {
    //             this._refreshTexture(texture);
    //         }
    //         this._textureFilename = texture.url;
    //     }
    // }

    // _textureFilename: {
    //     get () {
    //         return (this._texture && this._texture.url) || "";
    //     },
    //     set (url) {
    //         let texture = cc.textureCache.addImage(url);
    //         this._refreshTexture(texture);
    //     }
    // }

    /**
     * @en
     * Top border of the sprite.
     *
     * @zh
     * sprite 的顶部边框。
     */
    get insetTop () {
        return this._capInsets[INSET_TOP];
    }

    set insetTop (value) {
        this._capInsets[INSET_TOP] = value;
        if (this.image) {
            this._calculateSlicedUV();
        }
    }

    /**
     * @en
     * Bottom border of the sprite.
     *
     * @zh
     * sprite 的底部边框。
     */
    get insetBottom () {
        return this._capInsets[INSET_BOTTOM];
    }

    set insetBottom (value) {
        this._capInsets[INSET_BOTTOM] = value;
        if (this.image) {
            this._calculateSlicedUV();
        }
    }

    /**
     * @en
     * Left border of the sprite.
     *
     * @zh
     * sprite 的左边边框。
     */
    get insetLeft () {
        return this._capInsets[INSET_LEFT];
    }

    set insetLeft (value) {
        this._capInsets[INSET_LEFT] = value;
        if (this.image) {
            this._calculateSlicedUV();
        }
    }

    /**
     * @en
     * Right border of the sprite.
     *
     * @zh
     * sprite 的左边边框。
     */
    get insetRight () {
        return this._capInsets[INSET_RIGHT];
    }

    set insetRight (value) {
        this._capInsets[INSET_RIGHT] = value;
        if (this.image) {
            this._calculateSlicedUV();
        }
    }

    get atlasUuid () {
        return this._atlasUuid;
    }

    set atlasUuid (value: string) {
        this._atlasUuid = value;
    }

    get original (){
        return this._original;
    }

    public vertices: IVertices | null = null;

    /**
     * @zh
     * 不带裁切的 UV。
     */
    public uv: number[] = [];

    /**
     * @zh
     * 带有裁切的 UV。
     */
    public uvSliced: IUV[] = [];

    // the location of the sprite on rendering texture
    private _rect = new Rect();

    // for trimming
    private _offset = new Vec2();

    // for trimming
    private _originalSize = new Size();

    private _rotated = false;

    private _capInsets = [0, 0, 0, 0];

    // store original info before packed to dynamic atlas
    private _original: ISpriteFrameOriginal | null = null;

    private _atlasUuid: string = '';

    constructor () {
        super();

        // let filename = arguments[0];
        // const rect = arguments[0];
        // const rotated = arguments[1];
        // const offset = arguments[2];
        // const originalSize = arguments[3];

        // this._texture = null;
        // this._textureFilename = '';

        // this._capInsets[INSET_BOTTOM] = 0;
        // this._capInsets[INSET_LEFT] = 0;
        // this._capInsets[INSET_RIGHT] = 0;
        // this._capInsets[INSET_TOP] = 0;

        if (CC_EDITOR) {
            // Atlas asset uuid
            this._atlasUuid = '';
        }
        // if (filename !== undefined) {
        //     this.setTexture(filename, rect, rotated, offset, originalSize);
        // } else {
        //     //todo log Error
        // }
    }

    /**
     * @en
     * Returns whether the texture have been loaded.
     *
     * @zh
     * 返回是否已加载纹理。
     */
    public textureLoaded () {
        return this.loaded;
    }

    /**
     * @en
     * Returns whether the sprite frame is rotated in the texture.
     *
     * @zh
     * 获取 SpriteFrame 是否旋转。
     */
    public isRotated () {
        return this._rotated;
    }

    /**
     * @en
     * Set whether the sprite frame is rotated in the texture.
     *
     * @zh
     * 设置 SpriteFrame 是否旋转。
     * @param value
     */
    public setRotated (rotated: boolean) {
        this._rotated = rotated;
    }

    /**
     * @en
     * Returns the rect of the sprite frame in the texture.
     * If it's a atlas texture, a transparent pixel area is proposed for the actual mapping of the current texture.
     *
     * @zh
     * 获取 SpriteFrame 的纹理矩形区域。
     * 如果是一个 atlas 的贴图，则为当前贴图的实际提出透明像素区域。
     */
    public getRect (out?: Rect) {
        if (out) {
            out.set(this._rect);
            return out;
        }

        return this._rect.clone();
    }

    /**
     * @en
     * Sets the rect of the sprite frame in the texture.
     *
     * @zh
     * 设置 SpriteFrame 的纹理矩形区域。
     */
    public setRect (rect: Rect) {
        this._rect = rect;
    }

    /**
     * @en
     * Returns the original size of the trimmed image.
     *
     * @zh
     * 获取修剪前的原始大小。
     */
    public getOriginalSize (out?: Size) {
        if (out) {
            out.set(this._originalSize);
            return out;
        }

        return this._originalSize.clone();
    }

    /**
     * @en
     * Sets the original size of the trimmed image.
     *
     * @zh
     * 设置修剪前的原始大小。
     *
     * @param size - 设置精灵原始大小。
     */
    public setOriginalSize (size: Size) {
        this._originalSize.set(size);
    }

    // resource initialization assignment
    public _setBorder (l: number, b: number, r: number, t: number){
        this._capInsets[INSET_LEFT] = l;
        this._capInsets[INSET_BOTTOM] = b;
        this._capInsets[INSET_RIGHT] = r;
        this._capInsets[INSET_TOP] = t;
    }

    /**
     * @en
     * Returns the texture of the frame.
     *
     * @zh
     * 获取使用的纹理实例。
     */
    // getTexture() {
    //     return this._texture;
    // }

    /*
     * @en Sets the texture of the frame.
     * @zh 设置使用的纹理实例。
     * @method _refreshTexture
     * @param {Texture2D} texture
     */
    // _refreshTexture(/*texture*/) {
    //     // this._texture = texture;
    //     if (/*texture.loaded*/this.loaded) {
    //         this._textureLoadedCallback();
    //     }
    //     else {
    //         // texture.once('load', this._textureLoadedCallback, this);
    //         this.once('load', this._textureLoadedCallback, this);
    //     }
    // }

    /**
     * @en
     * Returns the offset of the frame in the texture.
     *
     * @zh
     * 获取偏移量。
     *
     * @param out - 可复用的偏移量。
     */
    public getOffset (out?: Vec2) {
        if (out) {
            out.set(this._offset);
            return out;
        }

        return this._offset.clone();
    }

    /**
     * @en
     * Sets the offset of the frame in the texture.
     *
     * @zh
     * 设置偏移量。
     *
     * @param offsets - 偏移量。
     */
    public setOffset (offsets: Vec2) {
        vec2.set(this._offset, offsets.x, offsets.y);
    }

    /**
     * @en
     * Clone the sprite frame.
     *
     * @zh
     * 克隆 SpriteFrame。
     *
     * @returns - 复制后的精灵帧
     */
    public clone () {
        const cloneSprite = new SpriteFrame();
        cloneSprite.name = this.name;
        cloneSprite.atlasUuid = this.atlasUuid;
        cloneSprite.setOriginalSize(this._originalSize);
        cloneSprite.setRect(this._rect);
        const cap = this._capInsets;
        cloneSprite._setBorder(cap[INSET_LEFT], cap[INSET_BOTTOM], cap[INSET_RIGHT], cap[INSET_TOP]);
        cloneSprite.setOffset(this._offset);
        cloneSprite._mipmaps = this._mipmaps;
        cloneSprite.onLoaded();
        return cloneSprite;
    }

    // /**
    //  * @en Set SpriteFrame with Texture, rect, rotated, offset and originalSize.<br/>
    //  * @zh 通过 Texture，rect，rotated，offset 和 originalSize 设置 SpriteFrame。
    //  * @method setTexture
    //  * @param {String|Texture2D} textureOrTextureFile
    //  * @param {Rect} [rect=null]
    //  * @param {Boolean} [rotated=false]
    //  * @param {Vec2} [offset=cc.v2(0,0)]
    //  * @param {Size} [originalSize=rect.size]
    //  * @return {Boolean}
    //  */
    // setTexture(textureOrTextureFile, rect, rotated, offset, originalSize) {
    //     if (rect) {
    //         this.setRect(rect);
    //     }
    //     else {
    //         this._rect = null;
    //     }

    //     if (offset) {
    //         this.setOffset(offset);
    //     }
    //     else {
    //         this._offset = null;
    //     }

    //     if (originalSize) {
    //         this.setOriginalSize(originalSize);
    //     }
    //     else {
    //         this._originalSize = null;
    //     }

    //     this._rotated = rotated || false;

    //     // loading texture
    //     let texture = textureOrTextureFile;
    //     if (typeof texture === 'string' && texture) {
    //         this._textureFilename = texture;
    //         this._loadTexture();
    //     }
    //     if (texture instanceof cc.Texture2D && this._texture !== texture) {
    //         this._refreshTexture(texture);
    //     }

    //     return true;
    // }

    // _loadTexture() {
    //     if (this._textureFilename) {
    //         let texture = textureUtil.loadImage(this._textureFilename);
    //         this._refreshTexture(texture);
    //     }
    // }

    // /**
    //  * @en If a loading scene (or prefab) is marked as `asyncLoadAssets`, all the textures of the SpriteFrame which
    //  * associated by user's custom Components in the scene, will not preload automatically.
    //  * These textures will be load when Sprite component is going to render the SpriteFrames.
    //  * You can call this method if you want to load the texture early.
    //  * @zh 当加载中的场景或 Prefab 被标记为 `asyncLoadAssets` 时，用户在场景中由自定义组件关联到的所有 SpriteFrame 的贴图都不会被提前加载。
    //  * 只有当 Sprite 组件要渲染这些 SpriteFrame 时，才会检查贴图是否加载。如果你希望加载过程提前，你可以手工调用这个方法。
    //  *
    //  * @method ensureLoadTexture
    //  * @example
    //  * if (spriteFrame.textureLoaded()) {
    //  *     this._onSpriteFrameLoaded();
    //  * }
    //  * else {
    //  *     spriteFrame.once('load', this._onSpriteFrameLoaded, this);
    //  *     spriteFrame.ensureLoadTexture();
    //  * }
    //  */
    // public ensureLoadTexture () {
    //     // if (this._texture) {
    //     // if (!this._texture.loaded) {
    //     if (!this.loaded) {
    //         // load exists texture
    //         // this._refreshTexture(/*this._texture*/);
    //         // @ts-ignore
    //         textureUtil.postLoadTexture(this, null);
    //     }
    //     // }
    //     // else if (this._textureFilename) {
    //     //     // load new texture
    //     //     this._loadTexture();
    //     // }
    // }

    // /**
    //  * @en
    //  * If you do not need to use the SpriteFrame temporarily, you can call this method so that its texture could be garbage collected.
    //  * Then when you need to render the SpriteFrame, you should call `ensureLoadTexture` manually to reload texture.
    //  * @zh
    //  * 当你暂时不再使用这个 SpriteFrame 时，可以调用这个方法来保证引用的贴图对象能被 GC。然后当你要渲染 SpriteFrame 时，你需要手动调用 `ensureLoadTexture` 来重新加载贴图。
    //  *
    //  * @method clearTexture
    //  * @example
    //  * spriteFrame.clearTexture();
    //  * // when you need the SpriteFrame again...
    //  * spriteFrame.once('load', onSpriteFrameLoaded);
    //  * spriteFrame.ensureLoadTexture();
    //  */
    // clearTexture() {
    //     this._texture = null;   // TODO - release texture
    // }

    /**
     * @zh
     * 判断精灵计算的矩形区域是否越界。
     *
     * @param texture
     */
    public checkRect (texture: ImageAsset) {
        const rect = this._rect;
        let maxX = rect.x;
        let maxY = rect.y;
        if (this._rotated) {
            maxX += rect.height;
            maxY += rect.width;
        } else {
            maxX += rect.width;
            maxY += rect.height;
        }

        if (maxX > texture.width) {
            cc.errorID(3300, texture.url + '/' + this.name, maxX, texture.width);
        }
        if (maxY > texture.height) {
            cc.errorID(3400, texture.url + '/' + this.name, maxY, texture.height);
        }
    }

    /**
     * @zh
     * 计算裁切的 UV。
     */
    public _calculateSlicedUV () {
        const rect = this._rect;
        const atlasWidth = this.image!.width;
        const atlasHeight = this.image!.height;
        const leftWidth = this._capInsets[INSET_LEFT];
        const rightWidth = this._capInsets[INSET_RIGHT];
        const centerWidth = rect.width - leftWidth - rightWidth;
        const topHeight = this._capInsets[INSET_TOP];
        const bottomHeight = this._capInsets[INSET_BOTTOM];
        const centerHeight = rect.height - topHeight - bottomHeight;

        const uvSliced = this.uvSliced;
        uvSliced.length = 0;
        if (this._rotated) {
            temp_uvs[0].u = (rect.x) / atlasWidth;
            temp_uvs[1].u = (rect.x + bottomHeight) / atlasWidth;
            temp_uvs[2].u = (rect.x + bottomHeight + centerHeight) / atlasWidth;
            temp_uvs[3].u = (rect.x + rect.height) / atlasWidth;
            temp_uvs[3].v = (rect.y) / atlasHeight;
            temp_uvs[2].v = (rect.y + leftWidth) / atlasHeight;
            temp_uvs[1].v = (rect.y + leftWidth + centerWidth) / atlasHeight;
            temp_uvs[0].v = (rect.y + rect.width) / atlasHeight;

            for (let row = 0; row < 4; ++row) {
                const rowD = temp_uvs[row];
                for (let col = 0; col < 4; ++col) {
                    const colD = temp_uvs[3 - col];
                    uvSliced.push({
                        u: rowD.u,
                        v: colD.v,
                    });
                }
            }
        } else {
            temp_uvs[0].u = (rect.x) / atlasWidth;
            temp_uvs[1].u = (rect.x + leftWidth) / atlasWidth;
            temp_uvs[2].u = (rect.x + leftWidth + centerWidth) / atlasWidth;
            temp_uvs[3].u = (rect.x + rect.width) / atlasWidth;
            temp_uvs[3].v = (rect.y) / atlasHeight;
            temp_uvs[2].v = (rect.y + topHeight) / atlasHeight;
            temp_uvs[1].v = (rect.y + topHeight + centerHeight) / atlasHeight;
            temp_uvs[0].v = (rect.y + rect.height) / atlasHeight;

            for (let row = 0; row < 4; ++row) {
                const rowD = temp_uvs[row];
                for (let col = 0; col < 4; ++col) {
                    const colD = temp_uvs[col];
                    uvSliced.push({
                        u: colD.u,
                        v: rowD.v,
                    });
                }
            }
        }
    }

    // public setDynamicAtlasFrame (frame: SpriteFrame) {
    //     if (!frame) { return; }

    //     // @ts-ignore
    //     this._original = {
    //         texture: this,
    //         x: this._rect.x,
    //         y: this._rect.y,
    //     };

    //     // this._texture = frame.texture;
    //     this._rect.x = frame._rect.x;
    //     this._rect.y = frame._rect.y;
    //     this._calculateUV();
    // }

    // public resetDynamicAtlasFrame () {
    //     if (!this._original) {
    //         return;
    //     }

    //     this._rect.x = this._original.x;
    //     this._rect.y = this._original.y;
    //     // this._texture = this._original.texture;
    //     this._original = null;
    //     this._calculateUV();
    // }

    /**
     * @zh
     * 计算 UV。
     */
    public _calculateUV () {
        const rect = this._rect;
        const texture = this.image!;
        const uv = this.uv;
        const texw = texture.width;
        const texh = texture.height;

        if (this._rotated) {
            const l = texw === 0 ? 0 : rect.x / texw;
            const r = texw === 0 ? 0 : (rect.x + rect.height) / texw;
            const b = texh === 0 ? 0 : (rect.y + rect.width) / texh;
            const t = texh === 0 ? 0 : rect.y / texh;
            uv[0] = l;
            uv[1] = t;
            uv[2] = l;
            uv[3] = b;
            uv[4] = r;
            uv[5] = t;
            uv[6] = r;
            uv[7] = b;
        } else {
            const l = texw === 0 ? 0 : rect.x / texw;
            const r = texw === 0 ? 0 : (rect.x + rect.width) / texw;
            const b = texh === 0 ? 0 : (rect.y + rect.height) / texh;
            const t = texh === 0 ? 0 : rect.y / texh;
            uv[0] = l;
            uv[1] = b;
            uv[2] = r;
            uv[3] = b;
            uv[4] = l;
            uv[5] = t;
            uv[6] = r;
            uv[7] = t;
        }

        const vertices = this.vertices;
        if (vertices) {
            vertices.nu.length = 0;
            vertices.nv.length = 0;
            for (let i = 0; i < vertices.u.length; i++) {
                vertices.nu[i] = vertices.u[i] / texw;
                vertices.nv[i] = vertices.v[i] / texh;
            }
        }

        this._calculateSlicedUV();
    }

    // SERIALIZATION

    // @ts-ignore
    public _serialize (exporting?: any): any {
        const rect = this._rect;
        const offset = this._offset;
        const size = this._originalSize;
        let uuid = this._uuid;

        if (uuid && exporting) {
            // @ts-ignore
            // TODO:
            uuid = Editor.Utils.UuidUtils.compressUuid(uuid, true);
        }

        let vertices;
        if (this.vertices) {
            vertices = {
                triangles: this.vertices.triangles,
                x: this.vertices.x,
                y: this.vertices.y,
                u: this.vertices.u,
                v: this.vertices.v,
            };
        }

        return {
            base: super._serialize(exporting),
            name: this._name,
            texture: uuid || undefined,
            atlas: exporting ? undefined : this._atlasUuid,  // strip from json if exporting
            rect: rect ? [rect.x, rect.y, rect.width, rect.height] : undefined,
            offset: offset ? [offset.x, offset.y] : undefined,
            originalSize: size ? [size.width, size.height] : undefined,
            rotated: this._rotated ? this._rotated : undefined,
            capInsets: this._capInsets,
            vertices,
        };
    }

    public _deserialize (serializeData: any, handle: any) {
        const data = serializeData as ISpriteFramesSerializeData;
        super._deserialize(data.base, handle);
        const rect = data.rect;
        if (rect) {
            this.setRect(new Rect(rect[0], rect[1], rect[2], rect[3]));
        }
        if (data.offset) {
            this.setOffset(new Vec2(data.offset[0], data.offset[1]));
        }
        if (data.originalSize) {
            this.setOriginalSize(new cc.Size(data.originalSize[0], data.originalSize[1]));
        }
        this._rotated = !!data.rotated;
        this._name = data.name;

        const capInsets = data.capInsets;
        if (capInsets) {
            this._capInsets[INSET_LEFT] = capInsets[INSET_LEFT];
            this._capInsets[INSET_TOP] = capInsets[INSET_TOP];
            this._capInsets[INSET_RIGHT] = capInsets[INSET_RIGHT];
            this._capInsets[INSET_BOTTOM] = capInsets[INSET_BOTTOM];
        }

        if (CC_EDITOR) {
            this._atlasUuid = data.atlas ? data.atlas : '';
        }

        this.vertices = data.vertices;
        if (this.vertices) {
            // initialize normal uv arrays
            this.vertices.nu = [];
            this.vertices.nv = [];
        }

        // load texture via _textureSetter
        // let textureUuid = data.texture;
        // if (textureUuid) {
        //     handle.result.push(this, '_textureSetter', textureUuid);
        // }
    }

    protected initialize () {
        super.initialize();
        const self = this;
        // let texture = this._texture;
        // if (!texture) {
        //     // clearTexture called while loading texture...
        //     return;
        // }
        // let w = texture.width, h = texture.height;
        const w = self.width;
        const h = self.height;

        // if (self._rotated && cc.game.renderType === cc.game.RENDER_TYPE_CANVAS) {
        //     // TODO: rotate texture for canvas
        //     // self._texture = _ccsg.Sprite.CanvasRenderCmd._createRotatedTexture(texture, self.getRect());
        //     self._rotated = false;
        //     // w = self._texture.width;
        //     // h = self._texture.height;
        //     w = self.width;
        //     h = self.height;
        //     self.setRect(cc.rect(0, 0, w, h));
        // }

        if (self._rect) {
            self.checkRect(this.image!);
        } else {
            self.setRect(new Rect(0, 0, w, h));
        }

        if (!self._originalSize) {
            self.setOriginalSize(new Size(w, h));
        }

        if (!self._offset) {
            self.setOffset(new Vec2(0, 0));
        }

        self._calculateUV();

        // dispatch 'load' event of cc.SpriteFrame
        // @ts-ignore
        // self.emit('load');
    }

    // public onLoaded () {
    //     this.loaded = true;
    //     if (super.onLoaded) {
    //         super.onLoaded();
    //     }

    //     this._textureLoadedCallback();
    // }
}

cc.SpriteFrame = SpriteFrame;
