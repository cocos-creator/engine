declare module 'internal:constants' {
    /**
     * This constant is private and used for internal purpose only.
     *
     * If true, some of the constants of `internal:constants` would be also export to the global namespace.
     * For example would set `CC_EDITOR` on `globalThis` as `EDITOR`.
     * This is due to we at present inherits the way how Creator prior to 3.0 deploys the build time constants.
     */
    export const EXPORT_TO_GLOBAL: boolean;

    /**
     * Running in published project.
     */
    export const BUILD: boolean;

    /**
     * Running in the engine's unit test.
     */
    export const TEST: boolean;

    /**
     * Running in the editor.
     */
    export const EDITOR: boolean;

    /**
     * Preview in browser or simulator.
     */
    export const PREVIEW: boolean;

    /**
     * Running in the editor or preview.
     */
    export const DEV: boolean;

    /**
     * Running in the editor or preview, or build in debug mode.
     */
    export const DEBUG: boolean;

    /**
     * Running in native platform (mobile app, desktop app, or simulator).
     */
    export const JSB: boolean;

    export const HTML5: boolean;

    /**
     * Running in the Wechat's mini game.
     */
    export const WECHAT: boolean;

    /**
     * Running in the alipay's mini game.
     */
    export const ALIPAY: boolean;

    /**
     * Running in the xiaomi's quick game.
     */
    export const XIAOMI: boolean;

    /**
     * Running in the ByteDance's quick game.
     */
    export const BYTEDANCE: boolean;

    /**
     * Running in the baidu's mini game.
     */
    export const BAIDU: boolean;

    /**
     * Running in the cocosplay.
     */
    export const COCOSPLAY: boolean;

    /**
     * Running in the huawei's quick game.
     */
    export const HUAWEI: boolean;

    /**
     * Running in the oppo's mini game.
     */
    export const OPPO: boolean;

    /**
     * Running in the vivo's mini game.
     */
    export const VIVO: boolean;

    /**
     * Running in the qtt's quick game.
     */
    export const QTT: boolean;

    /**
     * Running in the linksure's quick game.
     */
    export const LINKSURE: boolean;

    /**
     * Running in mini game.
     */
    export const MINIGAME: boolean;

    /**
     * Running in runtime environments.
     */
    export const RUNTIME_BASED: boolean;

    /**
     * Environment support JIT, currently iOS native and mini game doesn't support JIT
     */
    export const SUPPORT_JIT: boolean;

    /**
     * Running in server mode.
     */
    export const SERVER_MODE: boolean;
}
