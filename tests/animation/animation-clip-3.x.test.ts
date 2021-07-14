import { Node, RealKeyframeValue, Vec3 } from '../../cocos/core';
import { ColorTrack, RealTrack, SizeTrack, TrackPath, VectorTrack } from '../../cocos/core/animation/animation';
import { AnimationClip, searchForRootBonePathSymbol } from '../../cocos/core/animation/animation-clip';
import { TargetPath } from '../../cocos/core/animation/target-path';

describe('Animation Clip', () => {
    describe('Evaluation', () => {
        describe('Ill-formed track path', () => {
            // test('Absent component', () => {
            //     const errorMock = jest.spyOn(console, "log").mockImplementation(() => {});
            //     const clip = createClipWithPath([new ComponentPath('cc.MeshRenderer'), 'mesh']);
            //     clip.createEvaluator({ target: new Node() });
            //     expect(errorMock).toBeCalledTimes(1);
            //     expect(errorMock.mock.calls[0][0]).toMatch(/ill-formed/i);
            //     errorMock.mockRestore();
            // });

            // test('Absent hierarchy', () => {
            //     const errorMock = jest.spyOn(console, "log").mockImplementation(() => {});
            //     const clip = createClipWithPath([new HierarchyPath('/absent'), 'position']);
            //     clip.createEvaluator({ target: new Node() });
            //     expect(errorMock).toBeCalledTimes(1);
            //     expect(errorMock.mock.calls[0][0]).toMatch(/ill-formed/i);
            //     errorMock.mockRestore();
            // });

            // test('Exception when bound', () => {
            //     const errorMock = jest.spyOn(console, "log").mockImplementation(() => {});
            //     const clip = createClipWithPath(['property', 0]);
            //     clip.createEvaluator({ target: new Node() });
            //     expect(errorMock).toBeCalledTimes(1);
            //     expect(errorMock.mock.calls[0][0]).toMatch(/ill-formed/i);
            //     errorMock.mockRestore();
            // });

            function createClipWithPath (path: TargetPath[]) {
                const clip = new AnimationClip();
                const track = new RealTrack();
                track.path = new TrackPath().hierarchy('Foo');
                clip.addTrack(track);
                return clip;
            }
        });

        test('Root bone search', () => {
            function testWith(paths: string[]) {
                const clip = new AnimationClip();
                for (const path of paths) {
                    const track = new VectorTrack();
                    track.path = new TrackPath().hierarchy(path).property('position');
                    clip.addTrack(track);
                }
                return clip[searchForRootBonePathSymbol]();
            }

            expect(testWith([''])).toBe('');
            expect(testWith(['Root'])).toBe('Root');
            expect(testWith(['Root/Pelvis'])).toBe('Root/Pelvis');
            expect(testWith(['Root', 'Root/Pelvis'])).toBe('Root');
            expect(testWith(['Root', 'Root/Pelvis/Head'])).toBe('Root');
            expect(testWith(['Pelvis/Left Leg', 'Pelvis/Right Leg'])).toBe('');
        });

        describe('Root motion', () => {
            const clip = new AnimationClip();
            clip.duration = 1.0;

            const rootJointName = 'RootJoint';

            const rootBoneTranslationTrack = new VectorTrack();
            {
                rootBoneTranslationTrack.componentsCount = 3;
                rootBoneTranslationTrack.path = new TrackPath().hierarchy(rootJointName).property('position');
                const [x, _y, _z] = rootBoneTranslationTrack.channels();
                x.curve.assignSorted([
                    [0.4, new RealKeyframeValue({ value: 0.4 })],
                    [0.6, new RealKeyframeValue({ value: 0.6 })],
                    [0.8, new RealKeyframeValue({ value: 0.8 })],
                ]);
            }

            clip.addTrack(rootBoneTranslationTrack);

            const dummyRootNode = new Node();

            const dummyRootJointNode = new Node(rootJointName);
            dummyRootNode.addChild(dummyRootJointNode);

            const evaluation = clip.createEvaluator({
                target: dummyRootNode,
                pose: undefined,
                rootMotion: { },
            });

            test('Never touch root joint', () => {
                dummyRootJointNode.setPosition(0.0, 0.0, 0.0);
                evaluation.evaluate(0.1);
                expect(Vec3.equals(dummyRootNode.position, new Vec3(0.0, 0.0, 0.0))).toBe(true);
            });

            test('In same duration: Motion not changed', () => {
                dummyRootJointNode.setPosition(0.0, 0.0, 0.0);
                evaluation.evaluateRootMotion(0.2, 0.1);
                expect(Vec3.equals(dummyRootJointNode.position, new Vec3())).toBe(true);
            });

            test('In same duration: Motion changed ', () => {
                dummyRootJointNode.setPosition(0.0, 0.0, 0.0);
                evaluation.evaluateRootMotion(0.5, 0.2);
                expect(Vec3.equals(dummyRootJointNode.position, new Vec3(0.2))).toBe(true);
            });

            test('Motion extended to next duration ', () => {
                dummyRootJointNode.setPosition(0.0, 0.0, 0.0);
                evaluation.evaluateRootMotion(0.5, 0.7);
                expect(Vec3.equals(dummyRootJointNode.position, new Vec3(0.3))).toBe(true);
            });

            test('Motion extended to next multiple duration ', () => {
                dummyRootJointNode.setPosition(0.0, 0.0, 0.0);
                evaluation.evaluateRootMotion(0.5, 3.2);
                expect(Vec3.equals(dummyRootJointNode.position, new Vec3(1.4))).toBe(true);
            });
        });
    });

    describe(`Tracks`, () => {
        test('Vector track', () => {
            const vectorTrack = new VectorTrack();
            expect(vectorTrack.channels()).toHaveLength(4);
            expect(vectorTrack.channels()[0].name).toBe('X');
            expect(vectorTrack.channels()[1].name).toBe('Y');
            expect(vectorTrack.channels()[2].name).toBe('Z');
            expect(vectorTrack.channels()[3].name).toBe('W');
        });

        test('Color track', () => {
            const colorTrack = new ColorTrack();
            expect(colorTrack.channels()).toHaveLength(4);
            expect(colorTrack.channels()[0].name).toBe('Red');
            expect(colorTrack.channels()[1].name).toBe('Green');
            expect(colorTrack.channels()[2].name).toBe('Blue');
            expect(colorTrack.channels()[3].name).toBe('Alpha');
        });

        test('Size track', () => {
            const sizeTrack = new SizeTrack();
            expect(sizeTrack.channels()).toHaveLength(2);
            expect(sizeTrack.channels()[0].name).toBe('Width');
            expect(sizeTrack.channels()[1].name).toBe('Height');
        });
    });
});