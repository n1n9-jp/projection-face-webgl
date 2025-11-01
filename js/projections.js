class ProjectionManager {
    constructor() {
        this.projections = [
            {
                id: 'mercator',
                name: 'Mercator',
                shaderKey: 'MERCATOR',
                description: 'Conformal projection',
                supportsInvert: true
            },
            {
                id: 'stereographic',
                name: 'Stereographic',
                shaderKey: 'STEREOGRAPHIC',
                description: 'Conformal projection',
                supportsInvert: true
            },
            {
                id: 'equalEarth',
                name: 'Equal Earth',
                shaderKey: 'EQUAL_EARTH',
                description: 'Equal-area projection',
                supportsInvert: true
            },
            {
                id: 'mollweide',
                name: 'Mollweide',
                shaderKey: 'MOLLWEIDE',
                description: 'Equal-area projection',
                supportsInvert: true
            },
            {
                id: 'azimuthalEquidistant',
                name: 'Azimuthal Equidistant',
                shaderKey: 'AZIMUTHAL_EQUIDISTANT',
                description: 'Equidistant from center',
                supportsInvert: true
            },
            {
                id: 'orthographic',
                name: 'Orthographic',
                shaderKey: 'ORTHOGRAPHIC',
                description: 'Perspective projection',
                supportsInvert: false
            },
            {
                id: 'gnomonic',
                name: 'Gnomonic',
                shaderKey: 'GNOMONIC',
                description: 'Perspective projection',
                supportsInvert: false
            },
            {
                id: 'naturalEarth',
                name: 'Natural Earth',
                shaderKey: 'NATURAL_EARTH',
                description: 'Compromise projection',
                supportsInvert: true
            }
        ];

        this.currentProjection = this.projections[0];
        this.params = {
            scale: 150,
            rotationX: 0,  // longitude
            rotationY: 0   // latitude
        };
    }

    getProjections() {
        return this.projections;
    }

    setProjection(id) {
        const proj = this.projections.find(p => p.id === id);
        if (proj) {
            this.currentProjection = proj;
            return true;
        }
        return false;
    }

    getCurrentProjection() {
        return this.currentProjection;
    }

    setScale(scale) {
        this.params.scale = Math.max(50, Math.min(500, scale));
    }

    setRotationX(angle) {
        this.params.rotationX = angle;
    }

    setRotationY(angle) {
        this.params.rotationY = angle;
    }

    getParams() {
        return { ...this.params };
    }

    reset() {
        this.params = {
            scale: 150,
            rotationX: 0,
            rotationY: 0
        };
    }

    getProjectionDescription(id) {
        const proj = this.projections.find(p => p.id === id);
        return proj ? `${languageManager.t(`projections.${id}.name`)} - ${languageManager.t(`projections.${id}.description`)}` : '';
    }
}

// Create global instance
const projectionManager = new ProjectionManager();
