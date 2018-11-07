// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.  
 
uniform mat4 viewProj;

#ifdef use2DPos
attribute vec2 a_position;
#else
attribute vec3 a_position;
#endif

attribute lowp vec4 a_color;

#ifdef useModel
  uniform mat4 model;
#endif

#ifdef useTexture
  attribute mediump vec2 a_uv0;
  varying mediump vec2 uv0;
#endif

#ifndef useColor
varying lowp vec4 v_fragmentColor;
#endif

void main () {
  mat4 mvp;
  #ifdef useModel
    mvp = viewProj * model;
  #else
    mvp = viewProj;
  #endif

  #ifdef use2DPos
  vec4 pos = mvp * vec4(a_position, 0, 1);
  #else
  vec4 pos = mvp * vec4(a_position, 1);
  #endif

  #ifndef useColor
  v_fragmentColor = a_color;
  #endif

  #ifdef useTexture
    uv0 = a_uv0;
  #endif

  gl_Position = pos;
}