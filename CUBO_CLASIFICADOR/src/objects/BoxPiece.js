import * as THREE from 'three';
import { setupPiece } from './pieceUtils.js';

/**
 * Crea pieza cúbica.
 * @param {object} cfg
 * @returns {THREE.Mesh}
 */
export function createBoxPiece(cfg) {
    const [w, h, d] = cfg.pieceArgs;
    const geometry = new THREE.BoxGeometry(w, h, d);
    return setupPiece(geometry, cfg);
}
