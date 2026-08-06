import * as THREE from 'three';
import { intersectsAnyObstacle } from '../utils/CollisionHelper.js';
import { clampToBounds } from '../utils/math.js';
import { getHalfSize } from '../utils/geometry.js';

// Configura la interacción del mouse para poder tomar y arrastrar las piezas por el escenario.
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

    let selected = null;
    let dragging = false;
    let dragStartY = null;
    let enabled = true;

    const _candBox = new THREE.Box3();
    const _cachedHalfSize = new THREE.Vector3();

    // Verifica si la posición deseada de la pieza choca con el cubo clasificador u otros obstáculos.
    function overlapsClassifier(pos) {
        if (obstacles.length === 0) return false;
        _candBox.min.set(pos.x - _cachedHalfSize.x, pos.y - _cachedHalfSize.y, pos.z - _cachedHalfSize.z);
        _candBox.max.set(pos.x + _cachedHalfSize.x, pos.y + _cachedHalfSize.y, pos.z + _cachedHalfSize.z);
        const obstacleBoxes = obstacles.filter(m => m && m.visible).map(m => new THREE.Box3().setFromObject(m));
        return intersectsAnyObstacle(_candBox, obstacleBoxes);
    }

    // Revisa si la pieza se encuentra directamente en la zona superior encima del cubo clasificador.
    function isOverClassifier(pos) {
        const margin = 0.2;
        return Math.abs(pos.x) < classifierHalf + margin && Math.abs(pos.z) < classifierHalf + margin;
    }

    // Mantiene la pieza dentro de los límites de las paredes del cuarto.
    function clampToRoom(pos) {
        clampToBounds(pos, roomBounds, { x: _cachedHalfSize.x, y: _cachedHalfSize.y, z: _cachedHalfSize.z });
        return pos;
    }

    function limitStep(pos, from) {
        pos.x = Math.max(from.x - _cachedHalfSize.x, Math.min(from.x + _cachedHalfSize.x, pos.x));
        pos.y = Math.max(from.y - _cachedHalfSize.y, Math.min(from.y + _cachedHalfSize.y, pos.y));
        pos.z = Math.max(from.z - _cachedHalfSize.z, Math.min(from.z + _cachedHalfSize.z, pos.z));
        return pos;
    }

    // Evita que la pieza atraviese paredes u obstáculos al moverse.
    function clampMovement(pos, from) {
        const guarded = from.clone();
        const axes = ['x', 'z', 'y'];
        
        axes.forEach(axis => {
            if (pos[axis] !== guarded[axis]) {
                const c = guarded.clone();
                c[axis] = pos[axis];
                if (!overlapsClassifier(c)) {
                    clampToRoom(c);
                    guarded[axis] = c[axis];
                }
            }
        });

        return guarded;
    }

    function getPieceMeshes() {
        return piecesGroup.children.filter(c => c.isMesh);
    }

    // Detecta cuando el usuario hace clic sobre una pieza para agarrarla y arrastrarla.
    function onPointerDown(e) {
        if (!enabled) return;
        pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // Selecciona la pieza bajo el cursor usando un rayo de cámara y activa el modo arrastre
        raycaster.setFromCamera(pointer, activeCameraRef.current);
        const hits = raycaster.intersectObjects(getPieceMeshes(), false);
        if (hits.length === 0) return;

        selected = hits[0].object;
        dragging = true;
        dragStartY = selected.position.y;

        _cachedHalfSize.copy(getHalfSize(selected));
        if (onDragStart) onDragStart();
        if (onSelect) onSelect(selected);

        physicsSystem.setKinematic(selected, true);
        physicsSystem.setKinematicPosition(selected, selected.position);

        renderer.domElement.setPointerCapture(e.pointerId);

        activeCameraRef.current.getWorldDirection(camDir);
        dragPlane.setFromNormalAndCoplanarPoint(camDir, selected.position);
        raycaster.ray.intersectPlane(dragPlane, target);
        offset.copy(target).sub(selected.position);

        renderer.domElement.style.cursor = 'grabbing';
    }

    // Actualiza la posición 3D de la pieza siguiendo el cursor del mouse en pantalla.
    function onPointerMove(e) {
        if (!dragging || !selected) return;
        pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // Proyecta la posición del mouse sobre el plano 3D y ajusta colisiones de arrastre
        raycaster.setFromCamera(pointer, activeCameraRef.current);
        raycaster.ray.intersectPlane(dragPlane, target);

        let newPos = target.clone().sub(offset);

        if (selected.userData.minY !== undefined) {
            const halfH = _cachedHalfSize.y;
            if (isOverClassifier(newPos)) {
                const theoreticalMin = classifierTop + halfH;
                const wasOnPanel = dragStartY !== null && dragStartY >= theoreticalMin - halfH;
                const effectiveMin = wasOnPanel ? Math.min(theoreticalMin, dragStartY) : theoreticalMin;
                newPos.y = Math.max(effectiveMin, newPos.y);
            } else {
                newPos.y = Math.max(selected.userData.minY, newPos.y);
            }
        }

        newPos = limitStep(newPos, selected.position);
        newPos = clampMovement(newPos, selected.position);

        physicsSystem.setKinematicPosition(selected, newPos);
        selected.position.copy(newPos);
    }

    // Suelta la pieza y reactiva la gravedad física al soltar el clic del mouse.
    function onPointerUp(e) {
        const releasedMesh = selected;
        if (selected) {
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