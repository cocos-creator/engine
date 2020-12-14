/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

// @ts-check

const { join, extname, basename, dirname, isAbsolute } = require('path');
const fs = require('fs-extra');
const { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync, ensureDirSync, readdir } = require('fs-extra');
const ts = require('typescript');
const gift = require('tfig');

const tsConfigDir = join(__dirname, '..', '..');
const tsConfigPath = join(tsConfigDir, 'tsconfig.json');

async function getDomainExports(engine, exportsRoot, prefix, excludes) {
    const result = {};
    const entryRootDir = join(engine, exportsRoot);
    const entryFileNames = await readdir(entryRootDir);
    for (const entryFileName of entryFileNames) {
        const entryExtName = extname(entryFileName);
        if (!entryExtName.toLowerCase().endsWith('.ts')) {
            continue;
        }
        const entryBaseNameNoExt = basename(entryFileName, entryExtName);
        if (excludes && excludes.includes(entryBaseNameNoExt)) {
            continue;
        }
        const entryName = `${prefix}${entryBaseNameNoExt}`;
        result[entryName] = `${exportsRoot.split(/[\\\/]/g).join('/')}/${entryBaseNameNoExt}`;
    }
    return result;
}

async function getEngineEntries (engine) {
    return await getDomainExports(engine, 'exports', 'cc/', ['wait-for-ammo-instantiation']);
}

async function getEditorExportEntries(engine) {
    return await getDomainExports(engine, join('editor', 'exports'), 'cc/editor/exports/');
}

async function generate (options) {
    console.log(`Typescript version: ${ts.version}`);

    const {
        outDir,
        withIndex,
        withExports,
        withEditorExports,
    } = options;
    ensureDirSync(outDir);

    console.debug(`With index: ${withIndex}`);
    console.debug(`With exports: ${withExports}`);
    console.debug(`With editor exports: ${withEditorExports}`);

    const unbundledOutFile = join(outDir, `cc-before-rollup.js`);
    const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
        tsConfigPath, {
            declaration: true,
            noEmit: false,
            emitDeclarationOnly: true,
            outFile: unbundledOutFile,
            outDir: undefined,
        }, {
            onUnRecoverableConfigFileDiagnostic: () => {},
            useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
            readDirectory: ts.sys.readDirectory,
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
        }
    );

    const outputJSPath = join(tsConfigDir, unbundledOutFile);
    // console.log(outputJSPath);

    const extName = extname(outputJSPath);
    if (extName !== '.js') {
        console.error(`Unexpected output extension ${extName}, please check it.`);
        return undefined;
    }
    const dirName = dirname(outputJSPath);
    const baseName = basename(outputJSPath, extName);
    const destExtensions = [
        '.d.ts',
        '.d.ts.map',
    ];
    for (const destExtension of destExtensions) {
        const destFile = join(dirName, baseName + destExtension);
        if (existsSync(destFile)) {
            console.log(`Delete old ${destFile}.`);
            unlinkSync(destFile);
        }
    }

    console.log(`Generating...`);

    const engineRoot = join(__dirname, '..', '..');
    const entryMap = await getEngineEntries(engineRoot);

    const editorExportEntries = await getEditorExportEntries(engineRoot);

    let fileNames = parsedCommandLine.fileNames;
    if (withEditorExports) {
        fileNames = fileNames.concat(Object.values(editorExportEntries).map((e) => join(engineRoot, e)));
    }

    const program = ts.createProgram(fileNames, parsedCommandLine.options);
    const emitResult = program.emit(
        undefined, // targetSourceFile
        undefined, // writeFile
        undefined, // cancellationToken,
        true, // emitOnlyDtsFiles
        undefined, // customTransformers
    );
    
    let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    for (const diagnostic of allDiagnostics) {
        let printer;
        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Error:
                printer = console.error;
                break;
            case ts.DiagnosticCategory.Warning:
                printer = console.warn;
                break;
            case ts.DiagnosticCategory.Message:
            case ts.DiagnosticCategory.Suggestion:
            default:
                printer = console.log;
                break;
        }
        if (!printer) {
            continue;
        }
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText);
            printer(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            printer(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
        }
    }

    const tscOutputDtsFile = join(dirName, baseName + '.d.ts');
    if (!existsSync(tscOutputDtsFile)) {
        console.error(`Failed to compile.`);
        return false;
    }

    const types = parsedCommandLine.options.types.map((typeFile) => `${typeFile}.d.ts`);
    types.forEach((file) => {
        const destPath = join(outDir, isAbsolute(file) ? basename(file) : file);
        ensureDirSync(dirname(destPath));
        copyFileSync(file, destPath);
    });

    const giftInputs = [ tscOutputDtsFile ];

    /** @type {Record<string, string>} */
    const giftEntries = { };

    const cleanupFiles = [ tscOutputDtsFile ];

    if (withExports) {
        Object.assign(giftEntries, entryMap);
    }

    if (withEditorExports) {
        Object.assign(giftEntries, editorExportEntries);
    }

    if (withIndex && !withExports) {
        giftEntries['cc'] = 'cc';
        const ccDtsFile = join(dirName, 'virtual-cc.d.ts');
        giftInputs.push(ccDtsFile);
        cleanupFiles.push(ccDtsFile);
        const code = generateModuleSourceCc(Object.values(entryMap));
        await fs.writeFile(ccDtsFile, code, { encoding: 'utf8' });
    }

    console.log(`Bundling...`);
    try {
        const indexOutputPath = join(dirName,'cc.d.ts');
        const giftResult = gift.bundle({
            input: giftInputs,
            name: 'cc',
            rootModule: 'index',
            entries: giftEntries,
            groups: [
                { test: /^cc\/editor.*$/, path: join(dirName,'cc.editor.d.ts') },
                { test: /^cc\/.*$/, path: join(dirName,'index.d.ts') },
                { test: /^cc.*$/, path: indexOutputPath },
            ],
        });

        await Promise.all(giftResult.groups.map(async (group) => {
            await fs.outputFile(group.path, group.code, { encoding: 'utf8' });
        }));

        if (withIndex && withExports) {
            await fs.outputFile(
                indexOutputPath,
                generateModuleSourceCc(Object.keys(entryMap)),
                { encoding: 'utf8' });
        }

    } catch (error) {
        console.error(error)
        return false;
    } finally {
        await Promise.all((cleanupFiles.map(async (file) => fs.unlink(file))));
    }

    return true;
}

function generateModuleSourceCc(requests) {
    return `declare module "cc" {\n${requests.map((moduleId) => `    export * from "${moduleId}";`).join('\n')}\n}`
}

module.exports = { generate };
