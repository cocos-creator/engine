import * as fs from 'fs-extra';
import * as ps from 'path';
import yargs from 'yargs';
import { build, enumeratePhysicsReps, enumerateBuildModeReps, enumeratePlatformReps, IBuildOptions, IFlags, parsePhysics, parseBuildMode, enumerateModuleOptionReps, parseModuleOption, parsePlatform } from './build-engine';

yargs.help();
yargs.option('buildmode', {
    type: 'string',
    alias: 'b',
    description: 'Target buildmode.',
    demandOption: true,
    choices: enumerateBuildModeReps(),
});
yargs.option('platform', {
    type: 'string',
    alias: 'p',
    description: 'Target platform.',
    demandOption: true,
    choices: enumeratePlatformReps(),
});
yargs.option('flags', {
    type: 'array',
    alias: 'f',
    description: 'Engine flags.',
});
yargs.option('destination', {
    type: 'string',
    alias: 'd',
    demandOption: true,
    description: 'Output path.',
});
yargs.option('excludes', {
    type: 'array',
    alias: 'e',
    description: '(Expired!)',
});
yargs.options('sourcemap', {
    choices: [
        'inline',
        true,
    ],
    description: 'Source map generation options',
});
yargs.option('compress', {
    type: 'boolean',
    description: 'Whether to compress compiled engine.',
});
yargs.option('watch-files', {
    type: 'string',
    description: '(INTERNAL/EXPERIMENTAL) Write built file list as a record with file path as key and mtime as value, into specified file, in JSON format.',
});

const flags: IFlags = {};
const argvFlags = yargs.argv.flags as (string[] | undefined);
if (argvFlags) {
    argvFlags.forEach((argvFlag) => flags[argvFlag as keyof IFlags] = true);
}

const sourceMap = yargs.argv.sourcemap === 'inline' ? 'inline' : !!yargs.argv.sourcemap;

const moduleEntries = yargs.argv._;
if (moduleEntries.length === 0) {
    console.log(`No module entry specified, default module entries will be used.`);
    moduleEntries.push(...getDefaultModuleEntries());
}

const watchFiles = yargs.argv['watch-files'] as string | undefined;

const options: IBuildOptions = {
    moduleEntries,
    compress: yargs.argv.compress as (boolean | undefined),
    outputPath: yargs.argv.destination as string,
    excludes: yargs.argv.excludes as string[],
    sourcemap: sourceMap,
    flags,
    watchFiles: !!watchFiles,
};
if (yargs.argv['module']) {
    options.moduleFormat = parseModuleOption(yargs.argv['module'] as unknown as string);
}
if (yargs.argv.buildmode) {
    options.mode = parseBuildMode(yargs.argv.buildmode as unknown as string);
}
if (yargs.argv.platform) {
    options.platform = parsePlatform(yargs.argv.platform as unknown as string);
}

(async () => {
    const result = await build(options);
    console.log(`Build successful.`);
    await fs.ensureDir(ps.dirname(options.outputPath));
    await fs.writeFile(options.outputPath, result.code);
    if (result.map) {
        await fs.writeFile(`${options.outputPath}.map`, result.map);
    }
    if (watchFiles) {
        await fs.ensureDir(ps.dirname(watchFiles));
        await fs.writeFile(watchFiles, JSON.stringify(result.watchFiles, undefined, 2));
    }
})();

function getDefaultModuleEntries () {
    type ModuleDivision = any; // import('../../scripts/module-division/tools/division-config').ModuleDivision;
    type GroupItem = any; // import('../../scripts/module-division/tools/division-config').GroupItem;
    type Item = any; // import('../../scripts/module-division/tools/division-config').Item;

    const isGroupItem = (item: Item): item is GroupItem => {
        return 'options' in item;
    };

    const divisionConfig: ModuleDivision = require('../../scripts/module-division/division-config.json');
    const result: string[] = [];
    const addEntry = (entry: string | string[]) => {
        if (Array.isArray(entry)) {
            result.push(...entry);
        } else {
            result.push(entry);
        }
    };
    for (const groupOrItem of divisionConfig.groupOrItems) {
        const items = 'items' in groupOrItem ? groupOrItem.items : [groupOrItem];
        for (const item of items) {
            if (item.required || item.default) {
                if (isGroupItem(item)) {
                    addEntry(item.options[item.defaultOption || 0].entry);
                } else {
                    // @ts-ignore
                    addEntry(item.entry);
                }
            }
        }
    }
    return result;
}
