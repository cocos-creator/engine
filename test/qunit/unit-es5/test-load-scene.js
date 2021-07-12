(function () {

    if (!TestEditorExtends) {
        return;
    }

    var Script;

    module('test scene serialization', {
        setup: function () {
            SetupEngine.setup();

            Script = cc.Class({
                name: '97423897423',
                extends: cc.Component,
                properties: {
                    target: {
                        default: null,
                        type: cc.Node
                    }
                },
                getName: function () {
                    return this.name;
                }
            });
        },
        teardown: function () {
            cc.js.unregisterClass(Script);
            SetupEngine.teardown();
        }
    });

    test('basic test', function () {
        var newScene = new cc.Scene();
        var root1 = new cc.Node();
        root1.parent = newScene;

        var serialized = Editor.serialize(newScene, {stringify: false});
        strictEqual(serialized[0].__type__, cc.js._getClassId(cc.Scene), 'scene should be serialized');
        ok(serialized[0]._children instanceof Array, 'children should be serialized');

        var loaded = cc.deserialize(serialized);
        ok(loaded instanceof cc.Scene, 'deserialization');
        strictEqual(loaded._children.length, 1, 'children should be loaded');

        ok(cc.engine.getInstanceById(root1.uuid) == null, 'should not register uuid to engine before scene launch');

        cc.director.runSceneImmediate(newScene);
        strictEqual(cc.director.getScene(), newScene, 'could run new scene');

        ok(cc.engine.getInstanceById(root1.uuid) === root1, 'should register uuid to engine after scene launch');
    });
})();

module('load scene', SetupEngine);

test('persist node with dynamic scene', function () {
    var oldScene = new cc.Scene();
    cc.director.runSceneImmediate(oldScene);

    var globalNode = new cc.Node();
    globalNode.parent = oldScene;
    var childNode = new cc.Node();
    childNode.parent = globalNode;

    cc.game.addPersistRootNode(globalNode);

    var newScene = new cc.Scene();
    cc.director.runSceneImmediate(newScene);

    ok(globalNode.parent === newScene, 'persist node should not be destoryed automatically when loading a new scene');
});

test('persist node should replace existing node in scene', function () {
    var oldNode = new cc.Node();
    oldNode.parent = cc.director.getScene();
    cc.game.addPersistRootNode(oldNode);
    oldNode.setSiblingIndex(0);

    var newScene = new cc.Scene();
    newScene.addChild(new cc.Node());
    newScene.addChild(new cc.Node());
    var newNode = new cc.Node();
    newNode._id = oldNode.uuid;
    newScene.insertChild(newNode, 1);

    cc.director.runSceneImmediate(newScene);

    ok(oldNode.parent === newScene, 'persist node should add to new scene');
    strictEqual(oldNode.getSiblingIndex(), 0, 'persist node should restore sibling index');
    ok(newNode.parent === null, 'existing node should not in new scene');

    cc.game.step(); // ensure sgNode sorted
});

test('lifecycle methods of persist node and replaced node', function () {
    var oldNode = new cc.Node();
    var oldComp = oldNode.addComponent(cc.Component);
    oldComp.onLoad = Callback().enable();
    oldComp.start = Callback().enable();
    oldComp.onDestroy = Callback().disable('should not call onDestroy');
    oldComp.onDisable = Callback().enable();
    oldComp.onEnable = Callback().enable();

    oldNode.parent = cc.director.getScene();
    cc.game.addPersistRootNode(oldNode);
    cc.game.step();
    oldComp.onLoad.disable('should not call onLoad again')
    oldComp.start.disable('should not call start again');
    oldComp.onEnable.once();

    var newScene = new cc.Scene();
    var newNode = new cc.Node();
    newNode._id = oldNode.uuid;
    newNode.parent = newScene;
    var newComp = newNode.addComponent(cc.Component);
    newComp.onLoad = Callback().disable('should not call onLoad because its node is duplicated');
    newComp.start = Callback().disable('should not call start because its node is duplicated');
    newComp.onEnable = Callback().disable('should not call onEnable because its node is duplicated');
    newComp.onDisable = Callback().disable('should not call onDisable because its node is duplicated');
    newComp.onDestroy = Callback().disable('should not call onDestroy because its node is duplicated');
    newComp.update = Callback().disable('should not call update because its node is duplicated');

    cc.director.runSceneImmediate(newScene);

    oldComp.onDisable.once('should call onDisable because parent changed');
    oldComp.onEnable.once('should call onEnable because parent changed');

    cc.game.step();
    cc.game.step();

    // end test
    oldComp.onDestroy.enable();
});

(function () {
    if (!TestEditorExtends) {
        return;
    }
    test('persist node with loaded scene', function () {
        var oldScene = new cc.Scene();
        cc.director.runSceneImmediate(oldScene);

        var globalNode = new cc.Node();
        globalNode.parent = oldScene;
        var childNode = new cc.Node();
        childNode.parent = globalNode;

        cc.game.addPersistRootNode(globalNode);

        var newScene = cc.deserialize(Editor.serialize(new cc.Scene(), {stringify: false}));

        cc.director.runSceneImmediate(newScene);

        ok(globalNode.parent === newScene, 'persist node should not be destoryed automatically when loading a new scene');
    });
})();
