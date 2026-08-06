import { pointInTriangle } from './geometry.js';

export const HOLE_TOLERANCE = 0.1;

// Comprueba matemáticamente si un punto en 2D está dentro de la figura geométrica (círculo, cuadrado, triángulo o rombo).
export function isPointInsideShape(sx, sy, cfg, margin) {
    // Evalúa la posición según la fórmula geométrica de cada tipo de agujero
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

// Determina si una pieza cayó dentro del agujero aplicando un margen de tolerancia.
export function isInsideHole(sx, sy, cfg) {
    return isPointInsideShape(sx, sy, cfg, HOLE_TOLERANCE);
}