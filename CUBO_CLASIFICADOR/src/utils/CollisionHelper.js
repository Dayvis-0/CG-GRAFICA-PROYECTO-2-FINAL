import * as THREE from 'three';

/**
 * Helper centralizado para consultas y comprobaciones de colisión AABB.
 * Evita duplicar lógica de intersección de cajas en múltiples módulos.
 */

/**
 * Comprueba si un punto/vector está dentro de una caja AABB expandida por un margen.
 *
 * @param {THREE.Vector3|{x:number, y:number, z:number}} pos
 * @param {THREE.Box3} box
 * @param {number} [margin=0]
 * @returns {boolean}
 */
export function isPointInsideBox(pos, box, margin = 0) {
    return (
        pos.x >= box.min.x - margin &&
        pos.x <= box.max.x + margin &&
        pos.y >= box.min.y - margin &&
        pos.y <= box.max.y + margin &&
        pos.z >= box.min.z - margin &&
        pos.z <= box.max.z + margin
    );
}

/**
 * Comprueba si una caja AABB candidata intersecta alguna caja de una lista de obstáculos.
 *
 * @param {THREE.Box3} candidateBox
 * @param {THREE.Box3[]} obstacleBoxes
 * @returns {boolean}
 */
export function intersectsAnyObstacle(candidateBox, obstacleBoxes) {
    for (let i = 0; i < obstacleBoxes.length; i++) {
        if (candidateBox.intersectsBox(obstacleBoxes[i])) return true;
    }
    return false;
}
