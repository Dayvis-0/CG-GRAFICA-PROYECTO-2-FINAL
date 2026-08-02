import * as THREE from 'three';

/**
 * Crea el renderer WebGL con sombras habilitadas.
 * @param {HTMLElement} container
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    return renderer;
}