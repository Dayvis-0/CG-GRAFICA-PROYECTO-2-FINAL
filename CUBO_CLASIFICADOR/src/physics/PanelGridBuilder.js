import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { isPointInsideShape } from '../utils/HoleDetector.js';

/**
 * Grilla de Box bodies del panel perforado (SRP-002).
 *
 * CANNON.Trimesh solo soporta colisiones Sphere/Plane vs Trimesh en el
 * narrowphase; las demás formas (Box, Cylinder) se traspasan. En vez de
 * Trimesh, construimos una grilla de CANNON.Box que cubre las partes
 * sólidas del panel y deja huecos vacíos (Box es compatible con TODAS
 * las formas de las piezas).
 */

/**
 * Verifica si un punto (sx, sy) en el espacio del Shape cae dentro de algún hueco.
 * @param {number} sx
 * @param {number} sy
 * @param {Array} holeConfigs
 * @param {number} halfCell
 * @returns {boolean}
 */
function isInsideAnyHole(sx, sy, holeConfigs, halfCell) {
    for (const cfg of holeConfigs) {
        // Márgenes específicos para formas complejas:
        // - Rombo: halfCell * 2.2
        // - Triángulo: halfCell * 2.0 (compensa la grilla cuadrada contra bordes de 30°)
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

/**
 * Construye el body estático compuesto (grilla de Box) del panel perforado.
 * @param {THREE.Mesh} panelMesh — mesh del panel (para bbox)
 * @param {object} opts
 * @param {Array} [opts.holeConfigs] — configs de huecos (para no rellenarlos)
 * @param {number} [opts.gridCellSize=0.25] — tamaño de celda de la grilla
 * @param {object} material — material cannon del panel
 * @returns {CANNON.Body} body compuesto ya con shapes agregados (sin agregar al mundo)
 */
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

    const halfExtent = bsize.x / 2; // mitad del panel en X/Z (shape space ≈ world X/Z)
    const cellSize = opts.gridCellSize || 0.25;
    const halfCell = cellSize / 2;
    const halfDepth = bsize.y / 2; // grosor del panel (Y en world space)
    const holeConfigs = opts.holeConfigs || [];

    // Iteramos en shape space (XY del Shape original)
    // shape (sx, sy) → world offset (sx, 0, -sy) relativo al body center
    for (let sx = -halfExtent + halfCell; sx <= halfExtent - halfCell; sx += cellSize) {
        for (let sy = -halfExtent + halfCell; sy <= halfExtent - halfCell; sy += cellSize) {
            if (isInsideAnyHole(sx, sy, holeConfigs, halfCell)) continue;
            const halfW = cellSize / 2;
            const halfH = cellSize / 2;
            compoundBody.addShape(
                new CANNON.Box(new CANNON.Vec3(halfW, halfDepth, halfH)),
                new CANNON.Vec3(sx, 0, -sy),
            );
        }
    }

    return compoundBody;
}
