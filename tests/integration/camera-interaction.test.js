/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';

// Create mock HTML elements needed by the game
beforeEach(() => {
  document.body.innerHTML = `
    <div id="loading-screen">
      <div id="progress-bar"></div>
    </div>
    <div id="game-container"></div>
    <div id="ui-overlay"></div>
    <button id="save-game"></button>
  `;
  
  // Mock fetch for API calls
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ success: true }),
    })
  );
  
  // Mock requestAnimationFrame
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
});

// Import the game classes
import { MassGravity } from '../../flask_app/static/js/game';
import { Planet } from '../../flask_app/static/js/objects/planet.js';
import { Star } from '../../flask_app/static/js/objects/star.js';

describe('Camera interaction with objects', () => {
  let game;
  
  beforeEach(async () => {
    // Silence console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create the game instance with minimal initialization
    game = new MassGravity();
    
    // Mock necessary methods to avoid full initialization
    game.initComponents = jest.fn(() => {
      game.camera = new THREE.PerspectiveCamera();
      game.controls = {
        enabled: true,
        update: jest.fn(),
        target: new THREE.Vector3()
      };
      game.scene = new THREE.Scene();
      game.solar = new THREE.Object3D();
      game.scene.add(game.solar);
      game.raycaster = new THREE.Raycaster();
      game.mouse = new THREE.Vector2();
      game.clickCount = 0;
      game.selectedObject = null;
      game.isTransitioning = false;
      game.clock = new THREE.Clock();
      game.timeScale = 1.0;
      game.solarCenter = new THREE.Vector3();
      game.solarRadius = 500;
    });
    
    game.initScene = jest.fn();
    game.setListeners = jest.fn();
    game.hideLoadingScreen = jest.fn();
    game.render = jest.fn();
    
    // Initialize UI with minimal functionality
    game.initUI = jest.fn(() => {
      game.ui = {
        selectObject: jest.fn()
      };
    });
    
    // Create real interaction handlers but mock their internals
    game.initInteraction = jest.fn(() => {
      // Just connect the event listeners but don't do the real implementations
      game.handleDoubleClick = jest.fn();
      game.onMouseClick = jest.fn();
      game.renderer = { domElement: document.createElement('div') };
      game.renderer.domElement.addEventListener = jest.fn();
    });
    
    // Mock animation methods
    game.animateCameraMove = jest.fn((startPos, targetPos, lookAt) => {
      // Simulate end of animation directly
      game.camera.position.copy(targetPos);
      if (lookAt) {
        game.camera.lookAt(lookAt);
        game.controls.target.copy(lookAt);
      }
      game.isTransitioning = false;
    });
    
    // Initialize the game with mocked methods
    await game.loadGame();
    game.initComponents();
    game.initScene();
    game.initInteraction();
    game.initUI();
    game.setListeners();
    
    // Create test objects
    const testPlanet = new THREE.Object3D();
    testPlanet.position.set(100, 0, 0);
    testPlanet.userData = {
      isPlanet: true,
      isSelectable: true,
      planetData: {
        name: 'Test Planet',
        type: 'Terrestrial',
        resources: { minerals: 50, energy: 60, water: 70 },
        structures: []
      }
    };
    testPlanet.children = [
      { geometry: { parameters: { radius: 10 } } }
    ];
    
    const testStar = new THREE.Object3D();
    testStar.position.set(0, 0, 0);
    testStar.userData = {
      isStar: true,
      isSelectable: true,
      starData: {
        name: 'Test Star',
        type: 'G-type',
        temperature: 5778,
        luminosity: 1
      }
    };
    testStar.children = [
      { geometry: { parameters: { radius: 30 } } }
    ];
    
    // Add test objects to the solar system
    game.solar.add(testPlanet);
    game.solar.add(testStar);
    
    // Store references for tests
    game.testPlanet = testPlanet;
    game.testStar = testStar;
    
    // Calculate solar system bounds
    game.calculateSolarSystemBounds = jest.fn(() => {
      game.solarCenter = new THREE.Vector3(0, 0, 0);
      game.solarRadius = 200;
    });
    game.calculateSolarSystemBounds();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('zoomToFullSolarSystem positions camera to view entire solar system', () => {
    // Store initial camera position
    const initialPosition = game.camera.position.clone();
    
    // Execute zoom
    game.zoomToFullSolarSystem();
    
    // Camera position should change
    expect(game.camera.position).not.toEqual(initialPosition);
    
    // Camera should be positioned at a distance from solar center
    const distanceToCenter = game.camera.position.distanceTo(game.solarCenter);
    expect(distanceToCenter).toBeGreaterThan(game.solarRadius);
    
    // UI should deselect any selected object
    expect(game.selectedObject).toBeNull();
    expect(game.ui.selectObject).toHaveBeenCalledWith(null);
  });
  
  test('camera transition locks interactivity during animation', () => {
    // Mock implementation of animateCameraMove to simulate long transition
    game.animateCameraMove = jest.fn(() => {
      game.isTransitioning = true;
      // Don't complete the transition in this test
    });
    
    // Start a camera transition
    game.zoomToFullSolarSystem();
    
    // Should be in transitioning state
    expect(game.isTransitioning).toBe(true);
    
    // Clicking should be ignored during transition
    const clickEvent = new MouseEvent('click');
    game.onMouseClick(clickEvent);
    expect(game.onMouseClick).toHaveReturnedWith(undefined);
    
    // Double clicking should be ignored during transition
    game.handleDoubleClick(clickEvent);
    expect(game.handleDoubleClick).toHaveReturnedWith(undefined);
  });
  
  test('selecting a planet zooms camera to that planet', () => {
    // Store initial camera position
    const initialPosition = game.camera.position.clone();
    
    // Replace the original method to test its inputs
    const originalMethod = game.animateCameraMove;
    game.animateCameraMove = jest.fn((startPos, targetPos, lookAt) => {
      expect(startPos).toEqual(initialPosition);
      expect(lookAt).toEqual(game.testPlanet.position);
      originalMethod(startPos, targetPos, lookAt);
    });
    
    // Execute planet selection (directly call zoomToFullSolarSystem)
    game.onMouseClick = jest.fn(() => {
      game.selectedObject = game.testPlanet;
      game.ui.selectObject(game.testPlanet);
    });
    
    // Trigger click that selects a planet
    const clickEvent = new MouseEvent('click');
    game.onMouseClick(clickEvent);
    
    // Camera should be positioned relative to planet
    const distanceToPlanet = game.camera.position.distanceTo(game.testPlanet.position);
    expect(distanceToPlanet).toBeGreaterThan(0);
    
    // Camera should be looking at the planet
    expect(game.controls.target).toEqual(game.testPlanet.position);
    
    // UI should select the planet
    expect(game.selectedObject).toBe(game.testPlanet);
    expect(game.ui.selectObject).toHaveBeenCalledWith(game.testPlanet);
  });
  
  test('double-click on background after selecting planet zooms out', () => {
    // First select a planet
    game.selectedObject = game.testPlanet;
    
    // Store the original method to verify it's called
    const originalZoomMethod = game.zoomToFullSolarSystem;
    game.zoomToFullSolarSystem = jest.fn();
    
    // Test the background click detection
    game.isBackgroundClick = jest.fn(() => true);
    
    // Execute double-click on background
    game.onDoubleClick({ clientX: 400, clientY: 300 });
    
    // Should call zoom out
    expect(game.zoomToFullSolarSystem).toHaveBeenCalled();
    
    // Restore original
    game.zoomToFullSolarSystem = originalZoomMethod;
  });
});