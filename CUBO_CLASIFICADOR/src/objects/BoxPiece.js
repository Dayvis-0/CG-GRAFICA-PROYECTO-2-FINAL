import * as THREE from 'three';

/**
 * Crea una pieza cúbica individual.
 * @param {object} cfg - Configuración de la pieza
 * @returns {THREE.Mesh}
 */
export function createBoxPiece(cfg) {
    const [w, h, d] = cfg.pieceArgs;
    const geometry = new THREE.BoxGeometry(w, h, d);

    const material = new THREE.MeshStandardMaterial({
        color: cfg.pieceColor,
        roughness: 0.3,
        metalness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(cfg.piecePos.x, cfg.pieceY, cfg.piecePos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Metadatos para físicas e interacción
    mesh.userData.label = cfg.label;
    mesh.userData.shape = cfg.shape;
    mesh.userData.pieceType = cfg.pieceType;
    mesh.userData.pieceArgs = cfg.pieceArgs;
    mesh.userData.minY = cfg.pieceY;
    mesh.userData.originalPos = new THREE.Vector3(cfg.piecePos.x, cfg.pieceY, cfg.piecePos.z);

    return mesh;
}
