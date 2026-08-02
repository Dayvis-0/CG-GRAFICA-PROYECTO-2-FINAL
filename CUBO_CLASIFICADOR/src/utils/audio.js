/**
 * Audio compartido (DUP-007 + PERF-001).
 *
 * Un único `AudioContext` lazy singleton: los navegadores limitan la cantidad
 * de contextos concurrentes y crearlos por sonido es costoso. Los tonos se
 * programan sobre ese contexto con oscilador + gain (nada de assets).
 */

/** @type {AudioContext | null} */
let _ctx = null;

/** Devuelve el contexto compartido, creándolo la primera vez (PERF-001). */
function getContext() {
    if (!_ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        _ctx = new AudioCtx();
    }
    // Requisito de autoplay: el contexto puede nacer 'suspended' si aún no
    // hubo interacción del usuario; se reanuda al reproducir.
    if (_ctx.state === 'suspended') {
        _ctx.resume().catch(() => {});
    }
    return _ctx;
}

/**
 * Programa un tono simple sobre el contexto compartido.
 * @param {object} note
 * @param {number} note.freq     — frecuencia (Hz)
 * @param {number} note.start    — offset en segundos desde ahora
 * @param {number} note.duration — duración del ramp de decaimiento (s)
 * @param {OscillatorType} [note.type='sine']
 * @param {number} [note.gain=0.2]
 */
function scheduleTone({ freq, start, duration, type = 'sine', gain = 0.2 }) {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);
    g.gain.setValueAtTime(gain, now + start);
    g.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.1); // sobrevive al ramp para evitar clics
}

/** Sonido de éxito Montessori (xilofón de madera): dos notas en quinta (C5 → E5). */
export function playSuccessSound() {
    try {
        scheduleTone({ freq: 523.25, start: 0, duration: 0.5, type: 'triangle', gain: 0.25 });
        scheduleTone({ freq: 659.25, start: 0.08, duration: 0.5, type: 'triangle', gain: 0.20 });
    } catch (e) {
        console.warn('Web Audio no inicializado o bloqueado por el navegador:', e);
    }
}

let lastErrorSoundTime = 0;
const ERROR_COOLDOWN_MS = 400; // ERR-005: cooldown para que no suene en bucle

/** Sonido de error (zumbador grave) con cooldown anti-bucle (ERR-005). */
export function playErrorSound() {
    const timeNow = performance.now();
    if (timeNow - lastErrorSoundTime < ERROR_COOLDOWN_MS) return;
    lastErrorSoundTime = timeNow;

    try {
        scheduleTone({ freq: 140, start: 0, duration: 0.35, type: 'sawtooth', gain: 0.18 });
    } catch (e) {
        console.warn(e);
    }
}
