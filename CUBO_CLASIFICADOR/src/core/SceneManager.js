import * as THREE from 'three';

// Crea y configura la escena principal de Three.js.
export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141416);
    return scene;
}