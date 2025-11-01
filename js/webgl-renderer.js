class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.texture = null;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;

        this.initializeGL();
    }

    initializeGL() {
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');

        if (!this.gl) {
            throw new Error(languageManager.t('error.noWebGL'));
        }

        // Set canvas size
        this.resizeCanvas();

        // Compile shaders
        this.compileShaders();

        // Setup geometry
        this.setupGeometry();

        // Enable blend mode for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.canvas.width = width;
        this.canvas.height = height;

        this.gl.viewport(0, 0, width, height);
    }

    compileShaders() {
        const vertexShaderSource = this.getVertexShader();
        const fragmentShaderSource = this.getFragmentShader();

        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Shader program linking failed:', this.gl.getProgramInfoLog(this.program));
        }

        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation failed:', this.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    getVertexShader() {
        return `#version 300 es
            precision highp float;

            in vec2 position;
            in vec2 texCoord;

            out vec2 vTexCoord;

            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
                vTexCoord = texCoord;
            }
        `;
    }

    getFragmentShader() {
        return `#version 300 es
            precision highp float;

            uniform sampler2D uTexture;
            uniform int uProjectionType;
            uniform int uPreviousProjectionType;
            uniform float uTransitionProgress;
            uniform float uScale;
            uniform float uRotationX;
            uniform float uRotationY;
            uniform vec2 uCanvasSize;

            in vec2 vTexCoord;
            out vec4 outColor;

            const float PI = 3.14159265359;
            const float TWO_PI = 6.28318530718;
            const float HALF_PI = 1.5707963267949;

            // Helper functions
            float asinSafe(float x) {
                return asin(clamp(x, -1.0, 1.0));
            }

            float acosSafe(float x) {
                return acos(clamp(x, -1.0, 1.0));
            }

            // Mercator projection inverse
            // Converts from screen coordinates to lat/lon
            vec2 inverseMercator(vec2 uv) {
                float x = (uv.x - 0.5) * 360.0;
                float y = (0.5 - uv.y) * 180.0;

                float lon = x;
                float lat = 2.0 * atan(exp(y * PI / 180.0)) * 180.0 / PI - 90.0;

                return vec2(lon, lat);
            }

            // Stereographic projection inverse
            vec2 inverseStereographic(vec2 uv) {
                // Scale factor for stereographic
                float scale = 0.5;
                vec2 p = (uv - 0.5) / scale;
                float rho2 = dot(p, p);

                if (rho2 > 4.0) return vec2(0.0, -90.0); // Outside view

                float c = 2.0 * atan(sqrt(rho2) / 2.0);
                float cosc = cos(c);
                float sinc = sin(c);

                float lat = asinSafe(p.y / sqrt(rho2) * sinc) * 180.0 / PI;
                float lon = atan(p.x * sinc, sqrt(rho2) * cosc) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Equal Earth projection inverse (simplified)
            vec2 inverseEqualEarth(vec2 uv) {
                float x = (uv.x - 0.5) * 2.0;
                float y = (0.5 - uv.y) * 1.0;

                // Denormalization for Equal Earth
                float A = 1.44708;
                float B = 0.54201;
                float C = 0.00652;

                // Newton-Raphson iterations for latitude
                float phi = y;
                for (int i = 0; i < 5; i++) {
                    float cosPhi = cos(phi);
                    float f = phi + C * phi * phi * phi - y / A;
                    float fprime = 1.0 + 3.0 * C * phi * phi;
                    phi = phi - f / fprime;
                }

                float lat = phi * 180.0 / PI;
                float lon = x * PI / (2.0 * (A - B * cos(phi))) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Mollweide projection inverse (simplified)
            vec2 inverseMollweide(vec2 uv) {
                float x = (uv.x - 0.5) * 4.0;
                float y = (0.5 - uv.y) * 2.0;

                // Newton-Raphson for theta
                float theta = y;
                for (int i = 0; i < 5; i++) {
                    float sinTheta = sin(theta);
                    float f = theta + sinTheta - PI * y;
                    float fprime = 1.0 + cos(theta);
                    theta = theta - f / fprime;
                }

                float lat = asinSafe(2.0 * theta / PI) * 180.0 / PI;
                float lon = x * PI / (2.0 * sqrt(2.0) * cos(theta)) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Azimuthal Equidistant projection inverse
            vec2 inverseAzimuthalEquidistant(vec2 uv) {
                vec2 p = (uv - 0.5) * 2.0;
                float rho = length(p);

                if (rho > PI) return vec2(0.0, -90.0);

                float c = rho;
                float cosc = cos(c);
                float sinc = sin(c);

                float lat = asinSafe(p.y / rho * sinc) * 180.0 / PI;
                float lon = atan(p.x * sinc, rho * cosc) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Orthographic projection inverse
            vec2 inverseOrthographic(vec2 uv) {
                vec2 p = (uv - 0.5) * 2.0;
                float x2y2 = dot(p, p);

                if (x2y2 > 1.0) return vec2(0.0, -90.0); // Outside view

                float z = sqrt(1.0 - x2y2);
                float lat = atan(p.y / z) * 180.0 / PI;
                float lon = atan(p.x, z) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Gnomonic projection inverse
            vec2 inverseGnomonic(vec2 uv) {
                vec2 p = (uv - 0.5) * 2.0;
                float x2y2 = dot(p, p);

                float z = 1.0 / sqrt(1.0 + x2y2);
                float lat = atan(p.y * z, z) * 180.0 / PI;
                float lon = atan(p.x, z) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Natural Earth projection inverse (simplified Equal Earth variant)
            vec2 inverseNaturalEarth(vec2 uv) {
                float x = (uv.x - 0.5) * 2.0;
                float y = (0.5 - uv.y) * 1.0;

                // Natural Earth coefficients (approximation)
                float A = 1.40346;
                float B = 0.50;

                // Simplified Newton-Raphson
                float phi = y;
                for (int i = 0; i < 5; i++) {
                    float cosPhi = cos(phi);
                    float f = phi + B * phi * phi * phi - y / A;
                    float fprime = 1.0 + 3.0 * B * phi * phi;
                    phi = phi - f / fprime;
                }

                float lat = phi * 180.0 / PI;
                float lon = x * PI / (2.0 * (A - B * cos(phi))) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Apply rotation to lat/lon
            vec2 applyRotation(vec2 lonLat) {
                float lon = lonLat.x + uRotationX;
                float lat = lonLat.y + uRotationY;

                // Normalize longitude to [-180, 180]
                lon = mod(lon + 180.0, 360.0) - 180.0;

                // Clamp latitude to [-90, 90]
                lat = clamp(lat, -90.0, 90.0);

                return vec2(lon, lat);
            }

            // Convert lat/lon to texture coordinates
            vec2 lonLatToTexture(vec2 lonLat) {
                float u = (lonLat.x / 360.0) + 0.5;
                float v = 0.5 - (lonLat.y / 180.0);

                // Clamp to valid texture range
                u = clamp(u, 0.0, 1.0);
                v = clamp(v, 0.0, 1.0);

                return vec2(u, v);
            }

            vec2 getInverseProjection(vec2 uv) {
                vec2 lonLat;

                if (uProjectionType == 0) lonLat = inverseMercator(uv);
                else if (uProjectionType == 1) lonLat = inverseStereographic(uv);
                else if (uProjectionType == 2) lonLat = inverseEqualEarth(uv);
                else if (uProjectionType == 3) lonLat = inverseMollweide(uv);
                else if (uProjectionType == 4) lonLat = inverseAzimuthalEquidistant(uv);
                else if (uProjectionType == 5) lonLat = inverseOrthographic(uv);
                else if (uProjectionType == 6) lonLat = inverseGnomonic(uv);
                else if (uProjectionType == 7) lonLat = inverseNaturalEarth(uv);
                else lonLat = vec2(0.0);

                return lonLat;
            }

            void main() {
                // Normalized screen coordinates [0, 1]
                vec2 ndc = gl_FragCoord.xy / uCanvasSize;

                // Get longitude and latitude from current projection
                vec2 lonLat = getInverseProjection(ndc);

                // If transitioning, blend with previous projection at geographic coordinate level
                if (uTransitionProgress < 1.0) {
                    // Calculate previous projection coordinates
                    vec2 prevLonLat;
                    if (uPreviousProjectionType == 0) prevLonLat = inverseMercator(ndc);
                    else if (uPreviousProjectionType == 1) prevLonLat = inverseStereographic(ndc);
                    else if (uPreviousProjectionType == 2) prevLonLat = inverseEqualEarth(ndc);
                    else if (uPreviousProjectionType == 3) prevLonLat = inverseMollweide(ndc);
                    else if (uPreviousProjectionType == 4) prevLonLat = inverseAzimuthalEquidistant(ndc);
                    else if (uPreviousProjectionType == 5) prevLonLat = inverseOrthographic(ndc);
                    else if (uPreviousProjectionType == 6) prevLonLat = inverseGnomonic(ndc);
                    else if (uPreviousProjectionType == 7) prevLonLat = inverseNaturalEarth(ndc);
                    else prevLonLat = vec2(0.0);

                    // BLEND AT GEOGRAPHIC COORDINATE LEVEL (Case A)
                    // Interpolate between previous and current geographic coordinates
                    // 0.0 = 100% previous projection, 1.0 = 100% current projection
                    lonLat = mix(prevLonLat, lonLat, uTransitionProgress);
                }

                // Apply rotation parameters to the (possibly blended) geographic coordinates
                lonLat = applyRotation(lonLat);

                // Convert blended geographic coordinates to texture coordinates
                vec2 texCoord = lonLatToTexture(lonLat);

                // Sample texture from the blended geographic location
                outColor = texture(uTexture, texCoord);
            }
        `;
    }

    setupGeometry() {
        // Create VAO
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        // Create position buffer (full screen quad)
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        const positions = new Float32Array([
            -1, -1,
             1, -1,
             1,  1,
            -1,  1
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Create index buffer
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

        this.gl.bindVertexArray(null);
    }

    loadImage(image) {
        // Create or update texture
        if (!this.texture) {
            this.texture = this.gl.createTexture();
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        // Set texture parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        // Load texture data
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            image
        );
    }

    render() {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        if (deltaTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            document.getElementById('fps-counter').textContent = this.fps;
        }
        this.frameCount++;

        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);

        // Update uniforms
        const projectionType = projectionManager.getProjections().findIndex(p => p.id === projectionManager.getCurrentProjection().id);
        const params = projectionManager.getParams();
        const transitionInfo = uiControls.getCurrentTransitionInfo();

        const projectionTypeLoc = this.gl.getUniformLocation(this.program, 'uProjectionType');
        const previousProjectionTypeLoc = this.gl.getUniformLocation(this.program, 'uPreviousProjectionType');
        const transitionProgressLoc = this.gl.getUniformLocation(this.program, 'uTransitionProgress');
        const scaleLoc = this.gl.getUniformLocation(this.program, 'uScale');
        const rotationXLoc = this.gl.getUniformLocation(this.program, 'uRotationX');
        const rotationYLoc = this.gl.getUniformLocation(this.program, 'uRotationY');
        const canvasSizeLoc = this.gl.getUniformLocation(this.program, 'uCanvasSize');
        const textureLoc = this.gl.getUniformLocation(this.program, 'uTexture');

        // Set current projection
        this.gl.uniform1i(projectionTypeLoc, projectionType);

        // Set transition information
        if (transitionInfo.isTransitioning && transitionInfo.fromProjection) {
            const previousProjectionType = projectionManager.getProjections().findIndex(p => p.id === transitionInfo.fromProjection.id);
            this.gl.uniform1i(previousProjectionTypeLoc, previousProjectionType);
            this.gl.uniform1f(transitionProgressLoc, transitionInfo.progress);
        } else {
            this.gl.uniform1f(transitionProgressLoc, 1.0);
        }

        this.gl.uniform1f(scaleLoc, params.scale);
        this.gl.uniform1f(rotationXLoc, params.rotationX);
        this.gl.uniform1f(rotationYLoc, params.rotationY);
        this.gl.uniform2f(canvasSizeLoc, this.canvas.width, this.canvas.height);
        this.gl.uniform1i(textureLoc, 0);

        // Only render if texture is loaded
        if (this.texture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

            // Draw
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }
    }

    clear() {
        this.gl.clearColor(0.9, 0.9, 0.9, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
}

// Create global instance
let webglRenderer = null;
