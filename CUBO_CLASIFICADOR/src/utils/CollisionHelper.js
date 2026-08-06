import * as THREE from 'three';

// Verifica si una posición se encuentra dentro de una caja de colisión.
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

// Verifica si una caja de colisión se intersecta con alguna otra de la lista.
export function intersectsAnyObstacle(candidateBox, obstacleBoxes) {
    for (let i = 0; i < obstacleBoxes.length; i++) {
        if (candidateBox.intersectsBox(obstacleBoxes[i])) return true;
    }
    return false;
}
