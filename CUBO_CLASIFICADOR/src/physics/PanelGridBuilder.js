import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { isPointInsideShape } from '../utils/HoleDetector.js';

function isInsideAnyHole(sx, sy, holeConfigs, halfCell) {
    for (const cfg of holeConfigs) {
        let m = halfCell;
        if (cfg.shape === 'rhombus') {
            m = halfCell * 2.2;
        } else if (cfg.shape === 'triangle') {
            m = halfCell * 2.0;
        }
        if (isPointInsideShape(sx, sy, cfg, m)) return true;
    }
    return false;
}

export function buildPanelGrid(panelMesh, opts, material) {
    const bbox = new THREE.Box3().setFromObject(panelMesh);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    const bsize = new THREE.Vector3();
    bbox.getSize(bsize);

    const compoundBody = new CANNON.Body({
        mass: 0,
        material,
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(center.x, center.y, center.z),
    });

    const halfExtent = bsize.x / 2;
    const cellSize = opts.gridCellSize || 0.25;
    const halfCell = cellSize / 2;
    const halfDepth = bsize.y / 2;
    const holeConfigs = opts.holeConfigs || [];

    for (let sx = -halfExtent + halfCell; sx <= halfExtent - halfCell; sx += cellSize) {
        for (let sy = -halfExtent + halfCell; sy <= halfExtent - halfCell; sy += cellSize) {
            if (isInsideAnyHole(sx, sy, holeConfigs, halfCell)) continue;
            compoundBody.addShape(
                new CANNON.Box(new CANNON.Vec3(halfCell, halfDepth, halfCell)),
                new CANNON.Vec3(sx, 0, -sy),
            );
        }
    }

    return compoundBody;
}
