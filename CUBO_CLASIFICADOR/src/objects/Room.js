import * as THREE from 'three';
import { ROOM_MARGIN } from '../data/classifierDimensions.js';
import { createPainting } from './Painting.js';

// Crea la habitación completa con piso, techo y paredes.
export function createRoom({ size = 14, height = 8 } = {}) {
    const group = new THREE.Group();
    const half = size / 2;

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
        (err) => floorMat.color.setHex(0xd99b53)
    );

    const ceilMat = new THREE.MeshStandardMaterial({
        color: 0xf3e5f5,
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    const wallGeo = new THREE.PlaneGeometry(size, height);
    const wallConfigs = [
        { rotY: 0, x: 0, z: -half, color: 0xc8e6c9, texture: 'src/assets/pared.avif' }, // Norte
        { rotY: Math.PI, x: 0, z: half, color: 0xbbdefb, texture: 'src/assets/pared1.jpg' }, // Sur
        { rotY: -Math.PI / 2, x: half, z: 0, color: 0xffecb3 }, // Este
        { rotY: Math.PI / 2, x: -half, z: 0, color: 0xffecb3 }, // Oeste
    ];

    for (const cfg of wallConfigs) {
        const wallMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });

        if (cfg.texture) {
            textureLoader.load(
                cfg.texture,
                (tex) => {
                    wallMat.map = tex;
                    wallMat.color.setHex(0xffffff);
                    wallMat.needsUpdate = true;
                },
                undefined,
                (err) => {} // fallback a color base
            );
        }

        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(cfg.x, height / 2, cfg.z);
        wall.rotation.y = cfg.rotY;
        group.add(wall);
    }

    const painting = createPainting();
    painting.position.set(half - 0.06, height / 2, 0);
    painting.rotation.y = -Math.PI / 2;
    group.add(painting);

    group.userData = { bounds: { half, height, margin: ROOM_MARGIN } };

    return group;
}