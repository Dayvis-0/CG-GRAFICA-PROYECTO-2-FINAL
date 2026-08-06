import * as THREE from 'three';
import { teleportPiece } from './pieceUtils.js';
import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { SNAP_DISTANCE, SNAP_MIN_HEIGHT, SNAP_ALIGN_HEIGHT } from '../data/classifierDimensions.js';

export function snapToHole(mesh) {
    const cfg = HOLE_CONFIGS.find(c => c.shape === mesh.userData.shape || c.shape === mesh.userData.pieceType || c.label === mesh.userData.label);
    if (!cfg) return false;

    const dx = mesh.position.x - cfg.cx;
    const dz = mesh.position.z - (-cfg.cy);
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < SNAP_DISTANCE && mesh.position.y > SNAP_MIN_HEIGHT) {
        teleportPiece(mesh, new THREE.Vector3(cfg.cx, SNAP_ALIGN_HEIGHT, -cfg.cy));
        return true;
    }
    return false;
}
