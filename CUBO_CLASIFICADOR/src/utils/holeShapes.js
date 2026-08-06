import { Path } from 'three';

// Crea el trazado 2D de un hueco circular.
export function circleHole(cx, cy, r) {
    const path = new Path();
    path.absarc(cx, cy, r, 0, Math.PI * 2, true);
    return path;
}

// Crea el trazado 2D de un hueco cuadrado.
export function squareHole(cx, cy, side) {
    const half = side / 2;
    const path = new Path();
    path.moveTo(cx - half, cy - half);
    path.lineTo(cx + half, cy - half);
    path.lineTo(cx + half, cy + half);
    path.lineTo(cx - half, cy + half);
    path.closePath();
    return path;
}

// Crea el trazado 2D de un hueco triangular.
export function triangleHole(cx, cy, r) {
    const path = new Path();
    const s32 = 0.86602540378;
    const EPS = 0.001;

    path.moveTo(cx, cy + r);
    path.lineTo(cx + r * s32, cy - r / 2);
    path.lineTo(cx, cy - r / 2 + EPS);
    path.lineTo(cx - r * s32, cy - r / 2);
    path.closePath();
    return path;
}

// Crea el trazado 2D de un hueco en forma de rombo.
export function rhombusHole(cx, cy, width, height) {
    const hw = width / 2;
    const hh = height / 2;
    const path = new Path();
    path.moveTo(cx, cy + hh);
    path.lineTo(cx + hw, cy);
    path.lineTo(cx, cy - hh);
    path.lineTo(cx - hw, cy);
    path.closePath();
    return path;
}

