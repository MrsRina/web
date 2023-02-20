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

class VokeBuffer {
    constructor() {
        this.bufferList = {};
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
        if (this.bufferList[key] == 0) {
            this.bufferList[key] = gl.createBuffer();
        }

        gl.bindBuffer(bufferType[0], this.bufferList[key]);
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

class VokeShader {
    constructor(tag = null) {
        self.tag = tag;
    }
}

var vertices = [
    0.0, 0.0,
    0.0, 100.0,
    100.0, 0.0,
    100.0, 100.0
]

var indices = [
    0, 1, 3,
    3, 2, 0
]

bufferQuad = new VokeBuffer();
bufferQuad.setStride(0, 6, 0);
bufferQuad.setPrimitive(gl.TRIANGLES);

bufferQuad.invoke();
bufferQuad.bind(0, [gl.ARRAY_BUFFER, gl.FLOAT]);
bufferQuad.send(new Float32Array(vertices), gl.STATIC_DRAW);
bufferQuad.attach(0, 2, [0, 0]);

bufferQuad.bind(0, [gl.ELEMENT_ARRAY_BUFFER, gl.FLOAT]);
bufferQuad.send(new Float32Array(indices), gl.STATIC_DRAW);
bufferQuad.attach(0, 2, [0, 0]);
bufferQuad.revoke();

// the main renderer function.
function onRender() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    bufferQuad.invoke();
    bufferQuad.draw();
    bufferQuad.revoke();

    requestAnimationFrame(onRender);
}

// Request animation to start rendering loop
requestAnimationFrame(onRender);