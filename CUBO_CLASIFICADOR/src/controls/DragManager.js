import * as THREE from 'three';
import { intersectsAnyObstacle } from '../utils/CollisionHelper.js';
import { clampToBounds } from '../utils/math.js';
import { getHalfSize } from '../utils/geometry.js';

/**
 * Maneja el arrastre de piezas con el mouse (modo kinematic en cannon-es).
 * Colisiones: clasificador via AABB, cuarto via clamp de límites.
 * Deslizamiento natural por eje (X → Z → Y).
 */
export function setupDragManager(activeCameraRef, renderer, {
    piecesGroup,
    physicsSystem,
    roomBounds = { half: 7, height: 8 },
    obstacles = [],
    classifierTop,
    classifierHalf,
    onSelect,
    onDragStart,
    onDragEnd,
}) {
    const raycaster = new THREE.Raycaster();
    const pointer   = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const camDir    = new THREE.Vector3();
    const target    = new THREE.Vector3();
    const offset    = new THREE.Vector3();

    /** @type {THREE.Mesh | null} */
    let selected = null;
    let dragging = false;
    let dragStartY = null;
    let enabled = true;

    // ─── AABBs de obstáculos (solo clasificador, pre-computados) ──
    const obstacleBoxes = obstacles.map(m => new THREE.Box3().setFromObject(m));

    // Reusables (evitar GC en el hot path)
    const _candBox   = new THREE.Box3();

    // Half-size precacheado: se calcula en onPointerDown y se reutiliza durante el drag
    const _cachedHalfSize = new THREE.Vector3();

    // ─── Colisión contra obstáculos del clasificador (AABB) ──────
    /**
     * ¿El AABB de la pieza en `pos` intersecta alguna pared del clasificador?
     * @param {THREE.Vector3} pos
     * @returns {boolean}
     */
    function overlapsClassifier(pos) {
        if (obstacleBoxes.length === 0) return false;

        _candBox.min.set(
            pos.x - _cachedHalfSize.x,
            pos.y - _cachedHalfSize.y,
            pos.z - _cachedHalfSize.z
        );
        _candBox.max.set(
            pos.x + _cachedHalfSize.x,
            pos.y + _cachedHalfSize.y,
            pos.z + _cachedHalfSize.z
        );

        return intersectsAnyObstacle(_candBox, obstacleBoxes);
    }

    // ─── Clamp a límites del cuarto ──────────────────────────────

    // ─── Colisión contra el panel del clasificador (eje Y) ──────
    /**
     * ¿La pieza está sobre el área del clasificador (en X/Z)?
     * @param {THREE.Vector3} pos
     * @returns {boolean}
     */
    function isOverClassifier(pos) {
        const margin = 0.2;
        return Math.abs(pos.x) < classifierHalf + margin
            && Math.abs(pos.z) < classifierHalf + margin;
    }

    /**
     * Clampea `pos` para que el AABB de la pieza quede dentro del cuarto.
     * @param {THREE.Vector3} pos
     * @returns {THREE.Vector3}
     */
    function clampToRoom(pos) {
        clampToBounds(pos, roomBounds, {
            x: _cachedHalfSize.x,
            y: _cachedHalfSize.y,
            z: _cachedHalfSize.z,
        });

        return pos;
    }

    // ─── Limitador de paso (anti-teleport) ──────────────────────────
    /**
     * Limita el paso por eje al tamaño del AABB de la pieza — evita teleport entre paredes.
     * @param {THREE.Vector3} pos  — posición deseada
     * @param {THREE.Vector3} from — posición actual
     * @returns {THREE.Vector3}
     */
    function limitStep(pos, from) {
        // Usa half-size precacheado en lugar de setFromObject
        pos.x = Math.max(from.x - _cachedHalfSize.x, Math.min(from.x + _cachedHalfSize.x, pos.x));
        pos.y = Math.max(from.y - _cachedHalfSize.y, Math.min(from.y + _cachedHalfSize.y, pos.y));
        pos.z = Math.max(from.z - _cachedHalfSize.z, Math.min(from.z + _cachedHalfSize.z, pos.z));

        return pos;
    }

    // ─── Deslizamiento por eje ────────────────────────────────────
    /**
     * Intenta el movimiento en X, Z, Y por separado. Para cada eje,
     * primero verifica obstáculos del clasificador (AABB), y si pasa,
     * después aplica clamp a límites del cuarto.
     * Así la pieza desliza contra paredes/clasificador.
     *
     * @param {THREE.Vector3} pos  — posición deseada
     * @param {THREE.Vector3} from — posición actual
     * @returns {THREE.Vector3} — posición con colisiones resueltas
     */
    function clampMovement(pos, from) {
        const guarded = from.clone();

        // ── Eje X ──
        if (pos.x !== guarded.x) {
            const cx = guarded.clone();
            cx.x = pos.x;
            if (!overlapsClassifier(cx)) {
                // Pasa el clasificador → aplicar room bounds
                clampToRoom(cx);
                guarded.x = cx.x;
            }
        }

        // ── Eje Z ──
        if (pos.z !== guarded.z) {
            const cz = guarded.clone();
            cz.z = pos.z;
            if (!overlapsClassifier(cz)) {
                clampToRoom(cz);
                guarded.z = cz.z;
            }
        }

        // ── Eje Y ──
        if (pos.y !== guarded.y) {
            const cy = guarded.clone();
            cy.y = pos.y;
            if (!overlapsClassifier(cy)) {
                clampToRoom(cy);
                guarded.y = cy.y;
            }
        }

        return guarded;
    }

    // ─── Helpers ──────────────────────────────────────────────────
    function notifySelect(mesh) {
        if (onSelect) onSelect(mesh);
    }

    function getPieceMeshes() {
        return piecesGroup.children.filter(c => c.isMesh);
    }

    // ─── Eventos de puntero ───────────────────────────────────────
    function onPointerDown(e) {
        if (!enabled) return;
        pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointer, activeCameraRef.current);
        const hits = raycaster.intersectObjects(getPieceMeshes(), false);

        if (hits.length === 0) {
            // No deseleccionamos de la interfaz el objeto activo al hacer click en el vacío
            // para que los controles del panel (como el wireframe) sigan funcionando al orbitar.
            return;
        }

        selected = hits[0].object;
        dragging = true;
        dragStartY = selected.position.y; // capturar Y real ANTES de cualquier física

        // Precachear half-size de la pieza para todo el drag (DUP-008)
        _cachedHalfSize.copy(getHalfSize(selected));
        if (onDragStart) onDragStart();
        notifySelect(selected);

        // Modo kinematic: la pieza ya no recibe gravedad, pero sigue
        // siendo un obstáculo para las demás.
        physicsSystem.setKinematic(selected, true);
        physicsSystem.setKinematicPosition(selected, selected.position);

        renderer.domElement.setPointerCapture(e.pointerId);

        // Plano de arrastre paralelo a la cámara, pasando por el centro de la pieza
        activeCameraRef.current.getWorldDirection(camDir);
        dragPlane.setFromNormalAndCoplanarPoint(camDir, selected.position);
        raycaster.ray.intersectPlane(dragPlane, target);
        offset.copy(target).sub(selected.position);

        renderer.domElement.style.cursor = 'grabbing';
    }

    function onPointerMove(e) {
        pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (!dragging || !selected) return;

        raycaster.setFromCamera(pointer, activeCameraRef.current);
        raycaster.ray.intersectPlane(dragPlane, target);

        let newPos = target.clone().sub(offset);

        // ─── Límite inferior (piso / hueco / panel) ────────────
        if (selected.userData.minY !== undefined) {
            const halfH = _cachedHalfSize.y;

            // La pieza NO debe penetrar el panel durante el arrastre (kinematic).
            // Usamos el MAX entre el clamp teórico y la Y real al inicio del drag
            // para evitar que la pieza salte si Cannon la tenía ligeramente más baja.
            if (isOverClassifier(newPos)) {
                const theoreticalMin = classifierTop + halfH;
                // dragStartY se respeta SOLO si la pieza fue tomada desde el panel
                // (diferencia ≤ halfH = tolerancia de penetración física de Cannon).
                // Si venía del suelo, dragStartY sería muy bajo y permitiría atravesar el panel.
                const wasOnPanel = dragStartY !== null && dragStartY >= theoreticalMin - halfH;
                const effectiveMin = wasOnPanel
                    ? Math.min(theoreticalMin, dragStartY)
                    : theoreticalMin;
                newPos.y = Math.max(effectiveMin, newPos.y);
            } else {
                newPos.y = Math.max(selected.userData.minY, newPos.y);
            }
        }

        // ─── Límite de paso (anti-teleport) ────────────────────
        // Evita que la pieza se salte una pared si el mouse/cámara
        // se movieron muy rápido entre frames.
        newPos = limitStep(newPos, selected.position);

        // ─── Colisión: clasificador (AABB) + room bounds ────────
        newPos = clampMovement(newPos, selected.position);

        // Cannon resuelve colisiones contra otras piezas dinámicas
        physicsSystem.setKinematicPosition(selected, newPos);
        selected.position.copy(newPos);
    }

    function onPointerUp(e) {
        const releasedMesh = selected;
        if (selected) {
            // El panel ahora es un Trimesh con huecos reales: la pieza cae
            // naturalmente por gravedad si está sobre un hueco, o se apoya
            // sobre la superficie si está sobre zona sólida. Sin teleport.
            physicsSystem.setKinematic(selected, false);
            selected = null;
        }
        dragging = false;
        dragStartY = null;
        if (onDragEnd) onDragEnd(releasedMesh);
        renderer.domElement.releasePointerCapture(e.pointerId);
        renderer.domElement.style.cursor = 'default';
    }

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);

    return {
        getSelected: () => selected,

        moveSelectedBy(dx, dz) {
            if (!selected) return;
            const pos = selected.position.clone();
            pos.x += dx;
            pos.z += dz;

            if (selected.userData.minY !== undefined) {
                const halfH = _cachedHalfSize.y;

                // Mantener sobre la superficie del panel durante arrastre kinemático
                if (isOverClassifier(pos)) {
                    pos.y = Math.max(classifierTop + halfH, pos.y);
                } else {
                    pos.y = Math.max(selected.userData.minY, pos.y);
                }
            }

            const clamped = clampMovement(pos, selected.position);

            physicsSystem.setKinematicPosition(selected, clamped);
            selected.position.copy(clamped);
        },

        updateArrowInput(inputManager) {
            if (!enabled || !selected) return;
            const step = 0.08;
            if (inputManager.isDown('ArrowUp'))    this.moveSelectedBy( 0, -step);
            if (inputManager.isDown('ArrowDown'))  this.moveSelectedBy( 0,  step);
            if (inputManager.isDown('ArrowLeft'))  this.moveSelectedBy(-step,  0);
            if (inputManager.isDown('ArrowRight')) this.moveSelectedBy( step,  0);
        },

        setEnabled(val) {
            enabled = val;
            if (!val && dragging) {
                dragging = false;
                selected = null;
                renderer.domElement.style.cursor = 'default';
            }
        },

        dispose() {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
        },
    };
}