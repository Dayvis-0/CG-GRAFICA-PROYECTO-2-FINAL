import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Upload all children's decorative 3D models (Fox, Buggy, BarramundiFish, Dragon, MilkTruck) in the corners and free areas of the room.
export function createToyModels(onToyLoaded) {
    const group = new THREE.Group();
    const loader = new GLTFLoader();

    const notifyLoaded = (obj) => {
        if (typeof onToyLoaded === 'function') {
            onToyLoaded(obj);
        }
    };

    // Zorrito de Juguete (Esquina Sudeste)
    loader.load(
        'src/assets/Fox.glb',
        (gltf) => {
            const fox = gltf.scene;
            fox.scale.set(0.015, 0.015, 0.015);
            fox.position.set(5.2, 0, 5.2);
            fox.rotation.y = -Math.PI * 0.75;
            fox.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

            // Ajusta la altura del zorro al nivel del piso antes de notificar la carga
            const box = new THREE.Box3().setFromObject(fox);
            fox.position.y = -box.min.y;

            group.add(fox);
            notifyLoaded(fox);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando Fox.glb', err)
    );

    // Camioncito de Leche (Esquina Noroeste)
    loader.load(
        'src/assets/CesiumMilkTruck.glb',
        (gltf) => {
            const truck = gltf.scene;
            truck.scale.set(0.4, 0.4, 0.4);
            truck.position.set(-5.2, 0, -5.2);
            truck.rotation.y = Math.PI / 4;
            truck.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            group.add(truck);
            notifyLoaded(truck);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando CesiumMilkTruck.glb', err)
    );

    // Carrito Buggy (Esquina Sudoeste - Ajuste de altura para apoyar en el piso)
    loader.load(
        'src/assets/Buggy.glb',
        (gltf) => {
            const buggy = gltf.scene;
            buggy.scale.set(0.015, 0.015, 0.015);
            buggy.position.set(-5.2, 0, 5.2);
            buggy.rotation.y = Math.PI / 4;
            buggy.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            
            // Ajusta la altura dinámicamente para que la base del auto apoye exacto en el piso
            const box = new THREE.Box3().setFromObject(buggy);
            buggy.position.y = -box.min.y;

            group.add(buggy);
            notifyLoaded(buggy);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando Buggy.glb', err)
    );

    // Pescadito de Adorno (Esquina Noreste)
    loader.load(
        'src/assets/BarramundiFish.glb',
        (gltf) => {
            const fish = gltf.scene;
            fish.scale.set(0.003, 0.003, 0.003);
            fish.position.set(5.2, 0.8, -5.2);
            fish.rotation.y = -Math.PI / 3;
            fish.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            group.add(fish);
            notifyLoaded(fish);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando BarramundiFish.glb', err)
    );

    return group;
}
