import * as THREE from 'three';
import { isPointInsideBox } from '../utils/CollisionHelper.js';
import { clampToBounds } from '../utils/math.js';

/**
 * Control de cámara en primera persona (FPS).
 * - El estado del teclado y pointer lock se lee de InputManager.
 * - El mouse look (yaw/pitch) se maneja acá por ser propio de la cámara.
 * - El pointerlockchange NO se duplica: InputManager ya lo trackea.
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.WebGLRenderer} renderer
 * @param {object} roomBounds        — { half: number, height: number, margin: number }
 * @param {THREE.Mesh[]} obstacles   — meshes con los que colisionar
 * @param {{ current: boolean }} draggingRef — ref compartida con DragManager.
 *   CONTRATO (ARQ-002): `true` mientras se arrastra una pieza → la cámara
 *   FPS no responde al mouse look ni al WASD (el arrastre tiene prioridad).
 *   La escribe DragManager, la lee este módulo.
 * @param {object} inputManager      — { isDown(key), isPointerLocked() }
 */
export function setupCameraFPS(camera, renderer, roomBounds, obstacles = [], draggingRef = { current: false }, inputManager) {
    const { height, margin } = roomBounds;
    const yMin = margin;
    const yMax = height - margin;

    // Flag para activar/desactivar dinámicamente desde afuera (inicia desactivado para modo infantil)
    let enabled = false;

    // Estado de rotación (exclusivo de la cámara)
    let yaw = 0;
    let pitch = 0;

    // Click en canvas → bloquear mouse para control de cámara
    const el = renderer.domElement;
    const onCanvasClick = () => {
        if (enabled && !inputManager.isPointerLocked() && !draggingRef.current) {
            el.requestPointerLock();
        }
    };
    el.addEventListener('click', onCanvasClick);

    // ─── Mouse look ──────────────────────────────────────────────
    const _onMouseMove = (e) => {
        if (!enabled || !inputManager.isPointerLocked() || draggingRef.current) return;

        yaw -= e.movementX * 0.003;
        pitch -= e.movementY * 0.003;

        const maxPitch = Math.PI / 2 - 0.05;
        pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

        updateCameraRotation();
    };
    document.addEventListener('mousemove', _onMouseMove);

    // ─── Rotación ────────────────────────────────────────────────
    function updateCameraRotation() {
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }

    // ─── Movimiento (WASD desde InputManager) ────────────────────
    const speed = 0.08;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const move = new THREE.Vector3();
    const target = new THREE.Vector3();
    const COLLIDE_MARGIN = 0.35;

    // Precalcular AABBs de obstáculos estáticos
    const obstacleBoxes = obstacles.map(mesh => new THREE.Box3().setFromObject(mesh));

    function isBlocked(pos) {
        for (let i = 0; i < obstacles.length; i++) {
            if (!obstacles[i].visible) continue;
            if (isPointInsideBox(pos, obstacleBoxes[i], COLLIDE_MARGIN)) {
                return true;
            }
        }
        return false;
    }

    function updateMovement() {
        if (!enabled) return;

        forward.set(
            Math.sin(yaw) * Math.cos(pitch),
            -Math.sin(pitch),
            Math.cos(yaw) * Math.cos(pitch)
        );
        right.set(
            Math.sin(yaw + Math.PI / 2),
            0,
            Math.cos(yaw + Math.PI / 2)
        );

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

    // ─── Update (llamado desde AnimationLoop) ────────────────────
    function update() {
        if (enabled) {
            updateMovement();
        }
    }

    // ─── Dispose ─────────────────────────────────────────────────
    function dispose() {
        el.removeEventListener('click', onCanvasClick);
        document.removeEventListener('mousemove', _onMouseMove);
    }

    // ─── Inicializar ─────────────────────────────────────────────
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
        resetRotation(x, y, z) {
            yaw = -Math.PI; // Mirar hacia el centro de la habitación
            pitch = -0.2;   // Mirar un poco hacia abajo
            updateCameraRotation();
        }
    };
}