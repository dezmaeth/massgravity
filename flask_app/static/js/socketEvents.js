// Set up Socket.IO connection
const socket = io();

// Store battle request info
let currentBattleRequest = null;

// Connection status handlers
socket.on('connect', function() {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.className = 'connected';
    statusDiv.innerHTML = '<div class="indicator"></div><span>Connected</span>';
    console.log('Socket connected');

    // Request active players list
    socket.emit('get_active_players');
});

socket.on('disconnect', function() {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.className = 'disconnected';
    statusDiv.innerHTML = '<div class="indicator"></div><span>Disconnected</span>';
    console.log('Socket disconnected');
});

socket.on('connect_error', function() {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.className = 'disconnected';
    statusDiv.innerHTML = '<div class="indicator"></div><span>Connection Error</span>';
    console.log('Socket connection error');
});

// Players list functionality
socket.on('active_players_list', function(data) {
    updatePlayersList(data.players);
});

// Battle request handlers
socket.on('battle_request', function(data) {
    // Store request data
    currentBattleRequest = data;

    // Update the request text
    document.getElementById('battle-request-text').textContent =
        `${data.from_name} (${data.from_faction}) wants to battle with you!`;

    // Show the modal
    document.getElementById('battle-request-modal').style.display = 'block';
});

socket.on('battle_request_sent', function(data) {
    showNotification(`Battle request sent to ${data.target_name}`);
});

socket.on('battle_request_error', function(data) {
    showNotification(data.message, 'error');
});

socket.on('battle_accepted', function(data) {
    showNotification(`${data.opponent_name} accepted your battle request!`);
    // Redirect to combat page
    window.location.href = `/combat/${data.opponent_id}`;
});

socket.on('battle_declined', function(data) {
    showNotification(`${data.opponent_name} declined your battle request.`, 'error');
});

socket.on('battle_response_error', function(data) {
    showNotification(data.message, 'error');
});

// Players panel toggle
document.getElementById('toggle-players-panel').addEventListener('click', function() {
    const panel = document.getElementById('players-panel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        // Request updated player list
        socket.emit('get_active_players');
    } else {
        panel.style.display = 'none';
    }
});

// Battle request modal response buttons
document.getElementById('accept-battle').addEventListener('click', function() {
    if (currentBattleRequest) {
        socket.emit('accept_battle', {
            requester_id: currentBattleRequest.from_id
        });
        document.getElementById('battle-request-modal').style.display = 'none';
    }
});

document.getElementById('decline-battle').addEventListener('click', function() {
    if (currentBattleRequest) {
        socket.emit('decline_battle', {
            requester_id: currentBattleRequest.from_id
        });
        document.getElementById('battle-request-modal').style.display = 'none';
        currentBattleRequest = null;
    }
});

// Refresh players list button
document.getElementById('refresh-players').addEventListener('click', function() {
    socket.emit('get_active_players');
});

// Function to update the players list
function updatePlayersList(players) {
    const playersList = document.getElementById('players-list');

    if (players.length === 0) {
        playersList.innerHTML = '<div class="no-players" style="text-align: center; padding: 20px 0; color: rgba(255, 255, 255, 0.6);">No other players online</div>';
        return;
    }

    // Clear the list
    playersList.innerHTML = '';

    // Add each player
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.style.display = 'flex';
        playerItem.style.justifyContent = 'space-between';
        playerItem.style.alignItems = 'center';
        playerItem.style.padding = '8px';
        playerItem.style.marginBottom = '5px';
        playerItem.style.background = 'rgba(0, 50, 100, 0.3)';
        playerItem.style.borderRadius = '3px';
        playerItem.style.border = '1px solid rgba(0, 100, 255, 0.3)';

        // Assign faction color
        let factionColor = '#3498db'; // Blue default
        if (player.faction === 'red') {
            factionColor = '#e74c3c';
        } else if (player.faction === 'green') {
            factionColor = '#2ecc71';
        }

        playerItem.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="width: 10px; height: 10px; background-color: ${factionColor}; border-radius: 50%; margin-right: 8px;"></div>
                <span>${player.username}</span>
            </div>
            <button class="attack-button" data-player-id="${player.id}" data-player-name="${player.username}" data-player-faction="${player.faction}"
                style="background: rgba(200, 60, 60, 0.7); color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                Attack
            </button>
        `;

        playersList.appendChild(playerItem);
    });

    // Add event listeners to attack buttons
    const attackButtons = playersList.querySelectorAll('.attack-button');
    attackButtons.forEach(button => {
        button.addEventListener('click', function() {
            const playerId = this.getAttribute('data-player-id');
            const playerName = this.getAttribute('data-player-name');

            // Send battle request
            socket.emit('request_battle', {
                target_id: parseInt(playerId)
            });

            showNotification(`Sending battle request to ${playerName}...`);
        });
    });
}

// Resource update handler from server
socket.on('resource_update', function(data) {
    console.log('Resource update received:', data);

    // Update game state with server data
    if (window.gameState) {
        // Update resources
        window.gameState.resources = data.resources;

        // Update materials
        if (data.materials && window.gameState.materials) {
            window.gameState.materials.blue = data.materials.blue;
            window.gameState.materials.red = data.materials.red;
            window.gameState.materials.green = data.materials.green;
        }

        // Update ships
        if (data.ships && window.gameState.ships) {
            window.gameState.ships.fighters = data.ships.fighters;
            window.gameState.ships.capital_ships = data.ships.capital_ships;
        }

        // Call update function if game is loaded
        if (window.massGravity) {
            window.massGravity.updateResourceDisplay();
        } else {
            // Directly update DOM elements if game isn't loaded yet
            updateDOMResourceDisplay(data);
        }
    }
});

// Save game response handler
socket.on('save_success', function(response) {
    console.log('Save success:', response);

    if (response.updated_data) {
        // Update game state with returned data
        if (window.gameState) {
            // Update game state with server data
            Object.assign(window.gameState, response.updated_data);

            // Call update function if game is loaded
            if (window.massGravity) {
                window.massGravity.updateResourceDisplay();
            }
        }
    }

    // Show success notification
    showNotification('Game saved successfully');
});

socket.on('save_error', function(response) {
    console.error('Save error:', response);
    showNotification('Error saving game: ' + response.message, 'error');
});




// Utility function to update resource display DOM elements directly with animation
function updateDOMResourceDisplay(data) {
    // Helper function to animate value changes
    function animateValueChange(element, newValue) {
        if (!element) return;

        // Get current value
        const currentValue = parseInt(element.textContent) || 0;
        newValue = Math.floor(newValue);

        // If value changed, animate
        if (currentValue !== newValue) {
            // Add animation class
            element.classList.add('resource-increment');

            // Set the new value
            element.textContent = newValue;

            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove('resource-increment');
            }, 500);
        }
    }

    // Update resources
    const resourcesValue = document.getElementById('resources-value');
    if (resourcesValue && typeof data.resources !== 'undefined') {
        animateValueChange(resourcesValue, data.resources);
    }

    // Update research points
    const researchPointsValue = document.getElementById('research-points-value');
    if (researchPointsValue && typeof data.research_points !== 'undefined') {
        animateValueChange(researchPointsValue, data.research_points);
    }

    // Update population
    const populationValue = document.getElementById('population-value');
    if (populationValue && typeof data.population !== 'undefined') {
        animateValueChange(populationValue, data.population);
    }

    // Update faction materials
    if (data.materials) {
        // Blue materials
        const blueMaterial = document.getElementById('blue-material-value');
        if (blueMaterial && typeof data.materials.blue !== 'undefined') {
            animateValueChange(blueMaterial, data.materials.blue);
        }

        // Red materials
        const redMaterial = document.getElementById('red-material-value');
        if (redMaterial && typeof data.materials.red !== 'undefined') {
            animateValueChange(redMaterial, data.materials.red);
        }

        // Green materials
        const greenMaterial = document.getElementById('green-material-value');
        if (greenMaterial && typeof data.materials.green !== 'undefined') {
            animateValueChange(greenMaterial, data.materials.green);
        }
    }
}

// Utility function to show notifications with animation
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification ' + (type === 'error' ? 'error space-alert' : '');

    // Add icon based on notification type
    const icon = type === 'error' ?
        '<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>' :
        '<i class="fas fa-info-circle" style="margin-right: 8px;"></i>';

    notification.innerHTML = icon + message;

    // Set background color based on type
    if (type === 'error') {
        notification.style.backgroundColor = 'rgba(231, 76, 60, 0.8)';
        notification.style.borderColor = 'rgba(231, 76, 60, 0.9)';
    } else {
        notification.style.backgroundColor = 'rgba(46, 204, 113, 0.8)';
        notification.style.borderColor = 'rgba(46, 204, 113, 0.9)';
    }

    document.body.appendChild(notification);

    // Add staggered animation class
    notification.classList.add('fade-in-up');

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px) translateX(-50%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// Set up the build menu
document.addEventListener('DOMContentLoaded', function() {
    const buildMenu = document.getElementById('build-menu');
    const buildMenuContent = document.querySelector('.build-menu-content');

    // Only show the build menu when clicking on a planet
    buildMenu.style.display = 'none';

    // Define building options
    const buildOptions = [
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
        },
        {
            type: 'fighter_hangar',
            name: 'Fighter Hangar',
            desc: 'Allows construction of fighter ships',
            cost: 500,
            icon: 'F',
            iconColor: 'rgba(100, 150, 255, 0.5)'
        },
        {
            type: 'shipyard',
            name: 'Capital Shipyard',
            desc: 'Allows construction of capital ships',
            cost: 1000,
            icon: 'S',
            iconColor: 'rgba(200, 100, 255, 0.5)'
        }
    ];

    // Generate menu HTML
    function updateBuildMenu(resources = 500) {
        let html = '';

        buildOptions.forEach(option => {
            const canAfford = resources >= option.cost;
            const itemClass = canAfford ? 'build-menu-item' : 'build-menu-item disabled';
            const costClass = canAfford ? 'build-menu-item-cost' : 'build-menu-item-cost insufficient';

            html += `
                <div class="${itemClass}" data-type="${option.type}" data-cost="${option.cost}">
                    <div class="build-menu-item-icon" style="background-color: ${option.iconColor};">${option.icon}</div>
                    <div class="build-menu-item-details">
                        <div class="build-menu-item-name">${option.name}</div>
                        <div class="build-menu-item-desc">${option.desc}</div>
                        <div class="${costClass}">Cost: ${option.cost} resources</div>
                    </div>
                </div>
            `;
        });

        buildMenuContent.innerHTML = html;

        // Add click handlers
        buildMenuContent.querySelectorAll('.build-menu-item').forEach(item => {
            item.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const cost = parseInt(this.getAttribute('data-cost'));

                if (this.classList.contains('disabled')) {
                    showNotification(`Not enough resources to build ${type} station.`);
                    return;
                }

                // The game will handle this through the event listener
                const buildEvent = new CustomEvent('build-structure', {
                    detail: { type, cost }
                });
                document.dispatchEvent(buildEvent);
            });
        });
    }

    // Generate initial menu content
    updateBuildMenu();

    // Export build menu functions to window object
    window.buildMenuUI = {
        show: function() {
            buildMenu.style.display = 'block';
        },
        hide: function() {
            buildMenu.style.display = 'none';
        },
        update: updateBuildMenu
    };
});