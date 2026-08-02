import * as THREE from 'three';

/**
 * Crea el renderer WebGL con sombras habilitadas.
 * Lanza un error claro en español si el navegador no soporta WebGL (ERR-002),
 * que el catch global de index.js muestra en el loading overlay.
 * @param {HTMLElement} container
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(container) {
    // Detección temprana de soporte WebGL (evita excepciones crípticas de Three.js)
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
        throw new Error('Tu navegador no soporta WebGL. Probá con otro navegador o actualizá el actual.');
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    return renderer;
}