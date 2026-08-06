import { isInsideHole } from '../utils/HoleDetector.js';
import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { WALL_HEIGHT } from '../data/classifierDimensions.js';

// Contiene las reglas del juego para saber si una pieza coincide con su hueco.
export function createClassifierRules() {
    // Comprueba si la pieza está ubicada justo encima del hueco correcto correspondiente a su forma.
    function isOverOwnHole(mesh) {
        if (!mesh || mesh.position.y < WALL_HEIGHT - 1.0) return false;

        const cfg = HOLE_CONFIGS.find(c => c.shape === mesh.userData.shape || c.shape === mesh.userData.pieceType || c.label === mesh.userData.label);
        if (!cfg) return false;

        // Ajuste de coordenadas 2D y verificación de si la pieza cayó exactamente en su hueco
        const sx = mesh.position.x;
        const sy = -mesh.position.z;

        return isInsideHole(sx, sy, cfg);
    }

    return { isOverOwnHole };
}