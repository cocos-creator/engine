/**
 * @hidden
 */

import { ccclass, executeInEditMode } from '../../core/data/class-decorator';
import { color4, toRadian } from '../../core/vmath';
import { RenderView } from '../../pipeline/render-view';
import { Camera } from '../../renderer';
import { CameraComponent } from './camera-component';

@ccclass('cc.EditorCameraComponent')
export class EditorCameraComponent extends CameraComponent {

    private _uiEditorCamera: Camera | null = null;

    set projection (val) {
        // @ts-ignore
        super.projection = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.projectionType = val;
        }
    }

    set fov (val) {
        // @ts-ignore
        super.fov = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.fov = toRadian(val);
        }
    }

    set orthoHeight (val) {
        // @ts-ignore
        super.orthoHeight = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.orthoHeight = val;
        }
    }

    set near (val) {
        // @ts-ignore
        super.near = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.nearClip = val;
        }
    }

    set far (val) {
        // @ts-ignore
        super.far = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.farClip = val;
        }
    }

    set color (val) {
        // @ts-ignore
        super.color = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.clearColor =
                color4.create(val.r / 255, val.g / 255, val.b / 255, val.a / 255);
        }
    }

    set depth (val) {
        // @ts-ignore
        super.depth = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.clearDepth = val;
        }
    }

    set stencil (val) {
        // @ts-ignore
        super.stencil = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.clearStencil = val;
        }
    }

    set clearFlags (val) {
        // @ts-ignore
        super.clearFlags = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.clearFlag = val;
        }
    }

    set rect (val) {
        // @ts-ignore
        super.rect = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.viewport = val;
        }
    }

    set screenScale (val) {
        // @ts-ignore
        super.screenScale = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.screenScale = val;
        }
    }

    set targetDisplay (val) {
        // @ts-ignore
        super.targetDisplay = val;
        if (this._uiEditorCamera) {
            this._uiEditorCamera.changeTargetDisplay(val);
        }
    }

    public onLoad () {
        super.onLoad();
    }

    public onEnable () {
        super.onEnable();
    }

    public onDisable () {
        super.onDisable();
    }

    public onDestroy () {
        super.onDestroy();
        if (this._uiEditorCamera) {
            cc.director.root.ui.renderScene.destroyCamera(this._uiEditorCamera);
            this._uiEditorCamera = null;
        }
    }

    protected _createCamera () {
        const priorCamera = this._camera;
        super._createCamera();
        if (this._camera !== priorCamera && this._camera) {
            if (this._uiEditorCamera) {
                cc.director.root.ui.renderScene.destroyCamera(this._uiEditorCamera);
                this._uiEditorCamera = null;
            }
            this._uiEditorCamera = cc.director.root.ui.renderScene.createCamera({
                name: 'Editor UICamera',
                node: this._camera.node,
                projection: this._projection,
                targetDisplay: this._targetDisplay,
                priority: this._priority,
                isUI: true,
                flows: ['UIFlow'],
            });
            this._uiEditorCamera!.viewport = this._camera.viewport;
            this._uiEditorCamera!.fov = this._camera.fov;
            this._uiEditorCamera!.nearClip = this._camera.nearClip;
            this._uiEditorCamera!.farClip = this._camera.farClip;
            this._uiEditorCamera!.clearColor = this._camera.clearColor;
            this._uiEditorCamera!.clearDepth = this._camera.clearDepth;
            this._uiEditorCamera!.clearStencil = this._camera.clearStencil;
            this._uiEditorCamera!.clearFlag = this._camera.clearFlag;
        }
    }
}
