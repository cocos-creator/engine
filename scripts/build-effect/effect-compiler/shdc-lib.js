'use strict';

/* eslint-disable */

const tokenizer = require('glsl-tokenizer/string');
const parser = require('glsl-parser/direct');
const mappings = require('./offline-mappings');
const yaml = require('js-yaml');

const tabAsSpaces = 2;
const plainDefineRE = /#define\s+(\w+)\s+(.*)\n/g;
const ident = /[_a-zA-Z]\w*/g;
const labelRE = /(\w+)\((.*?)\)/;
const locationRE = /location\s*=\s*(\d+)/;
const inDecl = /(?:layout\s*\((.*?)\)\s*)?in ((?:\w+\s+)?\w+\s+(\w+)\s*(?:\[[\d\s]+])?)\s*;/g;
const outDecl = /(?:layout\s*\((.*?)\)\s*)?out ((?:\w+\s+)?\w+\s+(\w+)\s*(?:\[[\d\s]+])?)\s*;/g;
const layoutExtract = /layout\s*\((.*?)\)(\s*)$/;
const bindingExtract = /(?:location|binding)\s*=\s*(\d+)/;
const builtinRE = /^cc\w+$/i;
const pragmasToStrip = /^\s*(?:#pragma\s*)(?!STDGL|optimize|debug).*$\n/gm;

let effectName = '', shaderName = '', shaderTokens = [];
const formatMsg = (msg, ln) => `${effectName}.effect - ${shaderName}` + (ln !== undefined ? ` - ${ln}: ` : ': ') + msg;
const options = { throwOnError: true, throwOnWarning: false, noSource: false, skipParserTest: false,
  chunkSearchFn: (names) => ({}), getAlternativeChunkPaths: (path) => [] };
const dumpSource = (tokens) => {
  let ln = 0;
  return tokens.reduce((acc, cur) =>
    cur.line > ln
    ? acc + `\n${ln = cur.line}\t${cur.data.replace(/\n/g, '')}`
    : acc + cur.data, '');
};
const throwFnFactory = (level, outputFn) => {
  return (msg, ln) => {
    if (options.noSource) ln = undefined;
    let source = ln !== undefined ? ' ↓↓↓↓↓ EXPAND THIS MESSAGE FOR MORE INFO ↓↓↓↓↓' + dumpSource(shaderTokens) + '\n' : '';
    const formattedMsg = formatMsg(level + ' ' + msg, ln) + source;
    if (options.throwOnWarning) throw formattedMsg; else outputFn(formattedMsg);
  };
};
const warn = throwFnFactory('Warning', console.warn);
const error = throwFnFactory('Error', console.error);

const convertType = (t) => { let tp = mappings.typeMap[t]; return tp === undefined ? t : tp; };

const VSBit = mappings.getShaderStage('vertex');
const FSBit = mappings.getShaderStage('fragment');

const stripComments = (() => {
  const crlfNewLines = /\r\n/g;
  const blockComments = /\/\*.*?\*\//gs;
  const lineComments = /\s*\/\/.*$/gm;
  return (code) => {
    // strip comments
    let result = code.replace(blockComments, '');
    result = result.replace(lineComments, '');
    // replace CRLFs (tokenizer doesn't work with /r/n)
    result = result.replace(crlfNewLines, '\n');
    return result;
  };
})();

const globalChunks = {};
const globalDeprecations = { chunks: {}, identifiers: {} };
const addChunk = (() => {
  const depRE = /#pragma\s+deprecate-(chunk|identifier)\s+([\w-]+)(?:\s+(.*))?/g;
  return (name, content, chunks = globalChunks, deprecations = globalDeprecations) => {
    const chunk = stripComments(content);
    let depCap = depRE.exec(chunk);
    let code = '', nextBegIdx = 0;
    while (depCap) {
      const type = `${depCap[1]}s`;
      if (!deprecations[type]) deprecations[type] = {};
      deprecations[type][depCap[2]] = depCap[3];

      code += chunk.slice(nextBegIdx, depCap.index);
      nextBegIdx = depCap.index + depCap[0].length;

      depCap = depRE.exec(chunk);
    }
    chunks[name] = code + chunk.slice(nextBegIdx);
  };
})();

const invokeSearch = (names) => {
  const { name, content } = options.chunkSearchFn(names);
  if (content !== undefined) { addChunk(name, content); return name; }
};

const unwindIncludes = (() => {
  const includeRE = /^(.*)#include\s+[<"]([\s\w-]+)[>"](.*)$/gm;
  let replacer;
  const replacerFactory = (chunks, deprecations, record) => (str, prefix, name, suffix) => {
    name = name.trim();
    if (name.endsWith('.chunk')) name = name.slice(0, -6);
    if (record.has(name)) return '';
    if (deprecations[name] !== undefined) {
      error(`EFX2003: header '${name}' is deprecated: ${deprecations[name]}`);
    }
    let content = undefined;
    do {
      content = chunks[name];
      if (content !== undefined) break;
      const alternatives = options.getAlternativeChunkPaths(name);
      if (alternatives.some((path) => {
        if (chunks[path] !== undefined) {
          name = path;
          content = chunks[path];
          return true;
        }
      })) break;
      name = invokeSearch([].concat(name, alternatives));
      content = globalChunks[name];
      if (content !== undefined) break;
      error(`EFX2001: can not resolve ${str}`);
      return '';
    } while (0);
    record.add(name);

    if (prefix) content = content.replace(/^/gm, prefix);
    if (suffix) content = content.replace(/\n/g, suffix + '\n') + suffix;
    content = content.replace(includeRE, replacer);
    return content;
  };
  return (str, chunks, deprecations, record = new Set()) => {
    replacer = replacerFactory(chunks, deprecations.chunks, record);
    str = str.replace(includeRE, replacer);
    if (deprecations.identifierRE) {
      let depCap = deprecations.identifierRE.exec(str);
      while (depCap) {
        const depMsg = deprecations.identifiers[depCap[1]];
        if (depMsg) error(`EFX2004: identifier '${depCap[1]}' is deprecated: ${depMsg}`);
        depCap = deprecations.identifierRE.exec(str);
      }
    }
    return str;
  };
})();

const expandFunctionalMacro = (() => {
  const getMatchingParen = (string, startParen) => {
    if (string[startParen] !== '(') return startParen;
    let depth = 1;
    let i = startParen + 1;
    for (; i < string.length; i++) {
      if (string[i] === '(') depth++;
      if (string[i] === ')') depth--;
      if (depth === 0) break;
    }
    return i;
  };
  const parenAwareSplit = (string) => {
    const res = []; let beg = 0;
    for (let i = 0; i < string.length; i++) {
      if (string[i] === '(') i = getMatchingParen(string, i) + 1;
      if (string[i] === ',') {
        res.push(string.substring(beg, i).trim());
        beg = i + 1;
      }
    }
    if (beg !== string.length || string[string.length - 1] === ',') res.push(string.substring(beg).trim());
    return res;
  };
  const defineRE = /#define\s+(\w+)\(([\w,\s]*)\)\s+(.*?)\n/g;
  const hashRE = /(?<=\w)##(?=\w)/g;
  const newlineRE = /\\\n/g;
  const newlineMarkRE = /@@/g;
  return (code) => {
    code = code.replace(newlineRE, '@@');
    let defineCapture = defineRE.exec(code);
    // loop through definitions
    while (defineCapture != null) {
      const fnName = defineCapture[1];
      const fnParams = parenAwareSplit(defineCapture[2]);
      const fnBody = defineCapture[3];
      const defStartIdx = defineCapture.index;
      const defEndIdx = defineCapture.index + defineCapture[0].length;
      const macroRE = new RegExp('^(.*?)' + fnName + '\\s*\\(', 'gm');
      // loop through invocations
      if (new RegExp('\\b' + fnName + '\\b').test(fnBody)) warn(`EFX2002: recursive macro processor '${fnName}'`);
      else for (let macroCapture = macroRE.exec(code); macroCapture != null; macroCapture = macroRE.exec(code)) {
        const openParenIdx = macroCapture.index + macroCapture[0].length - 1;
        if (openParenIdx > defStartIdx && openParenIdx < defEndIdx) continue; // skip original definition
        const prefix = macroCapture[1];
        const startIdx = macroCapture.index + prefix.length;
        const endIdx = getMatchingParen(code, openParenIdx) + 1;
        const params = parenAwareSplit(code.slice(macroCapture.index + macroCapture[0].length, endIdx - 1));
        if (params.length !== fnParams.length) {
          warn(`EFX2005: not enough arguments for function-like macro invocation '${fnName}'`);
        }
        // patch function body
        let records = [];
        for (let i = 0; i < fnParams.length; i++) {
          const re = new RegExp('\\b' + fnParams[i] + '\\b', 'g'); let match;
          while ((match = re.exec(fnBody)) !== null) {
            records.push({ beg: match.index, end: re.lastIndex, target: params[i] });
          }
        }
        let body = ''; let index = 0;
        for (const record of records.sort((a, b) => a.beg - b.beg)) {
          body += fnBody.slice(index, record.beg) + record.target;
          index = record.end;
        }
        body += fnBody.slice(index, fnBody.length);
        if (prefix.indexOf('#define') === -1) { // for top level invocations
          let indentCount = prefix.search(/\S/); // calc indentation
          if (indentCount < 0) indentCount = prefix.length;
          body = body.replace(hashRE, ''); // clear the hashes
          body = body.replace(newlineMarkRE, '\n' + ' '.repeat(indentCount)); // restore newlines in the output
        } else {
          let lastNewline = prefix.lastIndexOf('@@'); // calc indentation
          let curLinePrefix = lastNewline < 0 ? prefix : prefix.slice(lastNewline + 2);
          let indentCount = curLinePrefix.search(/\S/);
          if (indentCount < 0) indentCount = curLinePrefix.length;
          body = body.replace(newlineMarkRE, '@@' + ' '.repeat(indentCount));
        }
        // replace the invocation
        code = code.substring(0, startIdx) + body + code.substring(endIdx);
        // move to the starting point in case the function body is actually shorter than the invocation
        macroRE.lastIndex -= macroCapture[0].length;
      }
      code = code.substring(0, defStartIdx) + code.substring(defEndIdx); // no longer need to be around
      defineRE.lastIndex = 0; // reset pointer
      defineCapture = defineRE.exec(code);
    }
    code.replace(newlineMarkRE, '\\\n');
    return code;
  };
})();

/**
 * Replace the obvious constants, which are often used inside array subscriptions.
 * To bypass the process, you should declare the macro with spaces succeeding the hash tag.
 * This will become necessary when doing something like this:
 * ```glsl
 * #if SOME_MACRO
 * #  define SOME_PLAIN_DEFINE // you can't write '#define' here
 * #endif
 * ```
 */
const expandLiteralMacro = (code) => {
  const defines = {};
  let defCap = plainDefineRE.exec(code);
  // extraction
  while (defCap != null) {
    let value = defCap[2];
    if (value.endsWith('\\')) value = value.slice(0, -1);
    defines[defCap[1]] = value.trim();
    const beg = defCap.index;
    const end = defCap.index + defCap[0].length;
    code = code.substring(0, beg) + code.substring(end);
    plainDefineRE.lastIndex = beg;
    defCap = plainDefineRE.exec(code);
  }
  // replacement
  const keyREs = Object.keys(defines).map((k) => new RegExp(`\\b${k}\\b`, 'g'));
  const values = Object.values(defines);
  for (let i = 0; i < values.length; i++) {
    let value = values[i];
    for (let j = 0; j < i; j++) { // only replace ealier ones
      value = value.replace(keyREs[j], values[j]);
    }
    code = code.replace(keyREs[i], value);
  }
  return code;
};

const eliminateDeadCode = (() => {
  const scopeRE = /[{}()]/g;
  const sigRE = /(?:\w+p\s+)?\w+\s+(\w+)\s*$/; // precision? returnType fnName
  const spacesRE = /^\s*$/;
  let name = ''; let beg = 0; let end = 0;
  const recordBegin = (code, leftParen) => {
    const cap = code.substring(end, leftParen).match(sigRE) || ['', ''];
    name = cap[1]; beg = leftParen - cap[0].length;
  };
  const getAllCaptures = (code, RE) => {
    const caps = [];
    let cap = RE.exec(code);
    while (cap) { caps.push(cap); cap = RE.exec(code); }
    return caps;
  };
  const livepool = new Set();
  const ascension = (functions, idx) => {
    if (livepool.has(idx)) return;
    livepool.add(idx);
    for (const dep of functions[idx].deps) {
      ascension(functions, dep);
    }
  };
  return (code, entry, functions) => {
    let depth = 0, state = 0, paramListEnd = 0;
    end = 0; scopeRE.lastIndex = 0; livepool.clear();
    const functionsFull = [];
    // extraction
    for (const cur of getAllCaptures(code, scopeRE)) {
      const c = cur[0];
      if (depth === 0) {
        if (c === '(') state = 1, recordBegin(code, cur.index);
        else if (c === ')') {
          if (state === 1) state = 2, paramListEnd = cur.index + 1; else state = 0;
        } else if (c === '{') {
          if (state === 2 && spacesRE.test(code.substring(paramListEnd, cur.index))) state = 3; else state = 0;
        }
      }
      if (c === '{') depth++;
      if (c === '}' && --depth === 0) {
        if (state !== 3) continue;
        end = cur.index + 1;
        state = 0;
        functionsFull.push({ name, beg, end, paramListEnd, deps: [] });
      }
    }
    // inspection
    let entryIdx = functionsFull.findIndex((f) => f.name === entry);
    if (entryIdx < 0) { error(`EFX2403: entry function '${entry}' not found.`); entryIdx = 0; }
    for (let i = 0; i < functionsFull.length; i++) {
      const fn = functionsFull[i];
      const caps = getAllCaptures(code, new RegExp('\\b' + fn.name + '\\b', 'g'));
      for (const cap of caps) {
        const target = functionsFull.findIndex((f) => cap.index > f.beg && cap.index < f.end);
        if (target >= 0 && target !== i) functionsFull[target].deps.push(i);
      }
    }
    // extract all functionsFull reachable from main
    // actually this even works with function overloading, albeit not the best output possible:
    // overloads for the same function will be extracted all at once or not at all
    ascension(functionsFull, entryIdx);
    // elimination
    let result = '', pointer = 0, offset = 0;
    for (let i = 0; i < functionsFull.length; i++) {
      const dc = functionsFull[i];
      const { name, beg, end } = dc;
      if (livepool.has(i) || name === 'main') {
        // adjust position and add to final list
        dc.beg -= offset;
        dc.end -= offset;
        dc.paramListEnd -= offset;
        functions.push(dc);
        continue;
      }
      result += code.substring(pointer, beg);
      pointer = end;
      offset += end - beg;
    }
    return result + code.substring(pointer);
  };
})();

const parseCustomLabels = (arr, out = {}) => {
  let str = arr.join(' ');
  let labelCap = labelRE.exec(str);
  while (labelCap) {
    try { out[labelCap[1]] = yaml.safeLoad(labelCap[2] || 'true'); }
    catch (e) { warn(`EFX2102: parameter for label '${labelCap[1]}' is not legal YAML: ${e.message}`); }
    str = str.substring(labelCap.index + labelCap[0].length);
    labelCap = labelRE.exec(str);
  }
  return out;
};

/**
 * say we are extracting from this program:
 * ```
 *    // ..
 * 12 #if USE_LIGHTING
 *      // ..
 * 34   #if NUM_LIGHTS > 0
 *        // ..
 * 56   #endif
 *      // ..
 * 78 #endif
 *    // ..
 * ```
 *
 * the output would be:
 * ```
 * // the complete define list
 * defines = [
 *   { name: 'USE_LIGHTING', type: 'boolean', defines: [] },
 *   { name: 'NUM_LIGHTS', type: 'number', range: [0, 3], defines: [ 'USE_LIGHTING' ] }
 * ]
 * // bookkeeping: define dependency throughout the code
 * cache = {
 *   lines: [12, 34, 56, 78],
 *   12: [ 'USE_LIGHTING' ],
 *   34: [ 'USE_LIGHTING', 'NUM_LIGHTS' ],
 *   56: [ 'USE_LIGHTING' ],
 *   78: []
 * }
 * ````
 */
const getDefs = (line, cache) => {
  let idx = cache.lines.findIndex(i => i > line);
  if (idx < 0) idx = cache.lines.length;
  return cache[cache.lines[idx - 1]] || [];
};

const extractDefines = (tokens, defines, cache) => {
  let curDefs = [], save = (line) => {
    cache[line] = curDefs.reduce((acc, val) => acc.concat(val), []);
    cache.lines.push(line);
  };
  let elifClauses = 0;
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i], str = t.data, id, df;
    if (t.type !== 'preprocessor' || str.startsWith('#extension')) { continue; }
    str = str.split(/\s+/);
    if (str[0] === '#endif') { // pop one level up
      while (elifClauses > 0) curDefs.pop(), elifClauses--; // pop all the elifs
      curDefs.pop(); save(t.line); continue;
    } else if (str[0] === '#else' || str[0] === '#elif') { // flip
      const def = curDefs[curDefs.length - 1];
      def.forEach((d, i) => def[i] = (d[0] === '!' ? d.slice(1) : ('!' + d))); save(t.line);
      if (str[0] === '#else') continue; elifClauses++;
    } else if (str[0] === '#pragma') { // pragmas
      if (str.length <= 1) continue;
      if (str[1] === 'define') { // define specifications
        if (str.length <= 2) { warn('EFX2101: define pragma: missing info', t.line); continue; }
        ident.lastIndex = 0;
        if (!ident.test(str[2])) continue; // some constant macro replaced this one, skip
        let d = curDefs.reduce((acc, val) => acc.concat(val), []);
        let def = defines.find(d => d.name === str[2]);
        if (!def) defines.push(def = { name: str[2], type: 'boolean', defines: d, dummyDependency: true });
        const prop = parseCustomLabels(str.splice(3));
        for (const key in prop) {
          if (key === 'range') { // number range
            def.type = 'number'; def.range = [0, 3]; def.fixedType = true;
            if (!Array.isArray(prop.range)) warn(`EFX2103: invalid range for macro '${def.name}'`, t.line);
            else def.range = prop.range;
          } else if (key === 'options') { // string options
            def.type = 'string'; def.options = []; def.fixedType = true;
            if (!Array.isArray(prop.options)) warn(`EFX2104: invalid options for macro '${def.name}'`, t.line);
            else def.options = prop.options;
          } else if (key === 'default') {
            def.type = 'constant'; def.default = prop.default; def.fixedType = true;
          } else if (key === 'editor') {
            def.editor = prop.editor;
          } else { warn(`EFX2105: define pragma: illegal label '${key}'`, t.line); continue; }
        }
      } else if (str[1] === 'warning') {
        warn(`EFX2107: ${str.slice(2).join(' ')}`);
      } else if (str[1] === 'error') {
        error(`EFX2108: ${str.slice(2).join(' ')}`);
      } else { // other specifications, save for later passes
        const labels = parseCustomLabels(str.slice(1));
        if (labels.extension) { // extension request
          cache.extensions[labels.extension[0]] = {
            defines: getDefs(t.line, cache),
            cond: labels.extension[1],
            level: labels.extension[2]
          };
        } else cache[t.line] = labels;
      }
      continue;
    } else if (!/#(el)?if/.test(str[0])) continue;
    let defs = [], systemDirective = false, ifdef = false;
    str.splice(1).some(s => {
      ident.lastIndex = 0; id = ident.exec(s);
      if (id && id[0] === 'defined') { id = ident.exec(s); ifdef = true; }
      if (id) { // is identifier
        if (id[0].startsWith('__') || id[0].startsWith('GL_') || id[0] === 'VULKAN') return systemDirective = true; // ignore language builtin macros
        let d = curDefs.reduce((acc, val) => acc.concat(val), defs.slice());
        df = defines.find(d => d.name === id[0]);
        if (df) {
          let needUpdate = d.length < df.defines.length; // update path if shorter
          if (df.dummyDependency) { needUpdate = true, delete df.dummyDependency; } // or have a dummy
          if (needUpdate) df.defines = d;
        }
        else defines.push(df = { name: id[0], type: 'boolean', defines: d });
        defs.push((s[0] === '!' ? '!' : '') + id[0]);
      } else if (df && /^[<=>]+$/.test(s) && !df.fixedType) {
        df.type = 'number';
        df.range = [0, 3];
      } else if (s === '||') return defs = []; // ignore logical OR defines all together
    });
    curDefs.push(defs); save(t.line);
    if (!systemDirective && (str[0] === '#ifdef' || ifdef)) { // report misusage
      error('EFX2106: for custom macros, #ifdef or #if defined() will always return true at runtime. please use #if instead.', t.line);
    }
  }
  defines.forEach((d) => (delete d.fixedType, delete d.dummyDependency));
};

const extractParams = (() => {
  // tokens (from ith): [ ..., ('highp', ' ',) 'vec4', ' ', 'color', ('[', '4', ']',) ... ]
  const precision = /(low|medium|high)p/;
  const extractInfo = (tokens, i) => {
    const param = {};
    const definedPrecision = precision.exec(tokens[i].data);
    let offset = definedPrecision ? 2 : 0;
    param.name = tokens[i+offset+2].data;
    param.typename = tokens[i+offset].data;
    param.type = convertType(tokens[i+offset].data);
    param.count = 1;
    if (definedPrecision) param.precision = definedPrecision[0] + ' ';
    // handle array type
    if (tokens[offset = nextWord(tokens, i+offset+2)].data === '[') {
      let expr = '', end = offset;
      while (tokens[++end].data !== ']') expr += tokens[end].data;
      try {
        if (/^[\d\+\-*/%\s]+$/.test(expr)) param.count = eval(expr); // arithmetics
        else if (builtinRE.test(param.name)) param.count = expr;
        else throw expr;
        param.isArray = true;
      } catch (e) { error(`EFX2202: ${param.name}: non-builtin array length must be compile-time constant: ${e}`, tokens[offset].line); }
    }
    return param;
  };
  const stripDuplicates = (arr) => {
    const dict = {}; return arr.filter((e) => dict[e] ? false : (dict[e] = true));
  };
  const exMap = { whitespace: true };
  const nextWord = (tokens, i) => { while (exMap[tokens[++i].type]); return i; };
  const nextSemicolon = (tokens, i, check = (t) => {}) => { while (tokens[i].data !== ';') check(tokens[i++]); return i; };
  const isFunctionParameter = (functions, pos) => functions.some((f) => pos > f.beg && pos < f.paramListEnd);
  return (tokens, cache, blocks, samplerTextures, attributes, varyings, fragColors, isVert, functions) => {
    const res = [];
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i], str = t.data, dest, type;
      if (str === 'uniform') dest = blocks, type = 'blocks';
      else if (str === 'in' && !isFunctionParameter(functions, t.position)) dest = isVert ? attributes : varyings, type = isVert ? 'attributes' : 'varyings';
      else if (str === 'out' && !isFunctionParameter(functions, t.position)) dest = isVert ? varyings : fragColors, type = isVert ? 'varyings' : 'fragColors';
      else continue;
      let defines = getDefs(t.line, cache), param = {};
      // uniforms
      param.tags = cache[t.line - 1]; // pass pragma tags further
      let idx = nextWord(tokens, i + 2);
      if (tokens[idx].data !== '{') {
        Object.assign(param, extractInfo(tokens, i + 2));
        if (dest === blocks) { // samplerTextures
          if (tokens[i + (param.precision ? 4 : 2)].data.indexOf('sampler') < 0)
            error('EFX2201: vector uniforms must be declared in blocks.', t.line);
          dest = samplerTextures; type = 'samplerTextures';
        } // other attributes or varyings
        // check for duplicates
        let item = dest.find(i => i.name === param.name);
        if (item) param.duplicate = true;
        idx = nextSemicolon(tokens, idx);
      } else { // blocks
        param.name = tokens[i + 2].data;
        param.members = [];
        while (tokens[idx = nextWord(tokens, idx)].data !== '}') {
          const info = extractInfo(tokens, idx);
          if (mappings.isSampler(info.type))
            error('EFX2208: texture uniforms must be declared outside blocks.', tokens[idx].line);
          param.members.push(info);
          idx = nextSemicolon(tokens, idx);
        }
        // std140 specific checks
        param.members.reduce((acc, cur) => {
          let base_alignment = mappings.GetTypeSize(cur.type);
          switch (cur.typename) {
            case 'mat2': base_alignment /= 2;
            case 'mat3': base_alignment /= 3;
            case 'mat4': base_alignment /= 4;
          }
          if (cur.count > 1 && base_alignment < 16) {
            const typeMsg = `uniform ${convertType(cur.type)} ${cur.name}[${cur.count}]`;
            error('EFX2203: ' + typeMsg + ': array UBO members need to be 16-bytes-aligned to avoid implicit padding');
            base_alignment = 16;
          } else if (base_alignment === 12) {
            const typeMsg = `uniform ${convertType(cur.type)} ${cur.name}`;
            error('EFX2204: ' + typeMsg + ': please use 1, 2 or 4-component vectors to avoid implicit padding');
            base_alignment = 16;
          } else if (mappings.isPaddedMatrix(cur.type)) {
            const typeMsg = `uniform ${convertType(cur.type)} ${cur.name}`;
            error('EFX2210: ' + typeMsg + ': use only 4x4 matrices to avoid implicit padding');
          }
          const aligned_offset = Math.ceil(acc / base_alignment) * base_alignment;
          const implicit_padding = aligned_offset - acc;
          if (implicit_padding) error(`EFX2205: UBO '${param.name}' introduces implicit padding: ` +
            `${implicit_padding} bytes before '${cur.name}', consider re-ordering the members`);
          return aligned_offset + base_alignment * cur.count; // base offset for the next member
        }, 0); // top level UBOs have a base offset of zero
        // check for preprocessors inside blocks
        let pre = cache.lines.find(l => l >= tokens[i].line && l < tokens[idx].line)
        if (pre) error(`EFX2206: ${param.name}: no preprocessors allowed inside uniform blocks!`, pre);
        // check for struct members
        param.members.forEach((info) => {
          if (typeof info.type === 'string') error(`EFX2211: '${info.type} ${info.name}' in block '${param.name}': ` +
          `struct-typed member within UBOs is not supported due to compatibility reasons.`, tokens[idx].line);
        });
        // check for duplicates
        let item = dest.find(i => i.name === param.name);
        if (item) {
          if (JSON.stringify(item.members) !== JSON.stringify(param.members))
            error(`EFX2207: different UBO using the same name '${param.name}'`, t.line);
          item.stageFlags |= isVert ? VSBit : FSBit;
          param.duplicate = true;
        }
        idx = nextWord(tokens, idx);
        if (tokens[idx].data !== ';')
          error('EFX2209: Block declarations must be semicolon-terminated，non-array-typed and instance-name-free. ' +
            `Please check your '${param.name}' block declaration.`, tokens[idx].line);
      }
      res.push({ beg: tokens[i].position, end: tokens[idx].position, name: param.name, type });
      if (!param.duplicate) {
        param.defines = stripDuplicates(defines);
        param.stageFlags = isVert ? VSBit : FSBit;
        dest.push(param);
      }
      // now we are done with the whole expression
      i = idx;
    }
    return res;
  };
})();

const miscChecks = (() => {
  // mostly from glsl 100 spec, except:
  // 'texture' is reserved on android devices with relatively new GPUs
  // usage as an identifier will lead to runtime compilation failure:
  // https://github.com/pedroSG94/rtmp-rtsp-stream-client-java/issues/146
  const reservedKeywords =
    'asm|class|union|enum|typedef|template|this|packed|goto|switch|default|inline|noinline|volatile|' +
    'public|static|extern|external|interface|flat|long|short|double|half|fixed|unsigned|superp|input|' +
    'output|hvec2|hvec3|hvec4|dvec2|dvec3|dvec4|fvec2|fvec3|fvec4|sampler1D|sampler3D|sampler1DShadow|' +
    'sampler2DShadow|sampler2DRect|sampler3DRect|sampler2DRectShadow|sizeof|cast|namespace|using|texture';
  const keywordRE = new RegExp(`\\b(?:${reservedKeywords})\\b`);
  const precisionRE = /precision\s+(low|medium|high)p\s+(\w+)/;
  return (code) => {
    // precision declaration check
    const cap = precisionRE.exec(code);
    if (cap) {
      if (/#extension/.test(code.slice(cap.index)))
        warn('EFX2400: precision declaration should come after extensions');
    } else warn('EFX2401: precision declaration not found.');
    const resCap = keywordRE.exec(code);
    if (resCap) error(`EFX2402: using reserved keyword in glsl1: ${resCap[0]}`);
    // the parser throws obscure errors when encounters some semantic errors,
    // so in some situation disabling this might be a better option
    if (options.skipParserTest) return;
    // AST based checks
    const tokens = tokenizer(code).filter((t) => t.type !== 'preprocessor');
    shaderTokens = tokens;
    try { parser(tokens); }
    catch (e) { error(`EFX2404: glsl1 parser failed: ${e}`, 0); }
  };
})();

const finalTypeCheck = (() => {
  let gl = null;
  let backendCheckEnabled = true;
  const createGL = () => {
    if (!gl && typeof document !== 'undefined') {
      gl = document.createElement('canvas').getContext('webgl', { depth: true, stencil: true });
      gl.getSupportedExtensions().forEach((e) => gl.getExtension(e));
      // some of our shaders assumes some basic device capabilities and we shouldn't
      // directly reject the effect file only because we are running the editor on a
      // less-capable device, so just skip the WebGL backend check here and leave
      // the problem for runtime to handle.
      backendCheckEnabled = backendCheckEnabled && gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) >= 8;
    }
    return backendCheckEnabled && gl;
  };
  const getDefineString = (defines) => defines.reduce((acc, cur) => {
    let value = 1; // enable all boolean swithces
    switch (cur.type) {
    case 'string': value = cur.options[0]; break;
    case 'number': value = cur.range[0]; break;
    case 'constant': value = cur.default; break;
    }
    return `${acc}#define ${cur.name} ${value}\n`;
  }, '');
  const compile = (source, type) => {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      let lineNumber = 1;
      const dump = source.replace(/^|\n/g, () => `\n${lineNumber++} `);
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader); shader = null;
      error(`EFX2406: compilation failed: ↓↓↓↓↓ EXPAND THIS MESSAGE FOR MORE INFO ↓↓↓↓↓\n${err}\n${dump}`);
    }
    return shader;
  }
  const link = (...args) => {
    let prog = gl.createProgram();
    args.forEach((s) => gl.attachShader(prog, s));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog); prog = null;
      error(`EFX2407: link failed: ${err}`);
    }
    return prog;
  };
  return (vert, frag, defines, vertName, fragName) => {
    if (!createGL()) return; // delay context creation to the first compilation job
    const prefix = '#version 100\n' + getDefineString(defines);
    shaderName = vertName;
    const vs = compile(prefix + vert, gl.VERTEX_SHADER);
    shaderName = fragName;
    const fs = compile(prefix + frag, gl.FRAGMENT_SHADER);
    shaderName = 'linking';
    const prog = link(vs, fs);
    gl.deleteProgram(prog); gl.deleteShader(fs); gl.deleteShader(vs);
  };
})();

const stripToSpecificVersion = (() => {
  const globalSearch = /#(if|elif|else|endif)(.*)?/g;
  const legalExpr = /^[\d<=>!|&^\s]*(__VERSION__)?[\d<=>!|&^\s]*$/; // all compile-time constant branches
  const macroWrap = (src, defines) => {
    /* */
    return src;
    /* not now, maybe. the macro dependency extraction is still too fragile *
    const macros = defines.reduce((acc, cur) => `${acc} && ${cur}`, '').slice(4);
    return macros ? `#if ${macros}\n${src}#endif\n` : src;
    /* */
  };
  const declareExtension = (ext, level) => {
    if (level === 'require') return `#extension ${ext}: require\n`;
    return `\n#ifdef ${ext}\n#extension ${ext}: enable\n#endif\n`;
  };
  return (code, version, extensions, isVert) => {
    if (version < 310) { // keep std140 declaration, discard others
      code = code.replace(/layout\s*\((.*?)\)(\s*)(\w+)/g, (_, tokens, trailingSpaces, type) => {
        if (!isVert && type === 'out') return _; // keep draw buffer locations
        return tokens.indexOf('std140') >= 0 ? 'layout(std140)' + trailingSpaces + type : type;
      });
    }
    // extraction
    const instances = [];
    let cap = null, temp = null;
    while (true) {
      cap = globalSearch.exec(code); if (!cap) break;
      if (cap[1] === 'if') {
        if (temp) { temp.level++; continue; }
        if (!legalExpr.test(cap[2])) continue;
        temp = { start: cap.index, end: cap.index, conds: [cap[2]], content: [cap.index + cap[0].length], level: 1 };
      } else if (cap[1] === 'elif') {
        if (!temp || temp.level > 1) continue;
        if (!legalExpr.test(cap[2])) {
          error(`EFX2301: #elif conditions after a constant #if should be constant too; get '${cap[2]}'`);
          cap[2] = '';
        }
        temp.conds.push(cap[2]); temp.content.push(cap.index, cap.index + cap[0].length);
      } else if (cap[1] === 'else') {
        if (!temp || temp.level > 1) continue;
        temp.conds.push('true'); temp.content.push(cap.index, cap.index + cap[0].length);
      } else if (cap[1] === 'endif') {
        if (!temp || --temp.level) continue;
        temp.content.push(cap.index); temp.end = cap.index + cap[0].length;
        instances.push(temp); temp = null;
      }
    }
    let res = code;
    if (instances.length) {
      // replacement
      res = res.substring(0, instances[0].start);
      for (let j = 0; j < instances.length; j++) {
        const ins = instances[j];
        for (let i = 0; i < ins.conds.length; i++) {
          if (eval(ins.conds[i].replace('__VERSION__', version))) {
            const subBlock = code.substring(ins.content[i * 2], ins.content[i * 2 + 1]);
            res += stripToSpecificVersion(subBlock, version, isVert);
            break;
          }
        }
        const next = instances[j + 1] && instances[j + 1].start || code.length;
        res += code.substring(ins.end, next);
      }
    }
    // extensions
    for (const ext in extensions) {
      const { defines, cond, level } = extensions[ext];
      if (eval(cond.replace('__VERSION__', version))) {
        res = macroWrap(declareExtension(ext, level), defines) + res;
      }
    }
    return res;
  };
})();

const glsl300to100 = (code, blocks, defines, paramInfo, functions, cache, vert) => {
  let res = '';
  // unpack UBOs
  let idx = 0;
  paramInfo.forEach((i) => {
    if (i.type !== 'blocks') { return; }
    res += code.slice(idx, i.beg);
    const indentCount = res.length - res.search(/\s*$/) + 1;
    blocks.find((u) => u.name === i.name).members.forEach((m) => {
      // crucial optimization, for the uniform vectors in WebGL (iOS especially) is extremely limited
      const matches = code.match(new RegExp(`\\b${m.name}\\b`, 'g'));
      if (!matches || matches.length <= 1) return;
      const type = convertType(m.type);
      const precision = m.precision || '';
      const arraySpec = typeof m.count === 'string' || m.isArray ? `[${m.count}]` : '';
      res += ' '.repeat(indentCount) + `uniform ${precision}${type} ${m.name}${arraySpec};\n`;
    });
    idx = i.end + (code[i.end] === ';');
  });
  res += code.slice(idx);
  // texture functions
  res = res.replace(/\btexture((?!2D|Cube)\w*)\s*\(\s*(\w+)\s*([,\[])/g, (original, suffix, name, endToken, idx) => {
    // skip replacement if function already defined
    const fnName = 'texture' + suffix;
    if (functions.find((f) => f.name === fnName)) return original;
    // find in parent scope first
    let re = new RegExp('sampler(\\w+)\\s+' + name);
    const scope = functions.find((f) => idx > f.beg && idx < f.end);
    let cap = scope && re.exec(res.substring(scope.beg, scope.eng)) || re.exec(res);
    if (!cap) { // perhaps defined in macro
      const def = defines.find((d) => d.name === name);
      if (def && def.options) {
        for (const n of def.options) {
          re = new RegExp('sampler(\\w+)\\s+' + n);
          cap = re.exec(res);
          if (cap) break;
        }
      }
      if (!cap) {
        error(`EFX2300: sampler '${name}' does not exist`);
        return original;
      }
    }
    return `texture${cap[1]}${suffix}(${name}${endToken}`;
  });
  if (vert) {
    // in/out => attribute/varying
    res = res.replace(inDecl, (str, qualifiers, decl) => `attribute ${decl};`);
    res = res.replace(outDecl, (str, qualifiers, decl) => `varying ${decl};`);
  } else {
    // in/out => varying/gl_FragColor
    res = res.replace(inDecl, (str, qualifiers, decl) => `varying ${decl};`);
    const outList = [];
    res = res.replace(outDecl, (str, qualifiers, decl, name) => {
      const locationCap = qualifiers && locationRE.exec(qualifiers);
      if (!locationCap) error(`EFX2302: fragment output location must be specified`);
      outList.push({ name, location: locationCap[1] });
      return '';
    });
    if (outList.length === 1) {
      const outRE = new RegExp(outList[0].name, 'g');
      res = res.replace(outRE, 'gl_FragColor');
    } else if (outList.length > 1) { // EXT_draw_buffers
      for (const out of outList) {
        const outRE = new RegExp(out.name, 'g');
        res = res.replace(outRE, `gl_FragData[${out.location}]`);
      }
      if (!cache.extensions.GL_EXT_draw_buffers) cache.extensions.GL_EXT_draw_buffers = {
        defines: [],
        cond: '__VERSION__ <= 100',
        // we can't reliably deduce the macro dependecies for this extension
        // so not making this a hard require here
        level: 'enable'
      };
    }
  }
  res = res.replace(/layout\s*\(.*?\)\s*/g, () => ''); // layout qualifiers
  return res.replace(pragmasToStrip, ''); // strip pragmas here for a cleaner webgl compiler output
};

const decorateBlockMemoryLayouts = (code, paramInfo) => {
  let idx = 0; const positions = [];
  paramInfo.forEach((info, paramIdx) => {
    if (info.type !== 'blocks') return;
    const frag = code.slice(idx, info.beg);
    const cap = layoutExtract.exec(frag);
    positions[paramIdx] = cap ? idx + cap.index + cap[0].length - cap[2].length - 1 : -1;
    idx = info.end;
  });
  let res = ''; idx = 0;
  paramInfo.forEach((info, paramIdx) => {
    const position = positions[paramIdx];
    if (position === undefined) return;
    // insert declaration
    if (position < 0) { // no qualifier, just insert everything
      res += code.slice(idx, info.beg);
      res += 'layout(std140) ';
    } else { // append the token
      res += code.slice(idx, position);
      res += ', std140';
      res += code.slice(position, info.beg);
    }
    res += code.slice(info.beg, info.end);
    idx = info.end;
  });
  res += code.slice(idx);
  return res;
};

const decorateBindings = (code, manifest, paramInfo) => {
  paramInfo = paramInfo.filter((i) => !builtinRE.test(i.name));
  let idx = 0; const record = []; const overrides = {};
  // extract existing binding infos
  paramInfo.forEach((info) => {
    if (!manifest[info.type]) return;
    const frag = code.slice(idx, info.beg);
    const layoutInfo = { prop: manifest[info.type].find((u) => u.name === info.name) };
    const cap = layoutExtract.exec(frag);
    const category = overrides[info.type] || (overrides[info.type] = {});
    if (cap) {
      // position of ')'
      layoutInfo.position = idx + cap.index + cap[0].length - cap[2].length - 1;
      const cap2 = bindingExtract.exec(cap[1]);
      if (cap2) {
        layoutInfo.position = -1; // indicating no-op
        const value = parseInt(cap2[1]);
        // adapt bindings
        if (manifest[info.type][value]) { // auto-generated binding is guaranteed to be consecutive
          if (category[value] && category[value] !== info.name) error(`EFX2603: duplicated binding/location declaration for '${category[value]}' and '${info.name}'`);
          category[category[value] = info.name] = value;
        } else if (info.type === 'blocks') {
          error(`EFX2600: illegal custom binding for '${info.name}', block bindings should be consecutive and start from 0`);
        } else if (info.type === 'samplerTextures') {
          error(`EFX2601: illegal custom binding for '${info.name}', texture bindings should be consecutive and after all the blocks`);
        } else { // attributes or varyings
          error(`EFX2602: illegal custom location for '${info.name}', locations should be consecutive and start from 0`);
        }
      }
    }
    record.push(layoutInfo);
    idx = info.end;
  });
  // override bindings/locations
  paramInfo.forEach((info, paramIdx) => {
    if (!overrides[info.type]) return;
    const isUniform = info.type === 'blocks' || info.type === 'samplerTextures';
    const dest = isUniform ? 'binding' : 'location';
    const category = overrides[info.type];
    if (info.type === 'attributes') {
      // some rationale behind these oddities:
      // 1. paramInfo member is guaranteed to be in consistent order with manifest members
      // 2. we want the output number to be as consistent as possible with their declaration order.
      //    e.g. InputState utilizes declaration order to calculate buffer offsets, etc.
      if (info.name in category) record[paramIdx].prop[dest] = category[info.name];
      else {
        let n = 0; while (category[n]) n++;
        record[paramIdx].prop[dest] = n;
        category[n] = info.name;
      }
    } else {
      if (info.name in category) {
        const oldLocation = record[paramIdx].prop[dest];
        record[paramIdx].prop[dest] = category[info.name];
        manifest[info.type][oldLocation][dest] = oldLocation;
      }
    }
  });
  // insert declarations
  let res = ''; idx = 0;
  const setIndex = mappings.SetIndex.MATERIAL;
  paramInfo.forEach((info, paramIdx) => {
    if (!record[paramIdx]) return;
    const isUniform = info.type === 'blocks' || info.type === 'samplerTextures';
    const dest = isUniform ? 'binding' : 'location';
    const { position, prop } = record[paramIdx];
    const setDeclaration = isUniform ? `set = ${setIndex}, ` : '';
    // insert declaration
    if (position === undefined) { // no qualifier, just insert everything
      res += code.slice(idx, info.beg);
      res += `layout(${setDeclaration + dest} = ${prop[dest]}) `;
    } else if (position >= 0) { // qualifier exists, but no binding specified
      res += code.slice(idx, position);
      res += `${setDeclaration + dest} = ${prop[dest]}`;
      res += code.slice(position, info.beg);
    } else { // no-op, binding is already specified
      res += code.slice(idx, info.beg);
    }
    res += code.slice(info.beg, info.end);
    idx = info.end;
  });
  res += code.slice(idx);
  return res;
};

const shaderFactory = (() => {
  const trailingSpaces = /\s+$/gm;
  const newlines = /(^\s*\n){2,}/gm;
  const clean = (code) => {
    let result = code.replace(pragmasToStrip, ''); // strip our pragmas
    result = result.replace(newlines, '\n'); // squash multiple newlines
    result = result.replace(trailingSpaces, '');
    return result;
  };
  const objectMap = (obj, fn) => Object.keys(obj).reduce((acc, cur) => (acc[cur] = fn(cur), acc), {});
  const filterFactory = (target, builtins) => (u) => {
    if (!builtinRE.test(u.name)) { return true; }
    const tags = u.tags; let type;
    if (!tags || !tags.builtin) {
      type = 'global';
    } else {
      type = tags.builtin;
    }
    builtins[`${type}s`][target].push({ name: u.name, defines: u.defines });
  };
  const wrapEntry = (() => {
    const wrapperFactory = (vert, fn) => vert ? `\nvoid main() { gl_Position = ${fn}(); }\n` :
      `\nlayout(location = 0) out vec4 cc_FragColor;\nvoid main() { cc_FragColor = ${fn}(); }\n`;
    return (content, entry, isVert) => entry === 'main' ? content : content + wrapperFactory(isVert, entry);
  })();
  const entryRE = /([^:]+)(?::(\w+))?/;
  const preprocess = (name, chunks, deprecations, isVert, defaultEntry = 'main') => {
    const entryCap = entryRE.exec(name);
    const entry = entryCap[2] || defaultEntry;
    const record = new Set();
    const functions = [];
    let code = unwindIncludes(`#include <${entryCap[1]}>`, chunks, deprecations, record);
    code = wrapEntry(code, entry, isVert);
    code = expandLiteralMacro(code);
    code = expandFunctionalMacro(code);
    code = eliminateDeadCode(code, entry, functions); // this has to be the last process, or the `functions` output won't match
    return { code, record, functions };
  };
  const tokenizerOpt = { version: '300 es' };
  const compile = (name, isVert, outDefines = [], outBlocks = [], outSamplerTextures = [], outAttributes = [], outVaryings = [],
      outFragColors = [], chunks = globalChunks, deprecations = globalDeprecations) => {
    const out = {};
    shaderName = name;
    const cache = { lines: [], extensions: {} };
    let { code, record, functions } = preprocess(name, chunks, deprecations, isVert);
    const tokens = shaderTokens = tokenizer(code, tokenizerOpt);
    extractDefines(tokens, outDefines, cache);
    const blockInfo = extractParams(tokens, cache, outBlocks, outSamplerTextures, outAttributes, outVaryings, outFragColors, isVert, functions);
    out.blockInfo = blockInfo; // pass forward
    out.record = record; // header dependencies
    out.extensions = cache.extensions; // extensions requests
    out.glsl4 = code;

    out.glsl3 = stripToSpecificVersion(decorateBlockMemoryLayouts(code, blockInfo), 300, cache.extensions, isVert); // GLES3 needs explicit memory layout qualifier
    out.glsl1 = stripToSpecificVersion(glsl300to100(code, outBlocks, outDefines, blockInfo, functions, cache, isVert), 100, cache.extensions, isVert);
    miscChecks(out.glsl1);
    return out;
  };
  const build = (vertName, fragName, chunks = globalChunks, deprecations = globalDeprecations) => {
    let defines = [], blocks = [], samplerTextures = [], attributes = [], varyings = [], fragColors = [];
    const src = {};
    src.vert = compile(vertName, true, defines, blocks, samplerTextures, attributes, varyings, fragColors, chunks, deprecations);
    src.frag = compile(fragName, false, defines, blocks, samplerTextures, attributes, varyings, fragColors, chunks, deprecations);
    finalTypeCheck(src.vert.glsl1, src.frag.glsl1, defines, vertName, fragName);

    const builtins = { globals: { blocks: [], samplerTextures: [] }, locals: { blocks: [], samplerTextures: [] }, statistics: {} };
    // strip runtime constants & generate statistics
    defines = defines.filter((d) => d.type !== 'constant');
    let vsUniformVectors = 0, fsUniformVectors = 0;
    blocks.forEach((b) => {
      let vectors = b.members.reduce((acc, cur) => {
        if (typeof cur.count !== 'number') return acc;
        return acc + Math.ceil(mappings.GetTypeSize(cur.type) / 16) * cur.count;
      }, 0);
      if (b.stageFlags & VSBit) vsUniformVectors += vectors;
      if (b.stageFlags & FSBit) fsUniformVectors += vectors;
    }, 0);
    builtins.statistics.CC_EFFECT_USED_VERTEX_UNIFORM_VECTORS = vsUniformVectors;
    builtins.statistics.CC_EFFECT_USED_FRAGMENT_UNIFORM_VECTORS = fsUniformVectors;
    // filter out pipeline builtin params
    blocks = blocks.filter(filterFactory('blocks', builtins));
    samplerTextures = samplerTextures.filter(filterFactory('samplerTextures', builtins));
    // attribute property process
    attributes.forEach((a) => {
      a.format = mappings.formatMap[a.typename];
      if (a.defines.indexOf('USE_INSTANCING') >= 0) a.isInstanced = true;
      if (a.tags && a.tags.format) { // custom format
        const f = mappings.getFormat(a.tags.format);
        if (f !== undefined) a.format = f;
        if (mappings.isNormalized(f)) { a.isNormalized = true; }
      }
    });

    // strip the intermediate informations
    blocks.forEach((b) => (delete b.tags, b.members.forEach((v) => (delete v.typename, delete v.precision, delete v.isArray))));
    samplerTextures.forEach((v) => (delete v.tags, delete v.typename, delete v.precision, delete v.isArray));
    attributes.forEach((v) => (delete v.tags, delete v.typename, delete v.precision, delete v.isArray));
    varyings.forEach((v) => (delete v.tags, delete v.typename, delete v.precision, delete v.isArray));
    // assign bindings
    let bindingIdx = 0;
    blocks.forEach((u) => u.binding = bindingIdx++);
    samplerTextures.forEach((u) => u.binding = bindingIdx++);
    let locationIdx = 0;
    attributes.forEach((a) => a.location = locationIdx++);
    locationIdx = 0;
    varyings.forEach((u) => u.location = locationIdx++);
    // generate binding layout for glsl4
    const manifest = { blocks, samplerTextures, attributes, varyings };
    src.vert.glsl4 = stripToSpecificVersion(decorateBindings(src.vert.glsl4, manifest, src.vert.blockInfo), 460, src.vert.extensions, true);
    src.frag.glsl4 = stripToSpecificVersion(decorateBindings(src.frag.glsl4, manifest, src.frag.blockInfo), 460, src.frag.extensions, false);

    const glsl4 = { vert: clean(src.vert.glsl4), frag: clean(src.frag.glsl4) }; // for SPIR-V-based cross-compilation
    const glsl3 = { vert: clean(src.vert.glsl3), frag: clean(src.frag.glsl3) }; // for WebGL2/GLES3
    const glsl1 = { vert: clean(src.vert.glsl1), frag: clean(src.frag.glsl1) }; // for WebGL/GLES2
    const hash = mappings.murmurhash2_32_gc(
        glsl4.vert + glsl4.frag +
        glsl3.vert + glsl3.frag +
        glsl1.vert + glsl1.frag, 666);

    src.frag.record.forEach(src.vert.record.add, src.vert.record);
    const record = src.vert.record;

    return { hash, glsl4, glsl3, glsl1, builtins, defines, blocks, samplerTextures, attributes, varyings, record };
  };
  return { compile, build };
})();

const compileShader = shaderFactory.compile;

// ==================
// effects
// ==================

const parseEffect = (() => {
  const effectRE = /CCEffect\s*%{([^]+?)(?:}%|%})/;
  const programRE = /CCProgram\s*([\w-]+)\s*%{([^]*?)(?:}%|%})/;
  const hashComments = /#.*$/gm;
  const whitespaces = /^\s*$/;
  const noIndent = /\n[^\s]/;
  const leadingSpace = /^[^\S\n]/gm; // \s without \n
  const tabs = /\t/g;
  const stripHashComments = (code) => code.replace(hashComments, '');
  const structuralTypeCheck = (ref, cur, path = 'effect') => {
    if (Array.isArray(ref)) {
      if (!Array.isArray(cur)) { error(`EFX1002: ${path} must be an array`); return; }
      if (ref[0]) for (let i = 0; i < cur.length; i++) structuralTypeCheck(ref[0], cur[i], path + `[${i}]`);
    } else {
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) { error(`EFX1003: ${path} must be an object`); return; }
      for (const key of Object.keys(cur)) if (key.indexOf(':') !== -1)
        error(`EFX1004: syntax error at '${key}', you might need to insert a space after colon`);
      if (ref.any) for (const key of Object.keys(cur)) structuralTypeCheck(ref.any, cur[key], path + `.${key}`);
      else for (const key of Object.keys(ref)) {
        let testKey = key;
        if (testKey[0] === '$') testKey = testKey.substring(1);
        else if (!cur[testKey]) continue;
        structuralTypeCheck(ref[key], cur[testKey], path + `.${testKey}`);
      }
    }
  };
  return (name, content) => {
    shaderName = 'syntax';
    content = stripComments(content).replace(tabs, ' '.repeat(tabAsSpaces));
    // process each block
    let effect = {}, templates = {}, localDeprecations = {};
    let effectCap = effectRE.exec(stripHashComments(content));
    if (!effectCap) error('EFX1000: CCEffect is not defined');
    else {
      try {
        const src = yaml.safeLoad(effectCap[1]);
        // deep clone to decouple references
        effect = JSON.parse(JSON.stringify(src));
      } catch (e) { error(`EFX1001: CCEffect parser failed: ${e}`); }
      if (!effect.name) effect.name = name;
      structuralTypeCheck(mappings.effectStructure, effect);
    }
    let programCap = programRE.exec(content);
    while (programCap) {
      let result = programCap[2];
      if (!whitespaces.test(result)) { // skip this for empty blocks
        while (!noIndent.test(result)) result = result.replace(leadingSpace, '');
      }
      addChunk(programCap[1], result, templates, localDeprecations);
      content = content.substring(programCap.index + programCap[0].length);
      programCap = programRE.exec(content);
    }
    return { effect, templates, localDeprecations };
  };
})();

const mapPassParam = (() => {
  const findUniformType = (name, shader) => {
    let res = 0, cb = (u) => {
      if (u.name !== name) return false;
      res = u.type; return true;
    };
    if (!shader.blocks.some((b) => b.members.some(cb))) shader.samplerTextures.some(cb);
    return res;
  };
  const propTypeCheck = (value, type, givenType) => {
    if (type <= 0) return 'no matching uniform';
    if (value === undefined) return; // default value
    if (givenType === 'string') {
      if (!mappings.isSampler(type)) return 'string for vectors';
    } else if (!Array.isArray(value)) return 'non-array for buffer members';
    else if (value.length !== mappings.GetTypeSize(type) / 4) return 'wrong array length';
  };
  const targetRE = /^(\w+)(?:\.([xyzw]+|[rgba]+))?$/;
  const channelMap = { x: 0, y: 1, z: 2, w: 3, r: 0, g: 1, b: 2, a: 3 };
  const mapTarget = (target, shader) => {
    const handleInfo = [target, 0, 0];
    const cap = targetRE.exec(target);
    if (!cap) { error(`EFX3303: illegal property target '${target}'`); return handleInfo; }
    const swizzle = cap[2] && cap[2].toLowerCase() || '';
    const beginning = channelMap[swizzle[0]] || 0;
    if (swizzle.split('').map((c, idx) => channelMap[c] - beginning - idx).some((n) => n))
      error(`EFX3304: '${target}': random component swizzle is not supported`);
    handleInfo[0] = cap[1];
    handleInfo[1] = beginning;
    handleInfo[2] = findUniformType(cap[1], shader);
    if (swizzle.length) handleInfo[2] -= Math.max(0, mappings.GetTypeSize(handleInfo[2]) / 4 - swizzle.length);
    if (handleInfo[2] <= 0) error(`EFX3305: no matching uniform target '${target}'`);
    return handleInfo;
  };
  const mapProperties = (props, shader) => {
    let metadata = {};
    for (const p of Object.keys(props)) {
      if (p === '__metadata__') {
        metadata = props[p];
        delete props[p];
        continue;
      }
      const info = props[p], shaderType = findUniformType(p, shader);
      // type translation or extraction
      if (info.type !== undefined) warn(`EFX3300: property '${p}': you don\'t have to specify type in here`);
      info.type = shaderType;
      // target specification
      if (info.target) {
        info.handleInfo = mapTarget(info.target, shader); delete info.target; info.type = info.handleInfo[2];
        // polyfill source property
        const deprecated = info.editor && info.editor.visible;
        const target = info.handleInfo[0], targetType = findUniformType(info.handleInfo[0], shader);
        if (!props[target]) props[target] = { type: targetType, editor: { visible: false } };
        if (deprecated === undefined || deprecated) {
          if (!props[target].editor) props[target].editor = { deprecated: true };
          else if (props[target].editor.deprecated === undefined) props[target].editor.deprecated = true;
        }
        if (mappings.isSampler(targetType)) {
          if (info.value) props[target].value = info.value;
        } else {
          if (!props[target].value) props[target].value = Array(mappings.GetTypeSize(targetType) / 4).fill(0);
          if (Array.isArray(info.value)) props[target].value.splice(info.handleInfo[1], info.value.length, ...info.value);
          else if (info.value !== undefined) props[target].value.splice(info.handleInfo[1], 1, info.value);
        }
      }
      // sampler specification
      if (info.sampler) { info.samplerHash = mapSampler(generalMap(info.sampler)); delete info.sampler; }
      // default values
      const givenType = typeof info.value;
      // convert numbers to array
      if (givenType === 'number' || givenType === 'boolean') info.value = [info.value];
      // type check the given value
      const msg = propTypeCheck(info.value, info.type, givenType);
      if (msg) error(`EFX3302: illegal property declaration for '${p}': ${msg}`);
    }
    for (const p of Object.keys(props)) patchMetadata(props[p], metadata);
    return props;
  };
  const patchMetadata = (target, metadata) => {
    for (const k of Object.keys(metadata)) {
      const v = metadata[k];
      if (typeof v === 'object' && typeof target[k] === 'object') patchMetadata(target[k], v);
      else if (target[k] === undefined) target[k] = v;
    }
  };
  const generalMap = (obj) => {
    for (let key in obj) {
      let prop = obj[key];
      if (typeof prop === 'string') { // string literal
        let num = parseInt(prop);
        if (isNaN(num)) num = mappings.passParams[prop.toUpperCase()];
        if (num !== undefined) obj[key] = num;
      } else if (Array.isArray(prop)) { // arrays:
        if (!prop.length) continue; // empty
        switch (typeof prop[0]) {
        case 'object': prop.forEach(generalMap); break; // nested props
        case 'string': generalMap(prop); break; // string array
        case 'number': obj[key] = // color array
          ((prop[0] * 255) << 24 | (prop[1] * 255) << 16 |
            (prop[2] * 255) << 8 | (prop[3] || 255) * 255) >>> 0;
        }
      } else if (typeof prop === 'object') {
        generalMap(prop); // nested props
      }
    } return obj;
  };
  const mapSampler = (obj) => {
    const out = [];
    for (const key of Object.keys(obj)) {
      const value = obj[key], offset = mappings.SamplerInfoIndex[key];
      if (value === undefined || offset === undefined) warn(`EFX3301: illegal sampler info '${key}'`);
      if (key === 'borderColor') {
        out[offset]   = value.r;
        out[offset+1] = value.g;
        out[offset+2] = value.b;
        out[offset+3] = value.a;
      }
      else out[offset] = value;
    }
    return mappings.genSamplerHash(out);
  };
  const priorityRE = /^(\w+)\s*([+-])\s*([\dxabcdef]+)$/i;
  const dfault = mappings.RenderPriority.DEFAULT;
  const min = mappings.RenderPriority.MIN;
  const max = mappings.RenderPriority.MAX;
  const mapPriority = (str) => {
    let res = -1;
    const cap = priorityRE.exec(str);
    res = cap ? mappings.RenderPriority[cap[1].toUpperCase()] + parseInt(cap[3])
      * (cap[2] === '+' ? 1 : -1) : parseInt(str);
    if (isNaN(res) || res < min || res > max) {
      warn(`EFX3000: illegal pass priority: ${str}`); return dfault;
    }
    return res;
  };
  const mapSwitch = (def, shader) => {
    if (shader.defines.find((d) => d.name === def)) error('EFX3200: existing shader macros cannot be used as pass switch');
    return def;
  };
  const mapDSS = (dss) => {
    for (const key of Object.keys(dss)) {
      if (!key.startsWith('stencil')) continue;
      if (!key.endsWith('Front') && !key.endsWith('Back')) {
        dss[key + 'Front'] = dss[key + 'Back'] = dss[key]; delete dss[key];
      }
    }
    if (dss.stencilWriteMaskFront !== dss.stencilWriteMaskBack)
      warn('EFX3100: WebGL(2) doesn\'t support inconsistent front/back stencil write mask');
    if (dss.stencilReadMaskFront !== dss.stencilReadMaskBack)
      warn('EFX3101: WebGL(2) doesn\'t support inconsistent front/back stencil read mask');
    if (dss.stencilRefFront !== dss.stencilRefBack)
      warn('EFX3102: WebGL(2) doesn\'t support inconsistent front/back stencil ref');
    return generalMap(dss);
  };
  return (pass, shader) => {
    shaderName = 'type error';
    const tmp = {};
    // special treatments
    if (pass.priority) { tmp.priority = mapPriority(pass.priority); delete pass.priority; }
    if (pass.depthStencilState) { tmp.depthStencilState = mapDSS(pass.depthStencilState); delete pass.depthStencilState; }
    if (pass.switch) { tmp.switch = mapSwitch(pass.switch, shader); delete pass.switch; }
    if (pass.properties) { tmp.properties = mapProperties(pass.properties, shader); delete pass.properties; }
    if (pass.migrations) { tmp.migrations = pass.migrations; delete pass.migrations; }
    generalMap(pass); Object.assign(pass, tmp);
  };
})();

const reduceHeaderRecord = (shaders) => {
  const deps = new Set();
  for (const shader of shaders) {
    shader.record.forEach(deps.add, deps);
  }
  return [...deps.values()];
};

const buildEffect = (name, content) => {
  effectName = name;
  let { effect, templates, localDeprecations } = parseEffect(name, content);
  if (!effect || !Array.isArray(effect.techniques)) { return null; }
  // map passes
  templates = Object.assign({}, globalChunks, templates);
  let deprecations = {};
  for (const type in globalDeprecations) {
    deprecations[type] = Object.assign({}, globalDeprecations[type], localDeprecations[type]);
  }
  const deprecationStr = Object.keys(deprecations.identifiers).reduce((cur, acc) => `|${acc}` + cur, '').slice(1);
  if (deprecationStr.length) deprecations.identifierRE = new RegExp(`\\b(${deprecationStr})\\b`, 'g');
  const shaders = effect.shaders = [];
  for (const jsonTech of effect.techniques) {
    for (const pass of jsonTech.passes) {
      let vert = pass.vert, frag = pass.frag;
      delete pass.vert; delete pass.frag;
      let name = pass.program = `${effectName}|${vert}|${frag}`;
      let shader = shaders.find((s) => s.name === name);
      if (!shader) {
        shader = shaderFactory.build(vert, frag, templates, deprecations);
        shader.name = name;
        shaders.push(shader);
      }
      mapPassParam(pass, shader);
    }
  }
  effect.dependencies = reduceHeaderRecord(shaders);
  return effect;
};

// ==================
// exports
// ==================

module.exports = {
  options,
  addChunk,
  compileShader,
  buildEffect,
};
