import { quatMeshToBody } from '../physics/triangleQuat.js';

/**
 * Utilidades de piezas (DUP-001 + SRP-001): lógica de reubicación compartida
 * por el reset, la expulsión por infracción y el snap magnético.
 */

/**
 * Reubica una pieza en `pos`: visual + física + reset de velocidades.
 * El triángulo usa el desfase centralizado (DUP-002) para que el cuerpo
 * físico quede como lo registra BodyFactory y la sincronización visual
 * no lo rote.
 * @param {THREE.Mesh} mesh
 * @param {THREE.Vector3} pos
 */
export function teleportPiece(mesh, pos) {
    mesh.position.copy(pos);
    mesh.quaternion.identity();

    const body = mesh.userData.body;
    if (body) {
        body.position.set(pos.x, pos.y, pos.z);
        if (mesh.userData.pieceType === 'triangle') {
            const q = quatMeshToBody(mesh.quaternion); // identity * offset(+90°)
            body.quaternion.set(q.x, q.y, q.z, q.w);
        } else {
            body.quaternion.set(0, 0, 0, 1);
        }
        body.velocity.setZero();
        body.angularVelocity.setZero();
        body.wakeUp();
    }
}
