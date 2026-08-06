import * as THREE from 'three';

// Configura el material, posición y metadatos de una pieza.
export function setupPiece(geometry, cfg) {
    const material = new THREE.MeshStandardMaterial({
        color: cfg.pieceColor,
        roughness: 0.3,
        metalness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(cfg.piecePos.x, cfg.pieceY, cfg.piecePos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
        label: cfg.label,
        shape: cfg.shape,
        pieceType: cfg.pieceType,
        pieceArgs: cfg.pieceArgs,
        minY: cfg.pieceY,
        originalPos: new THREE.Vector3(cfg.piecePos.x, cfg.pieceY, cfg.piecePos.z)
    };

    return mesh;
}
