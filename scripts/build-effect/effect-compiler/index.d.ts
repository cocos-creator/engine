
export interface IChunkInfo {
  name: string | undefined;
  content: string | undefined;
}
export const options: {
  throwOnError: boolean;
  throwOnWarning: boolean;
  noSource: boolean;
  skipParserTest: boolean;
  chunkSearchFn: (names: string[]) => IChunkInfo;
  getAlternativeChunkPaths: (path: string) => string[];
};
export function addChunk (name: string, content: string): void;

export interface IEffectInfo {
  name: string;
  techniques: cc.ITechniqueInfo[];
  shaders: cc.IShaderInfo[];
  dependencies: string[];
}
export function buildEffect (name: string, content: string): IEffectInfo;

export interface IEffectStripOptions {
  glsl1: boolean;
  glsl3: boolean;
  glsl4: boolean;
}

export function stripEditorSupport (effect: IEffectInfo, options: IEffectStripOptions): IEffectInfo;
