// Funciones geométricas.

import * as THREE from 'three';

// Verifica punto en triángulo.
export function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
    const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
    const c = 1 - a - b;
    return a >= 0 && b >= 0 && c >= 0;
}

/**
 * Obtiene mitad del tamaño de la caja.
 * @param {THREE.Object3D} mesh
 * @returns {THREE.Vector3}
 */
export function getHalfSize(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size.multiplyScalar(0.5);
}
