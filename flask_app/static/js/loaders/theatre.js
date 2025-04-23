import { GLTFLoader } from './GLTFloader/GLTFLoader.js';

//export function shipsDisplay(scene, modelPath) {
export function shipsDisplay(scene) {

  var modelPath = '/static/js/units/meshes/ship.glb';  // Default Path to the GLB model file
  
  // Create a loader instance
  const loader = new GLTFLoader();

  // Load the model
  loader.load(
    modelPath,  // Path to the model file
    (gltf) => {  // Success callback
      const model = gltf.scene;  // Access the loaded model's scene
      scene.add(model);  // Add the model to the Three.js scene
      model.scale.set(30, 30, 30);  // Scale the model (optional)
      model.position.set(0, 0, 0);  // Set position of the model (optional)
    },
    (xhr) => {  // Progress callback
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {  // Error callback
      console.error('An error occurred while loading the model', error);
    }
  );
}
