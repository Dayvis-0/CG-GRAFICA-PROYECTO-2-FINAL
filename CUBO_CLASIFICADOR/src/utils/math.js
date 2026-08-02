/**
 * Utilidades matemáticas y de clamping compartidas.
 */

/**
 * Restringe una posición 3D (Vector3 o {x,y,z}) dentro de unos límites (bounds).
 *
 * @param {{ x: number, z: number }} pos - Posición a restringir
 * @param {{ half: number, margin?: number }} bounds - Límites del cuarto
 * @param {{ x?: number, z?: number }} [padding={}] - Offset o half-size adicional por eje
 * @returns {{ x: number, z: number }}
 */
export function clampToBounds(pos, bounds, padding = {}) {
    const half = bounds.half ?? bounds.limit ?? 7;
    const margin = bounds.margin ?? 0.5;
    const px = padding.x ?? 0;
    const pz = padding.z ?? 0;

    const limitX = half - margin - px;
    const limitZ = half - margin - pz;

    pos.x = Math.max(-limitX, Math.min(limitX, pos.x));
    pos.z = Math.max(-limitZ, Math.min(limitZ, pos.z));

    return pos;
}
