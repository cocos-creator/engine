/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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
 * @module particle2d
 */

import { ccclass, editable, type, menu, executeInEditMode, serializable, playOnFocus, tooltip, visible, formerlySerializedAs } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { Renderable2D } from '../2d/framework/renderable-2d';
import { Color, Vec2 } from '../core/math';
import { warnID, errorID, error } from '../core/platform/debug';
import { Simulator } from './particle-simulator-2d';
import { SpriteFrame } from '../2d/assets/sprite-frame';
import { ImageAsset } from '../core/assets/image-asset';
import { ParticleAsset } from './particle-asset';
import { BlendFactor } from '../core/gfx';
import { path } from '../core/utils';
import { PNGReader } from './png-reader';
import { TiffReader } from './tiff-reader';
import codec from '../../external/compression/ZipUtils';
import { Batcher2D } from '../2d/renderer/batcher-2d';
import { assetManager } from '../core/asset-manager';
import { PositionType, EmitterMode, DURATION_INFINITY, START_RADIUS_EQUAL_TO_END_RADIUS, START_SIZE_EQUAL_TO_END_SIZE } from './define';

/**
 * Image formats
 * @enum macro.ImageFormat
 */
export enum ImageFormat {
    /**
     * @en Image Format:JPG
     * @zh 图片格式:JPG
     */
    JPG,
    /**
     * @en Image Format:PNG
     * @zh 图片格式:PNG
     */
    PNG,
    /**
     * @en Image Format:TIFF
     * @zh 图片格式:TIFF
     */
    TIFF,
    /**
     * @en Image Format:WEBP
     * @zh 图片格式:WEBP
     */
    WEBP,
    /**
     * @en Image Format:PVR
     * @zh 图片格式:PVR
     */
    PVR,
    /**
     * @en Image Format:ETC
     * @zh 图片格式:ETC
     */
    ETC,
    /**
     * @en Image Format:S3TC
     * @zh 图片格式:S3TC
     */
    S3TC,
    /**
     * @en Image Format:ATITC
     * @zh 图片格式:ATITC
     */
    ATITC,
    /**
     * @en Image Format:TGA
     * @zh 图片格式:TGA
     */
    TGA,
    /**
     * @en Image Format:RAWDATA
     * @zh 图片格式:RAWDATA
     */
    RAWDATA,
    /**
     * @en Image Format:UNKNOWN
     * @zh 图片格式:UNKNOWN
     */
    UNKNOWN,
}

export function getImageFormatByData (imgData) {
    // if it is a png file buffer.
    if (imgData.length > 8 && imgData[0] === 0x89
        && imgData[1] === 0x50
        && imgData[2] === 0x4E
        && imgData[3] === 0x47
        && imgData[4] === 0x0D
        && imgData[5] === 0x0A
        && imgData[6] === 0x1A
        && imgData[7] === 0x0A) {
        return ImageFormat.PNG;
    }

    // if it is a tiff file buffer.
    if (imgData.length > 2 && ((imgData[0] === 0x49 && imgData[1] === 0x49)
        || (imgData[0] === 0x4d && imgData[1] === 0x4d)
        || (imgData[0] === 0xff && imgData[1] === 0xd8))) {
        return ImageFormat.TIFF;
    }
    return ImageFormat.UNKNOWN;
}

function getParticleComponents (node): ParticleSystem2D[] {
    const parent = node.parent;
    const comp = node.getComponent(ParticleSystem2D);
    if (!parent || !comp) {
        return node.getComponentsInChildren(ParticleSystem2D) as ParticleSystem2D[];
    }
    return getParticleComponents(parent);
}

/**
 * Particle System base class. <br/>
 * Attributes of a Particle System:<br/>
 *  - emmision rate of the particles<br/>
 *  - Gravity Mode (Mode A): <br/>
 *  - gravity <br/>
 *  - direction <br/>
 *  - speed +-  variance <br/>
 *  - tangential acceleration +- variance<br/>
 *  - radial acceleration +- variance<br/>
 *  - Radius Mode (Mode B):      <br/>
 *  - startRadius +- variance    <br/>
 *  - endRadius +- variance      <br/>
 *  - rotate +- variance         <br/>
 *  - Properties common to all modes: <br/>
 *  - life +- life variance      <br/>
 *  - start spin +- variance     <br/>
 *  - end spin +- variance       <br/>
 *  - start size +- variance     <br/>
 *  - end size +- variance       <br/>
 *  - start color +- variance    <br/>
 *  - end color +- variance      <br/>
 *  - life +- variance           <br/>
 *  - blending function          <br/>
 *  - texture                    <br/>
 * <br/>
 * cocos2d also supports particles generated by Particle Designer (http://particledesigner.71squared.com/).<br/>
 * 'Radius Mode' in Particle Designer uses a fixed emit rate of 30 hz. Since that can't be guarateed in cocos2d,  <br/>
 * cocos2d uses a another approach, but the results are almost identical.<br/>
 * cocos2d supports all the variables used by Particle Designer plus a bit more:  <br/>
 *  - spinning particles (supported when using ParticleSystem)       <br/>
 *  - tangential acceleration (Gravity mode)                               <br/>
 *  - radial acceleration (Gravity mode)                                   <br/>
 *  - radius direction (Radius mode) (Particle Designer supports outwards to inwards direction only) <br/>
 * It is possible to customize any of the above mentioned properties in runtime. Example:   <br/>
 *
 * @example
 * emitter.radialAccel = 15;
 * emitter.startSpin = 0;
 */
@ccclass('cc.ParticleSystem2D')
@menu('Effects/ParticleSystem2D')
@playOnFocus
@executeInEditMode
export class ParticleSystem2D extends Renderable2D {
    static EmitterMode = EmitterMode;
    static PositionType = PositionType;
    static readonly DURATION_INFINITY = DURATION_INFINITY;
    static readonly START_SIZE_EQUAL_TO_END_SIZE = START_SIZE_EQUAL_TO_END_SIZE;
    static readonly START_RADIUS_EQUAL_TO_END_RADIUS = START_RADIUS_EQUAL_TO_END_RADIUS;

    /**
     * @en If set custom to true, then use custom properties insteadof read particle file.
     * @zh 是否自定义粒子属性。
     */
    @editable
    @tooltip('i18n:particle_system.custom')
    public get custom () {
        return this._custom;
    }
    public set custom (value) {
        if (EDITOR && !value && !this._file) {
            warnID(6000);
            return;
        }
        if (this._custom !== value) {
            this._custom = value;
            this._applyFile();
        }
    }

    /**
     * @en The plist file.
     * @zh plist 格式的粒子配置文件。
     */
    @type(ParticleAsset)
    @tooltip('i18n:particle_system.file')
    public get file (): ParticleAsset | null {
        return this._file;
    }

    public set file (value) {
        if (this._file !== value) {
            this._file = value;
            if (value) {
                this._applyFile();
            } else {
                this.custom = true;
            }
        }
    }

    /**
     * @en SpriteFrame used for particles display
     * @zh 用于粒子呈现的 SpriteFrame
     */
    @type(SpriteFrame)
    @tooltip('i18n:particle_system.spriteFrame')
    public get spriteFrame (): SpriteFrame | null {
        return this._spriteFrame;
    }

    public set spriteFrame (value: SpriteFrame | null) {
        const lastSprite = this._renderSpriteFrame;
        if (lastSprite === value) {
            return;
        }
        this._renderSpriteFrame = value;

        if (!value || value._uuid) {
            this._spriteFrame = value;
        }

        this._applySpriteFrame();

        if (EDITOR) {
            this.node.emit('spriteframe-changed', this);
        }
    }

    /**
     * @en Current quantity of particles that are being simulated.
     * @zh 当前播放的粒子数量。
     * @readonly
     */
    public get particleCount () {
        return this._simulator.particles.length;
    }

    /**
     * @en Maximum particles of the system.
     * @zh 粒子最大数量。
     */
    @editable
    @tooltip('i18n:particle_system.totalParticles')
    public get totalParticles () {
        return this._totalParticles;
    }
    public set totalParticles (value: number) {
        if (this._totalParticles === value) return;
        this._totalParticles = value;
    }

    /**
     * @en How many seconds the emitter wil run. -1 means 'forever'.
     * @zh 发射器生存时间，单位秒，-1表示持续发射。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.duration')
    public duration = -1;

    /**
     * @en Emission rate of the particles.
     * @zh 每秒发射的粒子数目。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.emissionRate')
    public emissionRate = 10;

    /**
     * @en Life of each particle setter.
     * @zh 粒子的运行时间。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.life')
    public life = 1;

    /**
     * @en Variation of life.
     * @zh 粒子的运行时间变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.lifeVar')
    public lifeVar = 0;

    /**
     * @en Start color of each particle.
     * @zh 粒子初始颜色。
     */
    @editable
    @tooltip('i18n:particle_system.startColor')
    public get startColor () {
        return this._startColor;
    }

    public set startColor (val) {
        this._startColor.r = val.r;
        this._startColor.g = val.g;
        this._startColor.b = val.b;
        this._startColor.a = val.a;
    }

    /**
     * @en Variation of the start color.
     * @zh 粒子初始颜色变化范围。
     */
    @editable
    @tooltip('i18n:particle_system.startColorVar')
    public get startColorVar (): Color {
        return this._startColorVar;
    }

    public set startColorVar (val: Color) {
        this._startColorVar.r = val.r;
        this._startColorVar.g = val.g;
        this._startColorVar.b = val.b;
        this._startColorVar.a = val.a;
    }

    @visible(() => false)
    set color (value) {
    }

    get color (): Readonly<Color> {
        return this._color;
    }

    /**
     * @en Ending color of each particle.
     * @zh 粒子结束颜色。
     */
    @editable
    @tooltip('i18n:particle_system.endColor')
    public get endColor (): Color {
        return this._endColor;
    }

    public set endColor (val) {
        this._endColor.r = val.r;
        this._endColor.g = val.g;
        this._endColor.b = val.b;
        this._endColor.a = val.a;
    }

    /**
     * @en Variation of the end color.
     * @zh 粒子结束颜色变化范围。
     */
    @editable
    @tooltip('i18n:particle_system.endColorVar')
    public get endColorVar (): Color {
        return this._endColorVar;
    }

    public set endColorVar (val) {
        this._endColorVar.r = val.r;
        this._endColorVar.g = val.g;
        this._endColorVar.b = val.b;
        this._endColorVar.a = val.a;
    }

    /**
     * @en Angle of each particle setter.
     * @zh 粒子角度。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.angle')
    public angle = 90;

    /**
     * @en Variation of angle of each particle setter.
     * @zh 粒子角度变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.angleVar')
    public angleVar = 20;

    /**
     * @en Start size in pixels of each particle.
     * @zh 粒子的初始大小。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.startSize')
    public startSize = 50;

    /**
     * @en Variation of start size in pixels.
     * @zh 粒子初始大小的变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.startSizeVar')
    public startSizeVar = 0;

    /**
     * @en End size in pixels of each particle.
     * @zh 粒子结束时的大小。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.endSize')
    public endSize = 0;

    /**
     * @en Variation of end size in pixels.
     * @zh 粒子结束大小的变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.endSizeVar')
    public endSizeVar = 0;

    /**
     * @en Start angle of each particle.
     * @zh 粒子开始自旋角度。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.startSpin')
    public startSpin = 0;

    /**
     * @en Variation of start angle.
     * @zh 粒子开始自旋角度变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.startSpinVar')
    public startSpinVar = 0;

    /**
     * @en End angle of each particle.
     * @zh 粒子结束自旋角度。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.endSpin')
    public endSpin = 0;

    /**
     * @en Variation of end angle.
     * @zh 粒子结束自旋角度变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.endSpinVar')
    public endSpinVar = 0;

    /**
     * @en Source position of the emitter.
     * @zh 发射器位置。
     */
    @serializable
    public sourcePos = Vec2.ZERO.clone();

    /**
     * @en Variation of source position.
     * @zh 发射器位置的变化范围。（横向和纵向）
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.posVar')
    public posVar = Vec2.ZERO.clone();

    /**
     * @en Particles movement type.
     * @zh 粒子位置类型。
     */
    @type(PositionType)
    @tooltip('i18n:particle_system.positionType')
    public get positionType () {
        return this._positionType;
    }

    public set positionType (val) {
        this._positionType = val;
        this._updateMaterial();
    }

    /**
     * @en Preview particle system effect.
     * @ch 查看粒子效果
     */
    @editable
    public get preview () {
        return this._preview;
    }

    public set preview (val: boolean) {
        if (val) { this._startPreview(); } else { this._stopPreview(); }
        this._preview = val;
    }

    /**
     * @en Particles emitter modes.
     * @zh 发射器类型。
     */
    @serializable
    @editable
    @type(EmitterMode)
    @tooltip('i18n:particle_system.emitterMode')
    public emitterMode = EmitterMode.GRAVITY;

    // GRAVITY MODE

    /**
     * @en Gravity of the emitter.
     * @zh 重力。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.gravity')
    public gravity = Vec2.ZERO.clone();

    /**
     * @en Speed of the emitter.
     * @zh 速度。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.speed')
    public speed = 180;

    /**
     * @en Variation of the speed.
     * @zh 速度变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.speedVar')
    public speedVar = 50;

    /**
     * @en Tangential acceleration of each particle. Only available in 'Gravity' mode.
     * @zh 每个粒子的切向加速度，即垂直于重力方向的加速度，只有在重力模式下可用。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.tangentialAccel')
    public tangentialAccel = 80;

    /**
     * @en Variation of the tangential acceleration.
     * @zh 每个粒子的切向加速度变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.tangentialAccelVar')
    public tangentialAccelVar = 0;

    /**
     * @en Acceleration of each particle. Only available in 'Gravity' mode.
     * @zh 粒子径向加速度，即平行于重力方向的加速度，只有在重力模式下可用。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.radialAccel')
    public radialAccel = 0;

    /**
     * @en Variation of the radial acceleration.
     * @zh 粒子径向加速度变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.radialAccelVar')
    public radialAccelVar = 0;

    /**
     * @en Indicate whether the rotation of each particle equals to its direction. Only available in 'Gravity' mode.
     * @zh 每个粒子的旋转是否等于其方向，只有在重力模式下可用。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.rotationIsDir')
    public rotationIsDir = false;

    // RADIUS MODE

    /**
     * @en Starting radius of the particles. Only available in 'Radius' mode.
     * @zh 初始半径，表示粒子出生时相对发射器的距离，只有在半径模式下可用。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.startRadius')
    public startRadius = 0;

    /**
     * @en Variation of the starting radius.
     * @zh 初始半径变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.startRadiusVar')
    public startRadiusVar = 0;

    /**
     * @en Ending radius of the particles. Only available in 'Radius' mode.
     * @zh 结束半径，只有在半径模式下可用。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.endRadius')
    public endRadius = 0;

    /**
     * @en Variation of the ending radius.
     * @zh 结束半径变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.endRadiusVar')
    public endRadiusVar = 0;

    /**
     * @en Number of degress to rotate a particle around the source pos per second. Only available in 'Radius' mode.
     * @zh 粒子每秒围绕起始点的旋转角度，只有在半径模式下可用。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.rotatePerS')
    public rotatePerS = 0;

    /**
     * @en Variation of the degress to rotate a particle around the source pos per second.
     * @zh 粒子每秒围绕起始点的旋转角度变化范围。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.rotatePerSVar')
    public rotatePerSVar = 0;

    /**
     * @en Indicate whether the system simulation have stopped.
     * @zh 指示粒子播放是否完毕。
     */
    public get stopped () {
        return this._stopped;
    }

    /**
     * @en Indicate whether the particle system is activated.
     * @zh 是否激活粒子。
     * @readonly
     */
    public get active () {
        return this._simulator.active;
    }

    public get assembler () {
        return this._assembler;
    }
    public aspectRatio = 1;
    // The temporary SpriteFrame object used for the renderer. Because there is no corresponding asset, it can't be serialized.
    public declare _renderSpriteFrame: SpriteFrame | null;
    public declare _simulator: Simulator;

    /**
     * @en If set to true, the particle system will automatically start playing on onLoad.
     * @zh 如果设置为 true 运行时会自动发射粒子。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.playOnLoad')
    public playOnLoad = true;

    /**
     * @en Indicate whether the owner node will be auto-removed when it has no particles left.
     * @zh 粒子播放完毕后自动销毁所在的节点。
     */
    @serializable
    @editable
    @tooltip('i18n:particle_system.autoRemoveOnFinish')
    public autoRemoveOnFinish = false;

    /**
     * @en Play particle in edit mode.
     * @zh 在编辑器模式下预览粒子，启用后选中粒子时，粒子将自动播放。
     */
    @formerlySerializedAs('preview')
    @editable
    @tooltip('i18n:particle_system.preview')
    private _preview = true;
    @serializable
    private _custom = false;
    @serializable
    private _file: ParticleAsset | null = null;
    @serializable
    private _spriteFrame: SpriteFrame | null = null;
    @serializable
    private _totalParticles = 150;
    @serializable
    private _startColor: Color = new Color(255, 255, 255, 255);
    @serializable
    private _startColorVar: Color = new Color(0, 0, 0, 0);
    @serializable
    private _endColor: Color = new Color(255, 255, 255, 0);
    @serializable
    private _endColorVar: Color = new Color(0, 0, 0, 0);
    @serializable
    private _positionType = PositionType.FREE;

    private _stopped = true;
    private declare _previewTimer;
    private declare _focused: boolean;
    private declare _plistFile;
    private declare _tiffReader;

    private _dict: any = null;

    constructor () {
        super();
        this.initProperties();
    }

    public onEnable () {
        super.onEnable();
        this._updateMaterial();
    }

    public onDestroy () {
        super.onDestroy();

        if (this.autoRemoveOnFinish) {
            this.autoRemoveOnFinish = false;    // already removed
        }

        // reset uv data so next time simulator will refill buffer uv info when exit edit mode from prefab.
        this._simulator.uvFilled = 0;
    }

    private initProperties () {
        this._previewTimer = null;
        this._focused = false;
        this.aspectRatio = 1;
        this._simulator = new Simulator(this);
    }

    public onFocusInEditor () {
        this._focused = true;
        const components = getParticleComponents(this.node);
        for (let i = 0; i < components.length; ++i) {
            components[i]._startPreview();
        }
    }

    public onLostFocusInEditor () {
        this._focused = false;
        const components = getParticleComponents(this.node);
        for (let i = 0; i < components.length; ++i) {
            components[i]._stopPreview();
        }
    }

    private _startPreview () {
        if (this._preview) {
            this.resetSystem();
        }
    }

    private _stopPreview () {
        if (this._preview) {
            this.resetSystem();
            this.stopSystem();
        }
        if (this._previewTimer) {
            clearInterval(this._previewTimer);
        }
    }

    public __preload () {
        super.__preload();

        if (this._custom && this.spriteFrame && !this._renderSpriteFrame) {
            this._applySpriteFrame();
        } else if (this._file) {
            if (this._custom) {
                const missCustomTexture = !this._getTexture();
                if (missCustomTexture) {
                    this._applyFile();
                }
            } else {
                this._applyFile();
            }
        }

        // auto play
        if (!EDITOR) {
            if (this.playOnLoad) {
                this.resetSystem();
            }
        }
    }

    protected _flushAssembler () {
        const assembler = ParticleSystem2D.Assembler!.getAssembler(this);

        if (this._assembler !== assembler) {
            this._assembler = assembler;
        }

        if (this._assembler && this._assembler.createData) {
            this._simulator.renderData = this._assembler.createData(this);
        }
    }

    protected lateUpdate (dt) {
        if (!this._simulator.finished) {
            this._simulator.step(dt);
        }
    }

    // APIS

    /**
     * @en Add a particle to the emitter.
     * @zh 添加一个粒子到发射器中。
     * @return {Boolean}
     */
    public addParticle () {
        // Not implemented
    }

    /**
     * @en Stop emitting particles. Running particles will continue to run until they die.
     * @zh 停止发射器发射粒子，发射出去的粒子将继续运行，直至粒子生命结束。
     * @example
     * // stop particle system.
     * myParticleSystem.stopSystem();
     */
    public stopSystem () {
        this._stopped = true;
        this._simulator.stop();
    }

    /**
     * @en Kill all living particles.
     * @zh 杀死所有存在的粒子，然后重新启动粒子发射器。
     * @example
     * // play particle system.
     * myParticleSystem.resetSystem();
     */
    public resetSystem () {
        this._stopped = false;
        this._simulator.reset();
        this._renderFlag = this._canRender();
    }

    /**
     * @en Whether or not the system is full.
     * @zh 发射器中粒子是否大于等于设置的总粒子数量。
     * @return {Boolean}
     */
    public isFull () {
        return (this.particleCount >= this.totalParticles);
    }

    // PRIVATE METHODS
    public _applyFile () {
        const file = this._file;
        if (file) {
            if (!file) {
                errorID(6029);
                return;
            }
            if (!this.isValid) {
                return;
            }
            this._plistFile = file.nativeUrl;
            if (!this._custom) {
                const isDiffFrame = this._spriteFrame !== file.spriteFrame;
                if (isDiffFrame) this.spriteFrame = file.spriteFrame;
                this._initWithDictionary(file._nativeAsset);
            }

            if (!this._spriteFrame) {
                if (file.spriteFrame) {
                    this.spriteFrame = file.spriteFrame;
                } else if (this._custom) {
                    this._initTextureWithDictionary(file._nativeAsset);
                }
            } else if (!this._renderSpriteFrame && this._spriteFrame) {
                this._applySpriteFrame();
            }
        }
    }

    public _initTextureWithDictionary (dict: any) {
        if (dict.spriteFrameUuid) {
            const spriteFrameUuid = dict.spriteFrameUuid;
            assetManager.loadAny(spriteFrameUuid, (err: Error, spriteFrame: SpriteFrame) => {
                if (err) {
                    dict.spriteFrameUuid = undefined;
                    this._initTextureWithDictionary(dict);
                    error(err);
                } else {
                    this.spriteFrame = spriteFrame;
                }
            });
        } else {
            // texture
            const imgPath = path.changeBasename(this._plistFile, dict.textureFileName || '');
            if (dict.textureFileName) {
                // Try to get the texture from the cache
                assetManager.loadRemote<ImageAsset>(imgPath, (err: Error | null, imageAsset: ImageAsset) => {
                    if (err) {
                        dict.textureFileName = undefined;
                        this._initTextureWithDictionary(dict);
                        error(err);
                    } else {
                        this.spriteFrame = SpriteFrame.createWithImage(imageAsset);
                    }
                });
            } else if (dict.textureImageData) {
                const textureData = dict.textureImageData;

                if (textureData && textureData.length > 0) {
                    let imageAsset = assetManager.assets.get(imgPath) as ImageAsset;

                    if (!imageAsset) {
                        const buffer = codec.unzipBase64AsArray(textureData, 1);
                        if (!buffer) {
                            warnID(6030, this._file!.name);
                            return false;
                        }

                        const imageFormat = getImageFormatByData(buffer);
                        if (imageFormat !== ImageFormat.TIFF && imageFormat !== ImageFormat.PNG) {
                            warnID(6031, this._file!.name);
                            return false;
                        }

                        const canvasObj = document.createElement('canvas');
                        if (imageFormat === ImageFormat.PNG) {
                            const myPngObj = new PNGReader(buffer);
                            myPngObj.render(canvasObj);
                        } else {
                            if (!this._tiffReader) {
                                this._tiffReader = new TiffReader();
                            }
                            this._tiffReader.parseTIFF(buffer, canvasObj);
                        }
                        imageAsset = new ImageAsset(canvasObj);
                        assetManager.assets.add(imgPath, imageAsset);
                    }

                    if (!imageAsset) {
                        warnID(6032, this._file!.name);
                    }
                    // TODO: Use cc.assetManager to load asynchronously the SpriteFrame object, avoid using textureUtil
                    this.spriteFrame = SpriteFrame.createWithImage(imageAsset);
                } else {
                    return false;
                }
            }
        }
        return true;
    }

    // parsing process
    public _initWithDictionary (dict: any) {
        this._dict = dict;

        this.totalParticles = parseInt(dict.maxParticles || 0);

        // life span
        this.life = parseFloat(dict.particleLifespan || 0);
        this.lifeVar = parseFloat(dict.particleLifespanVariance || 0);

        // emission Rate
        const _tempEmissionRate = dict.emissionRate;
        if (_tempEmissionRate) {
            this.emissionRate = _tempEmissionRate;
        } else {
            this.emissionRate = Math.min(this.totalParticles / this.life, Number.MAX_VALUE);
        }

        // duration
        this.duration = parseFloat(dict.duration || 0);

        // blend function // remove when component remove blend function
        this._srcBlendFactor = parseInt(dict.blendFuncSource || BlendFactor.SRC_ALPHA);
        this._dstBlendFactor = parseInt(dict.blendFuncDestination || BlendFactor.ONE_MINUS_SRC_ALPHA);

        // color
        const locStartColor = this._startColor;
        locStartColor.r = parseFloat(dict.startColorRed || 0) * 255;
        locStartColor.g = parseFloat(dict.startColorGreen || 0) * 255;
        locStartColor.b = parseFloat(dict.startColorBlue || 0) * 255;
        locStartColor.a = parseFloat(dict.startColorAlpha || 0) * 255;

        const locStartColorVar = this._startColorVar;
        locStartColorVar.r = parseFloat(dict.startColorVarianceRed || 0) * 255;
        locStartColorVar.g = parseFloat(dict.startColorVarianceGreen || 0) * 255;
        locStartColorVar.b = parseFloat(dict.startColorVarianceBlue || 0) * 255;
        locStartColorVar.a = parseFloat(dict.startColorVarianceAlpha || 0) * 255;

        const locEndColor = this._endColor;
        locEndColor.r = parseFloat(dict.finishColorRed || 0) * 255;
        locEndColor.g = parseFloat(dict.finishColorGreen || 0) * 255;
        locEndColor.b = parseFloat(dict.finishColorBlue || 0) * 255;
        locEndColor.a = parseFloat(dict.finishColorAlpha || 0) * 255;

        const locEndColorVar = this._endColorVar;
        locEndColorVar.r = parseFloat(dict.finishColorVarianceRed || 0) * 255;
        locEndColorVar.g = parseFloat(dict.finishColorVarianceGreen || 0) * 255;
        locEndColorVar.b = parseFloat(dict.finishColorVarianceBlue || 0) * 255;
        locEndColorVar.a = parseFloat(dict.finishColorVarianceAlpha || 0) * 255;

        // particle size
        this.startSize = parseFloat(dict.startParticleSize || 0);
        this.startSizeVar = parseFloat(dict.startParticleSizeVariance || 0);
        this.endSize = parseFloat(dict.finishParticleSize || 0);
        this.endSizeVar = parseFloat(dict.finishParticleSizeVariance || 0);

        // position
        // Make empty positionType value and old version compatible
        this.positionType = parseFloat(dict.positionType !== undefined ? dict.positionType : PositionType.FREE);
        // for
        this.sourcePos.set(0, 0);
        this.posVar.set(parseFloat(dict.sourcePositionVariancex || 0), parseFloat(dict.sourcePositionVariancey || 0));
        // angle
        this.angle = parseFloat(dict.angle || 0);
        this.angleVar = parseFloat(dict.angleVariance || 0);

        // Spinning
        this.startSpin = parseFloat(dict.rotationStart || 0);
        this.startSpinVar = parseFloat(dict.rotationStartVariance || 0);
        this.endSpin = parseFloat(dict.rotationEnd || 0);
        this.endSpinVar = parseFloat(dict.rotationEndVariance || 0);

        this.emitterMode = parseInt(dict.emitterType || EmitterMode.GRAVITY);

        // Mode A: Gravity + tangential accel + radial accel
        if (this.emitterMode === EmitterMode.GRAVITY) {
            // gravity
            this.gravity.set(parseFloat(dict.gravityx || 0), parseFloat(dict.gravityy || 0));
            // speed
            this.speed = parseFloat(dict.speed || 0);
            this.speedVar = parseFloat(dict.speedVariance || 0);

            // radial acceleration
            this.radialAccel = parseFloat(dict.radialAcceleration || 0);
            this.radialAccelVar = parseFloat(dict.radialAccelVariance || 0);

            // tangential acceleration
            this.tangentialAccel = parseFloat(dict.tangentialAcceleration || 0);
            this.tangentialAccelVar = parseFloat(dict.tangentialAccelVariance || 0);

            // rotation is dir
            let locRotationIsDir = dict.rotationIsDir || '';
            if (locRotationIsDir !== null) {
                locRotationIsDir = locRotationIsDir.toString().toLowerCase();
                this.rotationIsDir = (locRotationIsDir === 'true' || locRotationIsDir === '1');
            } else {
                this.rotationIsDir = false;
            }
        } else if (this.emitterMode === EmitterMode.RADIUS) {
            // or Mode B: radius movement
            this.startRadius = parseFloat(dict.maxRadius || 0);
            this.startRadiusVar = parseFloat(dict.maxRadiusVariance || 0);
            this.endRadius = parseFloat(dict.minRadius || 0);
            this.endRadiusVar = parseFloat(dict.minRadiusVariance || 0);
            this.rotatePerS = parseFloat(dict.rotatePerSecond || 0);
            this.rotatePerSVar = parseFloat(dict.rotatePerSecondVariance || 0);
        } else {
            warnID(6009);
            return false;
        }

        this._initTextureWithDictionary(dict);
        return true;
    }

    public _syncAspect () {
        if (this._renderSpriteFrame) {
            const frameRect = this._renderSpriteFrame.rect;
            this.aspectRatio = frameRect.width / frameRect.height;
        }
    }

    public _applySpriteFrame () {
        this._renderSpriteFrame = this._renderSpriteFrame || this._spriteFrame;
        if (this._renderSpriteFrame) {
            if (this._renderSpriteFrame.texture) {
                this._simulator.updateUVs(true);
                this._syncAspect();
                this._updateMaterial();
                this._stopped = false;
                this._renderFlag = this._canRender();
            }
        } else {
            this.resetSystem();
        }
    }

    public _getTexture () {
        return (this._renderSpriteFrame && this._renderSpriteFrame.texture);
    }

    public _updateMaterial () {
        const mat = this.getMaterialInstance(0);
        if (mat) mat.recompileShaders({ USE_LOCAL: this._positionType !== PositionType.FREE });
    }

    public _finishedSimulation () {
        if (EDITOR) {
            if (this._preview && this._focused && !this.active /* && !cc.engine.isPlaying */) {
                this.resetSystem();
            }
            return;
        }
        this.resetSystem();
        this.stopSystem();
        this._renderFlag = this._canRender();
        if (this.autoRemoveOnFinish && this._stopped) {
            this.node.destroy();
        }
    }

    protected _canRender () {
        return super._canRender() && !this._stopped && this._renderSpriteFrame !== null;
    }

    protected _render (render: Batcher2D) {
        if (this._positionType === PositionType.RELATIVE) {
            render.commitComp(this, this._renderSpriteFrame, this._assembler!, this.node.parent);
        } else if (this.positionType === PositionType.GROUPED) {
            render.commitComp(this, this._renderSpriteFrame, this._assembler!, this.node);
        } else {
            render.commitComp(this, this._renderSpriteFrame, this._assembler!, null);
        }
    }
}
