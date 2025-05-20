import * as THREE from 'three';
import { Ship } from '../objects/ship.js';
import { AsteroidField } from '../objects/asteroid.js';
import { CombatGrid } from './grid.js';

// CombatManager class to manage RTS gameplay
class CombatManager {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        
        // Initialize arrays for game objects
        this.playerShips = [];
        this.opponentShips = [];
        this.selectedShips = [];
        this.asteroids = [];
        
        // Mouse and raycaster for interaction
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        
        // Mode flags
        this.isAttackMode = false;
        this.isPatrolMode = false;
        
        // WebSocket connection
        this.socket = window.socket;
        
        // Battle info
        this.battleRoom = data.battle_room;
        this.opponentId = data.opponent_id;
        
        // Create grid system
        this.grid = new CombatGrid({
            width: 600,
            height: 600,
            cellSize: 20,
            showGrid: true
        });
        
        // Add grid to scene
        this.scene.add(this.grid.object);
        
        // Create asteroid field
        this.createAsteroidField();
        
        // Initialize player and opponent ships
        this.initializeShips();
        
        // Set up socket event handlers
        this.initSocketEventHandlers();
    }
    
    // Create asteroid field
    createAsteroidField() {
        const asteroidField = new AsteroidField({
            count: 40,  // Number of asteroids
            radius: 250, // Field radius
            centerPosition: new THREE.Vector3(0, 0, 0),
            heightRange: { min: 0, max: 30 }
        });
        
        this.asteroids = asteroidField.generate(this.scene);
        
        // Update grid with obstacles
        this.grid.updateFromScene(this.scene);
    }
    
    // Initialize player and opponent ships
    initializeShips() {
        // Get ship counts from data
        const playerFighters = this.data.ships?.fighters || 5;
        const playerCapitals = this.data.ships?.capital_ships || 1;
        const opponentFighters = this.data.opponent_ships?.fighters || 5;
        const opponentCapitals = this.data.opponent_ships?.capital_ships || 1;
        
        // Get faction colors
        const playerFaction = window.USER_INFO.faction;
        const opponentFaction = this.data.opponent_faction || 'red';
        
        // Create player ships
        this.createPlayerShips(playerFighters, playerCapitals, playerFaction);
        
        // Create opponent ships
        this.createOpponentShips(opponentFighters, opponentCapitals, opponentFaction);
        
        // Update ship counts in UI
        this.updateShipCounts();
    }
    
    // Create player ships
    createPlayerShips(fighterCount, capitalCount, faction) {
        // Create fighters
        for (let i = 0; i < fighterCount; i++) {
            // Calculate formation position
            const row = Math.floor(i / 3);
            const col = i % 3;
            
            const position = {
                x: -150 - (col * 20),
                y: 10,
                z: -50 + (row * 20)
            };
            
            // Create fighter ship
            const fighter = new Ship({
                type: 'fighter',
                faction: faction,
                position: position,
                isPlayerShip: true,
                id: `player_fighter_${i}`
            });
            
            // Add to scene and player ships array
            this.scene.add(fighter.object);
            this.playerShips.push(fighter);
        }
        
        // Create capital ships
        for (let i = 0; i < capitalCount; i++) {
            const position = {
                x: -200 - (i * 30),
                y: 20,
                z: 0 + (i * 30)
            };
            
            // Create capital ship
            const capitalShip = new Ship({
                type: 'capital',
                faction: faction,
                position: position,
                isPlayerShip: true,
                id: `player_capital_${i}`
            });
            
            // Add to scene and player ships array
            this.scene.add(capitalShip.object);
            this.playerShips.push(capitalShip);
        }
    }
    
    // Create opponent ships
    createOpponentShips(fighterCount, capitalCount, faction) {
        // Create fighters
        for (let i = 0; i < fighterCount; i++) {
            // Calculate formation position
            const row = Math.floor(i / 3);
            const col = i % 3;
            
            const position = {
                x: 150 + (col * 20),
                y: 10,
                z: -50 + (row * 20)
            };
            
            // Create fighter ship
            const fighter = new Ship({
                type: 'fighter',
                faction: faction,
                position: position,
                isPlayerShip: false,
                id: `opponent_fighter_${i}`
            });
            
            // Rotate to face player
            fighter.object.rotation.y = Math.PI;
            
            // Add to scene and opponent ships array
            this.scene.add(fighter.object);
            this.opponentShips.push(fighter);
        }
        
        // Create capital ships
        for (let i = 0; i < capitalCount; i++) {
            const position = {
                x: 200 + (i * 30),
                y: 20,
                z: 0 + (i * 30)
            };
            
            // Create capital ship
            const capitalShip = new Ship({
                type: 'capital',
                faction: faction,
                position: position,
                isPlayerShip: false,
                id: `opponent_capital_${i}`
            });
            
            // Rotate to face player
            capitalShip.object.rotation.y = Math.PI;
            
            // Add to scene and opponent ships array
            this.scene.add(capitalShip.object);
            this.opponentShips.push(capitalShip);
        }
    }
    
    // Initialize socket event handlers
    initSocketEventHandlers() {
        if (!this.socket) return;
        
        // Handle opponent ship movement
        this.socket.on('opponent_move', (data) => {
            this.handleOpponentMove(data);
        });
        
        // Handle opponent ship attacks
        this.socket.on('opponent_attack', (data) => {
            this.handleOpponentAttack(data);
        });
        
        // Handle battle end
        this.socket.on('battle_ended', (data) => {
            this.handleBattleEnd(data);
        });
    }
    
    // Handle mouse interaction
    handleMouseDown(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, window.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // If in attack mode, check for attack target
        if (this.isAttackMode && this.selectedShips.length > 0) {
            for (const intersect of intersects) {
                // Get the top level object
                let object = intersect.object;
                while (object.parent !== this.scene && object.parent) {
                    object = object.parent;
                }
                
                // Check if it's an opponent ship
                if (object.userData && object.userData.isOpponentShip) {
                    this.attackTarget(object);
                    return;
                }
            }
        }
        
        // Check if shift key is pressed for multi-select
        const isMultiSelect = event.shiftKey;
        
        // If not multi-select, clear current selection
        if (!isMultiSelect) {
            this.clearSelection();
        }
        
        // Check for ship selection
        for (const intersect of intersects) {
            // Get the top level object
            let object = intersect.object;
            while (object.parent !== this.scene && object.parent) {
                object = object.parent;
            }
            
            // Check if it's a player ship
            if (object.userData && object.userData.isPlayerShip) {
                const ship = object.userData.shipInstance;
                if (ship) {
                    this.selectShip(ship);
                    return;
                }
            }
        }
    }
    
    // Handle mouse up (for movement commands)
    handleMouseUp(event) {
        // If no ships selected or in attack mode, do nothing
        if (this.selectedShips.length === 0 || this.isAttackMode) return;
        
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, window.camera);
        
        // Find intersection with the ground
        const intersects = this.raycaster.intersectObjects([this.grid.object]);
        
        if (intersects.length > 0) {
            // Get position on the ground
            const targetPosition = intersects[0].point.clone();
            
            // If in patrol mode, set up patrol between current position and target
            if (this.isPatrolMode) {
                this.setPatrol(targetPosition);
            } else {
                // Regular move command
                this.moveShipsTo(targetPosition);
            }
        }
    }
    
    // Select a ship
    selectShip(ship) {
        // Check if already selected
        if (!this.selectedShips.includes(ship)) {
            this.selectedShips.push(ship);
            ship.showSelection();
        }
    }
    
    // Deselect a ship
    deselectShip(ship) {
        const index = this.selectedShips.indexOf(ship);
        if (index !== -1) {
            this.selectedShips.splice(index, 1);
            ship.hideSelection();
        }
    }
    
    // Clear all selections
    clearSelection() {
        while (this.selectedShips.length > 0) {
            this.deselectShip(this.selectedShips[0]);
        }
    }
    
    // Select all player ships
    selectAllShips() {
        // Clear current selection
        this.clearSelection();
        
        // Select all player ships
        for (const ship of this.playerShips) {
            this.selectShip(ship);
        }
    }
    
    // Move selected ships to target position
    moveShipsTo(targetPosition) {
        if (this.selectedShips.length === 0) return;
        
        // Calculate formation positions
        const positions = this.calculateFormationPositions(
            targetPosition,
            this.selectedShips.length
        );
        
        // Assign each ship its position in the formation
        this.selectedShips.forEach((ship, index) => {
            // Skip defense platforms which can't move
            if (ship.config.type === 'defense') return;
            
            const position = positions[index];
            
            // Use pathfinding to find path
            const path = this.grid.findPath(
                ship.object.position,
                position
            );
            
            // If path found, set ship to follow it
            if (path.length > 0) {
                // Set ship on path
                ship.path = path;
                ship.currentPathIndex = 0;
                ship.isMoving = true;
                
                // Move to first point
                if (path.length > 0) {
                    ship.moveTo(new THREE.Vector3(path[0].x, ship.object.position.y, path[0].z));
                }
                
                // Optionally visualize the path (for debugging)
                // this.grid.visualizePath(path, this.scene);
                
                // Notify server about movement
                if (this.socket) {
                    this.socket.emit('ship_move', {
                        battle_room: this.battleRoom,
                        ship_id: ship.config.id,
                        position: {
                            x: position.x,
                            y: ship.object.position.y,
                            z: position.z
                        }
                    });
                }
            }
        });
    }
    
    // Calculate formation positions
    calculateFormationPositions(centerPosition, shipCount) {
        const positions = [];
        
        // Simple grid formation
        const gridSize = Math.ceil(Math.sqrt(shipCount));
        const spacing = 15; // Space between ships
        
        // Calculate starting position
        const startX = centerPosition.x - (spacing * (gridSize - 1)) / 2;
        const startZ = centerPosition.z - (spacing * (gridSize - 1)) / 2;
        
        // Generate positions
        for (let i = 0; i < shipCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            positions.push(new THREE.Vector3(
                startX + col * spacing,
                centerPosition.y,
                startZ + row * spacing
            ));
        }
        
        return positions;
    }
    
    // Set patrol route for selected ships
    setPatrol(endPosition) {
        if (this.selectedShips.length === 0) return;
        
        this.selectedShips.forEach(ship => {
            // Skip defense platforms which can't move
            if (ship.config.type === 'defense') return;
            
            // Create patrol between current position and target
            const startPos = ship.object.position.clone();
            const patrolPoints = [startPos, endPosition.clone()];
            
            // Set patrol
            ship.setPatrol(patrolPoints);
            
            // Notify server
            if (this.socket) {
                this.socket.emit('ship_patrol', {
                    battle_room: this.battleRoom,
                    ship_id: ship.config.id,
                    patrol_points: patrolPoints.map(p => ({
                        x: p.x,
                        y: p.y,
                        z: p.z
                    }))
                });
            }
        });
    }
    
    // Attack target with selected ships
    attackTarget(targetObject) {
        if (this.selectedShips.length === 0) return;
        
        // Get the ship instance
        const targetShip = targetObject.userData.shipInstance;
        if (!targetShip) return;
        
        this.selectedShips.forEach(ship => {
            // Set attack target
            ship.setAttackTarget(targetShip.object);
            
            // Notify server
            if (this.socket) {
                this.socket.emit('ship_attack', {
                    battle_room: this.battleRoom,
                    attacker_id: ship.config.id,
                    target_id: targetShip.config.id,
                    damage: ship.object.userData.attackPower
                });
            }
        });
    }
    
    // Set attack mode
    setAttackMode(enabled = true) {
        this.isAttackMode = enabled;
        this.isPatrolMode = false;
        
        // Update UI
        const attackButton = document.getElementById('attack-mode');
        const patrolButton = document.getElementById('patrol-mode');
        
        if (attackButton) {
            attackButton.style.backgroundColor = enabled ? 
                'rgba(255, 100, 0, 0.8)' :
                'rgba(200, 60, 0, 0.8)';
        }
        
        if (patrolButton) {
            patrolButton.style.backgroundColor = 'rgba(0, 80, 160, 0.8)';
        }
    }
    
    // Set patrol mode
    setPatrolMode(enabled = true) {
        this.isPatrolMode = enabled;
        this.isAttackMode = false;
        
        // Update UI
        const attackButton = document.getElementById('attack-mode');
        const patrolButton = document.getElementById('patrol-mode');
        
        if (patrolButton) {
            patrolButton.style.backgroundColor = enabled ? 
                'rgba(0, 255, 100, 0.8)' :
                'rgba(0, 80, 160, 0.8)';
        }
        
        if (attackButton) {
            attackButton.style.backgroundColor = 'rgba(200, 60, 0, 0.8)';
        }
    }
    
    // Retreat all selected ships
    retreat() {
        // Move selected ships back to starting area
        const retreatPosition = new THREE.Vector3(-300, 10, 0);
        this.moveShipsTo(retreatPosition);
    }
    
    // Handle opponent ship movement from server
    handleOpponentMove(data) {
        // Find the ship by ID
        const ship = this.findOpponentShipById(data.ship_id);
        if (!ship) return;
        
        // Create target position
        const targetPosition = new THREE.Vector3(
            data.position.x,
            data.position.y,
            data.position.z
        );
        
        // Use pathfinding to find a path
        const path = this.grid.findPath(
            ship.object.position,
            targetPosition
        );
        
        // If path found, set ship to follow it
        if (path.length > 0) {
            ship.path = path;
            ship.currentPathIndex = 0;
            ship.isMoving = true;
            
            // Move to first point
            if (path.length > 0) {
                ship.moveTo(new THREE.Vector3(path[0].x, ship.object.position.y, path[0].z));
            }
        }
    }
    
    // Handle opponent ship attack from server
    handleOpponentAttack(data) {
        // Find ships by ID
        const attackerShip = this.findOpponentShipById(data.attacker_id);
        const targetShip = this.findPlayerShipById(data.target_id);
        
        if (!attackerShip || !targetShip) return;
        
        // Set attack target
        attackerShip.setAttackTarget(targetShip.object);
    }
    
    // Handle battle end notification
    handleBattleEnd(data) {
        // Create visual notification
        const winner = data.winner;
        const isVictory = winner === window.USER_INFO.id;
        
        const resultMessage = isVictory ? 'Victory!' : 'Defeat!';
        const messageColor = isVictory ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
        
        const messageElement = document.createElement('div');
        messageElement.style.position = 'fixed';
        messageElement.style.top = '50%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.fontSize = '48px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.color = 'white';
        messageElement.style.textShadow = '0 0 20px ' + messageColor;
        messageElement.style.zIndex = '1000';
        messageElement.textContent = resultMessage;
        
        document.body.appendChild(messageElement);
        
        // Redirect back to main game after a delay
        setTimeout(() => {
            window.location.href = '/build';
        }, 5000);
    }
    
    // Update ship counts in UI
    updateShipCounts() {
        // Count ship types
        const fighters = this.playerShips.filter(ship => ship.config.type === 'fighter').length;
        const capitals = this.playerShips.filter(ship => ship.config.type === 'capital').length;
        
        // Update UI
        const fightersElement = document.getElementById('fighters-value');
        const capitalsElement = document.getElementById('capital-ships-value');
        
        if (fightersElement) fightersElement.textContent = fighters;
        if (capitalsElement) capitalsElement.textContent = capitals;
    }
    
    // Helper to find player ship by ID
    findPlayerShipById(id) {
        return this.playerShips.find(ship => ship.config.id === id);
    }
    
    // Helper to find opponent ship by ID
    findOpponentShipById(id) {
        return this.opponentShips.find(ship => ship.config.id === id);
    }
    
    // Check victory conditions
    checkVictoryConditions() {
        if (this.playerShips.length === 0) {
            // Player lost all ships
            this.endBattle('opponent');
            return true;
        } else if (this.opponentShips.length === 0) {
            // Opponent lost all ships
            this.endBattle('player');
            return true;
        }
        return false;
    }
    
    // End battle
    endBattle(winner) {
        if (this.socket) {
            this.socket.emit('end_battle', {
                battle_room: this.battleRoom,
                winner: winner === 'player' ? window.USER_INFO.id : this.opponentId,
                result: winner === 'player' ? 'victory' : 'defeat'
            });
        }
    }
    
    // Remove a ship when destroyed
    removeShip(ship) {
        // Deselect if selected
        this.deselectShip(ship);
        
        // Remove from appropriate array
        if (ship.config.isPlayerShip) {
            const index = this.playerShips.indexOf(ship);
            if (index !== -1) {
                this.playerShips.splice(index, 1);
            }
        } else {
            const index = this.opponentShips.indexOf(ship);
            if (index !== -1) {
                this.opponentShips.splice(index, 1);
            }
        }
        
        // Remove from scene
        if (ship.object.parent) {
            ship.object.parent.remove(ship.object);
        }
        
        // Update UI
        this.updateShipCounts();
        
        // Check victory conditions
        this.checkVictoryConditions();
    }
    
    // Update all game objects
    update(delta) {
        // Update player ships
        for (let i = this.playerShips.length - 1; i >= 0; i--) {
            const ship = this.playerShips[i];
            ship.update(delta);
            
            // Check if ship is destroyed
            if (ship.object.userData.isDestroyed) {
                this.removeShip(ship);
            } else if (ship.isMoving && ship.path && ship.path.length > 0) {
                // Check if reached current path point
                const currentTarget = ship.path[ship.currentPathIndex];
                const distanceToTarget = ship.object.position.distanceTo(
                    new THREE.Vector3(currentTarget.x, ship.object.position.y, currentTarget.z)
                );
                
                if (distanceToTarget < 1) {
                    // Move to next path point
                    ship.currentPathIndex++;
                    
                    if (ship.currentPathIndex < ship.path.length) {
                        const nextPoint = ship.path[ship.currentPathIndex];
                        ship.moveTo(new THREE.Vector3(nextPoint.x, ship.object.position.y, nextPoint.z));
                    } else {
                        // Reached end of path
                        ship.isMoving = false;
                        ship.path = [];
                    }
                }
            }
        }
        
        // Update opponent ships
        for (let i = this.opponentShips.length - 1; i >= 0; i--) {
            const ship = this.opponentShips[i];
            ship.update(delta);
            
            // Check if ship is destroyed
            if (ship.object.userData.isDestroyed) {
                this.removeShip(ship);
            } else if (ship.isMoving && ship.path && ship.path.length > 0) {
                // Check if reached current path point
                const currentTarget = ship.path[ship.currentPathIndex];
                const distanceToTarget = ship.object.position.distanceTo(
                    new THREE.Vector3(currentTarget.x, ship.object.position.y, currentTarget.z)
                );
                
                if (distanceToTarget < 1) {
                    // Move to next path point
                    ship.currentPathIndex++;
                    
                    if (ship.currentPathIndex < ship.path.length) {
                        const nextPoint = ship.path[ship.currentPathIndex];
                        ship.moveTo(new THREE.Vector3(nextPoint.x, ship.object.position.y, nextPoint.z));
                    } else {
                        // Reached end of path
                        ship.isMoving = false;
                        ship.path = [];
                    }
                }
            }
        }
        
        // Update asteroids
        for (const asteroid of this.asteroids) {
            asteroid.update(delta);
        }
    }
}

export { CombatManager };