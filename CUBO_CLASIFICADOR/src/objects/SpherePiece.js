import * as THREE from 'three';
import { setupPiece } from './pieceUtils.js';

/**
 * Crea pieza esférica.
 * @param {object} cfg
 * @returns {THREE.Mesh}
 */
export function createSpherePiece(cfg) {
    const geometry = new THREE.SphereGeometry(cfg.pieceArgs[0], 32, 32);
    return setupPiece(geometry, cfg);
}
