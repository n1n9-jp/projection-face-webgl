class GraticuleRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.graticuleDensity = 15; // degrees between lines
        this.lineColor = 'rgba(255, 255, 255, 0.5)'; // white, semi-transparent
        this.lineWidth = 1;
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.canvas.width = width;
        this.canvas.height = height;
    }

    // Forward projection functions for each type
    // Input: {lon, lat} in degrees
    // Output: {x, y} in normalized coordinates [0, 1]

    projectMercator(lon, lat) {
        const x = (lon + 180) / 360;
        const latRad = lat * Math.PI / 180;
        const y = 0.5 + Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / (2 * Math.PI);
        return { x, y };
    }

    projectStereographic(lon, lat) {
        const lonRad = lon * Math.PI / 180;
        const latRad = lat * Math.PI / 180;

        const cosc = Math.cos(latRad) * Math.cos(lonRad);
        const k = 1 / (1 + cosc);

        const x = 0.5 + k * Math.cos(latRad) * Math.sin(lonRad) * 0.5;
        const y = 0.5 + k * Math.sin(latRad) * 0.5;

        return { x, y };
    }

    projectEqualEarth(lon, lat) {
        const lonRad = lon * Math.PI / 180;
        const latRad = lat * Math.PI / 180;

        const A = 1.44708;
        const B = 0.54201;

        const x = lonRad * Math.sqrt(1 - 3 * Math.pow(Math.sin(latRad) / Math.PI, 2)) / (2 * Math.sqrt(2));
        const y = Math.asin(Math.sin(latRad) / 1.00694 - 0.00652 * Math.pow(latRad, 3) / 1.00694);

        return {
            x: 0.5 + x / (2 * Math.sqrt(2)),
            y: 0.5 + y / Math.PI
        };
    }

    projectOrthographic(lon, lat) {
        const lonRad = lon * Math.PI / 180;
        const latRad = lat * Math.PI / 180;

        const cosc = Math.cos(latRad) * Math.cos(lonRad);

        if (cosc < 0) return null; // Back side is hidden

        const x = 0.5 + Math.cos(latRad) * Math.sin(lonRad) * 0.5;
        const y = 0.5 + Math.sin(latRad) * 0.5;

        return { x, y };
    }

    projectGnomonic(lon, lat) {
        const lonRad = lon * Math.PI / 180;
        const latRad = lat * Math.PI / 180;

        const cosc = Math.cos(latRad) * Math.cos(lonRad);

        if (cosc <= 0) return null; // Back side is hidden

        const x = 0.5 + Math.atan2(Math.cos(latRad) * Math.sin(lonRad), cosc) * 0.5 / Math.PI;
        const y = 0.5 + Math.atan2(Math.sin(latRad), Math.sqrt(Math.pow(cosc, 2) + Math.pow(Math.cos(latRad) * Math.sin(lonRad), 2))) * 0.5 / Math.PI;

        return { x, y };
    }

    projectMollweide(lon, lat) {
        const lonRad = lon * Math.PI / 180;
        const latRad = lat * Math.PI / 180;

        let theta = latRad;
        for (let i = 0; i < 5; i++) {
            theta -= (theta + Math.sin(theta) - Math.PI * Math.sin(latRad)) / (1 + Math.cos(theta));
        }

        const x = 0.5 + lonRad * Math.cos(theta) / Math.PI;
        const y = 0.5 + theta / Math.PI;

        return { x, y };
    }

    projectAzimuthalEquidistant(lon, lat) {
        const lonRad = lon * Math.PI / 180;
        const latRad = lat * Math.PI / 180;

        const c = Math.acos(Math.sin(latRad));
        if (c === 0) {
            return { x: 0.5, y: 0.5 };
        }

        const k = c / Math.sin(c);
        const x = 0.5 + k * Math.cos(latRad) * Math.sin(lonRad) * 0.5;
        const y = 0.5 + k * Math.sin(latRad) * 0.5;

        return { x, y };
    }

    projectNaturalEarth(lon, lat) {
        // Simplified Natural Earth projection (approximation)
        return this.projectEqualEarth(lon, lat);
    }

    getProjectionFunction(projectionId) {
        const projectionFunctions = {
            'mercator': (lon, lat) => this.projectMercator(lon, lat),
            'stereographic': (lon, lat) => this.projectStereographic(lon, lat),
            'equalEarth': (lon, lat) => this.projectEqualEarth(lon, lat),
            'mollweide': (lon, lat) => this.projectMollweide(lon, lat),
            'azimuthalEquidistant': (lon, lat) => this.projectAzimuthalEquidistant(lon, lat),
            'orthographic': (lon, lat) => this.projectOrthographic(lon, lat),
            'gnomonic': (lon, lat) => this.projectGnomonic(lon, lat),
            'naturalEarth': (lon, lat) => this.projectNaturalEarth(lon, lat)
        };

        return projectionFunctions[projectionId] || projectionFunctions['mercator'];
    }

    drawGraticule(projectionId, rotationX, rotationY) {
        this.resizeCanvas();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Get projection function
        const projectFunc = this.getProjectionFunction(projectionId);

        // Set line style
        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = this.lineWidth;

        // Draw meridians (longitude lines)
        for (let lon = -180; lon <= 180; lon += 30) {
            this.ctx.beginPath();
            let isFirstPoint = true;

            for (let lat = -90; lat <= 90; lat += 2) {
                const adjustedLat = lat - rotationY;
                const adjustedLon = lon - rotationX;

                const proj = projectFunc(adjustedLon, adjustedLat);
                if (proj === null) continue;

                const x = proj.x * this.canvas.width;
                const y = proj.y * this.canvas.height;

                if (isFirstPoint) {
                    this.ctx.moveTo(x, y);
                    isFirstPoint = false;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.stroke();
        }

        // Draw parallels (latitude lines)
        for (let lat = -90; lat <= 90; lat += 15) {
            this.ctx.beginPath();
            let isFirstPoint = true;

            for (let lon = -180; lon <= 180; lon += 2) {
                const adjustedLat = lat - rotationY;
                const adjustedLon = lon - rotationX;

                const proj = projectFunc(adjustedLon, adjustedLat);
                if (proj === null) continue;

                const x = proj.x * this.canvas.width;
                const y = proj.y * this.canvas.height;

                if (isFirstPoint) {
                    this.ctx.moveTo(x, y);
                    isFirstPoint = false;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.stroke();
        }
    }
}

// Create global instance
const graticuleRenderer = new GraticuleRenderer('graticule-canvas');
