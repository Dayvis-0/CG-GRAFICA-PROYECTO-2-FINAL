/**
 * Funciones geométricas compartidas entre múltiples módulos.
 * Fuente única — los llamadores aplican su propia tolerancia expandiendo
 * las coordenadas antes de llamar a estas funciones.
 */

import * as THREE from 'three';

/**
 * Determina si un punto (px, py) está dentro de un triángulo dado.
 * Tolerancia estricta (>= 0) — el llamador expande el triángulo si necesita margen.
 */
export function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
    const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
    const c = 1 - a - b;
    return a >= 0 && b >= 0 && c >= 0;
}

/**
 * Half-size del bounding box de un mesh (DUP-008).
 * La geometría no cambia en runtime: los llamadores cachean el resultado
 * (WeakMap) si lo consultan por frame.
 * @param {THREE.Object3D} mesh
 * @returns {THREE.Vector3}
 */
export function getHalfSize(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size.multiplyScalar(0.5);
}
