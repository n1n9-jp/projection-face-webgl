class InputHandler {
    constructor() {
        this.fileInput = document.getElementById('file-input');
        this.webcamToggle = document.getElementById('webcam-toggle');
        this.webcamPreview = document.getElementById('webcam-preview');
        this.cameraSelectGroup = document.getElementById('camera-select-group');
        this.webcamCapture = document.getElementById('webcam-capture');
        this.webcamStop = document.getElementById('webcam-stop');
        this.cameraSelect = document.getElementById('camera-select');
        this.sampleSelector = document.getElementById('sample-selector');
        this.webcamVideo = document.getElementById('webcam-video');
        this.loadingIndicator = document.getElementById('loading-indicator');

        this.webcamStream = null;
        this.currentImage = null;
        this.isWebcamActive = false;
        this.availableCameras = [];

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
        this.webcamToggle.addEventListener('click', async () => {
            if (this.isWebcamActive) {
                this.stopWebcam();
            } else {
                await this.enumerateCameras(true);
            }
        });

        // Camera select
        this.cameraSelect.addEventListener('change', (e) => {
            if (e.target.value && this.isWebcamActive) {
                this.initializeWebcam(e.target.value);
            }
        });

        // Webcam capture
        this.webcamCapture.addEventListener('click', () => {
            this.captureFromWebcam();
        });

        // Webcam stop
        this.webcamStop.addEventListener('click', () => {
            this.stopWebcam();
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

    async enumerateCameras(requestPermission = false) {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                throw new Error(languageManager.t('error.cameraUnsupported'));
            }

            // 許可を取得するために一度getUserMediaを呼ぶ
            if (requestPermission) {
                try {
                    const tempStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                    // すぐに停止
                    tempStream.getTracks().forEach(track => track.stop());
                } catch (permError) {
                    console.error('Permission error:', permError);
                    if (permError.name === 'NotAllowedError') {
                        alert('カメラへのアクセスが拒否されました。ブラウザの設定で許可してください。');
                    } else {
                        alert('カメラへのアクセスに失敗しました: ' + permError.message);
                    }
                    return;
                }
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(device => device.kind === 'videoinput');

            if (this.availableCameras.length === 0) {
                alert('使用可能なカメラが見つかりません');
                return;
            }

            this.populateCameraSelect();

            // webcam-preview を表示
            this.webcamPreview.style.display = 'flex';

            // camera-select-group を表示
            this.cameraSelectGroup.style.display = 'block';

            // 最初のカメラで初期化
            console.log('About to initialize webcam with camera:', this.availableCameras[0].deviceId);
            await this.initializeWebcam(this.availableCameras[0].deviceId);
        } catch (error) {
            alert('エラー: ' + error.message);
            console.error('Camera enumeration error:', error);
        }
    }

    populateCameraSelect() {
        this.cameraSelect.innerHTML = `<option value="">カメラを選択</option>`;

        this.availableCameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            this.cameraSelect.appendChild(option);
        });

        // 最初のカメラを自動選択
        if (this.availableCameras.length > 0) {
            this.cameraSelect.value = this.availableCameras[0].deviceId;
        }
    }

    async initializeWebcam(deviceId = null) {
        try {
            // 既存のストリームを停止
            if (this.webcamStream) {
                this.stopWebcam();
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error(languageManager.t('error.cameraUnsupported'));
            }

            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
                audio: false
            };

            this.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.webcamVideo.srcObject = this.webcamStream;

            this.isWebcamActive = true;

            // video 要素の再生を確認
            this.webcamVideo.onloadedmetadata = () => {
                this.webcamVideo.play().catch(err => {
                    console.error('Video play error:', err);
                });
            };

            this.webcamToggle.textContent = languageManager.currentLanguage === 'ja' ? 'Webカメラを閉じる' : 'Close Webcam';
            this.webcamToggle.classList.add('active');
        } catch (error) {
            console.error('Webcam initialization error:', error);
            let errorMessage = languageManager.t('error.cameraAccessDenied');
            if (error.name === 'NotFoundError') {
                errorMessage = 'カメラが見つかりません';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'カメラは既に使用中です';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'カメラへのアクセスが拒否されました';
            }
            alert('エラー: ' + errorMessage);
            this.isWebcamActive = false;
            this.webcamPreview.style.display = 'none';
            this.cameraSelectGroup.style.display = 'none';
        }
    }

    captureFromWebcam() {
        try {
            if (!this.webcamVideo || !this.webcamStream) {
                throw new Error('カメラが起動していません');
            }

            if (this.webcamVideo.readyState !== this.webcamVideo.HAVE_ENOUGH_DATA) {
                throw new Error('ビデオデータの準備ができていません');
            }

            const canvas = document.createElement('canvas');
            canvas.width = this.webcamVideo.videoWidth;
            canvas.height = this.webcamVideo.videoHeight;
            const ctx = canvas.getContext('2d');

            // 鏡像を元に戻す（transform: scaleX(-1)の反転）
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(this.webcamVideo, 0, 0, canvas.width, canvas.height);

            // Canvasから画像を作成
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.stopWebcam();
                this.callbacks.imageLoaded.forEach(cb => cb(img));
            };

            img.onerror = () => {
                alert('画像のキャプチャに失敗しました');
            };

            img.src = canvas.toDataURL('image/png');
        } catch (error) {
            alert('エラー: ' + error.message);
            console.error('Capture error:', error);
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
        this.webcamPreview.style.display = 'none';
        this.cameraSelectGroup.style.display = 'none';
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
