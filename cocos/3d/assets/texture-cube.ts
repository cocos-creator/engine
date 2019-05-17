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
// @ts-check
import { Texture2D } from '../../assets';
import { ImageAsset } from '../../assets/image-asset';
import { TextureBase } from '../../assets/texture-base';
import { postLoadImage } from '../../assets/texture-util';
import { ccclass, property } from '../../core/data/class-decorator';
import { GFXTextureFlagBit, GFXTextureViewType } from '../../gfx/define';

interface ITextureCubeMipmap {
    front: ImageAsset;
    back: ImageAsset;
    left: ImageAsset;
    right: ImageAsset;
    top: ImageAsset;
    bottom: ImageAsset;
}

@ccclass('cc.TextureCube')
export class TextureCube extends TextureBase {
    /**
     * Gets the mipmap images.
     * Note that the result do not contains the auto generated mipmaps.
     */
    get mipmaps () {
        return this._mipmaps;
    }

    /**
     * Sets the mipmaps images.
     */
    set mipmaps (value) {
        const replaceMipmaps = () => {
            const oldMipmaps = this._mipmaps;
            this._mipmaps = value;
            this._assetReady();
            oldMipmaps.forEach((mipmap, index) => {
                _forEachFace(mipmap, (face, faceIndex) => {
                    if (!face.loaded) {
                        this._unfinished--;
                        face.off('load', this._onImageLoaded, this);
                        if (this._unfinished === 0) {
                            this.loaded = true;
                            this.emit('load');
                        }
                    }
                });
            });
        };
        let unfinished = 0;
        value.forEach((mipmap) => {
            _forEachFace(mipmap, (face, faceIndex) => {
                if (!face.loaded) {
                    unfinished++;
                    face.once('load', () => {
                        unfinished--;
                        if (unfinished === 0) {
                            replaceMipmaps();
                        }
                    });
                    postLoadImage(face);
                }
            });
        });
        if (unfinished === 0) {
            replaceMipmaps();
        }
    }

    /**
     * Gets the mipmap image at level 0.
     */
    get image () {
        return this._mipmaps.length === 0 ? null : this._mipmaps[0];
    }

    /**
     * Sets the mipmap images as a single mipmap image.
     */
    set image (value) {
        this.mipmaps = value ? [value] : [];
    }

    /**
     * convenient util for cubemap creation (even with custom mipmaps)
     * @param texture - texture asset array containing six faces in a row
     * @param out - the resulting texture cube asset
     */
    public static fromTexture2DArray (textures: Texture2D[], out?: TextureCube) {
        const mipmaps: ITextureCubeMipmap[] = [];
        const nMipmaps = textures.length / 6;
        for (let i = 0; i < nMipmaps; i++) {
            const x = i * 6;
            mipmaps.push({
                front: textures[x + FaceIndex.front].image!,
                back: textures[x + FaceIndex.back].image!,
                left: textures[x + FaceIndex.left].image!,
                right: textures[x + FaceIndex.right].image!,
                top: textures[x + FaceIndex.top].image!,
                bottom: textures[x + FaceIndex.bottom].image!,
            });
        }
        if (!out) { out = new TextureCube(); }
        out.mipmaps = mipmaps;
        return out;
    }

    @property
    public _mipmaps: ITextureCubeMipmap[] = [];

    private _unfinished = 0;

    constructor () {
        super();
    }

    public onLoaded () {
        this._mipmaps.forEach((mipmap, index) => {
            _forEachFace(mipmap, (face, faceIndex) => {
                if (!face.loaded) {
                    this._unfinished++;
                    face.once('load', this._onImageLoaded, this);
                }
            });
        });
        if (this._unfinished === 0) {
            this._assetReady();
            this.loaded = true;
            this.emit('load');
        }
    }

    /**
     * Updates mipmaps at specified range of levels.
     * @param firstLevel The first level from which the sources update.
     * @description
     * If the range specified by [firstLevel, firstLevel + sources.length) exceeds
     * the actually range of mipmaps this texture contains, only overlaped mipmaps are updated.
     * Use this method if your mipmap data are modified.
     */
    public updateMipmaps (firstLevel: number = 0, count?: number) {
        if (firstLevel >= this._mipmaps.length) {
            return;
        }

        const nUpdate = Math.min(
            count === undefined ? this._mipmaps.length : count,
            this._mipmaps.length - firstLevel);

        for (let i = 0; i < nUpdate; ++i) {
            const level = firstLevel + i;
            _forEachFace(this._mipmaps[level], (face, faceIndex) => {
                this._assignImage(face, level, faceIndex);
            });
        }
    }

    /**
     * !#en
     * Destory this texture and immediately release its video memory. (Inherit from cc.Object.destroy)<br>
     * After destroy, this object is not usable any more.
     * You can use cc.isValid(obj) to check whether the object is destroyed before accessing it.
     * !#zh
     * 销毁该贴图，并立即释放它对应的显存。（继承自 cc.Object.destroy）<br/>
     * 销毁后，该对象不再可用。您可以在访问对象之前使用 cc.isValid(obj) 来检查对象是否已被销毁。
     */
    public destroy () {
        this._mipmaps = [];
        return super.destroy();
    }

    /**
     * !#en
     * Release texture, please use destroy instead.
     * !#zh 释放纹理，请使用 destroy 替代。
     * @deprecated Since v2.0.
     */
    public releaseTexture () {
        this.mipmaps = [];
    }

    public _serialize (exporting?: any) {
        return {
            base: super._serialize(),
            mipmaps: this._mipmaps.map((mipmap) => exporting ? {
                front: Editor.Utils.UuidUtils.compressUuid(mipmap.front._uuid, true),
                back: Editor.Utils.UuidUtils.compressUuid(mipmap.back._uuid, true),
                left: Editor.Utils.UuidUtils.compressUuid(mipmap.left._uuid, true),
                right: Editor.Utils.UuidUtils.compressUuid(mipmap.right._uuid, true),
                top: Editor.Utils.UuidUtils.compressUuid(mipmap.top._uuid, true),
                bottom: Editor.Utils.UuidUtils.compressUuid(mipmap.bottom._uuid, true),
            } : {
                front: mipmap.front._uuid,
                back: mipmap.back._uuid,
                left: mipmap.left._uuid,
                right: mipmap.right._uuid,
                top: mipmap.top._uuid,
                bottom: mipmap.bottom._uuid,
            }),
        };
    }

    public _deserialize (serializedData: ITextureCubeSerializeData, handle: any) {
        const data = serializedData as ITextureCubeSerializeData;
        super._deserialize(data.base, handle);

        this._mipmaps = new Array(data.mipmaps.length);
        for (let i = 0; i < data.mipmaps.length; ++i) {
            // Prevent resource load failed
            this._mipmaps[i] = {
                front: new ImageAsset(),
                back: new ImageAsset(),
                left: new ImageAsset(),
                right: new ImageAsset(),
                top: new ImageAsset(),
                bottom: new ImageAsset(),
            };
            const mipmap = data.mipmaps[i];
            handle.result.push(this._mipmaps[i], `front`, mipmap.front);
            handle.result.push(this._mipmaps[i], `back`, mipmap.back);
            handle.result.push(this._mipmaps[i], `left`, mipmap.left);
            handle.result.push(this._mipmaps[i], `right`, mipmap.right);
            handle.result.push(this._mipmaps[i], `top`, mipmap.top);
            handle.result.push(this._mipmaps[i], `bottom`, mipmap.bottom);
        }
    }

    public ensureLoadImage () {
        super.ensureLoadImage();
        this._mipmaps.forEach((mipmap) => {
            _forEachFace(mipmap, (face, faceIndex) => {
                if (!face.loaded) {
                    postLoadImage(face);
                }
            });
        });
    }

    protected _getTextureCreateInfo () {
        const result =  super._getTextureCreateInfo();
        result.arrayLayer = 6;
        result.flags = (result.flags || 0) | GFXTextureFlagBit.CUBEMAP;
        return result;
    }

    protected _getTextureViewCreateInfo () {
        const result = super._getTextureViewCreateInfo();
        result.type = GFXTextureViewType.CUBE;
        result.layerCount = 6;
        return result;
    }

    protected _onImageLoaded () {
        this._unfinished--;
        if (this._unfinished === 0) {
            this._assetReady();
            this.loaded = true;
            this.emit('load');
        }
    }

    protected _assetReady () {
        if (this._mipmaps.length > 0) {
            const imageAsset: ImageAsset = this._mipmaps[0].front;
            this.create(imageAsset.width, imageAsset.height, imageAsset.format, this._mipmaps.length);
            this._mipmaps.forEach((mipmap, level) => {
                _forEachFace(mipmap, (face, faceIndex) => {
                    this._assignImage(face, level, faceIndex);
                });
            });
        } else {
            this.create(0, 0, undefined, this._mipmaps.length);
        }
    }
}

/* tslint:disable:no-string-literal */
cc['TextureCube'] = TextureCube;

interface ITextureCubeSerializeData {
    base: string;
    mipmaps: Array<{
        front: string;
        back: string;
        left: string;
        right: string;
        top: string;
        bottom: string;
    }>;
}

enum FaceIndex {
    right = 0,
    left = 1,
    top = 2,
    bottom = 3,
    front = 4,
    back = 5,
}

/**
 * @param {Mipmap} mipmap
 * @param {(face: ImageAsset) => void} callback
 */
function _forEachFace (mipmap: ITextureCubeMipmap, callback: (face: ImageAsset, faceIndex: number) => void) {
    callback(mipmap.front, FaceIndex.front);
    callback(mipmap.back, FaceIndex.back);
    callback(mipmap.left, FaceIndex.left);
    callback(mipmap.right, FaceIndex.right);
    callback(mipmap.top, FaceIndex.top);
    callback(mipmap.bottom, FaceIndex.bottom);
}
