'use strict';

const ps = require('path');
const fs = require('fs-extra');
const fsJetpack = require('fs-jetpack');

// const { Module } = require('module');
// (Module.createRequire || Module.createRequireFromPath)(ps.resolve(__dirname, '../../../app/index.js'))('cc/location').set(options.engineRoot);

const options = {
    engineRoot: '',
    shouldThrow: false,
    noSource: false,
    stripSpaces: false,
    noOutput: false,
    essentialOnly: false,
    keepNewlines: false,
    filesOrDirs: [],
};

const argc = process.argv.length;
for (let i = 2; i < argc; i++) {
    const arg = process.argv[i];
    if (arg === '--default-engine') {
        options.engineRoot = ps.join(__dirname, '../../');
    } else if (arg === '--throw') {
        options.shouldThrow = true;
    } else if (arg === '--no-source') {
        options.noSource = true;
    } else if (arg === '--strip-spaces') {
        options.stripSpaces = true;
    } else if (arg === '--no-output') {
        options.noOutput = true;
    } else if (arg === '--essential-only') {
        options.essentialOnly = true;
    } else if (arg.startsWith('--keep-newlines')) {
        options.keepNewlines = arg.length > 15 ? arg.substring(16) : '';
    } else {
        options.filesOrDirs.push(arg);
    }
}

// polyfill some dirty globals
Object.assign(global, {
    Manager: { AssetInfo: { engine: options.engineRoot } },
    cc: {}, CC_EDITOR: false, CC_DEV: false, CC_TEST: false,
});

const shdcLib = require(ps.join(__dirname, './effect-compiler'));
shdcLib.options.throwOnWarning = shdcLib.options.throwOnError = options.shouldThrow;
shdcLib.options.noSource = options.noSource;
shdcLib.options.skipParserTest = true;
const addChunks = (dir) => {
    const files = fsJetpack.find(dir, { matching: '*.chunk', recursive: false });
    for (let i = 0; i < files.length; ++i) {
        const name = ps.basename(files[i], '.chunk');
        const content = fs.readFileSync(files[i], { encoding: 'utf8' });
        shdcLib.addChunk(name, content);
    }
};
addChunks(ps.join(options.engineRoot, 'editor/assets/chunks'));

const indent = (str, num) => str.replace(/\n/g, '\n' + ' '.repeat(num));
const stringify = (o) => { return JSON.stringify(o).replace(/([,{]|":)/g, '$1 ').replace(/([}])/g, ' $1'); };
const stringifyArray = (arr, stringifyObj = stringify) => {
    let code = '';
    if (!arr.length) { return '[]'; }
    for (const obj of arr) { code += `  ${indent(stringifyObj(obj), 2)},\n`; }
    return `[\n${code.slice(0, -2)}\n]`;
};

const stringifySource = (() => {
    const indentRE = /\s*?\n\s*/g;
    const spacesRE = /[\s\n]+/g, identifierRE = /\w/;
    const replacer = (m, ofs, str) => // replace those following or followed by a non-identifier
        !ofs || !identifierRE.test(str[ofs - 1]) || !identifierRE.test(str[ofs + m.length]) ? '' : ' ';
    const stringifyCode = (src, path) => {
        if (options.stripSpaces) src = src.replace(spacesRE, replacer);
        if (options.essentialOnly) src = src.replace(indentRE, '\n');
        return path.includes(options.keepNewlines) ? `\`${src}\`` : `"${src.replace(/\n/g, '\\n')}"`;
    };
    return (src, path) => {
        let code = '{\n';
        code += `  "vert": ${indent(stringifyCode(src.vert, path + '.vert'), 4)},\n`;
        code += `  "frag": ${indent(stringifyCode(src.frag, path + '.frag'), 4)},\n`;
        code += `}`;
        return code;
    };
})();

const stringifyEffect = (() => {
    const stringifyBlock = (u) => `{"name": "${u.name}", "defines": ${stringify(u.defines)}, "binding": ${u.binding}, ` +
    (u.descriptorType ? '"descriptorType": ' + u.descriptorType + ', ' : '') +
    `"stageFlags": ${u.stageFlags}, "members": ${stringifyArray(u.members)}}`;
    const stringifyShader = (shader) => {
        let code = '';
        let { name, hash, glsl4, glsl3, glsl1, builtins, defines, blocks, samplerTextures, attributes, varyings } = shader;

        code += '{\n';
        code += `  "name": "${name}",\n`;
        code += `  "hash": ${hash},\n`;
        if (glsl4) code += `  "glsl4": ${indent(stringifySource(glsl4, 'glsl4'), 2)},\n`;
        if (glsl3) code += `  "glsl3": ${indent(stringifySource(glsl3, 'glsl3'), 2)},\n`;
        if (glsl1) code += `  "glsl1": ${indent(stringifySource(glsl1, 'glsl1'), 2)},\n`;
        if (varyings) code += `  "varyings": ${indent(stringifyArray(varyings), 2)},\n`;
        code += `  "builtins": {\n`;
        code += `    "statistics": ${stringify(builtins.statistics)},\n`;
        code += `    "globals": ${stringify(builtins.globals)},\n`;
        code += `    "locals": ${stringify(builtins.locals)}\n`;
        code += '  },\n';
        code += `  "defines": ${indent(stringifyArray(defines), 2)},\n`;
        code += `  "blocks": ${indent(stringifyArray(blocks, stringifyBlock), 2)},\n`;
        code += `  "samplerTextures": ${indent(stringifyArray(samplerTextures), 2)},\n`;
        code += `  "attributes": ${indent(stringifyArray(attributes), 2)}\n`;
        code += '}';

        return code;
    };
    return (effect) => {
        if (options.essentialOnly) { shdcLib.stripEditorSupport(effect); }
        let code = '';
        code += '{\n';
        code += `  "name": "${effect.name}",\n`;
        code += effect._uuid ? `  "_uuid": "${effect._uuid}",\n` : '';
        code += `  "techniques": ${indent(stringifyArray(effect.techniques), 2)},\n`;
        if (!options.essentialOnly) {
            code += `  "dependencies": ${indent(stringifyArray(effect.dependencies), 2)},\n`;
            if (effect.editor) code += `  "editor": ${indent(stringify(effect.editor), 2)},\n`;
        }
        code += `  "shaders": ${indent(stringifyArray(effect.shaders, stringifyShader), 2)}\n`;
        code += '}';
        return code;
    };
})();

const addEssential = (() => {
    // empty array will keep all techs
    const essentialList = {
        'pipeline/planar-shadow': { newName: 'planar-shadow', techs: [] },
        'pipeline/skybox': { newName: 'skybox', techs: [] },
        'pipeline/deferred-lighting': { newName: 'deferred-lighting', techs: [] },
        'pipeline/post-process': { newName: 'post-process', techs: [] },
        'util/profiler': { newName: 'profiler', techs: [] },
        'util/splash-screen': { newName: 'splash-screen', techs: [] },
        'builtin-standard': { newName: 'standard', techs: [0] },
        'builtin-unlit': { newName: 'unlit', techs: [0] },
        'builtin-sprite': { newName: 'sprite', techs: [] },
        'builtin-particle': { newName: 'particle', techs: [0] },
        'builtin-particle-gpu': { newName: 'particle-gpu', techs: [0] },
        'builtin-particle-trail': { newName: 'particle-trail', techs: [0] },
        'builtin-billboard': { newName: 'billboard', techs: [0] },
        'builtin-terrain': { newName: 'terrain', techs: [0] },
        'builtin-graphics': { newName: 'graphics', techs: [] },
        'builtin-clear-stencil': { newName: 'clear-stencil', techs: [] },
        'builtin-spine': { newName: 'spine', techs: [0] },
    };
    return (essentials, name, effect/* , path */) => {
        const info = essentialList[name];
        if (info !== undefined) {
            const partial = Object.assign({}, effect);
            if (info.techs.length) {
                partial.techniques = info.techs.reduce((acc, cur) => (acc.push(partial.techniques[cur]), acc), []);
                partial.shaders = partial.shaders.filter((s) => partial.techniques.some((tech) => tech.passes.some((p) => p.program === s.name)));
            }
            // name overrides
            partial.name = info.newName;
            partial.shaders = partial.shaders.map((s) => {
                const ns = Object.assign({}, s);
                ns.name = ns.name.replace(name, info.newName);
                return ns;
            });
            partial.techniques = partial.techniques.map((t) => {
                const nt = Object.assign({}, t);
                nt.passes = nt.passes.map((p) => {
                    const np = Object.assign({}, p);
                    np.program = np.program.replace(name, info.newName);
                    return np;
                });
                return nt;
            });
            essentials.push(partial);
        }
    };
})();

const buildEffect = (name, content) => {
    let effect = null;
    if (options.shouldThrow) {
        try { effect = shdcLib.buildEffect(name, content); }
        catch (e) { console.log(e); }
    } else {
        effect = shdcLib.buildEffect(name, content);
    }
    return effect;
};

const output = (path, content) => {
    if (options.noOutput) { return; }
    fs.ensureDirSync(ps.dirname(path));
    fs.writeFileSync(path, content, { encoding: 'utf8' });
    console.log(path + ' saved.');
};

// build specified files or directories
if (options.filesOrDirs.length) {
    const getFileSystemInfo = (file) => {
        try { return fs.lstatSync(file); }
        catch (e) { console.error(file, 'does not exist!'); }
        return null;
    };
    const compile = (file) => {
        const name = ps.basename(file, '.effect');
        const content = fs.readFileSync(file, { encoding: 'utf8' });
        const effect = buildEffect(name, content);
        if (!effect) { return; }
        output(ps.join(ps.dirname(file), `${name}.ts`), '/* eslint-disable */\n' +
            `export const effect = ${stringifyEffect(effect)};\n`);
    };
    for (let i = 0; i < options.filesOrDirs.length; i++) {
        const file = options.filesOrDirs[i];
        const stats = getFileSystemInfo(file);
        if (!stats) { continue; }
        if (stats.isDirectory()) {
            addChunks(file);
            fsJetpack.find(file, { matching: '*.effect', recursive: false }).forEach((f) => compile(f));
        } else {
            addChunks(ps.dirname(file)); // this won't work if dir is something like "D:\"
            compile(file);
        }
    }
    process.exit();
}

const target = ps.join(options.engineRoot, 'editor/assets');
const files = fsJetpack.find(target, { matching: '**/*.effect' });
const debugDir = ps.join(options.engineRoot, 'effects.ts');
const essentialDir = ps.join(options.engineRoot, 'cocos/core/builtin/effects.ts');
const shaderDir = ps.join(options.engineRoot, 'cocos/core/builtin/shader-sources');

let all = [], essentials = [];
for (let i = 0; i < files.length; ++i) {
    const path = ps.relative(ps.join(target, 'effects'), ps.dirname(files[i])).replace(/\\/g, '/');
    const name = path + (path.length ? '/' : '') + ps.basename(files[i], '.effect');
    const content = fs.readFileSync(files[i], { encoding: 'utf8' });
    const effect = buildEffect(name, content);
    if (!effect) { continue; }
    all.push(effect);
    addEssential(essentials, name, effect, files[i]);
}

output(debugDir, `\nexport const effects = ${stringifyArray(all, stringifyEffect)};\n`);

// need to separate shader source outputs for engine module clipping to work
options.essentialOnly = true;
for (const version of ['glsl4', 'glsl3', 'glsl1']) {
    const effectShaders = essentials.map(({ shaders }) => shaders.map((shader) => {
        const s = shader[version] || null;
        delete shader[version];
        return s;
    }));
    const stringifyStrippedSource = (shaders) => stringifyArray(shaders, (src) => stringifySource(src, version));
    output(ps.join(shaderDir, `${version}.ts`), '/* eslint-disable */\n' +
        `export const ${version} = ${stringifyArray(effectShaders, stringifyStrippedSource)};\n`);
}
output(essentialDir, '/* eslint-disable */\n// absolute essential effects\n' +
    `export const effects = ${stringifyArray(essentials, stringifyEffect)};\n`);
