////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes.
//

var gl;
var color;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;

var aPositionLocation;
var uColorLoc;

var animation;

// for back and forth motion of the boat
let translationX = 0.0;
const translationSpeed = 0.003;
const translationRange = 0.7;
let direction = 1;

// for rotation of the windmill and sun
let rotationAngle = 0.0;
const rotationSpeed = 0.03;

// for drawing the circle
const numSegments = 100; // Number of segments for the circle
const angleIncrement = (Math.PI * 2) / numSegments;

var mode = 's';  // mode for drawing

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
    gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
    gl_PointSize = 5.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec4 color;

void main() {
    fragColor = color;
}`;

function pushMatrix(stack, m) {
    //necessary because javascript only does shallow push
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

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

// drawing a square
function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([
        0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4;

    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.vertexAttribPointer(aPositionLocation, sqVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.uniform4fv(uColorLoc, color);

    // now draw the square
    // show the solid view
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // show the wireframe view
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // show the point view
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }    
}

// drawing a triangle
function initTriangleBuffer() {
    // buffer for point locations
    const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
    triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    triangleBuf.itemSize = 2;
    triangleBuf.numItems = 3;

    // buffer for point indices
    const triangleIndices = new Uint16Array([0, 1, 2]);
    triangleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
    triangleIndexBuf.itemsize = 1;
    triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.vertexAttribPointer(aPositionLocation, triangleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the triangle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// drawing a circle
function initCircleBuffer() {
    // buffer for point locations
    const positions = [0, 0]; // take the center of the circle
    
    for (let i = 0; i < numSegments; i++) {
      const angle = angleIncrement * i;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }

    const circleVertices = new Float32Array(positions);
    circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
    circleBuf.itemSize = 2;
    circleBuf.numItems = numSegments + 1;

    // Create index buffer
    const indices = [0, 1, numSegments];
    for (let i = 0; i < numSegments; i++) {
      indices.push(0, i, i + 1);
    }

    // buffer for point indices
    const circleIndices = new Uint16Array(indices);
    circleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndices, gl.STATIC_DRAW);
    circleIndexBuf.itemsize = 1;
    circleIndexBuf.numItems = indices.length;
}

function drawCircle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.vertexAttribPointer(aPositionLocation, circleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the rays of the sun
function initRayBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // taking only 8 segments
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2) * i / 8;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const rayVertices = new Float32Array(positions);
    rayBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.bufferData(gl.ARRAY_BUFFER, rayVertices, gl.STATIC_DRAW);
    rayBuf.itemSize = 2;
    rayBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 0; i < 8; i++) {
      indices.push(0, i+1);
    }

    // buffer for point indices
    const rayIndices = new Uint16Array(indices);
    rayIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, rayIndices, gl.STATIC_DRAW);
    rayIndexBuf.itemsize = 1;
    rayIndexBuf.numItems = indices.length;
}

function drawRays(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.vertexAttribPointer(aPositionLocation, rayBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 'p') {
        gl.drawElements(gl.POINTS, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // the rays are lines even in "solid" view
    else {
        gl.drawElements(gl.LINE_STRIP, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the blades of the windmill (easier to rotate)
function initFanBladesBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // based on manual calculations
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2) * i / 16;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const bladeVertices = new Float32Array(positions);
    bladeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, bladeVertices, gl.STATIC_DRAW);
    bladeBuf.itemSize = 2;
    bladeBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 1; i < 16; i=i+4) {
      indices.push(0, i, i+1);
    }

    // buffer for point indices
    const bladeIndices = new Uint16Array(indices);
    bladeIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bladeIndices, gl.STATIC_DRAW);
    bladeIndexBuf.itemsize = 1;
    bladeIndexBuf.numItems = indices.length;
}

function drawFanBlades(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.vertexAttribPointer(aPositionLocation, bladeBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLE_FAN, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

function drawSky() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.45, 0.71, 0.83, 1];  // sky blue colour
    // local translation operation for the square
    mMatrix = mat4.translate(mMatrix, [0.0, 0.6, 0]);
    // local scale operation for the square
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// The rotation angle is taken as input for animation
function drawSun(rotationAngle) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [1, 0.84, 0.0, 1];
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.84, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.84, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.15, 0.15, 1.0]);
    // rotation of the circle for animation
    mMatrix = mat4.rotate(mMatrix, rotationAngle, [0, 0, 1]);
    drawRays(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawCloud() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.8, 0.55, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.25, 0.13, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.55, 0.52, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.2, 0.09, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.3, 0.52, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.1, 0.05, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// Since there are 5 birds with different scaling and translation, I am taking few arguments 
function drawBird(sq_t_x, sq_t_y, sq_s_x, sq_s_y, tr_t_x, tr_t_y, tr_s_x, tr_s_y, angle) {
    /*
    sq_t_x : Translation along X axis for the square
    sq_t_y: Translation along Y axis for the square
    sq_s_x : Scaling factor on X axis for the square
    sq_s_y : Scaling factor on Y axis for the square
    tr_t_x : Translation along X axis for the triangle
    tr_t_y : Translation along Y axis for the triangle
    tr_s_x : Scaling factor on X axis for the triangle
    tr_s_y : Scaling factor on Y axis for the triangle
    angle : rotating angle for the wings of the bird

    Note : As I progressed through the assignment, I had realized that this could
    have been done using global translation and scaling ...
    */
    // initialize the model matrix to identity matrix
    // body of the bird
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [sq_t_x, sq_t_y, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [sq_s_x, sq_s_y, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // creating the wings of the bird
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [tr_t_x, tr_t_y, 0]);
    mMatrix = mat4.rotate(mMatrix, angle, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [tr_s_x, tr_s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [2*sq_t_x - tr_t_x, tr_t_y, 0]);
    mMatrix = mat4.rotate(mMatrix, -angle, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [tr_s_x, tr_s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawMountain(t_x1, t_y1, s_x, s_y, t_x2 = 0, t_y2 = 0, single = false) {
    /*
    t_x1, t_x2 : Translation along X-axis for the first and second triangle respectively
    t_y1, t_y2 : Translation along Y-axis for the first and second triangle respectively
    s_x : Scale Factor on X Axis for both triangles
    s_y : Scale Factor on Y Axis for both triangles
    single : Since one of the mountains has only one triangle, this is used to denote that
    */
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.57, 0.36, 0.15, 1.0];
    if (single) color = [0.65, 0.46, 0.16, 1.0];

    mMatrix = mat4.translate(mMatrix, [t_x1, t_y1, 0]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // if there is a single triangle in the mountain, we ignore the darker portion
    if (!single) {
        pushMatrix(matrixStack, mMatrix);
        color = [0.65, 0.46, 0.16, 1.0];
        mMatrix = mat4.translate(mMatrix, [t_x2, t_y2, 0]);
        mMatrix = mat4.rotate(mMatrix, 6.5, [0, 0, 1]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
        drawTriangle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
    }
}

function drawGround() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.15, 0.61, 0, 0.7];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.6, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// for drawing lines on the river
function drawLines(move = false, x = 0, y = 0) {
    /*
    move : this is for global translation of the lines along the river
    x : translation along X axis
    y : translation along Y axis
    */
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [x, y, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0.9, 0.9, 0.9, 0.8];
    mMatrix = mat4.translate(mMatrix, [-0.7, -0.19, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.71, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.003, 0.4, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawRiver() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0.8, 0.8];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.17, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // draw the lines on the river
    drawLines();
    drawLines(true, 0.85, 0.1);
    drawLines(true, 1.5, -0.06);
}

function drawRoad() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.30, 0.40, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.6, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 7.2, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.6, 2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawTrees(move = false, t_x = 0, t_y= 0, s_x = 0, s_y = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        // applying global translation and scaling
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 0]);
    }

    pushMatrix(matrixStack, mMatrix);
    color = [0.30, 0.41, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.45, 0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.38, 0.51, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.5, 0]);
    mMatrix = mat4.scale(mMatrix, [0.375, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.45, 0.60, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // stem of the tree
    pushMatrix(matrixStack, mMatrix);
    color = [0.57, 0.36, 0.15, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.55, 0.14, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.33, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// translationX is taken as argument for the animation
function drawBoat(translationX) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);

    // applying global translation
    mMatrix = mat4.translate(mMatrix, [translationX, 0., 0]);

    pushMatrix(matrixStack, mMatrix);
    color = [0.83, 0.83, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [0, -0.15, 0]);
    mMatrix = mat4.scale(mMatrix, [0.18, 0.06, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.09, -0.15, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.06, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.09, -0.15, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.06, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.01, 0.006, 0]);
    mMatrix = mat4.scale(mMatrix, [0.01, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.03, -0.01, 0]);
    mMatrix = mat4.rotate(mMatrix, 5.9, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.005, 0.23, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [1, 0, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.115, 0.006, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.72, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// rotationAngle is taken as input for animation of the blades
function drawFan(rotationAngle, move = false, t_x = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.7, -0.25, 0]);
    // local scale operation for the square
    mMatrix = mat4.scale(mMatrix, [0.03, 0.55, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // drawing the fan blades
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.75, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.7, 0.06, 0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
    // rotating the fan blades
    mMatrix = mat4.rotate(mMatrix, rotationAngle, [0, 0, 1]);
    drawFanBlades(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.7, 0.053, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawBush(move=false, t_x=0, t_y=0, s=0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s, s, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.7, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-1, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.075, 0.055, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.4, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.72, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.05, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.51, 0, 0.9]
    mMatrix = mat4.translate(mMatrix, [-0.86, -0.53, 0]);
    mMatrix = mat4.scale(mMatrix, [0.13, 0.09, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawHouse() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);

    // roof of the house
    pushMatrix(matrixStack, mMatrix);
    color = [0.9, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.3, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.75, -0.3, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.3, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // base of the house
    pushMatrix(matrixStack, mMatrix);
    color = [0.83, 0.83, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.525, 0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // windows
    pushMatrix(matrixStack, mMatrix);
    color = [0.85, 0.7, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.7, -0.47, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.4, -0.47, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // door of the house
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.56, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.18, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// wheels for the car
function drawWheel(move = false, t_x = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        // applying global translation for the other wheel
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [-0.63, -0.87, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.51, 0.51, 0.51, 1];
    mMatrix = mat4.translate(mMatrix, [-0.63, -0.87, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawCar() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.73, 0.18, 0.18, 1];
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.72, 0]);
    mMatrix = mat4.scale(mMatrix, [0.17, 0.1, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.415, -0.72, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.585, -0.72, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // drawing wheels
    drawWheel();
    drawWheel(true, 0.27);

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0.8, 0.65];
    mMatrix = mat4.translate(mMatrix, [-0.5, -0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.39, 0.1, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.305, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.695, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.95, 0.95, 0.95, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // stop the current loop of animation
    if (animation) {
        window.cancelAnimationFrame(animation);
    }

    function animate() {
        // Update the rotation angle
        rotationAngle += rotationSpeed;

        // Update translation based on direction
        translationX += translationSpeed * direction;

        // Reverse direction at translationRange
        if (Math.abs(translationX) > translationRange) {
            direction *= -1;
        }
        drawSky();

        // applying animation to the sun
        drawSun(rotationAngle);

        drawCloud();

        // draw the birds
        drawBird(0.1, 0.75, 0.015, 0.025, 0.055, 0.775, 0.085, 0.015, 6.1);
        drawBird(0.4, 0.9, 0.012, 0.02, 0.359, 0.92, 0.075, 0.010, 6.1);
        drawBird(-0.25, 0.8, 0.01, 0.015, -0.215, 0.815, 0.07, 0.009, 6.4);
        drawBird(-0.07, 0.9, 0.005, 0.01, -0.095, 0.908, 0.05, 0.007, 6.2);
        drawBird(0.08, 0.95, 0.003, 0.006, 0.064, 0.957, 0.03, 0.005, 6.1);

        // draw the 3 mountains
        drawMountain(-0.6, 0.09, 1.2, 0.4, -0.555, 0.095);
        drawMountain(-0.076, 0.09, 1.8, 0.55, -0.014, 0.096);
        drawMountain(0.7, 0.12, 1.0, 0.3, -0.545, -0.005, true);

        drawGround();
        drawRoad();
        drawRiver();

        // draw the trees
        drawTrees(true, 0.35, 0, 0.85, 0.85)
        drawTrees();
        drawTrees(true, -0.2, 0, 0.8, 0.8)

        // applying back and forth motion to the boat
        drawBoat(translationX);

        // applying rotatory motion to the blades of the windmill
        drawFan(rotationAngle);
        drawFan(rotationAngle, true, -1.2);

        // draw the bushes
        drawBush();
        drawBush(true, 0.8, 0, 1.02);
        drawBush(true, 1.48, -0.13, 1.6);
        drawBush(true, 2.15, 0.25, 1.3);

        drawHouse();
        drawCar();

        // Request the next animation frame
        animation = window.requestAnimationFrame(animate);
    }
    animate();
}

// This is the entry point from the html
function webGLStart() {
    var canvas = document.getElementById("scenery");
    initGL(canvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);

    uColorLoc = gl.getUniformLocation(shaderProgram, "color");

    initSquareBuffer();
    initTriangleBuffer();
    initCircleBuffer();
    initRayBuffer();
    initFanBladesBuffer();

    drawScene();
}

// this function gets called when the button is pressed.
// it changes the mode of the canvas by to point view ('p'), 
// wireframe view ('w') or solid view ('s')
function changeView(m) {
    mode = m;
    drawScene();
}
