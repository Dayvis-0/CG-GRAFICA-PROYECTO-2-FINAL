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

// Material compartido para paredes y panel (madera clara)
const BOX_MAT = new THREE.MeshStandardMaterial({
    color: 0xd7a15c,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
});

/**
 * Crea el cubo clasificador HUECO de forma explícita y lineal (estilo Semana 5).
 *
 * @returns {{ group: THREE.Group, walls: THREE.Mesh[], panel: THREE.Mesh }}
 */
export function createClassifier() {
    const group = new THREE.Group();
    const walls = [];

    // --- 1. Suelo del clasificador ---
    const floorGeo = new THREE.BoxGeometry(OUTER, WALL_THICK, OUTER);
    const floor = new THREE.Mesh(floorGeo, BOX_MAT);
    floor.position.y = WALL_THICK / 2;
    floor.receiveShadow = true;
    group.add(floor);
    walls.push(floor);

    // --- 2. Paredes laterales creadas secuencialmente ---
    const W = OUTER, H = WALL_HEIGHT, T = WALL_THICK;
    const halfGap = MID - T / 2;

    // Pared Frontal
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), BOX_MAT);
    frontWall.position.set(0, H / 2, halfGap);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    group.add(frontWall);
    walls.push(frontWall);

    // Pared Trasera
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), BOX_MAT);
    backWall.position.set(0, H / 2, -halfGap);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);
    walls.push(backWall);

    // Pared Izquierda
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(T, H, W), BOX_MAT);
    leftWall.position.set(-halfGap, H / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);
    walls.push(leftWall);

    // Pared Derecha
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(T, H, W), BOX_MAT);
    rightWall.position.set(halfGap, H / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);
    walls.push(rightWall);

    // --- 3. Panel superior con los 4 huecos ---
    const panel = buildTopPanel();
    group.add(panel);

    return { group, walls, panel };
}

// Construcción explícita del panel superior con los 4 huecos
function buildTopPanel() {
    const shape = new THREE.Shape();
    shape.moveTo(-MID, -MID);
    shape.lineTo( MID, -MID);
    shape.lineTo( MID,  MID);
    shape.lineTo(-MID,  MID);
    shape.closePath();

    // Inyección directa y secuencial de cada hueco
    for (const cfg of HOLE_CONFIGS) {
        if (cfg.shape === 'circle') {
            shape.holes.push(circleHole(cfg.cx, cfg.cy, cfg.hole.r));
        } else if (cfg.shape === 'square') {
            shape.holes.push(squareHole(cfg.cx, cfg.cy, cfg.hole.side));
        } else if (cfg.shape === 'triangle') {
            shape.holes.push(triangleHole(cfg.cx, cfg.cy, cfg.hole.r));
        } else if (cfg.shape === 'rhombus') {
            shape.holes.push(rhombusHole(cfg.cx, cfg.cy, cfg.hole.width, cfg.hole.height));
        }
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