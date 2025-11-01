class UIControls {
    constructor() {
        this.projectionSelector = document.getElementById('projection-selector');
        this.scaleSlider = document.getElementById('scale-slider');
        this.rotationXSlider = document.getElementById('rotation-x-slider');
        this.rotationYSlider = document.getElementById('rotation-y-slider');
        this.scaleValue = document.getElementById('scale-value');
        this.rotationXValue = document.getElementById('rotation-x-value');
        this.rotationYValue = document.getElementById('rotation-y-value');
        this.infoContent = document.getElementById('info-content');
        this.resetBtn = document.getElementById('reset-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.langToggle = document.getElementById('lang-toggle');

        // Transition management
        this.transitionDuration = 1000; // milliseconds (1 second)
        this.transitionStartTime = null;
        this.previousProjection = null;
        this.nextProjection = null;
        this.isTransitioning = false;

        this.callbacks = {
            projectionChange: [],
            paramChange: [],
            reset: [],
            clear: []
        };
    }

    initialize() {
        this.populateProjectionSelector();
        this.setupEventListeners();
        this.updateProjectionInfo();

        // Set initial language toggle button text
        const currentLang = languageManager.currentLanguage;
        this.langToggle.textContent = currentLang === 'ja' ? 'English' : '日本語';
    }

    populateProjectionSelector() {
        const projections = projectionManager.getProjections();
        this.projectionSelector.innerHTML = '';

        projections.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.id;
            option.textContent = languageManager.t(`projections.${proj.id}.name`, proj.name);
            this.projectionSelector.appendChild(option);
        });

        this.projectionSelector.value = projectionManager.getCurrentProjection().id;
    }

    setupEventListeners() {
        // Projection selector
        this.projectionSelector.addEventListener('change', (e) => {
            this.startProjectionTransition(e.target.value);
        });

        // Scale slider
        this.scaleSlider.addEventListener('input', (e) => {
            const scale = parseInt(e.target.value);
            projectionManager.setScale(scale);
            this.scaleValue.textContent = scale;
            this.callbacks.paramChange.forEach(cb => cb());
        });

        // Rotation X slider
        this.rotationXSlider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value);
            projectionManager.setRotationX(angle);
            this.rotationXValue.textContent = angle + '°';
            this.callbacks.paramChange.forEach(cb => cb());
        });

        // Rotation Y slider
        this.rotationYSlider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value);
            projectionManager.setRotationY(angle);
            this.rotationYValue.textContent = angle + '°';
            this.callbacks.paramChange.forEach(cb => cb());
        });

        // Reset button
        this.resetBtn.addEventListener('click', () => {
            projectionManager.reset();
            this.scaleSlider.value = projectionManager.getParams().scale;
            this.rotationXSlider.value = projectionManager.getParams().rotationX;
            this.rotationYSlider.value = projectionManager.getParams().rotationY;
            this.scaleValue.textContent = projectionManager.getParams().scale;
            this.rotationXValue.textContent = projectionManager.getParams().rotationX + '°';
            this.rotationYValue.textContent = projectionManager.getParams().rotationY + '°';
            this.callbacks.reset.forEach(cb => cb());
        });

        // Clear button
        this.clearBtn.addEventListener('click', () => {
            this.callbacks.clear.forEach(cb => cb());
        });

        // Language toggle
        this.langToggle.addEventListener('click', () => {
            const newLang = languageManager.currentLanguage === 'ja' ? 'en' : 'ja';
            languageManager.setLanguage(newLang);
            this.langToggle.textContent = newLang === 'ja' ? 'English' : '日本語';
            this.updateProjectionInfo();
            this.populateProjectionSelector();
        });

        // Language change event
        languageManager.onLanguageChange(() => {
            this.updateProjectionInfo();
            this.populateProjectionSelector();
        });
    }

    updateProjectionInfo() {
        const proj = projectionManager.getCurrentProjection();
        const description = languageManager.t(`projections.${proj.id}.description`, proj.description);
        this.infoContent.innerHTML = `
            <h3>${languageManager.t(`projections.${proj.id}.name`, proj.name)}</h3>
            <p>${description}</p>
        `;
    }

    onProjectionChange(callback) {
        this.callbacks.projectionChange.push(callback);
    }

    onParamChange(callback) {
        this.callbacks.paramChange.push(callback);
    }

    onReset(callback) {
        this.callbacks.reset.push(callback);
    }

    onClear(callback) {
        this.callbacks.clear.push(callback);
    }

    getProjectionSelector() {
        return this.projectionSelector;
    }

    // Transition management
    startProjectionTransition(newProjectionId) {
        // Store previous projection
        this.previousProjection = projectionManager.getCurrentProjection();
        this.nextProjection = projectionManager.getProjections().find(p => p.id === newProjectionId);

        // Start transition
        this.transitionStartTime = performance.now();
        this.isTransitioning = true;

        // Update projection manager
        projectionManager.setProjection(newProjectionId);

        // Update UI
        this.updateProjectionInfo();

        // Notify listeners
        this.callbacks.projectionChange.forEach(cb => cb(newProjectionId));
    }

    getTransitionProgress() {
        if (!this.isTransitioning || !this.transitionStartTime) {
            return 1.0;
        }

        const elapsed = performance.now() - this.transitionStartTime;
        let linearProgress = Math.min(elapsed / this.transitionDuration, 1.0);

        // Apply easeInOutBack easing function
        const easedProgress = this.easeInOutBack(linearProgress);

        // Apply amplitude multiplier (1.5 means the value can go from 0.0 to 1.5)
        // This creates an overshoot/inertia effect where it goes beyond the target and back
        const amplified = easedProgress * 1.5;

        // Complete transition
        if (linearProgress >= 1.0) {
            this.isTransitioning = false;
            this.transitionStartTime = null;
            this.previousProjection = null;
        }

        return amplified;
    }

    // easeInOutBack: https://easings.net/#easeInOutBack
    // Smooth back-and-forth easing with overshoot effect
    easeInOutBack(t) {
        const c1 = 2.5;  // Increased overshoot amount (from 1.70158)
        const c2 = c1 * 1.525;

        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    }

    getCurrentTransitionInfo() {
        return {
            isTransitioning: this.isTransitioning,
            fromProjection: this.previousProjection,
            toProjection: this.nextProjection,
            progress: this.getTransitionProgress()
        };
    }
}

// Create global instance
const uiControls = new UIControls();
