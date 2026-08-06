import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PHYSICS_CONSTANTS } from '../data/physicsConstants.js';
import { getHalfSize } from '../utils/geometry.js';
import { buildPanelGrid } from './PanelGridBuilder.js';

/**
 * Fábrica de cuerpos rígidos cannon-es a partir de meshes Three.
 * Mantiene el mapeo mesh ↔ body en un Map, accesible vía getBody(mesh).
 */
export function createBodyFactory(world, materials) {
    /** @type {Map<THREE.Mesh, CANNON.Body>} */
    const meshToBody = new Map();

    // ─── Helpers ─────────────────────────────────────────────────
    /** Crea la forma cannon correspondiente a cada pieza según pieceType. */
    function buildPieceShape(mesh) {
        const type = mesh.userData.pieceType;
        const hs = getHalfSize(mesh);

        switch (type) {
            case 'sphere': {
                const r = hs.x;
                return new CANNON.Sphere(r);
            }
            case 'box': {
                return new CANNON.Box(new CANNON.Vec3(hs.x, hs.y, hs.z));
            }
            case 'triangle': {
                // Prisma triangular ConvexPolyhedron exacto matching Three.js ExtrudeGeometry 1:1
                const r = hs.x;
                const h = hs.y;
                const s3 = Math.sqrt(3) / 2;
                const vertices = [
                    new CANNON.Vec3(0, h, -r),
                    new CANNON.Vec3(r * s3, h, r / 2),
                    new CANNON.Vec3(-r * s3, h, r / 2),
                    new CANNON.Vec3(0, -h, -r),
                    new CANNON.Vec3(r * s3, -h, r / 2),
                    new CANNON.Vec3(-r * s3, -h, r / 2),
                ];
                const faces = [
                    [0, 2, 1],    // Cara superior (normal apuntando a +Y)
                    [3, 4, 5],    // Cara inferior (normal apuntando a -Y)
                    [1, 4, 3, 0], // Cara lateral 1 (CCW desde fuera)
                    [2, 5, 4, 1], // Cara lateral 2 (CCW desde fuera)
                    [0, 3, 5, 2], // Cara lateral 3 (CCW desde fuera)
                ];
                return new CANNON.ConvexPolyhedron({ vertices, faces });
            }
            case 'rhombus': {
                // Reducimos el tamaño de la caja de colisión física (0.62) para que pase holgadamente
                // a través del hueco físico sin atascarse.
                return new CANNON.Box(new CANNON.Vec3(hs.x * 0.62, hs.y, hs.z * 0.62));
            }
            default: {
                console.warn(`Unknown pieceType "${type}", usando Box fallback`);
                return new CANNON.Box(new CANNON.Vec3(hs.x, hs.y, hs.z));
            }
        }
    }

    /**
     * Material cannon según tipo de cuerpo (para ContactMaterial correcto).
     */
    function materialForKind(kind) {
        if (kind === 'room-wall') return materials.wall;
        return materials[kind] || materials.piece;
    }

    // ─── API pública ────────────────────────────────────────────
    /**
     * Registra una pieza como body dinámico. Sincroniza posición/rotación inicial.
     */
    function registerPiece(mesh, mass = 1) {
        const shape = buildPieceShape(mesh);

        const quat = new CANNON.Quaternion(
            mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w,
        );

        const body = new CANNON.Body({
            mass,
            shape,
            material: materials.piece,
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
            quaternion: quat,
        });

        // Amortiguación suave → eventualmente las piezas se aquietan
        body.linearDamping = PHYSICS_CONSTANTS.LINEAR_DAMPING;
        body.angularDamping = PHYSICS_CONSTANTS.ANGULAR_DAMPING;

        // Sleep: cuerpos quietos no consumen CPU
        body.allowSleep = true;
        body.sleepSpeedLimit = PHYSICS_CONSTANTS.SLEEP_SPEED_LIMIT;
        body.sleepTimeLimit = PHYSICS_CONSTANTS.SLEEP_TIME_LIMIT;

        world.addBody(body);

        meshToBody.set(mesh, body);
        mesh.userData.body = body; // referencia cruzada para acceso rápido

        return body;
    }

    /**
     * Registra un mesh estático (mass = 0).
     *  - 'panel':     Grilla de Box → respeta los huecos del clasificador (compatible con todas las formas)
     *  - 'ground':    Plane  → colisión de piso estable
     *  - 'room-wall': Plane  → paredes del cuarto (PlaneGeometry, sin grosor)
     *  - 'wall':      Box    → paredes del clasificador (BoxGeometry con volumen real)
     *
     * @param {THREE.Mesh} mesh
     * @param {'wall'|'room-wall'|'panel'|'ground'} kind
     * @param {object}                  [opts]
     * @param {number}                  [opts.minThick] — espesor mínimo para
     *   paredes Box ('wall'). Evita dimensiones cero en BoxGeometry.
     * @returns {CANNON.Body}
     */
    function registerStatic(mesh, kind, opts = {}) {
        let shape;

        if (kind === 'panel') {
            // Panel con huecos: grilla de Box bodies (SRP-002) construida por
            // PanelGridBuilder. Box es compatible con TODAS las formas de pieza.
            const compoundBody = buildPanelGrid(mesh, opts, materialForKind(kind));

            world.addBody(compoundBody);
            // Guardamos referencia en el map para consistencia (aunque nadie consulta el panel)
            meshToBody.set(mesh, compoundBody);
            mesh.userData.body = compoundBody;
            return compoundBody;
        } else if (kind === 'ground') {
            // CANNON.Plane es un piso infinito horizontal → más estable que un Box de altura 0
            shape = new CANNON.Plane();
        } else if (kind === 'room-wall') {
            // Las paredes del cuarto son PlaneGeometry (espesor = 0).
            // CANNON.Plane (plano infinito) es la primitiva correcta: no tiene
            // tunneling sin importar la velocidad. El quaternion sincronizado
            // del mesh Three orienta el plano para que el normal apunte hacia
            // el interior del cuarto.
            shape = new CANNON.Plane();
        } else {
            // Paredes del clasificador (BoxGeometry real): Box exacto desde el bounding box del mesh
            const bbox = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            // Evitar dimensiones cero (seguridad) + espesor mínimo anti-tunneling
            const minDim = opts.minThick ?? PHYSICS_CONSTANTS.MIN_WALL_THICKNESS;
            const sx = Math.max(size.x, minDim);
            const sy = Math.max(size.y, minDim);
            const sz = Math.max(size.z, minDim);
            shape = new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2));
        }

        const body = new CANNON.Body({
            mass: 0,
            shape,
            material: materialForKind(kind),
            type: CANNON.Body.STATIC,
        });

        // Sincronizar posición + rotación del mesh → body (world space)
        mesh.updateMatrixWorld(true);
        const wp = new THREE.Vector3();
        mesh.getWorldPosition(wp);
        body.position.set(wp.x, wp.y, wp.z);
        const wq = new THREE.Quaternion();
        mesh.getWorldQuaternion(wq);
        body.quaternion.set(wq.x, wq.y, wq.z, wq.w);

        world.addBody(body);

        meshToBody.set(mesh, body);
        mesh.userData.body = body;

        return body;
    }

    function getBody(mesh) {
        return meshToBody.get(mesh);
    }

    return { registerPiece, registerStatic, getBody };
}