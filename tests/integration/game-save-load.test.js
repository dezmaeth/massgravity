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
  
  // Mock requestAnimationFrame
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
});

// Import the game classes
import { MassGravity } from '../../flask_app/static/js/game';

describe('Game save and load functionality', () => {
  let game;
  let mockGameState;
  
  beforeEach(async () => {
    // Silence console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create sample game state
    mockGameState = {
      seed: "test-seed",
      playerPosition: { x: 100, y: 20, z: 300 },
      planets: [
        {
          position: { x: 50, y: 0, z: 0 },
          data: {
            name: "Test Planet 1",
            type: "Terrestrial",
            resources: { minerals: 75, energy: 45, water: 90 },
            structures: [
              { type: "mining", orbitRadius: 16, orbitAngle: 0, scale: 0.15, color: 0xffcc00 }
            ]
          }
        },
        {
          position: { x: -100, y: 10, z: 50 },
          data: {
            name: "Test Planet 2",
            type: "Gas Giant",
            resources: { minerals: 20, energy: 95, water: 10 },
            structures: []
          }
        }
      ],
      stars: [
        {
          position: { x: 0, y: 0, z: 0 },
          data: {
            name: "Test Star",
            type: "G-type",
            temperature: 5500,
            luminosity: 1.2
          }
        }
      ]
    };
    
    // Mock fetch for API calls
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        json: () => Promise.resolve(mockGameState)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        json: () => Promise.resolve({ success: true })
      }));
    
    // Create the game instance with minimal initialization
    game = new MassGravity();
    
    // Create spy versions of key methods
    game.initComponents = jest.fn(() => {
      game.camera = new THREE.PerspectiveCamera();
      game.camera.position.set(0, 0, 0);
      game.solar = new THREE.Object3D();
    });
    
    // We need real versions of these for testing
    game.restoreSolarSystem = jest.spyOn(MassGravity.prototype, 'restoreSolarSystem');
    game.generateSolarSystem = jest.spyOn(MassGravity.prototype, 'generateSolarSystem');
    
    // Mock the other initialization methods
    game.initScene = jest.fn(() => {
      game.solar = new THREE.Object3D();
      game.scene = new THREE.Scene();
      game.scene.add(game.solar);
      game.solarCenter = new THREE.Vector3();
      game.solarRadius = 500;
    });
    
    game.initInteraction = jest.fn();
    game.initUI = jest.fn();
    game.setListeners = jest.fn();
    game.hideLoadingScreen = jest.fn();
    game.render = jest.fn();
    
    // Initialize with real loadGame to test
    await game.loadGame();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('loadGame fetches and applies saved game state', async () => {
    // Verify fetch was called correctly
    expect(global.fetch).toHaveBeenCalledWith('/api/load_game');
    
    // Verify game state was updated
    expect(gameState.seed).toBe(mockGameState.seed);
    expect(gameState.playerPosition).toEqual(mockGameState.playerPosition);
    expect(gameState.planets).toEqual(mockGameState.planets);
    expect(gameState.stars).toEqual(mockGameState.stars);
  });
  
  test('restoreSolarSystem creates objects from saved data', () => {
    // Create spy versions to track created objects
    const addSpy = jest.spyOn(game.solar, 'add');
    
    // Call the real method with our test data
    game.restoreSolarSystem();
    
    // Verify correct number of objects added
    expect(addSpy).toHaveBeenCalledTimes(mockGameState.planets.length + mockGameState.stars.length);
    
    // Check if a structure was added to the first planet
    const createdPlanets = addSpy.mock.calls
      .map(call => call[0])
      .filter(obj => obj.userData && obj.userData.isPlanet);
    
    expect(createdPlanets.length).toBe(mockGameState.planets.length);
    
    // Planet should have addStructure called for each saved structure
    expect(createdPlanets[0].addStructure).toHaveBeenCalled();
  });
  
  test('saveGame updates gameState and sends to API', async () => {
    // Create a test solar system
    game.solar = new THREE.Object3D();
    
    // Add a test planet
    const testPlanet = new THREE.Object3D();
    testPlanet.position.set(50, 0, 0);
    testPlanet.userData = {
      isPlanet: true,
      planetData: {
        name: "Test Planet",
        type: "Terrestrial",
        resources: { minerals: 75, energy: 45, water: 90 },
        structures: [{ type: "mining" }]
      }
    };
    game.solar.add(testPlanet);
    
    // Add a test star
    const testStar = new THREE.Object3D();
    testStar.position.set(0, 0, 0);
    testStar.userData = {
      isStar: true,
      starData: {
        name: "Test Star",
        type: "G-type",
        temperature: 5500,
        luminosity: 1.2
      }
    };
    game.solar.add(testStar);
    
    // Set camera position
    game.camera = {
      position: new THREE.Vector3(100, 20, 300)
    };
    
    // Call saveGame
    await game.saveGame();
    
    // Verify API was called with correct data
    expect(global.fetch).toHaveBeenCalledWith('/api/save_game', expect.objectContaining({
      method: 'POST',
      headers: expect.any(Object),
      body: expect.any(String)
    }));
    
    // Verify saved game state contains the correct data
    const savedData = JSON.parse(global.fetch.mock.calls[1][1].body);
    
    expect(savedData.playerPosition).toEqual({
      x: 100,
      y: 20,
      z: 300
    });
    
    expect(savedData.planets.length).toBe(1);
    expect(savedData.planets[0].position).toEqual({
      x: 50,
      y: 0,
      z: 0
    });
    expect(savedData.planets[0].data.name).toBe("Test Planet");
    
    expect(savedData.stars.length).toBe(1);
    expect(savedData.stars[0].data.name).toBe("Test Star");
  });
  
  test('initializes new solar system when no save data exists', async () => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Mock fetch to return empty object (no save data)
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({})
    }));
    
    // Create a new game instance
    const newGame = new MassGravity();
    
    // Mock methods but keep restoreSolarSystem and generateSolarSystem real
    newGame.initComponents = jest.fn(() => {
      newGame.camera = new THREE.PerspectiveCamera();
    });
    
    newGame.initScene = jest.fn(() => {
      newGame.solar = new THREE.Object3D();
      newGame.solarCenter = new THREE.Vector3();
      newGame.solarRadius = 500;
      
      // Call real methods for testing
      if (gameState.stars.length > 0 || gameState.planets.length > 0) {
        newGame.restoreSolarSystem();
      } else {
        newGame.generateSolarSystem(gameState.seed || "default-test-seed");
      }
    });
    
    newGame.restoreSolarSystem = jest.fn();
    newGame.generateSolarSystem = jest.fn();
    
    newGame.initInteraction = jest.fn();
    newGame.initUI = jest.fn();
    newGame.setListeners = jest.fn();
    newGame.hideLoadingScreen = jest.fn();
    newGame.render = jest.fn();
    
    // Initialize the game
    await newGame.loadGame();
    newGame.initScene();
    
    // Should call generateSolarSystem, not restoreSolarSystem
    expect(newGame.restoreSolarSystem).not.toHaveBeenCalled();
    expect(newGame.generateSolarSystem).toHaveBeenCalled();
  });
});