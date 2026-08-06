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
    // Piso: Textura personalizada desde src/assets/piso.jpg
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.1,
    });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'src/assets/piso.jpg',
        (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 4);
            floorMat.map = tex;
            floorMat.needsUpdate = true;
        },
        undefined,
        (err) => {
            console.warn('[Texturas] No se pudo cargar src/assets/piso.jpg, usando color base.', err);
            floorMat.color.setHex(0xd99b53);
        }
    );

    // ── Techo ──
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

    // ── Paredes (4: N, S, E, O) con paleta pastel colorida y textura frontal ──
    const wallGeo = new THREE.PlaneGeometry(size, height);
    const wallConfigs = [
        { rotY: 0,           x: 0,    z: -half, color: 0xc8e6c9, isFront: true }, // Norte (Frontal)
        { rotY: Math.PI,     x: 0,    z:  half, color: 0xbbdefb },                 // Sur
        { rotY: -Math.PI / 2, x: half, z: 0,    color: 0xe1bee7 },                 // Este
        { rotY:  Math.PI / 2, x: -half, z: 0,    color: 0xffecb3 },                 // Oeste
    ];

    for (const cfg of wallConfigs) {
        const wallMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });

        if (cfg.isFront) {
            textureLoader.load(
                'src/assets/pared.avif',
                (tex) => {
                    tex.repeat.set(1, 1);
                    wallMat.map = tex;
                    wallMat.color.setHex(0xffffff);
                    wallMat.needsUpdate = true;
                },
                undefined,
                (err) => {
                    console.warn('[Texturas] No se pudo cargar src/assets/pared.avif, usando color pastel base.', err);
                }
            );
        }

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