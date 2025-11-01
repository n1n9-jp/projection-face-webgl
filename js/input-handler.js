class InputHandler {
    constructor() {
        this.fileInput = document.getElementById('file-input');
        this.webcamToggle = document.getElementById('webcam-toggle');
        this.webcamCapture = document.getElementById('webcam-capture');
        this.sampleSelector = document.getElementById('sample-selector');
        this.webcamVideo = document.getElementById('webcam-video');
        this.loadingIndicator = document.getElementById('loading-indicator');

        this.webcamStream = null;
        this.currentImage = null;
        this.isWebcamActive = false;

        this.callbacks = {
            imageLoaded: [],
            imageCleared: []
        };
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // File input
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImageFromFile(file);
            }
        });

        // Drag and drop
        const canvasContainer = document.querySelector('.canvas-container');
        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasContainer.style.opacity = '0.8';
        });

        canvasContainer.addEventListener('dragleave', () => {
            canvasContainer.style.opacity = '1';
        });

        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasContainer.style.opacity = '1';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImageFromFile(file);
            }
        });

        // Webcam toggle
        this.webcamToggle.addEventListener('click', () => {
            if (this.isWebcamActive) {
                this.stopWebcam();
            } else {
                this.initializeWebcam();
            }
        });

        // Webcam capture
        this.webcamCapture.addEventListener('click', () => {
            this.captureFromWebcam();
        });

        // Sample selector
        this.sampleSelector.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadSample(e.target.value);
            }
        });
    }

    loadImageFromFile(file) {
        this.showLoading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.showLoading(false);
                this.callbacks.imageLoaded.forEach(cb => cb(img));
            };
            img.onerror = () => {
                this.showLoading(false);
                alert(languageManager.t('error.imageLoadFailed'));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    loadSample(samplePath) {
        this.showLoading(true);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.currentImage = img;
            this.showLoading(false);
            this.callbacks.imageLoaded.forEach(cb => cb(img));
        };
        img.onerror = () => {
            this.showLoading(false);
            alert(languageManager.t('error.imageLoadFailed'));
        };
        img.src = samplePath;
    }

    async initializeWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });

            this.webcamStream = stream;
            this.webcamVideo.srcObject = stream;
            this.isWebcamActive = true;

            this.webcamToggle.textContent = languageManager.currentLanguage === 'ja' ? 'Webカメラを閉じる' : 'Close Webcam';
            this.webcamToggle.classList.add('active');
            this.webcamCapture.style.display = 'inline-block';

            // Start streaming to canvas
            this.startWebcamStream();
        } catch (error) {
            alert(languageManager.t('error.cameraAccessDenied'));
            console.error('Camera access error:', error);
        }
    }

    startWebcamStream() {
        const streamFrame = () => {
            if (this.isWebcamActive && this.webcamVideo.readyState === this.webcamVideo.HAVE_ENOUGH_DATA) {
                // Create a canvas from the video frame
                const canvas = document.createElement('canvas');
                canvas.width = this.webcamVideo.videoWidth;
                canvas.height = this.webcamVideo.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this.webcamVideo, 0, 0);
                const img = new Image();
                img.src = canvas.toDataURL();
                img.onload = () => {
                    this.currentImage = img;
                    this.callbacks.imageLoaded.forEach(cb => cb(img));
                };
                requestAnimationFrame(streamFrame);
            } else if (this.isWebcamActive) {
                requestAnimationFrame(streamFrame);
            }
        };
        requestAnimationFrame(streamFrame);
    }

    captureFromWebcam() {
        if (this.webcamVideo.readyState === this.webcamVideo.HAVE_ENOUGH_DATA) {
            const canvas = document.createElement('canvas');
            canvas.width = this.webcamVideo.videoWidth;
            canvas.height = this.webcamVideo.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.webcamVideo, 0, 0);

            const img = new Image();
            img.src = canvas.toDataURL();
            img.onload = () => {
                this.currentImage = img;
                this.stopWebcam();
                this.callbacks.imageLoaded.forEach(cb => cb(img));
            };
        }
    }

    stopWebcam() {
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }
        this.isWebcamActive = false;
        this.webcamToggle.textContent = languageManager.currentLanguage === 'ja' ? 'Webカメラを開く' : 'Open Webcam';
        this.webcamToggle.classList.remove('active');
        this.webcamCapture.style.display = 'none';
    }

    clearImage() {
        this.currentImage = null;
        this.fileInput.value = '';
        this.sampleSelector.value = '';
        if (this.isWebcamActive) {
            this.stopWebcam();
        }
        this.callbacks.imageCleared.forEach(cb => cb());
    }

    getCurrentImage() {
        return this.currentImage;
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    onImageLoaded(callback) {
        this.callbacks.imageLoaded.push(callback);
    }

    onImageCleared(callback) {
        this.callbacks.imageCleared.push(callback);
    }
}

// Create global instance
const inputHandler = new InputHandler();
