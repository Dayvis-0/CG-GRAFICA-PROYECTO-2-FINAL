import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PHYSICS_CONSTANTS } from '../data/physicsConstants.js';
import { getHalfSize } from '../utils/geometry.js';
import { buildPanelGrid } from './PanelGridBuilder.js';

export function createBodyFactory(world, materials) {
    const meshToBody = new Map();

    function buildPieceShape(mesh) {
        const type = mesh.userData.pieceType;
        const hs = getHalfSize(mesh);

        switch (type) {
            case 'sphere': return new CANNON.Sphere(hs.x);
            case 'box': return new CANNON.Box(new CANNON.Vec3(hs.x, hs.y, hs.z));
            case 'triangle': {
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
                    [0, 2, 1],
                    [3, 4, 5],
                    [1, 4, 3, 0],
                    [2, 5, 4, 1],
                    [0, 3, 5, 2],
                ];
                return new CANNON.ConvexPolyhedron({ vertices, faces });
            }
            case 'rhombus': {
                return new CANNON.Box(new CANNON.Vec3(hs.x * 0.62, hs.y, hs.z * 0.62));
            }
            default: {
                console.warn(`Tipo desconocido "${type}", usando Box`);
                return new CANNON.Box(new CANNON.Vec3(hs.x, hs.y, hs.z));
            }
        }
    }

    function materialForKind(kind) {
        if (kind === 'room-wall') return materials.wall;
        return materials[kind] || materials.piece;
    }

    function registerPiece(mesh, mass = 1) {
        const shape = buildPieceShape(mesh);
        const quat = new CANNON.Quaternion(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);

        const body = new CANNON.Body({
            mass,
            shape,
            material: materials.piece,
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
            quaternion: quat,
        });

        body.linearDamping = PHYSICS_CONSTANTS.LINEAR_DAMPING;
        body.angularDamping = PHYSICS_CONSTANTS.ANGULAR_DAMPING;
        body.allowSleep = true;
        body.sleepSpeedLimit = PHYSICS_CONSTANTS.SLEEP_SPEED_LIMIT;
        body.sleepTimeLimit = PHYSICS_CONSTANTS.SLEEP_TIME_LIMIT;

        world.addBody(body);
        meshToBody.set(mesh, body);
        mesh.userData.body = body;

        return body;
    }

    function registerStatic(mesh, kind, opts = {}) {
        let shape;

        if (kind === 'panel') {
            const compoundBody = buildPanelGrid(mesh, opts, materialForKind(kind));
            world.addBody(compoundBody);
            meshToBody.set(mesh, compoundBody);
            mesh.userData.body = compoundBody;
            return compoundBody;
        } else if (kind === 'ground' || kind === 'room-wall') {
            shape = new CANNON.Plane();
        } else {
            const bbox = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const minDim = opts.minThick ?? PHYSICS_CONSTANTS.MIN_WALL_THICKNESS;
            shape = new CANNON.Box(new CANNON.Vec3(
                Math.max(size.x, minDim) / 2, 
                Math.max(size.y, minDim) / 2, 
                Math.max(size.z, minDim) / 2
            ));
        }

        const body = new CANNON.Body({
            mass: 0,
            shape,
            material: materialForKind(kind),
            type: CANNON.Body.STATIC,
        });

        mesh.updateMatrixWorld(true);
        if (shape instanceof CANNON.Box) {
            const bbox = new THREE.Box3().setFromObject(mesh);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            body.position.set(center.x, center.y, center.z);
        } else {
            const wp = new THREE.Vector3();
            mesh.getWorldPosition(wp);
            body.position.set(wp.x, wp.y, wp.z);
        }
        
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