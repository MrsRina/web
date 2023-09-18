var uicolorscheme = {
    frame: {
        background: {r: 1.0, g: 1.0, b: 1.0, a: 1.0},
        border: {r: 0.5, g: 0.5, b: 0.5, a: 1.0},
        string: {r: 0.0, g: 0.0, b: 0.0, a: 1.0}
    },

    button: {
        background: {r: 1.0, g: 1.0, b: 1.0, a: 1.0},
        highlight: {r: 0.0, g: 0.0, b: 1.0, a: 1.0},
        string: {r: 1.0, g: 1.0, b: 1.0, a: 1.0}
    }
};

var widgetlist = [];
var uibatching = new vokebatch();
var uifontrenderer = new vokefontrenderer("https://mrsrina.github.io/web/assets/JetBrainsMono-Bold.ttf", 18);
uifontrenderer.generateatlas();

var tokenid = 0;
var mouse = {x: 0, y: 0};

function set(a, b) {
    if (a != b) {
        document.dispatchEvent(new Event("ui-manager-redraw"));
    }

    return b;
}

function veccolliderect(vec, rect) {
    return vec.x > rect.x && vec.x < rect.x + rect.w && vec.y > rect.y && vec.y < rect.y + rect.h;
}

class frame {
    constructor(value) {
        this.value = value;
        this.rect = {};
        this.border = {};
        this.id = ++tokenid;

        this.dragging = false;
        this.drag = {};
        this.resizing = false;
        this.resize = {};
        this.hovered = false;
        this.highlight = false;

        widgetlist.push(this);
        document.dispatchEvent(new Event("ui-manager-redraw"));
    }

    oneventpre(event) {
        if (event.type == "mousedown" || event.type == "mouseup" || event.type == "mousemove") {
            this.hovered = veccolliderect(mouse, this.rect);
        }
    }

    onevent(event) {
        if (event.type == "mousedown" && this.hovered) {
            var mousepos = {x: mouse.x, y: mouse.y};

            this.dragging = event.button == 1;
            this.drag.x = mousepos.x - this.rect.x;
            this.drag.y = mousepos.y - this.rect.y;

            var borderthickness = 10;
            this.border.x = this.rect.x + borderthickness;
            this.border.y = this.rect.y;
            this.border.w = this.rect.w - (borderthickness * 2);
            this.border.h = this.rect.h - (borderthickness * 2);

            this.resizing = event.button == 0 && !veccolliderect(mousepos, this.border);
            this.resize.x = (this.rect.x + this.rect.w) - mousepos.x;
            this.resize.y = (this.rect.y + this.rect.h) - mousepos.y;
        } else if (event.type == "mouseup") {
            this.resizing = false;
            this.dragging = false;
        } else if (event.type == "mousemove") {
            if (this.dragging) {
                this.rect.x = mouse.x - this.drag.x;
                this.rect.y = mouse.y - this.drag.y;
            } else if (this.resizing) {
                this.rect.w = (mouse.x - this.rect.x) + this.resize.x;
                this.rect.h = (mouse.y - this.rect.y) + this.resize.y;
            }
        }
    }

    ondrawreload() {
        uibatching.call({
            rect: this.rect,
            color: uicolorscheme.frame.background,
            texture: -1,
            linethicnkess: 0
        });

        uibatching.pop();
        uibatching.call({
            rect: this.rect,
            color: uicolorscheme.frame.border,
            texture: -1,
            linethickness: 2
        });

        uibatching.pop();
    }
};

var uibatching = new vokebatch();
var batchprogram = new vokeprogram([{
    src: `
    attribute vec2 aPos;
    attribute vec2 aTexCoord;

    uniform mat4 uMVP;
    uniform vec4 uRect;
    varying vec2 vTexCoord;
    varying vec4 vRect;

    void main() {
        if (uRect.z == 0.0 && uRect.w == 0.0) {
            gl_Position = uMVP * vec4(aPos + uRect.xy, 0.0, 1.0);
        } else {
            gl_Position = uMVP * vec4((aPos * uRect.zw) + uRect.xy, 0.0, 1.0);
        }

        vTexCoord = aTexCoord;
        vRect = uRect;
    }
    `,
    stage: gl.VERTEX_SHADER
},
{
    src:`
    precision mediump float;
    varying vec2 vTexCoord;
    varying vec4 vRect;
    uniform vec4 uColor;

    uniform bool uTextureOn;
    uniform sampler2D uSamplerTexture;
    uniform float uLineThickness;
    uniform float uViewportHeight;

    void main() {
        vec4 color = uColor;
        vec2 fragcoord = vec2(gl_FragCoord.x, 1080.0 - gl_FragCoord.y);

        if (uTextureOn) {
            color = texture2D(uSamplerTexture, vTexCoord.xy);
            color = vec4(color.rgb * ((1.0 - uColor.xyz) - 1.0), color.a - (1.0 - uColor.a));
        }

        if (uLineThickness != 0.0) {
            vec4 border = vRect;
            
            border.x += uLineThickness;
            border.y += uLineThickness;
            border.z -= uLineThickness * 2.0;
            border.w -= uLineThickness * 2.0;

            if (fragcoord.x > border.x && fragcoord.x < border.x + border.z && fragcoord.y > border.y && fragcoord.y < border.y + border.w) {
                discard;
            }            
        }

        gl_FragColor = color;
    }
    `,
    stage: gl.FRAGMENT_SHADER
}
]);

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
        -((right + left) / (right - left)), -((top + bottom) / (top - bottom)), -((far + near)/(far - near)), 1.0
    ];
}

var canvas = document.getElementById("webgl-context");
canvas.style.width = "100%";
canvas.style.height = "100%";

canvas.width = 1920;
canvas.height = 1080;

var mat4x4ortho = updateorthomatrix(canvas.width, canvas.height);
uifontrenderer.batch = uibatching;
uibatching.attachprogram(batchprogram.id);
uibatching.mat4x4mvp = mat4x4ortho;

var focusedwidgetid = 0;

function oneventlistener(event) {
    var hoveredid = 0;
    var widgethovered = null;

    mouse.x = (event.clientX / canvas.clientWidth) * canvas.width;
    mouse.y = (event.clientY / canvas.clientHeight) * canvas.height;

    widgetlist.forEach(widgets => {
        widgets.oneventpre(event);
        if (widgets.hovered) {
            hoveredid = widgets.id;
            widgethovered = widgets;
        } else {
            widgets.onevent(event);
        }

        widgets.hovered = false;
    });

    if (widgethovered != null) {
        widgethovered.oneventpre(event);
        widgethovered.onevent(event);
    }

    if (event.type == "mousedown" || event.type == "mouseup") {
        focusedwidgetid = hoveredid;
    }
}

document.addEventListener("atlas-texture-created", function() {
    document.dispatchEvent(new Event("ui-manager-redraw"));
});

document.body.addEventListener("mousemove", oneventlistener);
document.body.addEventListener("mouseup", oneventlistener);
document.body.addEventListener("mousedown", oneventlistener);

document.addEventListener("ui-manager-redraw", function() {
    uibatching.invoke();
    uifontrenderer.draw("Pompom", 10, 10, [1.0, 1.0, 1.0, 1.0]);

    widgetlist.forEach(widgets => {
        widgets.ondrawreload();
    });

    uibatching.revoke();
});