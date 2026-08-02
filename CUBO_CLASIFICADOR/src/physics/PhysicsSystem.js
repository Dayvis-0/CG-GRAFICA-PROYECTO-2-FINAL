import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Avanza el mundo cannon-es por frame y sincroniza meshes con sus bodies.
 * Gestiona modo kinematic (drag).
 */
export function createPhysicsSystem(piecesGroup, bodyFactory, physicsWorld) {
    /** @type {Set<THREE.Mesh>} */
    const kinematicPieces = new Set();

    // ─── Drag trail para velocidad de soltado suave ──────────────
    // La velocidad kinematic (posDelta/(1/240)) es ruidosa y está
    // diseñada para empujar otras piezas, NO para usarse como velocidad
    // de soltado. En vez de usarla cruda, trackeamos las posiciones
    // reales del arrastre y al soltar calculamos una velocidad suavizada.
    const DRAG_TRAIL_LEN = 8;
    const MAX_RELEASE_SPEED = 5; // u/s — natural, no violento
    /** @type {{ x: number, y: number, z: number }[]} */
    const dragTrail = [];

    // ─── Modo kinematic (drag) ─────────────────────────────────
    /** Activa/desactiva modo kinematic. En kinematic, cannon no aplica gravedad a la pieza. */
    function setKinematic(mesh, kinematic) {
        const body = bodyFactory.getBody(mesh);
        if (!body) return;

        if (kinematic) {
            body.type = CANNON.Body.KINEMATIC;
            body.velocity.setZero();
            body.angularVelocity.setZero();
            body.wakeUp();
            kinematicPieces.add(mesh);
            dragTrail.length = 0; // empezar trail nuevo
        } else {
            // Al soltar la pieza:
            // 1) Sincronizar body.position con el mesh ANTES de pasar a DYNAMIC.
            //    Sin esto, si Cannon tiene el body en posición distinta (penetrando
            //    geometría), el solver lo eyecta "por todos lados" al liberarlo.
            // 2) NO usar body.velocity (es la velocidad kinematic ruidosa).
            //    Calcular velocidad de soltado desde dragTrail.
            body.type = CANNON.Body.DYNAMIC;
            body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
            
            if (mesh.userData.pieceType === 'triangle') {
                // Al pasar a dinámico, sumamos los +90 grados en Y requeridos por el cuerpo físico
                const quatOffset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                const physQuat = new THREE.Quaternion(
                    mesh.quaternion.x, mesh.quaternion.y,
                    mesh.quaternion.z, mesh.quaternion.w
                ).multiply(quatOffset);
                body.quaternion.set(physQuat.x, physQuat.y, physQuat.z, physQuat.w);
            } else {
                body.quaternion.set(
                    mesh.quaternion.x, mesh.quaternion.y,
                    mesh.quaternion.z, mesh.quaternion.w,
                );
            }
            body.force.setZero();
            body.torque.setZero();

            // ── Velocidad de soltado suave desde el trail ──
            if (dragTrail.length >= 3) {
                const first = dragTrail[0];
                const last  = dragTrail[dragTrail.length - 1];
                const steps = dragTrail.length - 1;
                const dt = steps / 240; // ~pasos de física en el trail
                if (dt > 0.005) {
                    const vx = (last.x - first.x) / dt;
                    const vy = (last.y - first.y) / dt;
                    const vz = (last.z - first.z) / dt;
                    const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);

                    if (speed > 0.4) {
                        const factor = Math.min(1, MAX_RELEASE_SPEED / speed);
                        body.velocity.set(vx * factor, vy * factor, vz * factor);

                        // Angular para esfera: derivar de la velocidad de soltado
                        if (mesh.userData.pieceType === 'sphere') {
                            const radius = mesh.userData.pieceArgs?.[0] ?? 0.55;
                            const vel = body.velocity;
                            body.angularVelocity.set(
                                -vel.z / radius,
                                0,
                                 vel.x / radius,
                            );
                        } else {
                            body.angularVelocity.setZero();
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

            dragTrail.length = 0; // limpiar trail
            body.wakeUp();
            kinematicPieces.delete(mesh);
        }
    }

    /** Mueve la pieza kinematic y deriva su velocidad para que empuje piezas vecinas. */
    function setKinematicPosition(mesh, pos) {
        const body = bodyFactory.getBody(mesh);
        if (!body) return;

        const oldX = body.position.x;
        const oldY = body.position.y;
        const oldZ = body.position.z;

        body.position.set(pos.x, pos.y, pos.z);

        // Derivar velocidad para que la pieza empuje a las vecinas durante el drag.
        // Se capea a MAX_KINEMATIC_SPEED para evitar velocidades bestiales si el
        // mouse apenas se mueve y el dt es microscópico (1/240 ≈ 0.004 s).
        // NOTA: esta velocidad es SOLO para empujar, NO es la velocidad de soltado.
        const dt = 1 / 240;
        const MAX_KINEMATIC_SPEED = 15;

        const clamp = (v) => Math.max(-MAX_KINEMATIC_SPEED, Math.min(MAX_KINEMATIC_SPEED, v));
        body.velocity.set(
            clamp((pos.x - oldX) / dt),
            clamp((pos.y - oldY) / dt),
            clamp((pos.z - oldZ) / dt),
        );

        // Angular velocity visible durante el drag (para la esfera)
        if (mesh.userData.pieceType === 'sphere') {
            const radius = mesh.userData.pieceArgs?.[0] ?? 0.55;
            body.angularVelocity.set(
                -body.velocity.z / radius,
                0,
                 body.velocity.x / radius,
            );
        } else {
            body.angularVelocity.setZero();
        }

        // Trail de posiciones para velocidad de soltado suave
        dragTrail.push({ x: pos.x, y: pos.y, z: pos.z });
        if (dragTrail.length > DRAG_TRAIL_LEN) dragTrail.shift();

        body.wakeUp();

        // Despertar piezas dinámicas vecinas que estén dormidas, para que
        // reaccionen al empujón (cannon las deja dormir si están quietas).
        for (const child of piecesGroup.children) {
            if (!child.isMesh || child === mesh) continue;
            const other = bodyFactory.getBody(child);
            if (!other) continue;
            other.wakeUp();
        }
    }

    /**
     * Avanza físicas y sincroniza meshes con sus bodies.
     * @param {number} dt
     * @param {THREE.Mesh|null} draggedMesh — pieza en drag; no se sincroniza desde acá
     */
    function update(dt, draggedMesh) {
        // 1. Avanzar el mundo cannon (un único step por frame)
        physicsWorld.step(dt);

        // 2. Sincronizar body → mesh para piezas dinámicas (no kinematic)
        for (const child of piecesGroup.children) {
            if (!child.isMesh) continue;
            if (child === draggedMesh) continue; // kinematic: ya lo movió DragManager

            const body = bodyFactory.getBody(child);
            if (!body) continue;

            child.position.set(body.position.x, body.position.y, body.position.z);
            
            if (child.userData.pieceType === 'triangle') {
                // Deshacer el desfase de +90 grados en Y del cuerpo físico
                // aplicando -90 grados en Y al mesh visual para mantenerlo simétrico
                const quatOffset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
                const visualQuat = new THREE.Quaternion(
                    body.quaternion.x,
                    body.quaternion.y,
                    body.quaternion.z,
                    body.quaternion.w
                ).multiply(quatOffset);
                child.quaternion.copy(visualQuat);
            } else {
                child.quaternion.set(
                    body.quaternion.x,
                    body.quaternion.y,
                    body.quaternion.z,
                    body.quaternion.w
                );
            }
        }
    }

    return {
        update,
        setKinematic,
        setKinematicPosition,
    };
}