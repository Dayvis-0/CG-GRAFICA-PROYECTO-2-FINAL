import * as THREE from 'three';
import { intersectsAnyObstacle } from '../utils/CollisionHelper.js';
import { clampToBounds } from '../utils/math.js';
import { getHalfSize } from '../utils/geometry.js';

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

    const obstacleBoxes = obstacles.map(m => new THREE.Box3().setFromObject(m));
    const _candBox   = new THREE.Box3();
    const _cachedHalfSize = new THREE.Vector3();

    function overlapsClassifier(pos) {
        if (obstacleBoxes.length === 0) return false;
        _candBox.min.set(pos.x - _cachedHalfSize.x, pos.y - _cachedHalfSize.y, pos.z - _cachedHalfSize.z);
        _candBox.max.set(pos.x + _cachedHalfSize.x, pos.y + _cachedHalfSize.y, pos.z + _cachedHalfSize.z);
        return intersectsAnyObstacle(_candBox, obstacleBoxes);
    }

    function isOverClassifier(pos) {
        const margin = 0.2;
        return Math.abs(pos.x) < classifierHalf + margin && Math.abs(pos.z) < classifierHalf + margin;
    }

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

    function onPointerDown(e) {
        if (!enabled) return;
        pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

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

    function onPointerMove(e) {
        if (!dragging || !selected) return;
        pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

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