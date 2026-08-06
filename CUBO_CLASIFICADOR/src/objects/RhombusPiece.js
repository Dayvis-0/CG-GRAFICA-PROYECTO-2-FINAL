import * as THREE from 'three';

/**
 * Crea una pieza de rombo individual mediante extrusión 2D.
 * @param {object} cfg - Configuración de la pieza
 * @returns {THREE.Mesh}
 */
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
