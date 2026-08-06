import { isInsideHole } from '../utils/HoleDetector.js';
import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { WALL_HEIGHT } from '../data/classifierDimensions.js';

export function createClassifierRules() {
    function isOverOwnHole(mesh) {
        if (!mesh || mesh.position.y < WALL_HEIGHT - 1.0) return false;

        const cfg = HOLE_CONFIGS.find(c => c.shape === mesh.userData.shape || c.shape === mesh.userData.pieceType || c.label === mesh.userData.label);
        if (!cfg) return false;

        // Ajuste de coordenadas para match con el hueco en 2D
        const sx = mesh.position.x;
        const sy = -mesh.position.z;

        return isInsideHole(sx, sy, cfg);
    }

    return { isOverOwnHole };
}