import * as THREE from 'three';
import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import {
    OUTER,
    WALL_THICK,
    WALL_HEIGHT,
    PANEL_DEPTH,
    MID,
} from '../data/classifierDimensions.js';
import {
    circleHole,
    squareHole,
    triangleHole,
    rhombusHole,
} from '../utils/holeShapes.js';

const BOX_MAT = new THREE.MeshStandardMaterial({
    color: 0xd7a15c,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
});

// Crea el cubo clasificador hueco con paredes y panel.
export function createClassifier() {
    const group = new THREE.Group();
    const walls = [];

    const floorGeo = new THREE.BoxGeometry(OUTER, WALL_THICK, OUTER);
    const floor = new THREE.Mesh(floorGeo, BOX_MAT);
    floor.position.y = WALL_THICK / 2;
    floor.receiveShadow = true;
    group.add(floor);
    walls.push(floor);

    const W = OUTER, H = WALL_HEIGHT, T = WALL_THICK;
    const halfGap = MID - T / 2;

    const wallConfigs = [
        { w: W, d: T, x: 0, z: halfGap }, // Frontal
        { w: W, d: T, x: 0, z: -halfGap }, // Trasera
        { w: T, d: W, x: -halfGap, z: 0 }, // Izquierda
        { w: T, d: W, x: halfGap, z: 0 }, // Derecha
    ];

    for (const cfg of wallConfigs) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, H, cfg.d), BOX_MAT);
        wall.position.set(cfg.x, H / 2, cfg.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
        walls.push(wall);
    }

    const panel = buildTopPanel();
    group.add(panel);

    return { group, walls, panel };
}

function buildTopPanel() {
    const shape = new THREE.Shape();
    shape.moveTo(-MID, -MID);
    shape.lineTo( MID, -MID);
    shape.lineTo( MID,  MID);
    shape.lineTo(-MID,  MID);
    shape.closePath();

    for (const cfg of HOLE_CONFIGS) {
        if (cfg.shape === 'circle') shape.holes.push(circleHole(cfg.cx, cfg.cy, cfg.hole.r));
        else if (cfg.shape === 'square') shape.holes.push(squareHole(cfg.cx, cfg.cy, cfg.hole.side));
        else if (cfg.shape === 'triangle') shape.holes.push(triangleHole(cfg.cx, cfg.cy, cfg.hole.r));
        else if (cfg.shape === 'rhombus') shape.holes.push(rhombusHole(cfg.cx, cfg.cy, cfg.hole.width, cfg.hole.height));
    }

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: PANEL_DEPTH,
        bevelEnabled: false,
    });

    const mesh = new THREE.Mesh(geo, BOX_MAT);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = WALL_HEIGHT;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}