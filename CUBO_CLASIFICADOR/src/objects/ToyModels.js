import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Carga e instancia los modelos 3D de juguetes (glTF/GLB) en la escena.
 * @returns {THREE.Group}
 */
export function createToyModels() {
    const group = new THREE.Group();
    const loader = new GLTFLoader();

    // 1. Patito de Goma (Duck.glb) - Esquina frontal
    loader.load(
        'src/assets/Duck.glb',
        (gltf) => {
            const duck = gltf.scene;
            duck.scale.set(0.008, 0.008, 0.008);
            duck.position.set(-4.5, 0, 4.5);
            duck.rotation.y = Math.PI / 4;

            duck.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            group.add(duck);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando Duck.glb', err)
    );

    // 2. Milk Truck (CesiumMilkTruck.glb) - Right Rear Corner
    loader.load(
        'src/assets/CesiumMilkTruck.glb',
        (gltf) => {
            const truck = gltf.scene;
            truck.scale.set(0.4, 0.4, 0.4);
            truck.position.set(4.5, 0, -4.5);
            truck.rotation.y = -Math.PI / 4;

            truck.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            group.add(truck);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando CesiumMilkTruck.glb', err)
    );

    return group;
}
