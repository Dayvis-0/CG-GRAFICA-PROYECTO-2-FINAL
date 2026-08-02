import * as THREE from 'three';

/**
 * Crea la cámara en perspectiva para navegación FPS dentro del cuarto.
 * La cámara se posiciona a altura de ojos (1.6) al inicializar.
 *
 * @returns {{ cam: THREE.PerspectiveCamera }}
 */
export function createCamera() {
    const ASP = window.innerWidth / window.innerHeight;

    const cam = new THREE.PerspectiveCamera(70, ASP, 0.1, 100);
    cam.position.set(5, 1.6, 5);

    return { cam };
}