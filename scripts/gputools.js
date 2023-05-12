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

class vokebatch {
    constructor() {
        this.vertexarr = gl.createVertexArray();
        this.vertexposbuffer = gl.createBuffer();
        this.texcoordbuffer = gl.createBuffer();
        
        this.vertexposdata = [];
        this.texcoorddata = [];
        this.gpudatamap = {};
        
        this.lastinstanceindex = 0;
        this.instanceindex = 0;
        this.attachedprogramid = 0;
        this.isinstanceconvex = false;
        this.convexinstancebeginstride = -1;
        this.strideaccum = [0, 0];

        this.uniformlocationrect = 0;
        this.uniformlocationcolor = 0;
        this.uniformlocationmvp = 0;
        this.mat4x4mvp = [];
    }

    attachprogram(programid) {
        if (this.attachedprogramid != programid) {
            this.attachedprogramid = programid;
            this.uniformlocationcolor = gl.getUniformLocation(this.attachedprogramid, "uColor");
            this.uniformlocationrect = gl.getUniformLocation(this.attachedprogramid, "uRect");
            this.uniformlocationmvp = gl.getUniformLocation(this.attachedprogramid, "uMVP");
            console.log("Attached program updated uniform locations.");
        }
    }

    invoke() {
        this.instanceindex = 0;
        this.vertexposdata = [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0
        ];
        
        this.texcoorddata = [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0
        ];

        this.strideaccum[0] = 6;
        this.strideaccum[1] = 0;
    }

    call(gpudata) {
        this.gpudatamap[this.instanceindex] = gpudata;
        this.isinstanceconvex = gpudata.rect[2] != 0 || gpudata.rect[3] != 0;
        this.strideaccum[1] = 0;
    }

    pop() {
        if (this.isinstanceconvex) {
            this.gpudatamap[this.instanceindex].stride = [0, 6];
        } else {
            this.gpudatamap[this.instanceindex].stride = this.strideaccum;
            this.strideaccum[0] += this.strideaccum[1];
        }

        this.instanceindex++;
    }

    pushbackvertices(data) {
        this.vertexposdata = this.vertexposdata.concat(data);
        this.strideaccum[1]++;
    }

    pushbacktexcoords(data) {
        this.texcoorddata = this.texcoorddata.concat(data);
    }

    revoke() {
        var shouldswapbuffers = this.instanceindex != this.lastinstanceindex;
        if (shouldswapbuffers) {
            gl.bindVertexArray(this.vertexarr);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexposbuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexposdata), gl.STATIC_DRAW);

            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordbuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texcoorddata), gl.STATIC_DRAW);

            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
            gl.bindVertexArray(null);
        }
    }

    draw() {
        gl.bindVertexArray(this.vertexarr);
        gl.useProgram(this.attachedprogramid);
        gl.uniformMatrix4fv(this.uniformlocationmvp, false, this.mat4x4mvp);

        for (var it = 0; it < this.instanceindex; it++) {
            var gpudata = this.gpudatamap[it];
            
            gl.uniform4f(this.uniformlocationrect, gpudata.rect[0], gpudata.rect[1], gpudata.rect[2], gpudata.rect[3]);
            gl.uniform4f(this.uniformlocationcolor, gpudata.color[0], gpudata.color[1], gpudata.color[2], gpudata.color[3]);
            gl.drawArrays(gl.TRIANGLES, gpudata.stride[0], gpudata.stride[1]);
        }

        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
};

class vokefontrenderer {
    constructor(url, fontsize) {
        this.program = null;
        this.texture = gl.createTexture();
        var gltexture = this.texture;
        this.fontface = fetch(url).then(res => res.arrayBuffer()).then(buffer => {
            const font = opentype.parse(buffer)
            var x = 0;
            var glyphdata = {};

            for (var i = 0; i < 95; i++) {
                var cutechar = getcharfromint(i).charAt(0);
                var charcode = getcharcodefromint(i);

                if (cutechar == ' ') {
                    glyphdata[charcode] = {
                        canvas: null,
                        boundingbox: null,
                        advance: fontsize,
                        width: fontsize,
                        height: fontsize
                    };

                    x += fontsize;
                    continue;
                }

                var glyphfont = font.charToGlyph(cutechar);
                var path = glyphfont.getPath(0, 0, fontsize);
                var boundingbox = path.getBoundingBox();
                var advance = glyphfont.advanceWidth * fontsize / glyphfont.path.unitsPerEm;

                var glyphcanvas = document.createElement('canvas');
                var glyphcontext = glyphcanvas.getContext('2d');

                glyphcanvas.width = fontsize;
                glyphcanvas.height = fontsize;

                glyphfont.draw(glyphcontext, fontsize / 2 - boundingbox.x1, fontsize / 2 + boundingbox.y2);
                glyphdata[charcode] = {
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
            var charcode = 0;
            x = 0;

            for (var i = 0; i < 95; i++) {
                charcode = getcharcodefromint(i);
                var glyph = glyphdata[charcode];

                if (charcode != 32) {
                    atlascontext.drawImage(glyph.canvas, x, 0);
                }

                atlasdata[charcode] = {
                    x: x,
                    y: 0,
                    width: glyph.width,
                    height: glyph.height
                };

                x += glyph.advance;
            }

            gl.bindTexture(gl.TEXTURE_2D, gltexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlascanvas);
            //gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
        });
    }

    draw(text, x, y, color) {
        if (text.length == 0) {
            return;
        }

        this.program.setuniformvec4("uColor", color);

        for (var it = 0; it < text.length; it++) {
            var cutechar = text.charAt(it);
            var charcode = cutechar.charCodeAt(0);

            console.log(charcode);
        }
    }
};