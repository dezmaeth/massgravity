import * as THREE from 'three';
import { createNoiseMaterial } from './noise.js';

export class PlanetMaterialGenerator {
    constructor() {
        // Cache for generated textures
        this.textureCache = new Map();
        
        // Define climate zones based on distance from sun
        this.climateZones = [
            { name: 'desert', maxDistance: 50, colors: { land: 0xd9a282, water: 0x2389da } },
            { name: 'tropical', maxDistance: 100, colors: { land: 0x73bf45, water: 0x1e88e5 } },
            { name: 'temperate', maxDistance: 200, colors: { land: 0x538d22, water: 0x1565c0 } },
            { name: 'arctic', maxDistance: 300, colors: { land: 0xd8e4ff, water: 0x0d47a1 } },
            { name: 'ice', maxDistance: Infinity, colors: { land: 0xffffff, water: 0x82b1ff } }
        ];
    }

    /**
     * Generate material for a planet based on distance from sun
     * @param {Object} options - Planet generation options
     * @param {number} options.distanceFromSun - Distance from the sun
     * @param {number} options.radius - Planet radius
     * @param {number} options.seed - Random seed for consistent generation
     * @param {boolean} options.hasOcean - Whether the planet has oceans
     * @param {number} options.oceanLevel - Ocean level (0-1)
     * @returns {Object} Materials and textures for the planet
     */
    generatePlanetMaterial(options) {
        // Set defaults
        const distanceFromSun = options.distanceFromSun || 100;
        const radius = options.radius || 10;
        const seed = options.seed || Math.random() * 1000;
        const hasOcean = options.hasOcean !== undefined ? options.hasOcean : true;
        const oceanLevel = options.oceanLevel !== undefined ? options.oceanLevel : 0.65;
        
        // Determine climate zone based on distance
        const climateZone = this.getClimateZone(distanceFromSun);
        
        // Generate textures
        const textures = this.generateTextures({
            seed,
            radius,
            climateZone,
            hasOcean,
            oceanLevel
        });

        // Create the main planet material with emissive based on climate
        let emissiveColor;
        let emissiveIntensity = 0.15;
        
        // Adjust emissive color based on climate type to enhance visibility
        switch(climateZone.name) {
            case 'desert':
                emissiveColor = new THREE.Color(0x553311); // Warm glow for desert
                emissiveIntensity = 0.2;
                break;
            case 'tropical':
                emissiveColor = new THREE.Color(0x225522); // Green glow for tropical
                emissiveIntensity = 0.15;
                break;
            case 'temperate':
                emissiveColor = new THREE.Color(0x224433); // Blue-green glow for temperate
                emissiveIntensity = 0.12;
                break;
            case 'arctic':
                emissiveColor = new THREE.Color(0x334455); // Blue glow for arctic
                emissiveIntensity = 0.1;
                break;
            case 'ice':
                emissiveColor = new THREE.Color(0x445566); // Blue-white glow for ice
                emissiveIntensity = 0.08;
                break;
            default:
                emissiveColor = new THREE.Color(0x333333);
        }
        
        const material = new THREE.MeshStandardMaterial({
            map: textures.diffuse,
            normalMap: textures.normal,
            displacementMap: textures.height,
            displacementScale: radius * 0.05,
            roughnessMap: textures.roughness,
            roughness: 0.85,
            metalness: 0.1,
            emissive: emissiveColor,
            emissiveIntensity: emissiveIntensity
        });

        // Create ocean material if planet has oceans
        let oceanMaterial = null;
        if (hasOcean) {
            oceanMaterial = this.createOceanMaterial(climateZone, radius);
        }

        return {
            mainMaterial: material,
            oceanMaterial,
            textures,
            climateZone
        };
    }

    /**
     * Get appropriate climate zone based on distance from sun
     * @param {number} distance 
     * @returns {Object} Climate zone data
     */
    getClimateZone(distance) {
        // Find the appropriate climate zone based on distance
        for (const zone of this.climateZones) {
            if (distance <= zone.maxDistance) {
                return zone;
            }
        }
        return this.climateZones[this.climateZones.length - 1]; // Default to last zone
    }

    /**
     * Create a procedural ocean material
     * @param {Object} climateZone 
     * @param {number} radius 
     * @returns {THREE.Material} Ocean material
     */
    createOceanMaterial(climateZone, radius) {
        const oceanColor = new THREE.Color(climateZone.colors.water);
        
        // Create custom water material with animated waves
        const oceanMaterial = new THREE.MeshPhysicalMaterial({
            color: oceanColor,
            roughness: 0.1,
            metalness: 0.1,
            transmission: 0.6, // Lower transmission for better visibility
            thickness: 0.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.25,
            envMapIntensity: 1.5, // Enhance reflections
            emissive: new THREE.Color(oceanColor).multiplyScalar(0.2), // Slight self-illumination
            emissiveIntensity: 0.1
        });

        // Add normal map for waves
        const waveTexture = this.generateOceanNormalMap();
        oceanMaterial.normalMap = waveTexture;
        oceanMaterial.normalScale = new THREE.Vector2(0.15, 0.15);
        
        return oceanMaterial;
    }

    /**
     * Generate all textures needed for a planet
     * @param {Object} options
     * @returns {Object} Generated textures
     */
    generateTextures(options) {
        const { seed, climateZone, hasOcean, oceanLevel } = options;
        
        // Use cache key based on parameters
        const cacheKey = `${climateZone.name}-${seed}-${hasOcean}-${oceanLevel}`;
        
        // Return cached textures if available
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey);
        }
        
        // Create new textures
        const size = 1024;
        
        // Generate heightmap first as it's the base for the other maps
        const heightMap = this.generateHeightMap(size, seed);
        
        // Generate other maps based on the heightmap
        const diffuseMap = this.generateDiffuseMap(size, heightMap, climateZone, hasOcean, oceanLevel);
        const normalMap = this.generateNormalMap(size, heightMap);
        const roughnessMap = this.generateRoughnessMap(size, heightMap, hasOcean, oceanLevel);
        
        const textures = {
            diffuse: diffuseMap,
            normal: normalMap,
            height: heightMap,
            roughness: roughnessMap
        };
        
        // Cache the results
        this.textureCache.set(cacheKey, textures);
        
        return textures;
    }

    /**
     * Generate height map using noise functions
     * @param {number} size - Texture size
     * @param {number} seed - Random seed
     * @returns {THREE.Texture} Height map texture
     */
    generateHeightMap(size, seed) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Fill with black background
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Use noise function to create height map
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const nx = x / size - 0.5;
                const ny = y / size - 0.5;
                
                // Convert to spherical coordinates
                const phi = Math.atan2(ny, nx);
                const theta = Math.sqrt(nx * nx + ny * ny) * Math.PI;
                
                // Generate height using layered noise
                let height = this.fbm(
                    Math.cos(phi) * Math.sin(theta) + seed,
                    Math.sin(phi) * Math.sin(theta) + seed,
                    Math.cos(theta) + seed,
                    6
                );
                
                // Normalize height (0-1)
                height = (height + 1) * 0.5;
                
                // Add some continentality - make higher elevations more common
                height = Math.pow(height, 1.2);
                
                const index = (y * size + x) * 4;
                const value = Math.floor(height * 255);
                
                data[index] = value;     // R
                data[index + 1] = value; // G
                data[index + 2] = value; // B
                data[index + 3] = 255;   // A
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    /**
     * Generate diffuse map (color texture) based on heightmap
     * @param {number} size - Texture size
     * @param {THREE.Texture} heightMap - Height map texture
     * @param {Object} climateZone - Climate zone data
     * @param {boolean} hasOcean - Whether planet has ocean
     * @param {number} oceanLevel - Ocean level (0-1)
     * @returns {THREE.Texture} Diffuse map texture
     */
    generateDiffuseMap(size, heightMap, climateZone, hasOcean, oceanLevel) {
        // Need to get height data from the height map
        const heightCanvas = document.createElement('canvas');
        heightCanvas.width = size;
        heightCanvas.height = size;
        const heightCtx = heightCanvas.getContext('2d');
        
        // Draw the height map to the canvas
        heightCtx.drawImage(heightMap.source.data, 0, 0);
        const heightData = heightCtx.getImageData(0, 0, size, size).data;
        
        // Create color map
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Get color values from climate zone
        const landColor = new THREE.Color(climateZone.colors.land);
        const waterColor = new THREE.Color(climateZone.colors.water);
        
        // Add noise pattern for terrain variation
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                // Get height value (0-1)
                const height = heightData[index] / 255;
                
                // Determine if this is water or land
                const isWater = hasOcean && height < oceanLevel;
                
                if (isWater) {
                    // Water color with depth variation
                    const depthFactor = height / oceanLevel; // 0 at deepest, 1 at shore
                    const depthColor = new THREE.Color().copy(waterColor);
                    
                    // Darken deep water
                    depthColor.multiplyScalar(0.5 + 0.5 * depthFactor);
                    
                    data[index] = Math.floor(depthColor.r * 255);     // R
                    data[index + 1] = Math.floor(depthColor.g * 255); // G
                    data[index + 2] = Math.floor(depthColor.b * 255); // B
                } else {
                    // Land color based on elevation
                    const landHeightFactor = (height - (hasOcean ? oceanLevel : 0)) / 
                                             (1 - (hasOcean ? oceanLevel : 0));
                    
                    let terrainColor = new THREE.Color();
                    
                    // Apply different colors based on elevation
                    if (landHeightFactor > 0.8) {
                        // Snow caps - mix with white based on climate zone
                        let snowAmount = 0;
                        if (climateZone.name === 'ice') snowAmount = 0.8;
                        else if (climateZone.name === 'arctic') snowAmount = 0.6;
                        else if (climateZone.name === 'temperate') snowAmount = 0.3;
                        else if (climateZone.name === 'tropical') snowAmount = 0.1;
                        else snowAmount = 0; // desert
                        
                        terrainColor.copy(landColor).lerp(new THREE.Color(0xffffff), 
                                                          snowAmount * (landHeightFactor - 0.8) * 5);
                    } else if (landHeightFactor > 0.4) {
                        // Mid elevations - base land color with variations
                        terrainColor.copy(landColor);
                        
                        // Add variations based on noise
                        const variation = this.noise2D(x/size * 10, y/size * 10) * 0.1;
                        terrainColor.r = Math.max(0, Math.min(1, terrainColor.r * (1 + variation)));
                        terrainColor.g = Math.max(0, Math.min(1, terrainColor.g * (1 + variation)));
                        terrainColor.b = Math.max(0, Math.min(1, terrainColor.b * (1 + variation)));
                    } else {
                        // Lower elevations - mix with brown/sand for beaches
                        const beachColor = new THREE.Color(0xd2b48c); // Sandy color
                        terrainColor.copy(landColor).lerp(beachColor, 1 - landHeightFactor * 2.5);
                    }
                    
                    data[index] = Math.floor(terrainColor.r * 255);     // R
                    data[index + 1] = Math.floor(terrainColor.g * 255); // G
                    data[index + 2] = Math.floor(terrainColor.b * 255); // B
                }
                
                data[index + 3] = 255; // A
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    /**
     * Generate normal map based on heightmap
     * @param {number} size - Texture size
     * @param {THREE.Texture} heightMap - Height map texture
     * @returns {THREE.Texture} Normal map texture
     */
    generateNormalMap(size, heightMap) {
        // Need to get height data from the height map
        const heightCanvas = document.createElement('canvas');
        heightCanvas.width = size;
        heightCanvas.height = size;
        const heightCtx = heightCanvas.getContext('2d');
        
        // Draw the height map to the canvas
        heightCtx.drawImage(heightMap.source.data, 0, 0);
        const heightData = heightCtx.getImageData(0, 0, size, size).data;
        
        // Create normal map
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        const strength = 2.0; // Normal map strength
        
        // Calculate normal vectors using Sobel operator
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                // Get heights of surrounding pixels
                const x1 = (x - 1 + size) % size;
                const x2 = (x + 1) % size;
                const y1 = (y - 1 + size) % size;
                const y2 = (y + 1) % size;
                
                const centerIndex = (y * size + x) * 4;
                const leftIndex = (y * size + x1) * 4;
                const rightIndex = (y * size + x2) * 4;
                const topIndex = (y1 * size + x) * 4;
                const bottomIndex = (y2 * size + x) * 4;
                
                // Get height values
                const centerHeight = heightData[centerIndex] / 255;
                const leftHeight = heightData[leftIndex] / 255;
                const rightHeight = heightData[rightIndex] / 255;
                const topHeight = heightData[topIndex] / 255;
                const bottomHeight = heightData[bottomIndex] / 255;
                
                // Calculate partial derivatives
                const dx = (rightHeight - leftHeight) * strength;
                const dy = (bottomHeight - topHeight) * strength;
                
                // Calculate normal vector
                const normal = new THREE.Vector3(-dx, -dy, 1.0).normalize();
                
                // Convert normal to RGB values (0-1 -> 0-255)
                // Normal maps store x in R, y in G, z in B
                // Also transform from [-1,1] to [0,1] range
                data[index] = Math.floor((normal.x * 0.5 + 0.5) * 255);     // R
                data[index + 1] = Math.floor((normal.y * 0.5 + 0.5) * 255); // G
                data[index + 2] = Math.floor((normal.z * 0.5 + 0.5) * 255); // B
                data[index + 3] = 255;                                     // A
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    /**
     * Generate roughness map
     * @param {number} size - Texture size
     * @param {THREE.Texture} heightMap - Height map texture
     * @param {boolean} hasOcean - Whether planet has ocean
     * @param {number} oceanLevel - Ocean level (0-1)
     * @returns {THREE.Texture} Roughness map texture
     */
    generateRoughnessMap(size, heightMap, hasOcean, oceanLevel) {
        // Need to get height data from the height map
        const heightCanvas = document.createElement('canvas');
        heightCanvas.width = size;
        heightCanvas.height = size;
        const heightCtx = heightCanvas.getContext('2d');
        
        // Draw the height map to the canvas
        heightCtx.drawImage(heightMap.source.data, 0, 0);
        const heightData = heightCtx.getImageData(0, 0, size, size).data;
        
        // Create roughness map
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Generate roughness values
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                // Get height value (0-1)
                const height = heightData[index] / 255;
                
                // Determine if this is water or land
                const isWater = hasOcean && height < oceanLevel;
                
                let roughness;
                
                if (isWater) {
                    // Water has low roughness
                    roughness = 0.1;
                    
                    // Slightly vary roughness near shores
                    if (height > oceanLevel - 0.05) {
                        roughness = 0.2; // More roughness for shallow water
                    }
                } else {
                    // Land has variable roughness based on elevation
                    const landHeightFactor = (height - (hasOcean ? oceanLevel : 0)) / 
                                             (1 - (hasOcean ? oceanLevel : 0));
                    
                    if (landHeightFactor > 0.8) {
                        // High mountains - very rough
                        roughness = 0.9;
                    } else if (landHeightFactor > 0.4) {
                        // Mid elevations - medium roughness
                        roughness = 0.7;
                        
                        // Add variations based on noise
                        const variation = this.noise2D(x/size * 15, y/size * 15) * 0.2;
                        roughness = Math.max(0.5, Math.min(0.8, roughness + variation));
                    } else {
                        // Beaches and lowlands - less rough
                        roughness = 0.5;
                    }
                }
                
                // Store roughness value
                const value = Math.floor(roughness * 255);
                data[index] = value;     // R
                data[index + 1] = value; // G
                data[index + 2] = value; // B
                data[index + 3] = 255;   // A
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    /**
     * Generate normal map for ocean waves
     * @returns {THREE.Texture} Ocean normal map texture
     */
    generateOceanNormalMap() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Generate normal map with wave patterns
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                // Generate wave pattern using multiple noise octaves
                const nx = x / size * 8;
                const ny = y / size * 8;
                
                // Create wave normal
                const wave1 = Math.sin(nx * 5 + ny * 3) * 0.2;
                const wave2 = Math.sin(nx * 13 + ny * 7) * 0.1;
                const wave3 = this.noise2D(nx, ny) * 0.05;
                
                const dx = wave1 + wave2 + wave3;
                const dy = wave1 + wave2 + wave3;
                
                // Calculate normal vector
                const normal = new THREE.Vector3(-dx, -dy, 1.0).normalize();
                
                // Convert normal to RGB values (0-1 -> 0-255)
                data[index] = Math.floor((normal.x * 0.5 + 0.5) * 255);     // R
                data[index + 1] = Math.floor((normal.y * 0.5 + 0.5) * 255); // G
                data[index + 2] = Math.floor((normal.z * 0.5 + 0.5) * 255); // B
                data[index + 3] = 255;                                     // A
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    /**
     * Fractional Brownian Motion - layered noise function
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} octaves 
     * @returns {number} Noise value
     */
    fbm(x, y, z, octaves) {
        let value = 0;
        let amplitude = 0.5;
        
        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.noise3D(x, y, z);
            x *= 2.0;
            y *= 2.0;
            z *= 2.0;
            amplitude *= 0.5;
        }
        
        return value;
    }

    /**
     * Simplex noise in 2D
     * @param {number} x 
     * @param {number} y 
     * @returns {number} Noise value
     */
    noise2D(x, y) {
        // Convert to 3D noise by setting z to a constant
        return this.noise3D(x, y, 1.5);
    }

    /**
     * Simplex noise in 3D - based on the existing noise shader
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {number} Noise value
     */
    noise3D(x, y, z) {
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        
        // Permutation table duplicated to avoid overflow
        for (let i = 0; i < 256; i++) {
            p[256 + i] = p[i];
        }
        
        // Find unit grid cell containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        // Get relative xyz coordinates of point within cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        // Compute fade curves for each of x, y, z
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        // Hash coordinates of the 8 cube corners
        const A = p[X] + Y;
        const AA = p[A] + Z;
        const AB = p[A + 1] + Z;
        const B = p[X + 1] + Y;
        const BA = p[B] + Z;
        const BB = p[B + 1] + Z;
        
        // And add blended results from 8 corners of cube
        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(p[AA], x, y, z),
                                      this.grad(p[BA], x-1, y, z)),
                              this.lerp(u, this.grad(p[AB], x, y-1, z),
                                      this.grad(p[BB], x-1, y-1, z))),
                      this.lerp(v, this.lerp(u, this.grad(p[AA+1], x, y, z-1),
                                      this.grad(p[BA+1], x-1, y, z-1)),
                              this.lerp(u, this.grad(p[AB+1], x, y-1, z-1),
                                      this.grad(p[BB+1], x-1, y-1, z-1))));
    }

    // Helper functions for noise
    fade(t) { 
        return t * t * t * (t * (t * 6 - 15) + 10); 
    }
    
    lerp(t, a, b) { 
        return a + t * (b - a); 
    }
    
    grad(hash, x, y, z) {
        // Convert low 4 bits of hash code into 12 gradient directions
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }
}