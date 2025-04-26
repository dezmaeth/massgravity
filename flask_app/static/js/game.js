import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Planet } from './objects/planet.js';
import { Star } from './objects/star.js';
import { GameUI } from './ui.js';
import { ShipBuilder } from './shipBuilder.js';
import { shipsDisplay } from './loaders/theatre.js';

let theatre = false;

// Game state management
let gameState = {
    seed: "default",
    playerPosition: { x: 0, y: 0, z: 400 },
    planets: [],
    stars: [],
    resources: 500, // Start with some initial resources to enable building
    research_points: 0, // Research points
    population: 0, // Population
    mining_facilities: {},
    research_outposts: {},
    colony_bases: {},
    materials: {
        blue: 0,
        red: 0,
        green: 0
    },
    orbital_structures: {}, // For fighter hangars and shipyards
    ships: {
        fighters: 0,
        capital_ships: 0
    }
};

// Make gameState global for easier access from all modules
window.gameState = gameState;

// Main game class
class MassGravity {
    constructor() {
        // Initialize loading UI
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.getElementById('progress-bar');
        this.loadingProgress = 0;
        
        // Game settings
        this.gameSettings = {
            orbitSpeedFactor: 0.00001, // Default value, will be updated from server
            miningRate: 5,             // Default value, will be updated from server
            miningInterval: 60         // Default value in seconds, will be updated from server
        };
        
        // Store reference to gameState
        this.gameState = gameState;

        // Try to load game data and settings first
        Promise.all([
            this.loadGame(),
            this.loadGameSettings()
        ]).then(() => {
            this.initComponents();
            this.initScene();
            this.initAudio();
            this.initInteraction();
            this.initUI();
            this.setListeners();
            this.hideLoadingScreen();
            
            // Only call render if this is an instance of MassGravity directly
            // This allows subclasses to override when rendering begins
            if (this.constructor === MassGravity) {
                this.render();
            }
        }).catch(error => {
            console.error("Error initializing game:", error);
            this.hideLoadingScreen();
        });
        
        // Flag to prevent click handling during camera transitions
        this.isTransitioning = false;
    }
    
    async loadGameSettings() {
        try {
            const response = await fetch('/api/game_settings');
            const settings = await response.json();
            
            console.log("Game settings loaded:", settings);
            
            if (settings.orbit_speed_factor) {
                this.gameSettings.orbitSpeedFactor = settings.orbit_speed_factor;
                console.log("Using orbital speed factor:", this.gameSettings.orbitSpeedFactor);
            }
            
            if (settings.mining_rate) {
                this.gameSettings.miningRate = settings.mining_rate;
                console.log("Using mining rate:", this.gameSettings.miningRate);
            }
            
            if (settings.mining_interval) {
                this.gameSettings.miningInterval = settings.mining_interval;
                console.log("Using mining interval:", this.gameSettings.miningInterval);
            }
            
        } catch (error) {
            console.error("Error loading game settings:", error);
            // Use defaults if settings can't be loaded
        }
    }
    
    updateLoadingProgress(progress) {
        this.loadingProgress = Math.min(100, progress);
        this.progressBar.style.width = `${this.loadingProgress}%`;
    }
    
    hideLoadingScreen() {
        this.loadingScreen.style.opacity = 0;
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
        }, 500);
    }
    
    async loadGame() {
        this.updateLoadingProgress(10);
        
        try {
            // Get current user info for material caching
            const userResponse = await fetch('/api/user_info');
            let userId = 'default';
            
            try {
                const userData = await userResponse.json();
                userId = userData.id || 'default';
                console.log("User identified for texture caching:", userId);
            } catch (userError) {
                console.warn("Could not get user info for texture caching:", userError);
            }
            
            // Load game data
            const response = await fetch('/api/load_game');
            const data = await response.json();
            
            if (Object.keys(data).length > 0) {
                // Add userId to game state for material caching
                data.userId = userId;
                
                gameState = data;
                window.gameState = gameState; // Update global reference
                this.gameState = gameState; // Update instance reference
                console.log("Game loaded successfully");
                
                // Update the resource display
                this.updateResourceDisplay();
            } else {
                console.log("No saved game found, starting new game");
                
                // Still set userId for new games
                gameState.userId = userId;
                window.gameState = gameState;
            }
        } catch (error) {
            console.error("Error loading game:", error);
        }
        
        this.updateLoadingProgress(30);
    }
    
    updateResourceDisplay() {
        // Update resource counters in the UI
        const resourcesValue = document.getElementById('resources-value');
        if (resourcesValue && gameState.resources !== undefined) {
            resourcesValue.textContent = Math.floor(gameState.resources);
        }
        
        // Update research points
        const researchPointsValue = document.getElementById('research-points-value');
        if (researchPointsValue && gameState.research_points !== undefined) {
            researchPointsValue.textContent = Math.floor(gameState.research_points);
        }
        
        // Update population
        const populationValue = document.getElementById('population-value');
        if (populationValue && gameState.population !== undefined) {
            populationValue.textContent = Math.floor(gameState.population);
        }
        
        // Update faction materials
        if (gameState.materials) {
            // Blue materials
            const blueMaterial = document.getElementById('blue-material-value');
            if (blueMaterial && gameState.materials.blue !== undefined) {
                blueMaterial.textContent = Math.floor(gameState.materials.blue);
            }
            
            // Red materials
            const redMaterial = document.getElementById('red-material-value');
            if (redMaterial && gameState.materials.red !== undefined) {
                redMaterial.textContent = Math.floor(gameState.materials.red);
            }
            
            // Green materials
            const greenMaterial = document.getElementById('green-material-value');
            if (greenMaterial && gameState.materials.green !== undefined) {
                greenMaterial.textContent = Math.floor(gameState.materials.green);
            }
        }
    }
    
    async saveGame() {
        try {
            // Update gameState with current data
            gameState.playerPosition = {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            };
            
            // Add game objects data
            gameState.planets = [];
            gameState.stars = [];
            
            // Save star data
            this.solar.children.forEach(child => {
                if (child.userData.isStar) {
                    const starData = {
                        position: {
                            x: child.position.x,
                            y: child.position.y,
                            z: child.position.z
                        },
                        data: child.userData.starData
                    };
                    gameState.stars.push(starData);
                }
            });
            
            // Save planet data from orbital containers
            if (this.orbits) {
                this.orbits.forEach(orbit => {
                    // Find the planet in the orbit container
                    let planet = null;
                    orbit.children.forEach(child => {
                        if (child.userData && child.userData.isPlanet) {
                            planet = child;
                        }
                    });
                    
                    if (planet) {
                        const planetData = {
                            position: {
                                x: planet.position.x,
                                y: planet.position.y,
                                z: planet.position.z
                            },
                            orbit: {
                                distance: orbit.userData.orbitDistance,
                                period: orbit.userData.orbitalPeriod,
                                tilt: orbit.userData.orbitTilt,
                                angle: orbit.rotation.y
                            },
                            data: planet.userData.planetData
                        };
                        gameState.planets.push(planetData);
                    }
                });
            }
            
            // Use Socket.IO to save the game
            if (window.socket) {
                console.log("Saving game via Socket.IO");
                window.socket.emit('save_game', gameState);
            } else {
                console.warn("Socket.IO not available, falling back to HTTP API");
                
                // Fallback to HTTP API
                const response = await fetch('/api/save_game', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(gameState)
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log("Game saved successfully via HTTP API");
                    
                    // If server returned updated data (after mining calculations), use it
                    if (result.updated_data) {
                        console.log("Received updated game data from server");
                        gameState = result.updated_data;
                        window.gameState = gameState; // Update global reference
                        this.gameState = gameState; // Update instance reference
                        this.updateResourceDisplay();
                    }
                    
                    // Show notification
                    this.showSaveNotification();
                }
            }
        } catch (error) {
            console.error("Error saving game:", error);
        }
    }
    
    // Helper method to show save notification
    showSaveNotification() {
        const notification = document.createElement('div');
        notification.textContent = 'Game saved';
        notification.style.position = 'absolute';
        notification.style.top = '10px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.background = 'rgba(46, 204, 113, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 2000);
    }
    
    saveGameData() {
        // Wrapper around saveGame for UI class to use
        this.saveGame();
    }
    
    initComponents() {
        this.updateLoadingProgress(40);
        
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setClearColor(new THREE.Color(0x000000), 1);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        
        // Add renderer to DOM
        const container = document.getElementById('game-container');
        container.appendChild(this.renderer.domElement);
        
        this.updateLoadingProgress(50);
        
        // Set up scene and camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45, 
            window.innerWidth / window.innerHeight, 
            1, 
            10000
        );
        
        // Restore camera position from saved game or use default
        const pos = gameState.playerPosition || { x: 0, y: 0, z: 400 };
        this.camera.position.set(pos.x, pos.y, pos.z);
        
        // Set up controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 1000;
        this.controls.rotateSpeed = 0.8;
        
        this.updateLoadingProgress(60);
        
        // Set up clock for animations
        this.clock = new THREE.Clock();
        this.timeScale = 1.0;
        
        // For object selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        
        // For double click detection
        this.clickCount = 0;
        this.clickTimer = null;
        this.doubleClickDelay = 300; // ms
        
        // Zoomed state tracking
        this.isZoomedIn = false;
        this.zoomedPlanet = null;
    }
    
    initAudio() {
        // Check if global audio controls exist, if not create our own
        if (window.audioControls) {
            console.log("Using global audio controls system");
            this.usingGlobalAudio = true;
            
            // Expose methods to window.audioControls for global management
            const originalPlay = window.audioControls.play;
            window.audioControls.play = () => {
                originalPlay();
                this.isMusicMuted = false;
            };
            
            const originalPause = window.audioControls.pause;
            window.audioControls.pause = () => {
                originalPause();
                this.isMusicMuted = true;
            };
            
            // Set initial volume from global controls
            this.targetMusicVolume = 0.7;
            this.isMusicMuted = false;
        } else {
            console.log("Creating game's own audio system");
            this.usingGlobalAudio = false;
            
            // Initialize background music
            this.backgroundMusic = new Audio('/static/assets/music/track01.mp3');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = 0; // Start with volume at 0 for fade-in
            this.targetMusicVolume = 0.7; // Default maximum volume
            this.isMusicMuted = false;
            
            // Set a timeout to start playing music 15 seconds after initialization
            setTimeout(() => {
                this.playBackgroundMusic();
            }, 15000);
        }
    }
    
    playBackgroundMusic() {
        // Skip if using global audio system
        if (this.usingGlobalAudio) return;
        
        // Start playing the music
        this.backgroundMusic.play().catch(e => {
            console.warn('Could not autoplay music. User interaction may be required:', e);
        });
        
        // Fade in the volume gradually
        let volume = 0;
        const fadeStep = 0.01; // How much to increase volume each step
        const fadeInterval = 100; // Milliseconds between each volume change
        
        this.fadeInInterval = setInterval(() => {
            if (volume < this.targetMusicVolume) {
                volume += fadeStep;
                this.backgroundMusic.volume = volume;
            } else {
                clearInterval(this.fadeInInterval);
                this.fadeInInterval = null;
            }
        }, fadeInterval);
    }
    
    setMusicVolume(volume) {
        // Skip if using global audio system
        if (this.usingGlobalAudio) {
            if (window.audioControls && typeof window.audioControls.setVolume === 'function') {
                window.audioControls.setVolume(volume * 100);
            }
            return;
        }
        
        // Set a new target volume (0.0 to 1.0)
        this.targetMusicVolume = Math.max(0, Math.min(1, volume));
        
        // If not in the middle of a fade, set volume immediately
        if (!this.fadeInInterval) {
            this.backgroundMusic.volume = this.isMusicMuted ? 0 : this.targetMusicVolume;
        }
    }
    
    toggleMusicMute() {
        // Skip if using global audio system
        if (this.usingGlobalAudio) {
            if (window.audioControls) {
                if (this.isMusicMuted) {
                    window.audioControls.unmute();
                } else {
                    window.audioControls.mute();
                }
                this.isMusicMuted = !this.isMusicMuted;
            }
            return this.isMusicMuted;
        }
        
        this.isMusicMuted = !this.isMusicMuted;
        
        if (this.isMusicMuted) {
            // Store current volume and set to 0
            this.backgroundMusic.volume = 0;
        } else {
            // Restore volume
            this.backgroundMusic.volume = this.targetMusicVolume;
        }
        
        return this.isMusicMuted;
    }
    
    initScene() {
        this.updateLoadingProgress(70);
        
        // Add ambient light with increased intensity
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);
        
        // Add a skybox
        this.addSkybox();
        
        
        // Generate solar system
        this.solar = new THREE.Object3D();
        this.scene.add(this.solar);
        
        // Initialize orbits array
        this.orbits = [];
        
        // Calculate solar system center and bounds
        this.solarCenter = new THREE.Vector3(0, 0, 0);
        this.solarRadius = 500; // Default value, will be updated

        if (theatre) {
            shipsDisplay(this.scene);
        } else {
        // Load ship model into the solar system
            if (gameState.stars && gameState.stars.length > 0 || gameState.planets && gameState.planets.length > 0) {
                this.restoreSolarSystem();
            } else {
                // Otherwise generate a new system
                this.generateSolarSystem(gameState.seed || Math.random().toString());
            }
        }
        
        // Calculate the solar system bounds
        this.calculateSolarSystemBounds();
        
        this.updateLoadingProgress(90);
    }
    
    calculateSolarSystemBounds() {
        // Find the furthest object from the center
        let maxDistanceSq = 0;
        let center = new THREE.Vector3();
        
        // Count number of objects
        let count = 0;
        
        // Check stars
        this.solar.children.forEach(child => {
            if (child.userData && child.userData.isStar) {
                center.add(child.position);
                count++;
                
                const distSq = child.position.lengthSq();
                if (distSq > maxDistanceSq) {
                    maxDistanceSq = distSq;
                }
            }
        });
        
        // Check planets in orbits
        if (this.orbits) {
            this.orbits.forEach(orbit => {
                orbit.children.forEach(child => {
                    if (child.userData && child.userData.isPlanet) {
                        // Use world position for calculations
                        const worldPos = new THREE.Vector3();
                        child.getWorldPosition(worldPos);
                        
                        center.add(worldPos);
                        count++;
                        
                        const distSq = worldPos.lengthSq();
                        if (distSq > maxDistanceSq) {
                            maxDistanceSq = distSq;
                        }
                    }
                });
            });
        }
        
        // Calculate center
        if (count > 0) {
            center.divideScalar(count);
            this.solarCenter = center;
        }
        
        // Calculate radius with 20% padding
        this.solarRadius = Math.sqrt(maxDistanceSq) * 1.2;
        
        // Make sure we have a minimum radius
        this.solarRadius = Math.max(this.solarRadius, 400);
    }
    
    initUI() {
        this.ui = new GameUI(this);
        this.shipBuilder = new ShipBuilder(this);
        
        // Make the game instance available globally for ShipBuilder
        window.massGravity = this;
        
        // We're using window.buildMenuUI which is set up in build.html
        console.log("initUI - window.buildMenuUI available:", !!window.buildMenuUI);
        
        // Update resource display
        this.updateResourceDisplay();
        
        // Request initial resource update from server
        this.requestResourceUpdate();
    }
    
    initInteraction() {
        // We're only using double-click for selection now
        this.renderer.domElement.addEventListener('click', this.handleDoubleClick.bind(this), false);
        
        // Listen for build structure events
        document.addEventListener('build-structure', (event) => {
            if (this.selectedObject && this.selectedObject.userData.isPlanet) {
                const { type, cost } = event.detail;
                this.ui.buildStructure(type, this.selectedObject);
            }
        });
    }
    
    handleDoubleClick(event) {
        // If we're in the middle of a camera transition, ignore double clicks
        if (this.isTransitioning) return;
        
        this.clickCount++;
        
        if (this.clickCount === 1) {
            this.clickTimer = setTimeout(() => {
                this.clickCount = 0;
            }, this.doubleClickDelay);
        } else if (this.clickCount === 2) {
            clearTimeout(this.clickTimer);
            this.clickCount = 0;
            
            // Handle double click
            this.onDoubleClick(event);
        }
    }
    
    onDoubleClick(event) {
        // Calculate mouse position in normalized device coordinates
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // If we're already zoomed in on a planet, zoom out regardless of where we click
        if (this.isZoomedIn) {
            this.zoomToFullSolarSystem();
            return;
        }
        
        // If not zoomed in, look for a planet to zoom to
        let planetToZoom = null;
        
        for (let i = 0; i < intersects.length; i++) {
            // Traverse up the parent chain to find a planet
            let object = intersects[i].object;
            let planet = null;
            
            while (object.parent && !planet) {
                if (object.userData && object.userData.isPlanet) {
                    planet = object;
                    break;
                }
                object = object.parent;
            }
            
            if (planet) {
                planetToZoom = planet;
                break;
            }
        }
        
        if (planetToZoom) {
            // Zoom to the planet
            this.zoomToPlanet(planetToZoom);
        } else if (this.isBackgroundClick(intersects)) {
            // If clicked on background, zoom out to see whole system
            this.zoomToFullSolarSystem();
        }
    }
    
    zoomToPlanet(planet) {
        // Flag that we're zooming to a planet to prevent further interactions
        this.isTransitioning = true;
        
        // Store the current camera position
        const startPos = this.camera.position.clone();
        
        // Store the planet and orbit for continuous tracking during render
        this.isZoomedIn = true;
        this.zoomedPlanet = planet;
        
        // Get accurate world position of the planet
        const planetPos = new THREE.Vector3();
        planet.getWorldPosition(planetPos);
        
        // Ensure we have a valid radius (checking planet's mesh - typically the first child)
        let planetRadius = 1;
        if (planet.children && planet.children.length > 0 && 
            planet.children[0].geometry && planet.children[0].geometry.parameters) {
            planetRadius = planet.children[0].geometry.parameters.radius || 1;
        }
        
        // Set viewing distance based on planet size (larger distance for better view)
        const distance = planetRadius * 5;
        
        // Calculate a nice viewing angle slightly above and to the side of the orbital plane
        const targetDirection = new THREE.Vector3(0.7, 0.4, 0.8).normalize();
        
        // Calculate target position based on planet position
        const targetPos = planetPos.clone().add(
            targetDirection.multiplyScalar(distance)
        );
        
        // Use a longer animation duration for smoother transition
        const duration = 1800; // ms
        const startTime = Date.now();
        
        // Disable controls during transition
        this.controls.enabled = false;
        
        // Animation function
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function for natural motion
            const smoothProgress = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;
            
            // Get fresh planet position in case it's moving in orbit
            const updatedPlanetPos = new THREE.Vector3();
            planet.getWorldPosition(updatedPlanetPos);
            
            // Set controls target to planet position
            this.controls.target.copy(updatedPlanetPos);
            
            // Calculate camera position relative to updated planet position
            const newTargetPos = updatedPlanetPos.clone().add(
                targetDirection.clone().multiplyScalar(distance)
            );
            
            // Move camera smoothly
            this.camera.position.lerpVectors(startPos, newTargetPos, smoothProgress);
            
            // Keep camera looking at planet
            this.camera.lookAt(updatedPlanetPos);
            
            // Update OrbitControls
            this.controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                this.controls.enabled = true;
                this.isTransitioning = false;
                
                // Make a final camera position adjustment to ensure proper view
                this.camera.position.copy(newTargetPos);
                this.controls.target.copy(updatedPlanetPos);
                this.controls.update();
                
                // Select the planet for UI
                this.selectedObject = planet;
                this.ui.selectObject(planet);
                
                console.log("Camera zoom complete, looking at:", updatedPlanetPos);
            }
        };
        
        animate();
    }
    
    isBackgroundClick(intersects) {
        // Check if the click is on a planet or star
        for (let i = 0; i < intersects.length; i++) {
            let object = intersects[i].object;
            
            // Traverse up the parent chain to find any selectable object
            while (object.parent && !object.userData.isSelectable) {
                object = object.parent;
            }
            
            if (object.userData.isSelectable) {
                return false; // This is a planet or star, not background
            }
        }
        
        return true; // No selectable objects found, this is background
    }
    
    zoomToFullSolarSystem() {
        // Store the current camera position
        const startPos = this.camera.position.clone();
        
        // Determine a good position to view the entire solar system
        const targetDirection = new THREE.Vector3(1, 0.5, 1).normalize();
        const targetDistance = this.solarRadius * 1.5;
        const targetPos = this.solarCenter.clone().add(
            targetDirection.multiplyScalar(targetDistance)
        );
        
        // Animate to the new position
        this.animateCameraMove(startPos, targetPos, this.solarCenter);
        
        // Clear zoomed in state
        this.isZoomedIn = false;
        this.zoomedPlanet = null;
        
        // Clear any selected object
        this.selectedObject = null;
        if (this.ui) {
            this.ui.selectObject(null);
        }
        
        // Hide ship builder menu if it exists
        if (this.shipBuilder) {
            this.shipBuilder.hide();
        }
    }
    
    animateCameraMove(startPos, targetPos, lookAt = null) {
        // Set the transitioning flag to prevent interaction during animation
        this.isTransitioning = true;
        
        const camera = this.camera;
        const duration = 1000; // ms
        const startTime = Date.now();
        
        // Store the original controls enabled state and settings
        const originalControlsState = {
            enabled: this.controls.enabled,
            target: this.controls.target.clone()
        };
        
        // Temporarily disable controls during animation
        this.controls.enabled = false;
        
        const targetPoint = lookAt || targetPos;
        
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use a smoothstep function for easing
            const smoothProgress = progress * progress * (3 - 2 * progress);
            
            // Interpolate position
            camera.position.lerpVectors(startPos, targetPos, smoothProgress);
            
            // Interpolate target point for orbit controls
            if (lookAt) {
                const newTarget = new THREE.Vector3();
                newTarget.lerpVectors(originalControlsState.target, lookAt, smoothProgress);
                this.controls.target.copy(newTarget);
                
                // Look at the interpolated target
                camera.lookAt(newTarget);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                // Set the final position and target
                camera.position.copy(targetPos);
                if (lookAt) {
                    this.controls.target.copy(lookAt);
                    camera.lookAt(lookAt);
                }
                
                // Re-enable controls
                this.controls.enabled = originalControlsState.enabled;
                
                // Update the controls to ensure they're working correctly
                this.controls.update();
                
                // Reset transitioning flag
                this.isTransitioning = false;
            }
        };
        
        animate();
    }
    
    addSkybox() {
        // Create a skybox using a CubeTextureLoader
        const loader = new THREE.CubeTextureLoader();
        loader.setPath('/static/assets/skybox/');
        
        const textureCube = loader.load([
            'right.jpg', 'left.jpg',
            'top.jpg', 'bottom.jpg',
            'front.jpg', 'back.jpg'
        ]);
        
        this.scene.background = textureCube;
    }
    
    restoreSolarSystem() {
        // Restore stars first
        if (gameState.stars) {
            gameState.stars.forEach(starData => {
                if (!starData || !starData.data) {
                    console.warn('Invalid star data found in game state');
                    return;
                }

                // Create default data if any properties are missing
                const starConfig = {
                    name: starData.data.name || 'Unknown Star',
                    type: starData.data.type || 'Main Sequence',
                    temperature: starData.data.temperature || 5500,
                    luminosity: starData.data.luminosity || 1.0
                };
                
                const star = new Star(starConfig);
                
                // Use position from saved data or default
                const pos = starData.position || { x: 0, y: 0, z: 0 };
                star.position.set(pos.x, pos.y, pos.z);
                
                this.solar.add(star);
            });
        }
        
        // Restore planets with orbits
        if (gameState.planets) {
            gameState.planets.forEach(planetData => {
                if (!planetData || !planetData.data) {
                    console.warn('Invalid planet data found in game state');
                    return;
                }

                // Create default data if any properties are missing
                const planetConfig = {
                    name: planetData.data.name || 'Unknown Planet',
                    type: planetData.data.type || 'Terrestrial',
                    resources: planetData.data.resources || { minerals: 50, energy: 50, water: 50 }
                };
                
                const planet = new Planet(planetConfig);
                
                // Create orbit container
                const orbitContainer = new THREE.Object3D();
                this.solar.add(orbitContainer);
                
                // Set orbit properties
                let orbitDistance = 100;
                let orbitalPeriod = 0.001;
                let orbitTilt = 0;
                let currentAngle = 0;
                
                // Use saved orbit data if available
                if (planetData.orbit) {
                    orbitDistance = planetData.orbit.distance || 100;
                    orbitalPeriod = planetData.orbit.period || 0.001;
                    orbitTilt = planetData.orbit.tilt || 0;
                    currentAngle = planetData.orbit.angle || 0;
                } else {
                    // Calculate basic orbit from position
                    const pos = planetData.position || { x: 100, y: 0, z: 0 };
                    orbitDistance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
                    
                    // Give it a random angle instead of syncing to time
                    currentAngle = Math.random() * Math.PI * 2;
                    
                    // Calculate period based on distance using the orbit speed factor from settings
                    orbitalPeriod = Math.sqrt(Math.pow(orbitDistance, 3)) * this.gameSettings.orbitSpeedFactor;
                }
                
                // Position planet in orbit
                planet.position.x = orbitDistance;
                
                // Apply orbit tilt and angle
                orbitContainer.rotation.x = orbitTilt;
                orbitContainer.rotation.y = currentAngle;
                
                // Store orbit data
                orbitContainer.userData = {
                    orbitalPeriod: orbitalPeriod,
                    orbitDistance: orbitDistance,
                    orbitTilt: orbitTilt
                };
                
                // Add planet to orbit container
                orbitContainer.add(planet);
                this.orbits.push(orbitContainer);
                
                // Add any saved structures to the planet
                if (planetData.data.structures && Array.isArray(planetData.data.structures) && planetData.data.structures.length > 0) {
                    planetData.data.structures.forEach(structure => {
                        if (structure && structure.type) {
                            planet.addStructure(structure.type);
                        }
                    });
                }
            });
        }
    }
    
    generateSolarSystem(seed) {
        // Use a simple random function with seed
        const rng = this.seededRandom(seed);
        
        // Star names
        const starNames = [
            "Sol", "Proxima", "Sirius", "Alpha Centauri", "Vega", 
            "Rigel", "Betelgeuse", "Antares", "Arcturus", "Pollux"
        ];
        
        // Planet names
        const planetNames = [
            "Terra", "Novus", "Ares", "Aquarius", "Hyperion", 
            "Kronos", "Atlas", "Helios", "Orion", "Thetis",
            "Gaia", "Calypso", "Triton", "Proteus", "Dione"
        ];
        
        // Create star
        const star = new Star({
            radius: 20 + rng() * 20,
            name: starNames[Math.floor(rng() * starNames.length)],
            color: new THREE.Color(
                0.9 + rng() * 0.1,
                0.6 + rng() * 0.3,
                0.2 + rng() * 0.2
            ),
            glowColor: new THREE.Color(
                0.9 + rng() * 0.1,
                0.7 + rng() * 0.3,
                0.3 + rng() * 0.2
            )
        });
        this.solar.add(star);
        
        // Create planets
        const numPlanets = 3 + Math.floor(rng() * 5);
        
        for (let i = 0; i < numPlanets; i++) {
            // Generate random planet attributes
            const planetRadius = 5 + rng() * 10;
            
            // Random planet type and appearance
            const planetTypes = ["Terrestrial", "Gas Giant", "Ice Giant", "Desert", "Ocean"];
            const planetType = planetTypes[Math.floor(rng() * planetTypes.length)];
            
            let planetColor;
            let hasAtmosphere = true;
            let atmosphereColor;
            
            // Set appearance based on type
            switch (planetType) {
                case "Terrestrial":
                    planetColor = new THREE.Color(
                        0.2 + rng() * 0.3,
                        0.4 + rng() * 0.4,
                        0.2 + rng() * 0.3
                    );
                    atmosphereColor = new THREE.Color(0x00b3ff);
                    break;
                case "Gas Giant":
                    planetColor = new THREE.Color(
                        0.6 + rng() * 0.3,
                        0.6 + rng() * 0.3,
                        0.5 + rng() * 0.3
                    );
                    atmosphereColor = new THREE.Color(
                        0.6 + rng() * 0.3,
                        0.6 + rng() * 0.3,
                        0.7 + rng() * 0.3
                    );
                    break;
                case "Ice Giant":
                    planetColor = new THREE.Color(
                        0.4 + rng() * 0.2,
                        0.5 + rng() * 0.3,
                        0.7 + rng() * 0.3
                    );
                    atmosphereColor = new THREE.Color(0x88ccff);
                    break;
                case "Desert":
                    planetColor = new THREE.Color(
                        0.7 + rng() * 0.3,
                        0.6 + rng() * 0.3,
                        0.4 + rng() * 0.2
                    );
                    atmosphereColor = new THREE.Color(0xffcc88);
                    break;
                case "Ocean":
                    planetColor = new THREE.Color(
                        0.1 + rng() * 0.2,
                        0.3 + rng() * 0.3,
                        0.6 + rng() * 0.4
                    );
                    atmosphereColor = new THREE.Color(0x0088ff);
                    break;
            }
            
            // Random resources
            const resources = {
                minerals: rng() * 100,
                energy: rng() * 100,
                water: rng() * 100
            };
            
            // Create the planet
            const planet = new Planet({
                radius: planetRadius,
                name: planetNames[i % planetNames.length] + " " + (i + 1),
                type: planetType,
                color: planetColor,
                atmosphereColor: atmosphereColor,
                hasAtmosphere: hasAtmosphere,
                resources: resources,
                rotationSpeed: 0.0001, // Very slow rotation
                cloudSpeed: 0.0005 // Very slow cloud rotation
            });
            
            // Calculate orbit properties
            const orbitDistance = 80 + i * 50 + rng() * 20;
            
            // Create orbit container
            const orbitContainer = new THREE.Object3D();
            this.solar.add(orbitContainer);
            
            // Calculate orbital period based on distance (using Kepler's third law as inspiration)
            // Slower periods for further planets
            // Use the orbit speed factor from settings
            const orbitalPeriod = Math.sqrt(Math.pow(orbitDistance, 3)) * this.gameSettings.orbitSpeedFactor;
            
            // Give each planet a random starting position
            const initialAngle = rng() * Math.PI * 2;
            
            // Position planet at the correct distance
            planet.position.x = orbitDistance;
            
            // Add slight tilt to orbit
            const orbitTilt = (rng() - 0.5) * 0.2;
            orbitContainer.rotation.x = orbitTilt;
            
            // Set initial position with random angle
            orbitContainer.rotation.y = initialAngle;
            
            // Store orbit data for animation
            orbitContainer.userData = {
                orbitalPeriod: orbitalPeriod,
                orbitDistance: orbitDistance,
                orbitTilt: orbitTilt,
                initialAngle: initialAngle
            };
            
            orbitContainer.add(planet);
            this.orbits.push(orbitContainer);
        }
    }
    
    // Request resource update via Socket.IO
    requestResourceUpdate() {
        if (window.socket) {
            window.socket.emit('request_update');
        }
    }
    
    // Simple seeded random function
    seededRandom(seed) {
        let s = this.hashString(seed);
        return function() {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
    
    setListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Update resource display periodically without generating anything
        setInterval(() => this.updateResourceDisplay(), 5000);
        
        // Set up socket listeners for WebSocket events
        if (window.socket) {
            // Ensure socket connection doesn't get garbage collected
            this.socket = window.socket;
        }
        
        this.updateLoadingProgress(100);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Export for testing and for use by other classes
export { MassGravity };

// Also make available globally for easier access from other scripts
window.MassGravity = MassGravity;