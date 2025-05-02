import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const modelCache = {};

/**
 * Load and cache a .glb model by name from /static/js/units/meshes/
 * and apply individual settings for each structure type.
 * @param {string} name - Name of the .glb file without extension
 * @returns {Promise<THREE.Object3D>} - Configured model wrapped in a parent Object3D
 */
export async function loadStructureModel(name) {
    if (modelCache[name]) {
        const cloned = modelCache[name].clone();
        return wrapWithSettings(cloned, name);
    }

    const path = `/static/js/units/meshes/${name}.glb`;

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            path,
            (gltf) => {
                const model = gltf.scene;
                model.traverse(obj => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = false;
                    }
                });

                modelCache[name] = model;
                const cloned = model.clone();
                resolve(wrapWithSettings(cloned, name));
            },
            undefined,
            (error) => reject(`Failed to load model ${name}: ${error}`)
        );
    });
}

function wrapWithSettings(model, name) {
    const settings = getStructureSettings(name);
    const wrapper = new THREE.Object3D();
    wrapper.add(model);

    if (settings.scale) wrapper.scale.set(...settings.scale);
    if (settings.rotation) wrapper.rotation.set(...settings.rotation);

    console.log(`[${name}] wrapper scale set to`, wrapper.scale);
    return wrapper;
}

function getStructureSettings(name) {
    switch (name) {
        case 'station_Minning_1':
            return {
                scale: [0.0125, 0.0125, 0.0125],
                rotation: [90, 0, -1]
            };
        case 'station_ColonyBase_1':
            return {
                scale: [0.015, 0.015, 0.015]
            };
        default:
            return {
                scale: [0.001, 0.001, 0.001]
            };
    }
}
