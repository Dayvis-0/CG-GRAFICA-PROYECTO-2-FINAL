import { TIMER_CONFIG } from '../data/gameConfig.js';

// Maneja el cronómetro del juego, descontando segundos hasta llegar a cero.
export function createTimer(onTimeUp) {
    const timerEl      = document.getElementById('timer');
    const timerDisplay = document.getElementById('timer-display');

    let minutes  = TIMER_CONFIG.initialMinutes;
    let seconds  = TIMER_CONFIG.initialSeconds;
    let running  = false;
    let interval = null;
    let started  = false;

    // Actualiza el texto visual del cronómetro en la pantalla en formato MM:SS.
    function updateDisplay() {
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        timerDisplay.textContent = `${mm}:${ss}`;
    }

    // Inicia la cuenta regresiva del tiempo.
    function start() {
        if (running || started) return;
        started = true;
        running = true;
        timerEl.classList.add('running');
        interval = setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) {
                    clearInterval(interval);
                    running = false;
                    timerDisplay.textContent = '00:00';
                    timerDisplay.style.color = '#ff5566';
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

    // Detiene el tiempo y reinicia el reloj al valor original.
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

    // Pausa la cuenta regresiva del tiempo.
    function stop() {
        if (interval) clearInterval(interval);
        running = false;
    }

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

    updateDisplay();

    return { start, reset, stop };
}
