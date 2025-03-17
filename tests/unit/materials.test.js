/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { createAtmosphereMaterial } from '../../flask_app/static/js/materials/atmosphere.js';
import { createNoiseMaterial } from '../../flask_app/static/js/materials/noise.js';

describe('Material creators', () => {
  describe('createAtmosphereMaterial', () => {
    let material;
    
    beforeEach(() => {
      material = createAtmosphereMaterial();
    });
    
    test('returns a ShaderMaterial', () => {
      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    });
    
    test('has correct uniforms', () => {
      expect(material.uniforms).toHaveProperty('coeficient');
      expect(material.uniforms).toHaveProperty('power');
      expect(material.uniforms).toHaveProperty('glowColor');
      
      // Check types and default values
      expect(material.uniforms.coeficient.value).toBe(0.5);
      expect(material.uniforms.power.value).toBe(2.0);
      expect(material.uniforms.glowColor.value).toBeInstanceOf(THREE.Color);
    });
    
    test('has correct material properties', () => {
      expect(material.side).toBe(THREE.FrontSide);
      expect(material.blending).toBe(THREE.AdditiveBlending);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
    });
    
    test('has vertex and fragment shaders', () => {
      expect(material.vertexShader).toBeDefined();
      expect(material.vertexShader.length).toBeGreaterThan(0);
      expect(material.fragmentShader).toBeDefined();
      expect(material.fragmentShader.length).toBeGreaterThan(0);
    });
  });
  
  describe('createNoiseMaterial', () => {
    let material;
    
    beforeEach(() => {
      material = createNoiseMaterial();
    });
    
    test('returns a ShaderMaterial', () => {
      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    });
    
    test('has correct default uniforms', () => {
      expect(material.uniforms).toHaveProperty('time');
      expect(material.uniforms).toHaveProperty('scale');
      expect(material.uniforms).toHaveProperty('offset');
      
      // Check types
      expect(typeof material.uniforms.time.value).toBe('number');
      expect(material.uniforms.scale.value).toBeInstanceOf(THREE.Vector2);
      expect(material.uniforms.offset.value).toBeInstanceOf(THREE.Vector2);
    });
    
    test('accepts custom uniforms', () => {
      const customUniforms = {
        custom1: { value: 42 },
        custom2: { value: new THREE.Vector3(1, 2, 3) }
      };
      
      const customMaterial = createNoiseMaterial({ uniforms: customUniforms });
      
      expect(customMaterial.uniforms).toHaveProperty('custom1');
      expect(customMaterial.uniforms).toHaveProperty('custom2');
      expect(customMaterial.uniforms.custom1.value).toBe(42);
      expect(customMaterial.uniforms.custom2.value).toEqual(new THREE.Vector3(1, 2, 3));
    });
    
    test('has vertex and fragment shaders', () => {
      expect(material.vertexShader).toBeDefined();
      expect(material.vertexShader.length).toBeGreaterThan(0);
      expect(material.fragmentShader).toBeDefined();
      expect(material.fragmentShader.length).toBeGreaterThan(0);
    });
  });
});