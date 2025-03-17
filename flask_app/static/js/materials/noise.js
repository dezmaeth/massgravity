import * as THREE from 'three';
import { noiseShader } from '../shaders/noise.js';

export function createNoiseMaterial(options = {}) {
    return new THREE.ShaderMaterial({
        uniforms: options.uniforms || {
            time: { type: "f", value: 1.0 },
            scale: { type: "v2", value: new THREE.Vector2(1, 1) },
            offset: { type: "v2", value: new THREE.Vector2(0, 0) }
        },
        vertexShader: noiseShader.vertex,
        fragmentShader: noiseShader.fragment
    });
}