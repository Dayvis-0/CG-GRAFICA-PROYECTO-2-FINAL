import * as THREE from 'three';

/**
 * Crea la cámara en perspectiva para navegación FPS dentro del cuarto.
 * La posición inicial la define el modo de cámara (`setCameraMode` en index.js).
 *
 * @returns {{ cam: THREE.PerspectiveCamera }}
 */
export function createCamera() {
    const ASP = window.innerWidth / window.innerHeight;

    const cam = new THREE.PerspectiveCamera(70, ASP, 0.1, 100);

    return { cam };
}