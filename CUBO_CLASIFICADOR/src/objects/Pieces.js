import * as THREE from 'three';
import { PIECE_CONFIGS } from '../data/holeConfigs.js';

// ── Fábrica de geometrías según el tipo de pieza ──
const GEO_BUILDERS = {
    sphere:   (args) => new THREE.SphereGeometry(...args),
    box:      (args) => new THREE.BoxGeometry(...args),

    triangle: ([r, depth]) => {
        const shape = new THREE.Shape();
        for (let i = 0; i < 3; i++) {
            const angle = Math.PI / 2 - (i / 3) * Math.PI * 2;
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
        geo.translate(0, 0, -depth / 2);
        geo.rotateX(-Math.PI / 2);
        return geo;
    },
    rhombus: ([width, height, depth]) => {
        const shape = new THREE.Shape();
        // Rombo centrado en (0, 0)
        shape.moveTo(0, height / 2);
        shape.lineTo(width / 2, 0);
        shape.lineTo(0, -height / 2);
        shape.lineTo(-width / 2, 0);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
        geo.translate(0, 0, -depth / 2);
        geo.rotateX(-Math.PI / 2);
        return geo;
    },
};

/**
 * Crea las piezas geométricas que encajan en los huecos del clasificador.
 * @returns {THREE.Group}
 */
export function createPieces() {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.2,
    });

    for (const cfg of PIECE_CONFIGS) {
        const builder = GEO_BUILDERS[cfg.pieceType];
        if (!builder) {
            console.warn(`Unknown piece type: ${cfg.pieceType}`);
            continue;
        }

        const mesh = new THREE.Mesh(builder(cfg.pieceArgs), mat.clone());
        mesh.material.color.setHex(cfg.pieceColor);
        mesh.position.set(cfg.piecePos.x, cfg.pieceY, cfg.piecePos.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.label = cfg.label;
        mesh.userData.shape = cfg.shape;
        mesh.userData.pieceType = cfg.pieceType;
        mesh.userData.pieceArgs = cfg.pieceArgs;
        mesh.userData.minY = cfg.pieceY;
        mesh.userData.originalPos = new THREE.Vector3(cfg.piecePos.x, cfg.pieceY, cfg.piecePos.z);
        group.add(mesh);
    }

    return group;
}