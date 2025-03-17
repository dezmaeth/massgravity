import * as THREE from 'three';
import { createAtmosphereMaterial } from '../materials/atmosphere.js';
import { createNoiseMaterial } from '../materials/noise.js';

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
            hasAtmosphere: options.hasAtmosphere !== undefined ? options.hasAtmosphere : true
        };

        // Create container for the planet
        this.container = new THREE.Object3D();
        this.container.userData = {
            isSelectable: true,
            isPlanet: true,
            planetData: {
                name: this.options.name,
                type: this.options.type,
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

    createPlanet() {
        const geometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );

        // Create material based on planet type
        const material = new THREE.MeshStandardMaterial({
            color: this.options.color,
            roughness: 0.7,
            metalness: 0.2,
            bumpScale: 0.05
        });

        // Create mesh and add to container
        this.planetMesh = new THREE.Mesh(geometry, material);
        this.planetMesh.castShadow = true;
        this.planetMesh.receiveShadow = true;
        this.container.add(this.planetMesh);

        // Apply random rotation
        this.planetMesh.rotation.x = Math.random() * Math.PI;
        this.planetMesh.rotation.y = Math.random() * Math.PI;
        this.planetMesh.rotation.z = Math.random() * Math.PI;
    }

    createAtmosphere() {
        // Inner atmosphere glow
        const innerGeometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );
        
        const innerMaterial = createAtmosphereMaterial();
        innerMaterial.uniforms.glowColor.value = this.options.atmosphereColor;
        innerMaterial.uniforms.coeficient.value = 0.8;
        innerMaterial.uniforms.power.value = 2.0;
        
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
        outerMaterial.uniforms.glowColor.value = this.options.atmosphereColor;
        outerMaterial.uniforms.coeficient.value = 0.4;
        outerMaterial.uniforms.power.value = 4.0;
        
        const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
        outerMesh.scale.multiplyScalar(this.options.atmosphereScale);
        this.container.add(outerMesh);
    }

    createClouds() {
        // Create cloud layer
        const cloudGeometry = new THREE.SphereGeometry(
            this.options.radius * 1.02,
            this.options.detail,
            this.options.detail
        );
        
        // Custom cloud material
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            alphaMap: this.generateCloudTexture(),
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.container.add(this.cloudMesh);
    }

    generateCloudTexture() {
        const size = 512;
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const context = canvas.getContext('2d');
        
        // Fill with black
        context.fillStyle = '#000';
        context.fillRect(0, 0, size, size);
        
        // Add cloud pattern
        const nClouds = 20;
        context.fillStyle = '#fff';
        
        for (let i = 0; i < nClouds; i++) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            const r = Math.floor(Math.random() * 60) + 40;
            
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
        
        // Animate orbital structures
        if (this.orbitalsContainer) {
            this.orbitalsContainer.children.forEach(orbit => {
                orbit.rotation.y += orbit.userData.orbitSpeed * delta;
            });
        }
    }
}