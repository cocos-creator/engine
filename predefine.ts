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

// MACROS

/**
 * @hidden
 */

/**
 * !#zh
 * 这里是一些用来判断执行环境的宏，这些宏都是全局变量，直接访问即可。<br>
 * 在项目构建时，这些宏将会被预处理并根据构建的平台剔除不需要的代码，例如
 *
 *     if (CC_DEBUG) {
 *         cc.log('debug');
 *     }
 *     else {
 *         cc.log('release');
 *     }
 *
 * 在构建后会只剩下
 *
 *     cc.log('release');
 *
 * <br>
 * 如需判断脚本是否运行于指定平台，可以用如下表达式：
 *
 *     {
 *         "编辑器":  CC_EDITOR,
 *         "编辑器 或 预览":  CC_DEV,
 *         "编辑器 或 预览 或 构建调试":  CC_DEBUG,
 *         "网页预览":  CC_PREVIEW && !CC_JSB,
 *         "模拟器预览":  CC_PREVIEW && CC_JSB,
 *         "构建调试":  CC_BUILD && CC_DEBUG,
 *         "构建发行":  CC_BUILD && !CC_DEBUG,
 *     }
 *
 * !#en
 * Here are some of the macro used to determine the execution environment, these macros are global variables, can be accessed directly.<br>
 * When the project is built, these macros will be preprocessed and discard unreachable code based on the built platform, for example:
 *
 *     if (CC_DEBUG) {
 *         cc.log('debug');
 *     }
 *     else {
 *         cc.log('release');
 *     }
 *
 * After build will become:
 *
 *     cc.log('release');
 *
 * <br>
 * To determine whether the script is running on the specified platform, you can use the following expression:
 *
 *     {
 *         "editor":  CC_EDITOR,
 *         "editor or preview":  CC_DEV,
 *         "editor or preview or build in debug mode":  CC_DEBUG,
 *         "web preview":  CC_PREVIEW && !CC_JSB,
 *         "simulator preview":  CC_PREVIEW && CC_JSB,
 *         "build in debug mode":  CC_BUILD && CC_DEBUG,
 *         "build in release mode":  CC_BUILD && !CC_DEBUG,
 *     }
 *
 * @module GLOBAL-MACROS
 */
/**
 * @property {Boolean} CC_EDITOR - Running in the editor.
 */
/**
 * @property {Boolean} CC_PREVIEW - Preview in browser or simulator.
 */
/**
 * @property {Boolean} CC_DEV - Running in the editor or preview.
 */
/**
 * @property {Boolean} CC_DEBUG - Running in the editor or preview, or build in debug mode.
 */
/**
 * @property {Boolean} CC_BUILD - Running in published project.
 */
/**
 * @property {Boolean} CC_JSB - Running in native platform (mobile app, desktop app, or simulator).
 */
/**
 * @property {Boolean} CC_TEST - Running in the engine's unit test.
 */
/**
 * @property {Boolean} CC_WECHAT - Running in the Wechat's mini game.
 */
/**
 * @property {Boolean} CC_ALIPAY - Running in the alipay's mini game.
 */
/**
 * @property {Boolean} CC_XIAOMI - Running in the xiaomi's quick game.
 */
/**
 * @property {Boolean} CC_BAIDU - Running in the baidu's mini game.
 */
/**
 * @property {Boolean} CC_COCOSPLAY - Running in the cocosplay.
 */
/**
 * @property {Boolean} CC_MINIGAME - Running in mini game.
 */
/**
 * @property {Boolean} CC_RUNTIME_BASED - Running in runtime environments.
 */

// PREDEFINE

// window may be undefined when first load engine from editor
// @ts-ignore
const _global = typeof window === 'undefined' ? global : window;

/**
 * !#en
 * The main namespace of Cocos2d-JS, all engine core classes, functions, properties and constants are defined in this namespace.
 * !#zh
 * Cocos 引擎的主要命名空间，引擎代码中所有的类，函数，属性和常量都在这个命名空间中定义。
 * @module cc
 * @main cc
 */
const cc = _global.cc = _global.cc || {};

// For internal usage
cc.internal = cc.internal || {};

cc._global = _global;

function defineMacro (name, defaultValue) {
    // if "global_defs" not preprocessed by uglify, just declare them globally,
    // this may happened in release version's preview page.
    if (typeof _global[name] === 'undefined') {
        _global[name] = defaultValue;
    }
}
function defined (name) {
    return typeof _global[name] === 'object';
}

// ensure CC_BUILD is defined
// should not use window.CC_BUILD because we need get global_defs defined in uglify
defineMacro('CC_BUILD', false);

if (CC_BUILD) {
    // Supports dynamically access from external scripts such as adapters and debugger.
    // So macros should still defined in global even if inlined in engine.
    _global.CC_BUILD = CC_BUILD;
    _global.CC_TEST = CC_TEST;
    _global.CC_EDITOR = CC_EDITOR;
    _global.CC_PREVIEW = CC_PREVIEW;
    _global.CC_DEV = CC_DEV;
    _global.CC_DEBUG = CC_DEBUG;
    _global.CC_JSB = CC_JSB;
    _global.CC_WECHAT = CC_WECHAT;
    _global.CC_ALIPAY = CC_ALIPAY;
    _global.CC_XIAOMI = CC_XIAOMI;
    _global.CC_BAIDU = CC_BAIDU;
    _global.CC_COCOSPLAY = CC_COCOSPLAY;
    _global.CC_MINIGAME = CC_MINIGAME;
    _global.CC_RUNTIME_BASED = CC_RUNTIME_BASED;
    _global.CC_SUPPORT_JIT = CC_SUPPORT_JIT;
    _global.CC_PHYSICS_BUILTIN = CC_PHYSICS_BUILTIN;
    _global.CC_PHYSICS_CANNON = CC_PHYSICS_CANNON;
    _global.CC_PHYSICS_AMMO = CC_PHYSICS_AMMO;
}
else {
    // Defauled value for editor
    defineMacro('CC_TEST', defined('tap') || defined('QUnit'));
    // @ts-ignore
    defineMacro('CC_EDITOR', defined('Editor') && defined('process') && ('electron' in process.versions));
    defineMacro('CC_PREVIEW', !CC_EDITOR);
    defineMacro('CC_DEV', true);    // (CC_EDITOR && !CC_BUILD) || CC_PREVIEW || CC_TEST
    defineMacro('CC_DEBUG', true);  // CC_DEV || Debug Build
    defineMacro('CC_JSB', defined('jsb'));
    defineMacro('CC_WECHAT', !!(defined('wx') && (wx.getSystemInfoSync || wx.getSharedCanvas)));
    defineMacro('CC_MINIGAME', false);
    defineMacro('CC_RUNTIME_BASED', false);
    defineMacro('CC_ALIPAY', false);
    defineMacro('CC_XIAOMI', false);
    defineMacro('CC_BAIDU', false);
    defineMacro('CC_COCOSPLAY', false);

    // @ts-ignore
    defineMacro('CC_RUNTIME', 'function' === typeof loadRuntime);
    defineMacro('CC_SUPPORT_JIT', !(CC_MINIGAME || CC_RUNTIME_BASED));
    defineMacro('CC_PHYSICS_BUILTIN', true);
    defineMacro('CC_PHYSICS_CANNON', false);
    defineMacro('CC_PHYSICS_AMMO', false);
}

//

if (CC_DEV) {
    /**
     * contains internal apis for unit tests
     * @expose
     */
    cc._Test = {};
}

/**
 * @module cc
 */

/**
 * The current version of Cocos2d being used.<br/>
 * Please DO NOT remove this String, it is an important flag for bug tracking.<br/>
 * If you post a bug to forum, please attach this flag.
 * @property {String} ENGINE_VERSION
 */
const engineVersion = '1.0.3';
_global.CocosEngine = cc.ENGINE_VERSION = engineVersion;

export default cc;

/**
 * deprecated
 */
// TODO: ALIPAY and runtime will redefine
if (!(CC_RUNTIME_BASED || CC_ALIPAY)) {
    Object.defineProperty(_global, 'CC_PHYSICS_BUILT_IN', {
        get: () => {
            console.warn('CC_PHYSICS_BUILT_IN is deprecated, please using CC_PHYSICS_BUILTIN instead.');
            return _global.CC_PHYSICS_BUILTIN;
        },
    });
}
