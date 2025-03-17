/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
  
  // Mock OrbitControls
  jest.mock('three/addons/controls/OrbitControls.js', () => {
    return {
      OrbitControls: jest.fn().mockImplementation(() => {
        return {
          update: jest.fn(),
          enabled: true,
          enableDamping: true,
          dampingFactor: 0.05,
          maxDistance: 1000,
          rotateSpeed: 0.8,
          target: new THREE.Vector3()
        };
      })
    };
  });
});

// Import the game after setting up mocks
import { MassGravity } from '../../flask_app/static/js/game';

describe('MassGravity class', () => {
  let game;
  
  beforeEach(() => {
    // Silence console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
    
    // Create the game instance
    game = new MassGravity();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('initializes with loading screen and progress bar', () => {
    expect(game.loadingScreen).toBeDefined();
    expect(game.progressBar).toBeDefined();
  });
  
  test('updates loading progress correctly', () => {
    game.updateLoadingProgress(50);
    expect(game.loadingProgress).toBe(50);
    expect(game.progressBar.style.width).toBe('50%');
    
    // Test clamping to 100%
    game.updateLoadingProgress(150);
    expect(game.loadingProgress).toBe(100);
    expect(game.progressBar.style.width).toBe('100%');
  });
  
  test('hides loading screen after initialization', () => {
    game.hideLoadingScreen();
    
    // Should set opacity to 0
    expect(game.loadingScreen.style.opacity).toBe('0');
    
    // After the timeout, display should be none
    jest.advanceTimersByTime(500);
    expect(game.loadingScreen.style.display).toBe('none');
  });
  
  test('loadGame fetches data from API', async () => {
    await game.loadGame();
    
    expect(global.fetch).toHaveBeenCalledWith('/api/load_game');
  });
  
  test('saveGame sends data to API', async () => {
    // Initialize minimal required properties
    game.camera = { position: new THREE.Vector3() };
    game.solar = { children: [] };
    
    await game.saveGame();
    
    expect(global.fetch).toHaveBeenCalledWith('/api/save_game', expect.any(Object));
  });
  
  test('initComponents sets up renderer, camera, and controls', () => {
    // This test will need to mock WebGLRenderer
    const mockRenderer = {
      setClearColor: jest.fn(),
      setPixelRatio: jest.fn(),
      setSize: jest.fn(),
      shadowMap: { enabled: false },
      domElement: document.createElement('canvas')
    };
    
    // Mock the WebGLRenderer constructor
    const originalRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = jest.fn(() => mockRenderer);
    
    game.initComponents();
    
    // Verify renderer was set up
    expect(game.renderer).toBeDefined();
    expect(THREE.WebGLRenderer).toHaveBeenCalled();
    
    // Verify camera was created
    expect(game.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    
    // Verify controls were created
    expect(game.controls).toBeDefined();
    
    // Verify raycaster for object selection
    expect(game.raycaster).toBeInstanceOf(THREE.Raycaster);
    
    // Restore original
    THREE.WebGLRenderer = originalRenderer;
  });
  
  test('initScene creates scene with skybox and solar system', () => {
    // Mock scene before initialization
    game.scene = new THREE.Scene();
    game.solarCenter = new THREE.Vector3();
    game.solarRadius = 500;
    
    // Mock cube texture loader
    const mockCubeTexture = {};
    const mockLoader = {
      setPath: jest.fn().mockReturnThis(),
      load: jest.fn().mockReturnValue(mockCubeTexture)
    };
    const originalLoader = THREE.CubeTextureLoader;
    THREE.CubeTextureLoader = jest.fn(() => mockLoader);
    
    // Mock methods that create solar system
    game.generateSolarSystem = jest.fn();
    game.calculateSolarSystemBounds = jest.fn();
    
    // Run initialization
    game.initScene();
    
    // Verify skybox was created
    expect(THREE.CubeTextureLoader).toHaveBeenCalled();
    expect(mockLoader.load).toHaveBeenCalled();
    expect(game.scene.background).toBe(mockCubeTexture);
    
    // Verify solar system container was created
    expect(game.solar).toBeInstanceOf(THREE.Object3D);
    
    // Verify generation methods were called
    expect(game.generateSolarSystem).toHaveBeenCalled();
    
    // Restore original
    THREE.CubeTextureLoader = originalLoader;
  });
  
  test('calculateSolarSystemBounds handles empty solar system', () => {
    game.solar = new THREE.Object3D();
    game.solarCenter = new THREE.Vector3(10, 10, 10); // Set non-zero to check if it's reset
    
    game.calculateSolarSystemBounds();
    
    // With no planets, center should remain unchanged
    expect(game.solarCenter).toEqual(new THREE.Vector3(10, 10, 10));
    
    // Radius should be set to minimum
    expect(game.solarRadius).toBeGreaterThanOrEqual(400);
  });
  
  test('isBackgroundClick determines if click is on background', () => {
    // Setup game
    game.scene = new THREE.Scene();
    
    // Create a selectable object
    const selectableObject = new THREE.Object3D();
    selectableObject.userData.isSelectable = true;
    
    // Create a normal object
    const normalObject = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    
    // Create mock intersections with normal object
    const normalIntersects = [
      { object: normalObject }
    ];
    
    // Create mock intersections with selectable object
    const selectableIntersects = [
      { object: selectableObject }
    ];
    
    // Create mock nested intersections
    const nestedObject = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    selectableObject.add(nestedObject);
    const nestedIntersects = [
      { object: nestedObject }
    ];
    
    // Test background click (no selectable objects)
    expect(game.isBackgroundClick(normalIntersects)).toBe(true);
    
    // Test direct click on selectable object
    expect(game.isBackgroundClick(selectableIntersects)).toBe(false);
    
    // Test nested click (should still find selectable parent)
    expect(game.isBackgroundClick(nestedIntersects)).toBe(false);
  });
  
  test('zoomToFullSolarSystem positions camera to view entire system', () => {
    // Setup game
    game.solar = new THREE.Object3D();
    game.camera = new THREE.PerspectiveCamera();
    game.solarCenter = new THREE.Vector3(0, 0, 0);
    game.solarRadius = 500;
    game.ui = { selectObject: jest.fn() };
    
    // Mock the camera animation method
    game.animateCameraMove = jest.fn();
    
    // Call zoom
    game.zoomToFullSolarSystem();
    
    // Verify animation was triggered
    expect(game.animateCameraMove).toHaveBeenCalled();
    
    // Verify UI was updated
    expect(game.selectedObject).toBeNull();
    expect(game.ui.selectObject).toHaveBeenCalledWith(null);
  });
  
  test('onWindowResize updates camera and renderer', () => {
    // Setup game
    game.camera = {
      aspect: 1,
      updateProjectionMatrix: jest.fn()
    };
    
    game.renderer = {
      setSize: jest.fn()
    };
    
    // Call resize handler
    game.onWindowResize();
    
    // Verify camera was updated
    expect(game.camera.updateProjectionMatrix).toHaveBeenCalled();
    
    // Verify renderer was resized
    expect(game.renderer.setSize).toHaveBeenCalled();
  });
  
  test('double-click detection works correctly', () => {
    // Setup game
    game.clickCount = 0;
    game.onDoubleClick = jest.fn();
    game.isTransitioning = false;
    
    // Mock clearTimeout
    const originalClearTimeout = window.clearTimeout;
    window.clearTimeout = jest.fn();
    
    // Mock setTimeout
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = jest.fn().mockReturnValue(123);
    
    // Simulate first click
    game.handleDoubleClick({ clientX: 100, clientY: 100 });
    
    // Should increment click count
    expect(game.clickCount).toBe(1);
    
    // Should set timeout
    expect(window.setTimeout).toHaveBeenCalled();
    
    // Simulate second click
    game.handleDoubleClick({ clientX: 100, clientY: 100 });
    
    // Should clear timeout
    expect(window.clearTimeout).toHaveBeenCalledWith(123);
    
    // Should reset click count
    expect(game.clickCount).toBe(0);
    
    // Should trigger double click handler
    expect(game.onDoubleClick).toHaveBeenCalled();
    
    // Restore originals
    window.clearTimeout = originalClearTimeout;
    window.setTimeout = originalSetTimeout;
  });
});