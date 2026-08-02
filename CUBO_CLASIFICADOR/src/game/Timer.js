/**
 * Cronómetro regresivo para el Cubo Clasificador.
 *
 * Responsabilidad ÚNICA: gestionar el estado, display y controles
 * del temporizador del juego.
 *
 * @returns {{ start: () => void, reset: () => void }}
 */
export function createTimer(onTimeUp) {
    const timerEl      = document.getElementById('timer');
    const timerDisplay = document.getElementById('timer-display');

    let minutes  = 1;
    let seconds  = 0;
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
        minutes = 1;
        seconds = 0;
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
        if (minutes < 5) minutes++;
        updateDisplay();
    };

    return { start, reset, stop };
}
