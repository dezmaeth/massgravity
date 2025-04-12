// CombatGame class to handle RTS gameplay
class CombatGame {
    constructor(data) {
        console.log('CombatGame constructor called with data:', data);
        this.data = data;
        this.ships = [];
        this.opponentShips = [];
        this.selectedShips = [];
        this.isAttackMode = false;
        
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
        this.initNetworkHandlers();
        
        console.log('Combat initialization complete');
        console.log('Ships created:', this.ships.length, 'player ships,', this.opponentShips.length, 'opponent ships');
        console.log('Camera position:', this.camera.position);
        
        // Set up clock for animations
        this.clock = new THREE.Clock();
        
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
        console.log("Initializing controls...");
        console.log("OrbitControls available:", typeof THREE.OrbitControls);
        console.log("TrackballControls available:", typeof THREE.TrackballControls);
        
        // Try different control types in order of preference
        try {
            // First try OrbitControls
            if (typeof THREE.OrbitControls === 'function') {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.1;
                this.controls.rotateSpeed = 0.7;
                this.controls.zoomSpeed = 1.2;
                this.controls.maxPolarAngle = Math.PI / 2.1;
                this.controls.minDistance = 50;
                this.controls.maxDistance = 500;
                
                console.log("OrbitControls initialized successfully");
                return;
            }
            
            // Try TrackballControls if OrbitControls isn't available
            if (typeof THREE.TrackballControls === 'function') {
                this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
                this.controls.rotateSpeed = 1.0;
                this.controls.zoomSpeed = 1.2;
                this.controls.panSpeed = 0.8;
                this.controls.noZoom = false;
                this.controls.noPan = false;
                
                console.log("TrackballControls initialized successfully");
                return;
            }
            
            // Simple manual camera controls if no control libraries work
            console.warn("No control libraries available, using basic controls");
            this.setupBasicControls();
            
        } catch(e) {
            console.error("Error initializing controls:", e);
            
            // Fallback to simple manual camera controls
            console.warn("Error initializing controls, using basic controls");
            this.setupBasicControls();
        }
    }
    
    setupBasicControls() {
        // Create a minimal control object with just an update method
        this.controls = {
            update: function() {}
        };
        
        // Add keyboard controls as a simple fallback
        document.addEventListener('keydown', (event) => {
            // Simple keyboard camera controls
            switch(event.key) {
                case 'ArrowUp': // Move camera up
                    this.camera.position.y += 10;
                    break;
                case 'ArrowDown': // Move camera down
                    this.camera.position.y -= 10;
                    break;
                case 'ArrowLeft': // Rotate camera left
                    this.camera.position.x -= 10;
                    break;
                case 'ArrowRight': // Rotate camera right
                    this.camera.position.x += 10;
                    break;
                case '+': // Zoom in
                case '=':
                    this.camera.position.z -= 10;
                    break;
                case '-': // Zoom out
                    this.camera.position.z += 10;
                    break;
            }
            
            // Make sure camera is looking at center
            this.camera.lookAt(0, 0, 0);
        });
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
        const playerFaction = window.USER_INFO.faction;
        const factionColor = this.getFactionColor(playerFaction);
        
        console.log(`Player faction: ${playerFaction}, color: ${factionColor.toString(16)}`);
        
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
            
            // Create a unique ID that includes the user's ID to prevent confusion between players
            fighter.userData.id = `player_${window.USER_INFO.id}_fighter_${i}`;
            fighter.userData.type = 'fighter';
            fighter.userData.isPlayerShip = true;
            fighter.userData.ownerId = window.USER_INFO.id;
            fighter.userData.faction = playerFaction;
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
            
            // Create a unique ID that includes the user's ID to prevent confusion
            capitalShip.userData.id = `player_${window.USER_INFO.id}_capital_${i}`;
            capitalShip.userData.type = 'capital';
            capitalShip.userData.isPlayerShip = true;
            capitalShip.userData.ownerId = window.USER_INFO.id;
            capitalShip.userData.faction = playerFaction;
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
        
        // Get opponent faction color based on their faction
        const opponentFaction = this.data.opponent_faction || 'red';
        const factionColor = this.getFactionColor(opponentFaction);
        
        console.log(`Opponent faction: ${opponentFaction}, color: ${factionColor.toString(16)}`);
        
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
            
            // Create a unique ID that includes the opponent's ID to prevent confusion
            fighter.userData.id = `player_${this.data.opponent_id}_fighter_${i}`;
            fighter.userData.type = 'fighter';
            fighter.userData.isOpponentShip = true;
            fighter.userData.ownerId = this.data.opponent_id;
            fighter.userData.faction = opponentFaction;
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
            
            // Create a unique ID that includes the opponent's ID to prevent confusion
            capitalShip.userData.id = `player_${this.data.opponent_id}_capital_${i}`;
            capitalShip.userData.type = 'capital';
            capitalShip.userData.isOpponentShip = true;
            capitalShip.userData.ownerId = this.data.opponent_id;
            capitalShip.userData.faction = opponentFaction;
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
        
        // Create a lighter version of the faction color for engine glow
        const engineColor = new THREE.Color(color);
        engineColor.lerp(new THREE.Color(0xffffff), 0.5); // Mix with white
        
        // Add engines glow (small cylinder at the back)
        const engineGeo = new THREE.CylinderGeometry(0.7, 0.5, 1, 8);
        const engineMat = new THREE.MeshBasicMaterial({
            color: engineColor.getHex(),
            transparent: true,
            opacity: 0.7
        });
        
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.set(-3, 0, 0); // Position at back of ship
        engine.rotation.z = Math.PI / 2;
        fighter.add(engine);
        
        // Add selection indicator (ring that's hidden by default)
        // Use faction color with yellow tint for selection ring
        const selectionColor = new THREE.Color(color);
        selectionColor.lerp(new THREE.Color(0xffff00), 0.6); // Mix with yellow
        
        const ringGeo = new THREE.TorusGeometry(5, 0.3, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: selectionColor.getHex(),
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
        
        // Create a lighter version of the faction color for engine glow
        const engineColor = new THREE.Color(color);
        engineColor.lerp(new THREE.Color(0xffffff), 0.5); // Mix with white
        
        // Add engines glow (two cylinders at the back)
        const engineGeo = new THREE.CylinderGeometry(1.2, 1, 1.5, 8);
        const engineMat = new THREE.MeshBasicMaterial({
            color: engineColor.getHex(),
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
        
        // Add a bridge on top - slightly tinted with faction color
        const bridgeColor = new THREE.Color(0x444444);
        bridgeColor.lerp(new THREE.Color(color), 0.2); // Mix with faction color slightly
        
        const bridgeGeo = new THREE.BoxGeometry(5, 2, 6);
        const bridgeMat = new THREE.MeshStandardMaterial({
            color: bridgeColor.getHex(),
            metalness: 0.5,
            roughness: 0.5
        });
        
        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.set(5, 3.5, 0); // Position at the front top
        capitalShip.add(bridge);
        
        // Add selection indicator (ring that's hidden by default)
        // Use faction color with yellow tint for selection ring
        const selectionColor = new THREE.Color(color);
        selectionColor.lerp(new THREE.Color(0xffff00), 0.6); // Mix with yellow
        
        const ringGeo = new THREE.TorusGeometry(12, 0.4, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: selectionColor.getHex(),
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
        // Enhanced faction colors with more vibrant, distinct hues
        switch (faction) {
            case 'blue':
                return 0x007fff; // Brighter blue
            case 'red':
                return 0xff3030; // Brighter red
            case 'green':
                return 0x00cc44; // Brighter green
            case 'yellow':
                return 0xffcc00; // Gold
            case 'purple':
                return 0x9933ff; // Purple
            case 'orange':
                return 0xff8800; // Orange
            case 'teal':
                return 0x00cccc; // Teal
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
        
        // UI button handlers
        const selectAllButton = document.getElementById('select-all');
        if (selectAllButton) {
            selectAllButton.addEventListener('click', () => {
                this.selectAllShips();
            });
        }
        
        const attackModeButton = document.getElementById('attack-mode');
        if (attackModeButton) {
            attackModeButton.addEventListener('click', () => {
                this.setAttackMode(true);
            });
        }
        
        const patrolModeButton = document.getElementById('patrol-mode');
        if (patrolModeButton) {
            patrolModeButton.addEventListener('click', () => {
                this.setPatrolMode(true);
            });
        }
        
        const retreatButton = document.getElementById('retreat');
        if (retreatButton) {
            retreatButton.addEventListener('click', () => {
                this.retreat();
            });
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Mouse event handlers for ship selection and movement
    onMouseDown(event) {
        // Prevent default behavior
        event.preventDefault();
        
        // Update mouse coordinates normalized (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        
        // Update picking ray
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Determine what was clicked
        let intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Skip ray result if in attack mode (handled separately)
        if (this.isAttackMode) {
            return;
        }
        
        // Check if a ship is clicked
        if (intersects.length > 0) {
            // Find the top-level object (ship)
            let selectedObject = this.getShipFromRaycastResult(intersects);
            
            if (selectedObject) {
                console.log('Ship clicked:', selectedObject.userData.id);
                
                // Only select our own ships
                if (selectedObject.userData.isPlayerShip && selectedObject.userData.ownerId === window.USER_INFO.id) {
                    // Check if we're adding to selection with Shift key
                    if (event.shiftKey) {
                        // Add to selection if not already selected
                        if (!this.selectedShips.includes(selectedObject)) {
                            this.selectedShips.push(selectedObject);
                            this.toggleShipSelection(selectedObject, true);
                        }
                    } else {
                        // Clear previous selection
                        this.clearAllSelections();
                        
                        // Select this ship
                        this.selectedShips = [selectedObject];
                        this.toggleShipSelection(selectedObject, true);
                    }
                    return;
                }
            }
            
            // Check if clicked on the ground (for movement)
            const groundClick = intersects.find(result => result.object.userData.isGround);
            if (groundClick && this.selectedShips.length > 0) {
                // Move selected ships to this position
                const targetPosition = groundClick.point;
                this.moveSelectedShipsTo(targetPosition);
                return;
            }
        }
        
        // If we clicked on nothing or on an opponent's ship, clear selection
        if (!event.shiftKey) {
            this.clearAllSelections();
        }
    }
    
    onMouseUp(event) {
        // Nothing special to do on mouse up for now
    }
    
    // Helper to get ship from raycast result (might be a child object)
    getShipFromRaycastResult(intersects) {
        for (let i = 0; i < intersects.length; i++) {
            let object = intersects[i].object;
            
            // Traverse up to find the ship
            while (object.parent && object.parent !== this.scene) {
                object = object.parent;
                
                // If this is a ship (has userData.id and type)
                if (object.userData && object.userData.id && 
                    (object.userData.isPlayerShip || object.userData.isOpponentShip)) {
                    return object;
                }
            }
            
            // Check if the object itself is a ship
            if (object.userData && object.userData.id && 
                (object.userData.isPlayerShip || object.userData.isOpponentShip)) {
                return object;
            }
        }
        return null;
    }
    
    // Select all ships
    selectAllShips() {
        console.log("Selecting all player ships");
        
        // Clear previous selection
        this.clearAllSelections();
        
        // Select all player ships
        this.selectedShips = this.ships.filter(ship => 
            ship.userData.isPlayerShip && 
            ship.userData.ownerId === window.USER_INFO.id
        );
        
        // Update visuals
        this.selectedShips.forEach(ship => {
            this.toggleShipSelection(ship, true);
        });
    }
    
    // Toggle ship selection visual
    toggleShipSelection(ship, isSelected) {
        // Find the selection indicator (ring)
        const selectionIndicator = ship.children.find(child => 
            child.userData && child.userData.isSelectionIndicator
        );
        
        if (selectionIndicator) {
            selectionIndicator.visible = isSelected;
        }
    }
    
    // Clear all ship selections
    clearAllSelections() {
        // Hide selection indicator on all ships
        this.selectedShips.forEach(ship => {
            this.toggleShipSelection(ship, false);
        });
        
        // Clear selection array
        this.selectedShips = [];
    }
    
    // Move selected ships to target position
    moveSelectedShipsTo(targetPosition) {
        if (this.selectedShips.length === 0) return;
        
        console.log(`Moving ${this.selectedShips.length} ships to:`, targetPosition);
        
        // Calculate formation positions
        const positions = this.calculateFormationPositions(targetPosition, this.selectedShips.length);
        
        // Set each ship's target position
        this.selectedShips.forEach((ship, index) => {
            const position = positions[index];
            
            // Update ship data
            ship.userData.isMoving = true;
            ship.userData.targetPosition = position;
            ship.userData.startPosition = ship.position.clone();
            ship.userData.moveStartTime = Date.now();
            ship.userData.moveDistance = ship.position.distanceTo(position);
            ship.userData.moveDuration = (ship.userData.moveDistance / ship.userData.speed) * 100; // ms
            
            // Create visual indicator for destination
            this.createMoveIndicator(position, ship.userData.id);
            
            // Send move command to server to sync with opponent
            this.socket.emit('ship_move', {
                battle_room: this.battleRoom,
                ship_id: ship.userData.id,
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                }
            });
        });
        
        // Make ships animated during movement
        this.updateMovingShips();
    }
    
    // Calculate positions for ships in formation
    calculateFormationPositions(center, count) {
        const positions = [];
        const spacing = 20; // Space between ships
        
        // Maximum ships per row based on count
        let shipsPerRow;
        if (count <= 3) shipsPerRow = count;
        else if (count <= 8) shipsPerRow = 3;
        else shipsPerRow = 4;
        
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / shipsPerRow);
            const col = i % shipsPerRow;
            const rowWidth = Math.min(count - row * shipsPerRow, shipsPerRow);
            
            // Center each row
            const rowOffset = ((rowWidth - 1) * spacing) / 2;
            
            const x = center.x + (col * spacing) - rowOffset;
            const z = center.z + (row * spacing);
            
            positions.push(new THREE.Vector3(x, center.y, z));
        }
        
        return positions;
    }
    
    // Create visual indicator for movement destination
    createMoveIndicator(position, shipId) {
        // Check if indicator already exists and remove it
        this.scene.children.forEach(obj => {
            if (obj.userData && obj.userData.isMoveIndicator && obj.userData.forShip === shipId) {
                this.scene.remove(obj);
            }
        });
        
        // Create a circle to mark the destination
        const geometry = new THREE.RingGeometry(3, 4, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        
        const indicator = new THREE.Mesh(geometry, material);
        indicator.position.set(position.x, 0.1, position.z); // Just above ground
        indicator.rotation.x = -Math.PI / 2; // Flat on ground
        
        // Add animation data
        indicator.userData = {
            isMoveIndicator: true,
            forShip: shipId,
            createdAt: Date.now(),
            lifetime: 2000 // ms before fading out
        };
        
        this.scene.add(indicator);
    }
    
    // Update moving ships during animation
    updateMovingShips() {
        const now = Date.now();
        
        // For each ship with a movement target
        [...this.ships, ...this.opponentShips].forEach(ship => {
            if (ship.userData.isMoving && ship.userData.targetPosition) {
                const elapsed = now - ship.userData.moveStartTime;
                const progress = Math.min(elapsed / ship.userData.moveDuration, 1);
                
                if (progress < 1) {
                    // Calculate interpolated position
                    const newX = ship.userData.startPosition.x + 
                        (ship.userData.targetPosition.x - ship.userData.startPosition.x) * progress;
                    const newZ = ship.userData.startPosition.z + 
                        (ship.userData.targetPosition.z - ship.userData.startPosition.z) * progress;
                    
                    // Update position
                    ship.position.x = newX;
                    ship.position.z = newZ;
                    
                    // Calculate rotation to face movement direction
                    if (ship.userData.startPosition.distanceTo(ship.userData.targetPosition) > 1) {
                        const angle = Math.atan2(
                            ship.userData.targetPosition.x - ship.userData.startPosition.x,
                            ship.userData.targetPosition.z - ship.userData.startPosition.z
                        );
                        ship.rotation.y = angle;
                    }
                } else {
                    // Movement complete
                    ship.position.x = ship.userData.targetPosition.x;
                    ship.position.z = ship.userData.targetPosition.z;
                    ship.userData.isMoving = false;
                    ship.userData.targetPosition = null;
                }
            }
        });
        
        // Handle movement indicators
        this.scene.children.forEach(obj => {
            if (obj.userData && obj.userData.isMoveIndicator) {
                const age = now - obj.userData.createdAt;
                if (age > obj.userData.lifetime) {
                    // Remove old indicators
                    this.scene.remove(obj);
                } else if (age > obj.userData.lifetime / 2) {
                    // Fade out
                    const opacity = 0.5 * (1 - (age - obj.userData.lifetime/2) / (obj.userData.lifetime/2));
                    obj.material.opacity = opacity;
                }
            }
        });
    }
    
    // Handle attack mode
    setAttackMode(enabled) {
        this.isAttackMode = enabled;
        
        // Toggle UI button
        const attackButton = document.getElementById('attack-mode');
        if (attackButton) {
            if (enabled) {
                attackButton.classList.add('active');
            } else {
                attackButton.classList.remove('active');
            }
        }
        
        console.log(`Attack mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // Handle patrol mode
    setPatrolMode(enabled) {
        // Toggle UI button
        const patrolButton = document.getElementById('patrol-mode');
        if (patrolButton) {
            if (enabled) {
                patrolButton.classList.add('active');
            } else {
                patrolButton.classList.remove('active');
            }
        }
        
        // Not fully implemented yet
        console.log(`Patrol mode ${enabled ? 'enabled' : 'disabled'} - Feature in development`);
    }
    
    // Handle retreat command
    retreat() {
        if (this.selectedShips.length === 0) {
            // If no selection, select all first
            this.selectAllShips();
        }
        
        // Move all selected ships back to starting position
        const targetPosition = new THREE.Vector3(-150, 10, 0);
        this.moveSelectedShipsTo(targetPosition);
        
        console.log("Retreat command issued");
    }
    
    // Ship count updates
    updateShipCounts() {
        // Count ship types
        const fighters = this.ships.filter(ship => ship.userData.type === 'fighter').length;
        const capitals = this.ships.filter(ship => ship.userData.type === 'capital').length;
        
        // Update UI
        const fightersElement = document.getElementById('fighters-value');
        const capitalsElement = document.getElementById('capital-ships-value');
        
        if (fightersElement) fightersElement.textContent = fighters;
        if (capitalsElement) capitalsElement.textContent = capitals;
    }
    
    // Main render loop
    render() {
        requestAnimationFrame(this.render.bind(this));
        
        // Update controls if available
        if (this.controls && typeof this.controls.update === 'function') {
            this.controls.update();
        }
        
        // Get delta time for animations
        const delta = this.clock.getDelta() * 1000;
        
        // Update ship movements
        this.updateMovingShips();
        
        // Simple ship rotation animation for idle ships (no rotation for moving ships)
        [...this.ships, ...this.opponentShips].forEach(ship => {
            if (!ship.userData.isMoving) {
                ship.rotation.y += 0.001;
            }
        });
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    // Initialize network event handlers for combat
    initNetworkHandlers() {
        console.log("Setting up network event handlers for combat");
        
        // Listen for opponent ship movements
        this.socket.on('opponent_move', (data) => {
            this.handleOpponentMove(data);
        });
        
        // Listen for opponent ship attacks (not implemented yet)
        this.socket.on('opponent_attack', (data) => {
            console.log('Opponent attack received:', data);
            // TODO: Implement attack handling
        });
    }
    
    // Handle opponent ship movement events
    handleOpponentMove(data) {
        console.log('Opponent move received:', data);
        
        // CRITICAL FIX: Check if the message is about our own ships, in which case ignore it
        // Parse the ship ID to extract the user ID - "player_USERID_TYPE_INDEX"
        const idParts = data.ship_id.split('_');
        if (idParts.length >= 2) {
            const shipUserId = idParts[1];
            
            // If this is a message about our own ship movement, ignore it
            // This prevents duplicate handling of our own ships
            if (shipUserId === window.USER_INFO.id.toString()) {
                console.log('Ignoring movement of our own ship:', data.ship_id);
                return;
            }
        }
        
        // Find the ship by ID
        const ship = this.opponentShips.find(s => s.userData.id === data.ship_id);
        
        if (ship) {
            console.log(`Found opponent ship to move: ${data.ship_id}`);
            
            // Convert position data to Vector3
            const position = new THREE.Vector3(
                data.position.x,
                data.position.y,
                data.position.z
            );
            
            // Set ship movement data
            ship.userData.isMoving = true;
            ship.userData.targetPosition = position;
            ship.userData.startPosition = ship.position.clone();
            ship.userData.moveStartTime = Date.now();
            ship.userData.moveDistance = ship.position.distanceTo(position);
            ship.userData.moveDuration = (ship.userData.moveDistance / ship.userData.speed) * 100; // ms
            
            // Create visual indicator for destination
            this.createMoveIndicator(position, ship.userData.id);
        } else {
            console.warn(`Could not find opponent ship with ID: ${data.ship_id}`);
            console.log('Available opponent ships:', this.opponentShips.map(s => s.userData.id));
        }
    }
}

// Initialize the game when the page is loaded
window.initializeCombatGame = function(data) {
    console.log("Initializing combat game with data:", data);
    console.log("Checking THREE.js availability...");
    console.log("window.THREE:", typeof window.THREE);
    
    try {
        // Validate that THREE.js is available
        if (!window.THREE) {
            console.error("THREE.js not available during initialization");
            throw new Error("THREE.js not available");
        }
        
        console.log("THREE.js version:", window.THREE.REVISION);
        
        // Make sure DOM element exists
        const container = document.getElementById('combat-container');
        if (!container) {
            console.error("Combat container element not found");
            throw new Error("Combat container element not found");
        }
        
        // Create combat game instance
        window.combatGame = new CombatGame(data);
        return window.combatGame;
    } catch (error) {
        console.error("Error in initializeCombatGame:", error);
        alert("An error occurred initializing the combat game: " + error.message);
        return null;
    }
};