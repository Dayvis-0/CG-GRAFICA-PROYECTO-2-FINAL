import * as THREE from 'three';

/**
 * Crea una pieza triangular individual mediante extrusión 2D.
 * @param {object} cfg - Configuración de la pieza
 * @returns {THREE.Mesh}
 */
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
