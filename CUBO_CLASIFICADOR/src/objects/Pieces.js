import * as THREE from 'three';
import { PIECE_CONFIGS } from '../data/holeConfigs.js';
import { createSpherePiece } from './SpherePiece.js';
import { createBoxPiece } from './BoxPiece.js';
import { createTrianglePiece } from './TrianglePiece.js';
import { createRhombusPiece } from './RhombusPiece.js';

/**
 * Agrupa todas las piezas.
 * @returns {THREE.Group}
 */
export function createPieces() {
    const group = new THREE.Group();

    for (const cfg of PIECE_CONFIGS) {
        let pieceMesh;
        if (cfg.pieceType === 'sphere') pieceMesh = createSpherePiece(cfg);
        else if (cfg.pieceType === 'box') pieceMesh = createBoxPiece(cfg);
        else if (cfg.pieceType === 'triangle') pieceMesh = createTrianglePiece(cfg);
        else if (cfg.pieceType === 'rhombus') pieceMesh = createRhombusPiece(cfg);

        if (pieceMesh) group.add(pieceMesh);
    }

    return group;
}