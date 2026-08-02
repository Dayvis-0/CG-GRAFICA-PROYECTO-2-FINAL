import * as THREE from 'three';

/**
 * Crea la escena base con fondo oscuro.
 * @returns {THREE.Scene}
 */
export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141416);
    return scene;
}