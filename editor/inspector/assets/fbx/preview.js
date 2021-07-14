const animation = require('./animation');
const events = require('./events');
const eventEditor = require('./event-editor');

exports.template = `
<div class="preview">
    <div class="animation-info">
        <div class="flex">
            <div class="toolbar" id="timeCtrl">
                <ui-icon value="rewind" name="jump_first_frame"></ui-icon>
                <ui-icon value="prev-play" name="jump_prev_frame"></ui-icon>
                <ui-icon id="playButtonIcon" value="play" name="play"></ui-icon>
                <ui-icon value="next-play" name="jump_next_frame"></ui-icon>
                <ui-icon value="forward" name="jump_last_frame"></ui-icon>
                <ui-icon value="stop" name="stop"></ui-icon>
                <ui-icon value="event" name="add_event"></ui-icon>
            </div>
            <div class="time flex toolbar f1">
                <ui-label value="Time"></ui-label>
                <ui-num-input id="currentTime"></ui-num-input>
                <div class="duration"></div>
            </div>
        </div>
        <div class="time-line">
            <ui-scale-plate tooltip="Frame" id="animationTime"></ui-scale-plate>
            <div class="events"></div>
        </div>
    </div>
    <div class="model-info">
        <ui-label value="Vertices:0" class="vertices"></ui-label>
        <ui-label value="Triangles:0" class="triangles"></ui-label>
    </div>

    <div class="event-editor">
    </div>

    <div class="image">
        <canvas class="canvas"></canvas>
    </div>
</div>
`;

exports.style = `
.flex {
    display: flex;
}

.f1 {
    flex: 1;
}
.preview {
    margin-top: 10px;
    border-top: 1px solid var(--color-normal-border);
}
.preview > .model-info {
    padding-top: 5px;
    display: none;
}
.preview > .model-info > ui-label {
    margin-right: 6px;
}
.preview > .image {
    height: 200px;
    overflow: hidden;
    display: flex;
    flex: 1;
    margin-right: 10px;
}
.preview >.image > .canvas {
    flex: 1;
}
.preview .toolbar {
    display: flex;
    margin-top: 10px;
    justify-content: space-between;
}

.preview .toolbar ui-num-input {
    display: flex;
    flex: 1;
}
.preview .toolbar > * {
    line-height: 25px;
    margin-right: 5px;
}

ui-icon {
    cursor: pointer;
}

.time-line {
    position: relative;
}

.time-line .events {
    position: absolute;
    bottom: 5px;
    box-sizing: border-box;
    padding: 0 8px;
    width: 100%;
}
.time-line ui-scaleplate {
    width: 100%;
}

.events ui-icon {
    position: absolute;
    bottom: -4px;
    color: #f5f06d;
}

.events ui-icon:hover {
    color: #f4f189;
    cursor: pointer;
}

.mask {
    position: absolute;
    z-index: 2;
    width: 100%;
    height: 100vh;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: var(--color-normal-fill);
    opacity: 0.3;
}

.event-editor {
    background: var(--color-normal-fill);
}
#event-editor {
    line-height: 24px;
    width: 100%;
    height: 70%;
    overflow: hidden;
    margin: 0 auto;
    background: #312f2f;
    display: flex;
    flex-direction: column;
    border: var(--color-normal-fill-emphasis) 1px solid;
    box-sizing: border-box;
  }
  #event-editor > header {
    display: flex;
    justify-content: space-between;
    height: 24px;
    background: var(--color-normal-fill-emphasis);
    padding: 5px;
  }
  #event-editor > .header .name {
    margin: 0 5px;
  }
  #event-editor > .header .dirty {
    color: var(--color-focus-fill);
    margin: 0 2px;
  }
  #event-editor > .functions {
    padding: 10px;
    overflow-y: auto;
    flex: 1;
    height: 100%;
    padding-top: 0;
    background: var(--color-normal-fill-normal);
    margin-bottom: 2px;
  }
  #event-editor > .functions .header,
  #event-editor > .functions .line {
    display: flex;
    justify-content: space-between;
    padding: 0 8px;
    flex: 1;
    background: unset;
  }
  #event-editor > .functions .line {
    margin-bottom: 4px;
  }
  #event-editor > .functions .line .name {
    min-width: 8px;
  }
  #event-editor > .functions .line > * {
    margin-right: 5px;
  }
  #event-editor > .functions .line .operate {
    visibility: hidden;
  }
  #event-editor > .functions .line:hover .operate {
    visibility: visible;
  }
  #event-editor > .functions .header ui-input {
    background-color: transparent;
    border-color: transparent;
    line-height: 18px;
  }
  #event-editor > .functions .header ui-input:hover {
    background-color: var(--color-normal-fill-emphasis);
  }
  #event-editor > .functions > * {
    margin-top: 10px;
  }
  #event-editor ui-input,
  #event-editor ui-checkbox,
  #event-editor ui-num-input {
    width: 100%;
    height: 25px;
  }
  #event-editor ui-section {
    width: 100%;
  }
  #event-editor ui-icon:hover {
    cursor: pointer;
    color: #cccccc;
  }
  #event-editor .tools {
    display: flex;
    border-bottom: 1px solid;
    padding: 10px 0;
  }
  #event-editor .tools ui-icon {
    margin: 0 5px;
  }
  #event-editor .params {
    border: 1px rgba(136, 136, 136, 0.35) dashed;
    border-radius: calc(var(--size-normal-radius) * 1px);
  }
  #event-editor .header ui-icon,
  #event-editor .params ui-icon {
    margin: 0 5px;
  }
  #event-editor .empty {
    font-style: italic;
    text-align: center;
  }
`;

const PLAY_STATE = {
    STOP: 0,
    PLAYING: 1,
    PAUSE: 2,
};

exports.$ = {
    container: '.preview',
    vertices: '.vertices',
    triangles: '.triangles',
    image: '.image',
    canvas: '.canvas',
    animationInfo: '.animation-info',
    modelInfo: '.model-info',
    playButtonIcon: '#playButtonIcon',
    animationTime: '#animationTime',
    currentTime: '#currentTime',
    events: ".events",
    duration: ".duration",
    eventEditor: ".event-editor",
    timeCtrl: "#timeCtrl",
};

const Elements = {
    preview: {
        ready() {
            const panel = this;

            panel.$.canvas.addEventListener('mousedown', async (event) => {
                await Editor.Message.request('scene', 'on-model-preview-mouse-down', { x: event.x, y: event.y });

                async function mousemove(event) {
                    await Editor.Message.request('scene', 'on-model-preview-mouse-move', {
                        movementX: event.movementX,
                        movementY: event.movementY,
                    });

                    panel.isPreviewDataDirty = true;
                }

                async function mouseup(event) {
                    await Editor.Message.request('scene', 'on-model-preview-mouse-up', {
                        x: event.x,
                        y: event.y,
                    });

                    document.removeEventListener('mousemove', mousemove);
                    document.removeEventListener('mouseup', mouseup);

                    panel.isPreviewDataDirty = false;
                }

                document.addEventListener('mousemove', mousemove);
                document.addEventListener('mouseup', mouseup);

                panel.isPreviewDataDirty = true;
            });

            const GlPreview = Editor._Module.require('PreviewExtends').default;
            panel.glPreview = new GlPreview('scene:model-preview', 'query-model-preview-data');
            panel.isPreviewDataDirty = true;
        },
        async update() {
            const panel = this;

            if (!panel.$.canvas) {
                return;
            }

            await panel.glPreview.init({ width: panel.$.canvas.clientWidth, height: panel.$.canvas.clientHeight });
            if (panel.asset.redirect) {
                const info = await Editor.Message.request('scene', 'set-model-preview-model', panel.asset.redirect.uuid);
                panel.infoUpdate(info);
            }

            panel.refreshPreview();
        },
    },
    modelInfo: {
        ready() {
            this.infoUpdate = Elements.modelInfo.update.bind(this);
        },
        update(info) {
            if (!info) {
                return;
            }
            this.$.vertices.value = `Vertices:${info.vertices}`;
            this.$.triangles.value = `Triangles:${info.polygons}`;
            this.isPreviewDataDirty = true;
        },
        close() {
            Editor.Message.send('scene', 'hide-model-preview');
        },
    },
    animationTime: {
        ready() {
            const timeline = this.$.animationTime;
            timeline.addEventListener('change', this.onAnimationTimeChange.bind(this));
            timeline.addEventListener('transform', this.updateEventInfo.bind(this));
        },
    },
    currentTime: {
        ready() {
            const currentTime = this.$.currentTime;
            currentTime.addEventListener('confirm', this.onAnimationTimeChange.bind(this));
        },
    },
    timeCtrl: {
        ready() {
            this.$.timeCtrl.addEventListener('click', this.onTimeCtrlClick.bind(this));
        },
    },
};

exports.update = async function(assetList, metaList) {
    this.assetList = assetList;
    this.metaList = metaList;
    this.asset = assetList[0];
    this.meta = metaList[0];

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.update) {
            element.update.call(this);
        }
    }
    animation.methods.initAnimationNameToUUIDMap.call(this);
    animation.methods.initAnimationInfos.call(this);
    if (this.animationInfos) {
        this.rawClipIndex = 0;
        this.splitClipIndex = 0;
        const clipInfo = animation.methods.getCurClipInfo.call(this);
        await this.onEditClipInfoChanged(clipInfo);
    }
    this.setCurPlayState(PLAY_STATE.STOP);
    this.isPreviewDataDirty = true;
    this.refreshPreview();
};

exports.ready = function() {
    const panel = this;

    this.gridWidth = 0;
    this.gridTableWith = 0;
    this.activeTab = 'animation';
    this.isPreviewDataDirty = true;
    this.curEditClipInfo = null;
    this.curPlayState = PLAY_STATE.STOP;
    this.curTotalFrames = 0;
    this.onTabChangedBind = this.onTabChanged.bind(this);
    this.onModelAnimationUpdateBind = this.onModelAnimationUpdate.bind(this);
    this.onAnimationPlayStateChangedBind = this.onAnimationPlayStateChanged.bind(this);

    this.onEditClipInfoChanged = async (clipInfo) => {
        if (clipInfo) {
            await Editor.Message.request('scene', 'execute-model-preview-animation-operation', 'setEditClip', clipInfo.rawClipUUID, clipInfo.rawClipIndex);
            this.setCurEditClipInfo(clipInfo);
        }
    };

    Editor.Message.addBroadcastListener('scene:model-preview-animation-time-change', this.onModelAnimationUpdateBind);
    Editor.Message.addBroadcastListener('scene:model-preview-animation-state-change', this.onAnimationPlayStateChangedBind);
    Editor.Message.addBroadcastListener('fbx-inspector:change-tab', this.onTabChangedBind);
    Editor.Message.addBroadcastListener('fbx-inspector:animation-change', this.onEditClipInfoChanged);

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.ready) {
            element.ready.call(this);
        }
    }

    function observer() {
        panel.isPreviewDataDirty = true;
    }

    panel.resizeObserver = new window.ResizeObserver(observer);
    panel.resizeObserver.observe(panel.$.container);

    this.events = events;
    this.events.ready.call(this);

    this.eventEditor = eventEditor;
    this.events.eventsMap = {};
    this.eventEditor.ready.call(this);
};

exports.close = function() {
    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.close) {
            element.close.call(this);
        }
    }

    Editor.Message.removeBroadcastListener('scene:model-preview-animation-time-change', this.onModelAnimationUpdateBind);
    Editor.Message.removeBroadcastListener('scene:model-preview-animation-state-change', this.onAnimationPlayStateChangedBind);
    Editor.Message.removeBroadcastListener('fbx-inspector:change-tab', this.onTabChangedBind);
    Editor.Message.removeBroadcastListener('fbx-inspector:animation-change', this.onEditClipInfoChanged);

    this.resizeObserver.unobserve(this.$.container);
};

exports.methods = {
    async apply() {
        // save animation event info
        await this.events.apply.call(this);
    },
    async refreshPreview() {
        const panel = this;

        // After await, the panel no longer exists
        if (!panel.$.canvas) {
            return;
        }

        if (panel.isPreviewDataDirty || this.curPlayState === PLAY_STATE.PLAYING) {
            try {
                const canvas = panel.$.canvas;
                const image = panel.$.image;

                const width = image.clientWidth;
                const height = image.clientHeight;
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;

                    panel.glPreview.initGL(canvas, { width, height });
                    panel.glPreview.resizeGL(width, height);
                }

                const info = await panel.glPreview.queryPreviewData({
                    width: canvas.width,
                    height: canvas.height,
                });

                panel.glPreview.drawGL(info.buffer, info.width, info.height);
            } catch (e) {
                console.warn(e);
            }

            panel.isPreviewDataDirty = false;
        }

        cancelAnimationFrame(panel.animationId);
        panel.animationId = requestAnimationFrame(() => {
            panel.refreshPreview();
        });
    },
    async onTabChanged(activeTab) {
        if (typeof activeTab === 'string') {
            this.activeTab = activeTab;
            this.$.animationInfo.style.display = this.activeTab === 'animation' ? 'block' : 'none';
            this.$.modelInfo.style.display = this.activeTab === 'model' ? 'block' : 'none';
            await this.stopAnimation();
        }
    },

    onTimeCtrlClick(event) {
        const name = event.target.getAttribute('name');
        if (!name || !this.curEditClipInfo) {
            return;
        }
        switch (name) {
            case 'play':
                this.onPlayButtonClick();
                break;
            case 'stop':
                this.stopAnimation();
                break;
            case 'jump_first_frame':
                this.setCurrentFrame(0);
                break;
            case 'jump_next_frame':
                this.setCurrentFrame(this.$.currentTime.value + 1);
                break;
            case 'jump_prev_frame':
                this.setCurrentFrame(this.$.currentTime.value - 1);
                break;
            case 'jump_last_frame':
                this.setCurrentFrame(this.curTotalFrames);
                break;
            case 'add_event':
                this.addEventToCurTime();
                break;
        }
    },

    addEventToCurTime() {
        this.events.addNewEvent.call(this, this.$.animationTime.value / this.curEditClipInfo.fps);
    },

    updateEventInfo() {
        const events = this.curEditClipInfo.userData.events;
        const eventInfos = events.map((info) => {
            return {
                ...info,
                x: this.$.animationTime.valueToPixel(info.frame * this.curEditClipInfo.fps),
            };
        });
        this.events.update.call(this, eventInfos);
    },

    async stopAnimation() {
        if (!this.curEditClipInfo) {
            return;
        }

        await Editor.Message.request('scene', 'execute-model-preview-animation-operation', 'stop');
    },
    async onPlayButtonClick() {
        if (!this.curEditClipInfo) {
            return;
        }
        switch (this.curPlayState) {
            case PLAY_STATE.PAUSE:
                await Editor.Message.request('scene', 'execute-model-preview-animation-operation', 'resume');
                break;
            case PLAY_STATE.PLAYING:
                await Editor.Message.request('scene', 'execute-model-preview-animation-operation', 'pause');
                break;
            case PLAY_STATE.STOP:
                await Editor.Message.request('scene', 'execute-model-preview-animation-operation', 'play', this.curEditClipInfo.rawClipUUID);
                break;
            default:
                break;
        }

        this.isPreviewDataDirty = true;
    },
    async onAnimationTimeChange(event) {
        event.stopPropagation();
        if (!this.curEditClipInfo) {
            return;
        }

        const frame = event.target.value;
        await this.setCurrentFrame(frame);
        this.isPreviewDataDirty = true;
    },

    async setCurrentFrame(frame) {
        frame = Editor.Utils.Math.clamp(frame, 0, this.curTotalFrames);

        const curTime = frame / this.curEditClipInfo.fps;
        await Editor.Message.request('scene', 'execute-model-preview-animation-operation', 'setCurEditTime', curTime);
    },

    onModelAnimationUpdate(time) {
        if (!this.curEditClipInfo) {
            return;
        }
        if (this.$.animationTime) {
            this.$.animationTime.value = Math.round((time - this.curEditClipInfo.from) * this.curEditClipInfo.fps);
            this.$.currentTime.value = this.$.animationTime.value;
        }

        this.isPreviewDataDirty = true;
    },
    setCurPlayState(state) {
        this.curPlayState = state;
        let buttonIconName = '';
        switch (state) {
            case PLAY_STATE.STOP:
                buttonIconName = 'play';
                break;
            case PLAY_STATE.PLAYING:
                buttonIconName = 'pause';
                break;
            case PLAY_STATE.PAUSE:
                buttonIconName = 'play';
                break;
            default:
                break;
        }

        if (this.$.playButtonIcon) {
            this.$.playButtonIcon.value = buttonIconName;
        }
    },
    async setCurEditClipInfo(clipInfo) {
        this.curEditClipInfo = clipInfo;
        if (clipInfo) {
            this.curTotalFrames = Math.round(clipInfo.duration * clipInfo.fps);
            this.$.animationTime.setConfig({
                max: this.curTotalFrames,
            });
            this.$.duration.innerHTML = `Duration: ${this.curTotalFrames}`;
            // update animation events
            const subId = clipInfo.clipUUID.match(/@(.*)/)[1];
            this.curEditClipInfo.userData = this.meta.subMetas[subId].userData;
            this.updateEventInfo();

            if (this.$.animationTimeSlider) {
                this.$.animationTimeSlider.max = this.curTotalFrames;
            }
            await Editor.Message.request(
                'scene',
                'execute-model-preview-animation-operation',
                'setPlaybackRange',
                clipInfo.from,
                clipInfo.to,
            );
            await this.stopAnimation();
        }
    },
    onAnimationPlayStateChanged(state) {
        this.setCurPlayState(state);
    },
};
