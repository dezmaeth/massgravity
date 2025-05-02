import * as THREE from 'three';
import { createAtmosphereMaterial } from '../materials/atmosphere.js';
import { PlanetMaterialGenerator } from '../materials/planetMaterial.js';
import { loadStructureModel } from '../units/loadStructureModel.js';

const materialGenerator = new PlanetMaterialGenerator();

export class Planet {
    constructor(options = {}) {
        this.options = {
            radius: options.radius || 10,
            detail: options.detail || 128,
            color: options.color || new THREE.Color(0x44ff44),
            atmosphereColor: options.atmosphereColor || new THREE.Color(0x00b3ff),
            atmosphereScale: options.atmosphereScale || 1.15,
            cloudSpeed: 0.0005 / Math.max(options.radius, 1),
            rotationSpeed: options.rotationSpeed || 0.0001,
            name: options.name || "Unnamed Planet",
            type: options.type || "Terrestrial",
            resources: options.resources || {
                minerals: Math.random() * 100,
                energy: Math.random() * 100,
                water: Math.random() * 100
            },
            hasAtmosphere: options.hasAtmosphere !== undefined ? options.hasAtmosphere : true,
            distanceFromSun: options.distanceFromSun || 100,
            seed: options.seed || Math.random() * 1000,
            hasOcean: options.hasOcean !== undefined ? options.hasOcean : true,
            oceanLevel: options.oceanLevel || 0.5
        };

        this.determineClimateType();

        this.container = new THREE.Object3D();
        this.container.userData = {
            isSelectable: true,
            isPlanet: true,
            planetData: {
                name: this.options.name,
                type: this.options.type,
                climate: this.options.climate,
                resources: this.options.resources,
                structures: []
            }
        };

        this.createPlanet();
        if (this.options.hasAtmosphere) {
            this.createAtmosphere();
            this.createClouds();
        }

        this.orbitalsContainer = new THREE.Object3D();
        this.container.add(this.orbitalsContainer);

        this.container.animate = (delta) => this.animate(delta);
        this.container.addStructure = (type) => this.addStructure(type);

        return this.container;
    }

    determineClimateType() {
        const climateZone = materialGenerator.getClimateZone(this.options.distanceFromSun);
        this.options.climate = climateZone.name;

        if (this.options.climate === 'desert') {
            this.options.hasOcean = false;
            this.options.oceanLevel = 0;
            this.options.hasAtmosphere = this.options.hasAtmosphere && Math.random() > 0.3;
        } else if (this.options.climate === 'ice') {
            this.options.oceanLevel = 0.4;
        }
    }

    createPlanet() {
        const segments = Math.max(128, this.options.detail || 64);

        const geometry = new THREE.SphereGeometry(
            this.options.radius,
            segments,
            segments
        );

        let userId = 'default';
        if (window.gameState && window.gameState.userId) {
            userId = window.gameState.userId;
        }

        const planetMaterials = materialGenerator.generatePlanetMaterial({
            distanceFromSun: this.options.distanceFromSun,
            radius: this.options.radius,
            seed: this.options.seed,
            hasOcean: this.options.hasOcean,
            oceanLevel: this.options.oceanLevel,
            userId: userId
        });


        this.planetMesh = new THREE.Mesh(geometry, planetMaterials.mainMaterial);
        this.planetMesh.castShadow = true;
        this.planetMesh.receiveShadow = true;
        this.container.add(this.planetMesh);

        this.planetMesh.rotation.x = Math.random() * Math.PI;
        this.planetMesh.rotation.y = Math.random() * Math.PI;
        this.planetMesh.rotation.z = Math.random() * Math.PI;

        this.oceanMesh = null;
        this.planetTextures = planetMaterials.textures;
    }

    createAtmosphere() {
        let atmosphereColor = this.options.atmosphereColor;
        let atmosphereScale = this.options.atmosphereScale;
        let atmosphereDensity = 1.0;

        switch (this.options.climate) {
            case 'desert':
                atmosphereColor = new THREE.Color(0xff7700);
                atmosphereScale = 1.05;
                atmosphereDensity = 0.4;
                break;
            case 'tropical':
                atmosphereColor = new THREE.Color(0x00fff7);
                atmosphereScale = 1.2;
                atmosphereDensity = 1.2;
                break;
            case 'temperate':
                atmosphereColor = new THREE.Color(0x00b3ff);
                atmosphereScale = 1.15;
                atmosphereDensity = 1.0;
                break;
            case 'arctic':
                atmosphereColor = new THREE.Color(0x8eaeff);
                atmosphereScale = 1.1;
                atmosphereDensity = 0.7;
                break;
            case 'ice':
                atmosphereColor = new THREE.Color(0xc4e0ff);
                atmosphereScale = 1.05;
                atmosphereDensity = 0.5;
                break;
        }

        const innerGeometry = new THREE.SphereGeometry(this.options.radius, this.options.detail, this.options.detail);
        const innerMaterial = createAtmosphereMaterial();
        innerMaterial.uniforms.glowColor.value = atmosphereColor;
        innerMaterial.uniforms.coeficient.value = 0.5;
        innerMaterial.uniforms.power.value = 2.5;

        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
        innerMesh.scale.multiplyScalar(1.01);
        innerMesh.castShadow = false;
        innerMesh.receiveShadow = false;
        this.container.add(innerMesh);

        const outerGeometry = new THREE.SphereGeometry(this.options.radius, this.options.detail, this.options.detail);
        const outerMaterial = createAtmosphereMaterial();
        outerMaterial.side = THREE.BackSide;
        outerMaterial.uniforms.glowColor.value = atmosphereColor;
        outerMaterial.uniforms.coeficient.value = 0.3;
        outerMaterial.uniforms.power.value = 3.5;

        const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
        outerMesh.scale.multiplyScalar(atmosphereScale);
        outerMesh.castShadow = false;
        outerMesh.receiveShadow = false;
        this.container.add(outerMesh);
    }

    createCloudMesh(radius, cloudTexture) {
    // Slightly larger than planet radius to avoid z-fighting
    const cloudRadius = radius * 1.015;

    // Use a high segment count for a smoother appearance
    const geometry = new THREE.SphereGeometry(cloudRadius, 64, 48);

    const material = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
    });

    const cloudMesh = new THREE.Mesh(geometry, material);
    cloudMesh.name = 'CloudLayer';
    cloudMesh.castShadow = false;
    cloudMesh.receiveShadow = false;

    return cloudMesh;
}

    createClouds() {
        let cloudCoverage = 1.0;
        let cloudOpacity = 0.4;
        let cloudColor = 0xffffff;
        let cloudHeight = 1.02;

        switch (this.options.climate) {
            case 'desert':
                cloudCoverage = 0.3;
                cloudOpacity = 0.2;
                cloudColor = 0xffffee;
                cloudHeight = 1.03;
                break;
            case 'tropical':
                cloudCoverage = 1.5;
                cloudOpacity = 0.6;
                cloudColor = 0xffffff;
                cloudHeight = 1.02;
                break;
            case 'temperate':
                cloudCoverage = 1.0;
                cloudOpacity = 0.4;
                cloudColor = 0xffffff;
                cloudHeight = 1.02;
                break;
            case 'arctic':
                cloudCoverage = 0.7;
                cloudOpacity = 0.5;
                cloudColor = 0xf0f8ff;
                cloudHeight = 1.025;
                break;
            case 'ice':
                cloudCoverage = 0.4;
                cloudOpacity = 0.3;
                cloudColor = 0xf0f8ff;
                cloudHeight = 1.015;
                break;
        }


        const cloudTexture = materialGenerator.generateCloudTexture(cloudCoverage);

        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: cloudColor,
            transparent: true,
            opacity: cloudOpacity,
            alphaMap: cloudTexture,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const cloudMesh = this.createCloudMesh(this.options.radius, cloudTexture);
        this.container.add(cloudMesh);
    }

    async addStructure(type) {
        const meshNameMap = {
            mining: 'station_Minning_1',
            colony: 'station_ColonyBase_1',
            // Add more as needed
        };

        let orbitRadius = this.options.radius * 1.8;
        let orbitSpeed = 0.00005;
        let scale = 0.15;
        let color = 0xffffff;

        switch (type) {
            case 'mining':
                color = 0xffcc00;
                scale = 0.15;
                orbitRadius = this.options.radius * 1.6;
                break;
            case 'research':
                color = 0x00ccff;
                scale = 0.2;
                orbitRadius = this.options.radius * 2.0;
                break;
            case 'colony':
                color = 0x00ff44;
                scale = 0.25;
                orbitRadius = this.options.radius * 2.4;
                break;
            case 'defense':
                color = 0xff3300;
                scale = 0.18;
                orbitRadius = this.options.radius * 1.8;
                break;
        }

        const meshName = meshNameMap[type];
        if (!meshName) {
            console.warn(`No mesh defined for "${type}", skipping.`);
            return;
        }

        try {
            const model = await loadStructureModel(meshName);

            const orbitContainer = new THREE.Object3D();
            orbitContainer.add(model);
            model.position.x = orbitRadius;

            orbitContainer.rotation.y = Math.random() * Math.PI * 2;
            orbitContainer.rotation.x = (Math.random() - 0.5) * 0.3;

            orbitContainer.userData = { type, orbitSpeed };
            this.orbitalsContainer.add(orbitContainer);

            this.container.userData.planetData.structures.push({
                type, orbitRadius, orbitAngle: orbitContainer.rotation.y,
                orbitTilt: orbitContainer.rotation.x, scale, color
            });

            return orbitContainer;
        } catch (err) {
            console.error(err);
        }
    }

    animate(delta) {
        if (this.planetMesh) {
            this.planetMesh.rotation.y += this.options.rotationSpeed * delta;
        }
        if (this.cloudMesh) {
            this.cloudMesh.rotation.y += this.options.cloudSpeed * delta;
        }
        if (this.orbitalsContainer) {
            this.orbitalsContainer.children.forEach(orbit => {
                orbit.rotation.y += orbit.userData.orbitSpeed * delta;
            });
        }
    }
}
