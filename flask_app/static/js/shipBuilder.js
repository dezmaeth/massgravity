// Ship Building Menu Management
export class ShipBuilder {
    constructor(gameInstance) {
        this.gameInstance = gameInstance;
        this.createShipMenu();
    }
    
    createShipMenu() {
        // Create menu container
        this.shipMenu = document.createElement('div');
        this.shipMenu.id = 'ship-build-menu';
        this.shipMenu.className = 'build-menu ship-menu';
        this.shipMenu.style.display = 'none';
        
        // Style the menu - positioned to the right of the detail panel
        this.shipMenu.style.position = 'absolute';
        this.shipMenu.style.bottom = '20px';
        this.shipMenu.style.left = '340px'; // Moved from left:20px to 340px (detail panel width + margin)
        this.shipMenu.style.width = '300px';
        this.shipMenu.style.background = 'rgba(0, 20, 40, 0.8)';
        this.shipMenu.style.borderRadius = '5px';
        this.shipMenu.style.padding = '15px';
        this.shipMenu.style.color = 'white';
        this.shipMenu.style.zIndex = '1000';
        
        // Create header
        const header = document.createElement('h3');
        header.textContent = 'Build Fleet';
        header.style.color = '#00ccff';
        header.style.borderBottom = '1px solid rgba(0, 100, 255, 0.5)';
        header.style.paddingBottom = '8px';
        header.style.marginBottom = '10px';
        this.shipMenu.appendChild(header);
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.className = 'close-button';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => this.hide());
        this.shipMenu.appendChild(closeButton);
        
        // Create content container
        this.content = document.createElement('div');
        this.content.className = 'build-menu-content';
        this.shipMenu.appendChild(this.content);
        
        // Add fleet summary section
        const fleetSummary = document.createElement('div');
        fleetSummary.className = 'fleet-summary';
        fleetSummary.style.marginBottom = '15px';
        fleetSummary.style.padding = '10px';
        fleetSummary.style.background = 'rgba(0, 0, 0, 0.3)';
        fleetSummary.style.borderRadius = '4px';
        
        fleetSummary.innerHTML = `
            <h4 style="margin: 0 0 5px 0; color: #00ccff;">Your Fleet</h4>
            <div style="display: flex; justify-content: space-between;">
                <div>Fighters: <span id="fighter-count">0</span></div>
                <div>Capital Ships: <span id="capital-ship-count">0</span></div>
            </div>
        `;
        this.shipMenu.appendChild(fleetSummary);
        
        // Add to the DOM
        document.body.appendChild(this.shipMenu);
    }
    
    updateShipMenu(selectedPlanet) {
        if (!selectedPlanet) return;
        
        const planetId = selectedPlanet.userData.id;
        const resources = this.gameInstance.gameState.resources || 0;
        const materials = this.gameInstance.gameState.materials || {blue: 0, red: 0, green: 0};
        
        // Update fleet counts
        const fighterCount = document.getElementById('fighter-count');
        const capitalShipCount = document.getElementById('capital-ship-count');
        
        if (fighterCount && this.gameInstance.gameState.ships) {
            fighterCount.textContent = this.gameInstance.gameState.ships.fighters || 0;
        }
        if (capitalShipCount && this.gameInstance.gameState.ships) {
            capitalShipCount.textContent = this.gameInstance.gameState.ships.capital_ships || 0;
        }
        
        // Check for orbital structures
        const structures = selectedPlanet.userData.planetData.structures || [];
        const hasHangar = structures.some(s => s.type === 'fighter_hangar');
        const hasShipyard = structures.some(s => s.type === 'shipyard');
        
        // Get user faction
        const userFaction = window.USER_INFO?.faction || 'blue';
        
        // Define ship options
        const shipOptions = [
            {
                type: 'fighter',
                name: 'Fighter',
                desc: 'Fast, light attack craft',
                cost: 150,
                materials: {
                    [userFaction]: 5 // Only requires user's faction material
                },
                requires: 'fighter_hangar',
                available: hasHangar,
                icon: 'F',
                iconColor: 'rgba(100, 150, 255, 0.5)'
            },
            {
                type: 'capital_ship',
                name: 'Capital Ship',
                desc: 'Massive, powerful warship',
                cost: 800,
                materials: {
                    blue: 10,
                    red: 10, 
                    green: 10 // Requires all three faction materials
                },
                requires: 'shipyard',
                available: hasShipyard,
                icon: 'C',
                iconColor: 'rgba(200, 100, 255, 0.5)'
            }
        ];
        
        // Generate HTML
        let html = '';
        
        if (!hasHangar && !hasShipyard) {
            html = `<div class="no-structures" style="text-align: center; padding: 20px 0; color: #999;">
                No suitable orbital structures available.<br><br>
                Build a Fighter Hangar or Capital Shipyard on this planet first.
            </div>`;
        } else {
            shipOptions.forEach(option => {
                // Check if the required structure exists
                if (!option.available) return;
                
                // Check resources
                const hasResources = resources >= option.cost;
                
                // Check materials
                let hasMaterials = true;
                for (const material in option.materials) {
                    if (materials[material] < option.materials[material]) {
                        hasMaterials = false;
                        break;
                    }
                }
                
                const canBuild = hasResources && hasMaterials;
                const itemClass = canBuild ? 'build-menu-item' : 'build-menu-item disabled';
                
                let materialsHtml = '';
                for (const material in option.materials) {
                    const colorMap = {
                        blue: '#3498db',
                        red: '#e74c3c',
                        green: '#2ecc71'
                    };
                    const enoughMaterial = materials[material] >= option.materials[material];
                    const style = `color: ${colorMap[material]}; ${!enoughMaterial ? 'opacity: 0.6;' : ''}`;
                    materialsHtml += `<span style="${style}">${material}: ${option.materials[material]}</span> `;
                }
                
                html += `
                    <div class="${itemClass}" data-type="${option.type}" data-cost="${option.cost}">
                        <div class="build-menu-item-icon" style="background-color: ${option.iconColor}; width: 32px; height: 32px; border-radius: 3px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">${option.icon}</div>
                        <div class="build-menu-item-details" style="flex: 1;">
                            <div class="build-menu-item-name" style="font-weight: bold; margin-bottom: 3px;">${option.name}</div>
                            <div class="build-menu-item-desc" style="font-size: 0.8em; color: rgba(255, 255, 255, 0.7);">${option.desc}</div>
                            <div class="build-menu-item-cost" style="font-size: 0.8em; color: ${hasResources ? '#ffcc00' : '#ff6666'};">Cost: ${option.cost} resources</div>
                            <div class="build-menu-item-materials" style="font-size: 0.8em; margin-top: 3px;">Materials: ${materialsHtml}</div>
                        </div>
                    </div>
                `;
            });
        }
        
        this.content.innerHTML = html;
        
        // Add click handlers
        this.content.querySelectorAll('.build-menu-item').forEach(item => {
            if (!item.classList.contains('disabled')) {
                item.addEventListener('click', () => {
                    const type = item.getAttribute('data-type');
                    const cost = parseInt(item.getAttribute('data-cost'));
                    this.buildShip(type, cost, selectedPlanet);
                });
            }
        });
    }
    
    buildShip(type, cost, selectedPlanet) {
        if (!this.gameInstance || !selectedPlanet) return;
        
        const userFaction = window.USER_INFO?.faction || 'blue';
        
        // Materials cost based on ship type
        let materialsCost = {};
        
        if (type === 'fighter') {
            materialsCost[userFaction] = 5; // Only user's faction material
        } else if (type === 'capital_ship') {
            materialsCost.blue = 10;
            materialsCost.red = 10;
            materialsCost.green = 10;
        }
        
        // Deduct resources
        this.gameInstance.gameState.resources -= cost;
        
        // Deduct materials
        for (const material in materialsCost) {
            this.gameInstance.gameState.materials[material] -= materialsCost[material];
        }
        
        // Add ship to fleet
        if (!this.gameInstance.gameState.ships) {
            this.gameInstance.gameState.ships = { fighters: 0, capital_ships: 0 };
        }
        
        if (type === 'fighter') {
            this.gameInstance.gameState.ships.fighters = (this.gameInstance.gameState.ships.fighters || 0) + 1;
        } else if (type === 'capital_ship') {
            this.gameInstance.gameState.ships.capital_ships = (this.gameInstance.gameState.ships.capital_ships || 0) + 1;
        }
        
        // Update resources display
        this.gameInstance.updateResourceDisplay();
        
        // Show notification
        this.showNotification(`Built a new ${type === 'fighter' ? 'Fighter' : 'Capital Ship'}`);
        
        // Save game
        this.gameInstance.saveGame();
        
        // Update ship menu
        this.updateShipMenu(selectedPlanet);
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.background = 'rgba(0, 100, 200, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        document.body.appendChild(notification);
        
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
    
    show(selectedPlanet) {
        this.updateShipMenu(selectedPlanet);
        this.shipMenu.style.display = 'block';
    }
    
    hide() {
        this.shipMenu.style.display = 'none';
    }
}