import * as THREE from 'three';

/**
 * Crea el cuarto completo: piso, techo y 4 paredes con sombras y materiales PBR.
 *
 * @param {object} options
 * @param {number} options.size       - Ancho/profundidad del cuarto (default 10)
 * @param {number} options.height     - Altura del cuarto (default 5)
 * @param {function} [buildMaterial]  - Fábrica de materiales (opcional, DUP-004)
 * @returns {THREE.Group}
 */
export function createRoom({ size = 14, height = 8 } = {}, buildMaterial = null) {
    const group = new THREE.Group();
    const half = size / 2;

    // ── Materiales PBR con sombras ──
    // Piso: Madera clara / pino suave
    const floorMat = buildMaterial
        ? buildMaterial('standard', 0xe3c193)
        : new THREE.MeshStandardMaterial({
            color: 0xe3c193,
            roughness: 0.6,
            metalness: 0.0,
        });

    // Paredes: Blanco crema / vainilla cálido (DoubleSide para ver desde dentro)
    const wallMat = buildMaterial
        ? buildMaterial('standard', 0xfcfbf4)
        : new THREE.MeshStandardMaterial({
            color: 0xfcfbf4,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });
    if (buildMaterial) wallMat.side = THREE.DoubleSide;

    // Techo: Blanco limpio
    const ceilMat = buildMaterial
        ? buildMaterial('standard', 0xffffff)
        : new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });
    if (buildMaterial) ceilMat.side = THREE.DoubleSide;

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

    // ── Paredes (4: N, S, E, O) en loop ──
    const wallGeo = new THREE.PlaneGeometry(size, height);
    // Cada config: { rotY, x, z }
    const wallConfigs = [
        { rotY: 0,           x: 0,    z: -half },  // north
        { rotY: Math.PI,     x: 0,    z:  half },  // south
        { rotY: -Math.PI / 2, x: half, z: 0 },     // east
        { rotY:  Math.PI / 2, x: -half, z: 0 },    // west
    ];

    for (const cfg of wallConfigs) {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(cfg.x, height / 2, cfg.z);
        wall.rotation.y = cfg.rotY;
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
    }

    // Guardar límites para colisión de cámara
    group.userData = {
        bounds: { half, height, margin: 0.5 },
    };

    return group;
}