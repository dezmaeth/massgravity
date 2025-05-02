import * as THREE from 'three';
import { createAtmosphereMaterial } from '../materials/atmosphere.js';

export class Star {
    constructor(options = {}) {
        this.options = {
            radius: options.radius || 30,
            detail: options.detail || 32,
            color: options.color || new THREE.Color(0xFFC65C),
            glowColor: options.glowColor || new THREE.Color(0xFFC65C),
            glowScale: options.glowScale || 1.15,
            rotationSpeed: options.rotationSpeed || 0.0005,
            name: options.name || "Unnamed Star",
            type: options.type || "G-type",
            temperature: options.temperature || 5778,
            luminosity: options.luminosity || 1
        };

        // Create a container for the star
        this.container = new THREE.Object3D();
        this.container.userData = {
            isSelectable: true,
            isStar: true,
            starData: {
                name: this.options.name,
                type: this.options.type,
                temperature: this.options.temperature,
                luminosity: this.options.luminosity
            }
        };

        //this.createStar();
        this.createGlow();
        this.createLight();

        // Add animate method to the container
        this.container.animate = (delta) => this.animate(delta);
        
        return this.container;
    }

    createStar() {
        const geometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );

        // Create material for the star surface
        const material = new THREE.MeshBasicMaterial({
            color: this.options.color,
            emissive: this.options.color,
            emissiveIntensity: 1.5
        });

        // Create mesh and add to container
        this.starMesh = new THREE.Mesh(geometry, material);
        this.container.add(this.starMesh);
    }

    createGlow() {
        // Inner glow
        const innerGeometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );
        
        const innerMaterial = createAtmosphereMaterial();
        innerMaterial.uniforms.glowColor.value = this.options.glowColor;
        innerMaterial.uniforms.coeficient.value = 0.5;
        innerMaterial.uniforms.power.value = 2.0;
        
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
        innerMesh.scale.multiplyScalar(0.5);
        this.container.add(innerMesh);
        
        // Outer glow
        const outerGeometry = new THREE.SphereGeometry(
            this.options.radius,
            this.options.detail,
            this.options.detail
        );
        
        const outerMaterial = createAtmosphereMaterial();
        outerMaterial.side = THREE.BackSide;
        outerMaterial.uniforms.glowColor.value = this.options.glowColor;
        outerMaterial.uniforms.coeficient.value = 0.4;
        outerMaterial.uniforms.power.value = 4.0;
        
        const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
        outerMesh.scale.multiplyScalar(this.options.glowScale);
        this.container.add(outerMesh);
    }

    createLight() {
        // Add point light with increased intensity
        const light = new THREE.PointLight(0xffffff, 4, 0, 0, 200);
        light.power = 50;
        light.castShadow = true;
        
        // Set up shadow parameters
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.0005;
        light.shadow.normalBias = 0.02;
        light.shadow.camera.far = 1000;
        
        this.container.add(light);
    }

    animate(delta) {
        // Rotate star
        if (this.starMesh) {
            this.starMesh.rotation.y += this.options.rotationSpeed * delta;
        }
    }
}