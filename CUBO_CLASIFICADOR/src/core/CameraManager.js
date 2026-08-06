import * as THREE from 'three';

// Crea la cámara perspectiva principal de la escena.
export function createCamera() {
    const ASP = window.innerWidth / window.innerHeight;

    const cam = new THREE.PerspectiveCamera(70, ASP, 0.1, 100);

    return { cam };
}    // Buggy (Southwest Corner - Height Adjustment for Floor Support)