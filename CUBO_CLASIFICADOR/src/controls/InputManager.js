/**
 * Input centralizado: un solo lugar para todo el estado del teclado y pointer lock.
 *
 * Cualquier módulo puede consultar:
 *   inputManager.isDown('w')
 *   inputManager.isPointerLocked()
 *
 * WASD, flechas y demás se trackean globalmente.
 * El preventDefault se aplica a teclas de navegación para evitar scroll accidental.
 */

const PREVENT_KEYS = [
    'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
];

// Fallback para distribuciones de teclado no-QWERTY
const CODE_TO_KEY = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
};

export function createInputManager() {
    /** @type {Record<string, boolean>} */
    const keys = {};
    let locked = false;

    // ─── Teclado ──────────────────────────────────────────────────
    function isInputField(el) {
        return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
    }

    const _onKeyDown = (e) => {
        // No interceptar si el usuario está escribiendo en un campo de texto
        if (isInputField(e.target)) return;

        keys[e.key] = true;

        // Fallback por código físico
        if (CODE_TO_KEY[e.code]) keys[CODE_TO_KEY[e.code]] = true;

        if (PREVENT_KEYS.includes(e.key)) e.preventDefault();
    };

    const _onKeyUp = (e) => {
        if (isInputField(e.target)) return;

        keys[e.key] = false;
        if (CODE_TO_KEY[e.code]) keys[CODE_TO_KEY[e.code]] = false;
    };

    const _onPointerLockChange = () => {
        locked = document.pointerLockElement !== null;
    };

    window.addEventListener('keydown', _onKeyDown);
    window.addEventListener('keyup', _onKeyUp);
    document.addEventListener('pointerlockchange', _onPointerLockChange);

    // ─── API pública ──────────────────────────────────────────────
    return {
        /**
         * ¿Una tecla está siendo presionada?
         * @param {string} key — nombre de la tecla (e.key), ej: 'w', 'ArrowUp'
         * @returns {boolean}
         */
        isDown(key) {
            return !!keys[key];
        },

        /**
         * ¿El puntero está bloqueado (capturado) por el canvas?
         * @returns {boolean}
         */
        isPointerLocked() {
            return locked;
        },

        /**
         * Remueve los event listeners asignados al window y document.
         */
        dispose() {
            window.removeEventListener('keydown', _onKeyDown);
            window.removeEventListener('keyup', _onKeyUp);
            document.removeEventListener('pointerlockchange', _onPointerLockChange);
        },
    };
}