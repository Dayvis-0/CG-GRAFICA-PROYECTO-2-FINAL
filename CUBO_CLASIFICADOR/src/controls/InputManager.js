const PREVENT_KEYS = [
    'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
];

const CODE_TO_KEY = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
};

export function setupInputManager() {
    const keys = {};
    let locked = false;

    function isInputField(el) {
        return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
    }

    const _onKeyDown = (e) => {
        if (isInputField(e.target)) return;
        keys[e.key] = true;
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

    return {
        isDown(key) {
            return !!keys[key];
        },
        isPointerLocked() {
            return locked;
        },
        dispose() {
            window.removeEventListener('keydown', _onKeyDown);
            window.removeEventListener('keyup', _onKeyUp);
            document.removeEventListener('pointerlockchange', _onPointerLockChange);
        },
    };
}