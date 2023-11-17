// Draw a 3D sphere in WebGL

var gl;
var canvas;

var matrixStack = [];

var cubeBuf;
var cubeIndexBuf;
var cubeNormalBuf;
var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var aPositionLocation;
var aNormalLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var normalMatrixLocation;

var degree1 = 0.0;
var degree0 = 0.0;
var degree2 = 0.0;
var degree3 = 0.0;
var degree4 = 0.0;
var degree5 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

var scene = 0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var uNormalMatrix = mat3.create(); // normal matrix

var lightPosition = [5, 4, 4];
var ambientColor = [1, 1, 1];
var diffuseColor = [1.0, 1.0, 1.0];
var specularColor = [1.0, 1.0, 1.0];

// specify camera/eye coordinate system parameters
var eyePos = [0.0, 0.0, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];


/////////////////////////////////////
// Flat Shading

// Vertex shader code
const flatVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out mat4 viewMatrix;
out vec3 vPosEyeSpace;

void main() {
    mat4 projectionModelView;
    projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);
    viewMatrix = uVMatrix;
    vPosEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;
}`;

// Fragment shader code
const flatFragShaderCode = `#version 300 es
precision mediump float;
in vec3 vPosEyeSpace;
uniform vec3 uLightPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
in mat4 viewMatrix;

out vec4 fragColor;

void main() {
    // Compute face normal and normalize it
    vec3 normal = normalize(cross(dFdx(vPosEyeSpace), dFdy(vPosEyeSpace)));

    // Compute light vector and normalize
    vec3 lightVector = normalize(uLightPosition - vPosEyeSpace);

    // Compute reflection vector and normalize
    vec3 reflectionVector = normalize(-reflect(lightVector, normal));

    // Compute view vector to camera and normalize
    vec3 viewVector = normalize(-vPosEyeSpace);

    // Calculate Phong shading ligting
    float ambient = 0.15;
    float diffuse = max(dot(lightVector, normal), 0.0);
    float specular = pow(max(dot(reflectionVector, viewVector), 0.0), 32.0);

    // Combine the terms to get the final colour
    vec3 light_color = uAmbientColor * ambient + uDiffuseColor * diffuse + uSpecularColor * specular;


    fragColor = vec4(light_color, 1.0);
}`;


/////////////////////////////////////
// Gouraud Shading

// Vertex shader code
const perVertVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 fColor;

uniform vec3 uLightPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;

void main() {
    // Transform vertex position to eye space
    vec3 posEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;

    // Transform vertex normal and normalize
    vec3 normalEyeSpace = normalize((transpose(inverse(mat3(uVMatrix * uMMatrix)))) * aNormal);

    // Compute light vector and normalize
    vec3 L = normalize(uLightPosition - posEyeSpace);

    vec3 V = normalize(-posEyeSpace);

    // Compute Phong shading
    float diffuse = max(dot(normalEyeSpace, L), 0.0);
    float specular = pow(max(dot(-reflect(L, normalEyeSpace), V), 0.0), 32.0);
    float ambient = 0.15;
    fColor = uAmbientColor * ambient + uDiffuseColor * diffuse + uSpecularColor * specular;

    // Calculate final vertex position in clip space
    gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
}`;

// Fragment shader code
const perVertFragShaderCode = `#version 300 es
precision mediump float;
in vec3 fColor;
out vec4 fragColor;

void main() {
    fragColor = vec4(fColor, 1.0);
}`;


/////////////////////////////////////
// Phong Shading

// Vertex shader code
const perFragVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 vPosEyeSpace;
out vec3 normalEyeSpace;

out vec3 L;
out vec3 V;

uniform vec3 uLightPosition;

void main() {
    // Transform vertex position to eye space
    vPosEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;

    // Transform vertex normal and normalize
    normalEyeSpace = normalize(mat3(uVMatrix * uMMatrix) * aNormal);

    // Compute light vector and normalize
    L = normalize(uLightPosition - vPosEyeSpace);

    V = normalize(-vPosEyeSpace);

    // Calculate final vertex position in clip space
    gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
}`;

// Fragment shader code
const perFragFragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

in vec3 normalEyeSpace;
in vec3 L;
in vec3 V;
in vec3 vPosEyeSpace;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;

void main() {

    vec3 normal = normalEyeSpace;
    vec3 lightVector = L;
    vec3 viewVector = V;

    // Calculate reflection direction
    vec3 reflectionVector = normalize(-reflect(lightVector, normal));

    // Compute Phong shading
    float diffuse = max(dot(normal, lightVector), 0.0);
    float specular = pow(max(dot(reflectionVector, viewVector), 0.0), 32.0);
    float ambient = 0.15;
    vec3 fColor = uAmbientColor * ambient + uDiffuseColor * diffuse + uSpecularColor * specular;
    fragColor = vec4(fColor, 1.0);
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

function initShaders(vertexShaderCode, fragShaderCode) {
    shaderProgram = gl.createProgram();

    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);

    // attach the shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    gl.linkProgram(shaderProgram);

    // check for compilation and linking status
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
        gl = canvas.getContext("webgl2"); // the graphics webgl2 context
        gl.viewportWidth = canvas.width; // the width of the canvas
        gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
}

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function pushMatrix(stack, m) {
    //necessary because javascript only does shallow push
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}


function initSphere(nslices, nstacks, radius) {
    var theta1, theta2;
  
    for (i = 0; i < nslices; i++) {
        spVerts.push(0);
        spVerts.push(-radius);
        spVerts.push(0);
    
        spNormals.push(0);
        spNormals.push(-1.0);
        spNormals.push(0);
    }
  
    for (j = 1; j < nstacks - 1; j++) {
        theta1 = (j * 2 * Math.PI) / nslices - Math.PI / 2;
        for (i = 0; i < nslices; i++) {
            theta2 = (i * 2 * Math.PI) / nslices;
            spVerts.push(radius * Math.cos(theta1) * Math.cos(theta2));
            spVerts.push(radius * Math.sin(theta1));
            spVerts.push(radius * Math.cos(theta1) * Math.sin(theta2));
    
            spNormals.push(Math.cos(theta1) * Math.cos(theta2));
            spNormals.push(Math.sin(theta1));
            spNormals.push(Math.cos(theta1) * Math.sin(theta2));
        }
    }
  
    for (i = 0; i < nslices; i++) {
        spVerts.push(0);
        spVerts.push(radius);
        spVerts.push(0);
    
        spNormals.push(0);
        spNormals.push(1.0);
        spNormals.push(0);
    }
  
    // setup the connectivity and indices
    for (j = 0; j < nstacks - 1; j++) {
        for (i = 0; i <= nslices; i++) {
            var mi = i % nslices;
            var mi2 = (i + 1) % nslices;
            var idx = (j + 1) * nslices + mi;
            var idx2 = j * nslices + mi;
            var idx3 = j * nslices + mi2;
            var idx4 = (j + 1) * nslices + mi;
            var idx5 = j * nslices + mi2;
            var idx6 = (j + 1) * nslices + mi2;
    
            spIndicies.push(idx);
            spIndicies.push(idx2);
            spIndicies.push(idx3);
            spIndicies.push(idx4);
            spIndicies.push(idx5);
            spIndicies.push(idx6);
        }
    }
}
  
function initSphereBuffer() {
    var nslices = 30; // use even number
    var nstacks = nslices / 2 + 1;
    var radius = 0.5;
    initSphere(nslices, nstacks, radius);
  
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
    spBuf.itemSize = 3;
    spBuf.numItems = nslices * nstacks;
  
    spNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
    spNormalBuf.itemSize = 3;
    spNormalBuf.numItems = nslices * nstacks;
  
    spIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(spIndicies),
      gl.STATIC_DRAW
    );
    spIndexBuf.itemsize = 1;
    spIndexBuf.numItems = (nstacks - 1) * 6 * (nslices + 1);
}

function drawSphere() {
    // bind the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, spBuf.itemSize, gl.FLOAT, false, 0, 0);

    // bind the normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.vertexAttribPointer(aNormalLocation, spNormalBuf.itemSize, gl.FLOAT, false, 0, 0);

    // bind the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    gl.uniform3fv(uLightPositionLocation, lightPosition);
    gl.uniform3fv(uAmbientColorLocation, ambientColor);
    gl.uniform3fv(uDiffuseColorLocation, diffuseColor);
    gl.uniform3fv(uSpecularColorLocation, specularColor);


    // draw the sphere
    gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

// Cube generation function with normals
function initCubeBuffer() {
    var vertices = [
        // Front face
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Back face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
        // Top face
        -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Bottom face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        // Right face
        0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
        // Left face
        -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
    ];
    cubeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeBuf.itemSize = 3;
    cubeBuf.numItems = vertices.length / 3;
  
    var normals = [
        // Front face
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        // Back face
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
        // Top face
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
        // Bottom face
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
        // Right face
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        // Left face
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
    ];
    cubeNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    cubeNormalBuf.itemSize = 3;
    cubeNormalBuf.numItems = normals.length / 3;
  
  
    var indices = [
      0,
      1,
      2,
      0,
      2,
      3, // Front face
      4,
      5,
      6,
      4,
      6,
      7, // Back face
      8,
      9,
      10,
      8,
      10,
      11, // Top face
      12,
      13,
      14,
      12,
      14,
      15, // Bottom face
      16,
      17,
      18,
      16,
      18,
      19, // Right face
      20,
      21,
      22,
      20,
      22,
      23, // Left face
    ];
    cubeIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuf);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
    );
    cubeIndexBuf.itemSize = 1;
    cubeIndexBuf.numItems = indices.length;
}

function drawCube() {
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
    gl.vertexAttribPointer(
        aPositionLocation,
        cubeBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );
        
    // draw normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
    gl.vertexAttribPointer(
        aNormalLocation,
        cubeNormalBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    // draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuf);

    // gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    gl.uniform3fv(uLightPositionLocation, lightPosition);
    gl.uniform3fv(uAmbientColorLocation, ambientColor);
    gl.uniform3fv(uDiffuseColorLocation, diffuseColor);
    gl.uniform3fv(uSpecularColorLocation, specularColor);

    gl.drawElements(gl.TRIANGLES, cubeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

//////////////////////////////////////////////////////////////////////
//Main drawing routine
function drawScene1() {
    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    //set up perspective projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    //set up the model matrix
    mat4.identity(mMatrix);
    mat4.identity(uNormalMatrix);

    // transformations applied here on model matrix
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);

    // rotation to get the default position
    mMatrix = mat4.rotate(mMatrix, 0.5, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.2, [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.1, [0, 0, 1]);

    mMatrix = mat4.scale(mMatrix, [1.1, 1.1, 1.1]);
    mMatrix = mat4.translate(mMatrix, [0, -0.1, 0]);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, 0.5, 0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);

    // Now draw the sphere
    diffuseColor = [0, 0.35, 0.6];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.0, -0.125, 0]);
    mMatrix = mat4.scale(mMatrix, [0.45, 0.76, 0.5]);

    // Draw the cube
    diffuseColor = [0.68, 0.68, 0.49];
    drawCube();
    mMatrix = popMatrix(matrixStack);
}

function drawScene2() {
    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    //set up perspective projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    //set up the model matrix
    mat4.identity(mMatrix);

    // transformations applied here on model matrix
    mMatrix = mat4.rotate(mMatrix, degToRad(degree2), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree3), [1, 0, 0]);

    // rotation to get the default position
    mMatrix = mat4.rotate(mMatrix, 0.05, [0, 1, 0]);

    mMatrix = mat4.scale(mMatrix, [0.95, 0.95, 0.95]);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.45, 0.1]);
    mMatrix = mat4.scale(mMatrix, [0.7, 0.7, 0.7]);

    diffuseColor = [0.73, 0.73, 0.73];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.36, -0.05, 0.1]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0.4]);
    mMatrix = mat4.rotate(mMatrix, 0.5, [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, -0.45, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, -0.5, [0, 1, 0]);

    diffuseColor = [0, 0.52, 0];
    drawCube();

    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.18, 0.24, 0.25]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0.4]);

    diffuseColor = [0.73, 0.73, 0.73];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.095, 0.41, 0.3]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
    mMatrix = mat4.rotate(mMatrix, 0.5, [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.5, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.2, [0, 1, 0]);

    diffuseColor = [0, 0.52, 0];
    drawCube();

    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.02, 0.6, 0.4]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);

    diffuseColor = [0.73, 0.73, 0.73];
    drawSphere();
    mMatrix = popMatrix(matrixStack);
}

function drawScene3() {
    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    //set up perspective projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    //set up the model matrix
    mat4.identity(mMatrix);

    // transformations applied here on model matrix
    mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, -0.6, 0.1]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0.4]);

    diffuseColor = [0, 0.69, 0.14];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.01, -0.38, 0.1]);
    mMatrix = mat4.rotate(mMatrix, Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -0.6, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.1, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, -0.1, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [1.35, 0.03, 0.25]);

    diffuseColor = [0.93, 0.04, 0.07];
    drawCube();

    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.21, 0.4]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);

    diffuseColor = [0.26, 0.27, 0.53];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.35, -0.21, -0.2]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);

    diffuseColor = [0.1, 0.32, 0.3];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.07, 0.45]);
    mMatrix = mat4.rotate(mMatrix, 3 * Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -1.45, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.6, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.1, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [0.6, 0.03, 0.3]);

    diffuseColor = [0.7, 0.6, 0.0];
    drawCube();

    mMatrix = popMatrix(matrixStack)

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.35, -0.07, -0.2]);
    mMatrix = mat4.rotate(mMatrix, 3 * Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -1.45, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.6, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, 0.1, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [0.6, 0.03, 0.3]);

    diffuseColor = [0.18, 0.62, 0.];
    drawCube();

    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, 0.1, 0.4]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);

    diffuseColor = [0.69, 0, 0.69];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.35, 0.1, -0.2]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);

    diffuseColor = [0.65, 0.47, 0.12];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.01, 0.265, 0.1]);
    mMatrix = mat4.rotate(mMatrix, Math.PI / 4, [1, 1, 1]);
    mMatrix = mat4.rotate(mMatrix, -0.6, [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, 0.12, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, -0.25, [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [1.35, 0.03, 0.25]);

    diffuseColor = [0.93, 0.04, 0.07];
    drawCube();

    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, 0.48, 0.1]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0.4]);

    diffuseColor = [0.54, 0.54, 0.67];
    drawSphere();
    mMatrix = popMatrix(matrixStack);

};

function drawScene() {
    
    // You need to enable scissor_test to be able to use multiple viewports
    gl.enable(gl.SCISSOR_TEST);

    // Now define 3 different viewport areas for drawing

    ////////////////////////////////////////
    // Left viewport area
    shaderProgram = flatShaderProgram;
    gl.useProgram(shaderProgram);

    gl.viewport(0, 0, 400, 400);
    gl.scissor(0, 0, 400, 400);

    gl.clearColor(0.85, 0.85, 0.95, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal"); 
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uLightPositionLocation = gl.getUniformLocation(shaderProgram, 'uLightPosition');
    uAmbientColorLocation = gl.getUniformLocation(shaderProgram, 'uAmbientColor');
    uDiffuseColorLocation = gl.getUniformLocation(shaderProgram, 'uDiffuseColor');
    uSpecularColorLocation = gl.getUniformLocation(shaderProgram, 'uSpecularColor');

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);

    //initialize buffers for the sphere
    initSphereBuffer();
    initCubeBuffer();

    gl.enable(gl.DEPTH_TEST);
    drawScene1();

    ////////////////////////////////////////
    // Mid viewport area
    shaderProgram = perVertShaderProgram;
    gl.useProgram(shaderProgram);

    gl.viewport(400, 0, 400, 400);
    gl.scissor(400, 0, 400, 400);

    gl.clearColor(0.95, 0.85, 0.85, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal"); 
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uLightPositionLocation = gl.getUniformLocation(shaderProgram, 'uLightPosition');
    uAmbientColorLocation = gl.getUniformLocation(shaderProgram, 'uAmbientColor');
    uDiffuseColorLocation = gl.getUniformLocation(shaderProgram, 'uDiffuseColor');
    uSpecularColorLocation = gl.getUniformLocation(shaderProgram, 'uSpecularColor');

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);

    //initialize buffers for the sphere
    initSphereBuffer();
    initCubeBuffer();

    gl.enable(gl.DEPTH_TEST);
    drawScene2();


    ////////////////////////////////////////
    // Right viewport area
    shaderProgram = perFragShaderProgram;
    gl.useProgram(shaderProgram);

    gl.viewport(800, 0, 400, 400);
    gl.scissor(800, 0, 400, 400);

    gl.clearColor(0.85, 0.95, 0.85, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal"); 
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uLightPositionLocation = gl.getUniformLocation(shaderProgram, 'uLightPosition');
    uAmbientColorLocation = gl.getUniformLocation(shaderProgram, 'uAmbientColor');
    uDiffuseColorLocation = gl.getUniformLocation(shaderProgram, 'uDiffuseColor');
    uSpecularColorLocation = gl.getUniformLocation(shaderProgram, 'uSpecularColor');

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);

    //initialize buffers for the sphere
    initSphereBuffer();
    initCubeBuffer();

    gl.enable(gl.DEPTH_TEST);
    drawScene3();
};


function onMouseDown(event) {
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("mouseout", onMouseOut, false);

    if (
        event.layerX <= canvas.width &&
        event.layerX >= 0 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        prevMouseX = event.clientX;
        prevMouseY = canvas.height - event.clientY;
        var yLim = prevMouseY <= 300 && prevMouseY >= -100;
        if (prevMouseX >= 50 && prevMouseX <= 450 && yLim) scene = 1;
        else if (prevMouseX >= 450 && prevMouseX <= 850 && yLim) scene = 2;
        else if (prevMouseX >= 850 && prevMouseX <= 1250 && yLim) scene = 3;
    }
}

function onMouseMove(event) {
    // make mouse interaction only within canvas
    
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;

    console.log(mouseX, mouseY);

    // the '50' is added on the X-coordinate of the mouse because of the 50px 
    // margin on the left of the canvas
    // the '100' is subtracted on the Y-coordinate of the mouse because of the 
    // 50px margin and the header which is of approx 50px

    var yLim = mouseY <= 300 && mouseY >= -100;
    if (mouseX >= 50 && mouseX <= 450 && yLim && scene == 1) {
        degree0 = degree0 + diffX1 / 5;
        degree1 = degree1 - diffY2 / 5;
    }
    else if (mouseX >= 450 && mouseX <= 850 && yLim && scene == 2) {
        degree2 = degree2 + diffX1 / 5;
        degree3 = degree3 - diffY2 / 5;
    }
    else if (mouseX >= 850 && mouseX <= 1250 && yLim && scene == 3) {
        degree4 = degree4 + diffX1 / 5;
        degree5 = degree5 - diffY2 / 5;
    }
    drawScene();
}

function onMouseUp(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}


// This is the entry point from the html
function webGLStart() {
    canvas = document.getElementById("assn2");
    document.addEventListener("mousedown", onMouseDown, false);

    // Get the light slider element
    const lightSlider = document.getElementById('light-slider');

    // Initialize light position
    let lightX = parseFloat(lightSlider.value);

    // Update light position when the slider changes
    lightSlider.addEventListener('input', (event) => {
        lightX = parseFloat(event.target.value);
        lightPosition = [lightX, 3.0, 4.0];

         // Redraw the scene
        drawScene();
    });

    // Get the camera slider element
    const cameraSlider = document.getElementById('camera-slider');

    // Initialize camera position
    let cameraZ = parseFloat(cameraSlider.value);

    // Update camera position when the slider changes
    cameraSlider.addEventListener('input', (event) => {
        cameraZ = parseFloat(event.target.value);
        eyePos = [0.0, 0.0, cameraZ];

         // Redraw the scene
        drawScene();
    });

    // initialize WebGL
    initGL(canvas);

    // initialize shader program
    flatShaderProgram = initShaders(flatVertexShaderCode, flatFragShaderCode);
    perVertShaderProgram = initShaders(perVertVertexShaderCode, perVertFragShaderCode);
    perFragShaderProgram = initShaders(perFragVertexShaderCode, perFragFragShaderCode);

    drawScene();
}

// 
