import { IMiniGame } from 'pal/minigame';
import { Orientation } from '../system/enum-type/orientation';
import { cloneObject } from '../utils';

declare let tt: any;

// @ts-expect-error can't init minigame when it's declared
const minigame: IMiniGame = {};
cloneObject(minigame, tt);

const systemInfo = minigame.getSystemInfoSync();
minigame.isSubContext = minigame.getOpenDataContext !== undefined;
minigame.isDevTool = (systemInfo.platform === 'devtools');
minigame.isLandscape = systemInfo.screenWidth > systemInfo.screenHeight;
let orientation = minigame.isLandscape ? Orientation.LANDSCAPE_RIGHT : Orientation.PORTRAIT;

// Accelerometer
tt.onDeviceOrientationChange((res) => {
    if (res.value === 'landscape') {
        orientation = Orientation.LANDSCAPE_RIGHT;
    } else if (res.value === 'landscapeReverse') {
        orientation = Orientation.LANDSCAPE_LEFT;
    }
});

minigame.onAccelerometerChange = function (cb) {
    tt.onAccelerometerChange((res) => {
        let x = res.x;
        let y = res.y;
        if (minigame.isLandscape) {
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
    tt.stopAccelerometer();
};

// safeArea
// origin point on the top-left corner
minigame.getSafeArea = function () {
    let { top, left, bottom, right, width, height } = systemInfo.safeArea;
    // HACK: on iOS device, the orientation should mannually rotate
    if (systemInfo.platform === 'ios' && !minigame.isDevTool && minigame.isLandscape) {
        const tempData = [right, top, left, bottom, width, height];
        top = tempData[2];
        left = tempData[1];
        bottom = tempData[3];
        right = tempData[0];
        height = tempData[5];
        width = tempData[4];
    }
    return { top, left, bottom, right, width, height };
};

export { minigame };