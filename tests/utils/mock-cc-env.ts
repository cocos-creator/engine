
const ccEnv = require('internal:constants');

export function mockEnv (name: string, value: any) {
    const original = ccEnv[name];
    ccEnv[name] = value;
    return {
        restore() {
            ccEnv[name] = original;
        },
    };
}

