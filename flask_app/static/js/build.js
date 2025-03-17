// Build menu UI handler

export class BuildMenu {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.selectedPlanet = null;
        this.buildMenu = null;
        
        this.initBuildMenu();
    }
    
    initBuildMenu() {
        // Create build menu (initially hidden)
        this.buildMenu = document.createElement('div');
        this.buildMenu.className = 'build-menu';
        this.buildMenu.style.display = 'none';
        
        // Add to UI container
        document.getElementById('ui-overlay').appendChild(this.buildMenu);
        
        // Add styles
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .build-menu {
                position: absolute;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 20, 40, 0.8);
                border: 1px solid rgba(0, 100, 255, 0.5);
                border-radius: 5px;
                padding: 15px;
                color: white;
                width: 300px;
                pointer-events: auto;
                z-index: 100;
            }
            
            .build-menu h3 {
                margin-top: 0;
                color: #00ccff;
                border-bottom: 1px solid rgba(0, 100, 255, 0.5);
                padding-bottom: 8px;
                margin-bottom: 10px;
            }
            
            .build-menu-item {
                display: flex;
                align-items: center;
                padding: 8px;
                margin-bottom: 5px;
                background: rgba(0, 50, 100, 0.3);
                border: 1px solid rgba(0, 100, 255, 0.3);
                border-radius: 3px;
                cursor: pointer;
                transition: background 0.2s, border 0.2s;
            }
            
            .build-menu-item:hover {
                background: rgba(0, 70, 120, 0.5);
                border: 1px solid rgba(0, 150, 255, 0.5);
            }
            
            .build-menu-item.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: rgba(50, 50, 50, 0.3);
                border: 1px solid rgba(100, 100, 100, 0.3);
            }
            
            .build-menu-item.disabled:hover {
                background: rgba(50, 50, 50, 0.3);
                border: 1px solid rgba(100, 100, 100, 0.3);
            }
            
            .build-menu-item-icon {
                width: 32px;
                height: 32px;
                background: rgba(0, 100, 200, 0.5);
                border-radius: 3px;
                margin-right: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            
            .build-menu-item-details {
                flex: 1;
            }
            
            .build-menu-item-name {
                font-weight: bold;
                margin-bottom: 3px;
            }
            
            .build-menu-item-desc {
                font-size: 0.8em;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .build-menu-item-cost {
                font-size: 0.8em;
                color: #ffcc00;
            }
            
            .build-menu-item-cost.insufficient {
                color: #ff3300;
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
    
    showForPlanet(planet) {
        if (!planet || !planet.userData || !planet.userData.isPlanet) {
            console.error("Attempted to show build menu for non-planet object:", planet);
            return;
        }
        
        console.log("Showing build menu for planet:", planet);
        this.selectedPlanet = planet;
        
        // Get current resources
        const currentResources = this.game.gameState.resources || 0;
        console.log("Current resources:", currentResources);
        
        // Define structure costs and details
        const structures = [
            {
                type: 'mining',
                name: 'Mining Station',
                desc: 'Extracts minerals from the planet',
                cost: 100,
                icon: 'M',
                iconColor: 'rgba(255, 200, 0, 0.5)'
            },
            {
                type: 'research',
                name: 'Research Outpost',
                desc: 'Generates research points',
                cost: 150,
                icon: 'R',
                iconColor: 'rgba(0, 200, 255, 0.5)'
            },
            {
                type: 'colony',
                name: 'Colony Base',
                desc: 'Allows population growth',
                cost: 200,
                icon: 'C',
                iconColor: 'rgba(0, 255, 100, 0.5)'
            },
            {
                type: 'defense',
                name: 'Defense Platform',
                desc: 'Defends against enemy attacks',
                cost: 180,
                icon: 'D',
                iconColor: 'rgba(255, 50, 0, 0.5)'
            }
        ];
        
        // Create HTML content for build menu
        let html = `<h3>Build Structures</h3>`;
        
        structures.forEach(structure => {
            const canAfford = currentResources >= structure.cost;
            const itemClass = canAfford ? 'build-menu-item' : 'build-menu-item disabled';
            const costClass = canAfford ? 'build-menu-item-cost' : 'build-menu-item-cost insufficient';
            
            html += `
                <div class="${itemClass}" data-type="${structure.type}" data-cost="${structure.cost}">
                    <div class="build-menu-item-icon" style="background-color: ${structure.iconColor};">${structure.icon}</div>
                    <div class="build-menu-item-details">
                        <div class="build-menu-item-name">${structure.name}</div>
                        <div class="build-menu-item-desc">${structure.desc}</div>
                        <div class="${costClass}">Cost: ${structure.cost} resources</div>
                    </div>
                </div>
            `;
        });
        
        // Update and show the menu
        this.buildMenu.innerHTML = html;
        this.buildMenu.style.display = 'block';
        
        // Add event listeners for buttons
        const buildButtons = this.buildMenu.querySelectorAll('.build-menu-item');
        buildButtons.forEach(button => {
            // Remove existing listeners to prevent duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', (e) => {
                if (newButton.classList.contains('disabled')) {
                    // Show message about not having enough resources
                    const cost = parseInt(newButton.getAttribute('data-cost'));
                    const type = newButton.getAttribute('data-type');
                    this.showNotification(`Not enough resources to build ${type} station. Need ${cost} resources.`, 'error');
                    return;
                }
                
                const structureType = newButton.getAttribute('data-type');
                this.buildStructure(structureType);
            });
        });
    }
    
    hide() {
        this.buildMenu.style.display = 'none';
        this.selectedPlanet = null;
    }
    
    buildStructure(type) {
        if (!this.selectedPlanet) {
            console.error("No planet selected for building");
            return;
        }
        
        const planet = this.selectedPlanet;
        console.log(`Attempting to build ${type} on ${planet.userData.planetData.name}`);
        
        // Check if the player has enough resources
        const resourcesNeeded = this.getStructureCost(type);
        const currentResources = this.game.gameState.resources || 0;
        
        if (currentResources < resourcesNeeded) {
            // Not enough resources
            this.showNotification(`Not enough resources to build ${type} station. Need ${resourcesNeeded} resources.`, 'error');
            return;
        }
        
        // Deduct resources
        this.game.gameState.resources -= resourcesNeeded;
        
        // Update mining facilities count if it's a mining structure
        if (type === 'mining') {
            const planetId = planet.userData.id || planet.id || Math.random().toString(36).substr(2, 9);
            if (!this.game.gameState.mining_facilities) {
                this.game.gameState.mining_facilities = {};
            }
            if (!this.game.gameState.mining_facilities[planetId]) {
                this.game.gameState.mining_facilities[planetId] = 0;
            }
            this.game.gameState.mining_facilities[planetId]++;
        }
        
        // Call the addStructure method on the planet object
        if (planet.addStructure) {
            planet.addStructure(type);
        } else if (this.game.solar) {
            // Search for matching planet in solar system
            let foundPlanet = false;
            for (let i = 0; i < this.game.solar.children.length; i++) {
                const child = this.game.solar.children[i];
                if (child.userData && child.userData.isPlanet && 
                    Math.abs(child.position.x - planet.position.x) < 0.1 &&
                    Math.abs(child.position.y - planet.position.y) < 0.1 &&
                    Math.abs(child.position.z - planet.position.z) < 0.1) {
                    
                    console.log("Found matching planet in solar.children");
                    child.addStructure(type);
                    foundPlanet = true;
                    
                    // Update planet data structures for UI
                    if (!planet.userData.planetData.structures) {
                        planet.userData.planetData.structures = [];
                    }
                    planet.userData.planetData.structures.push({ type });
                    break;
                }
            }
            
            if (!foundPlanet) {
                console.error("Could not find matching planet object in solar system");
                // Still deduct resources even if we can't find the planet
                this.showNotification(`Built ${type} station in orbit around ${planet.userData.planetData.name}`);
            }
        }
        
        // Update resource display
        this.game.updateResourceDisplay();
        
        // Show notification
        this.showNotification(`Built ${type} station in orbit around ${planet.userData.planetData.name}`);
        
        // Update build menu to reflect new resource amount
        this.showForPlanet(planet);
        
        // Save the game state
        this.game.saveGameData();
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
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Remove after a delay
        setTimeout(() => {
            notification.style.opacity = '0';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
}