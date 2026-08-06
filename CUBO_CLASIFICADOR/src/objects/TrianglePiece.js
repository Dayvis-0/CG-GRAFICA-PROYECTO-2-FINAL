import * as THREE from 'three';
import { setupPiece } from './pieceUtils.js';

// Crea la pieza 3D con forma triangular.
export function createTrianglePiece(cfg) {
    const [r, depth] = cfg.pieceArgs;

    const shape = new THREE.Shape();
    for (let i = 0; i < 3; i++) {
        const angle = Math.PI / 2 - (i / 3) * Math.PI * 2;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geometry.translate(0, 0, -depth / 2);
    geometry.rotateX(-Math.PI / 2);

    return setupPiece(geometry, cfg);
}
