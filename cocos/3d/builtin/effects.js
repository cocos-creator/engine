// absolute essential effects
export default [
  {
    "name": "builtin-particle",
    "techniques": [
      {"name":"add", "passes":[{"rasterizerState":{"cullMode":0}, "depthStencilState":{"depthTest":true, "depthWrite":false}, "blendState":{"targets":[{"blend":true, "blendSrc":2, "blendDst":8, "blendSrcAlpha":2, "blendDstAlpha":8}]}, "program":"builtin-particle|particle-vs-legacy:lpvs_main|tinted-fs:add", "properties":{"mainTexture":{"type":29, "value":"grey"}, "mainTiling_Offset":{"type":16, "value":[1, 1, 0, 0]}, "frameTile_velLenScale":{"type":16, "value":[1, 1, 0, 0]}, "tintColor":{"type":17, "value":[0.5, 0.5, 0.5, 0.5]}}}]}
    ],
    "shaders": [
      {
        "name": "builtin-particle|particle-vs-legacy:lpvs_main|tinted-fs:add",
        "glsl3": {
          "vert": `precision mediump float;\nuniform Constants {\n  vec4 mainTiling_Offset;\n  vec4 frameTile_velLenScale;\n};\nuniform CCGlobal {\n  \n  vec4 cc_time; \n  vec4 cc_screenSize; \n  vec4 cc_screenScale; \n  \n  mat4 cc_matView;\n  mat4 cc_matViewInv;\n  mat4 cc_matProj;\n  mat4 cc_matProjInv;\n  mat4 cc_matViewProj;\n  mat4 cc_matViewProjInv;\n  vec4 cc_cameraPos; \n};\nuniform CCLocal {\n  mat4 cc_matWorld;\n  mat4 cc_matWorldIT;\n};\nout vec2 uv;\nout vec4 color;\nvoid computeVertPos(inout vec4 pos, vec2 vertOffset\n#if USE_BILLBOARD || USE_VERTICAL_BILLBOARD\n  , mat4 view\n#endif\n#if USE_STRETCHED_BILLBOARD\n  , vec3 eye\n  , vec4 velocity\n  , float velocityScale\n  , float lengthScale\n  , float size\n  , float xIndex\n#endif\n) {\n#if USE_BILLBOARD\n  vec3 camRight = normalize(vec3(view[0][0], view[1][0], view[2][0]));\n  vec3 camUp = normalize(vec3(view[0][1], view[1][1], view[2][1]));\n  pos.xyz += (camRight * vertOffset.x) + (camUp * vertOffset.y);\n#elif USE_STRETCHED_BILLBOARD\n  vec3 camRight = normalize(cross(pos.xyz - eye, velocity.xyz));\n  vec3 camUp = velocity.xyz * velocityScale + normalize(velocity.xyz) * lengthScale * size;\n  pos.xyz += (camRight * abs(vertOffset.x) * sign(vertOffset.y)) - camUp * xIndex;\n#elif USE_HORIZONTAL_BILLBOARD\n  vec3 camRight = vec3(1, 0, 0);\n  vec3 camUp = vec3(0, 0, -1);\n  pos.xyz += (camRight * vertOffset.x) + (camUp * vertOffset.y);\n#elif USE_VERTICAL_BILLBOARD\n  vec3 camRight = normalize(vec3(view[0][0], view[1][0], view[2][0]));\n  vec3 camUp = vec3(0, 1, 0);\n  pos.xyz += (camRight * vertOffset.x) + (camUp * vertOffset.y);\n#else\n  pos.x += vertOffset.x;\n  pos.y += vertOffset.y;\n#endif\n}\nvec2 computeUV(float frameIndex, vec2 vertIndex, vec2 frameTile) {\n  vec2 aniUV = vec2(0, floor(frameIndex * frameTile.y));\n  aniUV.x = floor(frameIndex * frameTile.x * frameTile.y - aniUV.y * frameTile.x);\n  \n  vertIndex.x = 1. - vertIndex.x;\n  return (aniUV.xy + vertIndex) / vec2(frameTile.x, frameTile.y);\n}\nvoid rotateCorner(inout vec2 corner, float angle) {\n  float xOS = cos(angle) * corner.x - sin(angle) * corner.y;\n  float yOS = sin(angle) * corner.x + cos(angle) * corner.y;\n  corner.x = xOS;\n  corner.y = yOS;\n}\nin vec3 a_position; \nin vec3 a_texCoord;  \nin vec2 a_texCoord1; \nin vec4 a_color;\n#if USE_STRETCHED_BILLBOARD\nin vec3 a_color1; \n#endif\nvec4 lpvs_main() {\n  vec4 pos = vec4(a_position, 1);\n#if USE_STRETCHED_BILLBOARD\n  vec4 velocity = vec4(a_color1.xyz, 0);\n#endif\n#if !USE_WORLD_SPACE\n  pos = cc_matWorld * pos;\n  #if USE_STRETCHED_BILLBOARD\n  velocity = cc_matWorld * velocity;\n  #endif\n#endif\n  vec2 cornerOffset = vec2((a_texCoord.xy - 0.5) * a_texCoord1.x);\n#if !USE_STRETCHED_BILLBOARD\n  \n  rotateCorner(cornerOffset, a_texCoord1.y);\n#endif\n  computeVertPos(pos, cornerOffset\n  #if USE_BILLBOARD || USE_VERTICAL_BILLBOARD\n    , cc_matView\n  #endif\n  #if USE_STRETCHED_BILLBOARD\n    , cc_cameraPos.xyz\n    , velocity\n    , frameTile_velLenScale.z\n    , frameTile_velLenScale.w\n    , a_texCoord1.x\n    , a_texCoord.x\n  #endif\n  );\n  pos = cc_matViewProj * pos;\n  uv = computeUV(a_texCoord.z, a_texCoord.xy, frameTile_velLenScale.xy) * mainTiling_Offset.xy + mainTiling_Offset.zw;\n  color = a_color;\n  return pos;\n}\nvoid main() { gl_Position = lpvs_main(); }\n`,
          "frag": `\n  precision mediump float;\n  in vec2 uv;\n  in vec4 color;\n  uniform sampler2D mainTexture;\n  uniform FragConstants {\n    vec4 tintColor;\n  };\n  vec4 add () {\n    return 2.0 * color * tintColor * texture(mainTexture, uv);\n  }\n  vec4 multiply () {\n    vec4 col;\n    vec4 texColor = texture(mainTexture, uv);\n    col.rgb = tintColor.rgb * texColor.rgb * color.rgb * vec3(2.0);\n    col.a = (1.0 - texColor.a) * (tintColor.a * color.a * 2.0);\n    return col;\n  }\nout vec4 cc_FragColor;\nvoid main() { cc_FragColor = add(); }\n`
        },
        "glsl1": {
          "vert": `precision mediump float;\n  uniform vec4 mainTiling_Offset;\n  uniform vec4 frameTile_velLenScale;\n  uniform vec4 cc_time;\n  uniform vec4 cc_screenSize;\n  uniform vec4 cc_screenScale;\n  uniform mat4 cc_matView;\n  uniform mat4 cc_matViewInv;\n  uniform mat4 cc_matProj;\n  uniform mat4 cc_matProjInv;\n  uniform mat4 cc_matViewProj;\n  uniform mat4 cc_matViewProjInv;\n  uniform vec4 cc_cameraPos;\n  uniform mat4 cc_matWorld;\n  uniform mat4 cc_matWorldIT;\nvarying vec2 uv;\nvarying vec4 color;\nvoid computeVertPos(inout vec4 pos, vec2 vertOffset\n#if USE_BILLBOARD || USE_VERTICAL_BILLBOARD\n  , mat4 view\n#endif\n#if USE_STRETCHED_BILLBOARD\n  , vec3 eye\n  , vec4 velocity\n  , float velocityScale\n  , float lengthScale\n  , float size\n  , float xIndex\n#endif\n) {\n#if USE_BILLBOARD\n  vec3 camRight = normalize(vec3(view[0][0], view[1][0], view[2][0]));\n  vec3 camUp = normalize(vec3(view[0][1], view[1][1], view[2][1]));\n  pos.xyz += (camRight * vertOffset.x) + (camUp * vertOffset.y);\n#elif USE_STRETCHED_BILLBOARD\n  vec3 camRight = normalize(cross(pos.xyz - eye, velocity.xyz));\n  vec3 camUp = velocity.xyz * velocityScale + normalize(velocity.xyz) * lengthScale * size;\n  pos.xyz += (camRight * abs(vertOffset.x) * sign(vertOffset.y)) - camUp * xIndex;\n#elif USE_HORIZONTAL_BILLBOARD\n  vec3 camRight = vec3(1, 0, 0);\n  vec3 camUp = vec3(0, 0, -1);\n  pos.xyz += (camRight * vertOffset.x) + (camUp * vertOffset.y);\n#elif USE_VERTICAL_BILLBOARD\n  vec3 camRight = normalize(vec3(view[0][0], view[1][0], view[2][0]));\n  vec3 camUp = vec3(0, 1, 0);\n  pos.xyz += (camRight * vertOffset.x) + (camUp * vertOffset.y);\n#else\n  pos.x += vertOffset.x;\n  pos.y += vertOffset.y;\n#endif\n}\nvec2 computeUV(float frameIndex, vec2 vertIndex, vec2 frameTile) {\n  vec2 aniUV = vec2(0, floor(frameIndex * frameTile.y));\n  aniUV.x = floor(frameIndex * frameTile.x * frameTile.y - aniUV.y * frameTile.x);\n  \n  vertIndex.x = 1. - vertIndex.x;\n  return (aniUV.xy + vertIndex) / vec2(frameTile.x, frameTile.y);\n}\nvoid rotateCorner(inout vec2 corner, float angle) {\n  float xOS = cos(angle) * corner.x - sin(angle) * corner.y;\n  float yOS = sin(angle) * corner.x + cos(angle) * corner.y;\n  corner.x = xOS;\n  corner.y = yOS;\n}\nattribute vec3 a_position; \nattribute vec3 a_texCoord;  \nattribute vec2 a_texCoord1; \nattribute vec4 a_color;\n#if USE_STRETCHED_BILLBOARD\nattribute vec3 a_color1; \n#endif\nvec4 lpvs_main() {\n  vec4 pos = vec4(a_position, 1);\n#if USE_STRETCHED_BILLBOARD\n  vec4 velocity = vec4(a_color1.xyz, 0);\n#endif\n#if !USE_WORLD_SPACE\n  pos = cc_matWorld * pos;\n  #if USE_STRETCHED_BILLBOARD\n  velocity = cc_matWorld * velocity;\n  #endif\n#endif\n  vec2 cornerOffset = vec2((a_texCoord.xy - 0.5) * a_texCoord1.x);\n#if !USE_STRETCHED_BILLBOARD\n  \n  rotateCorner(cornerOffset, a_texCoord1.y);\n#endif\n  computeVertPos(pos, cornerOffset\n  #if USE_BILLBOARD || USE_VERTICAL_BILLBOARD\n    , cc_matView\n  #endif\n  #if USE_STRETCHED_BILLBOARD\n    , cc_cameraPos.xyz\n    , velocity\n    , frameTile_velLenScale.z\n    , frameTile_velLenScale.w\n    , a_texCoord1.x\n    , a_texCoord.x\n  #endif\n  );\n  pos = cc_matViewProj * pos;\n  uv = computeUV(a_texCoord.z, a_texCoord.xy, frameTile_velLenScale.xy) * mainTiling_Offset.xy + mainTiling_Offset.zw;\n  color = a_color;\n  return pos;\n}\nvoid main() { gl_Position = lpvs_main(); }\n`,
          "frag": `\n  precision mediump float;\n  varying vec2 uv;\n  varying vec4 color;\n  uniform sampler2D mainTexture;\n    uniform vec4 tintColor;\n  vec4 add () {\n    return 2.0 * color * tintColor * texture2D(mainTexture, uv);\n  }\n  vec4 multiply () {\n    vec4 col;\n    vec4 texColor = texture2D(mainTexture, uv);\n    col.rgb = tintColor.rgb * texColor.rgb * color.rgb * vec3(2.0);\n    col.a = (1.0 - texColor.a) * (tintColor.a * color.a * 2.0);\n    return col;\n  }\nvoid main() { gl_FragColor = add(); }\n`
        },
        "defines": [
          {"name":"USE_BILLBOARD", "type":"boolean", "defines":[]},
          {"name":"USE_STRETCHED_BILLBOARD", "type":"boolean", "defines":[]},
          {"name":"USE_HORIZONTAL_BILLBOARD", "type":"boolean", "defines":[]},
          {"name":"USE_VERTICAL_BILLBOARD", "type":"boolean", "defines":[]},
          {"name":"USE_WORLD_SPACE", "type":"boolean", "defines":[]}
        ],
        "blocks": [
          {"name": "Constants", "size": 32, "defines": [], "binding": 0, "members": [
            {"name":"mainTiling_Offset", "type":16, "count":1, "size":16},
            {"name":"frameTile_velLenScale", "type":16, "count":1, "size":16}
          ]},
          {"name": "FragConstants", "size": 16, "defines": [], "binding": 1, "members": [
            {"name":"tintColor", "type":16, "count":1, "size":16}
          ]}
        ],
        "samplers": [
          {"name":"mainTexture", "type":29, "count":1, "defines":[], "binding":2}
        ],
        "dependencies": {}
      }
    ]
  },
  {
    "name": "builtin-skybox",
    "techniques": [
      {"passes":[{"rasterizerState":{"cullMode":0}, "depthStencilState":{"depthTest":true, "depthWrite":false}, "program":"builtin-skybox|sky-vs:vert|sky-fs:frag", "properties":{"cubeMap":{"type":32, "value":"default-cube"}}, "priority":10}]}
    ],
    "shaders": [
      {
        "name": "builtin-skybox|sky-vs:vert|sky-fs:frag",
        "glsl3": {
          "vert": `\n  precision mediump float;\n  in vec3 a_position;\n  \nuniform CCGlobal {\n  \n  vec4 cc_time; \n  vec4 cc_screenSize; \n  vec4 cc_screenScale; \n  \n  mat4 cc_matView;\n  mat4 cc_matViewInv;\n  mat4 cc_matProj;\n  mat4 cc_matProjInv;\n  mat4 cc_matViewProj;\n  mat4 cc_matViewProjInv;\n  vec4 cc_cameraPos; \n};\n  out vec3 viewDir;\n  vec4 vert () {\n    mat4 matViewRotOnly = mat4(mat3(cc_matView));\n    vec4 clipPos = cc_matProj * matViewRotOnly * vec4(a_position, 1.0);\n    viewDir = a_position;\n    vec4 pos = clipPos;\n    pos.z = clipPos.w * 0.99999;\n    return pos;\n  }\nvoid main() { gl_Position = vert(); }\n`,
          "frag": `\n  precision mediump float;\n  in vec3 viewDir;\n  uniform samplerCube cubeMap;\n  \nvec3 gammaToLinearSpaceRGB(vec3 sRGB) { \n  return sRGB * (sRGB * (sRGB * 0.305306011 + 0.682171111) + 0.012522878);\n}\nvec3 linearToGammaSpaceRGB(vec3 RGB) { \n  vec3 S1 = sqrt(RGB);\n  vec3 S2 = sqrt(S1);\n  vec3 S3 = sqrt(S2);\n  return 0.585122381 * S1 + 0.783140355 * S2 - 0.368262736 * S3;\n}\nvec4 gammaToLinearSpaceRGBA(vec4 sRGBA) {\n  return vec4(gammaToLinearSpaceRGB(sRGBA.rgb), sRGBA.a);\n}\nvec4 linearToGammaSpaceRGBA(vec4 RGBA) {\n  return vec4(linearToGammaSpaceRGB(RGBA.rgb), RGBA.a);\n}\nfloat gammaToLinearSpaceExact(float val) {\n  if (val <= 0.04045) {\n    return val / 12.92;\n  } else if (val < 1.0) {\n    return pow((val + 0.055) / 1.055, 2.4);\n  } else {\n    return pow(val, 2.2);\n  }\n}\nfloat linearToGammaSpaceExact(float val) {\n  if (val <= 0.0) {\n    return 0.0;\n  } else if (val <= 0.0031308) {\n    return 12.92 * val;\n  } else if (val < 1.0) {\n    return 1.055 * pow(val, 0.4166667) - 0.055;\n  } else {\n    return pow(val, 0.45454545);\n  }\n}\n  \nvec3 unpackNormal(vec4 nmap) {\n  return nmap.xyz * 2.0 - 1.0;\n}\nvec3 unpackRGBE(vec4 rgbe) {\n    return rgbe.rgb * pow(2.0, rgbe.a * 255.0 - 128.0);\n}\n  vec4 frag () {\n  #if USE_RGBE_CUBEMAP\n      vec3 c = unpackRGBE(texture(cubeMap, viewDir));\n      c = linearToGammaSpaceRGB(c / (1.0 + c));\n      return vec4(c, 1.0);\n  #else\n      return texture(cubeMap, viewDir);\n  #endif\n  }\nout vec4 cc_FragColor;\nvoid main() { cc_FragColor = frag(); }\n`
        },
        "glsl1": {
          "vert": `\n  precision mediump float;\n  attribute vec3 a_position;\n  \n  uniform vec4 cc_time;\n  uniform vec4 cc_screenSize;\n  uniform vec4 cc_screenScale;\n  uniform mat4 cc_matView;\n  uniform mat4 cc_matViewInv;\n  uniform mat4 cc_matProj;\n  uniform mat4 cc_matProjInv;\n  uniform mat4 cc_matViewProj;\n  uniform mat4 cc_matViewProjInv;\n  uniform vec4 cc_cameraPos;\n  varying vec3 viewDir;\n  vec4 vert () {\n    mat4 matViewRotOnly = mat4(mat3(cc_matView));\n    vec4 clipPos = cc_matProj * matViewRotOnly * vec4(a_position, 1.0);\n    viewDir = a_position;\n    vec4 pos = clipPos;\n    pos.z = clipPos.w * 0.99999;\n    return pos;\n  }\nvoid main() { gl_Position = vert(); }\n`,
          "frag": `\n  precision mediump float;\n  varying vec3 viewDir;\n  uniform samplerCube cubeMap;\n  \nvec3 gammaToLinearSpaceRGB(vec3 sRGB) { \n  return sRGB * (sRGB * (sRGB * 0.305306011 + 0.682171111) + 0.012522878);\n}\nvec3 linearToGammaSpaceRGB(vec3 RGB) { \n  vec3 S1 = sqrt(RGB);\n  vec3 S2 = sqrt(S1);\n  vec3 S3 = sqrt(S2);\n  return 0.585122381 * S1 + 0.783140355 * S2 - 0.368262736 * S3;\n}\nvec4 gammaToLinearSpaceRGBA(vec4 sRGBA) {\n  return vec4(gammaToLinearSpaceRGB(sRGBA.rgb), sRGBA.a);\n}\nvec4 linearToGammaSpaceRGBA(vec4 RGBA) {\n  return vec4(linearToGammaSpaceRGB(RGBA.rgb), RGBA.a);\n}\nfloat gammaToLinearSpaceExact(float val) {\n  if (val <= 0.04045) {\n    return val / 12.92;\n  } else if (val < 1.0) {\n    return pow((val + 0.055) / 1.055, 2.4);\n  } else {\n    return pow(val, 2.2);\n  }\n}\nfloat linearToGammaSpaceExact(float val) {\n  if (val <= 0.0) {\n    return 0.0;\n  } else if (val <= 0.0031308) {\n    return 12.92 * val;\n  } else if (val < 1.0) {\n    return 1.055 * pow(val, 0.4166667) - 0.055;\n  } else {\n    return pow(val, 0.45454545);\n  }\n}\n  \nvec3 unpackNormal(vec4 nmap) {\n  return nmap.xyz * 2.0 - 1.0;\n}\nvec3 unpackRGBE(vec4 rgbe) {\n    return rgbe.rgb * pow(2.0, rgbe.a * 255.0 - 128.0);\n}\n  vec4 frag () {\n  #if USE_RGBE_CUBEMAP\n      vec3 c = unpackRGBE(textureCube(cubeMap, viewDir));\n      c = linearToGammaSpaceRGB(c / (1.0 + c));\n      return vec4(c, 1.0);\n  #else\n      return textureCube(cubeMap, viewDir);\n  #endif\n  }\nvoid main() { gl_FragColor = frag(); }\n`
        },
        "defines": [
          {"name":"USE_RGBE_CUBEMAP", "type":"boolean", "defines":[]}
        ],
        "blocks": [],
        "samplers": [
          {"name":"cubeMap", "type":32, "count":1, "defines":[], "binding":0}
        ],
        "dependencies": {}
      }
    ]
  },
  {
    "name": "builtin-sprite",
    "techniques": [
      {"passes":[{"depthStencilState":{"depthTest":true, "depthWrite":false}, "blendState":{"targets":[{"blend":true, "blendSrc":2, "blendDst":4, "blendDstAlpha":4}]}, "program":"builtin-sprite|sprite-vs:vert|sprite-fs:frag", "properties":{"mainTexture":{"type":29, "value":"white"}}, "priority":244}]}
    ],
    "shaders": [
      {
        "name": "builtin-sprite|sprite-vs:vert|sprite-fs:frag",
        "glsl3": {
          "vert": `\n  precision mediump float;\n  \nuniform CCGlobal {\n  \n  vec4 cc_time; \n  vec4 cc_screenSize; \n  vec4 cc_screenScale; \n  \n  mat4 cc_matView;\n  mat4 cc_matViewInv;\n  mat4 cc_matProj;\n  mat4 cc_matProjInv;\n  mat4 cc_matViewProj;\n  mat4 cc_matViewProjInv;\n  vec4 cc_cameraPos; \n};\n  in vec3 a_position;\n  in vec2 a_texCoord;\n  in vec4 a_color;\n  out vec2 uv0;\n  out vec4 color;\n  vec4 vert () {\n    vec4 pos = vec4(a_position, 1);\n    pos = cc_matViewProj * pos;\n    uv0 = a_texCoord;\n    color = a_color;\n    return pos;\n  }\nvoid main() { gl_Position = vert(); }\n`,
          "frag": `\n  precision mediump float;\n  in vec2 uv0;\n  in vec4 color;\n  uniform sampler2D mainTexture;\n  vec4 frag () {\n    vec4 o = vec4(1, 1, 1, 1);\n    o *= texture(mainTexture, uv0);\n    o *= color;\n    return o;\n  }\nout vec4 cc_FragColor;\nvoid main() { cc_FragColor = frag(); }\n`
        },
        "glsl1": {
          "vert": `\n  precision mediump float;\n  \n  uniform vec4 cc_time;\n  uniform vec4 cc_screenSize;\n  uniform vec4 cc_screenScale;\n  uniform mat4 cc_matView;\n  uniform mat4 cc_matViewInv;\n  uniform mat4 cc_matProj;\n  uniform mat4 cc_matProjInv;\n  uniform mat4 cc_matViewProj;\n  uniform mat4 cc_matViewProjInv;\n  uniform vec4 cc_cameraPos;\n  attribute vec3 a_position;\n  attribute vec2 a_texCoord;\n  attribute vec4 a_color;\n  varying vec2 uv0;\n  varying vec4 color;\n  vec4 vert () {\n    vec4 pos = vec4(a_position, 1);\n    pos = cc_matViewProj * pos;\n    uv0 = a_texCoord;\n    color = a_color;\n    return pos;\n  }\nvoid main() { gl_Position = vert(); }\n`,
          "frag": `\n  precision mediump float;\n  varying vec2 uv0;\n  varying vec4 color;\n  uniform sampler2D mainTexture;\n  vec4 frag () {\n    vec4 o = vec4(1, 1, 1, 1);\n    o *= texture2D(mainTexture, uv0);\n    o *= color;\n    return o;\n  }\nvoid main() { gl_FragColor = frag(); }\n`
        },
        "defines": [],
        "blocks": [],
        "samplers": [
          {"name":"mainTexture", "type":29, "count":1, "defines":[], "binding":0}
        ],
        "dependencies": {}
      }
    ]
  },
  {
    "name": "builtin-unlit",
    "techniques": [
      {"name":"opaque", "passes":[{"program":"builtin-unlit|unlit-vs:vert|unlit-fs:frag", "properties":{"color":{"type":17, "value":[1, 1, 1, 1]}, "tilingOffset":{"type":16, "value":[1, 1, 0, 0]}, "mainTexture":{"type":29, "value":"grey"}}}]}
    ],
    "shaders": [
      {
        "name": "builtin-unlit|unlit-vs:vert|unlit-fs:frag",
        "glsl3": {
          "vert": `\n  precision mediump float;\n  \nuniform CCGlobal {\n  \n  vec4 cc_time; \n  vec4 cc_screenSize; \n  vec4 cc_screenScale; \n  \n  mat4 cc_matView;\n  mat4 cc_matViewInv;\n  mat4 cc_matProj;\n  mat4 cc_matProjInv;\n  mat4 cc_matViewProj;\n  mat4 cc_matViewProjInv;\n  vec4 cc_cameraPos; \n};\n  \nuniform CCLocal {\n  mat4 cc_matWorld;\n  mat4 cc_matWorldIT;\n};\n  #if CC_USE_SKINNING\n    \nin vec4 a_weights;\nin vec4 a_joints;\nuniform CCSkinning {\n  mat4 cc_matJoint[128];\n  vec4 cc_jointsTextureSize;\n};\n#if CC_USE_JOINTS_TEXTURE\nuniform sampler2D cc_jointsTexture;\nmat4 getBoneMatrix(const in float i) {\n  float size = cc_jointsTextureSize.x;\n  float j = i * 4.0;\n  float x = mod(j, size);\n  float y = floor(j / size);\n  float dx = 1.0 / size;\n  float dy = 1.0 / size;\n  y = dy * (y + 0.5);\n  vec4 v1 = texture(cc_jointsTexture, vec2(dx * (x + 0.5), y));\n  vec4 v2 = texture(cc_jointsTexture, vec2(dx * (x + 1.5), y));\n  vec4 v3 = texture(cc_jointsTexture, vec2(dx * (x + 2.5), y));\n  vec4 v4 = texture(cc_jointsTexture, vec2(dx * (x + 3.5), y));\n  return mat4(v1, v2, v3, v4);\n}\n#else\nmat4 getBoneMatrix(const in float i) {\n  return cc_matJoint[int(i)];\n}\n#endif\nmat4 skinMatrix() {\n  return\n    getBoneMatrix(a_joints.x) * a_weights.x +\n    getBoneMatrix(a_joints.y) * a_weights.y +\n    getBoneMatrix(a_joints.z) * a_weights.z +\n    getBoneMatrix(a_joints.w) * a_weights.w;\n}\nvoid skinVertex(inout vec4 a1) {\n  mat4 m = skinMatrix();\n  a1 = m * a1;\n}\nvoid skinVertex(inout vec4 a1, inout vec4 a2) {\n  mat4 m = skinMatrix();\n  a1 = m * a1;\n  a2 = m * a2;\n}\nvoid skinVertex(inout vec4 a1, inout vec4 a2, inout vec4 a3) {\n  mat4 m = skinMatrix();\n  a1 = m * a1;\n  a2 = m * a2;\n  a3 = m * a3;\n}\n  #endif\n  in vec3 a_position;\n  #if USE_TEXTURE\n    in vec2 a_texCoord;\n    out vec2 uv0;\n    uniform TexCoords {\n      vec4 tilingOffset;\n    };\n  #endif\n  vec4 vert () {\n    vec4 pos = vec4(a_position, 1);\n    #if CC_USE_SKINNING\n      skinVertex(pos);\n    #endif\n    pos = cc_matViewProj * cc_matWorld * pos;\n    #if USE_TEXTURE\n      uv0 = a_texCoord * tilingOffset.xy + tilingOffset.zw;\n    #endif\n    return pos;\n  }\nvoid main() { gl_Position = vert(); }\n`,
          "frag": `\n  precision mediump float;\n  #if USE_TEXTURE\n    in vec2 uv0;\n    uniform sampler2D mainTexture;\n  #endif\n  #if USE_COLOR\n    uniform Constant {\n      vec4 color;\n    };\n  #endif\n  vec4 frag () {\n    vec4 o = vec4(1, 1, 1, 1);\n    #if USE_TEXTURE\n      o *= texture(mainTexture, uv0);\n    #endif\n    #if USE_COLOR\n      o *= color;\n    #endif\n    return o;\n  }\nout vec4 cc_FragColor;\nvoid main() { cc_FragColor = frag(); }\n`
        },
        "glsl1": {
          "vert": `\n  precision mediump float;\n  \n  uniform vec4 cc_time;\n  uniform vec4 cc_screenSize;\n  uniform vec4 cc_screenScale;\n  uniform mat4 cc_matView;\n  uniform mat4 cc_matViewInv;\n  uniform mat4 cc_matProj;\n  uniform mat4 cc_matProjInv;\n  uniform mat4 cc_matViewProj;\n  uniform mat4 cc_matViewProjInv;\n  uniform vec4 cc_cameraPos;\n  \n  uniform mat4 cc_matWorld;\n  uniform mat4 cc_matWorldIT;\n  #if CC_USE_SKINNING\n    \nattribute vec4 a_weights;\nattribute vec4 a_joints;\n  uniform mat4 cc_matJoint[128];\n  uniform vec4 cc_jointsTextureSize;\n#if CC_USE_JOINTS_TEXTURE\nuniform sampler2D cc_jointsTexture;\nmat4 getBoneMatrix(const in float i) {\n  float size = cc_jointsTextureSize.x;\n  float j = i * 4.0;\n  float x = mod(j, size);\n  float y = floor(j / size);\n  float dx = 1.0 / size;\n  float dy = 1.0 / size;\n  y = dy * (y + 0.5);\n  vec4 v1 = texture2D(cc_jointsTexture, vec2(dx * (x + 0.5), y));\n  vec4 v2 = texture2D(cc_jointsTexture, vec2(dx * (x + 1.5), y));\n  vec4 v3 = texture2D(cc_jointsTexture, vec2(dx * (x + 2.5), y));\n  vec4 v4 = texture2D(cc_jointsTexture, vec2(dx * (x + 3.5), y));\n  return mat4(v1, v2, v3, v4);\n}\n#else\nmat4 getBoneMatrix(const in float i) {\n  return cc_matJoint[int(i)];\n}\n#endif\nmat4 skinMatrix() {\n  return\n    getBoneMatrix(a_joints.x) * a_weights.x +\n    getBoneMatrix(a_joints.y) * a_weights.y +\n    getBoneMatrix(a_joints.z) * a_weights.z +\n    getBoneMatrix(a_joints.w) * a_weights.w;\n}\nvoid skinVertex(inout vec4 a1) {\n  mat4 m = skinMatrix();\n  a1 = m * a1;\n}\nvoid skinVertex(inout vec4 a1, inout vec4 a2) {\n  mat4 m = skinMatrix();\n  a1 = m * a1;\n  a2 = m * a2;\n}\nvoid skinVertex(inout vec4 a1, inout vec4 a2, inout vec4 a3) {\n  mat4 m = skinMatrix();\n  a1 = m * a1;\n  a2 = m * a2;\n  a3 = m * a3;\n}\n  #endif\n  attribute vec3 a_position;\n  #if USE_TEXTURE\n    attribute vec2 a_texCoord;\n    varying vec2 uv0;\n      uniform vec4 tilingOffset;\n  #endif\n  vec4 vert () {\n    vec4 pos = vec4(a_position, 1);\n    #if CC_USE_SKINNING\n      skinVertex(pos);\n    #endif\n    pos = cc_matViewProj * cc_matWorld * pos;\n    #if USE_TEXTURE\n      uv0 = a_texCoord * tilingOffset.xy + tilingOffset.zw;\n    #endif\n    return pos;\n  }\nvoid main() { gl_Position = vert(); }\n`,
          "frag": `\n  precision mediump float;\n  #if USE_TEXTURE\n    varying vec2 uv0;\n    uniform sampler2D mainTexture;\n  #endif\n  #if USE_COLOR\n      uniform vec4 color;\n  #endif\n  vec4 frag () {\n    vec4 o = vec4(1, 1, 1, 1);\n    #if USE_TEXTURE\n      o *= texture2D(mainTexture, uv0);\n    #endif\n    #if USE_COLOR\n      o *= color;\n    #endif\n    return o;\n  }\nvoid main() { gl_FragColor = frag(); }\n`
        },
        "defines": [
          {"name":"CC_USE_SKINNING", "type":"boolean", "defines":[]},
          {"name":"CC_USE_JOINTS_TEXTURE", "type":"boolean", "defines":["CC_USE_SKINNING"]},
          {"name":"USE_TEXTURE", "type":"boolean", "defines":[]},
          {"name":"USE_COLOR", "type":"boolean", "defines":[]}
        ],
        "blocks": [
          {"name": "TexCoords", "size": 16, "defines": ["USE_TEXTURE"], "binding": 0, "members": [
            {"name":"tilingOffset", "type":16, "count":1, "size":16}
          ]},
          {"name": "Constant", "size": 16, "defines": ["USE_COLOR"], "binding": 1, "members": [
            {"name":"color", "type":16, "count":1, "size":16}
          ]}
        ],
        "samplers": [
          {"name":"mainTexture", "type":29, "count":1, "defines":["USE_TEXTURE"], "binding":2}
        ],
        "dependencies": {}
      }
    ]
  }
];
