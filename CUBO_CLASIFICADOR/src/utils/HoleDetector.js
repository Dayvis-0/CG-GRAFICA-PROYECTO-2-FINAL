import { pointInTriangle } from './geometry.js';

// Tolerancia para que el usuario no necesite precisión milimétrica
export const HOLE_TOLERANCE = 0.1;

/**
 * Valida matemáticamente si el punto (sx, sy) está dentro de una forma con un margen dado.
 * Centraliza la lógica de colisión geométrica 2D (DRY).
 *
 * @param {number} sx
 * @param {number} sy
 * @param {object} cfg    — Configuración de la forma
 * @param {number} margin — Margen de expansión/tolerancia de la forma
 * @returns {boolean}
 */
export function isPointInsideShape(sx, sy, cfg, margin) {
    switch (cfg.shape) {
        case 'circle': {
            const dx = sx - cfg.cx, dy = sy - cfg.cy;
            const r = cfg.hole.r + margin;
            return (dx * dx + dy * dy) < r * r;
        }
        case 'square': {
            const h = cfg.hole.side / 2 + margin;
            return Math.abs(sx - cfg.cx) < h && Math.abs(sy - cfg.cy) < h;
        }
        case 'triangle': {
            const r = cfg.hole.r + margin;
            const s32 = 0.86602540378;
            const ax = cfg.cx, ay = cfg.cy + r;
            const bx = cfg.cx + r * s32, by = cfg.cy - r / 2;
            const cx2 = cfg.cx - r * s32, cy2 = cfg.cy - r / 2;
            return pointInTriangle(sx, sy, ax, ay, bx, by, cx2, cy2);
        }
        case 'rhombus': {
            const hw = cfg.hole.width / 2 + margin;
            const hh = cfg.hole.height / 2 + margin;
            const dx = Math.abs(sx - cfg.cx);
            const dy = Math.abs(sy - cfg.cy);
            return (dx / hw + dy / hh) < 1;
        }
        case 'rect': {
            return Math.abs(sx - cfg.cx) < cfg.hole.w / 2 + margin
                && Math.abs(sy - cfg.cy) < cfg.hole.h / 2 + margin;
        }
        default:
            console.warn(`isPointInsideShape: forma desconocida "${cfg.shape}"`);
            return false;
    }
}

/**
 * Determina si un punto (sx, sy) en coordenadas del Shape cae dentro de un hueco configurado.
 *
 * @param {number} sx
 * @param {number} sy
 * @param {object} cfg — entrada de HOLE_CONFIGS
 * @returns {boolean}
 */
export function isInsideHole(sx, sy, cfg) {
    return isPointInsideShape(sx, sy, cfg, HOLE_TOLERANCE);
}