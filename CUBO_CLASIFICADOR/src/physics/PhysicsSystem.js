import * as CANNON from 'cannon-es';

// Gestiona la interacción física de las piezas, sincronizando sus posiciones y lanzamientos.
export function createPhysicsSystem(piecesGroup, bodyFactory, physicsWorld) {
    const kinematicPieces = new Set();
    const DRAG_TRAIL_LEN = 8;
    const MAX_RELEASE_SPEED = 5;
    const dragTrail = [];

    // Cambia una pieza entre modo controlado manualmente (al arrastrar) o modo físico dinámico (al soltar).
    function setKinematic(mesh, kinematic) {
        const body = bodyFactory.getBody(mesh);
        if (!body) return;

        if (kinematic) {
            body.type = CANNON.Body.KINEMATIC;
            body.velocity.setZero();
            body.angularVelocity.setZero();
            body.wakeUp();
            kinematicPieces.add(mesh);
            dragTrail.length = 0;
        } else {
            body.type = CANNON.Body.DYNAMIC;
            body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
            body.quaternion.set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
            body.force.setZero();
            body.torque.setZero();

            // Calcula la velocidad de impulso al soltar la pieza para que mantenga el impulso del lanzamiento
            if (dragTrail.length >= 3) {
                const first = dragTrail[0];
                const last  = dragTrail[dragTrail.length - 1];
                const dt = (dragTrail.length - 1) / 240;
                
                if (dt > 0.005) {
                    const vx = (last.x - first.x) / dt;
                    const vy = (last.y - first.y) / dt;
                    const vz = (last.z - first.z) / dt;
                    const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);

                    if (speed > 0.4) {
                        const factor = Math.min(1, MAX_RELEASE_SPEED / speed);
                        body.velocity.set(vx * factor, vy * factor, vz * factor);

                        if (mesh.userData.pieceType === 'sphere') {
                            const radius = mesh.userData.pieceArgs?.[0] ?? 0.55;
                            body.angularVelocity.set(-body.velocity.z / radius, 0, body.velocity.x / radius);
                        }
                    } else {
                        body.velocity.setZero();
                        body.angularVelocity.setZero();
                    }
                }
            } else {
                body.velocity.setZero();
                body.angularVelocity.setZero();
            }

            dragTrail.length = 0;
            body.wakeUp();
            kinematicPieces.delete(mesh);
        }
    }

    // Mueve la pieza a una nueva posición mientras el usuario la arrastra.
    function setKinematicPosition(mesh, pos) {
        const body = bodyFactory.getBody(mesh);
        if (!body) return;

        const oldX = body.position.x;
        const oldY = body.position.y;
        const oldZ = body.position.z;

        body.position.set(pos.x, pos.y, pos.z);

        const dt = 1 / 240;
        const MAX_KINEMATIC_SPEED = 15;
        const clamp = (v) => Math.max(-MAX_KINEMATIC_SPEED, Math.min(MAX_KINEMATIC_SPEED, v));
        
        body.velocity.set(
            clamp((pos.x - oldX) / dt),
            clamp((pos.y - oldY) / dt),
            clamp((pos.z - oldZ) / dt)
        );

        if (mesh.userData.pieceType === 'sphere') {
            const radius = mesh.userData.pieceArgs?.[0] ?? 0.55;
            body.angularVelocity.set(-body.velocity.z / radius, 0, body.velocity.x / radius);
        }

        dragTrail.push({ x: pos.x, y: pos.y, z: pos.z });
        if (dragTrail.length > DRAG_TRAIL_LEN) dragTrail.shift();

        body.wakeUp();

        for (const child of piecesGroup.children) {
            if (!child.isMesh || child === mesh) continue;
            const other = bodyFactory.getBody(child);
            if (other) other.wakeUp();
        }
    }

    // Actualiza la posición visual de todas las piezas según el cálculo del motor de física.
    function update(dt, draggedMesh) {
        physicsWorld.step(dt);

        for (const child of piecesGroup.children) {
            if (!child.isMesh || child === draggedMesh) continue;

            const body = bodyFactory.getBody(child);
            if (!body) continue;

            child.position.set(body.position.x, body.position.y, body.position.z);
            child.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
        }
    }

    return { update, setKinematic, setKinematicPosition };
}