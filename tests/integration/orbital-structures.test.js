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

describe('Orbital structures integration', () => {
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
  
  test('multiple structures orbit at different distances', () => {
    // Add different types of structures
    const mining = planet.addStructure('mining');
    const research = planet.addStructure('research');
    const colony = planet.addStructure('colony');
    const defense = planet.addStructure('defense');
    
    // Find the actual structure meshes
    const miningStructure = mining.children[0];
    const researchStructure = research.children[0];
    const colonyStructure = colony.children[0];
    const defenseStructure = defense.children[0];
    
    // Check that structures are at different distances
    const miningDistance = miningStructure.position.length();
    const researchDistance = researchStructure.position.length();
    const colonyDistance = colonyStructure.position.length();
    const defenseDistance = defenseStructure.position.length();
    
    // Each structure type should have a unique orbit distance
    expect(miningDistance).not.toBe(researchDistance);
    expect(miningDistance).not.toBe(colonyDistance);
    expect(miningDistance).not.toBe(defenseDistance);
    expect(researchDistance).not.toBe(colonyDistance);
    expect(researchDistance).not.toBe(defenseDistance);
    expect(colonyDistance).not.toBe(defenseDistance);
  });
  
  test('structures orbit around the planet over time', () => {
    // Add a structure
    const structure = planet.addStructure('research');
    
    // Store its initial position
    const initialX = structure.children[0].position.x;
    const initialPosition = structure.rotation.y;
    
    // Call animate multiple times with different delta values
    planet.animate(1000);  // 1 second
    
    // Position should not have changed yet much (slow orbit)
    const position1 = structure.rotation.y;
    expect(position1).not.toBe(initialPosition);
    expect(Math.abs(position1 - initialPosition)).toBeLessThan(0.1); // Small change
    
    // Animate for longer time
    planet.animate(10000);  // 10 seconds
    
    // Position should have changed more significantly
    const position2 = structure.rotation.y;
    expect(position2).not.toBe(position1);
    expect(Math.abs(position2 - position1)).toBeGreaterThan(Math.abs(position1 - initialPosition));
  });
  
  test('structures persist in userData for saving', () => {
    // Add different types of structures
    planet.addStructure('mining');
    planet.addStructure('research');
    planet.addStructure('colony');
    
    // Verify userData contains the structures
    expect(planet.userData.planetData.structures.length).toBe(3);
    
    // Check structure data has the right properties
    planet.userData.planetData.structures.forEach(structure => {
      expect(structure).toHaveProperty('type');
      expect(structure).toHaveProperty('orbitRadius');
      expect(structure).toHaveProperty('orbitAngle');
      expect(structure).toHaveProperty('scale');
      expect(structure).toHaveProperty('color');
    });
    
    // Check types are correct
    const types = planet.userData.planetData.structures.map(s => s.type);
    expect(types).toContain('mining');
    expect(types).toContain('research');
    expect(types).toContain('colony');
  });
  
  test('planet and atmosphere rotate at different speeds than structures', () => {
    // Create a planet with specific speeds
    const customPlanet = new Planet({
      rotationSpeed: 0.001,
      cloudSpeed: 0.0005
    });
    
    // Add a structure
    const structure = customPlanet.addStructure('research');
    
    // Store initial rotations
    const initialPlanetRotation = customPlanet.planetMesh.rotation.y;
    const initialCloudRotation = customPlanet.cloudMesh ? customPlanet.cloudMesh.rotation.y : 0;
    const initialStructureRotation = structure.rotation.y;
    
    // Animate for a time period
    customPlanet.animate(1000);
    
    // Get new rotations
    const newPlanetRotation = customPlanet.planetMesh.rotation.y;
    const newCloudRotation = customPlanet.cloudMesh ? customPlanet.cloudMesh.rotation.y : 0;
    const newStructureRotation = structure.rotation.y;
    
    // Calculate rotation deltas
    const planetDelta = Math.abs(newPlanetRotation - initialPlanetRotation);
    const cloudDelta = Math.abs(newCloudRotation - initialCloudRotation);
    const structureDelta = Math.abs(newStructureRotation - initialStructureRotation);
    
    // Structure rotation should be slower than planet rotation
    expect(structureDelta).toBeLessThan(planetDelta);
    
    // If cloud exists, check its rotation too
    if (customPlanet.cloudMesh) {
      // Cloud rotation should be different from planet rotation
      expect(cloudDelta).not.toEqual(planetDelta);
    }
  });
  
  test('different structure types have different appearances', () => {
    // Add different types of structures
    const mining = planet.addStructure('mining');
    const research = planet.addStructure('research');
    
    // Get the meshes
    const miningMesh = mining.children[0];
    const researchMesh = research.children[0];
    
    // Materials should have different colors
    const miningColor = miningMesh.material.color.getHex();
    const researchColor = researchMesh.material.color.getHex();
    
    expect(miningColor).not.toEqual(researchColor);
  });
});