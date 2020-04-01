/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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
 * @category core
 */

import { EDITOR, TEST, WECHAT, ALIPAY, XIAOMI, BAIDU, COCOSPLAY, JSB, MINIGAME } from 'internal:constants';

// tslint:disable

/**
 * System variables
 * @class sys
 * @main
 * @static
 */
const sys: { [x: string]: any; } = {};

// @ts-ignore
const _global = typeof window === 'undefined' ? global : window;

/**
 * English language code
 * @property {String} LANGUAGE_ENGLISH
 * @readOnly
 */
sys.LANGUAGE_ENGLISH = 'en';

/**
 * Chinese language code
 * @property {String} LANGUAGE_CHINESE
 * @readOnly
 */
sys.LANGUAGE_CHINESE = 'zh';

/**
 * French language code
 * @property {String} LANGUAGE_FRENCH
 * @readOnly
 */
sys.LANGUAGE_FRENCH = 'fr';

/**
 * Italian language code
 * @property {String} LANGUAGE_ITALIAN
 * @readOnly
 */
sys.LANGUAGE_ITALIAN = 'it';

/**
 * German language code
 * @property {String} LANGUAGE_GERMAN
 * @readOnly
 */
sys.LANGUAGE_GERMAN = 'de';

/**
 * Spanish language code
 * @property {String} LANGUAGE_SPANISH
 * @readOnly
 */
sys.LANGUAGE_SPANISH = 'es';

/**
 * Spanish language code
 * @property {String} LANGUAGE_DUTCH
 * @readOnly
 */
sys.LANGUAGE_DUTCH = 'du';

/**
 * Russian language code
 * @property {String} LANGUAGE_RUSSIAN
 * @readOnly
 */
sys.LANGUAGE_RUSSIAN = 'ru';

/**
 * Korean language code
 * @property {String} LANGUAGE_KOREAN
 * @readOnly
 */
sys.LANGUAGE_KOREAN = 'ko';

/**
 * Japanese language code
 * @property {String} LANGUAGE_JAPANESE
 * @readOnly
 */
sys.LANGUAGE_JAPANESE = 'ja';

/**
 * Hungarian language code
 * @property {String} LANGUAGE_HUNGARIAN
 * @readonly
 */
sys.LANGUAGE_HUNGARIAN = 'hu';

/**
 * Portuguese language code
 * @property {String} LANGUAGE_PORTUGUESE
 * @readOnly
 */
sys.LANGUAGE_PORTUGUESE = 'pt';

/**
 * Arabic language code
 * @property {String} LANGUAGE_ARABIC
 * @readOnly
 */
sys.LANGUAGE_ARABIC = 'ar';

/**
 * Norwegian language code
 * @property {String} LANGUAGE_NORWEGIAN
 * @readOnly
 */
sys.LANGUAGE_NORWEGIAN = 'no';

/**
 * Polish language code
 * @property {String} LANGUAGE_POLISH
 * @readOnly
 */
sys.LANGUAGE_POLISH = 'pl';

/**
 * Turkish language code
 * @property {String} LANGUAGE_TURKISH
 * @readOnly
 */
sys.LANGUAGE_TURKISH = 'tr';

/**
 * Ukrainian language code
 * @property {String} LANGUAGE_UKRAINIAN
 * @readOnly
 */
sys.LANGUAGE_UKRAINIAN = 'uk';

/**
 * Romanian language code
 * @property {String} LANGUAGE_ROMANIAN
 * @readOnly
 */
sys.LANGUAGE_ROMANIAN = 'ro';

/**
 * Bulgarian language code
 * @property {String} LANGUAGE_BULGARIAN
 * @readOnly
 */
sys.LANGUAGE_BULGARIAN = 'bg';

/**
 * Unknown language code
 * @property {String} LANGUAGE_UNKNOWN
 * @readOnly
 */
sys.LANGUAGE_UNKNOWN = 'unknown';

/**
 * @property {String} OS_IOS
 * @readOnly
 */
sys.OS_IOS = 'iOS';
/**
 * @property {String} OS_ANDROID
 * @readOnly
 */
sys.OS_ANDROID = 'Android';
/**
 * @property {String} OS_WINDOWS
 * @readOnly
 */
sys.OS_WINDOWS = 'Windows';
/**
 * @property {String} OS_MARMALADE
 * @readOnly
 */
sys.OS_MARMALADE = 'Marmalade';
/**
 * @property {String} OS_LINUX
 * @readOnly
 */
sys.OS_LINUX = 'Linux';
/**
 * @property {String} OS_BADA
 * @readOnly
 */
sys.OS_BADA = 'Bada';
/**
 * @property {String} OS_BLACKBERRY
 * @readOnly
 */
sys.OS_BLACKBERRY = 'Blackberry';
/**
 * @property {String} OS_OSX
 * @readOnly
 */
sys.OS_OSX = 'OS X';
/**
 * @property {String} OS_WP8
 * @readOnly
 */
sys.OS_WP8 = 'WP8';
/**
 * @property {String} OS_WINRT
 * @readOnly
 */
sys.OS_WINRT = 'WINRT';
/**
 * @property {String} OS_UNKNOWN
 * @readOnly
 */
sys.OS_UNKNOWN = 'Unknown';

/**
 * @property {Number} UNKNOWN
 * @readOnly
 * @default -1
 */
sys.UNKNOWN = -1;
/**
 * @property {Number} WIN32
 * @readOnly
 * @default 0
 */
sys.WIN32 = 0;
/**
 * @property {Number} LINUX
 * @readOnly
 * @default 1
 */
sys.LINUX = 1;
/**
 * @property {Number} MACOS
 * @readOnly
 * @default 2
 */
sys.MACOS = 2;
/**
 * @property {Number} ANDROID
 * @readOnly
 * @default 3
 */
sys.ANDROID = 3;
/**
 * @property {Number} IPHONE
 * @readOnly
 * @default 4
 */
sys.IPHONE = 4;
/**
 * @property {Number} IPAD
 * @readOnly
 * @default 5
 */
sys.IPAD = 5;
/**
 * @property {Number} BLACKBERRY
 * @readOnly
 * @default 6
 */
sys.BLACKBERRY = 6;
/**
 * @property {Number} NACL
 * @readOnly
 * @default 7
 */
sys.NACL = 7;
/**
 * @property {Number} EMSCRIPTEN
 * @readOnly
 * @default 8
 */
sys.EMSCRIPTEN = 8;
/**
 * @property {Number} TIZEN
 * @readOnly
 * @default 9
 */
sys.TIZEN = 9;
/**
 * @property {Number} WINRT
 * @readOnly
 * @default 10
 */
sys.WINRT = 10;
/**
 * @property {Number} WP8
 * @readOnly
 * @default 11
 */
sys.WP8 = 11;
/**
 * @property {Number} MOBILE_BROWSER
 * @readOnly
 * @default 100
 */
sys.MOBILE_BROWSER = 100;
/**
 * @property {Number} DESKTOP_BROWSER
 * @readOnly
 * @default 101
 */
sys.DESKTOP_BROWSER = 101;

/**
 * Indicates whether executes in editor's window process (Electron's renderer context)
 * @property {Number} EDITOR_PAGE
 * @readOnly
 * @default 102
 */
sys.EDITOR_PAGE = 102;
/**
 * Indicates whether executes in editor's main process (Electron's browser context)
 * @property {Number} EDITOR_CORE
 * @readOnly
 * @default 103
 */
sys.EDITOR_CORE = 103;
/**
 * @property {Number} WECHAT_GAME
 * @readOnly
 * @default 104
 */
sys.WECHAT_GAME = 104;
/**
 * @property {Number} QQ_PLAY
 * @readOnly
 * @default 105
 */
sys.QQ_PLAY = 105;
/**
 * BROWSER_TYPE_WECHAT
 * @property {String} BROWSER_TYPE_WECHAT
 * @readOnly
 * @default "wechat"
 */
sys.BROWSER_TYPE_WECHAT = 'wechat';
/**
 * BROWSER_TYPE_WECHAT_GAME
 * @property {String} BROWSER_TYPE_WECHAT_GAME
 * @readOnly
 * @default "wechatgame"
 */
sys.BROWSER_TYPE_WECHAT_GAME = 'wechatgame';
/**
 * BROWSER_TYPE_ALIPAY_GAME
 * @property {String} BROWSER_TYPE_ALIPAY_GAME
 * @readOnly
 * @default "alipaygame"
 */
sys.BROWSER_TYPE_ALIPAY_GAME = 'alipaygame';
/**
 * BROWSER_TYPE_XIAOMI_GAME
 * @property {String} BROWSER_TYPE_XIAOMI_GAME
 * @readOnly
 * @default "xiaomiquickgame"
 */
sys.BROWSER_TYPE_XIAOMI_GAME = 'xiaomiquickgame';
/**
 * BROWSER_TYPE_BAIDU_GAME
 * @property {String} BROWSER_TYPE_BAIDU_GAME
 * @readOnly
 * @default "baidugame"
 */
sys.BROWSER_TYPE_BAIDU_GAME = 'baidugame';
/**
 * BROWSER_TYPE_COCOSPLAY
 * @property {String} BROWSER_TYPE_COCOSPLAY
 * @readOnly
 * @default "cocosplay"
 */
sys.BROWSER_TYPE_COCOSPLAY = 'cocosplay';
/**
 *
 * @property {String} BROWSER_TYPE_ANDROID
 * @readOnly
 * @default "androidbrowser"
 */
sys.BROWSER_TYPE_ANDROID = 'androidbrowser';
/**
 *
 * @property {String} BROWSER_TYPE_IE
 * @readOnly
 * @default "ie"
 */
sys.BROWSER_TYPE_IE = 'ie';
/**
 *
 * @property {String} BROWSER_TYPE_QQ
 * @readOnly
 * @default "qqbrowser"
 */
sys.BROWSER_TYPE_QQ = 'qqbrowser';
/**
 *
 * @property {String} BROWSER_TYPE_MOBILE_QQ
 * @readOnly
 * @default "mqqbrowser"
 */
sys.BROWSER_TYPE_MOBILE_QQ = 'mqqbrowser';
/**
 *
 * @property {String} BROWSER_TYPE_UC
 * @readOnly
 * @default "ucbrowser"
 */
sys.BROWSER_TYPE_UC = 'ucbrowser';
/**
 * uc third party integration.
 * @property {String} BROWSER_TYPE_UCBS
 * @readOnly
 * @default "ucbs"
 */
sys.BROWSER_TYPE_UCBS = 'ucbs';
/**
 *
 * @property {String} BROWSER_TYPE_360
 * @readOnly
 * @default "360browser"
 */
sys.BROWSER_TYPE_360 = '360browser';
/**
 *
 * @property {String} BROWSER_TYPE_BAIDU_APP
 * @readOnly
 * @default "baiduboxapp"
 */
sys.BROWSER_TYPE_BAIDU_APP = 'baiduboxapp';
/**
 *
 * @property {String} BROWSER_TYPE_BAIDU
 * @readOnly
 * @default "baidubrowser"
 */
sys.BROWSER_TYPE_BAIDU = 'baidubrowser';
/**
 *
 * @property {String} BROWSER_TYPE_MAXTHON
 * @readOnly
 * @default "maxthon"
 */
sys.BROWSER_TYPE_MAXTHON = 'maxthon';
/**
 *
 * @property {String} BROWSER_TYPE_OPERA
 * @readOnly
 * @default "opera"
 */
sys.BROWSER_TYPE_OPERA = 'opera';
/**
 *
 * @property {String} BROWSER_TYPE_OUPENG
 * @readOnly
 * @default "oupeng"
 */
sys.BROWSER_TYPE_OUPENG = 'oupeng';
/**
 *
 * @property {String} BROWSER_TYPE_MIUI
 * @readOnly
 * @default "miuibrowser"
 */
sys.BROWSER_TYPE_MIUI = 'miuibrowser';
/**
 *
 * @property {String} BROWSER_TYPE_FIREFOX
 * @readOnly
 * @default "firefox"
 */
sys.BROWSER_TYPE_FIREFOX = 'firefox';
/**
 *
 * @property {String} BROWSER_TYPE_SAFARI
 * @readOnly
 * @default "safari"
 */
sys.BROWSER_TYPE_SAFARI = 'safari';
/**
 *
 * @property {String} BROWSER_TYPE_CHROME
 * @readOnly
 * @default "chrome"
 */
sys.BROWSER_TYPE_CHROME = 'chrome';
/**
 *
 * @property {String} BROWSER_TYPE_LIEBAO
 * @readOnly
 * @default "liebao"
 */
sys.BROWSER_TYPE_LIEBAO = 'liebao';
/**
 *
 * @property {String} BROWSER_TYPE_QZONE
 * @readOnly
 * @default "qzone"
 */
sys.BROWSER_TYPE_QZONE = 'qzone';
/**
 *
 * @property {String} BROWSER_TYPE_SOUGOU
 * @readOnly
 * @default "sogou"
 */
sys.BROWSER_TYPE_SOUGOU = 'sogou';
/**
 *
 * @property {String} BROWSER_TYPE_UNKNOWN
 * @readOnly
 * @default "unknown"
 */
sys.BROWSER_TYPE_UNKNOWN = 'unknown';

/**
 * Is native ? This is set to be true in jsb auto.
 * @property {Boolean} isNative
 */
sys.isNative = JSB;

/**
 * Is web browser ?
 * @property {Boolean} isBrowser
 */
sys.isBrowser = typeof window === 'object' && typeof document === 'object' && !MINIGAME && !JSB;

/**
 * Endianess of current platform
 * @property {boolean} isLittleEndian
 */
sys.isLittleEndian = (() => {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true);
    // Int16Array uses the platform's endianness.
    return new Int16Array(buffer)[0] === 256;
})();

if (_global.__globalAdapter && _global.__globalAdapter.adaptSys) {
    // init sys info in adapter
    _global.__globalAdapter.adaptSys(sys);
}
// TODO: main process flag
// else if (EDITOR) {
//     sys.isMobile = false;
//     sys.platform = sys.EDITOR_CORE;
//     sys.language = sys.LANGUAGE_UNKNOWN;
//     sys.os = ({
//         darwin: sys.OS_OSX,
//         win32: sys.OS_WINDOWS,
//         linux: sys.OS_LINUX,
//     // @ts-ignore
//     })[process.platform] || sys.OS_UNKNOWN;
//     sys.browserType = null;
//     sys.browserVersion = null;
//     sys.windowPixelResolution = {
//         width: 0,
//         height: 0,
//     };
//     sys.__audioSupport = {};
// }
else if (JSB) {
    // @ts-ignore
    const platform = sys.platform = __getPlatform();
    sys.isMobile = (platform === sys.ANDROID ||
        platform === sys.IPAD ||
        platform === sys.IPHONE ||
        platform === sys.WP8 ||
        platform === sys.TIZEN ||
        platform === sys.BLACKBERRY);

    // @ts-ignore
    sys.os = __getOS();
    // @ts-ignore
    sys.language = __getCurrentLanguage();
    // @ts-ignore
    sys.osVersion = __getOSVersion();
    sys.osMainVersion = parseInt(sys.osVersion);
    sys.browserType = null;
    sys.browserVersion = null;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    sys.windowPixelResolution = {
        width: ratio * w,
        height: ratio * h,
    };

    sys.localStorage = window.localStorage;

    let capabilities;
    capabilities = sys.capabilities = {
        canvas: false,
        opengl: true,
        webp: true,
    };

    if (sys.isMobile) {
        capabilities.accelerometer = true;
        capabilities.touches = true;
    } else {
        // desktop
        capabilities.keyboard = true;
        capabilities.mouse = true;
        capabilities.touches = false;
    }

    sys.__audioSupport = {
        ONLY_ONE: false,
        WEB_AUDIO: false,
        DELAY_CREATE_CTX: false,
        format: ['.mp3'],
    };
}
else {
    // browser or runtime
    const win = window, nav = win.navigator, doc = document, docEle = doc.documentElement;
    const ua = nav.userAgent.toLowerCase();

    if (EDITOR) {
        sys.isMobile = false;
        sys.platform = sys.EDITOR_PAGE;
    }
    else {
        /**
         * Indicate whether system is mobile system
         * @property {Boolean} isMobile
         */
        sys.isMobile = /mobile|android|iphone|ipad/.test(ua);

        /**
         * Indicate the running platform
         * @property {Number} platform
         */
        sys.platform = sys.isMobile ? sys.MOBILE_BROWSER : sys.DESKTOP_BROWSER;
    }

    let currLanguage = nav.language;
    // @ts-ignore
    currLanguage = currLanguage ? currLanguage : nav.browserLanguage;
    currLanguage = currLanguage ? currLanguage.split('-')[0] : sys.LANGUAGE_ENGLISH;

    /**
     * Indicate the current language of the running system
     * @property {String} language
     */
    sys.language = currLanguage;

    // Get the os of system
    let isAndroid = false, iOS = false, osVersion = '', osMajorVersion = 0;
    let uaResult = /android\s*(\d+(?:\.\d+)*)/i.exec(ua) || /android\s*(\d+(?:\.\d+)*)/i.exec(nav.platform);
    if (uaResult) {
        isAndroid = true;
        osVersion = uaResult[1] || '';
        osMajorVersion = parseInt(osVersion) || 0;
    }
    uaResult = /(iPad|iPhone|iPod).*OS ((\d+_?){2,3})/i.exec(ua);
    if (uaResult) {
        iOS = true;
        osVersion = uaResult[2] || '';
        osMajorVersion = parseInt(osVersion) || 0;
    }
    // refer to https://github.com/cocos-creator/engine/pull/5542 , thanks for contribition from @krapnikkk
    // ipad OS 13 safari identifies itself as "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko)"
    // so use maxTouchPoints to check whether it's desktop safari or not.
    // reference: https://stackoverflow.com/questions/58019463/how-to-detect-device-name-in-safari-on-ios-13-while-it-doesnt-show-the-correct
    // FIXME: should remove it when touch-enabled mac are available
    // TODO: due to compatibility issues, it is still determined to be ios, and a new operating system type ipados may be added later？
    else if (/(iPhone|iPad|iPod)/.exec(nav.platform) || (nav.platform === 'MacIntel' && nav.maxTouchPoints && nav.maxTouchPoints > 1)) {
        iOS = true;
        osVersion = '';
        osMajorVersion = 0;
    }

    let osName = sys.OS_UNKNOWN;
    if (nav.appVersion.indexOf('Win') !== -1) { osName = sys.OS_WINDOWS; }
    else if (iOS) { osName = sys.OS_IOS; }
    else if (nav.appVersion.indexOf('Mac') !== -1) { osName = sys.OS_OSX; }
    else if (nav.appVersion.indexOf('X11') !== -1 && nav.appVersion.indexOf('Linux') === -1) { osName = sys.OS_UNIX; }
    else if (isAndroid) { osName = sys.OS_ANDROID; }
    else if (nav.appVersion.indexOf('Linux') !== -1 || ua.indexOf('ubuntu') !== -1) { osName = sys.OS_LINUX; }

    /**
     * Indicate the running os name
     * @property {String} os
     */
    sys.os = osName;
    /**
     * Indicate the running os version
     * @property {String} osVersion
     */
    sys.osVersion = osVersion;
    /**
     * Indicate the running os main version
     * @property {Number} osMainVersion
     */
    sys.osMainVersion = osMajorVersion;

    /**
     * Indicate the running browser type
     * @property {String} browserType
     */
    sys.browserType = sys.BROWSER_TYPE_UNKNOWN;
    /* Determine the browser type */
    (function () {
        const typeReg1 = /mqqbrowser|micromessenger|qq|sogou|qzone|liebao|maxthon|ucbs|360 aphone|360browser|baiduboxapp|baidubrowser|maxthon|mxbrowser|miuibrowser/i;
        const typeReg2 = /qqbrowser|ucbrowser/i;
        const typeReg3 = /chrome|safari|firefox|trident|opera|opr\/|oupeng/i;
        let browserTypes = typeReg1.exec(ua);
        if (!browserTypes) { browserTypes = typeReg2.exec(ua); }
        if (!browserTypes) { browserTypes = typeReg3.exec(ua); }

        let browserType = browserTypes ? browserTypes[0].toLowerCase() : sys.BROWSER_TYPE_UNKNOWN;
        if (WECHAT) {
            browserType = sys.BROWSER_TYPE_WECHAT_GAME;
        }
        else if(ALIPAY) {
            browserType = sys.BROWSER_TYPE_ALIPAY_GAME;
        }
        else if(XIAOMI) {
            browserType = sys.BROWSER_TYPE_XIAOMI_GAME;
        }
        else if(BAIDU) {
            browserType = sys.BROWSER_TYPE_BAIDU_GAME;
        }
        else if(COCOSPLAY) {
            browserType = sys.BROWSER_TYPE_COCOSPLAY;
        }
        else if (browserType === 'micromessenger') {
            browserType = sys.BROWSER_TYPE_WECHAT;
 }
        else if (browserType === 'safari' && isAndroid) {
            browserType = sys.BROWSER_TYPE_ANDROID;
 }
        else if (browserType === 'qq' && ua.match(/android.*applewebkit/i)) {
            browserType = sys.BROWSER_TYPE_ANDROID;
 }
        else if (browserType === 'trident') {
            browserType = sys.BROWSER_TYPE_IE;
 }
        else if (browserType === '360 aphone') {
            browserType = sys.BROWSER_TYPE_360;
 }
        else if (browserType === 'mxbrowser') {
            browserType = sys.BROWSER_TYPE_MAXTHON;
 }
        else if (browserType === 'opr/') {
            browserType = sys.BROWSER_TYPE_OPERA;
 }

        sys.browserType = browserType;
    })();

    /**
     * Indicate the running browser version
     * @property {String} browserVersion
     */
    sys.browserVersion = '';
    /* Determine the browser version number */
    (function () {
        const versionReg1 = /(mqqbrowser|micromessenger|qq|sogou|qzone|liebao|maxthon|uc|ucbs|360 aphone|360|baiduboxapp|baidu|maxthon|mxbrowser|miui)(mobile)?(browser)?\/?([\d.]+)/i;
        const versionReg2 = /(qqbrowser|chrome|safari|firefox|trident|opera|opr\/|oupeng)(mobile)?(browser)?\/?([\d.]+)/i;
        let tmp = ua.match(versionReg1);
        if (!tmp) { tmp = ua.match(versionReg2); }
        sys.browserVersion = tmp ? tmp[4] : '';
    })();

    const w = window.innerWidth || document.documentElement.clientWidth;
    const h = window.innerHeight || document.documentElement.clientHeight;
    const ratio = window.devicePixelRatio || 1;

    /**
     * Indicate the real pixel resolution of the whole game window
     * @property {Size} windowPixelResolution
     */
    sys.windowPixelResolution = {
        width: ratio * w,
        height: ratio * h,
    };

    sys._checkWebGLRenderMode = function () {
        if (cc.game.renderType !== cc.game.RENDER_TYPE_WEBGL) {
            throw new Error('This feature supports WebGL render mode only.');
        }
    };

    const _tmpCanvas1 = document.createElement('canvas');

    const create3DContext = function (canvas, opt_attribs, opt_contextType) {
        if (opt_contextType) {
            try {
                return canvas.getContext(opt_contextType, opt_attribs);
            } catch (e) {
                return null;
            }
        }
        else {
            return create3DContext(canvas, opt_attribs, 'webgl') ||
                create3DContext(canvas, opt_attribs, 'experimental-webgl') ||
                create3DContext(canvas, opt_attribs, 'webkit-3d') ||
                create3DContext(canvas, opt_attribs, 'moz-webgl') ||
                null;
        }
    };

    /**
     * cc.sys.localStorage is a local storage component.
     * @property {Object} localStorage
     */
    try {
        let localStorage: Storage | null = sys.localStorage = win.localStorage;
        localStorage.setItem('storage', '');
        localStorage.removeItem('storage');
        localStorage = null;
    } catch (e) {
        const warn = function () {
            cc.warnID(5200);
        };
        sys.localStorage = {
            getItem: warn,
            setItem: warn,
            removeItem: warn,
            clear: warn,
        };
    }

    const _supportWebp = TEST ? false : _tmpCanvas1.toDataURL('image/webp').startsWith('data:image/webp');
    const _supportCanvas = TEST ? false : !!_tmpCanvas1.getContext('2d');
    let _supportWebGL = false;
    if (TEST) {
        _supportWebGL = false;
    }
    else if (sys.browserType === sys.BROWSER_TYPE_WECHAT_GAME) {
        _supportWebGL = true;
    }
    else if (win.WebGLRenderingContext) {
        // @ts-ignore
        if (create3DContext(document.createElement('CANVAS'))) {
            _supportWebGL = true;
        }
        if (_supportWebGL && sys.os === sys.OS_ANDROID) {
            const browserVer = parseFloat(sys.browserVersion);
            switch (sys.browserType) {
                case sys.BROWSER_TYPE_MOBILE_QQ:
                case sys.BROWSER_TYPE_BAIDU:
                case sys.BROWSER_TYPE_BAIDU_APP:
                    // QQ & Baidu Brwoser 6.2+ (using blink kernel)
                    if (browserVer >= 6.2) {
                        _supportWebGL = true;
                    }
                    else {
                        _supportWebGL = false;
                    }
                    break;
                case sys.BROWSER_TYPE_ANDROID:
                    // Android 5+ default browser
                    if (sys.osMainVersion && sys.osMainVersion >= 5) {
                        _supportWebGL = true;
                    }
                    break;
                case sys.BROWSER_TYPE_CHROME:
                    // Chrome on android supports WebGL from v. 30
                    if (browserVer >= 30.0) {
                        _supportWebGL = true;
                    } else {
                        _supportWebGL = false;
                    }
                    break;
                case sys.BROWSER_TYPE_UC:
                    if (browserVer > 11.0) {
                        _supportWebGL = true;
                    } else {
                        _supportWebGL = false;
                    }
                    break;
                case sys.BROWSER_TYPE_360:
                    _supportWebGL = false;
                    break;
            }
        }
    }

    /**
     * The capabilities of the current platform
     * @property {Object} capabilities
     */
    const capabilities = sys.capabilities = {
        canvas: _supportCanvas,
        opengl: _supportWebGL,
        webp: _supportWebp,
    } as { [x: string]: any; };
    if (docEle.ontouchstart !== undefined || doc.ontouchstart !== undefined || nav.msPointerEnabled) {
        capabilities.touches = true;
    }
    if (docEle.onmouseup !== undefined) {
        capabilities.mouse = true;
    }
    if (docEle.onkeyup !== undefined) {
        capabilities.keyboard = true;
    }
    // @ts-ignore
    if (win.DeviceMotionEvent || win.DeviceOrientationEvent) {
        capabilities.accelerometer = true;
    }

    let __audioSupport;

    /**
     * Audio support in the browser
     *
     * MULTI_CHANNEL        : Multiple audio while playing - If it doesn't, you can only play background music
     * WEB_AUDIO            : Support for WebAudio - Support W3C WebAudio standards, all of the audio can be played
     * AUTOPLAY             : Supports auto-play audio - if Don‘t support it, On a touch detecting background music canvas, and then replay
     * REPLAY_AFTER_TOUCH   : The first music will fail, must be replay after touchstart
     * USE_EMPTIED_EVENT    : Whether to use the emptied event to replace load callback
     * DELAY_CREATE_CTX     : delay created the context object - only webAudio
     * NEED_MANUAL_LOOP     : loop attribute failure, need to perform loop manually
     *
     * May be modifications for a few browser version
     */
    (function () {

        const DEBUG = false;

        const version = sys.browserVersion;

        // check if browser supports Web Audio
        // check Web Audio's context
        const supportWebAudio = sys.browserType !== sys.BROWSER_TYPE_WECHAT_GAME &&
            // @ts-ignore
            !!(window.AudioContext || window.webkitAudioContext || window.mozAudioContext);

        __audioSupport = { ONLY_ONE: false, WEB_AUDIO: supportWebAudio, DELAY_CREATE_CTX: false };

        if (sys.os === sys.OS_IOS) {
            // IOS no event that used to parse completed callback
            // this time is not complete, can not play
            //
            __audioSupport.USE_LOADER_EVENT = 'loadedmetadata';
        }

        if (sys.browserType === sys.BROWSER_TYPE_FIREFOX) {
            __audioSupport.DELAY_CREATE_CTX = true;
            __audioSupport.USE_LOADER_EVENT = 'canplay';
        }

        if (sys.os === sys.OS_ANDROID) {
            if (sys.browserType === sys.BROWSER_TYPE_UC) {
                __audioSupport.ONE_SOURCE = true;
            }
        }

        if (DEBUG) {
            setTimeout(function () {
                cc.log('browse type: ' + sys.browserType);
                cc.log('browse version: ' + version);
                cc.log('MULTI_CHANNEL: ' + __audioSupport.MULTI_CHANNEL);
                cc.log('WEB_AUDIO: ' + __audioSupport.WEB_AUDIO);
                cc.log('AUTOPLAY: ' + __audioSupport.AUTOPLAY);
            }, 0);
        }
    })();

    try {
        if (__audioSupport.WEB_AUDIO) {
            __audioSupport._context = null;
            Object.defineProperty(__audioSupport, 'context', {
                get () {
                    if (this._context) { return this._context; }
                    // @ts-ignore
                    return this._context = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
                },
            });
        }
    } catch (error) {
        __audioSupport.WEB_AUDIO = false;
        cc.logID(5201);
    }

    const formatSupport: string[] = [];

    (function () {
        const audio = document.createElement('audio');
        if (audio.canPlayType) {
            const ogg = audio.canPlayType('audio/ogg; codecs="vorbis"');
            if (ogg) { formatSupport.push('.ogg'); }
            const mp3 = audio.canPlayType('audio/mpeg');
            if (mp3) { formatSupport.push('.mp3'); }
            const wav = audio.canPlayType('audio/wav; codecs="1"');
            if (wav) { formatSupport.push('.wav'); }
            const mp4 = audio.canPlayType('audio/mp4');
            if (mp4) { formatSupport.push('.mp4'); }
            const m4a = audio.canPlayType('audio/x-m4a');
            if (m4a) { formatSupport.push('.m4a'); }
        }
    })();
    __audioSupport.format = formatSupport;

    sys.__audioSupport = __audioSupport;
}

/**
 * @en
 * Network type enumeration
 * @zh
 * 网络类型枚举
 *
 * @enum NetworkType
 */
sys.NetworkType = {
    /**
     * @en
     * Network is unreachable.
     * @zh
     * 网络不通
     *
     * @property {Number} NONE
     */
    NONE: 0,
    /**
     * @en
     * Network is reachable via WiFi or cable.
     * @zh
     * 通过无线或者有线本地网络连接因特网
     *
     * @property {Number} LAN
     */
    LAN: 1,
    /**
     * @en
     * Network is reachable via Wireless Wide Area Network
     * @zh
     * 通过蜂窝移动网络连接因特网
     *
     * @property {Number} WWAN
     */
    WWAN: 2,
};

/**
 * @class sys
 */

/**
 * @en
 * Get the network type of current device, return cc.sys.NetworkType.LAN if failure.
 * @zh
 * 获取当前设备的网络类型, 如果网络类型无法获取，默认将返回 cc.sys.NetworkType.LAN
 *
 * @method getNetworkType
 * @return {NetworkType}
 */
sys.getNetworkType = function () {
    // TODO: need to implement this for mobile phones.
    return sys.NetworkType.LAN;
};

/**
 * @en
 * Get the battery level of current device, return 1.0 if failure.
 * @zh
 * 获取当前设备的电池电量，如果电量无法获取，默认将返回 1
 *
 * @method getBatteryLevel
 * @return {Number} - 0.0 ~ 1.0
 */
sys.getBatteryLevel = function () {
    // TODO: need to implement this for mobile phones.
    return 1.0;
};

/**
 * Forces the garbage collection, only available in JSB
 * @method garbageCollect
 */
sys.garbageCollect = function () {
    // N/A in web
};

/**
 * Dumps rooted objects, only available in JSB
 * @method dumpRoot
 */
sys.dumpRoot = function () {
    // N/A in web
};

/**
 * Restart the JS VM, only available in JSB
 * @method restartVM
 */
sys.restartVM = function () {
    // N/A in web
};

/**
 * Clean a script in the JS VM, only available in JSB
 * @method cleanScript
 * @param {String} jsfile
 */
sys.cleanScript = function (jsfile) {
    // N/A in web
};

/**
 * Check whether an object is valid,
 * In web engine, it will return true if the object exist
 * In native engine, it will return true if the JS object and the correspond native object are both valid
 * @method isObjectValid
 * @param {Object} obj
 * @return {Boolean} Validity of the object
 */
sys.isObjectValid = function (obj) {
    if (obj) {
        return true;
    }
    return false;
};

/**
 * Dump system informations
 * @method dump
 */
sys.dump = function () {
    const self = this;
    let str = '';
    str += 'isMobile : ' + self.isMobile + '\r\n';
    str += 'language : ' + self.language + '\r\n';
    str += 'browserType : ' + self.browserType + '\r\n';
    str += 'browserVersion : ' + self.browserVersion + '\r\n';
    str += 'capabilities : ' + JSON.stringify(self.capabilities) + '\r\n';
    str += 'os : ' + self.os + '\r\n';
    str += 'osVersion : ' + self.osVersion + '\r\n';
    str += 'platform : ' + self.platform + '\r\n';
    str += 'Using ' + (cc.game.renderType === cc.game.RENDER_TYPE_WEBGL ? 'WEBGL' : 'CANVAS') + ' renderer.' + '\r\n';
    cc.log(str);
};

/**
 * Open a url in browser
 * @method openURL
 * @param {String} url
 */
sys.openURL = function (url) {
    if (JSB) {
        // @ts-ignore
        jsb.openURL(url);
    }
    else {
        window.open(url);
    }
};

/**
 * Get the number of milliseconds elapsed since 1 January 1970 00:00:00 UTC.
 * @method now
 * @return {Number}
 */
sys.now = function () {
    if (Date.now) {
        return Date.now();
    }
    else {
        return +(new Date);
    }
};

cc.sys = sys;

export default sys;
