// Utilidades matemáticas.

import { ROOM_MARGIN } from '../data/classifierDimensions.js';

/**
 * Restringe posición 3D.
 *
 * @param {{ x: number, y?: number, z: number }} pos - Posición a restringir
 * @param {{ half: number, margin?: number, height?: number }} bounds - Límites
 * @param {{ x?: number, y?: number, z?: number }} [padding={}] - Espacio extra
 * @returns {{ x: number, y?: number, z: number }}
 */
export function clampToBounds(pos, bounds, padding = {}) {
    const half = bounds.half ?? bounds.limit ?? 7;
    const margin = bounds.margin ?? ROOM_MARGIN;
    const px = padding.x ?? 0;
    const pz = padding.z ?? 0;

    const limitX = half - margin - px;
    const limitZ = half - margin - pz;

    pos.x = Math.max(-limitX, Math.min(limitX, pos.x));
    pos.z = Math.max(-limitZ, Math.min(limitZ, pos.z));

    if (padding.y !== undefined && bounds.height !== undefined) {
        const limitY = bounds.height - margin - padding.y;
        pos.y = Math.min(limitY, pos.y);
    }

    return pos;
}
