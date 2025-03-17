# Mass Gravity Tests

This directory contains tests for the Mass Gravity game.

## Test Structure

- `unit/`: Contains unit tests for individual components
- `integration/`: Contains integration tests that test how components work together

## Running Tests

Run all tests:
```
npm test
```

Run tests in watch mode (tests will automatically rerun when files change):
```
npm run test:watch
```

Run a specific test file:
```
npm test -- tests/unit/planet.test.js
```

## Test Coverage

The tests cover the following features:

### Core Components
- Planet class
- Star class
- UI system
- Game class

### Key Features
- Planet and star rendering
- Atmosphere and cloud effects
- Orbital structures
- Camera interaction
- Double-click to zoom out
- Game state save/load

## Writing New Tests

When adding new features, please follow these guidelines for writing tests:

1. Write unit tests for individual components in the `unit/` directory
2. Write integration tests for feature interactions in the `integration/` directory
3. Mock external dependencies like THREE.js as needed
4. Use descriptive test names that explain what's being tested
5. Follow the Arrange-Act-Assert pattern in your tests

Example:
```javascript
test('should do something specific', () => {
  // Arrange - set up test conditions
  const object = new MyObject();
  
  // Act - perform the action being tested
  object.doSomething();
  
  // Assert - verify the results
  expect(object.property).toBe(expectedValue);
});
```

## Test Environment

Tests run in a JSDOM environment, which simulates a browser environment. This allows testing DOM interactions and browser APIs.

For WebGL-specific features, appropriate mocks are provided to simulate Three.js behavior without requiring a real WebGL context.