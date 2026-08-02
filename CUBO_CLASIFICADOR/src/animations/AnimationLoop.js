import * as CANNON from 'cannon-es';
import { clampToBounds } from '../utils/math.js';
import { getHalfSize } from '../utils/geometry.js';
import { ROOM_MARGIN } from '../data/classifierDimensions.js';

/**
 * Bucle de renderizado principal: FPS, físicas, clamp de seguridad, input y render.
 *
 * @param {object} opts
 * @param {THREE.Scene}           opts.scene
 * @param {THREE.WebGLRenderer}   opts.renderer
 * @param {{ current: THREE.Camera }} opts.activeCameraRef
 * @param {{ update: function }}   opts.fpsControl
 * @param {THREE.Group}           opts.pieces
 * @param {object}                opts.physicsSystem
 * @param {object}                opts.inputManager
 * @param {object}                opts.dragManager
 * @param {{ half: number, height: number }} opts.roomBounds
 * @param {function}                        opts.onPostPhysics  — callback tras físicas (opcional)
 */
export function setupAnimationLoop({
    scene,
    renderer,
    activeCameraRef,
    fpsControl,
    pieces,
    physicsSystem,
    inputManager,
    dragManager,
    roomBounds,
    onPostPhysics,
}) {
    // ─── Reusables para clamp post-física ────────────────────────
    const HALF   = roomBounds?.half ?? 7;
    const HEIGHT = roomBounds?.height ?? 8;
    const MARGIN = ROOM_MARGIN; // mismo margen que DragManager (DUP-004)

    // Cache de half-sizes por pieza (geometría no cambia en runtime)
    const _halfSizeCache = new WeakMap();

    /** Clamp post-física: si una pieza salió del cuarto, la reencuadra y anula su velocidad. */
    function clampToRoomBounds(draggedMesh) {
        for (const child of pieces.children) {
            if (!child.isMesh || child === draggedMesh) continue;

            const body = child.userData.body;
            if (!body || body.type !== CANNON.Body.DYNAMIC) continue;

            // Usar half-size cacheado (DUP-008)
            let hs = _halfSizeCache.get(child);
            if (!hs) {
                hs = getHalfSize(child);
                _halfSizeCache.set(child, hs);
            }

            // Clamp unificado X/Z/Y (DUP-003): la misma aritmética que DragManager
            const px = child.position.x;
            const py = child.position.y;
            const pz = child.position.z;
            clampToBounds(
                child.position,
                { half: HALF, height: HEIGHT, margin: MARGIN },
                { x: hs.x, y: hs.y, z: hs.z },
            );

            let clamped = false;
            if (child.position.x !== px) { body.position.x = child.position.x; clamped = true; }
            if (child.position.y !== py) { body.position.y = child.position.y; clamped = true; }
            if (child.position.z !== pz) { body.position.z = child.position.z; clamped = true; }

            // Anular toda la velocidad para evitar que siga escapando por otro eje
            if (clamped) {
                body.velocity.setZero();
                body.angularVelocity.setZero();
                body.wakeUp();
            }
        }
    }

    // ─── Bucle ────────────────────────────────────────────────────
    let lastTime = performance.now();

    function animate(now) {
        requestAnimationFrame(animate);

        const dt = Math.min((now - lastTime) / 1000, 1 / 30);
        lastTime = now;

        fpsControl.update();

        const draggedMesh = dragManager.getSelected();

        physicsSystem.update(dt, draggedMesh);

        // Safety net: clampa piezas dinámicas al cuarto para evitar tunneling
        clampToRoomBounds(draggedMesh);

        if (onPostPhysics) onPostPhysics(draggedMesh);

        dragManager.updateArrowInput(inputManager);

        renderer.render(scene, activeCameraRef.current);
    }

    animate(performance.now());
}