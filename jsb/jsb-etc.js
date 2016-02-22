/****************************************************************************
 Copyright (c) 2015 Chukong Technologies Inc.

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
 ****************************************************************************/

'use strict';

var NORMALIZE_RE = /[^\.\/]+\/\.\.\//;

// cc.path
cc.js.mixin(cc.path, {
    //todo make public after verification
    _normalize: function (url) {
        var oldUrl = url = String(url);

        //removing all ../
        do {
            oldUrl = url;
            url = url.replace(NORMALIZE_RE, '');
        } while (oldUrl.length !== url.length);
        return url;
    },

    // The platform-specific file separator. '\\' or '/'.
    sep: (cc.sys.os === cc.sys.OS_WINDOWS ? '\\' : '/'),

    // @param {string} path
    // @param {boolean|string} [endsWithSep = true]
    // @returns {string}
    _setEndWithSep: function (path, endsWithSep) {
        var sep = cc.path.sep;
        if (typeof endsWithSep === 'undefined') {
            endsWithSep = true;
        }
        else if (typeof endsWithSep === 'string') {
            sep = endsWithSep;
            endsWithSep = !!endsWithSep;
        }

        var endChar = path[path.length - 1];
        var oldEndWithSep = (endChar === '\\' || endChar === '/');
        if (!oldEndWithSep && endsWithSep) {
            path += sep;
        }
        else if (oldEndWithSep && !endsWithSep) {
            path = path.slice(0, -1);
        }
        return path;
    }
});

// cc.Scheduler
cc.Scheduler.prototype.scheduleUpdate = cc.Scheduler.prototype.scheduleUpdateForTarget;
cc.Scheduler.prototype._unschedule = cc.Scheduler.prototype.unschedule;
cc.Scheduler.prototype.unschedule = function (callback, target) {
    if (typeof target === 'function') {
        var tmp = target;
        target = callback;
        callback = tmp;
    }
    this._unschedule(target, callback);
};

// Independent Action from retain/release
var actionArr = [
    'ActionEase',
    'EaseExponentialIn',
    'EaseExponentialOut',
    'EaseExponentialInOut',
    'EaseSineIn',
    'EaseSineOut',
    'EaseSineInOut',
    'EaseBounce',
    'EaseBounceIn',
    'EaseBounceOut',
    'EaseBounceInOut',
    'EaseBackIn',
    'EaseBackOut',
    'EaseBackInOut',
    'EaseRateAction',
    'EaseIn',
    'EaseElastic',
    'EaseElasticIn',
    'EaseElasticOut',
    'EaseElasticInOut',
    'RemoveSelf',
    'FlipX',
    'FlipY',
    'Place',
    'CallFunc',
    'DelayTime',
    'Sequence',
    'Spawn',
    'Speed',
    'Repeat',
    'RepeatForever',
    'Follow',
    'TargetedAction',
    'Animate',
    'OrbitCamera',
    'GridAction',
    'ProgressTo',
    'ProgressFromTo',
    'ActionInterval',
    'RotateTo',
    'RotateBy',
    'MoveBy',
    'MoveTo',
    'SkewTo',
    'SkewBy',
    'JumpTo',
    'JumpBy',
    'ScaleTo',
    'ScaleBy',
    'Blink',
    'FadeTo',
    'FadeIn',
    'FadeOut',
    'TintTo',
    'TintBy',
];

function setCtorReplacer (proto) {
    var ctor = proto._ctor;
    proto._ctor = function () {
        ctor.apply(this, arguments);
        this.retain();
        this._retained = true;
    };
}
function setAliasReplacer (name, type) {
    var aliasName = name[0].toLowerCase() + name.substr(1);
    cc[aliasName] = function () {
        var action = type.create.apply(this, arguments);
        action.retain();
        action._retained = true;
        return action;
    };
}

for (var i = 0; i < actionArr.length; ++i) {
    var name = actionArr[i];
    var type = cc[name];
    if (!type) 
        continue;
    var proto = type.prototype;
    setCtorReplacer(proto);
    setAliasReplacer(name, type);
}

function setChainFuncReplacer (proto, name) {
    var oldFunc = proto[name];
    proto[name] = function () {
        if (this._retained) {
            this.release();
            this._retained = false;
        }
        var newAction = oldFunc.apply(this, arguments);
        newAction.retain();
        newAction._retained = true;
        return newAction;
    };
}

setChainFuncReplacer(cc.ActionInterval.prototype, 'repeat');
setChainFuncReplacer(cc.ActionInterval.prototype, 'repeatForever');
setChainFuncReplacer(cc.ActionInterval.prototype, 'easing');

var jsbRunAction = cc.Node.prototype.runAction;
cc.Node.prototype.runAction = function (action) {
    jsbRunAction.call(this, action);
    if (action._retained) {
        action.release();
        action._retained = false;
    }
};

function getSGTarget (target) {
    if (target instanceof cc.Component) {
        target = target.node._sgNode;
    }
    if (target instanceof cc.Node) {
        target = target._sgNode;
    }
    return target;
}
var jsbAddAction = cc.ActionManager.prototype.addAction;
cc.ActionManager.prototype.addAction = function (action, target, paused) {
    target = getSGTarget(target);
    jsbAddAction.call(this, action, target, paused);
    if (action._retained) {
        action.release();
        action._retained = false;
    }
};

function actionMgrFuncReplacer (funcName, targetPos) {
    var proto = cc.ActionManager.prototype;
    var oldFunc = proto[funcName];
    proto[funcName] = function () {
        arguments[targetPos] = getSGTarget(arguments[targetPos]);
        return oldFunc.apply(this, arguments);
    };
}

var targetRelatedFuncs = [
    ['removeAllActionsFromTarget', 0],
    ['removeActionByTag', 1],
    ['getActionByTag', 1],
    ['numberOfRunningActionsInTarget', 0],
    ['pauseTarget', 0],
    ['resumeTarget', 0]
];

for (var i = 0; i < targetRelatedFuncs.length; ++i) {
    actionMgrFuncReplacer.apply(null, targetRelatedFuncs[i]);
}

cc.ActionManager.prototype.resumeTargets = function (targetsToResume) {
    if (!targetsToResume)
        return;

    for (var i = 0; i< targetsToResume.length; i++) {
        if (targetsToResume[i])
            this.resumeTarget(targetsToResume[i]);
    }
};

cc.ActionManager.prototype.pauseTargets = function (targetsToPause) {
    if (!targetsToPause)
        return;

    for (var i = 0; i< targetsToPause.length; i++) {
        if (targetsToPause[i])
            this.pauseTarget(targetsToPause[i]);
    }
};

// ccsg
window._ccsg = {
    Node: cc.Node,
    Scene: cc.Scene,
    Sprite: cc.Sprite,
    ParticleSystem: cc.ParticleSystem,
    Label: cc.Label,
    EditBox: cc.EditBox,
    TMXTiledMap: cc.TMXTiledMap
};

// rename cc.Class to cc._Class
cc._Class = cc.Class;
