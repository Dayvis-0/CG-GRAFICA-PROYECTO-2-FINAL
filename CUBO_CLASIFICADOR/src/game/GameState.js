import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { WALL_HEIGHT, OUTER } from '../data/classifierDimensions.js';
import { playSuccessSound } from '../utils/audio.js';

// Mantiene el estado del juego: puntaje, piezas clasificadas y fin de partida.
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

    // Intenta clasificar la pieza si está sobre el hueco correcto y reproduce sonido de éxito.
    function tryClassify(mesh) {
        if (!mesh || classifiedLabels.has(mesh.userData.label)) return false;
        
        // Verifica si la pieza está sobre su propio hueco
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

    // Devuelve una pieza a su posición inicial fuera del cubo.
    function expelPiece(mesh) {
        const orig = mesh.userData.originalPos;
        if (orig) teleportPiece(mesh, orig);
    }

    // Comprueba si la pieza ingresó al cubo clasificador y valida si es acierto o infracción.
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

    // Finaliza la partida mostrando si el jugador ganó o perdió por tiempo.
    function showGameOver(won) {
        if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }
        gameActive = false;
        timer.stop();
        if (dragManagerRef.current) dragManagerRef.current.setEnabled(false);
        setControlsState(false);
        onGameOver(won);
    }

    // Reinicia todas las piezas a sus posiciones iniciales fuera del cubo.
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

    // Expulsa una pieza específica o todas las piezas que hayan ingresado al cubo clasificador.
    function ejectPiece(targetLabel = null) {
        let count = 0;
        for (const child of pieces.children) {
            if (!child.isMesh) continue;
            const label = child.userData.label;
            if (targetLabel && label !== targetLabel) continue;

            const halfOuter = OUTER / 2;
            const isInsideXZ = Math.abs(child.position.x) < halfOuter && Math.abs(child.position.z) < halfOuter;
            const isInsideY = child.position.y < WALL_HEIGHT;

            if ((isInsideXZ && isInsideY) || classifiedLabels.has(label)) {
                expelPiece(child);
                classifiedLabels.delete(label);
                count++;
            }
        }
        return count;
    }

    return {
        tryClassify,
        expelPiece,
        ejectPiece,
        processPiece,
        resetPieces,
        showGameOver,
        isClassified: (label) => classifiedLabels.has(label),
        get isActive() { return gameActive; },
        setActive(v) { gameActive = v; },
    };
}
