import * as THREE from 'three';
import { setupPiece } from './pieceUtils.js';

// Crea la pieza 3D con forma de rombo.
export function createRhombusPiece(cfg) {
    const [width, height, depth] = cfg.pieceArgs;

    const shape = new THREE.Shape();
    shape.moveTo(0, height / 2);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, -height / 2);
    shape.lineTo(-width / 2, 0);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geometry.translate(0, 0, -depth / 2);
    geometry.rotateX(-Math.PI / 2);

    return setupPiece(geometry, cfg);
}
