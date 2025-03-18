// Build menu handler
export function setupBuildMenu(gameInstance) {
    const buildMenu = document.getElementById('build-menu');
    const buildMenuContent = document.querySelector('.build-menu-content');
    
    // Define structure types and costs
    const structures = [
        {
            type: 'mining',
            name: 'Mining Station',
            desc: 'Extracts minerals from the planet',
            cost: {
                resources: 100,
                research_points: 50,
                population: 20
            },
            icon: 'M',
            iconColor: 'rgba(255, 200, 0, 0.5)'
        },
        {
            type: 'research',
            name: 'Research Outpost',
            desc: 'Generates research points',
            cost: {
                resources: 150,
                research_points: 0,
                population: 30
            },
            icon: 'R',
            iconColor: 'rgba(0, 200, 255, 0.5)'
        },
        {
            type: 'colony',
            name: 'Colony Base',
            desc: 'Allows population growth',
            cost: {
                resources: 200,
                research_points: 100,
                population: 50
            },
            icon: 'C',
            iconColor: 'rgba(0, 255, 100, 0.5)'
        },
        {
            type: 'defense',
            name: 'Defense Platform',
            desc: 'Defends against enemy attacks',
            cost: {
                resources: 180,
                research_points: 80,
                population: 40
            },
            icon: 'D',
            iconColor: 'rgba(255, 50, 0, 0.5)'
        },
        {
            type: 'fighter_hangar',
            name: 'Fighter Hangar',
            desc: 'Orbital facility to build fighter ships',
            cost: {
                resources: 500,
                research_points: 300,
                population: 100,
                faction_materials: true // Only requires materials from player's faction
            },
            icon: 'F',
            iconColor: 'rgba(100, 150, 255, 0.5)'
        },
        {
            type: 'shipyard',
            name: 'Capital Shipyard',
            desc: 'Massive orbital structure for capital ships',
            cost: {
                resources: 1000,
                research_points: 800,
                population: 200,
                blue_material: 100,
                red_material: 100,
                green_material: 100
            },
            icon: 'S',
            iconColor: 'rgba(200, 100, 255, 0.5)'
        }
    ];
    
    // Track selected planet
    let selectedPlanet = null;
    
    // Show build menu for a planet
    function showForPlanet(planet) {
        console.log("showForPlanet called with:", planet);
        
        if (!planet) {
            console.error("Cannot show build menu: no planet provided");
            return;
        }
        
        selectedPlanet = planet;
        
        // Get current resources
        const currentResources = gameInstance.gameState.resources || 0;
        
        // Create HTML for build menu
        let html = '';
        
        structures.forEach(structure => {
            // Check if player can afford all resources
            const resources = gameInstance.gameState.resources || 0;
            const researchPoints = gameInstance.gameState.research_points || 0;
            const population = gameInstance.gameState.population || 0;
            const materials = gameInstance.gameState.materials || { blue: 0, red: 0, green: 0 };
            const playerFaction = window.USER_INFO ? window.USER_INFO.faction : 'blue';
            
            // Check base resources
            let canAfford = resources >= structure.cost.resources &&
                           researchPoints >= structure.cost.research_points &&
                           population >= structure.cost.population;
                           
            // Check faction materials if needed
            if (structure.cost.faction_materials && playerFaction) {
                canAfford = canAfford && materials[playerFaction] >= 50; // Require 50 of player's faction material
            }
            
            // Check all materials if needed (for capital shipyard)
            if (structure.cost.blue_material) {
                canAfford = canAfford && 
                           materials.blue >= structure.cost.blue_material &&
                           materials.red >= structure.cost.red_material &&
                           materials.green >= structure.cost.green_material;
            }
            
            const itemClass = canAfford ? 'build-menu-item' : 'build-menu-item disabled';
            const costClass = canAfford ? 'build-menu-item-cost' : 'build-menu-item-cost insufficient';
            
            // Build cost string
            let costString = `${structure.cost.resources} resources, ${structure.cost.research_points} research, ${structure.cost.population} population`;
            
            // Add material costs if any
            if (structure.cost.faction_materials) {
                costString += `, ${50} ${playerFaction} materials`;
            }
            
            if (structure.cost.blue_material) {
                costString += `, ${structure.cost.blue_material} blue, ${structure.cost.red_material} red, ${structure.cost.green_material} green materials`;
            }
            
            // Create JSON string of cost object for data attribute
            const costJSON = JSON.stringify(structure.cost);
            
            html += `
                <div class="${itemClass}" data-type="${structure.type}" data-cost='${costJSON}'>
                    <div class="build-menu-item-icon" style="background-color: ${structure.iconColor};">${structure.icon}</div>
                    <div class="build-menu-item-details">
                        <div class="build-menu-item-name">${structure.name}</div>
                        <div class="build-menu-item-desc">${structure.desc}</div>
                        <div class="${costClass}">Cost: ${costString}</div>
                    </div>
                </div>
            `;
        });
        
        // Update build menu content
        buildMenuContent.innerHTML = html;
        
        // Add event listeners to build buttons
        buildMenuContent.querySelectorAll('.build-menu-item').forEach(button => {
            button.addEventListener('click', handleBuildClick);
        });
        
        // Show the menu
        buildMenu.style.display = 'block';
    }
    
    // Handle build button clicks
    function handleBuildClick(event) {
        const button = event.currentTarget;
        const structureType = button.getAttribute('data-type');
        let cost;
        
        try {
            cost = JSON.parse(button.getAttribute('data-cost'));
        } catch (e) {
            console.error("Error parsing cost data:", e);
            return;
        }
        
        // Check if button is disabled
        if (button.classList.contains('disabled')) {
            showNotification(`Not enough resources to build ${structureType} station.`, 'error');
            return;
        }
        
        // Build the structure
        buildStructure(structureType, cost);
    }
    
    // Build a structure on the selected planet
    function buildStructure(type, cost) {
        if (!selectedPlanet) {
            console.error("No planet selected for building");
            return;
        }
        
        // Get current resources
        const currentResources = gameInstance.gameState.resources || 0;
        const researchPoints = gameInstance.gameState.research_points || 0;
        const population = gameInstance.gameState.population || 0;
        const materials = gameInstance.gameState.materials || { blue: 0, red: 0, green: 0 };
        const playerFaction = window.USER_INFO ? window.USER_INFO.faction : 'blue';
        
        // Check if player has enough of all resources
        if (currentResources < cost.resources) {
            showNotification(`Not enough resources to build ${type} station.`, 'error');
            return;
        }
        
        if (researchPoints < cost.research_points) {
            showNotification(`Not enough research points to build ${type} station.`, 'error');
            return;
        }
        
        if (population < cost.population) {
            showNotification(`Not enough population to build ${type} station.`, 'error');
            return;
        }
        
        // Check faction materials if needed
        if (cost.faction_materials && playerFaction) {
            if (materials[playerFaction] < 50) {
                showNotification(`Not enough ${playerFaction} materials to build ${type}.`, 'error');
                return;
            }
        }
        
        // Check all materials if needed (for capital shipyard)
        if (cost.blue_material) {
            if (materials.blue < cost.blue_material || 
                materials.red < cost.red_material || 
                materials.green < cost.green_material) {
                showNotification(`Not enough faction materials to build ${type}.`, 'error');
                return;
            }
        }
        
        console.log(`Building ${type} on ${selectedPlanet.userData.planetData.name}`);
        
        // Deduct costs
        gameInstance.gameState.resources -= cost.resources;
        gameInstance.gameState.research_points -= cost.research_points;
        gameInstance.gameState.population -= cost.population;
        
        // Deduct faction materials if needed
        if (cost.faction_materials && playerFaction) {
            gameInstance.gameState.materials[playerFaction] -= 50;
        }
        
        // Deduct all materials if needed
        if (cost.blue_material) {
            gameInstance.gameState.materials.blue -= cost.blue_material;
            gameInstance.gameState.materials.red -= cost.red_material;
            gameInstance.gameState.materials.green -= cost.green_material;
        }
        
        // Update structure counts based on type
        const planetId = selectedPlanet.userData.id || selectedPlanet.id || Math.random().toString(36).substr(2, 9);
        
        // Update mining facilities count if needed
        if (type === 'mining') {
            if (!gameInstance.gameState.mining_facilities) {
                gameInstance.gameState.mining_facilities = {};
            }
            if (!gameInstance.gameState.mining_facilities[planetId]) {
                gameInstance.gameState.mining_facilities[planetId] = 0;
            }
            gameInstance.gameState.mining_facilities[planetId]++;
        }
        
        // Update research outposts if needed
        if (type === 'research') {
            if (!gameInstance.gameState.research_outposts) {
                gameInstance.gameState.research_outposts = {};
            }
            if (!gameInstance.gameState.research_outposts[planetId]) {
                gameInstance.gameState.research_outposts[planetId] = 0;
            }
            gameInstance.gameState.research_outposts[planetId]++;
        }
        
        // Update colony bases if needed
        if (type === 'colony') {
            if (!gameInstance.gameState.colony_bases) {
                gameInstance.gameState.colony_bases = {};
            }
            if (!gameInstance.gameState.colony_bases[planetId]) {
                gameInstance.gameState.colony_bases[planetId] = 0;
            }
            gameInstance.gameState.colony_bases[planetId]++;
        }
        
        // Update orbital structures if building hangars or shipyards
        if (type === 'fighter_hangar' || type === 'shipyard') {
            const planetId = selectedPlanet.userData.id || selectedPlanet.id || Math.random().toString(36).substr(2, 9);
            if (!gameInstance.gameState.orbital_structures) {
                gameInstance.gameState.orbital_structures = {};
            }
            if (!gameInstance.gameState.orbital_structures[planetId]) {
                gameInstance.gameState.orbital_structures[planetId] = [];
            }
            gameInstance.gameState.orbital_structures[planetId].push({
                type: type,
                built: new Date().toISOString()
            });
            
            // Show special notification for orbital structures
            if (type === 'fighter_hangar') {
                showNotification(`Fighter Hangar built! You can now construct fighter ships.`);
            } else if (type === 'shipyard') {
                showNotification(`Capital Shipyard built! You can now construct capital ships.`);
            }
        }
        
        // Try to add structure to the planet
        if (typeof selectedPlanet.addStructure === 'function') {
            selectedPlanet.addStructure(type);
        } else {
            // Update planet data anyway so UI shows the new structure
            if (!selectedPlanet.userData.planetData.structures) {
                selectedPlanet.userData.planetData.structures = [];
            }
            selectedPlanet.userData.planetData.structures.push({ type });
        }
        
        // Show notification
        showNotification(`Built ${type} station on ${selectedPlanet.userData.planetData.name}`);
        
        // Update game state
        gameInstance.updateResourceDisplay();
        gameInstance.saveGame();
        
        // Refresh the build menu
        showForPlanet(selectedPlanet);
    }
    
    // Hide the build menu
    function hide() {
        buildMenu.style.display = 'none';
        selectedPlanet = null;
    }
    
    // Show a notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'error' : ''}`;
        notification.textContent = message;
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
    
    // Return public interface
    return {
        showForPlanet,
        hide
    };
}