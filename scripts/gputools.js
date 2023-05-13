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
        shaders.forEach(shaderjson => {
            const shader = gl.createShader(shaderjson.stage);
            gl.shaderSource(shader, shaderjson.src);
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
        
        this.lastinstanceindex = -1;
        this.instanceindex = 0;
        this.attachedprogramid = 0;
        this.isinstanceconvex = false;
        this.convexinstancebeginstride = -1;
        this.strideaccum = [0, 0];

        this.uniformlocationrect = 0;
        this.uniformlocationcolor = 0;
        this.uniformlocationmvp = 0;
        this.uniformlocationtextureon = 0;
        this.uniformlocationsamplertexture = 0;
        this.mat4x4mvp = [];
    }

    attachprogram(programid) {
        if (this.attachedprogramid != programid) {
            this.attachedprogramid = programid;
            this.uniformlocationcolor = gl.getUniformLocation(this.attachedprogramid, "uColor");
            this.uniformlocationrect = gl.getUniformLocation(this.attachedprogramid, "uRect");
            this.uniformlocationmvp = gl.getUniformLocation(this.attachedprogramid, "uMVP");
            this.uniformlocationtextureon = gl.getUniformLocation(this.attachedprogramid, "uTextureOn");
            this.uniformlocationsamplertexture = gl.getUniformLocation(this.attachedprogramid, "uSamplerTexture");
            this.uniformlocationlinethickness = gl.getUniformLocation(this.attachedprogramid, "uLineThickness");
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
        this.isinstanceconvex = gpudata.rect.w != 0 || gpudata.rect.h != 0;
        this.strideaccum[1] = 0;
    }

    pop() {
        if (this.isinstanceconvex) {
            this.gpudatamap[this.instanceindex].stride = [0, 6];
        } else {
            this.gpudatamap[this.instanceindex].stride = [this.strideaccum[0], this.strideaccum[1]];
            this.strideaccum[0] += this.strideaccum[1];
        }

        this.instanceindex++;
    }

    pushbackvertices(data) {
        this.vertexposdata = this.vertexposdata.concat(data);
        this.strideaccum[1] += data.length / 2;
    }

    pushbacktexcoords(data) {
        this.texcoorddata = this.texcoorddata.concat(data);
    }

    revoke() {
        var shouldswapbuffers = this.lastinstanceindex != this.instanceindex;
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

            console.log("swapping bufferss");
        }

        this.lastinstanceindex = this.instanceindex;
    }

    draw() {
        gl.bindVertexArray(this.vertexarr);
        gl.useProgram(this.attachedprogramid);
        gl.uniformMatrix4fv(this.uniformlocationmvp, false, this.mat4x4mvp);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        var previoustextureactive = -1;
        for (var it = 0; it < this.instanceindex; it++) {
            var gpudata = this.gpudatamap[it];
            if (gpudata.texture != -1 && previoustextureactive != gpudata.texture) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, gpudata.texture);
                gl.uniform1i(this.uniformlocationtextureon, 1);
                gl.uniform1i(this.uniformlocationsamplertexture, 0);
                previoustextureactive = gpudata.texture;
            } else if (gpudata.texture == -1 && previoustextureactive != gpudata.texture) {
                gl.bindTexture(gl.TEXTURE_2D, null);
                gl.uniform1i(this.uniformlocationtextureon, 0);
                previoustextureactive = -1;
            }
            
            gl.uniform1f(this.uniformlocationlinethickness, gpudata.linethickness);
            gl.uniform4f(this.uniformlocationrect, gpudata.rect.x, gpudata.rect.y, gpudata.rect.w, gpudata.rect.h);
            gl.uniform4f(this.uniformlocationcolor, gpudata.color.r, gpudata.color.g, gpudata.color.b, gpudata.color.a);
            gl.drawArrays(gl.TRIANGLES, gpudata.stride[0], gpudata.stride[1]);
        }

        gl.disable(gl.BLEND);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.uniform1i(this.uniformlocationtextureon, 0);

        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
};

class vokefontrenderer {
    constructor(url, fontsize) {
        this.batch = null;
        this.program = null;
        this.texture = gl.createTexture();
        this.atlasglyph = {};
        this.fontfaceurl = url;
        this.fontface = null;
        this.fontfacesize = fontsize;
        this.fontfacewidth = 0;
    }

    generateatlas() {
        var gltexture = this.texture;
        this.fontface = fetch(this.fontfaceurl).then(res => res.arrayBuffer()).then(buffer => {
            const font = opentype.parse(buffer);
            var glyphdata = {};

            for (var i = 0; i < 95; i++) {
                var cutechar = getcharfromint(i).charAt(0);
                var charcode = getcharcodefromint(i);

                if (cutechar == ' ') {
                    glyphdata[charcode] = {
                        canvas: null,
                        boundingbox: null,
                        advance: this.fontfacesize,
                        width: this.fontfacesize,
                        height: this.fontfacesize
                    };

                    x += this.fontfacesize;
                    continue;
                }

                var glyphfont = font.charToGlyph(cutechar);
                var path = glyphfont.getPath(0, 0, this.fontfacesize);
                var boundingbox = path.getBoundingBox();
                var advance = glyphfont.advanceWidth * (this.fontfacesize / glyphfont.path.unitsPerEm);

                var glyphcanvas = document.createElement('canvas');
                var glyphcontext = glyphcanvas.getContext('2d');

                glyphcanvas.width = this.fontfacesize;
                glyphcanvas.height = this.fontfacesize;

                glyphfont.draw(glyphcontext, path.xMin, ((boundingbox.y2 - boundingbox.y1)), this.fontfacesize);
                glyphdata[charcode] = {
                    canvas: glyphcanvas,
                    boundingbox: boundingbox,
                    advance: advance,
                    width: advance,
                    height: this.fontfacesize,
                    top: this.fontfacesize - (boundingbox.y2 - boundingbox.y1),
                    kerning: glyphfont.leftSideBearing
                };

                this.fontfacewidth += advance;
            }
            
            var atlascanvas = document.createElement('canvas');
            var atlascontext = atlascanvas.getContext('2d');

            atlascanvas.width = this.fontfacewidth;
            atlascanvas.height = this.fontfacesize;

            var charcode = 0;
            var x = 0;

            for (var i = 0; i < 95; i++) {
                charcode = getcharcodefromint(i);
                var glyph = glyphdata[charcode];

                if (charcode != 32) {
                    atlascontext.drawImage(glyph.canvas, x, 0);
                }

                this.atlasglyph[charcode] = {
                    x: x,
                    y: 0.0,
                    top: glyph.top,
                    width: glyph.width,
                    height: glyph.height,
                    kerning: glyph.kerning / this.fontfacewidth
                };

                x += glyph.advance;
            }

            gl.bindTexture(gl.TEXTURE_2D, gltexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlascanvas);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);

            console.log("Font texture created...");
            document.dispatchEvent(new Event("atlas-texture-created"));

        });

        console.log("Font initialised...");
    }

    draw(text, x, y, color) {
        if (text.length == 0) {
            return;
        }

        this.batch.call({
            rect: {x: x, y: y, w: 0, h: 0},
            color: color,
            texture: this.texture,
            linethickness: 0
        });

        var cutechar = ' ';
        var charcode = 32;
        var glyph = {};
        var vertices = [];
        var texcoords = [];

        x = 0;
        y = 0;

        var prevcharcode = 0;
        for (var it = 0; it < text.length; it++) {
            cutechar = text.charAt(it);
            charcode = cutechar.charCodeAt(0);

            glyph = this.atlasglyph[charcode];
            if (glyph == undefined) continue;

            var vx = x;
            var vy = y + glyph.top;

            vertices.push(vx);
            vertices.push(vy);

            vertices.push(vx + glyph.width);
            vertices.push(vy);

            vertices.push(vx + glyph.width);
            vertices.push(vy + glyph.height);

            vertices.push(vx + glyph.width);
            vertices.push(vy + glyph.height);

            vertices.push(vx);
            vertices.push(vy + glyph.height);

            vertices.push(vx);
            vertices.push(vy);

            var glyphx = glyph.x / this.fontfacewidth;
            var glyphy = glyph.y;
            var glyphw = glyph.width / this.fontfacewidth;
            var glyphh = glyph.height / this.fontfacesize;

            texcoords.push(glyphx);
            texcoords.push(glyphy);

            texcoords.push(glyphx + glyphw);
            texcoords.push(glyphy);

            texcoords.push(glyphx + glyphw);
            texcoords.push(glyphy + glyphh);

            texcoords.push(glyphx + glyphw);
            texcoords.push(glyphy + glyphh);

            texcoords.push(glyphx);
            texcoords.push(glyphy + glyphh);

            texcoords.push(glyphx);
            texcoords.push(glyphy);

            x += glyph.width;
            prevcharcode = charcode;
        }

        this.batch.pushbackvertices(vertices);
        this.batch.pushbacktexcoords(texcoords);
        this.batch.pop();
    }
};