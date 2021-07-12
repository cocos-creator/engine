/****************************************************************************
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

const macro = require('./CCMacro');
const sys = require('./CCSys');
const eventManager = require('../event-manager');

const TOUCH_TIMEOUT = macro.TOUCH_TIMEOUT;

let _vec2 = cc.v2();

/**
 *  This class manages all events of input. include: touch, mouse, accelerometer, keyboard
 */
let inputManager = {
    _mousePressed: false,

    _isRegisterEvent: false,

    _preTouchPoint: cc.v2(0,0),
    _prevMousePoint: cc.v2(0,0),

    _preTouchPool: [],
    _preTouchPoolPointer: 0,

    _touches: [],
    _touchesIntegerDict:{},

    _touchesCache: {},
    _touchCount: 0,

    _indexBitsUsed: 0,
    _maxTouches: 8,

    _accelEnabled: false,
    _accelInterval: 1/5,
    _accelMinus: 1,
    _accelCurTime: 0,
    _acceleration: null,
    _accelDeviceEvent: null,

    _canvasBoundingRect: {
        left: 0,
        top: 0,
        adjustedLeft: 0,
        adjustedTop: 0,
        width: 0,
        height: 0,
    },

    _getUnUsedIndex () {
        let temp = this._indexBitsUsed;
        let now = cc.sys.now();

        for (let i = 0; i < this._maxTouches; i++) {
            if (!(temp & 0x00000001)) {
                this._indexBitsUsed |= (1 << i);
                return i;
            }
            else {
                let touch = this._touches[i];
                if (now - touch._lastModified > TOUCH_TIMEOUT) {
                    this._removeUsedIndexBit(i);
                    delete this._touchesIntegerDict[touch.getID()];
                    return i;
                }
            }
            temp >>= 1;
        }

        // all bits are used
        return -1;
    },

    _removeUsedIndexBit (index) {
        if (index < 0 || index >= this._maxTouches)
            return;

        let temp = 1 << index;
        temp = ~temp;
        this._indexBitsUsed &= temp;
    },

    _glView: null,

    _updateCanvasBoundingRect () {
        let element = cc.game.canvas;
        let canvasBoundingRect = this._canvasBoundingRect;

        let docElem = document.documentElement;
        let leftOffset = window.pageXOffset - docElem.clientLeft;
        let topOffset = window.pageYOffset - docElem.clientTop;
        if (element.getBoundingClientRect) {
            let box = element.getBoundingClientRect();
            canvasBoundingRect.left = box.left + leftOffset;
            canvasBoundingRect.top = box.top + topOffset;
            canvasBoundingRect.width = box.width;
            canvasBoundingRect.height = box.height;
        }
        else if (element instanceof HTMLCanvasElement) {
            canvasBoundingRect.left = leftOffset;
            canvasBoundingRect.top = topOffset;
            canvasBoundingRect.width = element.width;
            canvasBoundingRect.height = element.height;
        }
        else {
            canvasBoundingRect.left = leftOffset;
            canvasBoundingRect.top = topOffset;
            canvasBoundingRect.width = parseInt(element.style.width);
            canvasBoundingRect.height = parseInt(element.style.height);
        }
    },

    /**
     * @method handleTouchesBegin
     * @param {Array} touches
     */
    handleTouchesBegin (touches) {
        let selTouch, index, curTouch, touchID,
            handleTouches = [], locTouchIntDict = this._touchesIntegerDict,
            now = sys.now();
        let _touchesCache = this._touchesCache;

        for (let i = 0, len = touches.length; i < len; i ++) {
            selTouch = touches[i];
            touchID = selTouch.getID();

            let ccTouch = _touchesCache[touchID];
            if (!ccTouch) {
                ccTouch = new cc.Touch(selTouch._point.x, selTouch._point.y, touchID);
                ccTouch._setPrevPoint(selTouch._prevPoint);
                ccTouch._lastModified = now;

                _touchesCache[touchID] = ccTouch;
                this._touchCount++;
            }

            index = locTouchIntDict[touchID];
            if (index == null) {
                let unusedIndex = this._getUnUsedIndex();
                if (unusedIndex === -1) {
                    cc.logID(2300, unusedIndex);
                    continue;
                }
                //curTouch = this._touches[unusedIndex] = selTouch;
                curTouch = this._touches[unusedIndex] = ccTouch;
                locTouchIntDict[touchID] = unusedIndex;
                handleTouches.push(curTouch);
            }
        }
        if (handleTouches.length > 0) {
            this._glView._convertTouchesWithScale(handleTouches);
            let touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.BEGAN;
            eventManager.dispatchEvent(touchEvent);
        }
    },

    /**
     * @method handleTouchesMove
     * @param {Array} touches
     */
    handleTouchesMove (touches) {
        let selTouch, index, touchID,
            handleTouches = [], locTouches = this._touches,
            now = sys.now();
        let _touchesCache = this._touchesCache;

        for (let i = 0, len = touches.length; i < len; i++) {
            selTouch = touches[i];
            touchID = selTouch.getID();

            let ccTouch = _touchesCache[touchID];
            if (ccTouch) {
                ccTouch._setPoint(selTouch._point);
                ccTouch._setPrevPoint(selTouch._prevPoint);
                ccTouch._lastModified = now;
            }

            index = this._touchesIntegerDict[touchID];
            if (index == null) {
                //cc.log("if the index doesn't exist, it is an error");
                continue;
            }
            if (locTouches[index]) {
                handleTouches.push(locTouches[index]);
            }
        }
        if (handleTouches.length > 0) {
            this._glView._convertTouchesWithScale(handleTouches);
            let touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.MOVED;
            eventManager.dispatchEvent(touchEvent);
        }
    },

    /**
     * @method handleTouchesEnd
     * @param {Array} touches
     */
    handleTouchesEnd (touches) {
        let handleTouches = this.getSetOfTouchesEndOrCancel(touches);
        if (handleTouches.length > 0) {
            this._glView._convertTouchesWithScale(handleTouches);
            let touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.ENDED;
            eventManager.dispatchEvent(touchEvent);
        }
        this._preTouchPool.length = 0;
    },

    /**
     * @method handleTouchesCancel
     * @param {Array} touches
     */
    handleTouchesCancel (touches) {
        let handleTouches = this.getSetOfTouchesEndOrCancel(touches);
        if (handleTouches.length > 0) {
            this._glView._convertTouchesWithScale(handleTouches);
            let touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.CANCELED;
            eventManager.dispatchEvent(touchEvent);
        }
        this._preTouchPool.length = 0;
    },

    /**
     * @method getSetOfTouchesEndOrCancel
     * @param {Array} touches
     * @returns {Array}
     */
    getSetOfTouchesEndOrCancel (touches) {
        let _touchesCache = this._touchesCache;

        let selTouch, index, touchID, handleTouches = [], locTouches = this._touches, locTouchesIntDict = this._touchesIntegerDict;
        for (let i = 0, len = touches.length; i< len; i ++) {
            selTouch = touches[i];
            touchID = selTouch.getID();
            index = locTouchesIntDict[touchID];

            let ccTouch = _touchesCache[touchID];
            if (ccTouch) {
                delete _touchesCache[touchID];
                this._touchCount--;
            }

            if (index == null) {
                continue;  //cc.log("if the index doesn't exist, it is an error");
            }
            if (locTouches[index]) {
                locTouches[index]._setPoint(selTouch._point);
                locTouches[index]._setPrevPoint(selTouch._prevPoint);
                handleTouches.push(locTouches[index]);
                this._removeUsedIndexBit(index);
                delete locTouchesIntDict[touchID];
            }
        }
        return handleTouches;
    },

    /**
     * @method getPreTouch
     * @param {Touch} touch
     * @return {Touch}
     */
    getPreTouch (touch) {
        let preTouch = null;
        let locPreTouchPool = this._preTouchPool;
        let id = touch.getID();
        for (let i = locPreTouchPool.length - 1; i >= 0; i--) {
            if (locPreTouchPool[i].getID() === id) {
                preTouch = locPreTouchPool[i];
                break;
            }
        }
        if (!preTouch)
            preTouch = touch;
        return preTouch;
    },

    /**
     * @method setPreTouch
     * @param {Touch} touch
     */
    setPreTouch (touch) {
        let find = false;
        let locPreTouchPool = this._preTouchPool;
        let id = touch.getID();
        for (let i = locPreTouchPool.length - 1; i >= 0; i--) {
            if (locPreTouchPool[i].getID() === id) {
                locPreTouchPool[i] = touch;
                find = true;
                break;
            }
        }
        if (!find) {
            if (locPreTouchPool.length <= 50) {
                locPreTouchPool.push(touch);
            } else {
                locPreTouchPool[this._preTouchPoolPointer] = touch;
                this._preTouchPoolPointer = (this._preTouchPoolPointer + 1) % 50;
            }
        }
    },

    /**
     * @method getTouchByXY
     * @param {Number} tx
     * @param {Number} ty
     * @param {Vec2} pos
     * @return {Touch}
     */
    getTouchByXY (tx, ty, pos) {
        let locPreTouch = this._preTouchPoint;
        let location = this._glView.convertToLocationInView(tx, ty, pos);
        let touch = new cc.Touch(location.x, location.y, 0);
        touch._setPrevPoint(locPreTouch.x, locPreTouch.y);
        locPreTouch.x = location.x;
        locPreTouch.y = location.y;
        return touch;
    },

    /**
     * @method getMouseEvent
     * @param {Vec2} location
     * @param {Vec2} pos
     * @param {Number} eventType
     * @returns {Event.EventMouse}
     */
    getMouseEvent (location, pos, eventType) {
        let locPreMouse = this._prevMousePoint;
        let mouseEvent = new cc.Event.EventMouse(eventType);
        mouseEvent._setPrevCursor(locPreMouse.x, locPreMouse.y);
        locPreMouse.x = location.x;
        locPreMouse.y = location.y;
        this._glView._convertMouseToLocationInView(locPreMouse, pos);
        mouseEvent.setLocation(locPreMouse.x, locPreMouse.y);
        return mouseEvent;
    },

    /**
     * @method getPointByEvent
     * @param {Touch} event
     * @param {Vec2} pos
     * @return {Vec2}
     */
    getPointByEvent (event, pos) {
        // qq , uc and safari browser can't calculate pageY correctly, need to refresh canvas bounding rect
        if (cc.sys.browserType === cc.sys.BROWSER_TYPE_QQ
            || cc.sys.browserType === cc.sys.BROWSER_TYPE_UC
            || cc.sys.browserType === cc.sys.BROWSER_TYPE_SAFARI) {
            this._updateCanvasBoundingRect();
        }

        if (event.pageX != null)  //not avalable in <= IE8
            return {x: event.pageX, y: event.pageY};

        pos.left -= document.body.scrollLeft;
        pos.top -= document.body.scrollTop;

        return {x: event.clientX, y: event.clientY};
    },

    /**
     * @method getTouchesByEvent
     * @param {Touch} event
     * @param {Vec2} pos
     * @returns {Array}
     */
    getTouchesByEvent (event, pos) {
        let touchArr = [], locView = this._glView;
        let touch_event, touch, preLocation;
        let locPreTouch = this._preTouchPoint;

        let length = event.changedTouches.length;
        for (let i = 0; i < length; i++) {
            touch_event = event.changedTouches[i];
            if (touch_event) {
                let location;
                if (sys.BROWSER_TYPE_FIREFOX === sys.browserType)
                    location = locView.convertToLocationInView(touch_event.pageX, touch_event.pageY, pos, _vec2);
                else
                    location = locView.convertToLocationInView(touch_event.clientX, touch_event.clientY, pos, _vec2);
                if (touch_event.identifier != null) {
                    touch = new cc.Touch(location.x, location.y, touch_event.identifier);
                    //use Touch Pool
                    preLocation = this.getPreTouch(touch).getLocation();
                    touch._setPrevPoint(preLocation.x, preLocation.y);
                    this.setPreTouch(touch);
                } else {
                    touch = new cc.Touch(location.x, location.y);
                    touch._setPrevPoint(locPreTouch.x, locPreTouch.y);
                }
                locPreTouch.x = location.x;
                locPreTouch.y = location.y;
                touchArr.push(touch);
            }
        }
        return touchArr;
    },

    /**
     * @method registerSystemEvent
     * @param {HTMLElement} element
     */
    registerSystemEvent (element) {
        if(this._isRegisterEvent) return;

        this._glView = cc.view;
        let selfPointer = this;
        let canvasBoundingRect = this._canvasBoundingRect;

        window.addEventListener('resize', this._updateCanvasBoundingRect.bind(this));

        let prohibition = sys.isMobile;
        let supportMouse = ('mouse' in sys.capabilities);
        let supportTouches = ('touches' in sys.capabilities);

        if (supportMouse) {
            //HACK
            //  - At the same time to trigger the ontouch event and onmouse event
            //  - The function will execute 2 times
            //The known browser:
            //  liebiao
            //  miui
            //  WECHAT
            if (!prohibition) {
                window.addEventListener('mousedown', function () {
                    selfPointer._mousePressed = true;
                }, false);

                window.addEventListener('mouseup', function (event) {
                    if (!selfPointer._mousePressed)
                        return;

                    selfPointer._mousePressed = false;

                    let location = selfPointer.getPointByEvent(event, canvasBoundingRect);
                    if (!cc.rect(canvasBoundingRect.left, canvasBoundingRect.top, canvasBoundingRect.width, canvasBoundingRect.height).contains(location)){
                        selfPointer.handleTouchesEnd([selfPointer.getTouchByXY(location.x, location.y, canvasBoundingRect)]);

                        let mouseEvent = selfPointer.getMouseEvent(location, canvasBoundingRect, cc.Event.EventMouse.UP);
                        mouseEvent.setButton(event.button);
                        eventManager.dispatchEvent(mouseEvent);
                    }
                }, false);
            }

            // register canvas mouse event
            let EventMouse = cc.Event.EventMouse;
            let _mouseEventsOnElement = [
                !prohibition && ["mousedown", EventMouse.DOWN, function (event, mouseEvent, location, canvasBoundingRect) {
                    selfPointer._mousePressed = true;
                    selfPointer.handleTouchesBegin([selfPointer.getTouchByXY(location.x, location.y, canvasBoundingRect)]);
                    element.focus();
                }],
                !prohibition && ["mouseup", EventMouse.UP, function (event, mouseEvent, location, canvasBoundingRect) {
                    selfPointer._mousePressed = false;
                    selfPointer.handleTouchesEnd([selfPointer.getTouchByXY(location.x, location.y, canvasBoundingRect)]);
                }],
                !prohibition && ["mousemove", EventMouse.MOVE, function (event, mouseEvent, location, canvasBoundingRect) {
                    selfPointer.handleTouchesMove([selfPointer.getTouchByXY(location.x, location.y, canvasBoundingRect)]);
                    if (!selfPointer._mousePressed) {
                        mouseEvent.setButton(null);
                    }
                }],
                ["mousewheel", EventMouse.SCROLL, function (event, mouseEvent) {
                    mouseEvent.setScrollData(0, event.wheelDelta);
                }],
                /* firefox fix */
                ["DOMMouseScroll", EventMouse.SCROLL, function (event, mouseEvent) {
                    mouseEvent.setScrollData(0, event.detail * -120);
                }]
            ];
            for (let i = 0; i < _mouseEventsOnElement.length; ++i) {
                let entry = _mouseEventsOnElement[i];
                if (entry) {
                    let name = entry[0];
                    let type = entry[1];
                    let handler = entry[2];
                    element.addEventListener(name, function (event) {
                        let location = selfPointer.getPointByEvent(event, canvasBoundingRect);
                        let mouseEvent = selfPointer.getMouseEvent(location, canvasBoundingRect, type);
                        mouseEvent.setButton(event.button);

                        handler(event, mouseEvent, location, canvasBoundingRect);

                        eventManager.dispatchEvent(mouseEvent);
                        event.stopPropagation();
                        event.preventDefault();
                    }, false);
                }
            }
        }

        if (window.navigator.msPointerEnabled) {
            let _pointerEventsMap = {
                "MSPointerDown"     : selfPointer.handleTouchesBegin,
                "MSPointerMove"     : selfPointer.handleTouchesMove,
                "MSPointerUp"       : selfPointer.handleTouchesEnd,
                "MSPointerCancel"   : selfPointer.handleTouchesCancel
            };
            for (let eventName in _pointerEventsMap) {
                let touchEvent = _pointerEventsMap[eventName];
                element.addEventListener(eventName, function (event){
                    let documentElement = document.documentElement;
                    canvasBoundingRect.adjustedLeft = canvasBoundingRect.left - documentElement.scrollLeft;
                    canvasBoundingRect.adjustedTop = canvasBoundingRect.top - documentElement.scrollTop;

                    touchEvent.call(selfPointer, [selfPointer.getTouchByXY(event.clientX, event.clientY, canvasBoundingRect)]);
                    event.stopPropagation();
                }, false);
            }
        }

        //register touch event
        if (supportTouches) {
            let _touchEventsMap = {
                "touchstart": function (touchesToHandle) {
                    selfPointer.handleTouchesBegin(touchesToHandle);
                    element.focus();
                },
                "touchmove": function (touchesToHandle) {
                    selfPointer.handleTouchesMove(touchesToHandle);
                },
                "touchend": function (touchesToHandle) {
                    selfPointer.handleTouchesEnd(touchesToHandle);
                },
                "touchcancel": function (touchesToHandle) {
                    selfPointer.handleTouchesCancel(touchesToHandle);
                }
            };

            let registerTouchEvent = function (eventName) {
                let handler = _touchEventsMap[eventName];
                element.addEventListener(eventName, (function(event) {
                    if (!event.changedTouches) return;
                    let body = document.body;

                    canvasBoundingRect.adjustedLeft = canvasBoundingRect.left - (body.scrollLeft || window.scrollX || 0);
                    canvasBoundingRect.adjustedTop = canvasBoundingRect.top - (body.scrollTop || window.scrollY || 0);
                    handler(selfPointer.getTouchesByEvent(event, canvasBoundingRect));
                    event.stopPropagation();
                    event.preventDefault();
                }), false);
            };
            for (let eventName in _touchEventsMap) {
                registerTouchEvent(eventName);
            }
        }

        this._registerKeyboardEvent();

        this._isRegisterEvent = true;
    },

    _registerKeyboardEvent () {},

    _registerAccelerometerEvent () {},

    /**
     * @method update
     * @param {Number} dt
     */
    update (dt) {
        if (this._accelCurTime > this._accelInterval) {
            this._accelCurTime -= this._accelInterval;
            eventManager.dispatchEvent(new cc.Event.EventAcceleration(this._acceleration));
        }
        this._accelCurTime += dt;
    },

    // (此处注释需要更新)
    // 某些安卓手机有特殊的全屏多点触控手势, 这些手势会导致 cocos无法获得正确的 "在屏手指"数.
    // 所以用户应该根据自己的需求 适时的调用这个方法.
    //  比如在 touchStart时, 而且 timeout 应该传入一个比较小的毫秒值.
    cleanTimeoutGlobalTouches (timeout) {
        if (this._touchCount < 1) {
            return;
        }
        timeout = timeout || TOUCH_TIMEOUT;
        let now = cc.sys.now();
        let _touchesCache = this._touchesCache;
        for (let touchID in _touchesCache) {
            let ccTouch = _touchesCache[touchID];
            if (!ccTouch || now - ccTouch._lastModified > timeout) {
                delete _touchesCache[touchID];
                this._touchCount--;
            }
        }
    },

    getGlobalTouchCount () {
        return this._touchCount;
    },

    getGlobalTouches () {
        return this._touchesCache;
    }

};


module.exports = cc.internal.inputManager = inputManager;

