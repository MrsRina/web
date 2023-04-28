var canvas = document.getElementById("webgl-context");
var gl = canvas.getContext("webgl");
var glext = gl.getExtension("OES_vertex_array_object");

// Install the gl extensions.
if (glext) {
    gl["createVertexArray"] = function() {return glext["createVertexArrayOES"](); };
    gl["deleteVertexArray"] = function(vao) { glext["deleteVertexArrayOES"](vao); };
    gl["bindVertexArray"] = function(vao) { glext["bindVertexArrayOES"](vao); };
    gl["isVertexArray"] = function(vao) { return glext["isVertexArrayOES"](vao); };
}

var mposx = 0.0;
var mposy = 0.0;

document.addEventListener("mousemove", function(event) {
    mposx = event.clientX;
    mposy = event.clientY;
});

function getcharfromint(integer) {
    const code = ' '.charCodeAt(0);
    return String.fromCharCode(code + integer);
}

function getcharcodefromint(integer) {
    return ' '.charCodeAt(0) + integer;
}

class vokeprogram {
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

    setuniformvec2(uniformname, vec) {
        gl.uniform2f(gl.getUniformLocation(this.id, uniformname), vec[0], vec[1]);
    }

    setuniformmat4(uniformname, mat) {
        gl.uniformMatrix4fv(gl.getUniformLocation(this.id, uniformname), false, mat);
    }

    invoke() {
        gl.useProgram(this.id);    
    }

    revoke() {
        gl.useProgram(null);
    }
};

class vokebuffer {
    constructor() {
        this.buffermap = new Map();
        this.contextbufferinfo = [];
        this.indexingrendering = false;
        this.vao = 0;
        this.stride = [];
        this.primitive = [];
    }

    setstride(x, y, z) {
        this.stride[0] = x;
        this.stride[1] = y;
        this.stride[2] = z;
    }

    setprimitive(array) {
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

    bind(key, buffertype) {
        if (!this.buffermap.has(key)) {
            this.buffermap[key] = gl.createBuffer();
        }

        gl.bindBuffer(buffertype[0], this.buffermap[key]);
        this.contextbufferinfo = buffertype;

        if (buffertype[0] == gl.ELEMENT_ARRAY_BUFFER) {
            this.indexingrendering = true;
            this.primitive[1] = buffertype[1];
        }
    }

    send(data, mode) {
        gl.bufferData(this.contextbufferinfo[0], data, mode);
    }

    edit(bufferstride, data) {
        gl.bufferSubData(this.contextbufferinfo[0], bufferstride, data)
    }

    attach(location, vec, locationStride) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, vec, this.contextbufferinfo[1], false, locationStride[0], locationStride[1]);
    }

    unbind() {
        gl.bindBuffer(this.contextbufferinfo[0], 0);
    }

    draw() {
        if (this.indexingrendering) {
            gl.drawElements(this.primitive[0], this.stride[1], this.primitive[1], this.stride[0]);
        } else {
            gl.drawArrays(this.primitive[0], this.stride[0], this.stride[1]);
        }
    }
}

class vokefontrenderer {
    constructor(url, fontsize) {
        this.glyphdata = {};
        this.fontface = fetch(url).then(res => res.arrayBuffer()).then(buffer => {
            const font = opentype.parse(buffer)
            console.log(font.supported);
            var x = 0;

            for (var i = 0; i < 95; i++ ) {
                var glyph = font.charToGlyph(getcharfromint(i));
                var path = glyph.getPath(0, 0, 95);
                var boundingbox = path.getBoundingBox();
                var advance = glyph.advanceWidth * fontsize / glyph.path.unitsPerEm;
                var glyphcanvas = document.createElement('canvas');
                var glyphcontext = glyphcanvas.getContext('2d');

                glyphcanvas.width = fontsize;
                glyphcanvas.height = fontsize;

                glyph.draw(glyphcontext, fontsize / 2 - boundingbox.x1, fontsize / 2 + boundingbox.y2);
                glyphdata[getcharcodefromint(i)] = {
                    canvas: glyphcanvas,
                    boundingbox: boundingbox,
                    advance: advance,
                    width: fontsize,
                    height: fontsize
                };

                x += advance;
            }

            var atlascanvas = document.createElement('canvas');
            var atlascontext = atlascanvas.getContext('2d');
            var atlassize = Math.pow(2, Math.ceil(Math.log2(x)));

            atlascanvas.width = atlassize;
            atlascanvas.height = fontsize;

            var atlasdata = {};
            x = 0;

            for (var i = 0; i < 95; i++) {
                charcode = getcharcodefromint(i);
                var glyph = this.glyphdata[getcharcodefromint()]
                atlascontext.drawImage(glyph);
            }
        });


    }
};

var vokefontrendering = new vokefontrenderer("https://mrsrina.github.io/web/assets/JetBrainsMono-Bold.ttf");
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
        gl_Position = uMVP  * vec4(aPos, 1.0);
        vPos = aPos;
        gl_PointSize = noise(vec2(0.0, gl_Position.z * 6.0)) * 3.0;
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

canvas.style.width = "100%";
canvas.style.height = "100%"

canvas.width = 1280;
canvas.height = 720;

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

    requestAnimationFrame(onrender);
}

// Request animation to start rendering loop
requestAnimationFrame(onrender);