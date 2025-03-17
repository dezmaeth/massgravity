import * as THREE from 'three';
import { atmosphereShader } from '../shaders/atmosphere.js';

export function createAtmosphereMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            coeficient: {
                type: "f",
                value: 0.5
            },
            power: {
                type: "f",
                value: 2.0
            },
            glowColor: {
                type: "c",
                value: new THREE.Color('red')
            }
        },
        vertexShader: atmosphereShader.vertex,
        fragmentShader: atmosphereShader.fragment,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
}