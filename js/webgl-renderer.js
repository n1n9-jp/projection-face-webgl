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
            uniform float uScale;
            uniform float uRotationX;
            uniform float uRotationY;
            uniform vec2 uCanvasSize;

            in vec2 vTexCoord;
            out vec4 outColor;

            const float PI = 3.14159265359;
            const float TWO_PI = 6.28318530718;

            // Mercator projection inverse
            vec2 inverseMercator(vec2 uv) {
                float lon = (uv.x - 0.5) * 360.0;
                float lat = 2.0 * atan(exp((0.5 - uv.y) * PI)) * 180.0 / PI - 90.0;
                return vec2(lon, lat);
            }

            // Stereographic projection inverse
            vec2 inverseStereographic(vec2 uv) {
                vec2 p = (uv - 0.5) * 2.0;
                float rho = length(p);
                if (rho == 0.0) return vec2(uRotationX, 90.0 - uRotationY);

                float c = 2.0 * atan(rho / 2.0);
                float lat = asin(cos(c)) * 180.0 / PI - uRotationY;
                float lon = atan(p.x, -p.y) * 180.0 / PI + uRotationX;

                return vec2(lon, lat);
            }

            // Equal Earth projection inverse
            vec2 inverseEqualEarth(vec2 uv) {
                float x = (uv.x - 0.5) * 4.84814;
                float y = (0.5 - uv.y) * 3.07496;

                float lat = asin((y + 0.00652 * y * y * y) / 1.00694) * 180.0 / PI;
                float lon = atan(x / (1.44708 - 0.54201 * cos(lat * PI / 180.0))) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Mollweide projection inverse
            vec2 inverseMollweide(vec2 uv) {
                float x = (uv.x - 0.5) * 4.0;
                float y = (0.5 - uv.y) * 2.0;

                float lat = asin(y) * 180.0 / PI;
                float lon = atan(x, cos(lat * PI / 180.0)) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Azimuthal Equidistant projection inverse
            vec2 inverseAzimuthalEquidistant(vec2 uv) {
                vec2 p = (uv - 0.5) * 2.0;
                float rho = length(p);

                if (rho > 1.5707963) return vec2(0.0, -90.0);

                float lat = acos(cos(rho) * sin(rho / rho)) * 180.0 / PI - uRotationY;
                float lon = atan(p.x, -p.y) * 180.0 / PI + uRotationX;

                return vec2(lon, lat);
            }

            // Orthographic projection inverse
            vec2 inverseOrthographic(vec2 uv) {
                vec2 p = (uv - 0.5) * 2.0;
                float rho = length(p);

                if (rho > 1.0) return vec2(0.0, -90.0);

                float lat = asin(rho) * 180.0 / PI;
                float lon = atan(p.x, -p.y) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Gnomonic projection inverse
            vec2 inverseGnomonic(vec2 uv) {
                vec2 p = (uv - 0.5) * 2.0;
                float lat = atan(1.0 / length(vec2(p.x * p.x + p.y * p.y + 1.0, 1.0))) * 180.0 / PI;
                float lon = atan(p.x, -p.y) * 180.0 / PI;

                return vec2(lon, lat);
            }

            // Natural Earth projection inverse
            vec2 inverseNaturalEarth(vec2 uv) {
                float x = (uv.x - 0.5) * 4.84814;
                float y = (0.5 - uv.y) * 3.07496;

                float lat = asin((y + 0.00652 * y * y * y) / 1.00694) * 180.0 / PI;
                float lon = atan(x / (1.44708 - 0.54201 * cos(lat * PI / 180.0))) * 180.0 / PI;

                return vec2(lon, lat);
            }

            vec2 getInverseProjection(vec2 uv) {
                if (uProjectionType == 0) return inverseMercator(uv);
                if (uProjectionType == 1) return inverseStereographic(uv);
                if (uProjectionType == 2) return inverseEqualEarth(uv);
                if (uProjectionType == 3) return inverseMollweide(uv);
                if (uProjectionType == 4) return inverseAzimuthalEquidistant(uv);
                if (uProjectionType == 5) return inverseOrthographic(uv);
                if (uProjectionType == 6) return inverseGnomonic(uv);
                if (uProjectionType == 7) return inverseNaturalEarth(uv);
                return vec2(0.0);
            }

            void main() {
                // Normalized coordinates
                vec2 ndc = gl_FragCoord.xy / uCanvasSize;

                // Get longitude and latitude from projection
                vec2 lonLat = getInverseProjection(ndc);

                // Convert to image coordinates
                // Assuming input image is Plate Carrée projection
                float u = (lonLat.x / 360.0) + 0.5;
                float v = 0.5 - (lonLat.y / 180.0);

                // Clamp to texture bounds
                u = clamp(u, 0.0, 1.0);
                v = clamp(v, 0.0, 1.0);

                outColor = texture(uTexture, vec2(u, v));
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

        const projectionTypeLoc = this.gl.getUniformLocation(this.program, 'uProjectionType');
        const scaleLoc = this.gl.getUniformLocation(this.program, 'uScale');
        const rotationXLoc = this.gl.getUniformLocation(this.program, 'uRotationX');
        const rotationYLoc = this.gl.getUniformLocation(this.program, 'uRotationY');
        const canvasSizeLoc = this.gl.getUniformLocation(this.program, 'uCanvasSize');
        const textureLoc = this.gl.getUniformLocation(this.program, 'uTexture');

        this.gl.uniform1i(projectionTypeLoc, projectionType);
        this.gl.uniform1f(scaleLoc, params.scale);
        this.gl.uniform1f(rotationXLoc, params.rotationX);
        this.gl.uniform1f(rotationYLoc, params.rotationY);
        this.gl.uniform2f(canvasSizeLoc, this.canvas.width, this.canvas.height);
        this.gl.uniform1i(textureLoc, 0);

        // Bind texture
        if (this.texture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        }

        // Draw
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
    }

    clear() {
        this.gl.clearColor(0.9, 0.9, 0.9, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
}

// Create global instance
let webglRenderer = null;
