import * as THREE from 'three';
import { isPointInsideBox } from '../utils/CollisionHelper.js';
import { clampToBounds } from '../utils/math.js';
// Permite mover la cámara en primera persona utilizando el ratón para mirar y las teclas WASD para caminar.
export function setupCameraFPS(camera, renderer, roomBounds, obstacles = [], draggingRef = { current: false }, inputManager) {
    const { height, margin } = roomBounds;
    const yMin = margin;
    const yMax = height - margin;

    let enabled = false;
    let yaw = 0;
    let pitch = 0;

    const el = renderer.domElement;
    const onCanvasClick = () => {
        if (enabled && !inputManager.isPointerLocked() && !draggingRef.current) {
            el.requestPointerLock();
        }
    };
    el.addEventListener('click', onCanvasClick);

    const _onMouseMove = (e) => {
        if (!enabled || !inputManager.isPointerLocked() || draggingRef.current) return;

        yaw -= e.movementX * 0.003;
        pitch -= e.movementY * 0.003;

        const maxPitch = Math.PI / 2 - 0.05;
        pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

        updateCameraRotation();
    };
    document.addEventListener('mousemove', _onMouseMove);

    // Aplica la orientación de giro calculada a la cámara en el espacio 3D.
    function updateCameraRotation() {
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }

    const speed = 0.08;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const move = new THREE.Vector3();
    const target = new THREE.Vector3();
    const COLLIDE_MARGIN = 0.35;

    // Comprueba si la cámara choca con algún objeto u obstáculo para no atravesarlo.
    function isBlocked(pos) {
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            if (!obstacle || !obstacle.visible) continue;
            const box = new THREE.Box3().setFromObject(obstacle);
            if (isPointInsideBox(pos, box, COLLIDE_MARGIN)) return true;
        }
        return false;
    }

    // Calcula el desplazamiento de la cámara cuando el jugador presiona WASD.
    function updateMovement() {
        if (!enabled) return;

        forward.set(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        right.set(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

        move.set(0, 0, 0);

        if (inputManager.isDown('w')) move.sub(forward);
        if (inputManager.isDown('s')) move.add(forward);
        if (inputManager.isDown('a')) move.sub(right);
        if (inputManager.isDown('d')) move.add(right);

        if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(speed);
            target.copy(camera.position).add(move);

            clampToBounds(target, roomBounds);
            target.y = Math.max(yMin, Math.min(yMax, target.y));

            if (!isBlocked(target)) {
                camera.position.copy(target);
            }
        }

        updateCameraRotation();
    }

    function update() {
        if (enabled) updateMovement();
        clampToBounds(camera.position, roomBounds);
        camera.position.y = Math.max(yMin, Math.min(yMax, camera.position.y));
    }

    function dispose() {
        el.removeEventListener('click', onCanvasClick);
        document.removeEventListener('mousemove', _onMouseMove);
    }

    updateCameraRotation();

    return {
        update,
        dispose,
        setEnabled(val) {
            enabled = val;
            if (!val && document.pointerLockElement === el) {
                document.exitPointerLock();
            }
        },
        resetRotation() {
            yaw = -Math.PI;
            pitch = -0.2;
            updateCameraRotation();
        }
    };
}