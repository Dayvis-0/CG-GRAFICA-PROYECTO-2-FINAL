import * as THREE from 'three';
import { ROOM_MARGIN } from '../data/classifierDimensions.js';

/**
 * Crea el cuarto completo: piso, techo y 4 paredes con sombras y materiales PBR.
 *
 * @param {object} options
 * @param {number} options.size       - Ancho/profundidad del cuarto (default 10)
 * @param {number} options.height     - Altura del cuarto (default 5)
 * @returns {THREE.Group}
 */
export function createRoom({ size = 14, height = 8 } = {}) {
    const group = new THREE.Group();
    const half = size / 2;

    // ── Materiales PBR coloridos y armonizados ──
    // Piso: Madera cálida brillante / parquet dorado
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0xd99b53,
        roughness: 0.4,
        metalness: 0.1,
    });

    // Techo: Lavanda suave / crema pastel
    const ceilMat = new THREE.MeshStandardMaterial({
        color: 0xf3e5f5,
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide,
    });

    // ── Piso ──
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    group.add(floor);

    // ── Techo ──
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        ceilMat
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    // ── Paredes (4: N, S, E, O) con paleta pastel colorida ──
    const wallGeo = new THREE.PlaneGeometry(size, height);
    const wallConfigs = [
        { rotY: 0,           x: 0,    z: -half, color: 0xc8e6c9 }, // Norte: Verde menta pastel
        { rotY: Math.PI,     x: 0,    z:  half, color: 0xbbdefb }, // Sur: Azul celeste pastel
        { rotY: -Math.PI / 2, x: half, z: 0,    color: 0xe1bee7 }, // Este: Lavanda pastel
        { rotY:  Math.PI / 2, x: -half, z: 0,    color: 0xffecb3 }, // Oeste: Amarillo crema pastel
    ];

    for (const cfg of wallConfigs) {
        const wallMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(cfg.x, height / 2, cfg.z);
        wall.rotation.y = cfg.rotY;
        wall.castShadow = false;
        wall.receiveShadow = false;
        group.add(wall);
    }

    // Guardar límites para colisión de cámara
    group.userData = {
        bounds: { half, height, margin: ROOM_MARGIN },
    };

    return group;
}