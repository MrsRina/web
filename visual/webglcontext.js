var canvas = document.getElementById("webgl-context")
var gl = canvas.getContext("webgl")

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

gl.clearColor(0.0, 0.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT)