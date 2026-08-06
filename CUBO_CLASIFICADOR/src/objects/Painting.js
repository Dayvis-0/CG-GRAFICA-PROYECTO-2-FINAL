import * as THREE from 'three';

/**
 * Create the simplified decorative picture (Canvas with the image of Van Gogh).
 * @returns {THREE.Mesh}
 */
export function createPainting() {
    const geometry = new THREE.PlaneGeometry(3.2, 2.2);
    const texture = new THREE.TextureLoader().load('src/assets/vangoh.jpg');
    const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
}
