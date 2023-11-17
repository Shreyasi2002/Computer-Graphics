/////////////////////////////////////////

// Variables
var gl;
var canvas;

var aPositionLocation;

var aLightLocation;
var aMode;
var aBounce;

// Buffer for sphere
var spBuf;

var light = [0.0, 29.0, 3.5];
var bounce = 1;
var mode = 4;

const vertexShaderCode = `#version 300 es
in vec3 aPosition;

void main() {
    // calcuie clip space position
    gl_Position =  vec4(aPosition,1.0);
}`;

const fragShaderCode = `#version 300 es
precision mediump float;

uniform vec3 uLightPosition;
uniform int uMode;
uniform int uBounce;

out vec4 fragColor;

struct Sphere {
    vec3 position;
    float radius;
    vec3 color;
    float shininess;
};

// Function to calculate the intersection of a ray with a sphere
float intersectSphere(vec3 rayOrigin, vec3 rayDirection, Sphere sphere) {
    vec3 oc = rayOrigin - sphere.position;
    float a = dot(rayDirection, rayDirection);
    float b = 2.0 * dot(oc, rayDirection);
    float c = dot(oc, oc) - sphere.radius * sphere.radius;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
        return 0.0; // No intersection
    } else {
        float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
        float t2 = (-b + sqrt(discriminant)) / (2.0 * a);

        return min(t1, t2);
    }
}

// Phong shading function
vec3 phongShading(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 color, float shininess) {
    float ambientStrength = 0.25;
    float specularStrength = 1.0;

    vec3 ambient = ambientStrength * color;

    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * color;

    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * vec3(1.0);

    return ambient + diffuse + specular;
}

// Function to check if a point is in shadow
bool isPointInShadow(vec3 point, vec3 lightDir, Sphere spheres[4], int currentSphere) {
    for (int i = 0; i < 4; i++) {
        if (i == currentSphere) continue;

        float t = intersectSphere(point, lightDir, spheres[i]);

        if (t > 0.0) {
            return true; // Point is in shadow
        }
    }

    return false; // Point is not in shadow
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(600.0, 600.0);

    // Camera properties
    vec3 cameraPos = vec3(0.0, 0.0, 1.0);
    vec3 cameraDir = normalize(vec3(uv * 2.0 - 1.0, -1.0));
    
    // Light properties
    vec3 lightColor = vec3(1.0, 1.0, 1.0);

    // Sphere properties
    Sphere spheres[4];
    spheres[0] = Sphere(vec3(-0.3, 0.1, 0.5), 0.2, vec3(0.0, 0.7, 0.0), 32.0);
    spheres[1] = Sphere(vec3(0.0, 0.3,-0.2), 0.5,vec3(0.7, 0.0, 0.0), 10.0);
    spheres[2] = Sphere(vec3(0.3,  0.1, 0.5), 0.2, vec3(0.0, 0.0, 0.9), 70.0);
    spheres[3] = Sphere(vec3(0.0, -2.55, 0.0), 2.3, vec3(0.35, 0.35, 0.35), 100000.0);

    vec3 color = vec3(0.0);
    
    // Ray tracing loop for each sphere
    vec3 reflectedColor = vec3(0.0);
    vec3 rayDir = cameraDir;
    vec3 rayOrigin = cameraPos;
    int inShadow = 0;

    for (int bounce = 0; bounce <= uBounce; bounce++) {
        float closestT = 1e6; // Initialize closestT to a value that indicates no intersection
        int closestSphereIndex = -1;

        for (int i = 0; i < 4; i++) {
            float t = intersectSphere(rayOrigin, rayDir, spheres[i]);
            if (t > 0.0  && t < closestT) {
                // Update closestT and calculate shading only if the intersection is closer
                closestT = t;
                closestSphereIndex = i;
            }
        }

        if (closestSphereIndex == -1) {
            break;  // No intersection found
        }
        

        // Calculate intersection point
        vec3 intersectionPoint = rayOrigin + closestT * rayDir;
            
        // Calculate normal at the intersection point
        vec3 normal = normalize(intersectionPoint - spheres[closestSphereIndex].position);

        vec3 lightDir = normalize(uLightPosition - intersectionPoint);
        vec3 viewDir = normalize(cameraPos - intersectionPoint);
        
        // Calculate reflection direction
        vec3 reflectionDir = reflect(rayDir, normal);

        if (uMode == 1 || uMode == 2) {
            if (bounce > 0){
                break;
            }
        }

        reflectedColor += phongShading(normal, lightDir, viewDir, spheres[closestSphereIndex].color,
            spheres[closestSphereIndex].shininess);
        
        
        if (uMode == 2 || uMode == 4) {
            // Check for shadows
            if (isPointInShadow(intersectionPoint, lightDir, spheres, closestSphereIndex) && bounce == 0) {
                reflectedColor = vec3(0.05);
                inShadow = 1;
            }
        }

        if (uMode == 3 || uMode == 4) {
            rayOrigin = intersectionPoint + 0.001 * normal;
            rayDir = reflectionDir;
        }
    }

    // Final color
    fragColor = vec4(reflectedColor, 1.0);

}` ;

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
        gl = canvas.getContext("webgl2"); // the graphics webgl2 context
        gl.viewportWidth = canvas.width; // the width of the canvas
        gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
}

function initQuadBuffer() {
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    var vertices = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

}

// Draw a Quad
function drawQuad() {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.uniform3fv(aLightLocation, light);
    gl.uniform1i(aBounce, bounce);
    gl.uniform1i(aMode, mode);
}

//The main drawing routine
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    color = [1.0, 0.0, 0.0];
    drawQuad(color);  
}

function webGLStart() {
    canvas = document.getElementById("ray-tracer");
    initGL(canvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aLightLocation = gl.getUniformLocation(shaderProgram, "uLightPosition");
    aMode = gl.getUniformLocation(shaderProgram, "uMode");
    aBounce = gl.getUniformLocation(shaderProgram, "uBounce");

    gl.enableVertexAttribArray(aPositionLocation);

    initQuadBuffer();
    drawScene();
    drawScene();
}

function showPhong(){
    mode = 1;
    drawScene();
    drawScene();
}
  
function showPhongShadow(){
    mode = 2;
    drawScene();
    drawScene();
}
  
function showPhongReflection() {
    mode = 3;
    drawScene();
    drawScene();
}
  
function showPhongShadowReflection() {
    mode = 4;
    drawScene();
    drawScene();
}
  
function moveLight(value) {
    console.log("here");
    document.getElementById('light-loc').innerHTML = value;
    light[0] = value;
    drawScene();
    drawScene();
}
  
function changeBounceLimit(value) {
    document.getElementById('bounce-limit').innerHTML = value;
    bounce = value;
    console.log({bounce});
    drawScene();
    drawScene();
}