/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { Planet } from '../../flask_app/static/js/objects/planet.js';

// Mock the THREE.CanvasTexture to avoid actual canvas operations
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  return {
    ...originalThree,
    CanvasTexture: jest.fn().mockImplementation(() => {
      return {
        wrapS: null,
        wrapT: null
      };
    })
  };
});

describe('Planet class', () => {
  let planet;
  
  beforeEach(() => {
    // Create a new planet instance before each test
    planet = new Planet({
      name: 'Test Planet',
      radius: 10,
      type: 'Terrestrial',
      color: new THREE.Color(0x00ff00),
      atmosphereColor: new THREE.Color(0x0000ff),
      resources: { minerals: 50, energy: 60, water: 70 }
    });
  });
  
  test('initializes with correct properties', () => {
    // Verify basic properties
    expect(planet).toBeInstanceOf(THREE.Object3D);
    expect(planet.userData.isPlanet).toBe(true);
    expect(planet.userData.isSelectable).toBe(true);
    expect(planet.userData.planetData.name).toBe('Test Planet');
    expect(planet.userData.planetData.type).toBe('Terrestrial');
    expect(planet.userData.planetData.resources.minerals).toBe(50);
    expect(planet.userData.planetData.resources.energy).toBe(60);
    expect(planet.userData.planetData.resources.water).toBe(70);
  });
  
  test('contains planet mesh with correct geometry', () => {
    // Find the planet mesh
    const planetMesh = planet.children.find(child => child instanceof THREE.Mesh);
    expect(planetMesh).toBeDefined();
    expect(planetMesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(planetMesh.geometry.parameters.radius).toBe(10);
  });
  
  test('includes atmosphere layers when atmosphere is enabled', () => {
    // Count atmosphere-related meshes (should be at least 2)
    const atmosphereMeshes = planet.children.filter(
      child => child instanceof THREE.Mesh && 
      child.material && 
      child.material.isShaderMaterial
    );
    
    expect(atmosphereMeshes.length).toBeGreaterThanOrEqual(2);
  });
  
  test('creates planet without atmosphere when disabled', () => {
    const planetNoAtmosphere = new Planet({
      hasAtmosphere: false,
      radius: 10
    });
    
    // Count atmosphere-related meshes (should be 0)
    const atmosphereMeshes = planetNoAtmosphere.children.filter(
      child => child instanceof THREE.Mesh && 
      child.material && 
      child.material.isShaderMaterial
    );
    
    expect(atmosphereMeshes.length).toBe(0);
  });
  
  test('animate method exists and works', () => {
    // Verify animate method exists
    expect(typeof planet.animate).toBe('function');
    
    // Find the planet mesh and store its initial rotation
    const planetMesh = planet.children.find(child => 
      child instanceof THREE.Mesh && 
      child.geometry.parameters.radius === 10
    );
    
    const initialRotation = planetMesh.rotation.y;
    
    // Call animate
    planet.animate(1000);
    
    // Verify rotation changed
    expect(planetMesh.rotation.y).not.toBe(initialRotation);
  });
  
  test('addStructure method adds a new structure', () => {
    // Initial structures count
    expect(planet.userData.planetData.structures.length).toBe(0);
    
    // Add a mining structure
    planet.addStructure('mining');
    
    // Verify structure was added to userData
    expect(planet.userData.planetData.structures.length).toBe(1);
    expect(planet.userData.planetData.structures[0].type).toBe('mining');
    
    // Verify orbitalsContainer has a new child
    const orbitalsContainer = planet.children.find(child => 
      child instanceof THREE.Object3D && 
      child !== planet.planetMesh
    );
    
    expect(orbitalsContainer.children.length).toBe(1);
    
    // The structure should have a mesh inside
    const structureContainer = orbitalsContainer.children[0];
    expect(structureContainer.children.length).toBeGreaterThan(0);
    
    // Test userData for orbit speed
    expect(structureContainer.userData.orbitSpeed).toBeDefined();
  });
  
  test('structures have different orbit radii based on type', () => {
    // Add different types of structures
    const mining = planet.addStructure('mining');
    const research = planet.addStructure('research');
    const colony = planet.addStructure('colony');
    
    // Find the actual structure meshes
    const miningStructure = mining.children[0];
    const researchStructure = research.children[0];
    const colonyStructure = colony.children[0];
    
    // Compare their positions (they should be at different distances)
    expect(miningStructure.position.x).not.toBe(researchStructure.position.x);
    expect(researchStructure.position.x).not.toBe(colonyStructure.position.x);
  });
});