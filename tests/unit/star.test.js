/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { Star } from '../../flask_app/static/js/objects/star.js';

describe('Star class', () => {
  let star;
  
  beforeEach(() => {
    // Create a new star instance before each test
    star = new Star({
      name: 'Test Star',
      radius: 30,
      type: 'G-type',
      color: new THREE.Color(0xFFC65C),
      glowColor: new THREE.Color(0xFFD700),
      temperature: 5778,
      luminosity: 1
    });
  });
  
  test('initializes with correct properties', () => {
    // Verify basic properties
    expect(star).toBeInstanceOf(THREE.Object3D);
    expect(star.userData.isStar).toBe(true);
    expect(star.userData.isSelectable).toBe(true);
    expect(star.userData.starData.name).toBe('Test Star');
    expect(star.userData.starData.type).toBe('G-type');
    expect(star.userData.starData.temperature).toBe(5778);
    expect(star.userData.starData.luminosity).toBe(1);
  });
  
  test('contains star mesh with correct geometry', () => {
    // Find the star mesh
    const starMesh = star.children.find(child => 
      child instanceof THREE.Mesh && 
      child.material.isMeshBasicMaterial
    );
    
    expect(starMesh).toBeDefined();
    expect(starMesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(starMesh.geometry.parameters.radius).toBe(30);
  });
  
  test('includes glow layers', () => {
    // Count glow-related meshes (should be at least 2)
    const glowMeshes = star.children.filter(
      child => child instanceof THREE.Mesh && 
      child.material && 
      child.material.isShaderMaterial
    );
    
    expect(glowMeshes.length).toBeGreaterThanOrEqual(2);
  });
  
  test('creates a light source', () => {
    // Verify a light exists
    const light = star.children.find(child => child instanceof THREE.PointLight);
    expect(light).toBeDefined();
    expect(light.castShadow).toBe(true);
  });
  
  test('animate method exists and works', () => {
    // Verify animate method exists
    expect(typeof star.animate).toBe('function');
    
    // Find the star mesh and store its initial rotation
    const starMesh = star.children.find(child => 
      child instanceof THREE.Mesh && 
      child.material.isMeshBasicMaterial
    );
    
    const initialRotation = starMesh.rotation.y;
    
    // Call animate
    star.animate(1000);
    
    // Verify rotation changed
    expect(starMesh.rotation.y).not.toBe(initialRotation);
  });
  
  test('light intensity flickers', () => {
    // Get light source
    const light = star.children.find(child => child instanceof THREE.PointLight);
    const initialIntensity = light.intensity;
    
    // Mock Date.now to return a specific value for predictable testing
    const mockNow = jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    
    // Call animate
    star.animate(1000);
    const newIntensity = light.intensity;
    
    // Call animate with different time
    mockNow.mockImplementation(() => 2000);
    star.animate(1000);
    const finalIntensity = light.intensity;
    
    // Verify intensity changes over time
    expect(initialIntensity).not.toBe(newIntensity);
    expect(newIntensity).not.toBe(finalIntensity);
    
    // Clean up mock
    mockNow.mockRestore();
  });
});