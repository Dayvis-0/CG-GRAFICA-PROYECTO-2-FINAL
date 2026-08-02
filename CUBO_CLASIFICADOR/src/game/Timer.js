/**
 * Cronómetro regresivo para el Cubo Clasificador.
 *
 * Responsabilidad ÚNICA: gestionar el estado, display y controles
 * del temporizador del juego. La configuración (duración inicial,
 * rango del botón "+") viene de `data/gameConfig.js` (ARQ-005).
 *
 * @returns {{ start: () => void, reset: () => void, stop: () => void }}
 */
import { TIMER_CONFIG } from '../data/gameConfig.js';

export function createTimer(onTimeUp) {
    const timerEl      = document.getElementById('timer');
    const timerDisplay = document.getElementById('timer-display');

    let minutes  = TIMER_CONFIG.initialMinutes;
    let seconds  = TIMER_CONFIG.initialSeconds;
    let running  = false;
    let interval = null;
    let started  = false;

    function updateDisplay() {
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        timerDisplay.textContent = `${mm}:${ss}`;
    }

    function start() {
        if (running || started) return;
        started = true;
        running = true;
        timerEl.classList.add('running');
        interval = setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) {
                    // Se acabó el tiempo
                    clearInterval(interval);
                    running = false;
                    timerDisplay.textContent = '00:00';
                    timerDisplay.style.color = '#ff5566';
                    console.log('⏰ ¡Tiempo agotado!');
                    if (onTimeUp) onTimeUp();
                    return;
                }
                minutes--;
                seconds = 59;
            } else {
                seconds--;
            }
            updateDisplay();
        }, 1000);
    }

    function reset() {
        if (interval) clearInterval(interval);
        running = false;
        started = false;
        minutes = TIMER_CONFIG.initialMinutes;
        seconds = TIMER_CONFIG.initialSeconds;
        timerEl.classList.remove('running');
        timerDisplay.style.color = '';
        updateDisplay();
    }

    function stop() {
        if (interval) clearInterval(interval);
        running = false;
    }

    // ─── Botones +/- ─────────────────────────────────────────────
    document.getElementById('timer-minus').onclick = () => {
        if (running || started) return;
        if (minutes > 1) minutes--;
        updateDisplay();
    };
    document.getElementById('timer-plus').onclick = () => {
        if (running || started) return;
        if (minutes < TIMER_CONFIG.maxMinutes) minutes++;
        updateDisplay();
    };

    // Sincronizar el display con la config al arrancar (ARQ-005):
    // el `01:00` del HTML es solo un placeholder sin autoridad.
    updateDisplay();

    return { start, reset, stop };
}
