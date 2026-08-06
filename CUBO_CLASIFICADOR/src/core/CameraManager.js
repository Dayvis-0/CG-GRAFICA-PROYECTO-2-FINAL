import * as THREE from 'three';

/**
 * @returns {{ cam: THREE.PerspectiveCamera }}
 */
export function createCamera() {
    const ASP = window.innerWidth / window.innerHeight;

    const cam = new THREE.PerspectiveCamera(70, ASP, 0.1, 100);

    return { cam };
}