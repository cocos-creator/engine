/*
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
*/

/**
 * @category scene-graph
 */

import { TextureCube } from '../assets/texture-cube';
import { ccclass, property, visible, type, displayOrder, slide, range, rangeStep} from '../data/class-decorator';
import { CCBoolean, CCFloat } from '../data/utils/attribute';
import { Color, Quat, Vec3, Vec2 } from '../math';
import { Ambient } from '../renderer/scene/ambient';
import { PlanarShadows } from '../renderer/scene/planar-shadows';
import { Skybox } from '../renderer/scene/skybox';
import { Fog, FogType } from '../renderer/scene/fog';
import { Node } from './node';
import { legacyCC } from '../global-exports';
import { Shadow } from '../renderer/scene/shadow';

const _up = new Vec3(0, 1, 0);
const _v3 = new Vec3();
const _qt = new Quat();

/**
 * @en Environment lighting information in the Scene
 * @zh 场景的环境光照相关信息
 */
@ccclass('cc.AmbientInfo')
export class AmbientInfo {
    @property
    protected _skyColor = new Color(51, 128, 204, 1.0);
    @property
    protected _skyIllum = Ambient.SKY_ILLUM;
    @property
    protected _groundAlbedo = new Color(51, 51, 51, 255);

    protected _resource: Ambient | null = null;

    /**
     * @en Sky color
     * @zh 天空颜色
     */
    @type(Color)
    set skyColor (val: Color) {
        this._skyColor.set(val);
        if (this._resource) { this._resource.skyColor = this._skyColor; }
    }
    get skyColor () {
        return this._skyColor;
    }

    /**
     * @en Sky illuminance
     * @zh 天空亮度
     */
    @type(CCFloat)
    set skyIllum (val: number) {
        this._skyIllum = val;
        if (this._resource) { this._resource.skyIllum = this.skyIllum; }
    }
    get skyIllum () {
        return this._skyIllum;
    }

    /**
     * @en Ground color
     * @zh 地面颜色
     */
    @type(Color)
    set groundAlbedo (val: Color) {
        this._groundAlbedo.set(val);
        // only RGB channels are used, alpha channel are intensionally left unchanged here
        if (this._resource) { this._resource.groundAlbedo = this._groundAlbedo; }
    }
    get groundAlbedo () {
        return this._groundAlbedo;
    }

    public activate (resource: Ambient) {
        this._resource = resource;
        this._resource.skyColor = this._skyColor;
        this._resource.skyIllum = this._skyIllum;
        this._resource.groundAlbedo = this._groundAlbedo;
    }
}
legacyCC.AmbientInfo = AmbientInfo;

/**
 * @en Skybox related information
 * @zh 天空盒相关信息
 */
@ccclass('cc.SkyboxInfo')
export class SkyboxInfo {
    @type(TextureCube)
    protected _envmap: TextureCube | null = null;
    @property
    protected _isRGBE = false;
    @property
    protected _enabled = false;
    @property
    protected _useIBL = false;

    protected _resource: Skybox | null = null;

    /**
     * @en Whether activate skybox in the scene
     * @zh 是否启用天空盒？
     */
    @type(CCBoolean)
    set enabled (val) {
        this._enabled = val;
        if (this._resource) { this._resource.enabled = this._enabled; }
    }
    get enabled () {
        return this._enabled;
    }

    /**
     * @en Whether use environment lighting
     * @zh 是否启用环境光照？
     */
    @type(CCBoolean)
    set useIBL (val) {
        this._useIBL = val;
        if (this._resource) { this._resource.useIBL = this._useIBL; }
    }
    get useIBL () {
        return this._useIBL;
    }

    /**
     * @en The texture cube used for the skybox
     * @zh 使用的立方体贴图
     */
    @type(TextureCube)
    set envmap (val) {
        this._envmap = val;
        if (this._resource) { this._resource.envmap = this._envmap; }
    }
    get envmap () {
        return this._envmap;
    }

    /**
     * @en Whether enable RGBE data support in skybox shader
     * @zh 是否需要开启 shader 内的 RGBE 数据支持？
     */
    @type(CCBoolean)
    set isRGBE (val) {
        this._isRGBE = val;
        if (this._resource) { this._resource.isRGBE = this._isRGBE; }
    }
    get isRGBE () {
        return this._isRGBE;
    }

    public activate (resource: Skybox) {
        this._resource = resource;
        this._resource.enabled = this._enabled;
        this._resource.isRGBE = this._isRGBE;
        this._resource.envmap = this._envmap;
        this._resource.useIBL = this._useIBL;
    }
}
legacyCC.SkyboxInfo = SkyboxInfo;

/**
 * @zh 全局雾相关信息
 * @en Global fog info
 */
@ccclass('cc.FogInfo')
export class FogInfo {
    public static FogType = FogType;
    @property
    protected _type = FogType.LINEAR;
    @property
    protected _fogColor = new Color('#C8C8C8');
    @property
    protected _enabled = false;
    @property
    protected _fogDensity = 0.3;
    @property
    protected _fogStart = 0.5;
    @property
    protected _fogEnd = 300;
    @property
    protected _fogAtten = 5;
    @property
    protected _fogTop = 1.5;
    @property
    protected _fogRange = 1.2;
    protected _resource: Fog | null = null;
    /**
     * @zh 是否启用全局雾效
     * @en Enable global fog
     */
    @type(CCBoolean)
    set enabled (val: boolean) {
        this._enabled = val;
        if (this._resource) { this._resource.enabled = val; }
    }

    get enabled () {
        return this._enabled;
    }

    /**
     * @zh 全局雾颜色
     * @en Global fog color
     */
    @type(Color)
    set fogColor (val: Color) {
        this._fogColor.set(val);
        if (this._resource) { this._resource.fogColor = this._fogColor; }
    }

    get fogColor () {
        return this._fogColor;
    }

    /**
     * @zh 全局雾类型
     * @en Global fog type
     */
    @type(FogType)
    get type () {
        return this._type;
    }

    set type (val) {
        this._type = val;
        if (this._resource) { this._resource.type = val; }
    }

    /**
     * @zh 全局雾浓度
     * @en Global fog density
     */
    @type(CCFloat)
    @range([0, 1])
    @rangeStep(0.01)
    @slide(true)
    @displayOrder(3)
    @visible(function (this: Fog) {
        return this._type !== FogType.LAYERED && this._type !== FogType.LINEAR;
    })
    get fogDensity () {
        return this._fogDensity;
    }

    set fogDensity (val) {
        this._fogDensity = val;
        if (this._resource) { this._resource.fogDensity = val; }
    }

    /**
     * @zh 雾效起始位置，只适用于线性雾
     * @en Global fog start position, only for linear fog
     */
    @type(CCFloat)
    @rangeStep(0.1)
    @displayOrder(4)
    @visible(function (this: Fog) { return this._type === FogType.LINEAR; })
    get fogStart () {
        return this._fogStart;
    }

    set fogStart (val) {
        this._fogStart = val;
        if (this._resource) { this._resource.fogStart = val; }
    }

    /**
     * @zh 雾效结束位置，只适用于线性雾
     * @en Global fog end position, only for linear fog
     */
    @type(CCFloat)
    @rangeStep(0.1)
    @displayOrder(5)
    @visible(function (this: Fog) {  return this._type === FogType.LINEAR; })
    get fogEnd () {
        return this._fogEnd;
    }

    set fogEnd (val) {
        this._fogEnd = val;
        if (this._resource) { this._resource.fogEnd = val; }
    }

    /**
     * @zh 雾效衰减
     * @en Global fog attenuation
     */
    @type(CCFloat)
    @rangeStep(0.1)
    @displayOrder(6)
    @visible(function (this: Fog) { return this._type !== FogType.LINEAR; })
    get fogAtten () {
        return this._fogAtten;
    }

    set fogAtten (val) {
        this._fogAtten = val;
        if (this._resource) { this._resource.fogAtten = val; }
    }

    /**
     * @zh 雾效顶部范围，只适用于层级雾
     * @en Global fog top range, only for layered fog
     */
    @type(CCFloat)
    @rangeStep(0.1)
    @displayOrder(7)
    @visible(function (this: Fog) { return this._type === FogType.LAYERED; })
    get fogTop () {
        return this._fogTop;
    }

    set fogTop (val) {
        this._fogTop = val;
        if (this._resource) { this._resource.fogTop = val; }
    }

    /**
     * @zh 雾效范围，只适用于层级雾
     * @en Global fog range, only for layered fog
     */
    @type(CCFloat)
    @rangeStep(0.1)
    @displayOrder(8)
    @visible(function (this: Fog) { return this._type === FogType.LAYERED; })
    get fogRange () {
        return this._fogRange;
    }

    set fogRange (val) {
        this._fogRange = val;
        if (this._resource) { this._resource.fogRange = val; }
    }

    public activate (resource: Fog) {
        this._resource = resource;
        this._resource.enabled = this._enabled;
        this._resource.fogColor = this._fogColor;
        this._resource.type = this._type;
        this._resource.fogDensity = this._fogDensity;
        this._resource.fogStart = this._fogStart;
        this._resource.fogEnd = this._fogEnd;
        this._resource.fogAtten = this._fogAtten;
        this._resource.fogTop = this._fogTop;
        this._resource.fogRange = this._fogRange;
    }
}

/**
 * @en Scene level planar shadow related information
 * @zh 平面阴影相关信息
 */
@ccclass('cc.PlanarShadowInfo')
export class PlanarShadowInfo {
    @property
    protected _enabled = false;
    @property
    protected _normal = new Vec3(0, 1, 0);
    @property
    protected _distance = 0;
    @property
    protected _shadowColor = new Color(0, 0, 0, 76);

    protected _resource: PlanarShadows | null = null;

    /**
     * @en Whether activate planar shadow
     * @zh 是否启用平面阴影？
     */
    @type(CCBoolean)
    set enabled (val: boolean) {
        this._enabled = val;
        if (this._resource) { this._resource.enabled = val; }
    }
    get enabled () {
        return this._enabled;
    }

    /**
     * @en The normal of the plane which receives shadow
     * @zh 阴影接收平面的法线
     */
    @type(Vec3)
    set normal (val: Vec3) {
        Vec3.copy(this._normal, val);
        if (this._resource) { this._resource.normal = val; }
    }
    get normal () {
        return this._normal;
    }

    /**
     * @en The distance from coordinate origin to the receiving plane.
     * @zh 阴影接收平面与原点的距离
     */
    @type(CCFloat)
    set distance (val: number) {
        this._distance = val;
        if (this._resource) { this._resource.distance = val; }
    }
    get distance () {
        return this._distance;
    }

    /**
     * @en Shadow color
     * @zh 阴影颜色
     */
    @type(Color)
    set shadowColor (val: Color) {
        this._shadowColor.set(val);
        if (this._resource) { this._resource.shadowColor = val; }
    }
    get shadowColor () {
        return this._shadowColor;
    }

    /**
     * @en Set plane which receives shadow with the given node's world transformation
     * @zh 根据指定节点的世界变换设置阴影接收平面的信息
     * @param node The node for setting up the plane
     */
    public setPlaneFromNode (node: Node) {
        node.getWorldRotation(_qt);
        this.normal = Vec3.transformQuat(_v3, _up, _qt);
        node.getWorldPosition(_v3);
        this.distance = Vec3.dot(this._normal, _v3);
    }

    public activate (resource: PlanarShadows) {
        this._resource = resource;
        this._resource.normal = this._normal;
        this._resource.distance = this._distance;
        this._resource.shadowColor = this._shadowColor;
        this._resource.enabled = this._enabled;
    }
}
legacyCC.PlanarShadowInfo = PlanarShadowInfo;

/**
 * @en Scene level shadow related information
 * @zh 常规阴影相关信息
 */
@ccclass('cc.ShadowInfo')
export class ShadowInfo {
    @property
    protected _enabled: boolean = false;
    @property
    protected _near: number = 1;
    @property
    protected _far: number = 30;
    @property
    protected _aspect: number = 1;
    @property
    protected _orthoSize: number = 5;
    @property
    protected _size: Vec2 = new Vec2(512, 512);

    protected _resource: Shadow | null = null;

    /**
     * @en Whether activate shadow
     * @zh 是否启用常规阴影？
     */
    @type(CCBoolean)
    set enabled (val: boolean) {
        this._enabled = val;
        if (this._resource) {
            this._resource.enabled = val;
        }
    }
    get enabled () {
        return this._enabled;
    }

    /**
     * @en get or set shadow camera near
     * @zh 获取或者设置阴影相机近裁剪面
     */
    @type(CCFloat)
    set near (val: number) {
        this._near = val;
        if (this._resource) { this._resource.near = val; }
    }
    get near () {
        return this._near;
    }

    /**
     * @en get or set shadow camera far
     * @zh 获取或者设置阴影相机远裁剪面
     */
    @type(CCFloat)
    set far (val: number) {
        this._far = val;
        if (this._resource) { this._resource.far = val; }
    }
    get far () {
        return this._far;
    }

    /**
     * @en get or set shadow camera orthoSize
     * @zh 获取或者设置阴影相机正交大小
     */
    @type(CCFloat)
    set orthoSize (val: number) {
        this._orthoSize = val;
        if (this._resource) { this._resource.orthoSize = val; }
    }
    get orthoSize () {
        return this._orthoSize;
    }

    /**
     * @en get or set shadow camera orthoSize
     * @zh 获取或者设置阴影纹理大小
     */
    @type(Vec2)
    set shadowMapSize (val: Vec2) {
        this._size.set(val);
        if (this._resource) { this._resource.size = val; }
    }
    get shadowMapSize () {
        return this._size;
    }

    /**
     * @en get or set shadow camera orthoSize
     * @zh 获取或者设置阴影纹理大小
     */
    @type(CCFloat)
    set aspect (val: number) {
        this._aspect = val;
        if (this._resource) { this._resource.aspect = val; }
    }
    get aspect () {
        return this._aspect;
    }

    public activate (resource: Shadow) {
        this._resource = resource;
        this._resource.enabled = this._enabled;
        this._resource.near = this._near;
        this._resource.far = this._far;
        this._resource.orthoSize = this._orthoSize;
        this._resource.size = this._size;
    }
}

/**
 * @en All scene related global parameters, it affects all content in the corresponding scene
 * @zh 各类场景级别的渲染参数，将影响全场景的所有物体
 */
@ccclass('cc.SceneGlobals')
export class SceneGlobals {
    /**
     * @en The environment light information
     * @zh 场景的环境光照相关信息
     */
    @property
    public ambient = new AmbientInfo();
    /**
     * @en Scene level planar shadow related information
     * @zh 平面阴影相关信息
     */
    @property
    public planarShadows = new PlanarShadowInfo();
    /**
     * @en shadow information
     * @zn 普通阴影相关信息
     */
    @property
    public shadowMap = new ShadowInfo();
    @property
    public _skybox = new SkyboxInfo();
    @property
    public fog = new FogInfo();

    /**
     * @en Skybox related information
     * @zh 天空盒相关信息
     */
    @type(SkyboxInfo)
    get skybox () {
        return this._skybox;
    }
    set skybox (value) {
        this._skybox = value;
    }

    public activate () {
        const pipeline = legacyCC.director.root.pipeline;
        this.ambient.activate(pipeline.ambient);
        this.skybox.activate(pipeline.skybox);
        this.planarShadows.activate(pipeline.planarShadows);
        this.shadowMap.activate(pipeline.shadowMap);
        this.fog.activate(pipeline.fog);
    }
}
legacyCC.SceneGlobals = SceneGlobals;
