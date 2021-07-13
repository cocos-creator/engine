let FlagOfset = 0;

const DONOTHING = 1 << FlagOfset++;
const BREAK_FLOW = 1 << FlagOfset++;
const LOCAL_TRANSFORM = 1 << FlagOfset++;
const WORLD_TRANSFORM = 1 << FlagOfset++;
const TRANSFORM = LOCAL_TRANSFORM | WORLD_TRANSFORM;
const UPDATE_RENDER_DATA = 1 << FlagOfset++;
const OPACITY = 1 << FlagOfset++;
const COLOR = 1 << FlagOfset++;
const OPACITY_COLOR = OPACITY | COLOR;
const RENDER = 1 << FlagOfset++;
const CHILDREN = 1 << FlagOfset++;
const POST_RENDER = 1 << FlagOfset++;
const FINAL = 1 << FlagOfset++;

let _batcher, _forward;
let _cullingMask = 0;

function RenderFlow () {
    this._func = init;
    this._next = null;
}

let _proto = RenderFlow.prototype;
_proto._doNothing = function () {
};

_proto._localTransform = function (node) {
    node._updateLocalMatrix();
    node._renderFlag &= ~LOCAL_TRANSFORM;
    this._next._func(node);
};

_proto._worldTransform = function (node) {
    _batcher.worldMatDirty ++;

    let t = node._matrix;
    let trs = node._trs;
    let tm = t.m;
    tm[12] = trs[0];
    tm[13] = trs[1];
    tm[14] = trs[2];

    node._mulMat(node._worldMatrix, node._parent._worldMatrix, t);
    node._renderFlag &= ~WORLD_TRANSFORM;
    this._next._func(node);

    _batcher.worldMatDirty --;
};

_proto._updateRenderData = function (node) {
    let comp = node._renderComponent;
    comp._assembler.updateRenderData(comp);
    node._renderFlag &= ~UPDATE_RENDER_DATA;
    this._next._func(node);
};

_proto._opacity = function (node) {
    _batcher.parentOpacityDirty++;

    this._next._func(node);

    node._renderFlag &= ~OPACITY;
    _batcher.parentOpacityDirty--;
};

_proto._color = function (node) {
    let comp = node._renderComponent;
    if (comp) {
        comp._updateColor();
    }

    node._renderFlag &= ~COLOR;
    this._next._func(node);
};

_proto._render = function (node) {
    let comp = node._renderComponent;
    comp._checkBacth(_batcher, node._cullingMask);
    comp._assembler.fillBuffers(comp, _batcher);
    this._next._func(node);
};

_proto._children = function (node) {
    let cullingMask = _cullingMask;
    let batcher = _batcher;

    let parentOpacity = batcher.parentOpacity;
    let opacity = (batcher.parentOpacity *= (node._opacity / 255));

    let worldTransformFlag = batcher.worldMatDirty ? WORLD_TRANSFORM : 0;
    let worldOpacityFlag = batcher.parentOpacityDirty ? OPACITY_COLOR : 0;
    let worldDirtyFlag = worldTransformFlag | worldOpacityFlag;

    let children = node._children;
    for (let i = 0, l = children.length; i < l; i++) {
        let c = children[i];

        // Advance the modification of the flag to avoid node attribute modification is invalid when opacity === 0.
        c._renderFlag |= worldDirtyFlag;
        if (!c._activeInHierarchy || c._opacity === 0) continue;

        _cullingMask = c._cullingMask = c.groupIndex === 0 ? cullingMask : 1 << c.groupIndex;

        // TODO: Maybe has better way to implement cascade opacity
        let colorVal = c._color._val;
        c._color._fastSetA(c._opacity * opacity);
        flows[c._renderFlag]._func(c);
        c._color._val = colorVal;
    }

    batcher.parentOpacity = parentOpacity;

    this._next._func(node);
};

_proto._postRender = function (node) {
    let comp = node._renderComponent;
    comp._checkBacth(_batcher, node._cullingMask);
    comp._assembler.postFillBuffers(comp, _batcher);
    this._next._func(node);
};

const EMPTY_FLOW = new RenderFlow();
EMPTY_FLOW._func = EMPTY_FLOW._doNothing;
EMPTY_FLOW._next = EMPTY_FLOW;

let flows = {};

function createFlow (flag, next) {
    if (flag === DONOTHING || flag === BREAK_FLOW) {
        return EMPTY_FLOW
    }
    
    let flow = new RenderFlow();
    flow._next = next || EMPTY_FLOW;

    switch (flag) {
        case LOCAL_TRANSFORM: 
            flow._func = flow._localTransform;
            break;
        case WORLD_TRANSFORM: 
            flow._func = flow._worldTransform;
            break;
        case UPDATE_RENDER_DATA:
            flow._func = flow._updateRenderData;
            break;
        case OPACITY:
            flow._func = flow._opacity;
            break;
        case COLOR:
            flow._func = flow._color;
            break;
        case RENDER: 
            flow._func = flow._render;
            break;
        case CHILDREN: 
            flow._func = flow._children;
            break;
        case POST_RENDER: 
            flow._func = flow._postRender;
            break;
    }

    return flow;
}

function getFlow (flag) {
    let flow = null;
    let tFlag = FINAL;
    while (tFlag > 0) {
        if (tFlag & flag)
            flow = createFlow(tFlag, flow);
        tFlag = tFlag >> 1;
    }
    return flow;
}

// 
function init (node) {
    let flag = node._renderFlag;
    let r = flows[flag] = getFlow(flag);
    r._func(node);
}

RenderFlow.flows = flows;
RenderFlow.createFlow = createFlow;

// validate whether render component is ready to be rendered.
let _validateList = [];
RenderFlow.registerValidate = function (renderComp) {
    if (renderComp._inValidateList) return;
    _validateList.push(renderComp);
    renderComp._inValidateList =  true;
};
RenderFlow.validateRenderers = function () {
    for (let i = 0, l = _validateList.length; i < l; i++) {
        let renderComp = _validateList[i];
        if (!renderComp.isValid) continue;
        if (!renderComp.enabledInHierarchy) {
            renderComp.disableRender();
        }
        else {
            renderComp._validateRender();
        }
        renderComp._inValidateList = false;
    }
    _validateList.length = 0;
};


RenderFlow.visitRootNode = function (rootNode) {
    RenderFlow.validateRenderers();    

    let preCullingMask = _cullingMask;
    _cullingMask = rootNode._cullingMask;

    if (rootNode._renderFlag & WORLD_TRANSFORM) {
        _batcher.worldMatDirty ++;
        rootNode._calculWorldMatrix();
        rootNode._renderFlag &= ~WORLD_TRANSFORM;

        flows[rootNode._renderFlag]._func(rootNode);

        _batcher.worldMatDirty --;
    }
    else {
        flows[rootNode._renderFlag]._func(rootNode);
    }

    _cullingMask = preCullingMask;
};

RenderFlow.render = function (rootNode, dt) {
    _batcher.reset();
    _batcher.walking = true;

    RenderFlow.visitRootNode(rootNode);

    _batcher.terminate();
    _batcher.walking = false;

    _forward.render(_batcher._renderScene, dt);
};

RenderFlow.renderCamera = function (camera, rootNode) {
    _batcher.reset();
    _batcher.walking = true;

    RenderFlow.visitRootNode(rootNode);

    _batcher.terminate();
    _batcher.walking = false;

    _forward.renderCamera(camera, _batcher._renderScene);
};

RenderFlow.init = function (batcher, forwardRenderer) {
    _batcher = batcher;
    _forward = forwardRenderer;

    flows[0] = EMPTY_FLOW;
    for (let i = 1; i < FINAL; i++) {
        flows[i] = new RenderFlow();
    }
};

RenderFlow.getBachther = function () {
    return _batcher;
};

RenderFlow.FLAG_DONOTHING = DONOTHING;
RenderFlow.FLAG_BREAK_FLOW = BREAK_FLOW;
RenderFlow.FLAG_LOCAL_TRANSFORM = LOCAL_TRANSFORM;
RenderFlow.FLAG_WORLD_TRANSFORM = WORLD_TRANSFORM;
RenderFlow.FLAG_TRANSFORM = TRANSFORM;
RenderFlow.FLAG_UPDATE_RENDER_DATA = UPDATE_RENDER_DATA;
RenderFlow.FLAG_OPACITY = OPACITY;
RenderFlow.FLAG_COLOR = COLOR;
RenderFlow.FLAG_OPACITY_COLOR = OPACITY_COLOR;
RenderFlow.FLAG_RENDER = RENDER;
RenderFlow.FLAG_CHILDREN = CHILDREN;
RenderFlow.FLAG_POST_RENDER = POST_RENDER;
RenderFlow.FLAG_FINAL = FINAL;

module.exports = cc.RenderFlow = RenderFlow;
