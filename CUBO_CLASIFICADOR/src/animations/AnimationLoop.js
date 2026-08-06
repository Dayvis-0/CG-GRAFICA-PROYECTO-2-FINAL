import * as CANNON from 'cannon-es';
import { clampToBounds } from '../utils/math.js';
import { getHalfSize } from '../utils/geometry.js';
import { ROOM_MARGIN } from '../data/classifierDimensions.js';

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
    const HALF = roomBounds?.half ?? 7;
    const HEIGHT = roomBounds?.height ?? 8;
    const MARGIN = ROOM_MARGIN;

    const _halfSizeCache = new WeakMap();

    function clampToRoomBounds(draggedMesh) {
        for (const child of pieces.children) {
            if (!child.isMesh || child === draggedMesh) continue;

            const body = child.userData.body;
            if (!body || body.type !== CANNON.Body.DYNAMIC) continue;

            let hs = _halfSizeCache.get(child);
            if (!hs) {
                hs = getHalfSize(child);
                _halfSizeCache.set(child, hs);
            }

            const px = child.position.x;
            const py = child.position.y;
            const pz = child.position.z;
            
            clampToBounds(
                child.position,
                { half: HALF, height: HEIGHT, margin: MARGIN },
                { x: hs.x, y: hs.y, z: hs.z }
            );

            let clamped = false;
            if (child.position.x !== px) { body.position.x = child.position.x; clamped = true; }
            if (child.position.y !== py) { body.position.y = child.position.y; clamped = true; }
            if (child.position.z !== pz) { body.position.z = child.position.z; clamped = true; }

            if (clamped) {
                body.velocity.setZero();
                body.angularVelocity.setZero();
                body.wakeUp();
            }
        }
    }

    let lastTime = performance.now();

    function animate(now) {
        requestAnimationFrame(animate);

        const dt = Math.min((now - lastTime) / 1000, 1 / 30);
        lastTime = now;

        fpsControl.update();

        const draggedMesh = dragManager.getSelected();
        physicsSystem.update(dt, draggedMesh);

        clampToRoomBounds(draggedMesh);

        if (onPostPhysics) onPostPhysics(draggedMesh);

        dragManager.updateArrowInput(inputManager);
        renderer.render(scene, activeCameraRef.current);
    }

    animate(performance.now());
}