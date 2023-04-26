
var canvas = document.getElementById("webgl-context");
var gl = canvas.getContext("webgl");
var glExt = gl.getExtension("OES_vertex_array_object");

// Install the gl extensions.
if (glExt) {
    gl["createVertexArray"] = function() {return glExt["createVertexArrayOES"](); };
    gl["deleteVertexArray"] = function(vao) { glExt["deleteVertexArrayOES"](vao); };
    gl["bindVertexArray"] = function(vao) { glExt["bindVertexArrayOES"](vao); };
    gl["isVertexArray"] = function(vao) { return glExt["isVertexArrayOES"](vao); };
}

var mposx = 0.0;
var mposy = 0.0;

document.addEventListener("mousemove", function(event) {
    mposx = event.clientX;
    mposy = event.clientY;
});

class VokeProgram {
    constructor(shaders) {
        this.id = gl.createProgram();
        shaders.forEach((key, value) => {
            const shader = gl.createShader(key);
            gl.shaderSource(shader, value);
            gl.compileShader(shader);
            gl.attachShader(this.id, shader);
        });

        gl.linkProgram(this.id);
    }

    setUniformVec2(uniformName, vec) {
        gl.uniform2f(gl.getUniformLocation(this.id, uniformName), vec[0], vec[1]);
    }

    setUniformMat4(uniformName, mat) {
        gl.uniformMatrix4fv(gl.getUniformLocation(this.id, uniformName), false, mat);
    }

    invoke() {
        gl.useProgram(this.id);    
    }

    revoke() {
        gl.useProgram(null);
    }
};

class VokeBuffer {
    constructor() {
        this.bufferMap = new Map();
        this.contextBufferInfo = [];
        this.indexingRendering = false;
        this.vao = 0;
        this.stride = [];
        this.primitive = [];
    }

    setStride(x, y, z) {
        this.stride[0] = x;
        this.stride[1] = y;
        this.stride[2] = z;
    }

    setPrimitive(array) {
        this.primitive[0] = array;
    }

    invoke() {
        if (this.vao == 0) {
            this.vao = gl.createVertexArray();
        }

        gl.bindVertexArray(this.vao);
    }

    revoke() {
        gl.bindVertexArray(null);
    }

    bind(key, bufferType) {
        if (!this.bufferMap.has(key)) {
            this.bufferMap[key] = gl.createBuffer();
        }

        gl.bindBuffer(bufferType[0], this.bufferMap[key]);
        this.contextBufferInfo = bufferType;

        if (bufferType[0] == gl.ELEMENT_ARRAY_BUFFER) {
            this.indexingRendering = true;
            this.primitive[1] = bufferType[1];
        }
    }

    send(data, mode) {
        gl.bufferData(this.contextBufferInfo[0], data, mode);
    }

    edit(bufferStride, data) {
        gl.bufferSubData(this.contextBufferInfo[0], bufferStride, data)
    }

    attach(location, vec, locationStride) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, vec, this.contextBufferInfo[1], false, locationStride[0], locationStride[1]);
    }

    unbind() {
        gl.bindBuffer(this.contextBufferInfo[0], 0);
    }

    draw() {
        if (this.indexingRendering) {
            gl.drawElements(this.primitive[0], this.stride[1], this.primitive[1], this.stride[0]);
        } else {
            gl.drawArrays(this.primitive[0], this.stride[0], this.stride[1]);
        }
    }
}

programEffects = new VokeProgram(new Map([
    [`
    attribute vec3 aPos;
    varying vec3 vPos;
    uniform mat4 uMVP;

    void main() {
        gl_Position = uMVP  * vec4(aPos, 1.0);
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
        float f = noise(vec2(length((rand(vec2(-2.0, 663.0))) * 0.2 - vPos.xy * uTickingPos.x)));
        gl_FragColor = (vec4(sin(1.0 - f), noise(vec2(uTickingPos.x * length(rand(vec2(-2.0, 663.0))))), 123233230.0, 1.0)) * (1.0 / vPos.z);
    }`, gl.FRAGMENT_SHADER]
]));

bufferQuad = new VokeBuffer();
bufferQuad.setPrimitive(gl.POINT);

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

bufferQuad.setStride(0, vertices.length / 3, 0);
bufferQuad.invoke();
bufferQuad.bind(0, [gl.ARRAY_BUFFER, gl.FLOAT]);
bufferQuad.send(new Float32Array(vertices), gl.STATIC_DRAW);
bufferQuad.attach(0, 3, [0, 0]);

//bufferQuad.bind(0, [gl.ELEMENT_ARRAY_BUFFER, gl.INT]);
//bufferQuad.send(new Int32Array(indices), gl.STATIC_DRAW);
bufferQuad.revoke();

var tickingPos = [0.0, 0.0];
var trsMatrix = glMatrix.mat4;
var projMatrix = glMatrix.mat4;

canvas.style.width = "100%";
canvas.style.height = "100%"

canvas.width = 1280;
canvas.height = 720;

console.log(canvas.width);

// the main renderer function.
function onRender() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.tickingPos[0] += 0.001;
    this.tickingPos[1] -= 1.0;

    projMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projMatrix, 1.5707963267948966, canvas.width / canvas.height, 0.1, 100.0);

    trsMatrix = glMatrix.mat4.create();
    glMatrix.mat4.rotateX(trsMatrix, trsMatrix, this.tickingPos[0]);
    glMatrix.mat4.rotateY(trsMatrix, trsMatrix, this.tickingPos[0]);
    glMatrix.mat4.rotateZ(trsMatrix, trsMatrix, this.tickingPos[0]);
    glMatrix.mat4.translate(trsMatrix, trsMatrix, [-1.0, -1.0, -1.0]);
    glMatrix.mat4.scale(trsMatrix, trsMatrix, [2.0, 2.0, 2.0]);
    glMatrix.mat4.multiply(projMatrix, projMatrix, trsMatrix)
    
    programEffects.invoke();
    programEffects.setUniformVec2("uMousePos", [this.mposx, this.mposy]);
    programEffects.setUniformVec2("uTickingPos", this.tickingPos);
    programEffects.setUniformMat4("uMVP", projMatrix);

    bufferQuad.invoke();
    bufferQuad.draw();
    bufferQuad.revoke();
    programEffects.revoke();

    requestAnimationFrame(onRender);
}

// Request animation to start rendering loop
requestAnimationFrame(onRender);