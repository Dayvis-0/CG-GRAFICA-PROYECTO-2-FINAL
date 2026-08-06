import * as THREE from 'three';

/**
 * @returns {THREE.Scene}
 */
export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141416);
    return scene;
}