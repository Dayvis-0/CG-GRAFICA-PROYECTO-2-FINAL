import * as THREE from 'three';
import { teleportPiece } from './pieceUtils.js';
import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { SNAP_DISTANCE, SNAP_MIN_HEIGHT, SNAP_ALIGN_HEIGHT } from '../data/classifierDimensions.js';

/**
 * Snap magnético (SRP-001): atrae la pieza a su hueco si está cerca.
 *
 * La lógica se extrajo del `onDragEnd` de `index.js` y ahora reutiliza
 * `teleportPiece` (DUP-001): la alineación física (posición + quaternion del
 * triángulo + reset de velocidades) es la MISMA que usa el reset/expulsión,
 * por lo que ya no hay dos implementaciones que puedan divergir.
 */

/**
 * Intenta encajar `mesh` en su hueco correspondiente.
 * @param {THREE.Mesh} mesh
 * @returns {boolean} true si la pieza fue atraída
 */
export function snapToHole(mesh) {
    const cfg = HOLE_CONFIGS.find(c => c.shape === mesh.userData.shape || c.shape === mesh.userData.pieceType || c.label === mesh.userData.label);
    if (!cfg) return false;

    // Distancia horizontal (X/Z) al centro de su hueco correspondiente
    const dx = mesh.position.x - cfg.cx;
    const dz = mesh.position.z - (-cfg.cy);
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Solo si está en rango cercano (SNAP_DISTANCE) y arriba de la tapa
    if (dist < SNAP_DISTANCE && mesh.position.y > SNAP_MIN_HEIGHT) {
        // Posición centrada + rotación simétrica perfecta, elevada para centrarse.
        teleportPiece(mesh, new THREE.Vector3(cfg.cx, SNAP_ALIGN_HEIGHT, -cfg.cy));
        console.log(`🧲 Pieza ${mesh.userData.label} atraída y alineada simétricamente a la altura correcta.`);
        return true;
    }
    return false;
}
