/**
 * @en A basic module for creating vertex data for 3D objects.
 * @zh 一个创建 3D 物体顶点数据的基础模块。
 * @packageDocumentation
 * @module 3d/primitive
 */

export * from './utils';
export * from './define';
export { default as box } from './box';
export { default as cone } from './cone';
export { default as cylinder } from './cylinder';
export { default as plane } from './plane';
export { default as quad } from './quad';
export { default as sphere } from './sphere';
export { default as torus } from './torus';
export { default as capsule } from './capsule';
export { default as circle } from './circle';
export { translate, scale, wireframed } from './transform';
