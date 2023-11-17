/////////////////////////////////////////

// Variables
var gl;
var canvas;
var matrixStack = [];

var aPositionLocation;
var aTexCoordLocation;  // for 3D texture mapping

var uMMatrixLocation;

var sqBuf;
var sqIndexBuf;
var sqTexBuf;

var mMatrix = mat4.create(); // model matrix

// 3D Texture Mapping
var uTextureLocationBg;
var uTextureLocationFg;
var bgTexture;
var fgTexture;
var textureFileBg;
var textureFileFg;

// Alpha Blending
var uAlphaBlendLocation;

// Image filter
var uImageFilterLocation;
var imageFilter = 0;

// Contrast and Brightness
var uContrastLocation;
var uBrightnessLocation;
var contrast = 0.0;
var brightness = 0.0;

// Image Processing
var uImageProcessingLoc;
var mode = 0;
var kernelLocation;
var textureSizeLocation;
var kernelWeightLocation;
var weight = 1.0;


// Different kernels
var kernels = {
    normal: [
        0, 0, 0,
        0, 1, 0,
        0, 0, 0,
    ],
    smooth: [
        1, 1, 1,
        1, 1, 1,
        1, 1, 1,
    ],
    sharpen: [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0,
    ],
    laplacian: [
        0, -1, 0,
        -1, 4, -1,
        0, -1, 0,
    ],
    emboss: [
        -3, -1, 0,
        -1, 5, 1,
        0, 1, 3,
    ],
}

var kernel = kernels['normal'];

const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec2 aTexCoords;

uniform mat4 uMMatrix;

out vec2 fragTexCoord;

void main() {
    // calcuie clip space position
    gl_Position =  uMMatrix * vec4(aPosition,1.0);

    // pass texture coordinate to frag shader
    fragTexCoord = aTexCoords;
}`;

const fragShaderCode = `#version 300 es
precision highp float;
out vec4 fragColor;

in vec2 fragTexCoord;
uniform sampler2D bgTexture;
uniform sampler2D fgTexture;

uniform int isAlphaBlended;
uniform int imageFilter;

uniform float aContrast;
uniform float aBrightness;

uniform int processingMode;
uniform mat3 u_kernel;
uniform vec2 u_textureSize;
uniform float u_kernelWeight;

// Grayscale Filter
vec4 applyGrayScale(vec4 textureColor) {
    vec3 grayscale = vec3(0.2126, 0.7152, 0.0722);
    float gs = dot(textureColor.rgb, grayscale);
    return vec4(gs, gs, gs, textureColor.a);
}

// Sepia Filter
vec4 applySepia(vec4 textureColor) {
    vec3 sepiaR = vec3(0.393, 0.769, 0.189);
    vec3 sepiaG = vec3(0.349, 0.686, 0.168);
    vec3 sepiaB = vec3(0.272, 0.534, 0.131);
    float r = dot(textureColor.rgb, sepiaR);
    float g = dot(textureColor.rgb, sepiaG);
    float b = dot(textureColor.rgb, sepiaB);
    return vec4(r, g, b, textureColor.a);
}

// Change Contrast
vec4 adjustContrast(float aContrast, vec4 textureColor) {
    vec3 c = vec3(0.5, 0.5, 0.5);
    return vec4(c + (aContrast + 1.0) * (textureColor.rgb - c), textureColor.a);
}

// Change Brightness
vec4 adjustBrightness(float aBrightness, vec4 textureColor) {
    vec3 br = vec3(aBrightness, aBrightness, aBrightness);
    return vec4(textureColor.rgb + br, textureColor.a);
}

// Compute Kernel
vec3 computeKernel() {
    vec2 pixelOffset = 2.0 / u_textureSize;
    vec3 convolution = vec3(0.0);
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec3 sampleColor = texture(bgTexture, fragTexCoord + vec2(j, i) * pixelOffset).rgb;
          convolution += sampleColor * u_kernel[i + 1][j + 1];
        }
    }
    return convolution / u_kernelWeight;
}

// Compute Gradient
vec3 computeGradient() {
    vec2 pixelOffset = 1.3 / u_textureSize;
    vec3 up = texture(bgTexture, fragTexCoord + vec2(1, 1) * pixelOffset).rgb;
    vec3 down = texture(bgTexture, fragTexCoord + vec2(1, -1) * pixelOffset).rgb;
    vec3 right = texture(bgTexture, fragTexCoord + vec2(0, 1) * pixelOffset).rgb;
    vec3 left = texture(bgTexture, fragTexCoord + vec2(0, -1) * pixelOffset).rgb;
    vec3 dy = (up - down) * 0.5;
    vec3 dx = (right - left) * 0.5;
    return sqrt(dy*dy + dx*dx);
}


void main() {
    fragColor = vec4(0,0,0,1);
    
    // look up texture color
    vec4 textureColorBg =  texture(bgTexture, fragTexCoord);
    vec4 textureColorFg =  texture(fgTexture, fragTexCoord);

    // Image Processing
    if (processingMode == 0 || processingMode == 1 || processingMode == 2 || processingMode == 4 || processingMode == 5) {
        textureColorBg = vec4(computeKernel(), 1.0);
    }
    else if (processingMode == 3) {
        textureColorBg = vec4(computeGradient(), 1.0);
    }

    vec4 textureColor;

    if (isAlphaBlended == 0) {
        textureColor = textureColorBg;
    }
    else if (isAlphaBlended == 1){
        // alpha blending
        // textureColor.rgb = textureColor.rgb / textureColor.a;
        textureColor = textureColorBg * (1.0 - textureColorFg.a) + textureColorFg * textureColorFg.a;
    }

    // Grayscale or Sepia Filter
    if (imageFilter == 1) {
        textureColor = applyGrayScale(textureColor);
    }
    else if (imageFilter == 2){
        textureColor = applySepia(textureColor);
    }

    // Contrast
    textureColor = adjustContrast(aContrast, textureColor);
  
    // Brightness
    textureColor = adjustBrightness(aBrightness, textureColor);

    // Texture mapping
    fragColor = textureColor;
}`;

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function fragmentShaderSetup(fragShaderCode) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    shaderProgram = gl.createProgram();
  
    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);
  
    // attach the shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    gl.linkProgram(shaderProgram);
  
    // check for compiiion and linking status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
    }
  
    //finally use the program.
    gl.useProgram(shaderProgram);
  
    return shaderProgram;
}

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // the graphics webgl2 context
        gl.viewportWidth = canvas.width; // the width of the canvas
        gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
}

function initTextures(textureFile) {
    var tex = gl.createTexture();
    tex.image = new Image();
    tex.image.src = textureFile;
    tex.image.onload = function () {
        handleTextureLoaded(tex);
    };
    return tex;
}

function handleTextureLoaded(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
    gl.texImage2D(
        gl.TEXTURE_2D, // 2D texture
        0, // mipmap level
        gl.RGBA, // internal format
        gl.RGBA, // format
        gl.UNSIGNED_BYTE, // type of data
        texture.image // array or <img>
    );
  
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
    );
}

// Draw Square
function initSquareBuffer() {
    var vertices = [
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0,
    ];
    sqBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    sqBuf.itemSize = 3;
    sqBuf.numItems = vertices.length / 3;
  
    var texCoords = [
        0, 0,
        1, 0,
        1, 1,
        0, 1,
    ];
    sqTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    sqTexBuf.itemSize = 2;
    sqTexBuf.numItems = texCoords.length / 2;
  
    var indices = [
        0, 1, 2,
        0, 2, 3,
    ];
    sqIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqIndexBuf);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
    );
    sqIndexBuf.itemSize = 1;
    sqIndexBuf.numItems = indices.length;
}

function drawSquare() {
    // bind the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sqBuf);
    gl.vertexAttribPointer(aPositionLocation, sqBuf.itemSize, gl.FLOAT, false, 0, 0);

    // bind the texture buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sqTexBuf);
    gl.vertexAttribPointer(aTexCoordLocation, sqTexBuf.itemSize, gl.FLOAT, false, 0, 0);

    // bind the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqIndexBuf);

    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniform1i(uImageFilterLocation, imageFilter);
    gl.uniform1f(uBrightnessLocation, brightness);
    gl.uniform1f(uContrastLocation, contrast);

    gl.uniform1i(uImageProcessingLoc, mode);
    gl.uniformMatrix3fv(kernelLocation, false, kernel);
    gl.uniform1f(kernelWeightLocation, weight);
    gl.uniform2f(textureSizeLocation, 600, 600);

    // draw the cube
    gl.drawElements(gl.TRIANGLES, sqIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

//The main drawing routine
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // gl.enable(gl.DEPTH_TEST);
  
    //set up the model matrix
    mat4.identity(mMatrix);

    mMatrix = mat4.scale(mMatrix, [1.0, 1.0, 1.0]);
    drawSquare();
}
  
// This is the entry point from the html
function webGLStart() {
    canvas = document.getElementById("image-photoshop");

    initGL(canvas);
    shaderProgram = initShaders();
  
    //get locations of attributes declared in the vertex shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");
  
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  
    //texture location in shader
    uTextureLocationBg = gl.getUniformLocation(shaderProgram, "bgTexture");
    uTextureLocationFg = gl.getUniformLocation(shaderProgram, "fgTexture");

    //alpha blending
    uAlphaBlendLocation = gl.getUniformLocation(shaderProgram, "isAlphaBlended");

    //image filter
    uImageFilterLocation = gl.getUniformLocation(shaderProgram, "imageFilter");

    //contrast and brightness
    uContrastLocation = gl.getUniformLocation(shaderProgram, "aContrast");
    uBrightnessLocation = gl.getUniformLocation(shaderProgram, 'aBrightness');

    //image processing
    uImageProcessingLoc = gl.getUniformLocation(shaderProgram, 'processingMode');
    kernelLocation = gl.getUniformLocation(shaderProgram, 'u_kernel'); 
    kernelWeightLocation = gl.getUniformLocation(shaderProgram, 'u_kernelWeight');
    textureSizeLocation = gl.getUniformLocation(shaderProgram, 'u_textureSize');
  
    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aTexCoordLocation);
  
    //initialize buffers for the square
    initSquareBuffer();
  
    drawScene();
}

function loadBackground(input) {
    textureFileBg = './sample_Textures/' + input.files[0].name;
    bgTexture = initTextures(textureFileBg);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(uTextureLocationBg, 0);

    // if (prevTextureFileBg != textureFileBg) {
    //     prevTextureFileBg = textureFileBg;
    //     reset();
    // }
}

function loadForeground(input) {
    textureFileFg = './sample_Textures/' + input.files[0].name;
    fgTexture = initTextures(textureFileFg);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fgTexture);
    gl.uniform1i(uTextureLocationFg, 1);

    // if (prevTextureFileFg != textureFileFg) {
    //     prevTextureFileFg = textureFileFg;
    //     reset();
    // }
}

function showOnlyBackground() {
    gl.uniform1i(uAlphaBlendLocation, 0);
    drawScene();
}

function alphaBlend() {
    gl.uniform1i(uAlphaBlendLocation, 1);
    drawScene();
}

function performGrayScale() {
    imageFilter = 1;
    drawScene();
}

function performSepia() {
    imageFilter = 2;
    drawScene();
}

function performNoFilter() {
    imageFilter = 0;
    drawScene();   
}

function changeBrightness(value) {
    brightness = value;
    drawScene();
}

function changeContrast(value) {
    contrast = value;
    drawScene();
}

function performSmoothing() {
    mode = 1;
    weight = 9.0;
    kernel = kernels['smooth'];
    drawScene();
}

function performSharpening() {
    mode = 2;
    weight = 1.0;
    kernel = kernels['sharpen'];
    drawScene();
}

function performGradient() {
    mode = 3;
    weight = 1.0;
    drawScene();
}

function performLaplacian() {
    mode = 4;
    weight = 1.0;
    kernel = kernels['laplacian'];
    drawScene();
}

function performEmbossing() {
    mode = 5;
    weight = 1.0;
    kernel = kernels['emboss'];
    drawScene();
}

function performNone() {
    mode = 0;
    weight = 1.0;
    kernel = kernels['normal'];
    drawScene();
}

function reset() {
    // Get all radio buttons by their name
    const filterButtons = document.getElementsByName("filter");

    // Loop through the radio buttons and set their checked property to false
    filterButtons.forEach(filterButton => {
        filterButton.checked = false;
    });

    const processingButtons = document.getElementsByName("processing");
    processingButtons.forEach(processingButton => {
        processingButton.checked = false;
    });

    // slider values
    const brightnessSlider = document.getElementById("brightness");
    brightnessSlider.value = 0;
    const contrastSlider = document.getElementById("contrast");
    contrastSlider.value = 0;

    mode = 0;
    weight = 1.0;
    kernel = kernels['normal'];
    brightness = 0.0;
    contrast = 0.0;
    imageFilter = 0;
    drawScene();
}

function saveImage() {
    const screenshotDataUrl = canvas.toDataURL('image/png');

    // Create an anchor element and set its attributes
    const downloadLink = document.createElement('a');
    downloadLink.href = screenshotDataUrl;
    downloadLink.download = 'screenshot.png';

    // Simulate a click event to initiate the download
    const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: false,
        cancelable: true
    });
    downloadLink.dispatchEvent(clickEvent);
}