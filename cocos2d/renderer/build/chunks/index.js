module.exports = {
  "skinning": "\n\nattribute vec4 a_weights;\nattribute vec4 a_joints;\n\n#if _USE_JOINTS_TEXTRUE\nuniform sampler2D _jointsTexture;\nuniform float _jointsTextureSize;\n\nmat4 getBoneMatrix(const in float i) {\n  float size = _jointsTextureSize;\n  float j = i * 4.0;\n  float x = mod(j, size);\n  float y = floor(j / size);\n\n  float dx = 1.0 / size;\n  float dy = 1.0 / size;\n\n  y = dy * (y + 0.5);\n\n  vec4 v1 = texture2D(_jointsTexture, vec2(dx * (x + 0.5), y));\n  vec4 v2 = texture2D(_jointsTexture, vec2(dx * (x + 1.5), y));\n  vec4 v3 = texture2D(_jointsTexture, vec2(dx * (x + 2.5), y));\n  vec4 v4 = texture2D(_jointsTexture, vec2(dx * (x + 3.5), y));\n\n  return mat4(v1, v2, v3, v4);\n}\n#else\nuniform mat4 _jointMatrices[64];\n\nmat4 getBoneMatrix(const in float i) {\n  return _jointMatrices[int(i)];\n}\n#endif\n\nmat4 skinMatrix() {\n  return\n    getBoneMatrix(a_joints.x) * a_weights.x +\n    getBoneMatrix(a_joints.y) * a_weights.y +\n    getBoneMatrix(a_joints.z) * a_weights.z +\n    getBoneMatrix(a_joints.w) * a_weights.w\n    ;\n}"
}