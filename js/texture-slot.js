// js
"use strict";

// 从 main 函数开始看

// 创建着色器 shader。gl：WebGL 上下文；type：着色器类型；source：着色器文本
function createShader(gl, type, source) {
    // 根据 type 创建着色器
    var shader = gl.createShader(type);
    // 绑定内容文本 source
    gl.shaderSource(shader, source);
    // 编译着色器（将文本内容转换成着色器）
    gl.compileShader(shader);
    // 获取编译后的状态
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    // 获取当前着色器相关信息
    console.log(gl.getShaderInfoLog(shader));
    // 删除失败的着色器
    gl.deleteShader(shader);
}

// 创建着色程序 program。gl：WebGL 上下文；vertexShader：顶点着色器对象；fragmentShader：片元着色器对象
function createProgram(gl, vertexShader, fragmentShader) {
    // 创建着色程序
    var program = gl.createProgram();
    // 让着色程序获取到顶点着色器
    gl.attachShader(program, vertexShader);
    // 让着色程序获取到片元着色器
    gl.attachShader(program, fragmentShader);
    // 将两个着色器与着色程序进行绑定
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    // 绑定失败则删除着色程序
    gl.deleteProgram(program);
}

function main() {
    // 如果是用 WebGL 中文文档上内置的运行环境编辑内容的，可以直接用网站内置的纹理图片。https://webglfundamentals.org/webgl/resources/leaves.jpg。
    // 由于我这里是自定义了本地的文件，因此创建了一个本地服务器来加载图片。使用本地文件的方式在文章末尾处。
    // 新增加一张纹理贴图
    const images = ["http://localhost/webgl/images/leaves.jpg"];
    const dataList = [];
    let index = 0;
    for (let i = 0; i < 2; i++) {
        const image = new Image();
        image.src = images[i];
        dataList.push(image);
        image.onload = function () {
            index++;
            if (index >= images.length) {
                render(dataList[0]);
            }
        };
    }
}

main();

function setRectangle(gl, x, y, width, height) {
    var x1 = x;
    var x2 = x + width;
    var y1 = y;
    var y2 = y + height;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2,
    ]), gl.STATIC_DRAW);
}

function render(image) {
    const canvas = document.createElement('canvas');
    document.getElementsByTagName('body')[0].appendChild(canvas);
    canvas.width = 400;
    canvas.height = 300;

    const gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      uniform vec2 u_resolution;

      varying vec2 v_texCoord;

      // 着色器入口函数
      void main() {
        // convert the rectangle from pixels to 0.0 to 1.0
        vec2 zeroToOne = a_position / u_resolution;

        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;

        // convert from 0->2 to -1->+1 (clipspace)
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

        // pass the texCoord to the fragment shader
        // The GPU will interpolate this value between points.
        v_texCoord = a_texCoord;

      }`;

    const fragmentShaderSource = `
      precision mediump float;
      
      // our texture
      uniform sampler2D u_image;

      uniform vec2 u_off;
      
      // the texCoords passed in from the vertex shader.
      varying vec2 v_texCoord;
      
      void main() {
        vec2 uv = vec2(v_texCoord);
        // uv += vec2(0.3, 0);
        uv += u_off;
        // glsl fract函数，返回小数部分(1.1 -> 0.1; -1.1 -> 0.9);
        uv.x = fract(uv.x);
        uv.y = fract(uv.y);
        gl_FragColor = texture2D(u_image, uv);

        // 更酷炫的效果，自行搜索shader动画
      }`;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");
    var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

    // Create a buffer to put three 2d clip space points in
    var positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Set a rectangle the same size as the image.
    setRectangle(gl, 0, 0, image.width, image.height);

    // provide texture coordinates for the rectangle.
    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
    ]), gl.STATIC_DRAW);

    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // lookup uniforms
    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    var offLocation = gl.getUniformLocation(program, "u_off");

    // 通过requestAnimationFrame进行动画
    drawScene();

    var totalTime = 0;
    function drawScene(now) {
        // 清屏
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 255);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        // **重置后所有的数据得重新设置启用一遍；包括全局变量(uniforms);**
        // Turn on the position attribute
        gl.enableVertexAttribArray(positionLocation);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            positionLocation, size, type, normalize, stride, offset);

        // Turn on the texcoord attribute
        gl.enableVertexAttribArray(texcoordLocation);

        // bind the texcoord buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

        // Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            texcoordLocation, size, type, normalize, stride, offset);

        // set the resolution
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
        
        totalTime = now * 0.0005;
        // gl.uniform2f(offLocation, totalTime, 0);
        // gl.uniform2f(offLocation, 0, totalTime);
        gl.uniform2f(offLocation, totalTime, totalTime);

        // Draw the rectangle.
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);

        requestAnimationFrame(drawScene);
    }
}
