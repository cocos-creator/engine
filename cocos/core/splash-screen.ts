/**
 * @packageDocumentation
 * @hidden
 */

import * as easing from './animation/easing';
import { Material } from './assets/material';
import { clamp01 } from './math/utils';
import { COCOSPLAY, XIAOMI, JSB } from 'internal:constants';
import { sys } from './platform/sys';
import {
    GFXSampler, GFXSamplerInfo, GFXShader, GFXTexture, GFXTextureInfo, GFXDevice, GFXInputAssembler, GFXInputAssemblerInfo, GFXAttribute, GFXBuffer,
    GFXBufferInfo, GFXRect, GFXColor, GFXBufferTextureCopy, GFXFramebuffer, GFXCommandBuffer } from './gfx';
import { PipelineStateManager } from './pipeline';
import { legacyCC } from './global-exports';
import { Root } from './root';
import { DSPool, ShaderPool, PassPool, PassView } from './renderer/core/memory-pools';
import { SetIndex } from './pipeline/define';
import {
    GFXBufferUsageBit, GFXFormat,
    GFXMemoryUsageBit, GFXTextureType, GFXTextureUsageBit, GFXAddress
} from './gfx/define';

export type SplashEffectType = 'NONE' | 'FADE-INOUT';

export interface ISplashSetting {
    readonly totalTime: number;
    readonly base64src: string;
    readonly effect: SplashEffectType;
    readonly clearColor: GFXColor;
    readonly displayRatio: number;
    readonly displayWatermark: boolean;
}

export class SplashScreen {
    private set splashFinish (v: boolean) {
        this._splashFinish = v;
        this._tryToStart();
    }
    public set loadFinish (v: boolean) {
        this._loadFinish = v;
        this._tryToStart();
    }

    private handle: number = 0;
    private callBack: Function | null = null;
    private cancelAnimate: boolean = false;
    private startTime: number = -1;
    private setting!: ISplashSetting;
    private image!: TexImageSource;
    private root!: Root;
    private device!: GFXDevice;
    private sampler!: GFXSampler;
    private cmdBuff!: GFXCommandBuffer;
    private assmebler!: GFXInputAssembler;
    private vertexBuffers!: GFXBuffer;
    private indicesBuffers!: GFXBuffer;
    private shader!: GFXShader;
    private framebuffer!: GFXFramebuffer;
    private renderArea!: GFXRect;
    private region!: GFXBufferTextureCopy;
    private material!: Material;
    private texture!: GFXTexture;
    private clearColors!: GFXColor[];

    private _splashFinish: boolean = false;
    private _loadFinish: boolean = false;
    private _directCall: boolean = false;

    /** text */
    private textImg!: TexImageSource;
    private textRegion!: GFXBufferTextureCopy;
    private textTexture!: GFXTexture;
    private textVB!: GFXBuffer;
    private textIB!: GFXBuffer;
    private textAssmebler!: GFXInputAssembler;
    private textMaterial!: Material;
    private textShader!: GFXShader;

    private screenWidth!: number;
    private screenHeight!: number;

    public main (root: Root) {
        if (root == null) return console.error('RENDER ROOT IS NULL.');

        if (window._CCSettings && window._CCSettings.splashScreen) {
            this.setting = window._CCSettings.splashScreen;
            (this.setting.totalTime as number) = this.setting.totalTime != null ? this.setting.totalTime : 3000;
            (this.setting.base64src as string) = this.setting.base64src || '';
            (this.setting.effect as SplashEffectType) = this.setting.effect || 'FADE-INOUT';
            (this.setting.clearColor as GFXColor) = this.setting.clearColor || new GFXColor(0.88, 0.88, 0.88, 1);
            (this.setting.displayRatio as number) = this.setting.displayRatio != null ? this.setting.displayRatio : 0.4;
            (this.setting.displayWatermark as boolean) = this.setting.displayWatermark != null ? this.setting.displayWatermark : true;
        } else {
            this.setting = {
                totalTime: 3000,
                base64src: '',
                effect: 'FADE-INOUT',
                clearColor: new GFXColor(0.88, 0.88, 0.88, 1),
                displayRatio: 0.4,
                displayWatermark: true
            };
        }

        if (this.setting.base64src === '' || this.setting.totalTime <= 0) {
            if (this.callBack) { this.callBack(); }
            this.callBack = null;
            (this.setting as any) = null;
            this._directCall = true;
            return;
        } else {
            legacyCC.view.enableRetina(true);
            const designRes = window._CCSettings.designResolution;
            if (designRes) {
                legacyCC.view.setDesignResolutionSize(designRes.width, designRes.height, designRes.policy);
            } else {
                legacyCC.view.setDesignResolutionSize(960, 640, 4);
            }
            this.root = root;
            this.device = root.device;
            legacyCC.game.once(legacyCC.Game.EVENT_GAME_INITED, () => {
                legacyCC.director._lateUpdate = performance.now();
            }, legacyCC.director);

            this.callBack = null;
            this.cancelAnimate = false;
            this.startTime = -1;

            // this.setting.clearColor may not an instance of GFXColor, so should create
            // GFXColor manually, or will have problem on native.
            const clearColor = this.setting.clearColor;
            this.clearColors = [ new GFXColor(clearColor.x, clearColor.y, clearColor.z, clearColor.w) ];

            this.screenWidth = this.device.width;
            this.screenHeight = this.device.height;

            this.image = new Image();
            this.image.onload = this.init.bind(this);
            this.image.src = this.setting.base64src;
        }
    }

    public setOnFinish (cb: Function) {
        if (this._directCall) {
            if (cb) {
                SplashScreen._ins = undefined;
                return cb();
            }
        }
        this.callBack = cb;
    }

    private _tryToStart () {
        if (this._splashFinish && this._loadFinish) {
            if (this.callBack) {
                this.callBack();
                this.hide();
                legacyCC.game.resume();
            }
        }
    }

    private init () {
        // adapt for native mac & ios
        if (JSB) {
            if (sys.os === legacyCC.sys.OS_OSX || sys.os === legacyCC.sys.OS_IOS) {
                const width = screen.width * devicePixelRatio;
                const height = screen.height * devicePixelRatio;
                this.device.resize(width, height);
                this.screenWidth = this.device.width;
                this.screenHeight = this.device.height;
            }
        }

        // TODO: hack for cocosPlay & XIAOMI cause on landscape canvas value is wrong
        if (COCOSPLAY || XIAOMI) {
            if (window._CCSettings.orientation === 'landscape' && this.device.width < this.device.height) {
                const width = this.device.height;
                const height = this.device.width;
                this.device.resize(width, height);
                this.screenWidth = this.device.width;
                this.screenHeight = this.device.height;
            }
        }

        this.initCMD();
        this.initIA();
        this.initPSO();

        if (this.setting.displayWatermark) {
            this.initText();
        }

        const animate = (time: number) => {
            if (this.cancelAnimate) {
                return;
            }

            if (this.startTime < 0) {
                this.startTime = time;
            }
            const elapsedTime = time - this.startTime;

            /** update uniform */
            const PERCENT = clamp01(elapsedTime / this.setting.totalTime);
            let u_p = easing.cubicOut(PERCENT);
            if (this.setting.effect === 'NONE') u_p = 1.0;
            this.material.setProperty('u_precent', u_p);
            this.material.passes[0].update();

            if (this.setting.displayWatermark && this.textMaterial) {
                this.textMaterial.setProperty('u_precent', u_p);
                this.textMaterial.passes[0].update();
            }

            this.frame(time);

            if (elapsedTime > this.setting.totalTime) {
                this.splashFinish = true;
            }

            requestAnimationFrame(animate);
        };
        legacyCC.game.pause();
        this.handle = requestAnimationFrame(animate);
    }

    private hide () {
        cancelAnimationFrame(this.handle);
        this.cancelAnimate = true;
        // here delay destroy：because ios immediately destroy input assmebler will crash & native renderer will mess.
        setTimeout(this.destroy.bind(this));
    }

    private frame (time: number) {
        if (this.cancelAnimate) return;

        // TODO: hack for cocosPlay & XIAOMI cause on landscape canvas value is wrong
        if (COCOSPLAY || XIAOMI) {
            if (window._CCSettings.orientation === 'landscape' && this.device.width < this.device.height) {
                const width = this.device.height;
                const height = this.device.width;
                this.device.resize(width, height);
                this.screenWidth = this.device.width;
                this.screenHeight = this.device.height;
            }
        }

        const device = this.device;
        device.acquire();

        // record command
        const cmdBuff = this.cmdBuff;
        const framebuffer = this.framebuffer;
        const renderArea = this.renderArea;

        cmdBuff.begin();
        cmdBuff.beginRenderPass(framebuffer.renderPass, framebuffer, renderArea,
            this.clearColors, 1.0, 0);

        const hPass = this.material.passes[0].handle;
        const pso = PipelineStateManager.getOrCreatePipelineState(device, hPass, this.shader, framebuffer.renderPass, this.assmebler);
        cmdBuff.bindPipelineState(pso);
        cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, DSPool.get(PassPool.get(hPass, PassView.DESCRIPTOR_SET)));
        cmdBuff.bindInputAssembler(this.assmebler);
        cmdBuff.draw(this.assmebler);

        if (this.setting.displayWatermark && this.textShader && this.textAssmebler) {
            const hPassText = this.textMaterial.passes[0].handle;
            const psoWatermark = PipelineStateManager.getOrCreatePipelineState(device, hPassText, this.textShader, framebuffer.renderPass, this.textAssmebler);
            cmdBuff.bindPipelineState(psoWatermark);
            cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, DSPool.get(PassPool.get(hPassText, PassView.DESCRIPTOR_SET)));
            cmdBuff.bindInputAssembler(this.textAssmebler);
            cmdBuff.draw(this.textAssmebler);
        }

        cmdBuff.endRenderPass();
        cmdBuff.end();

        device.queue.submit([cmdBuff]);
        device.present();
    }

    private initText () {
        /** texure */
        this.textImg = document.createElement('canvas');
        this.textImg.width = 330;
        this.textImg.height = 30;
        this.textImg.style.width = `${this.textImg.width}`;
        this.textImg.style.height = `${this.textImg.height}`;

        const ctx = this.textImg.getContext('2d')!;
        ctx.font = `${18}px Arial`
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillStyle = '`#424242`';
        const text = 'Powered by Cocos Creator 3D';
        const textMetrics = ctx.measureText(text);
        ctx.fillText(text, (330 - textMetrics.width) / 2, 6);

        this.textRegion = new GFXBufferTextureCopy();
        this.textRegion.texExtent.width = this.textImg.width;
        this.textRegion.texExtent.height = this.textImg.height;
        this.textRegion.texExtent.depth = 1;

        this.textTexture = this.device.createTexture(new GFXTextureInfo(
            GFXTextureType.TEX2D,
            GFXTextureUsageBit.SAMPLED | GFXTextureUsageBit.TRANSFER_DST,
            GFXFormat.RGBA8,
            this.textImg.width,
            this.textImg.height,
        ));

        this.device.copyTexImagesToTexture([this.textImg], this.textTexture, [this.textRegion]);


        /** PSO */
        this.textMaterial = new Material();
        this.textMaterial.initialize({ effectName: 'util/splash-screen' });

        const pass = this.textMaterial.passes[0];
        const binding = pass.getBinding('mainTexture');
        pass.bindTexture(binding, this.textTexture!);

        this.textShader = ShaderPool.get(pass.getShaderVariant());
        DSPool.get(PassPool.get(pass.handle, PassView.DESCRIPTOR_SET)).update();

        /** Assembler */
        // create vertex buffer
        const vbStride = Float32Array.BYTES_PER_ELEMENT * 4;
        const vbSize = vbStride * 4;
        this.textVB = this.device.createBuffer(new GFXBufferInfo(
            GFXBufferUsageBit.VERTEX | GFXBufferUsageBit.TRANSFER_DST,
            GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            vbSize,
            vbStride,
        ));

        const verts = new Float32Array(4 * 4);
        let w = -this.textImg.width / 2;
        let h = -this.textImg!.height / 2;
        if (this.screenWidth < this.screenHeight) {
            w = -this.screenWidth / 2 * 0.5;
            h = w / (this.textImg.width / this.textImg.height);
        } else {
            w = -this.screenHeight / 2 * 0.5;
            h = w / (this.textImg.width / this.textImg.height);
        }
        let n = 0;
        verts[n++] = w; verts[n++] = h; verts[n++] = 0.0; verts[n++] = 1.0;
        verts[n++] = -w; verts[n++] = h; verts[n++] = 1.0; verts[n++] = 1.0;
        verts[n++] = w; verts[n++] = -h; verts[n++] = 0.0; verts[n++] = 0.0;
        verts[n++] = -w; verts[n++] = -h; verts[n++] = 1.0; verts[n++] = 0.0;

        // translate to bottom
        for (let i = 0; i < verts.length; i += 4) {
            verts[i] = verts[i] + this.screenWidth / 2;
            verts[i + 1] = verts[i + 1] + this.screenHeight * 0.1;
        }

        // transform to clipspace
        const ySign = this.device.screenSpaceSignY;
        for (let i = 0; i < verts.length; i += 4) {
            verts[i] = verts[i] / this.screenWidth * 2 - 1;
            verts[i + 1] = (verts[i + 1] / this.screenHeight * 2 - 1) * ySign;
        }

        this.textVB.update(verts);

        // create index buffer
        const ibStride = Uint16Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 6;

        this.textIB = this.device.createBuffer(new GFXBufferInfo(
            GFXBufferUsageBit.INDEX | GFXBufferUsageBit.TRANSFER_DST,
            GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));

        const indices = new Uint16Array(6);
        indices[0] = 0; indices[1] = 1; indices[2] = 2;
        indices[3] = 1; indices[4] = 3; indices[5] = 2;
        this.textIB.update(indices);

        const attributes: GFXAttribute[] = [
            new GFXAttribute('a_position', GFXFormat.RG32F),
            new GFXAttribute('a_texCoord', GFXFormat.RG32F),
        ];

        const textIAInfo = new GFXInputAssemblerInfo(attributes, [this.textVB], this.textIB);
        this.textAssmebler = this.device.createInputAssembler(textIAInfo);
    }

    private initCMD () {
        const device = this.device as GFXDevice;
        this.renderArea = new GFXRect(0, 0, device.width, device.height);
        this.framebuffer = this.root.mainWindow!.framebuffer;

        this.cmdBuff = device.commandBuffer;
    }

    private initIA () {
        const device = this.device as GFXDevice;

        // create vertex buffer
        const vbStride = Float32Array.BYTES_PER_ELEMENT * 4;
        const vbSize = vbStride * 4;
        this.vertexBuffers = device.createBuffer(new GFXBufferInfo(
            GFXBufferUsageBit.VERTEX | GFXBufferUsageBit.TRANSFER_DST,
            GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            vbSize,
            vbStride,
        ));

        const verts = new Float32Array(4 * 4);
        let w = -this.image.width / 2;
        let h = -this.image!.height / 2;
        if (this.screenWidth < this.screenHeight) {
            w = -this.screenWidth / 2 * this.setting.displayRatio;
            h = w / (this.image.width / this.image.height);
        } else {
            w = -this.screenHeight / 2 * this.setting.displayRatio;
            h = w / (this.image.width / this.image.height);
        }
        let n = 0;
        verts[n++] = w; verts[n++] = h; verts[n++] = 0.0; verts[n++] = 1.0;
        verts[n++] = -w; verts[n++] = h; verts[n++] = 1.0; verts[n++] = 1.0;
        verts[n++] = w; verts[n++] = -h; verts[n++] = 0.0; verts[n++] = 0;
        verts[n++] = -w; verts[n++] = -h; verts[n++] = 1.0; verts[n++] = 0;

        // translate to center
        for (let i = 0; i < verts.length; i += 4) {
            verts[i] = verts[i] + this.screenWidth / 2;
            verts[i + 1] = verts[i + 1] + this.screenHeight / 2;
        }

        // transform to clipspace
        const ySign = device.screenSpaceSignY;
        for (let i = 0; i < verts.length; i += 4) {
            verts[i] = verts[i] / this.screenWidth * 2 - 1;
            verts[i + 1] = (verts[i + 1] / this.screenHeight * 2 - 1) * ySign;
        }

        this.vertexBuffers.update(verts);

        // create index buffer
        const ibStride = Uint16Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 6;

        this.indicesBuffers = device.createBuffer(new GFXBufferInfo(
            GFXBufferUsageBit.INDEX | GFXBufferUsageBit.TRANSFER_DST,
            GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));

        const indices = new Uint16Array(6);
        indices[0] = 0; indices[1] = 1; indices[2] = 2;
        indices[3] = 1; indices[4] = 3; indices[5] = 2;
        this.indicesBuffers.update(indices);

        const attributes: GFXAttribute[] = [
            new GFXAttribute('a_position', GFXFormat.RG32F),
            new GFXAttribute('a_texCoord', GFXFormat.RG32F),
        ];

        const IAInfo = new GFXInputAssemblerInfo(attributes, [this.vertexBuffers], this.indicesBuffers);
        this.assmebler = device.createInputAssembler(IAInfo);
    }

    private initPSO () {

        const device = this.device as GFXDevice;

        this.material = new Material();
        this.material.initialize({ effectName: 'util/splash-screen' });

        const samplerInfo = new GFXSamplerInfo();
        samplerInfo.addressU = GFXAddress.CLAMP;
        samplerInfo.addressV = GFXAddress.CLAMP;
        this.sampler = device.createSampler(samplerInfo);

        this.texture = device.createTexture(new GFXTextureInfo(
            GFXTextureType.TEX2D,
            GFXTextureUsageBit.SAMPLED | GFXTextureUsageBit.TRANSFER_DST,
            GFXFormat.RGBA8,
            this.image.width,
            this.image.height,
        ));

        const pass = this.material.passes[0];
        const binding = pass.getBinding('mainTexture');
        pass.bindTexture(binding, this.texture!);

        this.shader = ShaderPool.get(pass.getShaderVariant());
        const descriptorSet = DSPool.get(PassPool.get(pass.handle, PassView.DESCRIPTOR_SET));
        descriptorSet.bindSampler(binding!, this.sampler);
        descriptorSet.update();

        this.region = new GFXBufferTextureCopy();
        this.region.texExtent.width = this.image.width;
        this.region.texExtent.height = this.image.height;
        this.region.texExtent.depth = 1;
        device.copyTexImagesToTexture([this.image!], this.texture, [this.region]);
    }

    private destroy () {
        this.callBack = null;
        this.clearColors = null!;
        this.device = null!;
        this.image = null!;
        this.framebuffer = null!;
        this.renderArea = null!;
        this.region = null!;

        this.cmdBuff = null!;

        this.shader = null!;

        this.material.destroy();
        this.material = null!;

        this.texture.destroy();
        this.texture = null!;

        this.assmebler.destroy();
        this.assmebler = null!;

        this.vertexBuffers.destroy();
        this.vertexBuffers = null!;

        this.indicesBuffers.destroy();
        this.indicesBuffers = null!;

        this.sampler.destroy();
        this.sampler = null!;

        /** text */
        if (this.setting.displayWatermark && this.textImg) {
            this.textImg = null!;
            this.textRegion = null!;

            this.textShader = null!;

            this.textMaterial.destroy();
            this.textMaterial = null!;

            this.textTexture.destroy();
            this.textTexture = null!;

            this.textAssmebler.destroy();
            this.textAssmebler = null!;

            this.textVB.destroy();
            this.textVB = null!;

            this.textIB.destroy();
            this.textIB = null!;
        }

        this.setting = null!;
        SplashScreen._ins = undefined;
    }

    private static _ins?: SplashScreen;

    public static get instance () {
        if (!SplashScreen._ins) {
            SplashScreen._ins = new SplashScreen();
        }
        return SplashScreen._ins;
    }

    private constructor () {}
}

legacyCC.internal.SplashScreen = SplashScreen;
