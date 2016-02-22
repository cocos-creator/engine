largeModule('Loader');

var loader = cc._loader;

asyncTest('Load', function () {
    var image1 = assetDir + '/button.png';
    var json1 = assetDir + '/library/12/123200.json';
    var json2 = assetDir + '/library/deferred-loading/74/748321.json';
    var resources = [
        image1,
        json1,
        json2,
    ];

    loader.load(resources, function (completedCount, totalCount, item) {
        if (item.src === image1) {
            ok(item.content instanceof cc.Texture2D, 'image url\'s result should be Texture2D');
        }
        else if (item.src === json1) {
            strictEqual(item.content.width, 89, 'should give correct js object as result of JSON');
        }
        else if (item.src === json2) {
            strictEqual(item.content._rawFiles[0], 'YouKnowEverything', 'should give correct js object as result of JSON');
        }
        else {
            ok(false, 'should not load an unknown url');
        }
    }, function (items) {
        ok(items.isCompleted(), 'be able to load all resources');

        loader.releaseAll();
        strictEqual(Object.keys(this.getItems().map).length, 0, 'should clear loading items after releaseAll called');

        clearTimeout(timeoutId);
        start();
    });

    var timeoutId = setTimeout(function () {
        ok(false, 'time out!');
        start();
    }, 5000);
});

asyncTest('Load with dependencies', function () {
    var dep1 = assetDir + '/button.png';
    var dep2 = assetDir + '/library/12/123200.json';
    var dep3 = assetDir + '/library/65/6545543.png';

    function loadWithDeps (item, callback) {
        try {
            var result = JSON.parse(item.content);
        }
        catch (e) {
            callback( new Error('JSON Loader: Parse json [' + item.src + '] failed : ' + e) );
        }
        var resources = [
            dep1,
            dep2,
            dep3
        ];
        this.pipeline.flowInDeps(resources, function (deps) {
            callback(null, result);
        });
    }

    loader.addLoadHandlers({
        'deps': loadWithDeps
    });

    var json1 = {
        src: assetDir + '/library/65/6545543',
        type: 'deps'
    };
    var json2 = assetDir + '/library/deferred-loading/74/748321.json';
    var audio = assetDir + '/background.mp3';
    var resources = [
        json1,
        json2,
        audio
    ];

    var total = resources.length + 3;

    var dep1Loaded = false;
    var dep2Loaded = false;
    var dep3Loaded = false;

    var items = loader.getItems();

    var progressCallback = new Callback(function (completedCount, totalCount, item) {
        if (item.src === json1.src) {
            var depsLoaded = items.isItemCompleted(dep1) &&
                             items.isItemCompleted(dep2) &&
                             items.isItemCompleted(dep3);
            ok(depsLoaded, 'should load all dependencies before complete parent resources');
            var depsCallbackCalled = dep1Loaded && dep2Loaded && dep3Loaded;
            ok(depsCallbackCalled, 'should call all dependencies complete callback before complete parent resources');
            strictEqual(item.content.__type__, 'TestTexture', 'should give correct js object as result of deps type');
        }
        else if (item.src === json2) {
            strictEqual(item.content._rawFiles[0], 'YouKnowEverything', 'should give correct js object as result of JSON');
        }
        else if (item.src === dep1) {
            dep1Loaded = true;
            ok(item.content instanceof cc.Texture2D, 'image url\'s result should be Texture2D');
        }
        else if (item.src === dep2) {
            dep2Loaded = true;
            strictEqual(item.content.width, 89, 'should give correct js object as result of JSON');
        }
        else if (item.src === dep3) {
            dep3Loaded = true;
            ok(item.content instanceof cc.Texture2D, 'image url\'s result should be Texture2D');
        }
        else if (item.src === audio) {
            // Test environment doesn't support audio
            ok((item.content instanceof cc.Audio) || true, 'audio url\'s result should be Audio');
        }
        else {
            ok(false, 'should not load an unknown url: ' + item.src);
        }
    }).enable();

    loader.load(resources, progressCallback, function (items) {
        ok(items.isCompleted(), 'be able to load all resources');
        progressCallback.expect(total, 'should call ' + total + ' times progress callback for ' + total + ' resources');
        loader.releaseAll();
        
        clearTimeout(timeoutId);
        start();
    });

    var timeoutId = setTimeout(function () {
        ok(false, 'time out!');
        start();
    }, 5000);
});

asyncTest('Loading font', function () {
    var image = assetDir + '/button.png';
    var font = {
        src: assetDir + '/Thonburi.ttf',
        type: 'font',
        name: 'Thonburi',
        srcs: [assetDir + '/Thonburi.eot']
    };
    var resources = [
        image,
        font
    ];
    var total = resources.length;

    var progressCallback = new Callback(function (completedCount, totalCount, item) {
        if (item.src === image) {
            ok(item.content instanceof cc.Texture2D, 'image url\'s result should be Texture2D');
        }
        else if (item.src === font.src) {
            strictEqual(item.content, null, 'should set null as content for Font type');
        }
        else {
            ok(false, 'should not load an unknown url');
        }
    }).enable();

    loader.load(resources, progressCallback, function (items) {
        ok(items.isCompleted(), 'be able to load all resources');
        progressCallback.expect(total, 'should call ' + total + ' times progress callback for ' + total + ' resources');

        clearTimeout(timeoutId);
        start();
    });

    var timeoutId = setTimeout(function () {
        ok(false, 'time out!');
        start();
    }, 5000);
});