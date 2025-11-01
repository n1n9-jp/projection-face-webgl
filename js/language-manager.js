class LanguageManager {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = {
            ja: {
                'header.title': '顔の画像で学ぶ地図投影法 WebGL版',
                'projectionSelector': '投影法を選択',
                'sections.input': '入力',
                'sections.controls': '制御',
                'sections.info': '投影法情報',
                'sections.performance': 'パフォーマンス',
                'input.uploadSource': 'アップロード',
                'input.upload': '画像をアップロード',
                'input.webcamSource': 'Webカメラ',
                'input.webcam': 'Webカメラを開く',
                'input.selectCamera': 'カメラを選択',
                'input.capture': 'キャプチャ',
                'input.stop': '閉じる',
                'input.samplesSource': 'サンプル画像',
                'input.samples': 'サンプルを選択',
                'input.clear': 'クリア',
                'controls.scale': 'スケール',
                'controls.rotationX': '回転 X (経度)',
                'controls.rotationY': '回転 Y (緯度)',
                'controls.reset': 'リセット',
                'info.selectProjection': '投影法を選択してください',
                'performance.fps': 'FPS:',
                'status.loading': '処理中...',
                'footer.credits': '© 2024 Projection Face WebGL',
                'projections.mercator.name': 'メルカトル図法',
                'projections.mercator.description': '正角図法。角度を保持しますが、高緯度で面積が拡大します。',
                'projections.stereographic.name': 'ステレオ図法',
                'projections.stereographic.description': '正角図法。中心から距離が離れるほど歪みます。',
                'projections.equalEarth.name': 'イコールアース図法',
                'projections.equalEarth.description': '正積図法。面積を保持し、視覚的に自然です。',
                'projections.mollweide.name': 'モルワイデ図法',
                'projections.mollweide.description': '正積図法。面積を保持し、楕円形をしています。',
                'projections.azimuthalEquidistant.name': '正距方位図法',
                'projections.azimuthalEquidistant.description': '中心からの距離を保持します。',
                'projections.orthographic.name': '正射図法',
                'projections.orthographic.description': '透視図法。宇宙から見た地球のような投影。',
                'projections.gnomonic.name': '心射図法',
                'projections.gnomonic.description': '透視図法。大圏航路が直線になります。',
                'projections.naturalEarth.name': 'ナチュラルアース図法',
                'projections.naturalEarth.description': '妥協図法。様々な要素のバランスに優れています。',
                'error.noWebGL': 'お使いのブラウザは WebGL に対応していません。',
                'error.imageLoadFailed': '画像の読み込みに失敗しました。',
                'error.cameraAccessDenied': 'カメラへのアクセスが拒否されました。',
                'error.cameraUnsupported': 'お使いのブラウザはカメラに対応していません。',
                'error.cameraNotFound': 'カメラが見つかりません。'
            },
            en: {
                'header.title': 'Map Projection Face Visualization - WebGL',
                'projectionSelector': 'Select Projection',
                'sections.input': 'Input',
                'sections.controls': 'Controls',
                'sections.info': 'Projection Info',
                'sections.performance': 'Performance',
                'input.uploadSource': 'Upload',
                'input.upload': 'Upload Image',
                'input.webcamSource': 'Webcam',
                'input.webcam': 'Open Webcam',
                'input.selectCamera': 'Select Camera',
                'input.capture': 'Capture',
                'input.stop': 'Close',
                'input.samplesSource': 'Sample Images',
                'input.samples': 'Select Sample',
                'input.clear': 'Clear',
                'controls.scale': 'Scale',
                'controls.rotationX': 'Rotation X (Longitude)',
                'controls.rotationY': 'Rotation Y (Latitude)',
                'controls.reset': 'Reset',
                'info.selectProjection': 'Select a projection to view info',
                'performance.fps': 'FPS:',
                'status.loading': 'Processing...',
                'footer.credits': '© 2024 Projection Face WebGL',
                'projections.mercator.name': 'Mercator',
                'projections.mercator.description': 'Conformal projection. Preserves angles but distorts area at high latitudes.',
                'projections.stereographic.name': 'Stereographic',
                'projections.stereographic.description': 'Conformal projection. Distortion increases with distance from center.',
                'projections.equalEarth.name': 'Equal Earth',
                'projections.equalEarth.description': 'Equal-area projection. Preserves area and looks natural.',
                'projections.mollweide.name': 'Mollweide',
                'projections.mollweide.description': 'Equal-area projection. Elliptical shape preserving area.',
                'projections.azimuthalEquidistant.name': 'Azimuthal Equidistant',
                'projections.azimuthalEquidistant.description': 'Preserves distances from the center point.',
                'projections.orthographic.name': 'Orthographic',
                'projections.orthographic.description': 'Perspective projection. View of Earth from space.',
                'projections.gnomonic.name': 'Gnomonic',
                'projections.gnomonic.description': 'Perspective projection. Great circles become straight lines.',
                'projections.naturalEarth.name': 'Natural Earth',
                'projections.naturalEarth.description': 'Compromise projection with balanced properties.',
                'error.noWebGL': 'Your browser does not support WebGL.',
                'error.imageLoadFailed': 'Failed to load image.',
                'error.cameraAccessDenied': 'Camera access was denied.',
                'error.cameraUnsupported': 'Your browser does not support camera access.',
                'error.cameraNotFound': 'No camera found.'
            }
        };
        this.callbacks = [];
    }

    detectLanguage() {
        const storedLang = localStorage.getItem('language');
        if (storedLang) {
            return storedLang;
        }
        const browserLang = navigator.language.split('-')[0];
        return (browserLang === 'ja') ? 'ja' : 'en';
    }

    t(key, defaultValue = null) {
        const translation = this.translations[this.currentLanguage][key];
        return translation || defaultValue || key;
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.updateAllUI();
            this.callbacks.forEach(cb => cb(lang));
        }
    }

    onLanguageChange(callback) {
        this.callbacks.push(callback);
    }

    updateAllUI() {
        // Update data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        // Update placeholder attributes
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Update title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });
    }

    initialize() {
        this.updateAllUI();
    }
}

// Create global instance
const languageManager = new LanguageManager();
