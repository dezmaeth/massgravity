import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Planet } from './objects/planet.js';
import { Star } from './objects/star.js';
import { GameUI } from './ui.js';

// Game state management
let gameState = {
    seed: "default",
    playerPosition: { x: 0, y: 0, z: 400 },
    planets: [],
    stars: [],
    resources: 500, // Start with some initial resources to enable building
    mining_facilities: {}
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
        
        // Resource generation tracking
        this.lastMiningTime = Date.now();
        
        // Store reference to gameState
        this.gameState = gameState;
        
        // Set up save button handler
        //document.getElementById('save-game').addEventListener('click', () => this.saveGame());
        
        // Try to load game data and settings first
        Promise.all([
            this.loadGame(),
            this.loadGameSettings()
        ]).then(() => {
            this.initComponents();
            this.initScene();
            this.initInteraction();
            this.initUI();
            this.setListeners();
            this.hideLoadingScreen();
            this.render();
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
            const response = await fetch('/api/load_game');
            const data = await response.json();
            
            if (Object.keys(data).length > 0) {
                gameState = data;
                window.gameState = gameState; // Update global reference
                this.gameState = gameState; // Update instance reference
                console.log("Game loaded successfully");
                
                // Update the resource display
                this.updateResourceDisplay();
            } else {
                console.log("No saved game found, starting new game");
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
        
        // Count total mining facilities
        const miningFacilitiesValue = document.getElementById('mining-facilities-value');
        if (miningFacilitiesValue && gameState.mining_facilities) {
            let totalFacilities = 0;
            for (const planetId in gameState.mining_facilities) {
                totalFacilities += gameState.mining_facilities[planetId];
            }
            miningFacilitiesValue.textContent = totalFacilities;
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
            
            const response = await fetch('/api/save_game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gameState)
            });
            
            const result = await response.json();
            if (result.success) {
                console.log("Game saved successfully");
                
                // Update resource display after saving (server may have updated resources)
                this.updateResourceDisplay();
                
                // Show a brief notification
                const notification = document.createElement('div');
                notification.textContent = 'Game saved';
                notification.style.position = 'absolute';
                notification.style.top = '10px';
                notification.style.left = '50%';
                notification.style.transform = 'translateX(-50%)';
                notification.style.background = 'rgba(0,100,0,0.7)';
                notification.style.color = 'white';
                notification.style.padding = '10px';
                notification.style.borderRadius = '5px';
                notification.style.zIndex = '1000';
                document.body.appendChild(notification);
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 2000);
            }
        } catch (error) {
            console.error("Error saving game:", error);
        }
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
    
    initScene() {
        this.updateLoadingProgress(70);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
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
        
        // If we have saved game data, restore it
        if (gameState.stars && gameState.stars.length > 0 || gameState.planets && gameState.planets.length > 0) {
            this.restoreSolarSystem();
        } else {
            // Otherwise generate a new system
            this.generateSolarSystem(gameState.seed || Math.random().toString());
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
        
        // We're using window.buildMenuUI which is set up in game.html
        console.log("initUI - window.buildMenuUI available:", !!window.buildMenuUI);
        
        // Update resource display
        this.updateResourceDisplay();
    }
    
    initInteraction() {
        // Set up click handling
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
        
        // Add double click detection
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
        
        // Get the orbit container that holds the planet
        let orbitContainer = planet.parent;
        
        // Store the planet and orbit for continuous tracking during render
        this.isZoomedIn = true;
        this.zoomedPlanet = planet;
        
        // Get world position of the planet
        const planetPos = new THREE.Vector3();
        planet.getWorldPosition(planetPos);
        
        const planetRadius = planet.children[0].geometry.parameters.radius;
        const distance = planetRadius * 3; // Set viewing distance based on planet size
        
        // Calculate a nice viewing angle slightly above the orbital plane
        const targetDirection = new THREE.Vector3(0.5, 0.3, 1).normalize();
        const targetPos = planetPos.clone().add(
            targetDirection.multiplyScalar(distance)
        );
        
        // Use a longer animation duration for smoother transition
        const duration = 1500; // ms
        const startTime = Date.now();
        
        // Store control state
        const originalControlsTarget = this.controls.target.clone();
        
        // Disable controls during transition
        this.controls.enabled = false;
        
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const smoothProgress = progress * progress * (3 - 2 * progress);
            
            // Get updated planet position (it may have moved in its orbit)
            const updatedPlanetPos = new THREE.Vector3();
            planet.getWorldPosition(updatedPlanetPos);
            
            // Update camera target to follow the moving planet
            this.controls.target.copy(updatedPlanetPos);
            
            // Calculate camera position relative to updated planet position
            const newTargetPos = updatedPlanetPos.clone().add(
                targetDirection.clone().multiplyScalar(distance)
            );
            
            // Interpolate camera position
            this.camera.position.lerpVectors(startPos, newTargetPos, smoothProgress);
            
            // Make camera look at the planet
            this.camera.lookAt(updatedPlanetPos);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                // Re-enable controls with new target
                this.controls.enabled = true;
                
                // Update controls
                this.controls.update();
                
                // Reset transitioning flag
                this.isTransitioning = false;
                
                // Select the planet for UI
                this.selectedObject = planet;
                this.ui.selectObject(planet);
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
    
    onMouseClick(event) {
        // If we're in the middle of a camera transition, ignore clicks
        if (this.isTransitioning) return;
        
        // If double click is detected, don't handle as a single click
        if (this.clickCount === 1) return;
        
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Find the first selectable object
        let selected = null;
        
        for (let i = 0; i < intersects.length; i++) {
            // Traverse up the parent chain to find the root object
            let object = intersects[i].object;
            while (object.parent && !object.userData.isSelectable) {
                object = object.parent;
            }
            
            if (object.userData.isSelectable) {
                selected = object;
                break;
            }
        }
        
        // Handle selection
        if (selected) {
            this.selectedObject = selected;
            this.ui.selectObject(selected);
        } else {
            // Clear selection
            this.selectedObject = null;
            this.ui.selectObject(null);
        }
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
    
    // Generate resources based on mining facilities
    generateResources() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastMiningTime) / 1000;
        
        // Check if enough time has passed according to mining interval setting
        if (elapsedSeconds >= this.gameSettings.miningInterval) {
            // Get all mining facilities
            let totalMiningFacilities = 0;
            if (gameState.mining_facilities) {
                for (const planetId in gameState.mining_facilities) {
                    totalMiningFacilities += gameState.mining_facilities[planetId];
                }
            }
            
            // Calculate resources to add
            const resourcesPerFacility = this.gameSettings.miningRate;
            const totalResourcesToAdd = totalMiningFacilities * resourcesPerFacility;
            
            // Add resources
            if (totalResourcesToAdd > 0) {
                gameState.resources += totalResourcesToAdd;
                
                // Update display
                this.updateResourceDisplay();
                
                // Show mining notification for significant amounts
                if (totalMiningFacilities >= 3) {
                    this.showMiningNotification(totalResourcesToAdd);
                }
                
                console.log(`Generated ${totalResourcesToAdd} resources from ${totalMiningFacilities} mining facilities`);
            }
            
            // Reset timer
            this.lastMiningTime = now;
        }
    }
    
    // Show mining notification
    showMiningNotification(amount) {
        const notification = document.createElement('div');
        notification.textContent = `Mining facilities generated ${Math.floor(amount)} resources`;
        notification.style.position = 'absolute';
        notification.style.top = '40px'; // Position below other notifications
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.background = 'rgba(255,204,0,0.7)';
        notification.style.color = 'white';
        notification.style.padding = '8px 12px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        notification.style.fontSize = '14px';
        document.body.appendChild(notification);
        
        // Remove after a delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3000);
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
        
        // Set up auto-update for resource display
        setInterval(() => this.updateResourceDisplay(), 5000);
        
        this.updateLoadingProgress(100);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    render() {
        requestAnimationFrame(() => this.render());
        
        // Update controls
        this.controls.update();
        
        // Get delta time for animations
        const delta = this.clock.getDelta() * this.timeScale * 1000;
        
        // Animate planetary orbits
        if (this.orbits) {
            this.orbits.forEach(orbit => {
                if (orbit.userData && orbit.userData.orbitalPeriod) {
                    // Rotate orbit based on period - use the orbital period which is calculated using the admin setting
                    // Apply an extreme slowdown factor to make orbits nearly imperceptible in real-time
                    // Divide by a billion to make it a million times slower
                    orbit.rotation.y += (Math.PI * 2) / (orbit.userData.orbitalPeriod * 1000000000) * delta;
                }
            });
        }
        
        // Update camera if we're focused on a planet
        if (this.isZoomedIn && this.zoomedPlanet) {
            // Get the current world position of the planet
            const planetPos = new THREE.Vector3();
            this.zoomedPlanet.getWorldPosition(planetPos);
            
            // Update the controls target to follow the planet
            this.controls.target.copy(planetPos);
            
            // Look at the planet
            this.camera.lookAt(planetPos);
            
            // Update controls
            this.controls.update();
        }
        
        // Generate resources based on mining facilities
        this.generateResources();
        
        // Animate planet and star objects
        if (this.solar) {
            // Animate stars
            this.solar.children.forEach(object => {
                if (object.animate) {
                    object.animate(delta);
                }
            });
            
            // Animate planets in orbits
            if (this.orbits) {
                this.orbits.forEach(orbit => {
                    orbit.children.forEach(child => {
                        if (child.animate) {
                            child.animate(delta);
                        }
                    });
                });
            }
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Export for testing
export { MassGravity };

// Initialize the game when the page is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    new MassGravity();
});