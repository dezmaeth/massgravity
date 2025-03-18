import * as THREE from 'three';
import { createAtmosphereMaterial } from '../materials/atmosphere.js';
import { createNoiseMaterial } from '../materials/noise.js';
import { PlanetMaterialGenerator } from '../materials/planetMaterial.js';

// Create a singleton instance of the material generator
const materialGenerator = new PlanetMaterialGenerator();

export class Planet {
    constructor(options = {}) {
        this.options = {
            radius: options.radius || 10,
            detail: options.detail || 32,
            color: options.color || new THREE.Color(0x44ff44),
            atmosphereColor: options.atmosphereColor || new THREE.Color(0x00b3ff),
            atmosphereScale: options.atmosphereScale || 1.15,
            cloudSpeed: options.cloudSpeed || 0.0005, // Slowed down cloud rotation
            rotationSpeed: options.rotationSpeed || 0.0001, // Slowed down planet rotation
            name: options.name || "Unnamed Planet",
            type: options.type || "Terrestrial",
            resources: options.resources || {
                minerals: Math.random() * 100,
                energy: Math.random() * 100,
                water: Math.random() * 100
            },
            hasAtmosphere: options.hasAtmosphere !== undefined ? options.hasAtmosphere : true,
            distanceFromSun: options.distanceFromSun || 100, // Distance from the sun for climate calculation
            seed: options.seed || Math.random() * 1000, // Random seed for consistent generation
            hasOcean: options.hasOcean !== undefined ? options.hasOcean : true,
            oceanLevel: options.oceanLevel || 0.65 // Ocean level (0-1)
        };

        // Calculate climate type based on distance from sun
        this.determineClimateType();

        // Create container for the planet
        this.container = new THREE.Object3D();
        this.container.userData = {
            isSelectable: true,
            isPlanet: true,
            planetData: {
                name: this.options.name,
                type: this.options.type,
                climate: this.options.climate,
                resources: this.options.resources,
                structures: [] // Will store orbital structures
            }
        };

        this.createPlanet();
        
        if (this.options.hasAtmosphere) {
            this.createAtmosphere();
            this.createClouds();
        }
        
        // Container for orbital structures
        this.orbitalsContainer = new THREE.Object3D();
        this.container.add(this.orbitalsContainer);

        // Add animate method to the container
        this.container.animate = (delta) => this.animate(delta);
        
        // Add building method to the container
        this.container.addStructure = (type) => this.addStructure(type);
        
        return this.container;
    }

    determineClimateType() {
        // Get climate zone using the material generator
        const climateZone = materialGenerator.getClimateZone(this.options.distanceFromSun);
        this.options.climate = climateZone.name;
        
        // Adjust planet features based on climate
        if (this.options.climate === 'desert') {
            this.options.hasOcean = false;
            this.options.oceanLevel = 0;
            this.options.hasAtmosphere = this.options.hasAtmosphere && Math.random() > 0.3; // 30% chance of no atmosphere
        } else if (this.options.climate === 'ice') {
            this.options.oceanLevel = 0.4; // Less water, more ice
        }
    }

    createPlanet() {
        // Create geometry
        const geometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );

        // Generate materials using the procedural generator
        const planetMaterials = materialGenerator.generatePlanetMaterial({
            distanceFromSun: this.options.distanceFromSun,
            radius: this.options.radius,
            seed: this.options.seed,
            hasOcean: this.options.hasOcean,
            oceanLevel: this.options.oceanLevel
        });

        // Create main planet mesh
        this.planetMesh = new THREE.Mesh(geometry, planetMaterials.mainMaterial);
        this.planetMesh.castShadow = true;
        this.planetMesh.receiveShadow = true;
        this.container.add(this.planetMesh);

        // Apply random rotation
        this.planetMesh.rotation.x = Math.random() * Math.PI;
        this.planetMesh.rotation.y = Math.random() * Math.PI;
        this.planetMesh.rotation.z = Math.random() * Math.PI;

        // Add ocean if the planet has one
        if (this.options.hasOcean && planetMaterials.oceanMaterial) {
            const oceanGeometry = new THREE.SphereGeometry(
                this.options.radius * 1.001, // Slightly larger than the planet
                this.options.detail,
                this.options.detail
            );
            
            this.oceanMesh = new THREE.Mesh(oceanGeometry, planetMaterials.oceanMaterial);
            this.oceanMesh.castShadow = false;
            this.oceanMesh.receiveShadow = true;
            this.container.add(this.oceanMesh);
        }
        
        // Store generated textures for animation
        this.planetTextures = planetMaterials.textures;
    }

    createAtmosphere() {
        // Set atmosphere color based on climate type
        let atmosphereColor = this.options.atmosphereColor;
        let atmosphereScale = this.options.atmosphereScale;
        let atmosphereDensity = 1.0;
        
        // Adjust atmosphere based on climate
        switch (this.options.climate) {
            case 'desert':
                // Thin, reddish atmosphere for desert planets
                atmosphereColor = new THREE.Color(0xff7700);
                atmosphereScale = 1.05;
                atmosphereDensity = 0.4;
                break;
            case 'tropical':
                // Thick, slightly blue-green atmosphere
                atmosphereColor = new THREE.Color(0x00fff7);
                atmosphereScale = 1.2;
                atmosphereDensity = 1.2;
                break;
            case 'temperate':
                // Blue atmosphere, earth-like
                atmosphereColor = new THREE.Color(0x00b3ff);
                atmosphereScale = 1.15;
                atmosphereDensity = 1.0;
                break;
            case 'arctic':
                // Pale blue, thinner atmosphere
                atmosphereColor = new THREE.Color(0x8eaeff);
                atmosphereScale = 1.1;
                atmosphereDensity = 0.7;
                break;
            case 'ice':
                // Very pale, thin atmosphere
                atmosphereColor = new THREE.Color(0xc4e0ff);
                atmosphereScale = 1.05;
                atmosphereDensity = 0.5;
                break;
        }
        
        // Inner atmosphere glow
        const innerGeometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );
        
        const innerMaterial = createAtmosphereMaterial();
        innerMaterial.uniforms.glowColor.value = atmosphereColor;
        innerMaterial.uniforms.coeficient.value = 0.8;
        innerMaterial.uniforms.power.value = 2.0 / atmosphereDensity;
        
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
        innerMesh.scale.multiplyScalar(1.01);
        this.container.add(innerMesh);
        
        // Outer atmosphere glow
        const outerGeometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );
        
        const outerMaterial = createAtmosphereMaterial();
        outerMaterial.side = THREE.BackSide;
        outerMaterial.uniforms.glowColor.value = atmosphereColor;
        outerMaterial.uniforms.coeficient.value = 0.4;
        outerMaterial.uniforms.power.value = 4.0 / atmosphereDensity;
        
        const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
        outerMesh.scale.multiplyScalar(atmosphereScale);
        this.container.add(outerMesh);
        
        // Store the atmosphere components for animation
        this.innerAtmosphere = innerMesh;
        this.outerAtmosphere = outerMesh;
    }

    createClouds() {
        // Create cloud layer with properties based on climate type
        let cloudCoverage = 1.0;
        let cloudOpacity = 0.4;
        let cloudColor = 0xffffff;
        let cloudHeight = 1.02;
        
        // Adjust clouds based on climate
        switch (this.options.climate) {
            case 'desert':
                // Minimal clouds for desert planets
                cloudCoverage = 0.3;
                cloudOpacity = 0.2;
                cloudColor = 0xffffee; // Slight yellowish tint
                cloudHeight = 1.03; // Higher clouds
                break;
            case 'tropical':
                // Heavy cloud cover for tropical planets
                cloudCoverage = 1.5;
                cloudOpacity = 0.6;
                cloudColor = 0xffffff;
                cloudHeight = 1.02;
                break;
            case 'temperate':
                // Moderate cloud cover
                cloudCoverage = 1.0;
                cloudOpacity = 0.4;
                cloudColor = 0xffffff;
                cloudHeight = 1.02;
                break;
            case 'arctic':
                // Sparse high clouds
                cloudCoverage = 0.7;
                cloudOpacity = 0.5;
                cloudColor = 0xf0f8ff; // Very light blue tint
                cloudHeight = 1.025;
                break;
            case 'ice':
                // Minimal clouds
                cloudCoverage = 0.4;
                cloudOpacity = 0.3;
                cloudColor = 0xf0f8ff;
                cloudHeight = 1.015;
                break;
        }
        
        // Create cloud layer
        const cloudGeometry = new THREE.SphereGeometry(
            this.options.radius * cloudHeight,
            this.options.detail,
            this.options.detail
        );
        
        // Generate cloud texture based on climate
        const cloudTexture = this.generateCloudTexture(cloudCoverage);
        
        // Custom cloud material
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: cloudColor,
            transparent: true,
            opacity: cloudOpacity,
            alphaMap: cloudTexture,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.container.add(this.cloudMesh);
    }

    generateCloudTexture(coverage = 1.0) {
        const size = 512;
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const context = canvas.getContext('2d');
        
        // Fill with black
        context.fillStyle = '#000';
        context.fillRect(0, 0, size, size);
        
        // Add perlin noise cloud patterns
        const imageData = context.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Add noise pattern for cloud formation
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                // Generate cloud pattern using multiple noise octaves
                const nx = x / size * 4;
                const ny = y / size * 4;
                
                // Use simplified noise approximation
                let noise = 0;
                noise += Math.sin((nx + this.options.seed) * 10) * 0.5 + 0.5;
                noise += Math.sin((ny + this.options.seed) * 12) * 0.5 + 0.5;
                noise += Math.sin((nx + ny + this.options.seed) * 5) * 0.5 + 0.5;
                noise /= 3.0;
                
                // Apply coverage threshold - higher coverage means more clouds
                const threshold = 0.6 - (coverage * 0.2); // Values from 0.2 to 0.6 based on coverage
                const cloudValue = noise > threshold ? (noise - threshold) / (1 - threshold) : 0;
                
                // Store cloud value
                const value = Math.floor(cloudValue * 255);
                data[index] = value;     // R
                data[index + 1] = value; // G
                data[index + 2] = value; // B
                data[index + 3] = 255;   // A
            }
        }
        
        context.putImageData(imageData, 0, 0);
        
        // Add some larger cloud formations
        const nClouds = Math.floor(10 * coverage);
        context.fillStyle = '#fff';
        context.globalCompositeOperation = 'screen';
        
        for (let i = 0; i < nClouds; i++) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            const r = Math.floor((Math.random() * 60) + 40) * coverage;
            
            // Draw cloud patches
            context.beginPath();
            context.arc(x, y, r, 0, Math.PI * 2);
            context.fill();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    addStructure(type) {
        // Create orbital structure based on type
        let structure;
        let orbitRadius = this.options.radius * 1.8; // Base orbit radius
        let orbitSpeed = 0.00005; // Very slow orbit speed
        let color, scale;
        
        // Configure structure based on type
        switch(type) {
            case 'mining':
                color = 0xffcc00; // Gold color for mining
                scale = 0.15;
                orbitRadius = this.options.radius * 1.6;
                break;
            case 'research':
                color = 0x00ccff; // Blue for research
                scale = 0.2;
                orbitRadius = this.options.radius * 2.0;
                break;
            case 'colony':
                color = 0x00ff44; // Green for colony
                scale = 0.25;
                orbitRadius = this.options.radius * 2.4;
                break;
            case 'defense':
                color = 0xff3300; // Red for defense
                scale = 0.18;
                orbitRadius = this.options.radius * 1.8;
                break;
            default:
                color = 0xffffff;
                scale = 0.15;
        }
        
        // Create simple cube structure for now
        const geometry = new THREE.BoxGeometry(
            this.options.radius * scale,
            this.options.radius * scale,
            this.options.radius * scale
        );
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.2,
            emissive: color,
            emissiveIntensity: 0.2
        });
        
        structure = new THREE.Mesh(geometry, material);
        structure.castShadow = true;
        structure.receiveShadow = true;
        
        // Create orbit container
        const orbitContainer = new THREE.Object3D();
        orbitContainer.add(structure);
        
        // Position structure at orbit distance
        structure.position.x = orbitRadius;
        
        // Randomize initial position in orbit
        orbitContainer.rotation.y = Math.random() * Math.PI * 2;
        orbitContainer.rotation.x = (Math.random() - 0.5) * 0.3; // Slight tilt to orbit
        
        // Store orbital data
        orbitContainer.userData = {
            type: type,
            orbitSpeed: orbitSpeed
        };
        
        // Add to orbitals container
        this.orbitalsContainer.add(orbitContainer);
        
        // Add to planet data for saving
        this.container.userData.planetData.structures.push({
            type: type,
            orbitRadius: orbitRadius,
            orbitAngle: orbitContainer.rotation.y,
            orbitTilt: orbitContainer.rotation.x,
            scale: scale,
            color: color
        });
        
        return orbitContainer;
    }

    animate(delta) {
        // Rotate planet
        if (this.planetMesh) {
            this.planetMesh.rotation.y += this.options.rotationSpeed * delta;
        }
        
        // Rotate clouds at a different speed
        if (this.cloudMesh) {
            this.cloudMesh.rotation.y += this.options.cloudSpeed * delta;
        }
        
        // Rotate ocean if it exists
        if (this.oceanMesh) {
            // Rotate ocean slightly slower than the planet
            this.oceanMesh.rotation.y += this.options.rotationSpeed * 0.8 * delta;
            
            // Animate ocean waves if material is available (future enhancement)
            // if (this.oceanMesh.material.uniforms && this.oceanMesh.material.uniforms.time) {
            //     this.oceanMesh.material.uniforms.time.value += delta * 0.001;
            // }
        }
        
        // Animate atmosphere if needed
        if (this.innerAtmosphere) {
            // Possible future enhancement: add subtle atmospheric movement
        }
        
        // Animate orbital structures
        if (this.orbitalsContainer) {
            this.orbitalsContainer.children.forEach(orbit => {
                orbit.rotation.y += orbit.userData.orbitSpeed * delta;
            });
        }
    }
}