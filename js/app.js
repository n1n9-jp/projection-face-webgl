class MapProjectionApp {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.isRunning = false;
        this.animationFrameId = null;
    }

    async initialize() {
        try {
            // Initialize language manager
            languageManager.initialize();

            // Initialize WebGL renderer
            webglRenderer = new WebGLRenderer(this.canvas);

            // Initialize graticule renderer
            graticuleRenderer.resizeCanvas();

            // Initialize UI controls
            uiControls.initialize();

            // Initialize input handler
            inputHandler.initialize();

            // Setup event handlers
            this.setupEventHandlers();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Start animation loop
            this.startAnimationLoop();

            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            alert(languageManager.t('error.noWebGL'));
        }
    }

    setupEventHandlers() {
        // When image is loaded
        inputHandler.onImageLoaded((image) => {
            webglRenderer.loadImage(image);
        });

        // When image is cleared
        inputHandler.onImageCleared(() => {
            webglRenderer.clear();
        });

        // When projection changes
        uiControls.onProjectionChange(() => {
            // Render will be called in animation loop
            this.updateGraticule();
        });

        // When parameters change
        uiControls.onParamChange(() => {
            // Render will be called in animation loop
            this.updateGraticule();
        });

        // When reset is clicked
        uiControls.onReset(() => {
            // Render will be called in animation loop
            this.updateGraticule();
        });

        // When clear is clicked
        uiControls.onClear(() => {
            inputHandler.clearImage();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            webglRenderer.resizeCanvas();
            graticuleRenderer.resizeCanvas();
            this.updateGraticule();
        });

        // Language change
        languageManager.onLanguageChange(() => {
            uiControls.updateProjectionInfo();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R: Reset
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                document.getElementById('reset-btn').click();
            }

            // Ctrl/Cmd + S: Screenshot
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.downloadScreenshot();
            }

            // Ctrl/Cmd + O: Open file
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                document.getElementById('file-input').click();
            }

            // Esc: Clear
            if (e.key === 'Escape') {
                e.preventDefault();
                document.getElementById('clear-btn').click();
            }
        });
    }

    updateGraticule() {
        const projection = projectionManager.getCurrentProjection();
        const params = projectionManager.getParams();
        graticuleRenderer.drawGraticule(projection.id, params.rotationX, params.rotationY);
    }

    startAnimationLoop() {
        const animate = () => {
            webglRenderer.clear();
            webglRenderer.render();
            this.updateGraticule();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate();
    }

    downloadScreenshot() {
        const link = document.createElement('a');
        link.href = this.canvas.toDataURL('image/png');
        link.download = `projection-${Date.now()}.png`;
        link.click();
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new MapProjectionApp();
    await app.initialize();

    // Make app accessible globally for debugging
    window.mapProjectionApp = app;
});
