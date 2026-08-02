import { HOLE_CONFIGS } from '../data/holeConfigs.js';
import { WALL_HEIGHT, OUTER } from '../data/classifierDimensions.js';
import { playSuccessSound } from '../utils/audio.js';

/**
 * Estado del juego (SRP-001 + ARQ-001).
 *
 * Concentra la lógica de clasificación, victoria y reset que antes vivía en
 * `index.js` (el "god module"). NO toca la escena directamente: recibe las
 * dependencias (piezas, reglas, reubicación) y devuelve callbacks de UI
 * (`onClassified`, `onResetScores`, `onGameOver`) para que el compositor
 * decida cómo reflejarlas.
 */
export function createGameState({
    pieces,
    rules,
    teleportPiece,
    timer,
    dragManagerRef, // { current: null } → se completa tras crear dragManager (ARQ-002)
    setControlsState,
    onClassified = () => {},
    onResetScores = () => {},
    onGameOver = () => {},
}) {
    let gameActive = true;
    let winTimeout = null; // Handle del timeout de victoria (ERR-001)

    /** Labels ya clasificadas (evita doble conteo). */
    const classifiedLabels = new Set();

    /**
     * Clasifica la pieza si está sobre su hueco correcto (DUP-009).
     * Único guard canónico de `isOverOwnHole`: el llamador usa el retorno
     * booleano para decidir entre clasificar o tratar como infracción.
     * @param {THREE.Mesh} mesh
     * @returns {boolean} true si se clasificó en esta llamada
     */
    function tryClassify(mesh) {
        if (!mesh || classifiedLabels.has(mesh.userData.label)) return false;
        if (rules.isOverOwnHole(mesh)) {
            classifiedLabels.add(mesh.userData.label);
            onClassified(mesh.userData.label);
            playSuccessSound();

            // Si clasificó todas las piezas -> ¡Victoria!
            if (classifiedLabels.size === HOLE_CONFIGS.length) {
                winTimeout = setTimeout(() => {
                    winTimeout = null;
                    showGameOver(true);
                }, 800); // Pequeña espera para que termine de caer
            }
            return true;
        }
        return false;
    }

    /**
     * Expulsa la pieza a su posición original por infracción (entró por un
     * hueco equivocado). Helper para el loop de post-física del compositor.
     * @param {THREE.Mesh} mesh
     */
    function expelPiece(mesh) {
        const orig = mesh.userData.originalPos;
        if (orig) teleportPiece(mesh, orig);
    }

    /**
     * Política de infracción del loop de post-física (ARQ-004): si la pieza
     * pasó por debajo del panel superior dentro del perímetro del clasificador,
     * intenta clasificarla; si no clasifica, la expulsa a su origen.
     * @param {THREE.Mesh} child
     * @returns {'classified'|'infraction'|'none'}
     */
    function processPiece(child) {
        if (!child.isMesh) return 'none';
        if (classifiedLabels.has(child.userData.label)) return 'none';

        // Solo verificamos infracciones si la pieza está físicamente dentro
        // del perímetro X/Z del clasificador (evita falsos positivos con
        // piezas que están afuera en el suelo).
        const halfOuter = OUTER / 2;
        const isInsideClassifierXZ = Math.abs(child.position.x) < halfOuter && Math.abs(child.position.z) < halfOuter;

        // Si la pieza pasó por debajo del panel superior Y está dentro de la caja
        if (isInsideClassifierXZ && child.position.y < WALL_HEIGHT - 0.2) {
            // Guard canónico en tryClassify (DUP-009): si no clasifica, es infracción
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
        dragManagerRef.current?.setEnabled(false);
        setControlsState(false);
        onGameOver(won);
    }

    /** Reinicia piezas, clasificación y cronómetro (ERR-001: cancela victoria pendiente). */
    function resetPieces() {
        if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }

        for (const child of pieces.children) {
            if (!child.isMesh) continue;
            const orig = child.userData.originalPos;
            if (!orig) continue;
            teleportPiece(child, orig);
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
