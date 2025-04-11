// CombatGame class to handle RTS gameplay
class CombatGame {
    constructor(data) {
        this.data = data;
        this.ships = [];
        this.opponentShips = [];
        this.selectedShips = [];
        this.isAttackMode = false;
        this.isPatrolMode = false;
        
        // Track mouse position for movement commands
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        
        // Connection to server
        this.socket = window.socket;
        
        // Store battle info
        this.battleRoom = data.battle_room;
        this.opponentId = data.opponent_id;
        
        // Start the game setup
        this.init();
    }
    
    init() {
        console.log('Initializing combat game components');
        // Initialize game components
        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initControls();
        this.initLights();
        this.initGridPlane();
        this.initShips();
        this.initEventListeners();
        
        console.log('Combat initialization complete');
        console.log('Ships created:', this.ships.length, 'player ships,', this.opponentShips.length, 'opponent ships');
        console.log('Camera position:', this.camera.position);
        
        // Start game loop
        this.render();
        
        // Update ship counts
        this.updateShipCounts();
    }
    
    initRenderer() {
        // Create renderer with anti-aliasing for smoother edges
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true  // Allow transparent background
        });
        
        // Set size to match container
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio); // For sharper rendering
        
        // Enable shadows for realistic lighting
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
        
        // Set background color - very dark blue for space
        this.renderer.setClearColor(0x000a1a, 1);
        
        // Add renderer to the DOM
        const container = document.getElementById('combat-container');
        container.innerHTML = ''; // Clear container if it has any content
        container.appendChild(this.renderer.domElement);
        
        console.log('Renderer initialized and added to DOM');
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        
        // Add fog for depth perception but less dense
        this.scene.fog = new THREE.FogExp2(0x0a0f18, 0.001);
        
        // Add a basic skybox
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x000810,
            side: THREE.BackSide // Render on inside faces
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
        
        // Add some distant stars as points
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: false
        });
        
        const starsVertices = [];
        for (let i = 0; i < 5000; i++) {
            const x = THREE.MathUtils.randFloatSpread(1000);
            const y = THREE.MathUtils.randFloatSpread(1000);
            const z = THREE.MathUtils.randFloatSpread(1000);
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
        
        console.log('Scene initialized with skybox and stars');
    }
    
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45, 
            window.innerWidth / window.innerHeight, 
            1, 
            10000
        );
        
        // Set initial camera position - higher for a strategic view, but closer
        this.camera.position.set(0, 150, 200);
        this.camera.lookAt(0, 0, 0);
        console.log('Camera initialized:', this.camera.position);
    }
    
    initControls() {
        // Use global THREE.OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.rotateSpeed = 0.7;
        this.controls.zoomSpeed = 1.2;
        this.controls.maxPolarAngle = Math.PI / 2.1; // Prevent going below the grid
        this.controls.minDistance = 50;
        this.controls.maxDistance = 500;
    }
    
    initLights() {
        // Main directional light (like sun)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);  // Brighter
        mainLight.position.set(100, 200, 100);
        mainLight.castShadow = true;
        
        // Configure shadow properties
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 500;
        mainLight.shadow.camera.left = -200;
        mainLight.shadow.camera.right = 200;
        mainLight.shadow.camera.top = 200;
        mainLight.shadow.camera.bottom = -200;
        
        this.scene.add(mainLight);
        
        // Ambient light (to prevent total darkness in shadows)
        const ambientLight = new THREE.AmbientLight(0x333366, 0.5);  // Brighter blue ambient
        this.scene.add(ambientLight);
        
        // Hemisphere light for better color variation (sky/ground)
        const hemisphereLight = new THREE.HemisphereLight(0xbbddff, 0x102040, 0.7);  // Brighter
        this.scene.add(hemisphereLight);
        
        // Add a rim light to help silhouette the ships
        const rimLight = new THREE.DirectionalLight(0x0088ff, 0.8);
        rimLight.position.set(-100, 50, -100);
        this.scene.add(rimLight);
        
        console.log('Lights initialized');
    }
    
    initGridPlane() {
        // Create a grid for the battle arena - smaller size for better visibility
        const gridSize = 600;
        const gridDivisions = 60;
        const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x00aaff, 0x003366);
        grid.position.y = 0.1; // Slight elevation to avoid z-fighting
        this.scene.add(grid);
        console.log('Grid added to scene');
        
        // Add a translucent plane for shadow casting
        const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0x001a66,
            transparent: true,
            opacity: 0.4,  // More opacity for better visibility
            roughness: 0.7,
            metalness: 0.3
        });
        
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        plane.userData.isGround = true;
        this.scene.add(plane);
        console.log('Ground plane added to scene');
        
        // Add outer boundary markers for the arena
        const boundaryGeo = new THREE.BoxGeometry(gridSize, 2, 2);
        const boundaryMat = new THREE.MeshLambertMaterial({ 
            color: 0x0088ff,
            emissive: 0x003366
        });
        
        const boundaries = [];
        
        // North boundary
        const northBoundary = new THREE.Mesh(boundaryGeo, boundaryMat);
        northBoundary.position.set(0, 1, -gridSize/2);
        boundaries.push(northBoundary);
        
        // South boundary
        const southBoundary = new THREE.Mesh(boundaryGeo, boundaryMat);
        southBoundary.position.set(0, 1, gridSize/2);
        boundaries.push(southBoundary);
        
        // East boundary
        const eastBoundary = new THREE.Mesh(boundaryGeo, boundaryMat);
        eastBoundary.rotation.y = Math.PI / 2;
        eastBoundary.position.set(gridSize/2, 1, 0);
        boundaries.push(eastBoundary);
        
        // West boundary
        const westBoundary = new THREE.Mesh(boundaryGeo, boundaryMat);
        westBoundary.rotation.y = Math.PI / 2;
        westBoundary.position.set(-gridSize/2, 1, 0);
        boundaries.push(westBoundary);
        
        boundaries.forEach(boundary => {
            this.scene.add(boundary);
        });
    }
    
    initShips() {
        // Create player ships and opponent ships
        this.createPlayerShips();
        this.createOpponentShips();
    }
    
    createPlayerShips() {
        // Get ship counts from data
        const fighters = this.data.ships?.fighters || 5; // Default to 5 if none
        const capitalShips = this.data.ships?.capital_ships || 1; // Default to 1 if none
        
        console.log(`Creating ${fighters} fighters and ${capitalShips} capital ships for player`);
        
        // Player faction color
        const factionColor = this.getFactionColor(window.USER_INFO.faction);
        
        // Create fighter ships in a formation
        for (let i = 0; i < fighters; i++) {
            const fighter = this.createFighterShip(factionColor);
            
            // Calculate position in a neat formation
            const row = Math.floor(i / 3);
            const col = i % 3;
            
            fighter.position.set(
                -150 - (col * 20), // Left side of the map in columns
                10, // Slight elevation
                -50 + (row * 20) // Formation rows
            );
            
            fighter.userData.id = `player_fighter_${i}`;
            fighter.userData.type = 'fighter';
            fighter.userData.isPlayerShip = true;
            fighter.userData.health = 2;
            fighter.userData.speed = 0.8;
            fighter.userData.attackPower = 1;
            fighter.userData.isMoving = false;
            fighter.userData.targetPosition = null;
            
            this.ships.push(fighter);
            this.scene.add(fighter);
            console.log(`Added player fighter at position:`, fighter.position);
        }
        
        // Create capital ships
        for (let i = 0; i < capitalShips; i++) {
            const capitalShip = this.createCapitalShip(factionColor);
            capitalShip.position.set(
                -200 - (i * 30), // Left side of the map, behind fighters
                20, // Higher elevation
                0 + (i * 30) // Staggered positioning
            );
            capitalShip.userData.id = `player_capital_${i}`;
            capitalShip.userData.type = 'capital';
            capitalShip.userData.isPlayerShip = true;
            capitalShip.userData.health = 10;
            capitalShip.userData.speed = 0.3;
            capitalShip.userData.attackPower = 3;
            capitalShip.userData.isMoving = false;
            capitalShip.userData.targetPosition = null;
            
            this.ships.push(capitalShip);
            this.scene.add(capitalShip);
            console.log(`Added player capital ship at position:`, capitalShip.position);
        }
    }
    
    createOpponentShips() {
        // Get ship counts from data
        const fighters = this.data.opponent_ships?.fighters || 5; // Default to 5 if none
        const capitalShips = this.data.opponent_ships?.capital_ships || 1; // Default to 1 if none
        
        console.log(`Creating ${fighters} fighters and ${capitalShips} capital ships for opponent`);
        
        // Opponent faction color
        const factionColor = this.getFactionColor(this.data.opponent_faction || 'red');
        
        // Create fighter ships in a formation
        for (let i = 0; i < fighters; i++) {
            const fighter = this.createFighterShip(factionColor);
            
            // Calculate position in a neat formation
            const row = Math.floor(i / 3);
            const col = i % 3;
            
            fighter.position.set(
                150 + (col * 20), // Right side of the map in columns
                10, // Slight elevation
                -50 + (row * 20) // Formation rows
            );
            
            // Rotate to face player's side
            fighter.rotation.y = Math.PI;
            
            fighter.userData.id = `opponent_fighter_${i}`;
            fighter.userData.type = 'fighter';
            fighter.userData.isOpponentShip = true;
            fighter.userData.health = 2;
            fighter.userData.speed = 0.8;
            fighter.userData.attackPower = 1;
            
            this.opponentShips.push(fighter);
            this.scene.add(fighter);
            console.log(`Added opponent fighter at position:`, fighter.position);
        }
        
        // Create capital ships
        for (let i = 0; i < capitalShips; i++) {
            const capitalShip = this.createCapitalShip(factionColor);
            capitalShip.position.set(
                200 + (i * 30), // Right side of the map, behind fighters
                20, // Higher elevation
                0 + (i * 30) // Staggered positioning
            );
            
            // Rotate to face player's side
            capitalShip.rotation.y = Math.PI;
            
            capitalShip.userData.id = `opponent_capital_${i}`;
            capitalShip.userData.type = 'capital';
            capitalShip.userData.isOpponentShip = true;
            capitalShip.userData.health = 10;
            capitalShip.userData.speed = 0.3;
            capitalShip.userData.attackPower = 3;
            
            this.opponentShips.push(capitalShip);
            this.scene.add(capitalShip);
            console.log(`Added opponent capital ship at position:`, capitalShip.position);
        }
    }
    
    createFighterShip(color) {
        // Simple fighter ship representation (cube for now, but more distinctive)
        const geometry = new THREE.BoxGeometry(8, 3, 8);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.2,
            emissive: color,
            emissiveIntensity: 0.5  // Brighter emissive for better visibility
        });
        
        const fighter = new THREE.Mesh(geometry, material);
        fighter.castShadow = true;
        fighter.receiveShadow = true;
        
        // Add a position marker below the ship
        const markerGeo = new THREE.CircleGeometry(4, 16);
        const markerMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.y = -2;
        fighter.add(marker);
        
        // Add engines glow (small cylinder at the back)
        const engineGeo = new THREE.CylinderGeometry(0.7, 0.5, 1, 8);
        const engineMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.set(-3, 0, 0); // Position at back of ship
        engine.rotation.z = Math.PI / 2;
        fighter.add(engine);
        
        // Add selection indicator (ring that's hidden by default)
        const ringGeo = new THREE.TorusGeometry(5, 0.3, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.7,
            depthTest: false
        });
        
        const selectionRing = new THREE.Mesh(ringGeo, ringMat);
        selectionRing.rotation.x = Math.PI / 2;
        selectionRing.position.y = -2;
        selectionRing.visible = false;
        selectionRing.userData.isSelectionIndicator = true;
        fighter.add(selectionRing);
        
        return fighter;
    }
    
    createCapitalShip(color) {
        // Larger capital ship (cuboid for now, but more distinctive)
        const geometry = new THREE.BoxGeometry(24, 6, 12);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.2,
            emissive: color,
            emissiveIntensity: 0.5  // Brighter emissive for better visibility
        });
        
        const capitalShip = new THREE.Mesh(geometry, material);
        capitalShip.castShadow = true;
        capitalShip.receiveShadow = true;
        
        // Add a position marker below the ship
        const markerGeo = new THREE.CircleGeometry(12, 24);
        const markerMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.y = -4;
        capitalShip.add(marker);
        
        // Add engines glow (two cylinders at the back)
        const engineGeo = new THREE.CylinderGeometry(1.2, 1, 1.5, 8);
        const engineMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        
        const engine1 = new THREE.Mesh(engineGeo, engineMat);
        engine1.position.set(-10, 0, -3); // Bottom engine
        engine1.rotation.z = Math.PI / 2;
        capitalShip.add(engine1);
        
        const engine2 = new THREE.Mesh(engineGeo, engineMat);
        engine2.position.set(-10, 0, 3); // Top engine
        engine2.rotation.z = Math.PI / 2;
        capitalShip.add(engine2);
        
        // Add a bridge on top
        const bridgeGeo = new THREE.BoxGeometry(5, 2, 6);
        const bridgeMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.5,
            roughness: 0.5
        });
        
        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.set(5, 3.5, 0); // Position at the front top
        capitalShip.add(bridge);
        
        // Add selection indicator (ring that's hidden by default)
        const ringGeo = new THREE.TorusGeometry(12, 0.4, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.7,
            depthTest: false
        });
        
        const selectionRing = new THREE.Mesh(ringGeo, ringMat);
        selectionRing.rotation.x = Math.PI / 2;
        selectionRing.position.y = -4;
        selectionRing.visible = false;
        selectionRing.userData.isSelectionIndicator = true;
        capitalShip.add(selectionRing);
        
        return capitalShip;
    }
    
    getFactionColor(faction) {
        switch (faction) {
            case 'blue':
                return 0x3498db;
            case 'red':
                return 0xe74c3c;
            case 'green':
                return 0x2ecc71;
            default:
                return 0xcccccc; // Default gray
        }
    }
    
    initEventListeners() {
        // Window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        // Mouse event handlers for ship selection and commands
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // MOUSE INTERACTION HANDLERS
    
    onMouseDown(event) {
        // Store starting position for potential drag selection
        this.mouseDownX = event.clientX;
        this.mouseDownY = event.clientY;
        this.isDragging = true;
        
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find intersected objects
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // If attack mode is enabled, handle attack commands
        if (this.isAttackMode && this.selectedShips.length > 0) {
            const targetShips = intersects.filter(intersect => {
                const object = this.getTopLevelParent(intersect.object);
                return object.userData.isOpponentShip;
            });
            
            if (targetShips.length > 0) {
                this.attackTarget(targetShips[0].object);
                return;
            }
        }
        
        // Check for shift key for multi-select
        const isMultiSelect = event.shiftKey;
        
        // Clear previous selection unless multi-select
        if (!isMultiSelect) {
            this.clearSelection();
        }
        
        // Check if clicked on a ship
        const shipObjects = intersects.filter(intersect => {
            const object = this.getTopLevelParent(intersect.object);
            return object.userData.isPlayerShip;
        });
        
        if (shipObjects.length > 0) {
            const selectedShip = this.getTopLevelParent(shipObjects[0].object);
            this.selectShip(selectedShip);
        }
    }
    
    onMouseUp(event) {
        // End of drag selection or single click
        this.isDragging = false;
        
        // If not in attack mode and not a short drag (which is treated as a click),
        // handle movement commands
        if (!this.isAttackMode && 
            this.selectedShips.length > 0 && 
            (Math.abs(event.clientX - this.mouseDownX) < 10 && 
             Math.abs(event.clientY - this.mouseDownY) < 10)) {
            
            // Calculate mouse position
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
            
            // Update the picking ray
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // Find intersection with the ground plane
            const intersects = this.raycaster.intersectObjects(this.scene.children);
            
            // Filter for the ground plane
            const groundIntersects = intersects.filter(intersect => 
                intersect.object.userData.isGround);
            
            if (groundIntersects.length > 0) {
                // Send movement command to selected ships
                this.moveShipsTo(groundIntersects[0].point);
            }
        }
    }
    
    onMouseMove(event) {
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }
    
    // SHIP SELECTION AND COMMAND METHODS
    
    selectShip(ship) {
        // Add to selection if not already selected
        if (!this.selectedShips.includes(ship)) {
            this.selectedShips.push(ship);
            
            // Show selection indicator
            ship.children.forEach(child => {
                if (child.userData.isSelectionIndicator) {
                    child.visible = true;
                }
            });
        }
    }
    
    deselectShip(ship) {
        // Remove from selection
        const index = this.selectedShips.indexOf(ship);
        if (index !== -1) {
            this.selectedShips.splice(index, 1);
            
            // Hide selection indicator
            ship.children.forEach(child => {
                if (child.userData.isSelectionIndicator) {
                    child.visible = false;
                }
            });
        }
    }
    
    clearSelection() {
        // Deselect all ships
        while (this.selectedShips.length) {
            this.deselectShip(this.selectedShips[0]);
        }
    }
    
    selectAllShips() {
        // First clear current selection
        this.clearSelection();
        
        // Then select all player ships
        this.ships.forEach(ship => {
            this.selectShip(ship);
        });
    }
    
    moveShipsTo(targetPosition) {
        // Calculate formation positions based on number of ships
        const formationPositions = this.calculateFormationPositions(
            targetPosition, 
            this.selectedShips.length
        );
        
        // Assign each ship a position in the formation
        this.selectedShips.forEach((ship, index) => {
            const formationPosition = formationPositions[index];
            
            // Set ship movement target
            ship.userData.isMoving = true;
            ship.userData.targetPosition = formationPosition;
            
            // Calculate direction facing target
            const direction = new THREE.Vector3()
                .subVectors(formationPosition, ship.position)
                .normalize();
            
            // Calculate rotation to face movement direction
            const targetRotation = Math.atan2(direction.x, direction.z);
            ship.userData.targetRotation = targetRotation;
            
            // Send move command to server for opponent to see
            this.socket.emit('ship_move', {
                battle_room: this.battleRoom,
                ship_id: ship.userData.id,
                position: {
                    x: formationPosition.x,
                    y: formationPosition.y,
                    z: formationPosition.z
                }
            });
        });
    }
    
    calculateFormationPositions(centerPosition, shipCount) {
        const positions = [];
        
        // Simple formation: place ships in a grid pattern
        const gridSize = Math.ceil(Math.sqrt(shipCount));
        const spacing = 15; // Space between ships
        
        // Calculate starting position for the grid
        const startX = centerPosition.x - (spacing * (gridSize - 1)) / 2;
        const startZ = centerPosition.z - (spacing * (gridSize - 1)) / 2;
        
        // Generate grid positions
        for (let i = 0; i < shipCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            positions.push(new THREE.Vector3(
                startX + col * spacing,
                centerPosition.y, // Keep same height
                startZ + row * spacing
            ));
        }
        
        return positions;
    }
    
    attackTarget(targetObject) {
        // Get the actual target ship (could be a child mesh)
        const targetShip = this.getTopLevelParent(targetObject);
        
        if (!targetShip.userData.isOpponentShip) return;
        
        // Command selected ships to attack the target
        this.selectedShips.forEach(ship => {
            // Set attack target
            ship.userData.attackTarget = targetShip;
            
            // Send attack command to server
            this.socket.emit('ship_attack', {
                battle_room: this.battleRoom,
                attacker_id: ship.userData.id,
                target_id: targetShip.userData.id,
                damage: ship.userData.attackPower
            });
        });
    }
    
    setAttackMode() {
        this.isAttackMode = true;
        this.isPatrolMode = false;
        
        // Visual feedback
        document.getElementById('attack-mode').style.backgroundColor = 'rgba(255, 100, 0, 0.8)';
        document.getElementById('patrol-mode').style.backgroundColor = 'rgba(0, 80, 160, 0.8)';
    }
    
    setPatrolMode() {
        this.isPatrolMode = true;
        this.isAttackMode = false;
        
        // Visual feedback
        document.getElementById('patrol-mode').style.backgroundColor = 'rgba(0, 255, 100, 0.8)';
        document.getElementById('attack-mode').style.backgroundColor = 'rgba(200, 60, 0, 0.8)';
    }
    
    retreat() {
        // Move all selected ships back to starting area
        const retreatPosition = new THREE.Vector3(-300, 10, 0);
        this.moveShipsTo(retreatPosition);
    }
    
    updateShipMovement(delta) {
        // Update position and rotation of ships that are moving
        this.ships.forEach(ship => {
            if (ship.userData.isMoving && ship.userData.targetPosition) {
                // Calculate distance to target
                const distance = ship.position.distanceTo(ship.userData.targetPosition);
                
                // If close enough to target, stop moving
                if (distance < 1) {
                    ship.userData.isMoving = false;
                    ship.userData.targetPosition = null;
                    return;
                }
                
                // Move towards target at ship's speed
                const moveSpeed = ship.userData.speed;
                const direction = new THREE.Vector3()
                    .subVectors(ship.userData.targetPosition, ship.position)
                    .normalize();
                
                // Apply movement
                ship.position.add(direction.multiplyScalar(moveSpeed));
                
                // Smoothly rotate ship to face movement direction
                if (ship.userData.targetRotation !== undefined) {
                    // Interpolate towards target rotation
                    const currentRotation = ship.rotation.y;
                    let targetRotation = ship.userData.targetRotation;
                    
                    // Normalize angle difference
                    let angleDiff = targetRotation - currentRotation;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Apply rotation with smooth damping
                    ship.rotation.y += angleDiff * 0.1;
                }
            }
        });
    }
    
    // Handler for opponent ship movements received from server
    handleOpponentMove(data) {
        // Find the opponent ship
        const opponentShip = this.opponentShips.find(ship => 
            ship.userData.id === data.ship_id);
        
        if (!opponentShip) return;
        
        // Set target position from received data
        const targetPosition = new THREE.Vector3(
            data.position.x,
            data.position.y,
            data.position.z
        );
        
        // Set movement parameters
        opponentShip.userData.isMoving = true;
        opponentShip.userData.targetPosition = targetPosition;
        
        // Calculate direction facing target
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, opponentShip.position)
            .normalize();
        
        // Calculate rotation to face movement direction
        const targetRotation = Math.atan2(direction.x, direction.z);
        opponentShip.userData.targetRotation = targetRotation;
    }
    
    // Handler for opponent ship attacks received from server
    handleOpponentAttack(data) {
        // Find the attacking ship and target ship
        const attackerShip = this.opponentShips.find(ship => 
            ship.userData.id === data.attacker_id);
            
        const targetShip = this.ships.find(ship => 
            ship.userData.id === data.target_id);
        
        if (!attackerShip || !targetShip) return;
        
        // Apply damage to target
        this.applyDamage(targetShip, data.damage);
        
        // Create visual effect for the attack
        this.createLaserEffect(attackerShip, targetShip);
    }
    
    // Helper method to create a laser beam attack effect
    createLaserEffect(source, target) {
        // Create a laser beam between the source and target
        const start = new THREE.Vector3().copy(source.position);
        const end = new THREE.Vector3().copy(target.position);
        
        // Create laser geometry
        const laserGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        
        // Create laser material
        const laserMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7,
            linewidth: 2
        });
        
        // Create the laser beam
        const laser = new THREE.Line(laserGeometry, laserMaterial);
        this.scene.add(laser);
        
        // Set timeout to remove the laser after a short duration
        setTimeout(() => {
            this.scene.remove(laser);
            laser.geometry.dispose();
            laser.material.dispose();
        }, 200);
    }
    
    // Method to apply damage to a ship
    applyDamage(ship, damage) {
        // Reduce ship health
        ship.userData.health -= damage;
        
        // Check if ship is destroyed
        if (ship.userData.health <= 0) {
            this.destroyShip(ship);
        } else {
            // Create damage effect (red flash)
            const originalColor = ship.material.color.getHex();
            ship.material.color.set(0xff0000);
            
            // Return to original color after a short delay
            setTimeout(() => {
                ship.material.color.setHex(originalColor);
            }, 300);
        }
    }
    
    // Method to destroy a ship
    destroyShip(ship) {
        // Create explosion effect
        this.createExplosionEffect(ship.position);
        
        // Remove from selection if selected
        this.deselectShip(ship);
        
        // Remove from ships array
        const shipIndex = this.ships.indexOf(ship);
        if (shipIndex !== -1) {
            this.ships.splice(shipIndex, 1);
        }
        
        const opponentShipIndex = this.opponentShips.indexOf(ship);
        if (opponentShipIndex !== -1) {
            this.opponentShips.splice(opponentShipIndex, 1);
        }
        
        // Remove from scene
        this.scene.remove(ship);
        
        // Update ship counts
        this.updateShipCounts();
        
        // Check win/lose conditions
        this.checkBattleEndConditions();
    }
    
    // Method to create explosion effect
    createExplosionEffect(position) {
        // Create particle explosion
        const particleCount = 50;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 0.8 + 0.2;
            const particleGeo = new THREE.SphereGeometry(size, 6, 6);
            const particleMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(
                    Math.random() * 0.2 + 0.8,  // Bright red
                    Math.random() * 0.5,        // Some orange
                    0
                ),
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeo, particleMat);
            
            // Random position around explosion center
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * 5;
            particle.position.y += (Math.random() - 0.5) * 5;
            particle.position.z += (Math.random() - 0.5) * 5;
            
            // Random velocity
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            
            // Add to particles group
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Animation function
        let startTime = Date.now();
        const duration = 1000; // 1 second
        
        const animateExplosion = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = elapsedTime / duration;
            
            if (progress >= 1) {
                // Remove particles when animation completes
                this.scene.remove(particles);
                particles.children.forEach(particle => {
                    particle.geometry.dispose();
                    particle.material.dispose();
                });
                return;
            }
            
            // Update particle positions and opacity
            particles.children.forEach(particle => {
                particle.position.add(particle.userData.velocity);
                particle.material.opacity = 1 - progress;
                particle.scale.multiplyScalar(0.98); // Shrink particles
            });
            
            requestAnimationFrame(animateExplosion);
        };
        
        animateExplosion();
    }
    
    // Method to update ship counts in the UI
    updateShipCounts() {
        // Count fighter and capital ships
        const playerFighters = this.ships.filter(ship => ship.userData.type === 'fighter').length;
        const playerCapitals = this.ships.filter(ship => ship.userData.type === 'capital').length;


        // Update UI
        document.getElementById('fighters-value').textContent = playerFighters;
        document.getElementById('capital-ships-value').textContent = playerCapitals;
    }
    
    // Method to check for battle end conditions
    checkBattleEndConditions() {
        if (this.ships.length === 0) {
            // Player lost all ships
            this.endBattle('opponent');
        } else if (this.opponentShips.length === 0) {
            // Opponent lost all ships
            this.endBattle('player');
        }
    }
    
    // Method to end the battle
    endBattle(winner) {
        // Send battle end notification to server
        this.socket.emit('end_battle', {
            battle_room: this.battleRoom,
            winner: winner === 'player' ? window.USER_INFO.id : this.opponentId,
            result: winner === 'player' ? 'victory' : 'defeat'
        });
        
        // Show end battle message
        const resultMessage = winner === 'player' ? 'Victory!' : 'Defeat!';
        const messageColor = winner === 'player' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
        
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
    
    // UTILITY METHODS
    
    // Helper method to get the top-level parent of a 3D object
    getTopLevelParent(object) {
        while (object.parent && !(object.userData.isPlayerShip || object.userData.isOpponentShip)) {
            object = object.parent;
        }
        return object;
    }
    
    // GAME LOOP
    
    render() {
        requestAnimationFrame(this.render.bind(this));
        
        // Update controls
        this.controls.update();
        
        // Update movement
        this.updateShipMovement();
        
        // Update opponent ship movement
        this.opponentShips.forEach(ship => {
            if (ship.userData.isMoving && ship.userData.targetPosition) {
                // Calculate distance to target
                const distance = ship.position.distanceTo(ship.userData.targetPosition);
                
                // If close enough to target, stop moving
                if (distance < 1) {
                    ship.userData.isMoving = false;
                    ship.userData.targetPosition = null;
                    return;
                }
                
                // Move towards target at ship's speed
                const moveSpeed = ship.userData.speed || 0.3;
                const direction = new THREE.Vector3()
                    .subVectors(ship.userData.targetPosition, ship.position)
                    .normalize();
                
                // Apply movement
                ship.position.add(direction.multiplyScalar(moveSpeed));
                
                // Smoothly rotate ship to face movement direction
                if (ship.userData.targetRotation !== undefined) {
                    // Interpolate towards target rotation
                    const currentRotation = ship.rotation.y;
                    let targetRotation = ship.userData.targetRotation;
                    
                    // Normalize angle difference
                    let angleDiff = targetRotation - currentRotation;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Apply rotation with smooth damping
                    ship.rotation.y += angleDiff * 0.1;
                }
            }
        });
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        // Only log on first few frames to avoid console spam
        if (!this._renderCount) {
            this._renderCount = 1;
            console.log('First render frame completed');
        } else if (this._renderCount < 5) {
            this._renderCount++;
            console.log(`Render frame ${this._renderCount} completed`);
        } else if (this._renderCount === 5) {
            console.log('Rendering ongoing...');
            this._renderCount++;
        }
    }
}

// Create global initialization function
window.initializeCombatGame = function(data) {
    console.log("Initializing combat game with data:", data);
    console.log("Window object:", typeof window);
    console.log("Document object:", typeof document);
    
    try {
        // Output ships info from data
        console.log("Player ships:", data.ships);
        console.log("Opponent ships:", data.opponent_ships);
        
        // Validate that THREE.js and OrbitControls are available
        if (!window.THREE) {
            console.error("THREE.js not available during initialization");
            throw new Error("THREE.js not available");
        }
        
        if (!window.THREE.OrbitControls) {
            console.error("THREE.OrbitControls not available during initialization");
            throw new Error("THREE.OrbitControls not available");
        }
        
        // Make sure DOM element exists
        const container = document.getElementById('combat-container');
        if (!container) {
            console.error("Combat container element not found");
            throw new Error("Combat container element not found");
        } else {
            console.log("Combat container found:", container);
            
            // Check if container has any children
            console.log("Container has children:", container.children.length);
            console.log("Container HTML:", container.innerHTML);
        }
        
        // Create a direct test renderer if needed
        if (window.TESTING_NEEDED && container.children.length === 0) {
            console.log("Creating direct test renderer");
            const testRenderer = new THREE.WebGLRenderer({ antialias: true });
            testRenderer.setSize(window.innerWidth, window.innerHeight);
            testRenderer.setClearColor(0x000066);
            container.appendChild(testRenderer.domElement);
            return null; // Stop initialization to preserve test renderer
        }
        
        window.combatGame = new CombatGame(data);
        return window.combatGame;
    } catch (error) {
        console.error("Error in initializeCombatGame:", error);
        alert("An error occurred initializing the combat game: " + error.message);
        return null;
    }
};