// Main entry point for webpack
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Make THREE available globally
window.THREE = THREE;
window.OrbitControls = OrbitControls;

// Import game modules
import '../flask_app/static/js/game.js';
import '../flask_app/static/js/ui.js';
import '../flask_app/static/js/buildMenu.js';
import '../flask_app/static/js/shipBuilder.js';
import '../flask_app/static/js/objects/planet.js';
import '../flask_app/static/js/objects/star.js';
import '../flask_app/static/js/materials/atmosphere.js';
import '../flask_app/static/js/materials/noise.js';
import '../flask_app/static/js/materials/planetMaterial.js';
import '../flask_app/static/js/shaders/atmosphere.js';
import '../flask_app/static/js/shaders/noise.js';

console.log('Game modules loaded successfully');