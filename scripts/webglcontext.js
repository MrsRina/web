var canvas = document.getElementById("webgl-context");

var mposx = 0.0;
var mposy = 0.0;

document.addEventListener("mousemove", function(event) {
    mposx = event.clientX;
    mposy = event.clientY;
});

function updateorthomatrix(width, height) {
    var left = 0.0;
    var right = width;
    var bottom = height;
    var top = 0.0;
    var near = 0.0;
    var far = 1.0;

    return [
        2.0 / (right - left), 0.0, 0.0, 0.0,
        0.0, 2.0 / (top - bottom), 0.0, 0.0,
        0.0, 0.0, (-2.0) / (far - near), 0.0,
        -((right + left) / (right - left)), -((top + bottom) / (top - bottom)), -((far + near)/(far - near)),  1.0
    ];
}

var batch = new vokebatch();
var vokefontrendering = new vokefontrenderer("https://mrsrina.github.io/web/assets/JetBrainsMono-Bold.ttf", 18);
var batchprogram = new vokeprogram(new Map([
    [`
    attribute vec2 aPos;
    attribute vec2 aTexCoord;

    uniform mat4 uMVP;
    uniform vec4 uRect;
    varying vec2 vTexCoord;

    void main() {
        if (uRect.z == 0.0 && uRect.w == 0.0) {
            gl_Position = uMVP * vec4(aPos, 0.0, 1.0);
        } else {
            gl_Position = uMVP * vec4((aPos * uRect.zw) + uRect.xy, 0.0, 1.0);
        }

        vTexCoord = aTexCoord;
    }
    `, gl.VERTEX_SHADER],
    [`
    precision mediump float;
    varying vec2 vTexCoord;
    uniform vec4 uColor;

    void main() {
        gl_FragColor = uColor;
    }
    `, gl.FRAGMENT_SHADER]
]));

var programeffects = new vokeprogram(new Map([
    [`
    attribute vec3 aPos;
    varying vec3 vPos;
    uniform mat4 uMVP;

    float rand(vec2 co) {
        return fract(tan(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    vec3 hash3(vec3 n) {
        return fract(sin(n) * 1399763.5453123);
    }
    
    vec3 hpos(vec3 n) {
        return hash3(vec3(dot(n, vec3(157.0, 113.0, 271.0)), dot(n, vec3(311.0, 337.0, 179.0)), dot(n, vec3(271.0, 557.0, 431.0))));
    }
    
    vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec4 permute(vec4 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
    }
    
    vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
    }
    
    vec2 fade(vec2 t) {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }
    
    float noise4D(vec2 p) {
        vec4 Pi = floor(p.xyxy) + vec4(0.0, 0.0, 0.0, 1.0);
        vec4 Pf = fract(p.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    
        Pi = mod289(Pi);
    
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
    
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
    
        vec2 g00 = vec2(gx.x, gy.x);
        vec2 g10 = vec2(gx.y, gy.y);
        vec2 g01 = vec2(gx.z, gy.z);
        vec2 g11 = vec2(gx.w, gy.w);
        vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
        g00 *= norm.x;
        g01 *= norm.y;
        g10 *= norm.z;
        g11 *= norm.z;
    
        float n00 = dot(g00, vec2(fx.x, fy.y));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
    
        vec2 fade_xy = fade(Pf.xy);
        vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
        float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
        return 2.3 * n_xy;
    }
    
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
    
        float a = rand(i);
        float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0));
        float d = rand(i + vec2(1.0, 1.0));
    
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
        gl_Position = uMVP * vec4(aPos, 1.0);
        vPos = aPos;
        gl_PointSize = 1.0;
    }
    `, gl.VERTEX_SHADER],
    [`
    precision mediump float;

    float rand(vec2 co) {
        return fract(tan(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    vec3 hash3(vec3 n) {
        return fract(sin(n) * 1399763.5453123);
    }
    
    vec3 hpos(vec3 n) {
        return hash3(vec3(dot(n, vec3(157.0, 113.0, 271.0)), dot(n, vec3(311.0, 337.0, 179.0)), dot(n, vec3(271.0, 557.0, 431.0))));
    }
    
    vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec4 permute(vec4 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
    }
    
    vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
    }
    
    vec2 fade(vec2 t) {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }
    
    float noise4D(vec2 p) {
        vec4 Pi = floor(p.xyxy) + vec4(0.0, 0.0, 0.0, 1.0);
        vec4 Pf = fract(p.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    
        Pi = mod289(Pi);
    
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
    
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
    
        vec2 g00 = vec2(gx.x, gy.x);
        vec2 g10 = vec2(gx.y, gy.y);
        vec2 g01 = vec2(gx.z, gy.z);
        vec2 g11 = vec2(gx.w, gy.w);
        vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
        g00 *= norm.x;
        g01 *= norm.y;
        g10 *= norm.z;
        g11 *= norm.z;
    
        float n00 = dot(g00, vec2(fx.x, fy.y));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
    
        vec2 fade_xy = fade(Pf.xy);
        vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
        float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
        return 2.3 * n_xy;
    }
    
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
    
        float a = rand(i);
        float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0));
        float d = rand(i + vec2(1.0, 1.0));
    
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    uniform vec2 uMousePos;
    uniform vec2 uTickingPos;
    varying vec3 vPos;

    void main() {
        float dist = length(gl_FragCoord.xy - uMousePos);

        float f = noise(vec2(length((rand(vec2(-2.0, 663.0))) * 0.2 - vPos.xy * uTickingPos.x)));
        gl_FragColor = (vec4(sin(1.0 - f), noise(vec2(uTickingPos.x * length(rand(vec2(-2.0, 663.0))))), 123233230.0, 1.0)) * (1.0 / vPos.z);
    }`, gl.FRAGMENT_SHADER]
]));

canvas.style.width = "100%";
canvas.style.height = "100%";

canvas.width = 1280;
canvas.height = 720;

var mat4x4ortho = updateorthomatrix(canvas.width, canvas.height);

batch.attachprogram(batchprogram.id);
batch.mat4x4mvp = mat4x4ortho;

batch.invoke();
batch.call({
    rect: [20, 20, 200, 200],
    color: [1.0, 1.0, 1.0, 1.0],
    stride: [0, 6]
});

batch.pop();

batch.call({
    rect: [70, 300, 200, 200],
    color: [1.0, 0.0, 1.0, 1.0]
});

batch.pop();

batch.call({
    rect: [240, 70, 200, 200],
    color: [0.0, 0.0, 1.0, 1.0]
});

batch.pop();
batch.revoke();

var bufferquad = new vokebuffer();
bufferquad.setprimitive(gl.POINT);

var vertices = [];
var volume = [64, 64, 64];

for (var x = 0; x < volume[0]; x++) {
    for (var y = 0; y < volume[1]; y++) {
        for (var z = 0; z < volume[2]; z++) {
            vertices.push(x / volume[0]);
            vertices.push(y / volume[1]);
            vertices.push(z / volume[2]);
        }
    }
}

bufferquad.setstride(0, vertices.length / 3, 0);
bufferquad.invoke();
bufferquad.bind(0, [gl.ARRAY_BUFFER, gl.FLOAT]);
bufferquad.send(new Float32Array(vertices), gl.STATIC_DRAW);
bufferquad.attach(0, 3, [0, 0]);
bufferquad.revoke();

var tickingpos = [Math.random() * Math.PI * 2.2848, 0.0];
var trsmatrix = glMatrix.mat4;
var projectionmatrix = glMatrix.mat4;

// the main renderer function.
function onrender() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    tickingpos[0] += 0.001;
    tickingpos[1] -= 0.001;

    projectionmatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionmatrix, 1.5707963267948966 /* 90 degree */, canvas.width / canvas.height, 0.1, 100.0);

    trsmatrix = glMatrix.mat4.create();
    glMatrix.mat4.rotateX(trsmatrix, trsmatrix, tickingpos[0]);
    glMatrix.mat4.rotateY(trsmatrix, trsmatrix, tickingpos[0]);
    glMatrix.mat4.rotateZ(trsmatrix, trsmatrix, tickingpos[0]);
    glMatrix.mat4.translate(trsmatrix, trsmatrix, [-1.0, -1.0, -1.0]);
    glMatrix.mat4.scale(trsmatrix, trsmatrix, [2.0, 2.0, 2.0]);
    glMatrix.mat4.multiply(projectionmatrix, projectionmatrix, trsmatrix);
    
    programeffects.invoke();
    programeffects.setuniformvec2("uMousePos", [mposx, mposy]);
    programeffects.setuniformvec2("uTickingPos", tickingpos);
    programeffects.setuniformmat4("uMVP", projectionmatrix);

    bufferquad.invoke();
    bufferquad.draw();
    bufferquad.revoke();
    programeffects.revoke();

    //vokefontrendering.draw("hi!!!", 10, 10, [255, 255, 255, 255]);

    batch.draw();

    requestAnimationFrame(onrender);
}

// Request animation to start rendering loop
requestAnimationFrame(onrender);