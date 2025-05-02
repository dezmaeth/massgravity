import * as THREE from 'three';

// Ship class for combat mechanics
class Ship {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            type: config.type || 'fighter',      // fighter, capital, defense
            faction: config.faction || 'blue',   // blue, red, green
            position: config.position || { x: 0, y: 0, z: 0 },
            health: config.health || 0,
            maxHealth: config.maxHealth || 0,
            speed: config.speed || 0,
            attackPower: config.attackPower || 0,
            attackRange: config.attackRange || 0,
            isPlayerShip: config.isPlayerShip || false,
            id: config.id || `ship_${Math.floor(Math.random() * 1000000)}`
        };
        
        // Set type-specific properties
        this.setTypeProperties();
        
        // Create the 3D object
        this.object = this.createShipObject();
        
        // Set the initial position
        this.object.position.set(
            this.config.position.x,
            this.config.position.y,
            this.config.position.z
        );
        
        // Add user data for identification
        this.object.userData = {
            id: this.config.id,
            type: this.config.type,
            isPlayerShip: this.config.isPlayerShip,
            isOpponentShip: !this.config.isPlayerShip,
            isShip: true,
            faction: this.config.faction,
            health: this.config.health,
            maxHealth: this.config.maxHealth,
            speed: this.config.speed,
            attackPower: this.config.attackPower,
            attackRange: this.config.attackRange,
            shipInstance: this // Reference to this instance for easier access
        };
        
        // Movement properties
        this.isMoving = false;
        this.targetPosition = null;
        this.targetRotation = null;
        this.isPatrolling = false;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        
        // Combat properties
        this.attackTarget = null;
        this.attackCooldown = 0;
        this.isDestroyed = false;
        
        // Path finding 
        this.path = [];
        this.currentPathIndex = 0;
        
        // Add this reference to the object
        this.object.ship = this;
    }
    
    // Set properties based on ship type
    setTypeProperties() {
        switch(this.config.type) {
            case 'fighter':
                this.config.health = this.config.health || 2;
                this.config.maxHealth = this.config.maxHealth || 2;
                this.config.speed = this.config.speed || 0.8;
                this.config.attackPower = this.config.attackPower || 1;
                this.config.attackRange = this.config.attackRange || 30;
                break;
                
            case 'capital':
                this.config.health = this.config.health || 10;
                this.config.maxHealth = this.config.maxHealth || 10;
                this.config.speed = this.config.speed || 0.3;
                this.config.attackPower = this.config.attackPower || 3;
                this.config.attackRange = this.config.attackRange || 50;
                break;
                
            case 'defense':
                this.config.health = this.config.health || 5;
                this.config.maxHealth = this.config.maxHealth || 5;
                this.config.speed = this.config.speed || 0;  // Defense platforms don't move
                this.config.attackPower = this.config.attackPower || 2;
                this.config.attackRange = this.config.attackRange || 40;
                break;
        }
    }
    
    // Create the 3D object based on the ship type
    createShipObject() {
        // Get faction color
        const color = this.getFactionColor(this.config.faction);
        
        switch(this.config.type) {
            case 'fighter':
                return this.createFighterShip(color);
            case 'capital':
                return this.createCapitalShip(color);
            case 'defense':
                return this.createDefensePlatform(color);
            default:
                return this.createFighterShip(color);  // Default to fighter
        }
    }
    
    // Helper to create fighter ship visuals
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
        
        // Add health bar
        this.addHealthBar(fighter);
        
        return fighter;
    }
    
    // Helper to create capital ship visuals
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
        
        // Add health bar
        this.addHealthBar(capitalShip);
        
        return capitalShip;
    }
    
    // Helper to create defense platform visuals
    createDefensePlatform(color) {
        // Defense platform
        const baseGeo = new THREE.CylinderGeometry(8, 10, 3, 8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const platform = new THREE.Mesh(baseGeo, baseMat);
        platform.castShadow = true;
        platform.receiveShadow = true;
        
        // Add a turret on top
        const turretGeo = new THREE.SphereGeometry(5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const turretMat = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.2,
            emissive: color,
            emissiveIntensity: 0.5
        });
        
        const turret = new THREE.Mesh(turretGeo, turretMat);
        turret.position.y = 1.5;
        platform.add(turret);
        
        // Add gun barrels
        const barrelGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
        const barrelMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.9,
            roughness: 0.1
        });
        
        const barrel1 = new THREE.Mesh(barrelGeo, barrelMat);
        barrel1.position.set(0, 3, -2);
        barrel1.rotation.x = -Math.PI / 6;
        turret.add(barrel1);
        
        const barrel2 = new THREE.Mesh(barrelGeo, barrelMat);
        barrel2.position.set(0, 3, 2);
        barrel2.rotation.x = Math.PI / 6;
        turret.add(barrel2);
        
        // Add a position marker
        const markerGeo = new THREE.CircleGeometry(10, 24);
        const markerMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.y = -1.5;
        platform.add(marker);
        
        // Add selection indicator (ring that's hidden by default)
        const ringGeo = new THREE.TorusGeometry(10, 0.4, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.7,
            depthTest: false
        });
        
        const selectionRing = new THREE.Mesh(ringGeo, ringMat);
        selectionRing.rotation.x = Math.PI / 2;
        selectionRing.position.y = -1.5;
        selectionRing.visible = false;
        selectionRing.userData.isSelectionIndicator = true;
        platform.add(selectionRing);
        
        // Add health bar
        this.addHealthBar(platform);
        
        return platform;
    }
    
    // Add a health bar to the ship
    addHealthBar(shipObject) {
        // Create container to hold the health bar
        const healthBarContainer = new THREE.Object3D();
        
        // Background bar
        const bgGeo = new THREE.PlaneGeometry(8, 0.8);
        const bgMat = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.7,
            depthTest: false
        });
        const background = new THREE.Mesh(bgGeo, bgMat);
        
        // Foreground health bar
        const fgGeo = new THREE.PlaneGeometry(8, 0.8);
        const fgMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00, // Green for health
            transparent: true,
            opacity: 0.8,
            depthTest: false
        });
        const foreground = new THREE.Mesh(fgGeo, fgMat);
        foreground.userData.isHealthBar = true;
        
        // Position slightly in front of background
        foreground.position.z = 0.01;
        
        // Add to container
        healthBarContainer.add(background);
        healthBarContainer.add(foreground);
        
        // Position above the ship
        const shipHeight = shipObject.geometry.parameters.height || 5;
        healthBarContainer.position.y = shipHeight / 2 + 3;
        
        // Add to ship
        shipObject.add(healthBarContainer);
        
        // Store reference to update it
        this.healthBar = foreground;
        
        // Update scale based on current health
        this.updateHealthBar();
    }
    
    // Update the health bar scale
    updateHealthBar() {
        if (this.healthBar) {
            const healthPercent = this.object.userData.health / this.object.userData.maxHealth;
            this.healthBar.scale.x = Math.max(0.001, healthPercent); // Avoid scale of 0
            
            // Change color based on health
            if (healthPercent > 0.6) {
                this.healthBar.material.color.set(0x00ff00); // Green for high health
            } else if (healthPercent > 0.3) {
                this.healthBar.material.color.set(0xffff00); // Yellow for medium health
            } else {
                this.healthBar.material.color.set(0xff0000); // Red for low health
            }
        }
    }
    
    // Helper to get faction color
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
    
    // Show selection indicator
    showSelection() {
        this.object.children.forEach(child => {
            if (child.userData.isSelectionIndicator) {
                child.visible = true;
            }
        });
    }
    
    // Hide selection indicator
    hideSelection() {
        this.object.children.forEach(child => {
            if (child.userData.isSelectionIndicator) {
                child.visible = false;
            }
        });
    }
    
    // Basic movement - set target and start moving
    moveTo(targetPosition) {
        this.isMoving = true;
        this.targetPosition = targetPosition.clone();
        
        // Calculate direction facing target
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.object.position)
            .normalize();
        
        // Calculate rotation to face movement direction
        this.targetRotation = Math.atan2(direction.x, direction.z);
    }
    
    // Set a patrol path
    setPatrol(patrolPoints) {
        if (patrolPoints.length < 2) {
            console.warn('Patrol requires at least 2 points');
            return;
        }
        
        this.isPatrolling = true;
        this.patrolPoints = patrolPoints.map(p => p.clone());
        this.currentPatrolIndex = 0;
        
        // Start moving to the first patrol point
        this.moveTo(this.patrolPoints[0]);
    }
    
    // Set attack target
    setAttackTarget(target) {
        if (!target) return;
        
        this.attackTarget = target;
        
        // If the target is within range, stop moving and attack
        const distance = this.object.position.distanceTo(target.position);
        if (distance <= this.object.userData.attackRange) {
            this.isMoving = false;
            this.targetPosition = null;
        } else {
            // Move within attack range
            const direction = new THREE.Vector3()
                .subVectors(target.position, this.object.position)
                .normalize();
                
            // Calculate position just within attack range
            const attackPosition = target.position.clone().sub(
                direction.multiplyScalar(this.object.userData.attackRange * 0.8)
            );
            
            this.moveTo(attackPosition);
        }
    }
    
    // Attack handling
    attack(delta) {
        if (!this.attackTarget) return;
        
        // Check if target is destroyed
        if (this.attackTarget.userData.health <= 0) {
            this.attackTarget = null;
            return;
        }
        
        // Check attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
            return;
        }
        
        // Check if in range
        const distance = this.object.position.distanceTo(this.attackTarget.position);
        if (distance > this.object.userData.attackRange) {
            // Move closer to target
            this.setAttackTarget(this.attackTarget);
            return;
        }
        
        // Face the target
        this.faceTarget(this.attackTarget.position);
        
        // Fire weapon
        this.fireWeapon(this.attackTarget);
        
        // Reset cooldown (different cooldown based on ship type)
        switch(this.config.type) {
            case 'fighter':
                this.attackCooldown = 1000;  // 1 second cooldown
                break;
            case 'capital':
                this.attackCooldown = 2000;  // 2 second cooldown
                break;
            case 'defense':
                this.attackCooldown = 1500;  // 1.5 second cooldown
                break;
        }
    }
    
    // Make the ship face a target position
    faceTarget(targetPosition) {
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.object.position)
            .normalize();
            
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        // Apply rotation immediately
        const currentRotation = this.object.rotation.y;
        let angleDiff = this.targetRotation - currentRotation;
        
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply rotation with smooth damping
        this.object.rotation.y += angleDiff * 0.1;
    }
    
    // Create visual effect for weapon fire
    fireWeapon(target) {
        // Get ship's faction color for the laser
        let laserColor;
        switch (this.config.faction) {
            case 'blue':
                laserColor = 0x0088ff;
                break;
            case 'red':
                laserColor = 0xff3300;
                break;
            case 'green':
                laserColor = 0x00ff77;
                break;
            default:
                laserColor = 0xffff00;
        }
        
        // Get scene reference
        const scene = this.object.parent;
        if (!scene) return;
        
        // Create laser effect
        const laserGeometry = new THREE.BufferGeometry();
        
        // Adjust start position based on ship type for better visual
        let startPos = this.object.position.clone();
        if (this.config.type === 'fighter') {
            startPos.y += 1; // Slightly above the ship
        } else if (this.config.type === 'capital') {
            startPos.y += 3; // Higher for capital ships
        } else if (this.config.type === 'defense') {
            startPos.y += 5; // Above the turret
        }
        
        // End position at the target
        const endPos = target.position.clone();
        
        // Create points for the laser
        const points = [startPos, endPos];
        laserGeometry.setFromPoints(points);
        
        // Create material with the faction color
        const laserMaterial = new THREE.LineBasicMaterial({
            color: laserColor,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        
        // Create the laser beam
        const laser = new THREE.Line(laserGeometry, laserMaterial);
        scene.add(laser);
        
        // Remove after short duration
        setTimeout(() => {
            scene.remove(laser);
            laser.geometry.dispose();
            laser.material.dispose();
        }, 150);
        
        // Apply damage to target
        this.applyDamage(target, this.object.userData.attackPower);
    }
    
    // Apply damage to target
    applyDamage(target, damage) {
        // Reduce target health
        target.userData.health -= damage;
        
        // Update target health bar if it's a ship
        if (target.userData.shipInstance) {
            target.userData.shipInstance.updateHealthBar();
        }
        
        // Check if target is destroyed
        if (target.userData.health <= 0) {
            // Mark as destroyed
            target.userData.isDestroyed = true;
            
            // Create explosion effect
            this.createExplosionEffect(target);
        } else {
            // Create damage effect (red flash)
            const originalColor = target.material.color.getHex();
            target.material.color.set(0xff0000);
            
            // Return to original color after a short delay
            setTimeout(() => {
                target.material.color.setHex(originalColor);
            }, 200);
        }
    }
    
    // Create explosion effect
    createExplosionEffect(target) {
        // Get scene reference
        const scene = target.parent;
        if (!scene) return;
        
        // Create particle group for explosion
        const particleCount = 50;
        const particles = new THREE.Group();
        
        // Create particles
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
            particle.position.copy(target.position);
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
        
        scene.add(particles);
        
        // Animation timing
        let startTime = Date.now();
        const duration = 1000; // 1 second
        
        // Animation function
        const animateExplosion = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = elapsedTime / duration;
            
            if (progress >= 1) {
                // Remove particles when animation completes
                scene.remove(particles);
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
        
        // Start animation
        animateExplosion();
    }
    
    // Update method to be called each frame
    update(delta) {
        // Skip update if destroyed
        if (this.isDestroyed) return;
        
        // Convert millisecond delta to seconds for easier calculations
        const deltaSeconds = delta / 1000;
        
        // Handle movement
        if (this.isMoving && this.targetPosition) {
            // Calculate distance to target
            const distance = this.object.position.distanceTo(this.targetPosition);
            
            // If close enough to target, stop or move to next patrol point
            if (distance < 1) {
                if (this.isPatrolling) {
                    // Move to next patrol point
                    this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
                    this.moveTo(this.patrolPoints[this.currentPatrolIndex]);
                } else {
                    // Just stop
                    this.isMoving = false;
                    this.targetPosition = null;
                }
            } else {
                // Move towards target at ship's speed
                const moveSpeed = this.object.userData.speed * deltaSeconds * 60; // Scale by delta time
                const direction = new THREE.Vector3()
                    .subVectors(this.targetPosition, this.object.position)
                    .normalize();
                
                // Apply movement
                this.object.position.add(direction.multiplyScalar(moveSpeed));
                
                // Smoothly rotate ship to face movement direction
                if (this.targetRotation !== undefined) {
                    // Interpolate towards target rotation
                    const currentRotation = this.object.rotation.y;
                    let targetRotation = this.targetRotation;
                    
                    // Normalize angle difference
                    let angleDiff = targetRotation - currentRotation;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Apply rotation with smooth damping
                    this.object.rotation.y += angleDiff * 0.1;
                }
            }
        }
        
        // Handle combat
        if (this.attackTarget) {
            this.attack(delta);
        }
    }
}

export { Ship };