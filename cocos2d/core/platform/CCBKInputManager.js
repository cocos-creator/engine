/****************************************************************************
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2014 Chukong Technologies Inc.

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

var js = require('../platform/js');
var macro = require('./CCMacro');
var sys = require('./CCSys');
var eventManager = require('../event-manager');

var TOUCH_TIMEOUT = macro.TOUCH_TIMEOUT;

/**
 *  This class manages all events of input. include: touch, mouse, accelerometer, keyboard
 */
var inputManager = {
    _mousePressed: false,

    _isRegisterEvent: false,

    _preTouchPoint: cc.p(0,0),
    _prevMousePoint: cc.p(0,0),

    _preTouchPool: [],
    _preTouchPoolPointer: 0,

    _touches: [],
    _touchesIntegerDict:{},

    _indexBitsUsed: 0,
    _maxTouches: 5,

    _accelEnabled: false,
    _accelInterval: 1/30,
    _accelMinus: 1,
    _accelCurTime: 0,
    _acceleration: null,
    _accelDeviceEvent: null,

    _getUnUsedIndex: function () {
        var temp = this._indexBitsUsed;
        var now = cc.sys.now();

        for (var i = 0; i < this._maxTouches; i++) {
            if (!(temp & 0x00000001)) {
                this._indexBitsUsed |= (1 << i);
                return i;
            }
            else {
                var touch = this._touches[i];
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

    _removeUsedIndexBit: function (index) {
        if (index < 0 || index >= this._maxTouches)
            return;

        var temp = 1 << index;
        temp = ~temp;
        this._indexBitsUsed &= temp;
    },

    _glView: null,

    /**
     * @method handleTouchesBegin
     * @param {Array} touches
     */
    handleTouchesBegin: function (touches) {
        var selTouch, index, curTouch, touchID, 
            handleTouches = [], locTouchIntDict = this._touchesIntegerDict,
            now = sys.now();
        for(var i = 0, len = touches.length; i< len; i ++){
            selTouch = touches[i];
            touchID = selTouch.getID();
            index = locTouchIntDict[touchID];

            if(index == null){
                var unusedIndex = this._getUnUsedIndex();
                if (unusedIndex === -1) {
                    cc.logID(2300, unusedIndex);
                    continue;
                }
                //curTouch = this._touches[unusedIndex] = selTouch;
                curTouch = this._touches[unusedIndex] = new cc.Touch(selTouch._point.x, selTouch._point.y, selTouch.getID());
                curTouch._lastModified = now;
                curTouch._setPrevPoint(selTouch._prevPoint);
                locTouchIntDict[touchID] = unusedIndex;
                handleTouches.push(curTouch);
            }
        }
        if(handleTouches.length > 0){
            this._glView._convertTouchesWithScale(handleTouches);
            var touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.BEGAN;
            eventManager.dispatchEvent(touchEvent);
        }
    },

    /**
     * @method handleTouchesMove
     * @param {Array} touches
     */
    handleTouchesMove: function(touches){
        var selTouch, index, touchID, 
            handleTouches = [], locTouches = this._touches,
            now = sys.now();
        for(var i = 0, len = touches.length; i < len; i++){
            selTouch = touches[i];
            touchID = selTouch.getID();
            index = this._touchesIntegerDict[touchID];

            if(index == null){
                //cc.log("if the index doesn't exist, it is an error");
                continue;
            }
            if(locTouches[index]){
                locTouches[index]._setPoint(selTouch._point);
                locTouches[index]._setPrevPoint(selTouch._prevPoint);
                locTouches[index]._lastModified = now;
                handleTouches.push(locTouches[index]);
            }
        }
        if(handleTouches.length > 0){
            this._glView._convertTouchesWithScale(handleTouches);
            var touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.MOVED;
            eventManager.dispatchEvent(touchEvent);
        }
    },

    /**
     * @method handleTouchesEnd
     * @param {Array} touches
     */
    handleTouchesEnd: function(touches){
        var handleTouches = this.getSetOfTouchesEndOrCancel(touches);
        if(handleTouches.length > 0) {
            this._glView._convertTouchesWithScale(handleTouches);
            var touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.ENDED;
            eventManager.dispatchEvent(touchEvent);
        }
    },

    /**
     * @method handleTouchesCancel
     * @param {Array} touches
     */
    handleTouchesCancel: function(touches){
        var handleTouches = this.getSetOfTouchesEndOrCancel(touches);
        if(handleTouches.length > 0) {
            this._glView._convertTouchesWithScale(handleTouches);
            var touchEvent = new cc.Event.EventTouch(handleTouches);
            touchEvent._eventCode = cc.Event.EventTouch.CANCELLED;
            eventManager.dispatchEvent(touchEvent);
        }
    },

    /**
     * @method getSetOfTouchesEndOrCancel
     * @param {Array} touches
     * @returns {Array}
     */
    getSetOfTouchesEndOrCancel: function(touches) {
        var selTouch, index, touchID, handleTouches = [], locTouches = this._touches, locTouchesIntDict = this._touchesIntegerDict;
        for(var i = 0, len = touches.length; i< len; i ++){
            selTouch = touches[i];
            touchID = selTouch.getID();
            index = locTouchesIntDict[touchID];

            if(index == null){
                continue;  //cc.log("if the index doesn't exist, it is an error");
            }
            if(locTouches[index]){
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
     * @method getHTMLElementPosition
     * @param {HTMLElement} element
     * @return {Object}
     */
    getHTMLElementPosition: function (element) {
        if (sys.platform === sys.WECHAT_GAME) {
            return {
                left: 0,
                top: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }

        var docElem = document.documentElement;
        var leftOffset = window.pageXOffset - docElem.clientLeft;
        var topOffset = window.pageYOffset - docElem.clientTop;
        if (typeof element.getBoundingClientRect === 'function') {
            var box = element.getBoundingClientRect();
            return {
                left: box.left + leftOffset,
                top: box.top + topOffset,
                width: box.width,
                height: box.height
            };
        }
        else {
            if (element instanceof HTMLCanvasElement) {
                return {
                    left: leftOffset,
                    top: topOffset,
                    width: element.width,
                    height: element.height
                };
            }
            else {
                return {
                    left: leftOffset,
                    top: topOffset,
                    width: parseInt(element.style.width),
                    height: parseInt(element.style.height)
                };
            }
        }
    },

    /**
     * @method getPreTouch
     * @param {Touch} touch
     * @return {Touch}
     */
    getPreTouch: function(touch){
        var preTouch = null;
        var locPreTouchPool = this._preTouchPool;
        var id = touch.getID();
        for (var i = locPreTouchPool.length - 1; i >= 0; i--) {
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
    setPreTouch: function(touch){
        var find = false;
        var locPreTouchPool = this._preTouchPool;
        var id = touch.getID();
        for (var i = locPreTouchPool.length - 1; i >= 0; i--) {
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
    getTouchByXY: function(tx, ty, pos){
        var locPreTouch = this._preTouchPoint;
        var location = this._glView.convertToLocationInView(tx, ty, pos);
        var touch = new cc.Touch(location.x,  location.y);
        touch._setPrevPoint(locPreTouch.x, locPreTouch.y);
        locPreTouch.x = location.x;
        locPreTouch.y = location.y;
        return touch;
    },

    /**
     * @method getTouchByXY
     * @param {Vec2} location
     * @param {Vec2} pos
     * @param {Number} eventType
     * @returns {Event.EventMouse}
     */
    getMouseEvent: function(location, pos, eventType){
        var locPreMouse = this._prevMousePoint;
        var mouseEvent = new cc.Event.EventMouse(eventType);
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
    getPointByEvent: function(event, pos){
        if (event.pageX != null)  //not avalable in <= IE8
            return {x: event.pageX, y: event.pageY};

        if (sys.platform === sys.WECHAT_GAME) {
            pos.left = 0;
            pos.top = 0;
        }
        else {
            pos.left -= document.body.scrollLeft;
            pos.top -= document.body.scrollTop;
        }
        return {x: event.clientX, y: event.clientY};
    },

    /**
     * @method getTouchesByEvent
     * @param {Touch} event
     * @param {Vec2} pos
     * @returns {Array}
     */
    getTouchesByEvent: function(event){
        var touchArr = [], locView = cc.view;
        var touch_event, touch, preLocation;
        var locPreTouch = this._preTouchPoint;
        var length = event.length;
            for (var i = 0; i < length; i++) {
                touch_event = event[i];
                if (touch_event) {
                    var location = locView.convertToLocationInView(touch_event.x, touch_event.y, cc.p(0, 0));
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

    // bk game
    detectGesture: function () {
        var touchArr = BK.TouchEvent.getTouchEvent();
        if (!touchArr) {
            return;
        }
        
        var _touchBeginEvents = [];
        var _touchhMoveEvents = [];
        var _touchEndEvents = [];
        
        for (var i = 0; i < touchArr.length; i++) {
            var touch_event = touchArr[i];
            //touch begin
            if (touchArr[i].status === 2) {
                _touchBeginEvents.push(touch_event);
            }
            //touch moved
            else if (touchArr[i].status === 3) {
                _touchhMoveEvents.push(touch_event);
            }
            //touch end
            else if (touchArr[i].status === 1) {
                _touchEndEvents.push(touch_event); 
            }
        }
        
        if (_touchBeginEvents.length > 0) {
            handleTouchesBegin(this.getTouchesByEvent(_touchBeginEvents));
        }
        if (_touchhMoveEvents.length > 0) {
            handleTouchesMove(this.getTouchesByEvent(_touchhMoveEvents));
        }
        if (_touchEndEvents.length > 0) {
            handleTouchesEnd(this.getTouchesByEvent(_touchEndEvents));
        }

        BK.TouchEvent.updateTouchStatus();
    },

    /**
     * @method registerSystemEvent
     * @param {HTMLElement} element
     */
    registerSystemEvent: function(element){},

    _registerKeyboardEvent: function(){},

    _registerAccelerometerEvent: function(){},

    /**
     * @method update
     * @param {Number} dt
     */
    update:function(dt){
        if(this._accelCurTime > this._accelInterval){
            this._accelCurTime -= this._accelInterval;
            eventManager.dispatchEvent(new cc.Event.EventAcceleration(this._acceleration));
        }
        this._accelCurTime += dt;
    }
};

js.get(cc, 'inputManager', function () {
    cc.warnID(1405, 'cc.inputManager', 'cc.systemEvent');
    return inputManager;
});

BK.inputManager = module.exports = inputManager;
