import * as THREE from 'three';
import { setupPiece } from './pieceUtils.js';
// Create the 3D cubic part.
export function createBoxPiece(cfg) {
    const [w, h, d] = cfg.pieceArgs;
    const geometry = new THREE.BoxGeometry(w, h, d);
    return setupPiece(geometry, cfg);
}
