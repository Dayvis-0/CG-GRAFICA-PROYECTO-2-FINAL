import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { WALL_HEIGHT, OUTER } from '../data/classifierDimensions.js';
import { playSuccessSound } from '../utils/audio.js';

export function createGameState({
    pieces,
    rules,
    teleportPiece,
    timer,
    dragManagerRef,
    setControlsState,
    onClassified = () => {},
    onResetScores = () => {},
    onGameOver = () => {},
}) {
    let gameActive = true;
    let winTimeout = null;
    const classifiedLabels = new Set();

    function tryClassify(mesh) {
        if (!mesh || classifiedLabels.has(mesh.userData.label)) return false;
        
        if (rules.isOverOwnHole(mesh)) {
            classifiedLabels.add(mesh.userData.label);
            onClassified(mesh.userData.label);
            playSuccessSound();

            const totalPieces = pieces.children.filter(c => c.isMesh).length;
            if (classifiedLabels.size === totalPieces) {
                winTimeout = setTimeout(() => {
                    winTimeout = null;
                    showGameOver(true);
                }, 800); // Esperar caída visual
            }
            return true;
        }
        return false;
    }

    function expelPiece(mesh) {
        const orig = mesh.userData.originalPos;
        if (orig) teleportPiece(mesh, orig);
    }

    function processPiece(child) {
        if (!child.isMesh || classifiedLabels.has(child.userData.label)) return 'none';

        const halfOuter = OUTER / 2;
        const isInsideClassifierXZ = Math.abs(child.position.x) < halfOuter && Math.abs(child.position.z) < halfOuter;

        if (isInsideClassifierXZ && child.position.y < WALL_HEIGHT - 0.2) {
            if (!tryClassify(child)) {
                expelPiece(child);
                return 'infraction';
            }
            return 'classified';
        }
        return 'none';
    }

    function showGameOver(won) {
        if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }
        gameActive = false;
        timer.stop();
        if (dragManagerRef.current) dragManagerRef.current.setEnabled(false);
        setControlsState(false);
        onGameOver(won);
    }

    function resetPieces() {
        if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }

        for (const child of pieces.children) {
            if (!child.isMesh) continue;
            const orig = child.userData.originalPos;
            if (orig) teleportPiece(child, orig);
        }

        classifiedLabels.clear();
        onResetScores();
        timer.reset();
    }

    return {
        tryClassify,
        expelPiece,
        processPiece,
        resetPieces,
        showGameOver,
        isClassified: (label) => classifiedLabels.has(label),
        get isActive() { return gameActive; },
        setActive(v) { gameActive = v; },
    };
}
