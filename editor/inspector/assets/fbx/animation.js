exports.template = `
<div class="container">
    <div class="show-type-wrap">
        <ui-tab class="show-type" value="0">
            <ui-button value="time">Time</ui-button>
            <ui-button value="frame">Frame</ui-button>
        </ui-tab>
    </div>
    <div class="clips"></div>
    <div class="editor">
        <div class="anim-name">
            <ui-icon value="video"></ui-icon>
            <ui-input class="clip-name"></ui-input>
        </div>
        <div class="clip-info">
            <div class="left">Time: <span class="clip-duration"></span> (s)</div>
            <div class="right">
                <ui-num-input class="clip-fps" min="1" max="120" step="1"></ui-num-input>
                FPS
            </div>
        </div>
        <div class="edit-ruler">
            <div class="grid ruler-making"></div>
            <div class="grid ruler-gear"></div>
            <div class="control-wrap">
                <div class="control-duration"></div>
                <div class="control control-left">
                    <div class="box"></div>
                    <div class="direction"></div>
                </div>
                <div class="control control-right">
                    <div class="box"></div>
                    <div class="direction"></div>
                </div>
                <div class="control control-virtual">
                    <div class="box"></div>
                    <div class="direction"></div>
                    <div class="number control-virtual-number"></div>
                </div>
            </div>
        </div>
        <div class="cut-info">
            <div class="left">
                <span>Start: </span>
                <ui-num-input path="from" step="1" min="0" class="clip-from"></ui-num-input>
            </div>
            <div class="frames-info">
                <div class="left">Frames: <span class="clip-frames"></span></div>
            </div>
            <div class="right">
                <span>End: </span>
                <ui-num-input path="to" step="1" min="0" class="clip-to"></ui-num-input>
            </div>
        </div>
        <ui-prop>
            <span slot="label">WrapMode</span>
            <ui-select slot="content" class="wrap-mode">
                <option value="0">Default</option>
                <option value="1">Normal</option>
                <option value="2">Loop</option>
                <option value="22">PingPong</option>
                <option value="36">Reverse</option>
                <option value="38">LoopReverse</option>
            </ui-select>
        </ui-prop>
    </div>
</div>
`;

exports.style = `
ui-prop,
ui-section {
    margin: 4px 0;
}
.container > .show-type-wrap {
    text-align: center;
}
.container > .clips {
    padding: 5px;
    border-radius: calc(var(--size-normal-radius) * 1px);
    overflow-y: auto;
    max-height: 250px;
    background: var(--color-normal-fill-emphasis);
    margin-bottom: 20px;
}
.container > .clips > .clip {}
.container > .clips > .clip > .table {
    border-radius: 4px;
    border-bottom-right-radius: 0;
    background: var(--color-normal-fill-emphasis);
}
.container > .clips > .clip > .table > .header {
    display: flex;
    line-height: 1.6em;
    padding: 2px 5px;
    margin-bottom: 5px;
    border-bottom: 1px solid var(--color-normal-border-emphasis);
}
.container > .clips > .clip > .table > .line {
    display: flex;
    line-height: 1.6em;
    padding: 2px 5px;
}
.container > .clips > .clip > .table > .line[active] {
    background: var(--color-focus-fill);
}
.container > .clips > .clip > .table > .line > .name,
.container > .clips > .clip > .table > .header > .name {
    flex: 1;
}
.container > .clips > .clip > .table > .line > .time,
.container > .clips > .clip > .table > .header > .time {
    width: 40px;
    text-align: right;
}
.container > .clips > .clip > .add-clip {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
}
.container > .clips > .clip > .add-clip > .button > ui-icon {
    padding: 0 5px;
    border-radius: 2px;
    line-height: 16px;
    margin-left: 13px;
    margin-right: 5px;
    cursor: pointer;
}
.container > .clips > .clip > .add-clip > .button > ui-icon:hover {
    background: var(--color-normal-fill);
}

.container > .editor > .anim-name {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    margin-bottom: 5px;
}
.container > .editor > .anim-name {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    margin-bottom: 5px;
}
.container > .editor > .anim-name > ui-icon {
    font-size: 18px;
    margin: auto 10px;
    margin-left: 0;
}
.container > .editor > .anim-name > ui-input {
    flex: 1;
}
.container > .editor > .clip-info {
    font-size: 11px;
    color: var(--color-normal-fill-weakest);
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}
.container > .editor ui-num-input {
    color: var(--color-normal-contrast);
    width: 50px;
}
.container > .editor > .cut-info {
    margin: 5px 0 10px;
    line-height: 20px;
    display: flex;
    justify-content: space-between;
}
.container > .editor > .cut-info > .frames-info {
    font-size: 11px;
    color: var(--color-normal-fill-weakest);
}
.container > .editor > .edit-ruler {
    border: 1px solid var(--color-normal-contrast-important);
    border-top: transparent;
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    position: relative;
    user-select: none;
}
.container > .editor > .edit-ruler > .grid {
    position: relative;
    display: flex;
    font-size: 10px;
    box-sizing: border-box;
    height: 18px;
}
.container > .editor > .edit-ruler > .grid > .label-item {
    position: absolute;
}
.container > .editor > .edit-ruler > .ruler-gear > .start {
    position: absolute;
    top: 3px;
}
.container > .editor > .edit-ruler > .ruler-gear > .grid-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}
.container > .editor > .edit-ruler > .grid .sm-grid {
    display: inline-block;
    width: 20%;
    height: 4px;
    border-left: 1px solid var(--color-normal-contrast-important);
}
.container > .editor > .edit-ruler > .grid .mid-grid {
    display: inline-block;
    width: 20%;
    height: 8px;
    border-left: 1px solid var(--color-normal-contrast-important);
}
.container > .editor > .edit-ruler > .control-wrap {
    position: relative;
    width: 100%;
    left: 0;
    top: -16px;
}
.container > .editor > .edit-ruler > .control-wrap > .control-duration {
    background: var(--color-focus-fill);
    position: absolute;
    height: 16px;
    opacity: 0.2;
}
.container > .editor > .edit-ruler > .control-wrap > .control {
    user-select: none;
    width: 6px;
    position: absolute;
    cursor: pointer;
    opacity: 0.7;
}
.container > .editor > .edit-ruler > .control-wrap > .control:hover {
    opacity: 1;
}
.container > .editor > .edit-ruler > .control-wrap > .control > .box {
    background: var(--color-focus-fill);
    width: 100%;
    height: 10px;
}
.container > .editor > .edit-ruler > .control-wrap > .control > .direction {
    border: 3px solid var(--color-focus-fill);
    width: 0;
    height: 0;
    border-bottom-color: transparent;
}
.container > .editor > .edit-ruler > .control-wrap > .control-left > .direction {
    border-left-color: transparent;
}
.container > .editor > .edit-ruler > .control-wrap > .control-right > .direction {
    border-right-color: transparent;
}
.container > .editor > .edit-ruler > .control-wrap > .control-virtual {
    --color-focus-fill: var(--color-success-fill);
    display: none;
}
.container > .editor > .edit-ruler > .control-wrap > .control-virtual > .box {
    background: var(--color-focus-fill);
    width: 100%;
    height: 10px;
}
.container > .editor > .edit-ruler > .control-wrap > .control-virtual[direction="right"] > .direction {
    border-right-color: transparent;
    border-left-color: var(--color-focus-fill);
}

.container > .editor > .edit-ruler > .control-wrap > .control-virtual > .direction {
    border-left-color: transparent;
}
.container > .editor > .edit-ruler > .control-wrap > .control-virtual > .number {
    margin-top: -47px;
    font-size: 10px;
    color: var(--color-success-fill-weaker);
}
`;

exports.$ = {
    container: '.container',
    clips: '.clips',
    editor: '.editor',
    clipName: '.clip-name',
    clipDuration: '.clip-duration',
    clipFPS: '.clip-fps',
    clipFrom: '.clip-from',
    clipTo: '.clip-to',
    clipFrames: '.clip-frames',
    wrapMode: '.wrap-mode',
    rulerMaking: '.ruler-making',
    rulerGear: '.ruler-gear',
    controlWrap: '.control-wrap',
    controlDuration: '.control-duration',
    controlLeft: '.control-left',
    controlRight: '.control-right',
    controlVirtual: '.control-virtual',
    controlVirtualNumber: '.control-virtual-number',
    showTypeWrap: '.show-type-wrap',
    showType: '.show-type',
};

/**
 * attribute corresponds to the edit element
 */
const Elements = {
    // infos put first
    infos: {
        ready() {
            const panel = this;

            Object.assign(panel, {
                animationInfos: null,
            });
        },
        update() {
            const panel = this;

            if (panel.meta && panel.meta.userData.animationImportSettings) {
                panel.animationInfos = panel.meta.userData.animationImportSettings;
                // Support multiple selection when the list display, limit the number of display clip name collection for renaming and new to determine whether the same name
                panel.clipNames = new Set();
                for (const animationInfo of panel.animationInfos) {
                    panel.clipNames.add(animationInfo.name);
                    for (const subAnimInfo of animationInfo.splits) {
                        panel.clipNames.add(subAnimInfo.name);
                    }
                }
            } else {
                panel.animationInfos = null;
            }
        },
    },
    showType: {
        ready() {
            const panel = this;
            panel.animationTimeShowType = panel.$.showType.value === 0 ? 'time' : 'frame';
            panel.$.showType.addEventListener('change', (event) => {
                panel.animationTimeShowType = event.target.value === 0 ? 'time' : 'frame';
                Elements.clips.update.call(panel);
            });
        },
        update() {
            const panel = this;

            if (!panel.animationInfos) {
                panel.$.showTypeWrap.style.display = 'none';
                return;
            } else {
                panel.$.showTypeWrap.style.display = 'block';
            }

            panel.animationTimeShowType = panel.$.showType.value === 0 ? 'time' : 'frame';
        },
    },
    clips: {
        ready() {
            const panel = this;

            Object.assign(panel, {
                splitClipIndex: 0,
                rawClipIndex: 0,
                currentClipInfo: null,
            });
        },
        update() {
            const panel = this;

            panel.$.clips.innerText = '';
            if (!panel.animationInfos) {
                panel.$.clips.style.display = 'none';
                return;
            } else {
                panel.$.clips.style.display = 'block';
            }

            panel.updateRawClipInfo();
            panel.updateCurrentClipInfo();

            panel.animationInfos.forEach((animInfo, rawClipIndex) => {
                const clip = document.createElement('div');
                clip.setAttribute('class', 'clip');
                panel.$.clips.appendChild(clip);

                if (!animInfo.duration) {
                    clip.setAttribute('disabled', 'true');
                }

                const table = document.createElement('div');
                table.setAttribute('class', 'table');
                clip.appendChild(table);

                const header = document.createElement('div');
                header.setAttribute('class', 'header');
                table.appendChild(header);

                const name = document.createElement('div');
                name.setAttribute('class', 'name');
                name.innerHTML = `Clips <i>( ${animInfo.name} )</i> `;
                header.appendChild(name);
                const time = document.createElement('div');
                time.setAttribute('class', 'time');
                time.innerHTML = 'Start';
                header.appendChild(time);
                const timeEnd = document.createElement('div');
                timeEnd.setAttribute('class', 'time end');
                timeEnd.innerHTML = 'End';
                header.appendChild(timeEnd);

                animInfo.splits.forEach((subAnim, splitClipIndex) => {
                    const line = document.createElement('div');
                    line.setAttribute('class', 'line');
                    if (panel.rawClipIndex === rawClipIndex && panel.splitClipIndex === splitClipIndex) {
                        line.setAttribute('active', true);
                    }
                    table.appendChild(line);
                    line.setAttribute('rawCLipIndex', rawClipIndex);
                    line.setAttribute('splitClipIndex', splitClipIndex);
                    line.addEventListener('click', () => {
                        panel.onSelect(rawClipIndex, splitClipIndex);
                    });

                    const name = document.createElement('div');
                    name.setAttribute('class', 'name');
                    name.innerHTML = subAnim.name;
                    line.appendChild(name);
                    const time = document.createElement('div');
                    time.setAttribute('class', 'time');
                    time.innerHTML = panel.animationTimeShowType === 'time' ? subAnim.from.toFixed(2) : Math.round(subAnim.from * panel.rawClipInfo.fps);
                    line.appendChild(time);
                    const timeEnd = document.createElement('div');
                    timeEnd.setAttribute('class', 'time end');
                    timeEnd.innerHTML = panel.animationTimeShowType === 'time' ? subAnim.to.toFixed(2) : Math.round(subAnim.to * panel.rawClipInfo.fps);
                    line.appendChild(timeEnd);
                });

                // Button area
                const addClip = document.createElement('div');
                addClip.setAttribute('class', 'add-clip');
                clip.appendChild(addClip);

                const button = document.createElement('div');
                button.setAttribute('class', 'button');
                addClip.appendChild(button);
                const addIcon = document.createElement('ui-icon');
                addIcon.setAttribute('value', 'add');
                addIcon.setAttribute('tooltip', 'Duplicate Selected');
                button.appendChild(addIcon);
                addIcon.addEventListener('click', () => {
                    const newInfo = panel.newClipTemplate();
                    panel.clipNames.add(newInfo.name);
                    panel.animationInfos[panel.rawClipIndex].splits.push(newInfo);

                    Elements.clips.update.call(panel);
                    Elements.editor.update.call(panel);
                    panel.dispatch('change');
                });

                const miniIcon = document.createElement('ui-icon');
                miniIcon.setAttribute('value', 'mini');
                miniIcon.setAttribute('tooltip', 'Remove Selected');
                button.appendChild(miniIcon);
                miniIcon.addEventListener('click', () => {
                    panel.updateCurrentClipInfo();

                    if (!panel.currentClipInfo) {
                        return;
                    }
                    panel.clipNames.delete(panel.currentClipInfo.name);
                    panel.animationInfos[panel.rawClipIndex].splits.splice(panel.splitClipIndex, 1);
                    Elements.clips.update.call(panel);
                    Elements.editor.update.call(panel);
                    panel.dispatch('change');
                });
            });
        },
    },
    editor: {
        ready() {
            const panel = this;

            Object.assign(panel, {
                gridTableWith: panel.$.container.getBoundingClientRect().width,
                virtualControl: null,
                clipNames: [],
            });

            panel.onClipNameBind = panel.onClipName.bind(panel);
            panel.$.clipName.addEventListener('confirm', panel.onClipNameBind);

            panel.onMouseDownBindLeft = panel.onMouseDown.bind(panel, 'left');
            panel.onMouseDownBindRight = panel.onMouseDown.bind(panel, 'right');
            panel.$.controlLeft.addEventListener('mousedown', panel.onMouseDownBindLeft);
            panel.$.controlRight.addEventListener('mousedown', panel.onMouseDownBindRight);

            panel.onCutClipBind = panel.onCutClip.bind(panel);
            panel.$.clipFrom.addEventListener('confirm', panel.onCutClipBind);
            panel.$.clipTo.addEventListener('confirm', panel.onCutClipBind);

            panel.onFpsChangeBind = panel.onFpsChange.bind(panel);
            panel.$.clipFPS.addEventListener('confirm', panel.onFpsChangeBind);

            panel.onWrapModeChangeBind = panel.onWrapModeChange.bind(panel);
            panel.$.wrapMode.addEventListener('confirm', panel.onWrapModeChangeBind);

            function observer() {
                const rect = panel.$.editor.getBoundingClientRect();
                panel.gridTableWith = rect.width - 60;

                if (panel.gridTableWith < 0) {
                    panel.gridTableWith = panel.$.container.getBoundingClientRect().width;
                }

                Elements.clips.update.call(panel);
                Elements.editor.update.call(panel);
            }

            panel.resizeObserver = new window.ResizeObserver(observer);
            panel.resizeObserver.observe(panel.$.editor);
            observer();
        },
        close() {
            const panel = this;
            panel.resizeObserver.unobserve(panel.$.editor);

            panel.$.clipName.removeEventListener('confirm', panel.onClipNameBind);

            panel.$.controlLeft.removeEventListener('mousedown', panel.onMouseDownBindLeft);
            panel.$.controlRight.removeEventListener('mousedown', panel.onMouseDownBindRight);

            panel.$.clipFrom.removeEventListener('confirm', panel.onCutClipBind);
            panel.$.clipTo.removeEventListener('confirm', panel.onCutClipBind);

            panel.$.clipFPS.removeEventListener('confirm', panel.onFpsChangeBind);

            panel.$.wrapMode.removeEventListener('confirm', panel.onWrapModeChangeBind);
        },
        update() {
            const panel = this;

            panel.updateRawClipInfo();
            panel.updateCurrentClipInfo();
            panel.updateGridConfig();

            if (!panel.currentClipInfo) {
                panel.$.editor.style.display = 'none';
                return;
            } else {
                panel.$.editor.style.display = 'block';
            }

            panel.$.clipName.value = panel.currentClipInfo.name;

            // ruler making
            panel.$.rulerMaking.innerText = '';
            const maxNum = panel.gridConfig.mod + 1;
            for (let minNum = 1; minNum <= maxNum; minNum++) {
                const label = document.createElement('div');
                label.setAttribute('class', 'label-item');
                label.style.left = `${panel.gridConfig.spacing * 5 * (minNum - 1) - 6}px`;
                panel.$.rulerMaking.appendChild(label);

                const span = document.createElement('span');
                span.setAttribute('class', 'mid-label');
                span.innerText = (panel.gridConfig.labelStep * (minNum - 1)).toFixed(2);
                label.appendChild(span);
            }
            const lastMakingLabel = document.createElement('div');
            lastMakingLabel.setAttribute('class', 'label-item');
            lastMakingLabel.style.left = `${panel.gridConfig.width}px`;
            panel.$.rulerMaking.appendChild(lastMakingLabel);
            lastMakingLabel.innerText = panel.rawClipInfo.duration.toFixed(2);

            // ruler gear
            panel.$.rulerGear.innerText = '';
            Object.assign(panel.$.rulerGear.style, {
                'margin-left': `${panel.gridConfig.spacing}px`,
                'margin-right': `${0 - panel.gridConfig.spacing}px`,
            });
            const firstRulerGear = document.createElement('div');
            firstRulerGear.setAttribute('class', 'start');
            firstRulerGear.style.left = `${0 - panel.gridConfig.spacing}px`;
            firstRulerGear.innerHTML = '<span class="mid-grid"></span>';
            panel.$.rulerGear.appendChild(firstRulerGear);

            for (let minNum = 0; minNum < panel.gridConfig.mod; minNum++) {
                const item = document.createElement('div');
                item.setAttribute('class', 'grid-item');
                item.style.width = `${panel.gridConfig.spacing * 5}px`;
                const lines = Array(4).fill('<span class="sm-grid"></span>');
                lines.push('<span class="mid-grid"></span>');
                item.innerHTML = lines.join('');
                panel.$.rulerGear.appendChild(item);
            }

            const lastGearItem = document.createElement('div');
            lastGearItem.setAttribute('class', 'grid-item');
            lastGearItem.style.width = `${panel.gridConfig.rest * panel.gridConfig.spacing}px`;
            lastGearItem.innerHTML = Array(panel.gridConfig.rest).fill('<span class="sm-grid"></span>').join('');
            panel.$.rulerGear.appendChild(lastGearItem);

            // control-wrap
            Object.assign(panel.$.controlDuration.style, panel.currentClipInfo.durationStyle);
            Object.assign(panel.$.controlLeft.style, panel.currentClipInfo.ctrlStartStyle);
            Object.assign(panel.$.controlRight.style, panel.currentClipInfo.ctrlEndStyle);
        },
    },
};

exports.update = function(assetList, metaList) {
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
    this.initAnimationNameToUUIDMap();
    this.initAnimationInfos();
    if (this.animationInfos) {
        this.onSelect(0, 0);
    }
};

exports.ready = function() {
    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.ready) {
            element.ready.call(this);
        }
    }
};

exports.close = function() {
    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.close) {
            element.close.call(this);
        }
    }
};

exports.methods = {
    /** animation name -> uuid */
    initAnimationNameToUUIDMap() {
        if (this.meta && this.meta.subMetas) {
            const animationNameToUUIDMap = new Map();
            Object.keys(this.meta.subMetas).forEach((id) => {
                const subMeta = this.meta.subMetas[id];
                if (subMeta.importer === 'gltf-animation') {
                    const sourceName = subMeta.name;
                    const animName = sourceName.slice(0, sourceName.lastIndexOf('.'));
                    animationNameToUUIDMap.set(animName, subMeta.uuid);
                }
            });

            this.animationNameToUUIDMap = animationNameToUUIDMap;
        }
    },
    initAnimationInfos() {
        if (this.meta && this.meta.userData.animationImportSettings) {
            this.animationInfos = this.meta.userData.animationImportSettings;
            // Collect clip names for renaming and creating to determine whether the name is repeated
            this.clipNames = new Set();
            for (const animationInfo of this.animationInfos) {
                this.clipNames.add(animationInfo.name);
                for (const subAnimInfo of animationInfo.splits) {
                    this.clipNames.add(subAnimInfo.name);
                }
            }
        } else {
            this.animationInfos = null;
        }
    },

    onSelect(rawClipIndex, splitClipIndex) {
        this.rawClipIndex = rawClipIndex;
        this.splitClipIndex = splitClipIndex;
        const isElementSelect = (element) => element.getAttribute('rawClipIndex') == rawClipIndex && element.getAttribute('splitClipIndex') == splitClipIndex;
        Elements.editor.update.call(this);

        this.$.clips.querySelectorAll('.line').forEach((child) => {
            if (isElementSelect(child)) {
                child.setAttribute('active', true);
            } else {
                child.removeAttribute('active');
            }
        });
        const curClipInfo = this.getCurClipInfo();
        Editor.Message.broadcast('fbx-inspector:animation-change', curClipInfo);
    },
    getCurClipInfo() {
        const animInfo = this.animationInfos[this.rawClipIndex];
        const splitInfo = animInfo.splits[this.splitClipIndex];

        if (!animInfo) {
            return null;
        }

        const rawClipUUID = this.animationNameToUUIDMap.get(animInfo.name);
        const clipUUID = this.animationNameToUUIDMap.get(splitInfo.name);
        let duration = animInfo.duration;
        let fps = animInfo.fps;
        let from = 0;
        let to = duration;
        if (splitInfo) {
            from = splitInfo.from;
            to = splitInfo.to;
            duration = to - from;
            if (splitInfo.fps !== undefined) {
                fps = splitInfo.fps;
            }

            // if (this.animationNameToUUIDMap.has(splitInfo.name)) {
            //     clipUUID = this.animationNameToUUIDMap.get(splitInfo.name);
            // }
        }

        return {
            rawClipUUID,
            rawClipIndex: this.rawClipIndex,
            clipUUID,
            duration,
            fps,
            from,
            to,
        };
    },
    getRightName(name) {
        if (!name) {
            return null;
        }
        const panel = this;
        do {
            const result = name.match(/(.*)_(\d{0,3})/);
            if (result) {
                name = `${result[1]}_${Number(result[2]) + 1}`;
            } else {
                name += '_1';
            }
        } while (panel.clipNames.has(name));
        return name;
    },
    newClipTemplate() {
        const panel = this;
        // Verify the name
        return {
            name: panel.getRightName(panel.rawClipInfo.name),
            from: 0,
            to: panel.rawClipInfo.duration,
            wrapMode: 2 /* Loop */,
        };
    },
    updateCurrentClipInfo() {
        const panel = this;
        if (!panel.animationInfos) {
            panel.currentClipInfo = null;
            return;
        }

        const info = panel.animationInfos[panel.rawClipIndex].splits[panel.splitClipIndex];
        if (!info || !panel.gridTableWith) {
            panel.currentClipInfo = null;
            return;
        }

        const duration = info.to - info.from;
        const ctrlStart = (info.from / panel.rawClipInfo.duration) * panel.gridTableWith;
        const ctrlEnd = (info.to / panel.rawClipInfo.duration) * panel.gridTableWith;
        const durationWidth = (duration / panel.rawClipInfo.duration) * panel.gridTableWith;
        const fps = info.fps !== undefined ? info.fps : panel.rawClipInfo.fps;
        const wrapMode = info.wrapMode ?? panel.rawClipInfo.wrapMode;
        panel.currentClipInfo = {
            name: info.name,
            from: info.from * fps,
            to: info.to * fps,
            ctrlStart,
            ctrlEnd,
            ctrlStartStyle: {
                transform: `translateX(${ctrlStart - 6}px)`,
            },
            ctrlEndStyle: {
                transform: `translateX(${ctrlEnd}px)`,
            },
            durationStyle: {
                width: `${durationWidth}px`,
                transform: `translateX(${ctrlStart}px)`,
            },
            duration,
            fps,
            wrapMode,
        };

        const maxFrames = (panel.rawClipInfo.duration * panel.currentClipInfo.fps).toFixed(0);
        const startFrames = panel.currentClipInfo.from.toFixed(0);
        const endFrames = panel.currentClipInfo.to.toFixed(0);

        panel.$.clipFrames.innerText = maxFrames;
        panel.$.clipFPS.value = fps;

        panel.$.clipFrom.value = startFrames;
        panel.$.clipFrom.setAttribute('max', endFrames);

        panel.$.clipTo.value = endFrames;
        panel.$.clipTo.setAttribute('min', startFrames);
        panel.$.clipTo.setAttribute('max', maxFrames);

        panel.$.wrapMode.value = panel.currentClipInfo.wrapMode;
    },
    updateRawClipInfo() {
        const panel = this;
        if (!panel.animationInfos) {
            panel.rawClipInfo = null;
            return;
        }

        if (!panel.animationInfos[panel.rawClipIndex]) {
            panel.rawClipInfo = null;
            return;
        }
        const { name, duration, fps } = panel.animationInfos[panel.rawClipIndex];
        panel.rawClipInfo = { name, duration, fps };

        panel.$.clipDuration.innerText = duration.toFixed(2);
    },
    updateGridConfig() {
        const panel = this;

        if (!panel.currentClipInfo) {
            return null;
        }

        let width = panel.gridTableWith;
        const info = panel.rawClipInfo;

        const { step, spacing } = panel.getStepAndSpacing(width, panel.currentClipInfo.fps * info.duration);
        width = (panel.currentClipInfo.fps * info.duration * spacing) / step;
        const mod = Math.floor(panel.gridTableWith / (spacing * 5));
        const rest = Math.floor((panel.gridTableWith % (spacing * 5)) / spacing);
        const labelStep = info.duration * ((5 * step) / (panel.currentClipInfo.fps * info.duration));

        panel.gridConfig = {
            step,
            spacing,
            mod,
            rest,
            width,
            labelStep,
        };
    },
    getStepAndSpacing(width, frames) {
        const config = {
            minSpacing: 10,
            maxSpacing: 20,
        };

        const rawMinSpacing = width / frames;
        let spacing = rawMinSpacing;
        let step = 1;
        if (rawMinSpacing < config.minSpacing) {
            // Calculates a minimum spacing value that is a multiple of maxSpacing
            step = Math.ceil(config.minSpacing / rawMinSpacing);
            spacing = rawMinSpacing * step;
        }

        return {
            step,
            spacing,
        };
    },
    onMouseDown(type) {
        const panel = this;

        const info = panel.currentClipInfo;

        if (!info) {
            return;
        }

        panel.virtualControl = { type };

        if (type === 'right') {
            panel.virtualControl.style = info.ctrlEndStyle;
            panel.virtualControl.value = info.to / panel.currentClipInfo.fps;
        } else {
            panel.virtualControl.style = info.ctrlStartStyle;
            panel.virtualControl.value = info.from / panel.currentClipInfo.fps;
        }

        panel.$.controlVirtual.setAttribute('direction', panel.virtualControl.type);
        panel.$.controlVirtual.style.display = 'block';

        panel.updateVirtualControl();

        panel.onMouseMoveBind = panel.onMouseMove.bind(panel);
        panel.onMouseUpBind = panel.onMouseUp.bind(panel);
        document.addEventListener('mousemove', panel.onMouseMoveBind);
        document.addEventListener('mouseup', panel.onMouseUpBind);
    },
    onMouseMove(event) {
        const panel = this;

        event.preventDefault();

        if (!panel.virtualControl) {
            return;
        }

        // beyond border
        const { type } = panel.virtualControl;
        let x = event.x - panel.$.rulerMaking.getBoundingClientRect().x;
        if (
            x > panel.gridConfig.width
            || x < 0
            || (type === 'left' && x > panel.currentClipInfo.ctrlEnd)
            || (type === 'right' && x < panel.currentClipInfo.ctrlStart)
        ) {
            return;
        }
        const { duration } = panel.rawClipInfo;
        const value = (x / panel.gridConfig.width) * duration;
        const currentTime = Editor.Utils.Math.clamp(value, 0, duration);
        const currentFrame = parseInt((currentTime * panel.currentClipInfo.fps).toFixed(0));
        panel.virtualControl.value = currentTime;
        if (type === 'left') {
            panel.virtualControl.startFrame = currentFrame;
            x -= 6;
        } else {
            panel.virtualControl.endFrame = currentFrame;
        }
        panel.virtualControl.style = {
            transform: `translateX(${x}px)`,
        };

        cancelAnimationFrame(panel.animationId);
        panel.animationId = requestAnimationFrame(() => {
            panel.updateVirtualControl();
        });
    },
    onMouseUp() {
        const panel = this;

        if (!panel.virtualControl) {
            return;
        }
        document.removeEventListener('mousemove', panel.onMouseMoveBind);
        document.removeEventListener('mouseup', panel.onMouseUpBind);
        const { value } = panel.virtualControl;
        let { type } = panel.virtualControl;
        type = type === 'right' ? 'to' : 'from';

        // refresh data
        const splitInfo = panel.animationInfos[panel.rawClipIndex].splits[panel.splitClipIndex];
        if (splitInfo[type].toFixed(2) !== value.toFixed(2)) {
            const { duration } = panel.rawClipInfo;
            splitInfo[type] = Editor.Utils.Math.clamp(parseFloat(value.toFixed(2)), 0, duration);
        }

        Elements.clips.update.call(panel);

        Object.assign(panel.$.controlDuration.style, panel.currentClipInfo.durationStyle);
        Object.assign(panel.$.controlLeft.style, panel.currentClipInfo.ctrlStartStyle);
        Object.assign(panel.$.controlRight.style, panel.currentClipInfo.ctrlEndStyle);

        panel.$.controlVirtual.style.display = 'none';
        const curClipInfo = panel.getCurClipInfo();
        Editor.Message.broadcast('fbx-inspector:animation-change', curClipInfo);
        panel.dispatch('change');
    },
    updateVirtualControl() {
        const panel = this;

        Object.assign(panel.$.controlVirtual.style, panel.virtualControl.style);
        panel.$.controlVirtualNumber.innerText = panel.virtualControl.value.toFixed(2);

        if (panel.virtualControl.startFrame || panel.virtualControl.endFrame) {
            if (panel.virtualControl.type === 'left') {
                panel.$.clipFrom.value = panel.virtualControl.startFrame;
            } else {
                panel.$.clipTo.value = panel.virtualControl.endFrame;
            }
        }
    },
    onClipName(event) {
        const panel = this;

        if (!panel.currentClipInfo) {
            return;
        }
        let name = event.target.value;
        if (!name) {
            return;
        }
        if (panel.clipNames.has(name)) {
            name = panel.getRightName(name);
        }
        const info = panel.animationInfos[panel.rawClipIndex].splits[panel.splitClipIndex];
        if (info.name === name) {
            return;
        }

        panel.clipNames.delete(info.name);
        info.name = name;
        panel.clipNames.add(name);

        panel.dispatch('change');
        Elements.clips.update.call(panel);
    },
    onCutClip(event) {
        const panel = this;

        const path = event.target.getAttribute('path');
        panel.animationInfos[panel.rawClipIndex].splits[panel.splitClipIndex][path] = event.target.value / panel.currentClipInfo.fps;

        Elements.clips.update.call(panel);
        Elements.editor.update.call(panel);

        panel.dispatch('change');
    },
    onFpsChange(event) {
        const panel = this;

        panel.animationInfos[panel.rawClipIndex].splits[panel.splitClipIndex].fps = Number(event.target.value);

        Elements.editor.update.call(panel);
        panel.dispatch('change');
    },
    onWrapModeChange(event) {
        const panel = this;

        panel.animationInfos[panel.rawClipIndex].splits[panel.splitClipIndex].wrapMode = Number(event.target.value);

        Elements.editor.update.call(panel);
        panel.dispatch('change');
    },
};
