/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { GameUI } from '../../flask_app/static/js/ui.js';
import { Planet } from '../../flask_app/static/js/objects/planet.js';
import { Star } from '../../flask_app/static/js/objects/star.js';

// Mock DOM elements
beforeEach(() => {
  // Create necessary DOM elements
  document.body.innerHTML = `
    <div id="ui-overlay"></div>
  `;
});

describe('GameUI class', () => {
  let ui;
  let mockGame;
  let mockPlanet;
  let mockStar;
  
  beforeEach(() => {
    // Create mock game object with camera and controls
    mockGame = {
      camera: {
        position: new THREE.Vector3(0, 0, 100),
        lookAt: jest.fn(),
        updateProjectionMatrix: jest.fn()
      },
      controls: {
        enabled: true,
        target: new THREE.Vector3(),
        update: jest.fn()
      }
    };
    
    // Create a mock planet
    mockPlanet = new THREE.Object3D();
    mockPlanet.position.set(50, 0, 0);
    mockPlanet.userData = {
      isPlanet: true,
      isSelectable: true,
      planetData: {
        name: 'Test Planet',
        type: 'Terrestrial',
        resources: { minerals: 50, energy: 60, water: 70 },
        structures: []
      }
    };
    mockPlanet.children = [
      { geometry: { parameters: { radius: 10 } } }
    ];
    mockPlanet.addStructure = jest.fn(() => {
      mockPlanet.userData.planetData.structures.push({ type: 'mining' });
      return new THREE.Object3D();
    });
    
    // Create a mock star
    mockStar = new THREE.Object3D();
    mockStar.position.set(-50, 0, 0);
    mockStar.userData = {
      isStar: true,
      isSelectable: true,
      starData: {
        name: 'Test Star',
        type: 'G-type',
        temperature: 5778,
        luminosity: 1
      }
    };
    mockStar.children = [
      { geometry: { parameters: { radius: 30 } } }
    ];
    
    // Initialize UI
    ui = new GameUI(mockGame);
  });
  
  test('initializes UI elements', () => {
    expect(ui.uiContainer).toBeDefined();
    expect(ui.detailPanel).toBeDefined();
    expect(ui.buildMenu).toBeDefined();
    
    // Check if UI elements were added to DOM
    expect(document.querySelector('.game-ui')).not.toBeNull();
    expect(document.querySelector('.detail-panel')).not.toBeNull();
    expect(document.querySelector('.build-menu')).not.toBeNull();
  });
  
  test('selectObject with planet shows detail panel and build menu', () => {
    ui.selectObject(mockPlanet);
    
    // Detail panel should be visible
    expect(ui.detailPanel.style.display).toBe('block');
    
    // Build menu should be visible
    expect(ui.buildMenu.style.display).toBe('block');
    
    // Content should include planet name
    expect(ui.detailPanel.innerHTML).toContain('Test Planet');
    
    // Content should include resource values
    expect(ui.detailPanel.innerHTML).toContain('50.0');
    expect(ui.detailPanel.innerHTML).toContain('60.0');
    expect(ui.detailPanel.innerHTML).toContain('70.0');
  });
  
  test('selectObject with star shows detail panel but not build menu', () => {
    ui.selectObject(mockStar);
    
    // Detail panel should be visible
    expect(ui.detailPanel.style.display).toBe('block');
    
    // Build menu should be hidden
    expect(ui.buildMenu.style.display).toBe('none');
    
    // Content should include star name
    expect(ui.detailPanel.innerHTML).toContain('Test Star');
    
    // Content should include star data
    expect(ui.detailPanel.innerHTML).toContain('G-type');
    expect(ui.detailPanel.innerHTML).toContain('5778');
    expect(ui.detailPanel.innerHTML).toContain('1');
  });
  
  test('selectObject with null hides UI panels', () => {
    // First select an object
    ui.selectObject(mockPlanet);
    
    // Then clear selection
    ui.selectObject(null);
    
    // Both panels should be hidden
    expect(ui.detailPanel.style.display).toBe('none');
    expect(ui.buildMenu.style.display).toBe('none');
  });
  
  test('buildStructure adds structure and updates UI', () => {
    // First select a planet
    ui.selectObject(mockPlanet);
    
    // Mock appendChild to track notifications
    const originalAppendChild = ui.uiContainer.appendChild;
    ui.uiContainer.appendChild = jest.fn();
    
    // Call buildStructure
    ui.buildStructure('mining', mockPlanet);
    
    // Check if addStructure was called
    expect(mockPlanet.addStructure).toHaveBeenCalledWith('mining');
    
    // Check if a notification was shown
    expect(ui.uiContainer.appendChild).toHaveBeenCalled();
    
    // Restore original
    ui.uiContainer.appendChild = originalAppendChild;
  });
  
  test('focusCameraOn calculates correct camera position', () => {
    // Mock animateCameraMove to capture arguments
    ui.animateCameraMove = jest.fn();
    
    // Call focusCameraOn
    ui.focusCameraOn(mockPlanet);
    
    // Check if animateCameraMove was called with correct target
    expect(ui.animateCameraMove).toHaveBeenCalled();
    
    // Get the arguments
    const args = ui.animateCameraMove.mock.calls[0];
    const startPos = args[0];
    const targetPos = args[1];
    const lookAt = args[2];
    
    // Verify start position is camera's position
    expect(startPos).toEqual(mockGame.camera.position);
    
    // Verify target position is some distance from planet
    expect(targetPos.distanceTo(mockPlanet.position)).toBeGreaterThan(0);
    
    // Verify lookAt is planet's position
    expect(lookAt).toEqual(mockPlanet.position);
  });
  
  test('animateCameraMove handles null lookAt safely', () => {
    // Call with null lookAt
    ui.animateCameraMove(
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(50, 0, 100),
      null
    );
    
    // This primarily tests that no error is thrown
    expect(true).toBe(true);
  });
});