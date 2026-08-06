export function teleportPiece(mesh, pos) {
    mesh.position.copy(pos);
    mesh.quaternion.identity();

    const body = mesh.userData.body;
    if (body) {
        body.position.set(pos.x, pos.y, pos.z);
        body.quaternion.set(0, 0, 0, 1);
        body.velocity.setZero();
        body.angularVelocity.setZero();
        body.wakeUp();
    }
}
