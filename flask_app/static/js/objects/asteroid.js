import * as THREE from 'three';

// Asteroid class for combat field obstacles
class Asteroid {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            size: config.size || 'medium',    // small, medium, large
            position: config.position || { x: 0, y: 0, z: 0 },
            rotation: config.rotation || { x: 0, y: 0, z: 0 },
            rotationSpeed: config.rotationSpeed || { x: 0, y: 0, z: 0 },
            id: config.id || `asteroid_${Math.floor(Math.random() * 1000000)}`
        };
        
        // Create the 3D object
        this.object = this.createAsteroidObject();
        
        // Set initial position
        this.object.position.set(
            this.config.position.x,
            this.config.position.y,
            this.config.position.z
        );
        
        // Set initial rotation
        this.object.rotation.set(
            this.config.rotation.x,
            this.config.rotation.y,
            this.config.rotation.z
        );
        
        // Add user data for identification
        this.object.userData = {
            id: this.config.id,
            type: 'asteroid',
            size: this.config.size,
            isAsteroid: true,
            rotationSpeed: this.config.rotationSpeed,
            asteroidInstance: this // Reference to this instance for easier access
        };
        
        // Add this reference to the object
        this.object.asteroid = this;
    }
    
    // Create the 3D object based on the asteroid size
    createAsteroidObject() {
        // Determine size parameters
        let radius, detail, roughness;
        switch(this.config.size) {
            case 'small':
                radius = 5 + Math.random() * 2;
                detail = 1;
                roughness = 0.4;
                break;
            case 'medium':
                radius = 10 + Math.random() * 5;
                detail = 2;
                roughness = 0.5;
                break;
            case 'large':
                radius = 20 + Math.random() * 10;
                detail = 3;
                roughness = 0.6;
                break;
            default:
                radius = 10;
                detail = 2;
                roughness = 0.5;
        }
        
        // Create base geometry
        const geometry = new THREE.IcosahedronGeometry(radius, detail);
        
        // Create material
        const material = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        
        // Create mesh
        const asteroid = new THREE.Mesh(geometry, material);
        asteroid.castShadow = true;
        asteroid.receiveShadow = true;
        
        // Add randomness to vertex positions for roughness
        if (roughness > 0) {
            const positionAttribute = geometry.getAttribute('position');
            const vertex = new THREE.Vector3();
            
            for (let i = 0; i < positionAttribute.count; i++) {
                vertex.fromBufferAttribute(positionAttribute, i);
                
                // Add random offset to vertex
                vertex.x += (Math.random() - 0.5) * roughness * radius;
                vertex.y += (Math.random() - 0.5) * roughness * radius;
                vertex.z += (Math.random() - 0.5) * roughness * radius;
                
                positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
            }
            
            geometry.computeVertexNormals();
        }
        
        // Randomly set rotation speeds for tumbling effect
        this.config.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.001,
            y: (Math.random() - 0.5) * 0.001,
            z: (Math.random() - 0.5) * 0.001
        };
        
        return asteroid;
    }
    
    // Update method to be called each frame
    update(delta) {
        // Convert millisecond delta to seconds for easier calculations
        const deltaSeconds = delta / 1000;
        
        // Rotate asteroid
        const rotSpeed = this.config.rotationSpeed;
        this.object.rotation.x += rotSpeed.x * delta;
        this.object.rotation.y += rotSpeed.y * delta;
        this.object.rotation.z += rotSpeed.z * delta;
    }
}

// Asteroid field generator
class AsteroidField {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            count: config.count || 30,
            radius: config.radius || 250,
            centerPosition: config.centerPosition || new THREE.Vector3(0, 0, 0),
            heightRange: config.heightRange || { min: -10, max: 40 }
        };
        
        // Array to store asteroid instances
        this.asteroids = [];
    }
    
    // Generate asteroid field
    generate(scene) {
        // Clear any existing asteroids
        this.asteroids.forEach(asteroid => {
            if (asteroid.object.parent) {
                asteroid.object.parent.remove(asteroid.object);
            }
        });
        this.asteroids = [];
        
        // Create new asteroids
        for (let i = 0; i < this.config.count; i++) {
            // Determine random position within field
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.config.radius;
            const height = this.config.heightRange.min + 
                Math.random() * (this.config.heightRange.max - this.config.heightRange.min);
            
            const position = {
                x: this.config.centerPosition.x + Math.cos(angle) * distance,
                y: this.config.centerPosition.y + height,
                z: this.config.centerPosition.z + Math.sin(angle) * distance
            };
            
            // Determine random size
            const sizeRand = Math.random();
            let size;
            if (sizeRand < 0.6) {
                size = 'small';
            } else if (sizeRand < 0.9) {
                size = 'medium';
            } else {
                size = 'large';
            }
            
            // Create asteroid
            const asteroid = new Asteroid({
                size: size,
                position: position,
                rotation: {
                    x: Math.random() * Math.PI * 2,
                    y: Math.random() * Math.PI * 2,
                    z: Math.random() * Math.PI * 2
                }
            });
            
            // Add to scene and store reference
            scene.add(asteroid.object);
            this.asteroids.push(asteroid);
        }
        
        return this.asteroids;
    }
    
    // Update all asteroids
    update(delta) {
        this.asteroids.forEach(asteroid => {
            asteroid.update(delta);
        });
    }
}

export { Asteroid, AsteroidField };