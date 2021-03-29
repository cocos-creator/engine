import { IMiniGame } from 'pal/minigame';
import { Orientation } from '../orientation';
import { cloneObject } from '../utils';

declare let swan: any;

// @ts-expect-error can't init mg when it's declared
const mg: IMiniGame = {};
cloneObject(mg, swan);

// SystemInfo
if (mg.getSystemInfoSync) {
    const systemInfo = mg.getSystemInfoSync();
    mg.isDevTool = systemInfo.platform === 'devtools';
    mg.isLandscape = systemInfo.screenWidth > systemInfo.screenHeight;
} else {
    // can't define window in devtool
    const descriptor = Object.getOwnPropertyDescriptor(global, 'window');
    mg.isDevTool = !(!descriptor || descriptor.configurable === true);
    mg.isLandscape = false;
}
mg.isSubContext = (mg.getOpenDataContext === undefined);
let orientation = mg.isLandscape ? Orientation.LANDSCAPE_RIGHT : Orientation.PORTRAIT;

// Accelerometer
swan.onDeviceOrientationChange((res) => {
    if (res.value === 'landscape') {
        orientation = Orientation.LANDSCAPE_RIGHT;
    } else if (res.value === 'landscapeReverse') {
        orientation = Orientation.LANDSCAPE_LEFT;
    }
});

mg.onAccelerometerChange = function (cb) {
    swan.onAccelerometerChange((res) => {
        let x = res.x;
        let y = res.y;
        if (mg.isLandscape) {
            const orientationFactor = orientation === Orientation.LANDSCAPE_RIGHT ? 1 : -1;
            const tmp = x;
            x = -y * orientationFactor;
            y = tmp * orientationFactor;
        }

        const resClone = {
            x,
            y,
            z: res.z,
        };
        cb(resClone);
    });
    // onAccelerometerChange would start accelerometer, need to mannually stop it
    swan.stopAccelerometer();
};

mg.getSafeArea = function () {
    console.warn('getSafeArea is not supported on this platform');
    if (mg.getSystemInfoSync) {
        const systemInfo =  mg.getSystemInfoSync();
        return {
            top: 0,
            left: 0,
            bottom: systemInfo.screenHeight,
            right: systemInfo.screenWidth,
            width: systemInfo.screenWidth,
            height: systemInfo.screenHeight,
        };
    }
    return {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
    };
};

export { mg };
