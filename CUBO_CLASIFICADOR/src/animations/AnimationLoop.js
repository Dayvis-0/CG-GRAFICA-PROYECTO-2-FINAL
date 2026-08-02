import * as THREE from 'three';
import * as CANNON from 'cannon-es';

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
    const _box    = new THREE.Box3();
    const _offMin = new THREE.Vector3();
    const _offMax = new THREE.Vector3();
    const HALF   = roomBounds?.half ?? 7;
    const HEIGHT = roomBounds?.height ?? 8;
    const MARGIN = 0.5; // mismo margen que DragManager

    // Cache de half-sizes por pieza (geometría no cambia en runtime)
    const _halfSizeCache = new WeakMap();

    /** Clamp post-física: si una pieza salió del cuarto, la reencuadra y anula su velocidad. */
    function clampToRoomBounds(draggedMesh) {
        for (const child of pieces.children) {
            if (!child.isMesh || child === draggedMesh) continue;

            const body = child.userData.body;
            if (!body || body.type !== CANNON.Body.DYNAMIC) continue;

            // Usar half-size cacheado en lugar de setFromObject
            let hs = _halfSizeCache.get(child);
            if (!hs) {
                _box.setFromObject(child);
                _box.getSize(_offMin); // reutilizamos _offMin temporalmente
                hs = _offMin.clone().multiplyScalar(0.5);
                _halfSizeCache.set(child, hs);
            }

            // Offsets simétricos desde el centro
            _offMin.copy(hs);
            _offMax.copy(hs);

            const cx = Math.max(-HALF + _offMin.x + MARGIN, Math.min(HALF - _offMax.x - MARGIN, child.position.x));
            const cz = Math.max(-HALF + _offMin.z + MARGIN, Math.min(HALF - _offMax.z - MARGIN, child.position.z));
            const cy = Math.min(HEIGHT - _offMax.y - MARGIN, child.position.y);

            let clamped = false;

            if (cx !== child.position.x) {
                child.position.x = cx;
                body.position.x = cx;
                clamped = true;
            }
            if (cz !== child.position.z) {
                child.position.z = cz;
                body.position.z = cz;
                clamped = true;
            }
            if (cy !== child.position.y) {
                child.position.y = cy;
                body.position.y = cy;
                clamped = true;
            }

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