// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

#include <gamma-correction.frag>

uniform vec3 eye;
uniform vec4 color;

varying vec3 normal_w;
varying vec3 pos_w;
varying vec3 pos_l;

mat3 transpose(mat3 v) {
    mat3 tmp;
    tmp[0] = vec3(v[0].x, v[1].x, v[2].x);
    tmp[1] = vec3(v[0].y, v[1].y, v[2].y);
    tmp[2] = vec3(v[0].z, v[1].z, v[2].z);

    return tmp;
}

float IntegrateEdge(vec3 v1, vec3 v2) {
    float cosTheta = dot(v1, v2);
    float theta = acos(cosTheta);
    float res = cross(v1, v2).z * ((theta > 0.001) ? theta/sin(theta) : 4.0);

    return res;
}

void ClipQuadToHorizon(inout vec3 L[5], out int n) {
    // detect clipping config
    int config = 0;
    if (L[0].z > 0.0) config += 1;
    if (L[1].z > 0.0) config += 2;
    if (L[2].z > 0.0) config += 4;
    if (L[3].z > 0.0) config += 8;
    config = 15;

    // clip
    n = 0;

    if (config == 0)
    {
        // clip all
    }
    else if (config == 1) // V1 clip V2 V3 V4
    {
        n = 3;
        L[1] = -L[1].z * L[0] + L[0].z * L[1];
        L[2] = -L[3].z * L[0] + L[0].z * L[3];
    }
    else if (config == 2) // V2 clip V1 V3 V4
    {
        n = 3;
        L[0] = -L[0].z * L[1] + L[1].z * L[0];
        L[2] = -L[2].z * L[1] + L[1].z * L[2];
    }
    else if (config == 3) // V1 V2 clip V3 V4
    {
        n = 4;
        L[2] = -L[2].z * L[1] + L[1].z * L[2];
        L[3] = -L[3].z * L[0] + L[0].z * L[3];
    }
    else if (config == 4) // V3 clip V1 V2 V4
    {
        n = 3;
        L[0] = -L[3].z * L[2] + L[2].z * L[3];
        L[1] = -L[1].z * L[2] + L[2].z * L[1];
    }
    else if (config == 5) // V1 V3 clip V2 V4) impossible
    {
        n = 0;
    }
    else if (config == 6) // V2 V3 clip V1 V4
    {
        n = 4;
        L[0] = -L[0].z * L[1] + L[1].z * L[0];
        L[3] = -L[3].z * L[2] + L[2].z * L[3];
    }
    else if (config == 7) // V1 V2 V3 clip V4
    {
        n = 5;
        L[4] = -L[3].z * L[0] + L[0].z * L[3];
        L[3] = -L[3].z * L[2] + L[2].z * L[3];
    }
    else if (config == 8) // V4 clip V1 V2 V3
    {
        n = 3;
        L[0] = -L[0].z * L[3] + L[3].z * L[0];
        L[1] = -L[2].z * L[3] + L[3].z * L[2];
        L[2] =  L[3];
    }
    else if (config == 9) // V1 V4 clip V2 V3
    {
        n = 4;
        L[1] = -L[1].z * L[0] + L[0].z * L[1];
        L[2] = -L[2].z * L[3] + L[3].z * L[2];
    }
    else if (config == 10) // V2 V4 clip V1 V3) impossible
    {
        n = 0;
    }
    else if (config == 11) // V1 V2 V4 clip V3
    {
        n = 5;
        L[4] = L[3];
        L[3] = -L[2].z * L[3] + L[3].z * L[2];
        L[2] = -L[2].z * L[1] + L[1].z * L[2];
    }
    else if (config == 12) // V3 V4 clip V1 V2
    {
        n = 4;
        L[1] = -L[1].z * L[2] + L[2].z * L[1];
        L[0] = -L[0].z * L[3] + L[3].z * L[0];
    }
    else if (config == 13) // V1 V3 V4 clip V2
    {
        n = 5;
        L[4] = L[3];
        L[3] = L[2];
        L[2] = -L[1].z * L[2] + L[2].z * L[1];
        L[1] = -L[1].z * L[0] + L[0].z * L[1];
    }
    else if (config == 14) // V2 V3 V4 clip V1
    {
        n = 5;
        L[4] = -L[0].z * L[3] + L[3].z * L[0];
        L[0] = -L[0].z * L[1] + L[1].z * L[0];
    }
    else if (config == 15) // V1 V2 V3 V4
    {
        n = 4;
    }
    
    if (n == 3)
        L[3] = L[0];
    if (n == 4)
        L[4] = L[0];
}

vec3 LTC_Evaluate(vec3 N, vec3 V, vec3 P, mat3 Minv, vec3 points[4]) {
    // construct orthonormal basis around N
    vec3 T1, T2;
    T1 = normalize(V - N*dot(V, N));
    T2 = cross(N, T1);

    // rotate area light in (T1, T2, N) basis
    Minv = Minv * transpose(mat3(T1, T2, N));

    // polygon (allocate 5 vertices for clipping)
    vec3 L[5];
    L[0] = Minv * (points[0] - P);
    L[1] = Minv * (points[1] - P);
    L[2] = Minv * (points[2] - P);
    L[3] = Minv * (points[3] - P);

    int n;
    ClipQuadToHorizon(L, n);
    
    if (n == 0)
        return vec3(0, 0, 0);

    // project onto sphere
    L[0] = normalize(L[0]);
    L[1] = normalize(L[1]);
    L[2] = normalize(L[2]);
    L[3] = normalize(L[3]);
    L[4] = normalize(L[4]);

    // integrate
    float sum = 0.0;

    sum += IntegrateEdge(L[0], L[1]);
    sum += IntegrateEdge(L[1], L[2]);
    sum += IntegrateEdge(L[2], L[3]);
    if (n >= 4)
        sum += IntegrateEdge(L[3], L[4]);
    if (n == 5)
        sum += IntegrateEdge(L[4], L[0]);

    sum = max(0.0, sum);

    vec3 Lo_i = vec3(sum, sum, sum);

    return Lo_i;
}

#if PLANE_CONTROLLER
    #include <common.frag>
    uniform float width;
    uniform float height;
    uniform float rotx;
    uniform float roty;
    uniform vec3 center;
    vec3 rotation_x(vec3 v, float a) {
        vec3 r;
        r.x =  v.x;
        r.y =  v.y*cos(a) - v.z*sin(a);
        r.z =  v.y*sin(a) + v.z*cos(a);
        return r;
    }
    vec3 rotation_y(vec3 v, float a) {
        vec3 r;
        r.x =  v.x*cos(a) + v.z*sin(a);
        r.y =  v.y;
        r.z = -v.x*sin(a) + v.z*cos(a);
        return r;
    }
    vec3 rotation_xy(vec3 v, float ax, float ay) {
        return rotation_y(rotation_x(v, ax), ay);
    }
    struct Rect {
        vec3  center;
        vec3  dirx;
        vec3  diry;
        float halfx;
        float halfy;
    };
    void InitRect(out Rect rect)
    {
        rect.center = center;
        rect.dirx = rotation_xy(vec3(1, 0, 0), rotx * PI2, roty * PI2);
        rect.diry = rotation_xy(vec3(0, 1, 0), rotx * PI2, roty * PI2);
        rect.halfx  = 0.5 * width;
        rect.halfy  = 0.5 * height;
    }
    void InitRectPoints(Rect rect, out vec3 points[4])
    {
        vec3 ex = rect.halfx * rect.dirx;
        vec3 ey = rect.halfy * rect.diry;

        points[0] = rect.center - ex - ey;
        points[1] = rect.center + ex - ey;
        points[2] = rect.center + ex + ey;
        points[3] = rect.center - ex + ey;
    }
#endif

void main () {
    vec3 N = normalize(normal_w);
    vec3 V = normalize(eye - pos_w);

    // vec3 L = normalize(vec3(1, 2, 3));
    // vec3 diffuse = color.rgb * (0.2 + max(0.0, dot(N, L)) * 0.8);

    vec3 points[4];
    #if PLANE_CONTROLLER
        Rect rect;
        InitRect(rect);
        InitRectPoints(rect, points);
    #else
        // { center: (30, 40, 50), width: 40, height: 40, rotx: -0.125, roty: 0.125 }
        points[0] = vec3(25.86, 25.86, 74.14);
        points[1] = vec3(54.14, 25.86, 45.86);
        points[2] = vec3(34.14, 54.14, 25.86);
        points[3] = vec3(5.86, 54.14, 54.14);
    #endif

    vec3 diffuse = color.rgb * (0.2 + LTC_Evaluate(N, V, pos_l, mat3(1), points) * 0.8);

    gl_FragColor = linearToGammaSpaceRGBA(vec4(diffuse, color.a));
}
