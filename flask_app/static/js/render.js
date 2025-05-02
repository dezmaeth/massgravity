import * as THREE from "three";
import {MassGravity} from "./game.js";

// Render class that extends MassGravity and handles rendering
class Render extends MassGravity {
    constructor() {
        super(); // Call parent constructor
        
        // The parent constructor will call initComponents, initScene, etc.
        // But we need to prevent it from calling render() in its Promise.then
        
        // Store a reference to this class globally
        window.renderInstance = this;
    }

    render() {
        requestAnimationFrame(() => this.render());
        try {
            // Update controls
            this.controls.update();
        } catch (err) {
            console.log("controls not loaded", this.controls);
        }
        // Get delta time for animations
        const delta = this.clock.getDelta() * this.timeScale * 1000;

        // Animate planetary orbits
        if (this.orbits) {
            this.orbits.forEach(orbit => {
                if (orbit.userData && orbit.userData.orbitalPeriod) {
                    // Rotate orbit based on period - use the orbital period which is calculated using the admin setting
                    // Apply an extreme slowdown factor to make orbits nearly imperceptible in real-time
                    // Divide by a billion to make it a million times slower
                    orbit.rotation.y += (Math.PI * 2) / (orbit.userData.orbitalPeriod * 1000000000) * delta;
                }
            });
        }

        // Update camera if we're focused on a planet
        if (this.isZoomedIn && this.zoomedPlanet) {
            // Get the current world position of the planet
            const planetPos = new THREE.Vector3();
            this.zoomedPlanet.getWorldPosition(planetPos);

            // Update the controls target to follow the planet
            this.controls.target.copy(planetPos);

            // Look at the planet
            this.camera.lookAt(planetPos);

            // Update controls
            this.controls.update();
        }

        // Resource generation now happens server-side via WebSockets

        // Animate planet and star objects
        if (this.solar) {
            // Animate stars
            this.solar.children.forEach(object => {
                if (object.animate) {
                    object.animate(delta);
                }
            });

            // Animate planets in orbits
            if (this.orbits) {
                this.orbits.forEach(orbit => {
                    orbit.children.forEach(child => {
                        if (child.animate) {
                            child.animate(delta);
                        }
                    });
                });
            }
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Export for external use
export { Render };

// Also make available globally for easier access from other scripts
window.Render = Render;