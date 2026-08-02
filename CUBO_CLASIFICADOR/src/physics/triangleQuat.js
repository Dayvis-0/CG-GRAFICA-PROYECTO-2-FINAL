import * as THREE from 'three';

/**
 * Desfase de +90° en Y del cuerpo físico del triángulo (DUP-002).
 *
 * El `CANNON.Cylinder(3)` genera su primer vértice en +X, pero el triángulo
 * visual (Pieces.js) tiene el "top" apuntando a -Z tras rotateX(-PI/2).
 * Sin este desfase, el collision body entra desalineado al hueco.
 * Equivale al quaternion (0, √2/2, 0, √2/2).
 *
 * ÚNICA fuente de verdad: BodyFactory (registro), PhysicsSystem (sincronización
 * mesh↔body) e index.js (snap) la consumen para que visual y física no divergan.
 */
export const TRIANGLE_QUAT_OFFSET = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 2,
);

/** Convierte cualquier quaternion con x/y/z/w (THREE o CANNON) a THREE.Quaternion. */
function toThreeQuat(q) {
    return new THREE.Quaternion(q.x, q.y, q.z, q.w);
}

/**
 * Quaternion del body CANNON a partir del quaternion visual del mesh:
 * `meshQuat * offset(+90°)`. Usar al ESCRIBIR en el body.
 * Acepta tanto THREE.Quaternion como CANNON.Quaternion.
 * @param {THREE.Quaternion|CANNON.Quaternion} meshQuat
 * @returns {THREE.Quaternion}
 */
export function quatMeshToBody(meshQuat) {
    return toThreeQuat(meshQuat).multiply(TRIANGLE_QUAT_OFFSET);
}

/**
 * Quaternion visual del mesh a partir del quaternion del body CANNON:
 * `bodyQuat * offset(-90°)`. Usar al LEER del body.
 * @param {CANNON.Quaternion|THREE.Quaternion} bodyQuat
 * @returns {THREE.Quaternion}
 */
export function quatBodyToMesh(bodyQuat) {
    return toThreeQuat(bodyQuat).multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2),
    );
}
