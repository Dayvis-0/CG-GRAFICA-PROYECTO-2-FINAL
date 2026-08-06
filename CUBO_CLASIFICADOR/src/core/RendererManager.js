import * as THREE from 'three';

// Crea y configura el renderizador WebGL de la escena.
export function createRenderer(container) {
    // Verifica soporte WebGL.
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