import * as THREE from 'three';
import { createNoiseMaterial } from './noise.js';

/**
 * PlanetMaterialGenerator 
 * 
 * This class generates and caches planet materials and textures.
 * 
 * Caching implementation notes:
 * 1. In-memory cache: All generated textures and materials are cached in memory
 *    using a Map (this.textureCache) for the current session.
 * 
 * 2. Persistent cache: Textures are stored as PNG files on the user's hard drive
 *    using the browser's File System Access API.
 * 
 * 3. File System Structure:
 *    - Each user gets a directory named with their userId
 *    - Each texture type (diffuse, normal, height, roughness) is stored as a separate PNG
 *    - Filenames follow the pattern: {climate}-{seed}-{hasOcean}-{oceanLevel}-{type}.png
 * 
 * 4. Storage Process:
 *    - When a new texture is generated, it's saved to the user's directory
 *    - On load, we check if the texture files exist before generating new ones
 *    - Materials are recreated from the cached textures
 */
export class PlanetMaterialGenerator {
    constructor() {
        // Create texture cache for storing generated materials in memory
        this.textureCache = new Map();
        
        // File system directory handle for persistent storage
        this.directoryHandle = null;
        
        // Flag to track if we've requested file system access
        this.fileSystemAccessRequested = false;
        
        // Initialize the file system access
        this.initFileSystemAccess();

        // Define climate zones based on distance from sun
        this.climateZones = [
            { name: 'desert', maxDistance: 50, colors: { land: 0xd9a282, water: 0x2389da } },
            { name: 'tropical', maxDistance: 100, colors: { land: 0x73bf45, water: 0x1e88e5 } },
            { name: 'temperate', maxDistance: 200, colors: { land: 0x538d22, water: 0x1565c0 } },
            { name: 'arctic', maxDistance: 300, colors: { land: 0xd8e4ff, water: 0x0d47a1 } },
            { name: 'ice', maxDistance: Infinity, colors: { land: 0xffffff, water: 0x82b1ff } }
        ];

        // Set up cache limit to prevent memory issues
        this.maxCacheSize = 25; // Maximum number of entries in the in-memory cache
    }
    
    /**
     * Initialize file system access for texture storage
     */
    async initFileSystemAccess() {
        // Only attempt if the File System Access API is available
        if (!window.showDirectoryPicker) {
            console.warn("File System Access API not available in this browser. Falling back to memory-only caching.");
            return;
        }
        
        try {
            // Check if we have a stored directory handle
            const storedHandle = await this.getStoredDirectoryHandle();
            
            if (storedHandle) {
                // Verify we still have permission to use this handle
                const options = { mode: 'readwrite' };
                if (await storedHandle.requestPermission(options) === 'granted') {
                    this.directoryHandle = storedHandle;
                    console.log("Restored file system access to texture cache directory");
                    return;
                }
            }
            
            // We'll request file system access when the user first generates a planet
            console.log("Will request file system access when generating first planet");
        } catch (e) {
            console.warn("Error initializing file system access:", e);
        }
    }
    
    /**
     * Get stored directory handle from IndexedDB
     */
    async getStoredDirectoryHandle() {
        return new Promise((resolve, reject) => {
            // Open IndexedDB
            const request = indexedDB.open('PlanetTextureCache', 1);
            
            request.onupgradeneeded = () => {
                const db = request.result;
                // Create object store for directory handles if it doesn't exist
                if (!db.objectStoreNames.contains('directoryHandles')) {
                    db.createObjectStore('directoryHandles', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction('directoryHandles', 'readonly');
                const store = transaction.objectStore('directoryHandles');
                
                const getRequest = store.get('textureDirectory');
                
                getRequest.onsuccess = () => {
                    resolve(getRequest.result ? getRequest.result.handle : null);
                };
                
                getRequest.onerror = () => {
                    console.error("Error getting directory handle from IndexedDB:", getRequest.error);
                    reject(getRequest.error);
                };
            };
            
            request.onerror = () => {
                console.error("Error opening IndexedDB:", request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Store directory handle in IndexedDB for future sessions
     * @param {FileSystemDirectoryHandle} handle - Directory handle to store
     */
    async storeDirectoryHandle(handle) {
        return new Promise((resolve, reject) => {
            // Open IndexedDB
            const request = indexedDB.open('PlanetTextureCache', 1);
            
            request.onupgradeneeded = () => {
                const db = request.result;
                // Create object store for directory handles if it doesn't exist
                if (!db.objectStoreNames.contains('directoryHandles')) {
                    db.createObjectStore('directoryHandles', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction('directoryHandles', 'readwrite');
                const store = transaction.objectStore('directoryHandles');
                
                const putRequest = store.put({
                    id: 'textureDirectory',
                    handle: handle
                });
                
                putRequest.onsuccess = () => {
                    console.log("Saved directory handle to IndexedDB");
                    resolve();
                };
                
                putRequest.onerror = () => {
                    console.error("Error saving directory handle to IndexedDB:", putRequest.error);
                    reject(putRequest.error);
                };
            };
            
            request.onerror = () => {
                console.error("Error opening IndexedDB:", request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Request file system access from the user if we don't have it already
     */
    async requestFileSystemAccess() {
        if (this.fileSystemAccessRequested) {
            return this.directoryHandle;
        }
        
        this.fileSystemAccessRequested = true;
        
        if (!window.showDirectoryPicker) {
            console.warn("File System Access API not available. Using memory-only caching.");
            return null;
        }
        
        try {
            // Show folder picker UI to user
            console.log("Requesting file system access for texture storage...");
            const directoryHandle = await window.showDirectoryPicker({
                id: 'planetTextures',
                mode: 'readwrite',
                startIn: 'documents',
                suggestedName: 'MassGravity-PlanetTextures'
            });
            
            // Store the directory handle for future use
            this.directoryHandle = directoryHandle;
            await this.storeDirectoryHandle(directoryHandle);
            
            console.log("Obtained file system access for texture storage");
            return directoryHandle;
        } catch (e) {
            console.warn("User denied file system access or error occurred:", e);
            return null;
        }
    }

    /**
     * Generate material for a planet based on distance from sun
     * @param {Object} options - Planet generation options
     * @param {number} options.distanceFromSun - Distance from the sun
     * @param {number} options.radius - Planet radius
     * @param {number} options.seed - Random seed for consistent generation
     * @param {boolean} options.hasOcean - Whether the planet has oceans
     * @param {number} options.oceanLevel - Ocean level (0-1)
     * @param {string} options.userId - User ID for texture caching
     * @returns {Promise<Object>} Materials and textures for the planet
     */
    generatePlanetMaterial(options) {
        // Set defaults
        const distanceFromSun = options.distanceFromSun || 100;
        const radius = options.radius || 10;
        const seed = options.seed || Math.random() * 1000;
        const hasOcean = options.hasOcean !== undefined ? options.hasOcean : true;
        const oceanLevel = options.oceanLevel !== undefined ? options.oceanLevel : 0.65;
        const userId = options.userId || 'default';
        
        // Determine climate zone based on distance
        const climateZone = this.getClimateZone(distanceFromSun);
        
        // Ensure seed is a number
        const seedNum = typeof seed === 'number' ? seed : parseFloat(seed);
        
        // Create a user-specific cache key for planet materials
        const cacheKey = `mat-${userId}-${climateZone.name}-${seedNum.toFixed(2)}-${hasOcean?1:0}-${oceanLevel.toFixed(2)}`;
        
        // Check memory cache first
        if (this.textureCache.has(cacheKey) && this.textureCache.get(cacheKey) !== null) {
            console.log(`Using cached material for ${cacheKey} from memory`);
            const cachedData = this.textureCache.get(cacheKey);
            return cachedData;
        }
        
        console.log(`Generating new material for ${cacheKey}`);
        
        // Generate textures
        const textures = this.generateTextures({
            seed,
            radius,
            climateZone,
            hasOcean,
            oceanLevel,
            userId
        });

        // Create the main planet material with emissive based on climate
        let emissiveColor;
        let emissiveIntensity = 0.15;
        
        // Adjust emissive color based on a climate type to enhance visibility
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
        
        // Use MeshPhysicalMaterial for a more realistic appearance
        const material = new THREE.MeshPhysicalMaterial({
            flatShading: false,
            map: textures.diffuse,
            normalMap: textures.normal,
            normalScale: new THREE.Vector2(0.5, 0.5), // instead of 1.0
            displacementMap: textures.height,
            displacementScale: Math.min(radius * 0.002, 0.05),
            roughnessMap: textures.roughness,
            roughness: 0.85,
            metalness: 0.1,
            clearcoat: 0.1,
            clearcoatRoughness: 0.4,
            envMapIntensity: 1.0,
            emissive: new THREE.Color(0x000000), // TODO disabled emissive color for now
            emissiveIntensity: 0 // TODO disabled emissive color for now
        });

        // Ocean material disabled for now
        const result = {
            mainMaterial: material,
            oceanMaterial: null, // Ocean rendering disabled
            textures,
            climateZone
        };
        
        // Cache the complete material result (not just textures)
        this.textureCache.set(cacheKey, result);
        
        return result;
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
     * Generate a cloud texture for the planeet
     * @param {number} coverage -
     * @param {number} seed - Random seed for consistent generation
     * @returns {THREE.CanvasTexture} Cloud texture
     */
    generateCloudTexture(coverage = 0.5, seed = 42) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d');
        const imageData = context.createImageData(size, size);
        const data = imageData.data;

        // Generate soft noise-based clouds with alpha fade
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                const nx = (x / size) * 4;
                const ny = (y / size) * 4;

                // Simple wrapping noise
                let noise = 0;
                noise += Math.sin((nx + seed) * 2.5) * 0.33 + 0.33;
                noise += Math.sin((ny + seed) * 3.5) * 0.33 + 0.33;
                noise += Math.sin((nx + ny + seed) * 1.8) * 0.33 + 0.33;
                noise /= 3.0;

                const threshold = 0.55 - (coverage * 0.3);
                const cloudValue = Math.max(0, (noise - threshold) / (1 - threshold));
                const alpha = Math.pow(cloudValue, 1.5); // smoother fade
                const value = Math.floor(alpha * 255);

                // White clouds with alpha
                data[index] = 255;
                data[index + 1] = 255;
                data[index + 2] = 255;
                data[index + 3] = value; // alpha
            }
        }

        context.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;

        return texture;
    }


    /**
     * Create a procedural ocean material
     * @param {Object} climateZone 
     * @param {number} radius 
     * @returns {THREE.Material} Ocean material
     */
    createOceanMaterial(climateZone, radius) {
        const oceanColor = new THREE.Color(parseInt(climateZone.colors.water));
        
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
        const { seed, climateZone, hasOcean, oceanLevel, userId = 'default' } = options;
        
        // Ensure the seed is treated as a number for a cache key
        const seedNum = typeof seed === 'number' ? seed : parseFloat(seed);
        
        // Create a cache key for textures
        const cacheKey = `tex-${climateZone.name}-${seedNum.toFixed(2)}-${hasOcean?1:0}-${oceanLevel.toFixed(2)}`;
        
        // Check memory cache first (fastest)
        if (this.textureCache.has(cacheKey) && this.textureCache.get(cacheKey) !== null) {
            console.log(`Using cached textures for ${cacheKey} from memory`);
            return this.textureCache.get(cacheKey);
        }
        
        console.log(`Generating new textures for ${cacheKey}`);
        
        // Create new textures with smaller size for better performance
        const size = 256; // Use 256 for better performance
        
        // Generate the heightmap first as it's the base for the other maps
        const heightMap = this.generateHeightMap(size, seedNum);
        
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
        
        // Cache the results in memory
        this.textureCache.set(cacheKey, textures);
        
        // If the memory cache is too large, remove the oldest entries
        if (this.textureCache.size > this.maxCacheSize) {
            const oldestKey = this.textureCache.keys().next().value;
            console.log(`Memory cache full, removing oldest entry: ${oldestKey}`);
            this.textureCache.delete(oldestKey);
        }
        
        // Try to save it to disk - but don't wait for it
        this.saveTexturesToDisk(userId, cacheKey, textures);
        
        return textures;
    }
    
    /**
     * Save textures to disk in the background (non-blocking)
     * @param {string} userId - User ID
     * @param {string} cacheKey - Cache key for the textures
     * @param {Object} textures - Texture objects to save
     */
    saveTexturesToDisk(userId, cacheKey, textures) {
        // Schedule saving for later, after the planet is rendered
        setTimeout(() => {
            // Request file system access if needed
            this.requestFileSystemAccess().then(directoryHandle => {
                if (!directoryHandle) return;
                
                // Save each texture
                this.saveTextureToDisk(
                    userId, 
                    this.getTextureFilename(cacheKey, 'diffuse'),
                    textures.diffuse.source.data
                );
                
                this.saveTextureToDisk(
                    userId, 
                    this.getTextureFilename(cacheKey, 'normal'),
                    textures.normal.source.data
                );
                
                this.saveTextureToDisk(
                    userId, 
                    this.getTextureFilename(cacheKey, 'height'),
                    textures.height.source.data
                );
                
                this.saveTextureToDisk(
                    userId, 
                    this.getTextureFilename(cacheKey, 'roughness'),
                    textures.roughness.source.data
                );
                
                console.log(`Saved all textures for ${cacheKey} to disk`);
            });
        }, 0);
    }
    
    /**
     * Save texture to disk
     * @param {string} userId - User ID to organize directories
     * @param {string} textureName - Filename to save
     * @param {HTMLCanvasElement} canvas - Canvas with texture image
     * @returns {Promise<boolean>} - Whether the save was successful
     */
    async saveTextureToDisk(userId, textureName, canvas) {
        // Make sure we have file system access
        if (!this.directoryHandle && !await this.requestFileSystemAccess()) {
            console.warn("Cannot save texture: no file system access");
            return false;
        }
        
        try {
            // Create user directory if it doesn't exist
            let userDirHandle;
            try {
                userDirHandle = await this.directoryHandle.getDirectoryHandle(userId, { create: true });
            } catch (e) {
                console.error(`Could not create/access directory for user ${userId}:`, e);
                return false;
            }
            
            // Create texture file
            const fileHandle = await userDirHandle.getFileHandle(textureName, { create: true });
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            // Write blob to file
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            console.log(`Saved texture ${textureName} for user ${userId}`);
            return true;
        } catch (e) {
            console.error(`Error saving texture ${textureName}:`, e);
            return false;
        }
    }
    
    /**
     * Load texture from disk
     * @param {string} userId - User ID to look in
     * @param {string} textureName - Filename to load
     * @returns {Promise<THREE.Texture|null>} - Loaded texture or null if not found
     */
    async loadTextureFromDisk(userId, textureName) {
        // Make sure we have file system access
        if (!this.directoryHandle) {
            console.warn("Cannot load texture: no file system access");
            return null;
        }
        
        try {
            // Get user directory
            let userDirHandle;
            try {
                userDirHandle = await this.directoryHandle.getDirectoryHandle(userId);
            } catch (e) {
                console.log(`No directory for user ${userId} found`);
                return null;
            }
            
            // Get file
            let fileHandle;
            try {
                fileHandle = await userDirHandle.getFileHandle(textureName);
            } catch (e) {
                console.log(`Texture ${textureName} not found for user ${userId}`);
                return null;
            }
            
            // Read file
            const file = await fileHandle.getFile();
            
            // Create image element and load the blob
            const img = new Image();
            img.src = URL.createObjectURL(file);
            
            // Wait for image to load
            await new Promise(resolve => {
                img.onload = resolve;
                img.onerror = () => {
                    console.error(`Error loading texture image ${textureName}`);
                    resolve();
                };
            });
            
            // Create canvas and draw image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Create THREE.js texture
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            console.log(`Loaded texture ${textureName} for user ${userId}`);
            return texture;
        } catch (e) {
            console.error(`Error loading texture ${textureName}:`, e);
            return null;
        }
    }
    
    /**
     * Generate filename for a texture
     * @param {string} key - Cache key
     * @param {string} type - Texture type (diffuse, normal, height, roughness)
     * @returns {string} Filename for the texture
     */
    getTextureFilename(key, type) {
        // Remove the "tex-" prefix from the key
        const cleanKey = key.startsWith('tex-') ? key.substring(4) : key;
        return `${cleanKey}-${type}.png`;
    }

    /**
     * Generate a height map using noise functions
     * @param {number} size - Texture size
     * @param {number} seed - Random seed
     * @returns {THREE.Texture} Height map texture
     */
    generateHeightMap(size, seed) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const theta = 2 * Math.PI * x / size;
                const phi = Math.PI * y / size;

                const nx = Math.cos(theta) * Math.sin(phi);
                const ny = Math.sin(theta) * Math.sin(phi);
                const nz = Math.cos(phi);

                let height = this.fbm(nx + seed, ny + seed, nz + seed, 4);
                height = (height + 1) * 0.5;
                height = Math.pow(height, 1.2);

                const index = (y * size + x) * 4;
                const value = Math.floor(height * 255);

                data[index] = value;
                data[index + 1] = value;
                data[index + 2] = value;
                data[index + 3] = 255;
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
        const heightCanvas = document.createElement('canvas');
        heightCanvas.width = size;
        heightCanvas.height = size;
        const heightCtx = heightCanvas.getContext('2d');
        heightCtx.drawImage(heightMap.source.data, 0, 0);
        const heightData = heightCtx.getImageData(0, 0, size, size).data;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        const landColor = new THREE.Color(parseInt(climateZone.colors.land));
        const waterColor = new THREE.Color(parseInt(climateZone.colors.water));
        const snowColor = new THREE.Color(0xffffff);
        const beachColor = new THREE.Color(0xd2b48c);

        const snowAmounts = {
            'ice': 0.8,
            'arctic': 0.6,
            'temperate': 0.3,
            'tropical': 0.1,
            'desert': 0
        };
        const snowAmount = snowAmounts[climateZone.name] || 0;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;

                const theta = 2 * Math.PI * x / size;
                const phi = Math.PI * y / size;

                const height = heightData[index] / 255;

                if (hasOcean && height < oceanLevel) {
                    const depthFactor = height / oceanLevel;
                    const depthColor = waterColor.clone().multiplyScalar(0.5 + 0.5 * depthFactor);

                    data[index] = Math.floor(depthColor.r * 255);
                    data[index + 1] = Math.floor(depthColor.g * 255);
                    data[index + 2] = Math.floor(depthColor.b * 255);
                } else {
                    const landHeightFactor = hasOcean ? (height - oceanLevel) / (1 - oceanLevel) : height;
                    let terrainColor = landColor.clone();

                    if (landHeightFactor > 0.8) {
                        let snowBlendFactor = snowAmount * (landHeightFactor - 0.8) * 5;
                        terrainColor.lerp(snowColor, snowBlendFactor);
                    } else if (landHeightFactor > 0.4) {
                        const variation = (Math.sin(theta * 5) + Math.sin(phi * 5)) * 0.03;
                        terrainColor.r = Math.max(0, Math.min(1, terrainColor.r * (1 + variation)));
                        terrainColor.g = Math.max(0, Math.min(1, terrainColor.g * (1 + variation)));
                        terrainColor.b = Math.max(0, Math.min(1, terrainColor.b * (1 + variation)));
                    } else {
                        const beachBlendFactor = Math.min(1, Math.max(0, 1 - landHeightFactor * 2.5));
                        terrainColor.lerp(beachColor, beachBlendFactor);
                    }

                    data[index] = Math.floor(terrainColor.r * 255);
                    data[index + 1] = Math.floor(terrainColor.g * 255);
                    data[index + 2] = Math.floor(terrainColor.b * 255);
                }

                data[index + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 10;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /**
     * Generate the normal map based on heightmap
     * @param {number} size - Texture size
     * @param {THREE.Texture} heightMap - Height map texture
     * @returns {THREE.Texture} Normal map texture
     */
    generateNormalMap(size, heightMap) {
        const heightCanvas = document.createElement('canvas');
        heightCanvas.width = size;
        heightCanvas.height = size;
        const heightCtx = heightCanvas.getContext('2d');
        heightCtx.drawImage(heightMap.source.data, 0, 0);
        const heightData = heightCtx.getImageData(0, 0, size, size).data;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        const strength = 2.0;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;

                const thetaL = 2 * Math.PI * ((x - 1 + size) % size) / size;
                const thetaR = 2 * Math.PI * ((x + 1) % size) / size;
                const phiT = Math.PI * ((y - 1 + size) % size) / size;
                const phiB = Math.PI * ((y + 1) % size) / size;

                const phi = Math.PI * y / size;
                const theta = 2 * Math.PI * x / size;

                const getHeight = (px, py) => {
                    const idx = (py * size + px) * 4;
                    return heightData[idx] / 255;
                };

                const hL = getHeight((x - 1 + size) % size, y);
                const hR = getHeight((x + 1) % size, y);
                const hT = getHeight(x, (y - 1 + size) % size);
                const hB = getHeight(x, (y + 1) % size);

                const dx = (hR - hL) * strength;
                const dy = (hB - hT) * strength;

                const normal = new THREE.Vector3(-dx, -dy, 1.0).normalize();

                data[index] = Math.floor((normal.x * 0.5 + 0.5) * 255);
                data[index + 1] = Math.floor((normal.y * 0.5 + 0.5) * 255);
                data[index + 2] = Math.floor((normal.z * 0.5 + 0.5) * 255);
                data[index + 3] = 255;
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
        const heightCanvas = document.createElement('canvas');
        heightCanvas.width = size;
        heightCanvas.height = size;
        const heightCtx = heightCanvas.getContext('2d');
        heightCtx.drawImage(heightMap.source.data, 0, 0);
        const heightData = heightCtx.getImageData(0, 0, size, size).data;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                const theta = 2 * Math.PI * x / size;
                const phi = Math.PI * y / size;

                const height = heightData[index] / 255;
                const isWater = hasOcean && height < oceanLevel;
                let roughness;

                if (isWater) {
                    roughness = height > oceanLevel - 0.05 ? 0.2 : 0.1;
                } else {
                    const landHeightFactor = (height - (hasOcean ? oceanLevel : 0)) / (1 - (hasOcean ? oceanLevel : 0));
                    if (landHeightFactor > 0.8) {
                        roughness = 0.9;
                    } else if (landHeightFactor > 0.4) {
                        const variation = this.noise2D(Math.cos(theta) * 8, Math.sin(phi) * 8) * 0.2;
                        roughness = Math.max(0.5, Math.min(0.8, 0.7 + variation));
                    } else {
                        roughness = 0.5;
                    }
                }

                const value = Math.floor(roughness * 255);
                data[index] = value;
                data[index + 1] = value;
                data[index + 2] = value;
                data[index + 3] = 255;
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
        
        // Use fewer octaves for better performance
        const maxOctaves = Math.min(octaves, 4); // Limit to 4 octaves max
        
        for (let i = 0; i < maxOctaves; i++) {
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