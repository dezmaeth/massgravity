import * as THREE from 'three';

export class GameUI {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.selectedObject = null;
        this.uiContainer = null;
        this.detailPanel = null;
        
        this.initUI();
    }
    
    initUI() {
        // Create UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'game-ui';
        document.getElementById('ui-overlay').appendChild(this.uiContainer);
        
        // Create detail panel (initially hidden)
        this.detailPanel = document.createElement('div');
        this.detailPanel.className = 'detail-panel';
        this.detailPanel.style.display = 'none';
        this.uiContainer.appendChild(this.detailPanel);
        
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .game-ui {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                pointer-events: none;
            }
            
            .detail-panel {
                position: absolute;
                bottom: 20px;
                left: 20px;
                background: rgba(0, 20, 40, 0.8);
                border: 1px solid rgba(0, 100, 255, 0.5);
                border-radius: 5px;
                padding: 15px;
                color: white;
                width: 300px;
                pointer-events: auto;
            }
            
            .detail-panel h2 {
                margin-top: 0;
                color: #00ccff;
                border-bottom: 1px solid rgba(0, 100, 255, 0.5);
                padding-bottom: 8px;
                margin-bottom: 10px;
            }
            
            .detail-panel .stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 5px;
            }
            
            .detail-panel .stat-label {
                color: rgba(255, 255, 255, 0.7);
            }
            
            .structures-section {
                margin-top: 15px;
                border-top: 1px solid rgba(0, 100, 255, 0.3);
                padding-top: 10px;
            }
            
            .structures-section h4 {
                margin-top: 0;
                margin-bottom: 10px;
                color: #00ccff;
            }
            
            .structure-list {
                max-height: 150px;
                overflow-y: auto;
            }
            
            .structure-item {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
                padding: 5px;
                background: rgba(0, 50, 100, 0.3);
                border-radius: 3px;
                font-size: 0.9em;
            }
            
            .structure-icon {
                width: 20px;
                height: 20px;
                border-radius: 2px;
                margin-right: 8px;
            }
            
            .notification {
                padding: 10px 20px;
                background: rgba(0, 100, 200, 0.8);
                color: white;
                border-radius: 5px;
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                transition: opacity 0.5s;
            }
            
            .notification.error {
                background: rgba(200, 50, 0, 0.8);
            }
        `;
        document.head.appendChild(style);
    }
    
    selectObject(object) {
        // Store the reference to the selected object
        this.selectedObject = object;
        
        console.log("selectObject called with:", object);
        
        if (object && object.userData && (object.userData.isPlanet || object.userData.isStar)) {
            console.log("Object is a planet or star");
            console.log("Object userData:", object.userData);
            
            // Update detail panel
            this.showDetailPanel(object);
            
            // Show build menu if it's a planet
            if (object.userData.isPlanet) {
                console.log("Showing build menu for planet");
                if (window.buildMenuUI) {
                    console.log("Using global buildMenuUI");
                    
                    // Get resources from the correct source
                    let resources = 0;
                    
                    // Try window.gameState first
                    if (window.gameState && typeof window.gameState.resources !== 'undefined') {
                        resources = window.gameState.resources;
                    } 
                    // Then try this.game.gameState
                    else if (this.game && this.game.gameState && typeof this.game.gameState.resources !== 'undefined') {
                        resources = this.game.gameState.resources;
                    }
                    // Finally fall back to DOM
                    else {
                        const resourcesElement = document.getElementById('resources-value');
                        if (resourcesElement) {
                            resources = parseInt(resourcesElement.textContent) || 0;
                        }
                    }
                    
                    console.log("Resources available:", resources);
                    
                    // Update and show menu
                    window.buildMenuUI.update(resources);
                    window.buildMenuUI.show();
                }
            } else {
                console.log("Not a planet, hiding build menu");
                if (window.buildMenuUI) {
                    window.buildMenuUI.hide();
                }
            }
            
            // Move camera to focus on the selected object
            this.focusCameraOn(object);
        } else {
            console.log("Object is null or not a planet/star");
            this.hideDetailPanel();
            if (window.buildMenuUI) {
                window.buildMenuUI.hide();
            }
        }
    }
    
    showDetailPanel(object) {
        // Determine if this is a planet or star
        const isPlanet = object.userData.isPlanet;
        const data = isPlanet ? object.userData.planetData : object.userData.starData;
        
        // Create HTML content
        let html = `
            <h2>${data.name}</h2>
            <div class="stats">
                <div class="stat-label">Type:</div>
                <div>${data.type}</div>
        `;
        
        if (isPlanet) {
            // Add planet-specific stats with defensive checks
            if (data.resources) {
                html += `
                    <div class="stat-label">Minerals:</div>
                    <div>${data.resources.minerals ? data.resources.minerals.toFixed(1) : '0.0'}</div>
                    <div class="stat-label">Energy:</div>
                    <div>${data.resources.energy ? data.resources.energy.toFixed(1) : '0.0'}</div>
                    <div class="stat-label">Water:</div>
                    <div>${data.resources.water ? data.resources.water.toFixed(1) : '0.0'}</div>
                `;
            } else {
                html += `
                    <div class="stat-label">Resources:</div>
                    <div>No data available</div>
                `;
            }
            
            // Add structures list if any exist
            if (data.structures && data.structures.length > 0) {
                html += `
                </div>
                <div class="structures-section">
                    <h4>Orbital Structures</h4>
                    <div class="structure-list">
                `;
                
                // List each structure
                data.structures.forEach(structure => {
                    const structureColors = {
                        'mining': '#ffcc00',
                        'research': '#00ccff',
                        'colony': '#00ff44',
                        'defense': '#ff3300'
                    };
                    
                    const structureNames = {
                        'mining': 'Mining Station',
                        'research': 'Research Outpost',
                        'colony': 'Colony Base',
                        'defense': 'Defense Platform'
                    };
                    
                    const color = structureColors[structure.type] || '#ffffff';
                    const name = structureNames[structure.type] || structure.type;
                    
                    html += `
                        <div class="structure-item">
                            <div class="structure-icon" style="background-color: ${color};"></div>
                            ${name}
                        </div>
                    `;
                });
                
                html += `
                    </div>
                </div>
                `;
            } else {
                html += `</div>`;
            }
        } else {
            // Add star-specific stats
            html += `
                <div class="stat-label">Temperature:</div>
                <div>${data.temperature || 'N/A'} K</div>
                <div class="stat-label">Luminosity:</div>
                <div>${data.luminosity || 'N/A'} L☉</div>
            </div>`;
        }
        
        // Update and show the panel
        this.detailPanel.innerHTML = html;
        this.detailPanel.style.display = 'block';
    }
    
    hideDetailPanel() {
        this.detailPanel.style.display = 'none';
    }
    
    buildStructure(type, planetObject) {
        console.log(`Attempting to build ${type} on ${planetObject.userData.planetData.name}`);
        
        // Check if the player has enough resources
        const resourcesNeeded = this.getStructureCost(type);
        
        // Get the current resources
        let currentResources = 0;
        
        // Check window.gameState first (our global state)
        if (window.gameState && typeof window.gameState.resources !== 'undefined') {
            currentResources = window.gameState.resources;
        } 
        // Then check game instance 
        else if (this.game && this.game.gameState && typeof this.game.gameState.resources !== 'undefined') {
            currentResources = this.game.gameState.resources;
        }
        // Finally fall back to DOM
        else {
            const resourcesElement = document.getElementById('resources-value');
            if (resourcesElement) {
                currentResources = parseInt(resourcesElement.textContent) || 0;
            }
        }
        
        if (currentResources < resourcesNeeded) {
            // Not enough resources
            this.showNotification(`Not enough resources to build ${type} station. Need ${resourcesNeeded} resources.`, 'error');
            return;
        }
        
        // Deduct resources from all possible sources
        const newResourceAmount = currentResources - resourcesNeeded;
        
        // Update window.gameState (global)
        if (window.gameState) {
            window.gameState.resources = newResourceAmount;
        }
        
        // Update game instance state
        if (this.game && this.game.gameState) {
            this.game.gameState.resources = newResourceAmount;
        }
        
        // Update DOM display
        const resourcesElement = document.getElementById('resources-value');
        if (resourcesElement) {
            resourcesElement.textContent = newResourceAmount;
        }
        
        // Update mining facilities count if it's a mining structure
        if (type === 'mining') {
            // Update DOM display
            const miningFacilitiesElement = document.getElementById('mining-facilities-value');
            if (miningFacilitiesElement) {
                const currentFacilities = parseInt(miningFacilitiesElement.textContent) || 0;
                miningFacilitiesElement.textContent = currentFacilities + 1;
            }
            
            // Update game state mining facilities
            const planetId = planetObject.userData.id || planetObject.id || Math.random().toString(36).substr(2, 9);
            
            // Update window.gameState
            if (window.gameState) {
                if (!window.gameState.mining_facilities) {
                    window.gameState.mining_facilities = {};
                }
                if (!window.gameState.mining_facilities[planetId]) {
                    window.gameState.mining_facilities[planetId] = 0;
                }
                window.gameState.mining_facilities[planetId]++;
            }
            
            // Update game instance
            if (this.game && this.game.gameState) {
                if (!this.game.gameState.mining_facilities) {
                    this.game.gameState.mining_facilities = {};
                }
                if (!this.game.gameState.mining_facilities[planetId]) {
                    this.game.gameState.mining_facilities[planetId] = 0;
                }
                this.game.gameState.mining_facilities[planetId]++;
            }
        }
        
        // Call the addStructure method on the planet object
        if (planetObject.addStructure) {
            const structure = planetObject.addStructure(type);
            
            // Show notification
            this.showNotification(`Built ${type} station in orbit around ${planetObject.userData.planetData.name}`);
            
            // Update the detail panel to show the new structure
            this.showDetailPanel(planetObject);
            
            // Save the game state to persist changes to the database
            if (this.game && this.game.saveGameData) {
                this.game.saveGameData();
            }
        } else {
            console.error("Planet object does not have addStructure method");
            
            // Try updating planet data directly
            if (planetObject.userData && planetObject.userData.isPlanet) {
                console.log("Trying to update planet data directly");
                
                // Update the planet data directly
                if (!planetObject.userData.planetData.structures) {
                    planetObject.userData.planetData.structures = [];
                }
                planetObject.userData.planetData.structures.push({ type });
                
                this.showNotification(`Built ${type} station in orbit around ${planetObject.userData.planetData.name}`);
                
                // Update the detail panel to show the new structure
                this.showDetailPanel(planetObject);
                
                // Save the game state to persist changes to the database
                if (this.game && this.game.saveGameData) {
                    this.game.saveGameData();
                }
            }
        }
        
        // Update the build menu to show new resource amount
        if (window.buildMenuUI) {
            window.buildMenuUI.update(newResourceAmount);
        }
    }
    
    getStructureCost(type) {
        const costs = {
            'mining': 100,
            'research': 150,
            'colony': 200,
            'defense': 180
        };
        
        return costs[type] || 100;
    }
    
    focusCameraOn(object) {
        // Get the current camera position
        const startPos = this.game.camera.position.clone();
        
        // Calculate target position (some distance from the object)
        const objectPos = object.position.clone();
        const objectRadius = object.userData.isPlanet ? 
            object.children[0].geometry.parameters.radius : 
            object.children[0].geometry.parameters.radius;
        
        const distance = objectRadius * 3; // Position camera at 3x the radius
        
        // We'll keep the same direction from the center to the camera,
        // but adjust the distance
        const direction = new THREE.Vector3().subVectors(startPos, objectPos).normalize();
        const targetPos = objectPos.clone().add(direction.multiplyScalar(distance));
        
        // Animate the camera move
        this.animateCameraMove(startPos, targetPos, objectPos);
    }
    
    animateCameraMove(startPos, targetPos, lookAt) {
        const camera = this.game.camera;
        const duration = 1000; // ms
        const startTime = Date.now();
        
        // Store the original controls enabled state
        const controlsEnabled = this.game.controls.enabled;
        
        // Disable controls during animation
        this.game.controls.enabled = false;
        
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use a smoothstep function for easing
            const smoothProgress = progress * progress * (3 - 2 * progress);
            
            // Interpolate position
            camera.position.lerpVectors(startPos, targetPos, smoothProgress);
            
            // Look at the object - check for null first
            if (lookAt) {
                camera.lookAt(lookAt);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Re-enable controls after animation
                this.game.controls.enabled = controlsEnabled;
                
                // Reset orbit controls target if we have a valid lookAt point
                if (lookAt && this.game.controls) {
                    this.game.controls.target.copy(lookAt);
                }
            }
        };
        
        animate();
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to the UI container
        this.uiContainer.appendChild(notification);
        
        // Remove after a delay
        setTimeout(() => {
            notification.style.opacity = '0';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    this.uiContainer.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
}