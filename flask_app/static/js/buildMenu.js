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
        const cost = parseInt(button.getAttribute('data-cost'));
        
        // Check if button is disabled
        if (button.classList.contains('disabled')) {
            showNotification(`Not enough resources to build ${structureType} station. Need ${cost} resources.`, 'error');
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
        
        // Check if player has enough resources
        const currentResources = gameInstance.gameState.resources || 0;
        if (currentResources < cost) {
            showNotification(`Not enough resources to build ${type} station.`, 'error');
            return;
        }
        
        console.log(`Building ${type} on ${selectedPlanet.userData.planetData.name}`);
        
        // Deduct resources
        gameInstance.gameState.resources -= cost;
        
        // Update mining facilities count if needed
        if (type === 'mining') {
            const planetId = selectedPlanet.userData.id || selectedPlanet.id || Math.random().toString(36).substr(2, 9);
            if (!gameInstance.gameState.mining_facilities) {
                gameInstance.gameState.mining_facilities = {};
            }
            if (!gameInstance.gameState.mining_facilities[planetId]) {
                gameInstance.gameState.mining_facilities[planetId] = 0;
            }
            gameInstance.gameState.mining_facilities[planetId]++;
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