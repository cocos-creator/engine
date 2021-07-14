import { Mesh } from '../../../cocos/3d/assets';
import { MeshRenderer } from '../../../cocos/3d/framework/mesh-renderer';
import { Node } from '../../../cocos/core/scene-graph/node';

describe('Mesh Renderer', () => {
    test('Setting mesh resets weights', () => {
        const meshRenderer = createMeshRenderer();
        const mesh = new Mesh();
        mesh.struct.morph = {
            subMeshMorphs: [
                { attributes: [], targets: [{ displacements: [] }, { displacements: [] }], weights: [0.2], },
            ],
        };
        meshRenderer.mesh = mesh;
        expect(meshRenderer.getWeight(0, 0)).toBe(0.2);
        meshRenderer.mesh = null;
        expect(() => meshRenderer.getWeight(0, 0)).toThrow();
    });

    test('Shape with default weights specified for sub mesh', () => {
        const meshRenderer = createMeshRenderer();
        const mesh = new Mesh();
        mesh.struct.morph = {
            weights: [0.85, 0.86],
            subMeshMorphs: [
                { attributes: [], targets: [{ displacements: [] }, { displacements: [] }], weights: [0.61, 0.62], },
                { attributes: [], targets: [{ displacements: [] }, { displacements: [] }], weights: [0.73, 0.74], },
            ],
        };
        meshRenderer.mesh = mesh;
        expect(meshRenderer.getWeight(0, 0)).toBe(0.61);
        expect(meshRenderer.getWeight(0, 1)).toBe(0.62);
        expect(meshRenderer.getWeight(1, 0)).toBe(0.73);
        expect(meshRenderer.getWeight(1, 1)).toBe(0.74);
    });

    test('Shape with default weights specified for each sub mesh', () => {
        const meshRenderer = createMeshRenderer();
        const mesh = new Mesh();
        mesh.struct.morph = {
            weights: [0.85, 0.86],
            subMeshMorphs: [
                { attributes: [], targets: [{ displacements: [] }, { displacements: [] }], weights: [0.61, 0.62], },
                { attributes: [], targets: [{ displacements: [] }, { displacements: [] }] }, // No default sub mesh shape weights
            ],
        };
        meshRenderer.mesh = mesh;
        expect(meshRenderer.getWeight(0, 0)).toBe(0.61);
        expect(meshRenderer.getWeight(0, 1)).toBe(0.62);
        expect(meshRenderer.getWeight(1, 0)).toBe(0.85);
        expect(meshRenderer.getWeight(1, 1)).toBe(0.86);
    });

    test('Shape without default weights specified', () => {
        const meshRenderer = createMeshRenderer();
        const mesh = new Mesh();
        mesh.struct.morph = {
            subMeshMorphs: [
                { attributes: [], targets: [{ displacements: [] }, { displacements: [] }] },
                { attributes: [], targets: [{ displacements: [] }, { displacements: [] }] },
            ],
        };
        meshRenderer.mesh = mesh;
        expect(meshRenderer.getWeight(0, 0)).toBe(0.0);
        expect(meshRenderer.getWeight(0, 1)).toBe(0.0);
        expect(meshRenderer.getWeight(1, 0)).toBe(0.0);
        expect(meshRenderer.getWeight(1, 1)).toBe(0.0);
    });

    test('SetWeights() param validation', () => {
        const meshRenderer = createMeshRenderer();
        meshRenderer.mesh = createMeshWithShapeCounts([3]);
        meshRenderer.setWeights([0.33, 0.44, 0.55], 0);

        // Invalid sub mesh index
        meshRenderer.setWeights([0.3, 0.4, 0.3], 1);
        expectNotEffect();

        // Invalid weights
        meshRenderer.setWeights([0.2, 0.7], 0);
        expectNotEffect();

        // Invalid weights 2
        meshRenderer.setWeights([0.2, 0.7, 0.9, 1.0], 0);
        expectNotEffect();

        function expectNotEffect() {
            expect(meshRenderer.getWeight(0, 0)).toBe(0.33);
            expect(meshRenderer.getWeight(0, 1)).toBe(0.44);
            expect(meshRenderer.getWeight(0, 2)).toBe(0.55);
        }
    });
    
    test('SetWeighs() param validation', () => {
        const meshRenderer = createMeshRenderer();
        meshRenderer.mesh = createMeshWithShapeCounts([3]);
        meshRenderer.setWeights([0.33, 0.44, 0.55], 0);

        // Invalid sub mesh index
        meshRenderer.setWeight(0.1, 1, 0);
        expectNotEffect();

        // Invalid shape index
        meshRenderer.setWeight(0.1, 0, 3);
        expectNotEffect();

        function expectNotEffect() {
            expect(meshRenderer.getWeight(0, 0)).toBe(0.33);
            expect(meshRenderer.getWeight(0, 1)).toBe(0.44);
            expect(meshRenderer.getWeight(0, 2)).toBe(0.55);
        }
    });

    function createMeshRenderer (): MeshRenderer {
        const node = new Node();
        const meshRenderer = node.addComponent(MeshRenderer);
        // @ts-expect-error Error
        return meshRenderer;
    }

    function createMeshWithShapeCounts (shapesCounts: number[]): Mesh {
        const mesh = new Mesh();
        mesh.struct.morph = {
            subMeshMorphs: shapesCounts.map((shapeCount) => {
                return {
                    targets: Array.from({ length: shapeCount }, (_, index) => {
                        return {
                            displacements: [],
                        };
                    }),
                    attributes: [],
                };
            }),
        };
        return mesh;
    }
});