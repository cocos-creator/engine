
const defaultOption = { glsl1: true, glsl3: true, glsl4: true };

function stripEditorSupport(effect, options = defaultOption) {
  for (const shader of effect.shaders) {
    delete shader.varyings;
    if (!options.glsl4) { delete shader.glsl4; }
    if (!options.glsl3) { delete shader.glsl3; }
    if (!options.glsl1) { delete shader.glsl1; }
    for (const define of shader.defines) { delete define.defines; delete define.editor; }
    // for (const block of shader.blocks) { delete block.defines; }
    // for (const samplerTexture of shader.samplerTextures) { delete samplerTexture.defines; }
  }
  for (const tech of effect.techniques) {
    for (const pass of tech.passes) {
      delete pass.migrations;
      const props = pass.properties;
      if (!props) { continue; }
      for (const name in props) {
        delete props[name].editor;
      }
    }
  }
  delete effect.dependencies;
  return effect;
}

module.exports = {
  stripEditorSupport,
};
