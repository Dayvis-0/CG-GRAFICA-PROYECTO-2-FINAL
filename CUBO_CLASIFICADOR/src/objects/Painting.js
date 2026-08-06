import * as THREE from 'three';

/**
 * Crea cuadro decorativo.
 * @returns {THREE.Mesh}
 */
export function createPainting() {
    const geometry = new THREE.PlaneGeometry(3.2, 2.2);
    const texture = new THREE.TextureLoader().load('src/assets/vangoh.jpg');
    const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });

    return new THREE.Mesh(geometry, material);
}
