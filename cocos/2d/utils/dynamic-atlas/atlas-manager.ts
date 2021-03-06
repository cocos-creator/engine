/**
 * @packageDocumentation
 * @hidden
 */

import { EDITOR } from 'internal:constants';
import { legacyCC } from '../../../core/global-exports';
import { Atlas } from './atlas';

export class DynamicAtlasManager {
    public static instance: DynamicAtlasManager;

    private _atlases: Atlas[] = [];
    private _atlasIndex = -1;

    private _maxAtlasCount = 5;
    private _textureSize = 2048;
    private _maxFrameSize = 512;
    private _textureBleeding = true;

    private _enabled = false;

    get enabled () {
        return this._enabled;
    }
    set enabled (value) {
        if (this._enabled === value) return;

        if (value) {
            this.reset();
            legacyCC.director.on(legacyCC.Director.EVENT_BEFORE_SCENE_LAUNCH, this.beforeSceneLoad, this);
        } else {
            this.reset();
            legacyCC.director.off(legacyCC.Director.EVENT_BEFORE_SCENE_LAUNCH, this.beforeSceneLoad, this);
        }

        this._enabled = value;
    }

    get maxAtlasCount () {
        return this._maxAtlasCount;
    }
    set maxAtlasCount (value) {
        this._maxAtlasCount = value;
    }

    get atlasCount () {
        return this._atlases.length;
    }

    get textureBleeding () {
        return this._textureBleeding;
    }
    set textureBleeding (enable) {
        this._textureBleeding = enable;
    }

    get textureSize () {
        return this._textureSize;
    }
    set textureSize (value) {
        this._textureSize = value;
    }

    get maxFrameSize () {
        return this._maxFrameSize;
    }
    set maxFrameSize (value) {
        this._maxFrameSize = value;
    }

    private newAtlas () {
        let atlas = this._atlases[++this._atlasIndex];
        if (!atlas) {
            atlas = new Atlas(this._textureSize, this._textureSize);
            this._atlases.push(atlas);
        }
        return atlas;
    }

    private beforeSceneLoad () {
        this.reset();
    }

    /**
     * @en Append a sprite frame into the dynamic atlas.
     * @zh 添加碎图进入动态图集。
     * @method insertSpriteFrame
     * @param {SpriteFrame} spriteFrame
     */
    public insertSpriteFrame (spriteFrame) {
        if (EDITOR) return null;
        if (!this._enabled || this._atlasIndex === this._maxAtlasCount
            || !spriteFrame || spriteFrame._original) return null;

        if (!spriteFrame.packable) return null;

        let atlas = this._atlases[this._atlasIndex];
        if (!atlas) {
            atlas = this.newAtlas();
        }

        const frame = atlas.insertSpriteFrame(spriteFrame);
        if (!frame && this._atlasIndex !== this._maxAtlasCount) {
            atlas = this.newAtlas();
            return atlas.insertSpriteFrame(spriteFrame);
        }
        return frame;
    }

    /**
     * @en Resets all dynamic atlas, and the existing ones will be destroyed.
     * @zh 重置所有动态图集，已有的动态图集会被销毁。
     * @method reset
    */
    public reset () {
        for (let i = 0, l = this._atlases.length; i < l; i++) {
            this._atlases[i].destroy();
        }
        this._atlases.length = 0;
        this._atlasIndex = -1;
    }

    public deleteAtlasSpriteFrame (spriteFrame) {
        if (!spriteFrame._original) return;

        const texture = spriteFrame._original._texture;
        this.deleteAtlasTexture(texture);
    }

    public deleteAtlasTexture (texture) {
        if (texture) {
            for (let i = this._atlases.length - 1; i >= 0; i--) {
                this._atlases[i].deleteInnerTexture(texture);

                if (this._atlases[i].isEmpty()) {
                    this._atlases[i].destroy();
                    this._atlases.splice(i, 1);
                    this._atlasIndex--;
                }
            }
        }
    }

    public packToDynamicAtlas (comp, frame) {
        if (EDITOR) return;

        if (!frame._original && frame.packable) {
            const packedFrame = this.insertSpriteFrame(frame);
            if (packedFrame) {
                frame._setDynamicAtlasFrame(packedFrame);
            }
        }
    }
}

export const dynamicAtlasManager: DynamicAtlasManager = DynamicAtlasManager.instance = new DynamicAtlasManager();

legacyCC.internal.dynamicAtlasManager = dynamicAtlasManager;
