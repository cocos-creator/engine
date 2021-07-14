const ps = require('path');
const fs = require('fs');
const download = require('download');
const { exec } = require('child_process');
const del = require('del');

function join (...paths) {
    const result = ps.join(...paths);
    return result.replace(/\\/g, '/');
}
let ralPath = join(__dirname, 'runtime-web-adapter-for-creator-3');

/**
 * @param {string} downloadUrl 
 * @returns {Promise<void>}
 */
async function downloadAndExtractRepo (downloadUrl) {
    console.log(`Downloading from url '${downloadUrl}'\n`);
    await download(downloadUrl, __dirname, {
        extract: true,
    });
}

/**
 * @param {string} cmd 
 * @returns {Promise<void>}
 */
function runCommand (cmd) {
    return new Promise((resolve, reject) => {
        console.log(`Running command: '${cmd}' in '${ralPath}'\n`);
        const ls = exec(cmd, {
            cwd: ralPath,
        });
        ls.stderr.on('data', err => {
            console.error(err)
        });
        ls.stdout.on('close', resolve);
    })
}

function copyRal () {
    const distDir = join(__dirname, '../platforms/runtime');
    console.log(`Copy files from '${ralPath}' to '${distDir}'\n`);

    // copy web-adapter
    ['web-adapter.js', 'web-adapter.min.js'].forEach(fileName => {
        const src = join(ralPath, 'dist/common', fileName);
        const dst = join(distDir, 'common', fileName);
        fs.copyFileSync(src, dst);
    });
    // copy ral
    ['cocos-play', 'huawei-quick-game', 'link-sure', 'oppo-mini-game', 'qtt', 'vivo-mini-game'].forEach(platformName => {
        ['ral.js', 'ral.min.js'].forEach(fileName => {
            const src = join(ralPath, 'dist/platforms', platformName, fileName);
            const dst = join(distDir, 'platforms', platformName, fileName);
            fs.copyFileSync(src, dst);
        });
    });
}

async function cleanOldAdapter () {
    console.log('Cleaning old runtime adapter...\n');
    const distDir = join(__dirname, '../platforms/runtime');
    const delPatterns = [];
    // del web adapter
    ['web-adapter.js', 'web-adapter.min.js'].forEach(fileName => {
        const dst = join(distDir, 'common', fileName);
        delPatterns.push(dst);
    });
    // del ral
    ['cocos-play', 'huawei-quick-game', 'link-sure', 'oppo-mini-game', 'qtt', 'vivo-mini-game'].forEach(platformName => {
        ['ral.js', 'ral.min.js'].forEach(fileName => {
            const dst = join(distDir, 'platforms', platformName, fileName);
            delPatterns.push(dst);
        });
    });
    await del(delPatterns, { force: true });
}

/**
 * @param {string} dirPath 
 * @returns {Promise<void>}
 */
async function removeDir (dirPath) {
    console.log(`Remove ral directory: '${dirPath}'\n`);
    await del(dirPath, { force: true });
}

(async () => {
    try {
        await cleanOldAdapter();
        await removeDir(ralPath);
        await downloadAndExtractRepo('https://codeload.github.com/yangws/runtime-web-adapter/zip/refs/heads/for-creator-3');
        await runCommand('npm install');
        await runCommand('gulp');
        copyRal();
        await removeDir(ralPath);
        process.exit(0);
    } catch (err) {
        console.error('Fetch ral failed', err);
        process.exit(1);
    }
})();
