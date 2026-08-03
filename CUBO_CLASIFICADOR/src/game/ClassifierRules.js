import { isInsideHole } from '../utils/HoleDetector.js';
import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { WALL_HEIGHT } from '../data/classifierDimensions.js';

/**
 * Reglas del juego: determina si una pieza está sobre su hueco correspondiente.
 * Separado del DragManager y de la física — pura lógica de negocio.
 */
export function createClassifierRules() {

    /**
     * ¿La pieza está justo sobre el hueco que le corresponde?
     * @param {THREE.Mesh} mesh
     * @returns {boolean}
     */
    function isOverOwnHole(mesh) {
        if (!mesh || mesh.position.y < WALL_HEIGHT - 1.0) return false;

        const cfg = HOLE_CONFIGS.find(c => c.shape === mesh.userData.shape || c.shape === mesh.userData.pieceType || c.label === mesh.userData.label);
        if (!cfg) return false;

        // Convertir posición mundial a coordenadas del Shape (shape_Y → -world_Z)
        const sx = mesh.position.x;
        const sy = -mesh.position.z;

        return isInsideHole(sx, sy, cfg);
    }

    return { isOverOwnHole };
}