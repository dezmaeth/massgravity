import * as THREE from 'three';

// Grid system for combat navigation and pathfinding
class CombatGrid {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            width: config.width || 600,       // Total width of the grid
            height: config.height || 600,     // Total height (length) of the grid
            cellSize: config.cellSize || 20,  // Size of each grid cell
            showGrid: config.showGrid !== undefined ? config.showGrid : true
        };
        
        // Calculate grid dimensions
        this.gridWidth = Math.floor(this.config.width / this.config.cellSize);
        this.gridHeight = Math.floor(this.config.height / this.config.cellSize);
        
        // Initialize grid cells
        this.cells = [];
        for (let x = 0; x < this.gridWidth; x++) {
            this.cells[x] = [];
            for (let z = 0; z < this.gridHeight; z++) {
                this.cells[x][z] = {
                    x: x,
                    z: z,
                    worldX: (x - this.gridWidth / 2) * this.config.cellSize,
                    worldZ: (z - this.gridHeight / 2) * this.config.cellSize,
                    occupied: false,
                    obstacle: false,
                    object: null
                };
            }
        }
        
        // Create visual representation
        this.object = this.createGridObject();
    }
    
    // Create visual grid representation
    createGridObject() {
        const gridContainer = new THREE.Object3D();
        
        // Only create visual grid if showGrid is true
        if (this.config.showGrid) {
            // Create the main grid
            const gridGeometry = new THREE.PlaneGeometry(
                this.config.width, 
                this.config.height
            );
            const gridMaterial = new THREE.MeshBasicMaterial({
                color: 0x001a66,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            });
            
            const gridPlane = new THREE.Mesh(gridGeometry, gridMaterial);
            gridPlane.rotation.x = -Math.PI / 2;
            gridPlane.position.y = 0.1; // Slightly above ground to avoid z-fighting
            gridPlane.receiveShadow = true;
            gridContainer.add(gridPlane);
            
            // Create grid lines
            const lineColor = new THREE.Color(0x00aaff);
            const lineOpacity = 0.15;
            
            // Create line material
            const lineMaterial = new THREE.LineBasicMaterial({
                color: lineColor,
                transparent: true,
                opacity: lineOpacity
            });
            
            // Create vertical lines (along X axis)
            for (let x = 0; x <= this.gridWidth; x++) {
                const worldX = (x - this.gridWidth / 2) * this.config.cellSize;
                
                const lineGeometry = new THREE.BufferGeometry();
                const linePoints = [
                    new THREE.Vector3(worldX, 0.2, -this.config.height / 2),
                    new THREE.Vector3(worldX, 0.2, this.config.height / 2)
                ];
                lineGeometry.setFromPoints(linePoints);
                
                const line = new THREE.Line(lineGeometry, lineMaterial);
                gridContainer.add(line);
            }
            
            // Create horizontal lines (along Z axis)
            for (let z = 0; z <= this.gridHeight; z++) {
                const worldZ = (z - this.gridHeight / 2) * this.config.cellSize;
                
                const lineGeometry = new THREE.BufferGeometry();
                const linePoints = [
                    new THREE.Vector3(-this.config.width / 2, 0.2, worldZ),
                    new THREE.Vector3(this.config.width / 2, 0.2, worldZ)
                ];
                lineGeometry.setFromPoints(linePoints);
                
                const line = new THREE.Line(lineGeometry, lineMaterial);
                gridContainer.add(line);
            }
        }
        
        return gridContainer;
    }
    
    // Convert world position to grid coordinates
    worldToGrid(worldX, worldZ) {
        const gridX = Math.floor((worldX + this.config.width / 2) / this.config.cellSize);
        const gridZ = Math.floor((worldZ + this.config.height / 2) / this.config.cellSize);
        
        // Ensure coordinates are within bounds
        const x = Math.max(0, Math.min(this.gridWidth - 1, gridX));
        const z = Math.max(0, Math.min(this.gridHeight - 1, gridZ));
        
        return { x, z };
    }
    
    // Convert grid coordinates to world position (center of cell)
    gridToWorld(gridX, gridZ) {
        const worldX = (gridX - this.gridWidth / 2 + 0.5) * this.config.cellSize;
        const worldZ = (gridZ - this.gridHeight / 2 + 0.5) * this.config.cellSize;
        
        return { x: worldX, y: 0, z: worldZ };
    }
    
    // Get cell at grid coordinates
    getCell(gridX, gridZ) {
        if (gridX >= 0 && gridX < this.gridWidth && gridZ >= 0 && gridZ < this.gridHeight) {
            return this.cells[gridX][gridZ];
        }
        return null;
    }
    
    // Get cell containing world position
    getCellAt(worldX, worldZ) {
        const gridPos = this.worldToGrid(worldX, worldZ);
        return this.getCell(gridPos.x, gridPos.z);
    }
    
    // Mark cell as obstacle
    setObstacle(gridX, gridZ, isObstacle = true) {
        const cell = this.getCell(gridX, gridZ);
        if (cell) {
            cell.obstacle = isObstacle;
        }
    }
    
    // Mark cell as occupied by an object
    setOccupied(gridX, gridZ, object = null) {
        const cell = this.getCell(gridX, gridZ);
        if (cell) {
            cell.occupied = !!object;
            cell.object = object;
        }
    }
    
    // Update grid cells based on objects in the scene
    updateFromScene(scene) {
        // Reset all cells
        for (let x = 0; x < this.gridWidth; x++) {
            for (let z = 0; z < this.gridHeight; z++) {
                this.cells[x][z].occupied = false;
                this.cells[x][z].object = null;
            }
        }
        
        // Find all asteroid objects and mark their cells as obstacles
        scene.children.forEach(object => {
            if (object.userData && (object.userData.isAsteroid || object.userData.isObstacle)) {
                const position = object.position;
                
                // For larger objects, mark multiple cells
                let radius = 1; // Default cell radius
                
                if (object.userData.isAsteroid) {
                    switch(object.userData.size) {
                        case 'small':
                            radius = 1;
                            break;
                        case 'medium':
                            radius = 2;
                            break;
                        case 'large':
                            radius = 3;
                            break;
                    }
                } else if (object.userData.obstacleSize) {
                    radius = object.userData.obstacleSize;
                }
                
                // Mark cells in the radius
                const gridPos = this.worldToGrid(position.x, position.z);
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                        const x = gridPos.x + dx;
                        const z = gridPos.z + dz;
                        this.setObstacle(x, z, true);
                    }
                }
            }
        });
    }
    
    // Pathfinding methods
    
    // Find path between two points using A* algorithm
    findPath(startPos, endPos) {
        // Convert world positions to grid coordinates
        const startGrid = this.worldToGrid(startPos.x, startPos.z);
        const endGrid = this.worldToGrid(endPos.x, endPos.z);
        
        // Get cells
        const startCell = this.getCell(startGrid.x, startGrid.z);
        const endCell = this.getCell(endGrid.x, endGrid.z);
        
        // If either start or end is invalid, return empty path
        if (!startCell || !endCell) {
            return [];
        }
        
        // If end cell is an obstacle, find nearest non-obstacle cell
        if (endCell.obstacle) {
            const alternativeEnd = this.findNearestNonObstacle(endGrid.x, endGrid.z);
            if (alternativeEnd) {
                endGrid.x = alternativeEnd.x;
                endGrid.z = alternativeEnd.z;
                endCell = this.getCell(endGrid.x, endGrid.z);
            } else {
                return []; // No viable path
            }
        }
        
        // A* pathfinding algorithm
        const openSet = [startCell];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        // g score: cost from start to current node
        // f score: g score + heuristic (estimated cost to end)
        const gScore = new Map();
        const fScore = new Map();
        
        // Initialize scores
        gScore.set(this.cellKey(startCell), 0);
        fScore.set(this.cellKey(startCell), this.heuristic(startCell, endCell));
        
        while (openSet.length > 0) {
            // Find node with lowest f score
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(this.cellKey(openSet[i])) < fScore.get(this.cellKey(openSet[currentIndex]))) {
                    currentIndex = i;
                }
            }
            
            const current = openSet[currentIndex];
            
            // If we've reached the end, reconstruct and return the path
            if (current.x === endCell.x && current.z === endCell.z) {
                return this.reconstructPath(cameFrom, current);
            }
            
            // Remove current from open set and add to closed set
            openSet.splice(currentIndex, 1);
            closedSet.add(this.cellKey(current));
            
            // Check neighbors
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                // Skip if already evaluated or is an obstacle
                if (closedSet.has(this.cellKey(neighbor)) || neighbor.obstacle) {
                    continue;
                }
                
                // Calculate tentative g score
                const tentativeGScore = gScore.get(this.cellKey(current)) + 1;
                
                // Add to open set if not there
                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(this.cellKey(neighbor))) {
                    // This path is not better than the existing one
                    continue;
                }
                
                // This path is the best so far, record it
                cameFrom.set(this.cellKey(neighbor), current);
                gScore.set(this.cellKey(neighbor), tentativeGScore);
                fScore.set(this.cellKey(neighbor), tentativeGScore + this.heuristic(neighbor, endCell));
            }
        }
        
        // No path found
        return [];
    }
    
    // Reconstruct path from A* result
    reconstructPath(cameFrom, current) {
        const path = [this.gridToWorld(current.x, current.z)];
        
        while (cameFrom.has(this.cellKey(current))) {
            current = cameFrom.get(this.cellKey(current));
            path.unshift(this.gridToWorld(current.x, current.z));
        }
        
        return path;
    }
    
    // Get neighboring cells
    getNeighbors(cell) {
        const neighbors = [];
        
        // Check 8 directions (including diagonals)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dz === 0) continue; // Skip self
                
                const x = cell.x + dx;
                const z = cell.z + dz;
                const neighbor = this.getCell(x, z);
                
                if (neighbor) {
                    neighbors.push(neighbor);
                }
            }
        }
        
        return neighbors;
    }
    
    // Heuristic for A* (Manhattan distance)
    heuristic(cellA, cellB) {
        return Math.abs(cellA.x - cellB.x) + Math.abs(cellA.z - cellB.z);
    }
    
    // Create unique key for a cell
    cellKey(cell) {
        return `${cell.x},${cell.z}`;
    }
    
    // Find nearest non-obstacle cell
    findNearestNonObstacle(x, z, maxRadius = 5) {
        // Search in expanding circles
        for (let radius = 1; radius <= maxRadius; radius++) {
            // Check cells in the current radius
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    // Only check cells on the perimeter of the circle
                    if (Math.abs(dx) === radius || Math.abs(dz) === radius) {
                        const cell = this.getCell(x + dx, z + dz);
                        if (cell && !cell.obstacle) {
                            return cell;
                        }
                    }
                }
            }
        }
        
        return null; // No non-obstacle cell found within max radius
    }
    
    // Visualize the path for debugging
    visualizePath(path, scene, color = 0x00ff00) {
        // Remove any existing path visualization
        scene.children.forEach(child => {
            if (child.userData && child.userData.isPathVisualization) {
                scene.remove(child);
            }
        });
        
        if (!path || path.length < 2) return;
        
        // Create points for line
        const points = path.map(p => new THREE.Vector3(p.x, 1, p.z));
        
        // Create line geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create line material
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 2
        });
        
        // Create line
        const line = new THREE.Line(geometry, material);
        line.userData.isPathVisualization = true;
        
        // Add to scene
        scene.add(line);
        
        // Create small markers at each path point
        for (const point of path) {
            const markerGeo = new THREE.SphereGeometry(1, 8, 8);
            const markerMat = new THREE.MeshBasicMaterial({ color: color });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            
            marker.position.set(point.x, 1, point.z);
            marker.userData.isPathVisualization = true;
            
            scene.add(marker);
        }
    }
}

export { CombatGrid };