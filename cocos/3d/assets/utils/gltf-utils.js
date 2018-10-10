// @ts-check
import { _decorator } from "../../../core/data/index";
const { ccclass, property } = _decorator;
import gfx from "../../../renderer/gfx";
import renderer from "../../../renderer";
import { vec3, quat, mat4 } from "../../../core/vmath";
import Node from "../../../scene-graph/node";
import { MeshResource } from "../mesh";
import { AnimationResource } from "../animation-clip";
import GLTFAsset from "../../../assets/CCGLTFAsset";
import Skeleton from "../skeleton";

/**
 * @typedef {import("../../../../types/glTF/glTF").GlTf} GLTFFormat
 * @typedef {import("../../../../types/glTF/glTF").Node} GLTFNode
 */

@ccclass
export class GltfMeshResource extends MeshResource {
    /**
     * @type {GLTFAsset}
     */
    @property(GLTFAsset)
    gltfAsset;

    /**
     * @type {number}
     */
    @property(Number)
    gltfIndex = -1;

    /**
     * Update mesh asset's content to the GlTf asset's specified mesh.
     * The GlTf mesh is conditionally supported.
     * All attributes of a GlTf primitive shall be recognized;
     * they shall have same amount of elements, and
     * shall be tighly interleaved, with no extra head data, in same buffer view.
     * @param {cc.d3.asset.Mesh} mesh 
     */
    flush(mesh) {
        if (!this.gltfAsset) {
            return;
        }

        /** @type GLTFFormat */
        const gltf = this.gltfAsset.description.json;
        if (this.gltfIndex >= gltf.meshes.length) {
            return;
        }

        const gltfMesh = gltf.meshes[this.gltfIndex];
        const gltfAccessors = gltf.accessors;

        mesh.name = gltfMesh.name;

        mesh._subMeshes = new Array(gltfMesh.primitives.length);
        for (let i = 0; i < gltfMesh.primitives.length; ++i) {
            let primitive = gltfMesh.primitives[i];

            let iVertexBufferView = -1;
            let vertexCount = -1;
            let expectedOffset = 0;
            let positionType = gfx.ATTR_TYPE_FLOAT32;
            const vfmt = [];
            for (const gltfAttribName in primitive.attributes) {
                const gfxAttribName = _gltfAttribMap[gltfAttribName];
                if (gfxAttribName === undefined) {
                    console.error(`Found unacceptable GlTf attribute ${gltfAttribName}.`);
                    return;
                }
                const gltfAccessor = gltfAccessors[primitive.attributes[gltfAttribName]];

                if (iVertexBufferView !== -1 && iVertexBufferView !== gltfAccessor.bufferView) {
                    console.error(`All attributes of one GlTf primitive should reference to the same buffer view.`);
                    return;
                } else {
                    iVertexBufferView = gltfAccessor.bufferView;
                }

                if (vertexCount !== -1 && vertexCount !== gltfAccessor.count) {
                    console.error(`All attributes of one GlTf primitive should have same amount of elements.`);
                    return;
                } else {
                    vertexCount = gltfAccessor.count;
                }

                if (gltfAccessor.byteOffset !== expectedOffset) {
                    console.error(`Attributes of one GlTf primitive should be interleaved.`);
                    return;
                }
                expectedOffset += gltfAccessor.byteOffset;

                if (gltfAttribName === "POSITION") {
                    mesh._minPos = vec3.create(gltfAccessor.min[0], gltfAccessor.min[1], gltfAccessor.min[2]);
                    mesh._maxPos = vec3.create(gltfAccessor.max[0], gltfAccessor.max[1], gltfAccessor.max[2]);
                    positionType = gltfAccessor.componentType;
                }
                vfmt.push({ name: gfxAttribName, type: gltfAccessor.componentType, num: _type2size[gltfAccessor.type] });
            }

            const vertexBufferView = gltf.bufferViews[iVertexBufferView];
            if (expectedOffset !== vertexBufferView.byteStride) {
                console.warn(`There is extra data resides in GlTf primitive's buffer.`);
                return;
            }

            const vbData = new DataView(this.gltfAsset.buffers[vertexBufferView.buffer].data, vertexBufferView.byteOffset, vertexBufferView.byteLength);
            const vb = new gfx.VertexBuffer(
                app.device,
                new gfx.VertexFormat(vfmt),
                gfx.USAGE_STATIC,
                vbData,
                vertexCount
            );

            let ib = null;
            if (primitive.indices !== undefined) {
                let ibAcc = gltfAccessors[primitive.indices];
                let ibView = gltf.bufferViews[ibAcc.bufferView];
                let ibData = new DataView(this.gltfAsset.buffers[ibView.buffer].data, ibView.byteOffset, ibView.byteLength);

                ib = new gfx.IndexBuffer(
                    app.device,
                    ibAcc.componentType,
                    gfx.USAGE_STATIC,
                    ibData,
                    ibAcc.count
                );
            }

            mesh._subMeshes[i] = new renderer.InputAssembler(vb, ib);
        }

        // create skinning if we found
        if (gltf.skins !== undefined) {
            const iSkin = gltf.skins.findIndex(skin => skin.name === gltfMesh.name);
            if (iSkin >= 0) {
                mesh._skinning = this.createSkinning(iSkin);
            }
        }
    }

    /**
     * @param {number} index
     * @return {cc.d3.asset.MeshSkinning}
     */
    createSkinning(index) {
        /** @type GLTFFormat */
        const gltf = this.gltfAsset.description.json;
        if (index >= gltf.skins.length) {
            return null;
        }

        let gltfSkin = gltf.skins[index];

        // extract bindposes mat4 data
        let accessor = gltf.accessors[gltfSkin.inverseBindMatrices];
        let bufView = gltf.bufferViews[accessor.bufferView];
        let data = new Float32Array(this.gltfAsset.buffers[bufView.buffer].data, bufView.byteOffset + accessor.byteOffset, accessor.count * 16);
        let bindposes = new Array(accessor.count);

        for (let i = 0; i < accessor.count; ++i) {
            bindposes[i] = mat4.create(
                data[16 * i + 0], data[16 * i + 1], data[16 * i + 2], data[16 * i + 3],
                data[16 * i + 4], data[16 * i + 5], data[16 * i + 6], data[16 * i + 7],
                data[16 * i + 8], data[16 * i + 9], data[16 * i + 10], data[16 * i + 11],
                data[16 * i + 12], data[16 * i + 13], data[16 * i + 14], data[16 * i + 15]
            );
        }

        return {
            jointIndices: gltfSkin.joints,
            bindposes,
        };
    }
}

@ccclass
export class GltfAnimationResource extends AnimationResource {
    /**
     * @type {GLTFAsset}
     */
    @property(GLTFAsset)
    gltfAsset;

    /**
     * @type {number}
     */
    @property(Number)
    gltfIndex = -1;

    /**
     * 
     * @param {cc.d3.asset.AnimationClip} animationClip 
     */
    flush(animationClip) {
        if (!this.gltfAsset) {
            return;
        }

        /** @type GLTFFormat */
        const gltf = this.gltfAsset.description.json;
        if (this.gltfIndex >= gltf.animations.length) {
            return;
        }

        const bin = this.gltfAsset.buffers[0].data;
        let gltfAnimation = gltf.animations[this.gltfIndex];
        /** @type {cc.d3.animation.Frame[]} */
        let framesList = [];
        let maxLength = -1;

        for (let i = 0; i < gltfAnimation.channels.length; ++i) {
            let gltfChannel = gltfAnimation.channels[i];
            if (gltfChannel.target.node === undefined) {
                // When node isn't defined, channel should be ignored.
                continue;
            }
            let gltfSampler = gltf.samplers[gltfChannel.sampler];
            let inputAcc = gltf.accessors[gltfSampler.input];

            // find frames by input name
            /** @type {cc.d3.animation.Frame} */
            let frames;
            for (let j = 0; j < framesList.length; ++j) {
                if (framesList[j].name === inputAcc.name) {
                    frames = framesList[j];
                    break;
                }
            }

            // if not found, create one
            if (!frames) {
                let inArray = _createArray(gltf, bin, gltfSampler.input);
                /** @type {number[]} */
                let inputs = new Array(inArray.length);
                for (let i = 0; i < inArray.length; ++i) {
                    let t = inArray[i];
                    inputs[i] = t;

                    if (maxLength < t) {
                        maxLength = t;
                    }
                }

                frames = {
                    name: inputAcc.name,
                    times: inputs,
                    joints: [],
                };
                framesList.push(frames);
            }

            // find output frames by node id
            /** @type {cc.d3.animation.JointFrame} */
            let jointFrames;
            for (let j = 0; j < frames.joints.length; ++j) {
                if (frames.joints[j].id === gltfChannel.target.node) {
                    jointFrames = frames.joints[j];
                    break;
                }
            }

            // if not found, create one
            if (!jointFrames) {
                jointFrames = {
                    id: gltfChannel.target.node
                };
                frames.joints.push(jointFrames);
            }

            let outArray = _createArray(gltf, bin, gltfChannel.output);
            if (gltfChannel.target.path === 'translation') {
                let cnt = outArray.length / 3;
                jointFrames.translations = new Array(cnt);
                for (let i = 0; i < cnt; ++i) {
                    jointFrames.translations[i] = vec3.create(
                        outArray[3 * i + 0],
                        outArray[3 * i + 1],
                        outArray[3 * i + 2]
                    );
                }
            } else if (gltfChannel.target.path === 'rotation') {
                let cnt = outArray.length / 4;
                jointFrames.rotations = new Array(cnt);
                for (let i = 0; i < cnt; ++i) {
                    jointFrames.rotations[i] = quat.create(
                        outArray[4 * i + 0],
                        outArray[4 * i + 1],
                        outArray[4 * i + 2],
                        outArray[4 * i + 3]
                    );
                }
            } else if (gltfChannel.target.path === 'scale') {
                let cnt = outArray.length / 3;
                jointFrames.scales = new Array(cnt);
                for (let i = 0; i < cnt; ++i) {
                    jointFrames.scales[i] = vec3.create(
                        outArray[3 * i + 0],
                        outArray[3 * i + 1],
                        outArray[3 * i + 2]
                    );
                }
            }
        }

        animationClip.name = gltfAnimation.name;
        animationClip._framesList = framesList;
        animationClip._length = maxLength;
    }
}

const _type2size = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
};

const _compType2Array = {
  [gfx.ATTR_TYPE_INT8]: Int8Array,
  [gfx.ATTR_TYPE_UINT8]: Uint8Array,
  [gfx.ATTR_TYPE_INT16]: Int16Array,
  [gfx.ATTR_TYPE_UINT16]: Uint16Array,
  [gfx.ATTR_TYPE_INT32]: Int32Array,
  [gfx.ATTR_TYPE_UINT32]: Uint32Array,
  [gfx.ATTR_TYPE_FLOAT32]: Float32Array,
};

const _gltfAttribMap = {
    POSITION: gfx.ATTR_POSITION,
    NORMAL: gfx.ATTR_NORMAL,
    TANGENT: gfx.ATTR_TANGENT,
    COLOR_0: gfx.ATTR_COLOR0,
    TEXCOORD_0: gfx.ATTR_UV0,
    TEXCOORD_1: gfx.ATTR_UV1,
    TEXCOORD_2: gfx.ATTR_UV2,
    TEXCOORD_3: gfx.ATTR_UV3,
    JOINTS_0: gfx.ATTR_JOINTS,
    WEIGHTS_0: gfx.ATTR_WEIGHTS
};

/**
 * @param {GLTFFormat} gltf
 * @param {ArrayBuffer} bin
 * @param {number} accessorID
 * @return {Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array}
 */
function _createArray(gltf, bin, accessorID) {
    let acc = gltf.accessors[accessorID];
    let bufView = gltf.bufferViews[acc.bufferView];

    let num = _type2size[acc.type];
    let typedArray = _compType2Array[acc.componentType];
    let result = new typedArray(bin, bufView.byteOffset + acc.byteOffset, acc.count * num);

    return result;
}

/**
 * @param {GLTFNode[]} gltfNodes
 */
export function createNodes(gltfNodes) {
    let nodes = new Array(gltfNodes.length);

    for (let i = 0; i < gltfNodes.length; ++i) {
        let node = _createNode(gltfNodes[i]);
        nodes[i] = node;
    }

    for (let i = 0; i < gltfNodes.length; ++i) {
        let gltfNode = gltfNodes[i];
        let node = nodes[i];

        if (gltfNode.children) {
            for (let j = 0; j < gltfNode.children.length; ++j) {
                let index = gltfNode.children[j];
                node.append(nodes[index]);
            }
        }
    }

    return nodes;
}

/**
 * @param {*} app
 * @param {Array} gltfNodes
 */
export function createEntities(app, gltfNodes) {
    let nodes = new Array(gltfNodes.length);

    for (let i = 0; i < gltfNodes.length; ++i) {
        let gltfNode = gltfNodes[i];
        let node = app.createEntity(gltfNode.name);

        if (gltfNode.translation) {
            node.setPosition(
                gltfNode.translation[0],
                gltfNode.translation[1],
                gltfNode.translation[2]
            );
        }

        if (gltfNode.rotation) {
            node.setRotation(
                gltfNode.rotation[0],
                gltfNode.rotation[1],
                gltfNode.rotation[2],
                gltfNode.rotation[3]
            );
        }

        if (gltfNode.scale) {
            node.setScale(
                gltfNode.scale[0],
                gltfNode.scale[1],
                gltfNode.scale[2]
            );
        }

        nodes[i] = node;
    }

    for (let i = 0; i < gltfNodes.length; ++i) {
        let gltfNode = gltfNodes[i];
        let node = nodes[i];

        if (gltfNode.children) {
            for (let j = 0; j < gltfNode.children.length; ++j) {
                let index = gltfNode.children[j];
                node.append(nodes[index]);
            }
        }
    }

    return nodes;
}

/**
 * @param {GLTFAsset} gltfAsset
 * @param {number} index
 */
export function createSkeleton(gltfAsset, index) {
    /** @type GLTFFormat */
    const gltf = gltfAsset.description.json;

    if (!gltf.skins || index >= gltf.skins.length) {
        return;
    }

    const gltfSkin = gltf.skins[index];
    const skeleton = new Skeleton();
    skeleton.name = gltfSkin.name;
    const rootIndex = gltfSkin.skeleton === undefined ? 0 : gltfSkin.skeleton;
    const rootNode = _createNodeRecursive(gltf, rootIndex);
    skeleton._rootNode = rootNode;
    skeleton._indexDelta = rootIndex;
    return skeleton;
}

/**
 * 
 * @param {GLTFFormat} gltf 
 * @param {number} index 
 */
function _createNodeRecursive(gltf, index) {
    let gltfNode = gltf.nodes[index];
    let node = _createNode(gltfNode);
    if (gltfNode.children) {
        gltfNode.children.forEach((childGLTFNode) => {
            let childNode = _createNodeRecursive(gltf, childGLTFNode);
            node.addChild(childNode);
        });
    }
    return node;
}

/**
 * 
 * @param {GLTFNode} gltfNode
 */
function _createNode(gltfNode) {
    let node = new Node(gltfNode.name);

    if (gltfNode.translation) {
        node.setPosition(
            gltfNode.translation[0],
            gltfNode.translation[1],
            gltfNode.translation[2]
        );
    }

    if (gltfNode.rotation) {
        node.setRotation(
            gltfNode.rotation[0],
            gltfNode.rotation[1],
            gltfNode.rotation[2],
            gltfNode.rotation[3]
        );
    }

    if (gltfNode.scale) {
        node.setScale(
            gltfNode.scale[0],
            gltfNode.scale[1],
            gltfNode.scale[2]
        );
    }
    return node;
}