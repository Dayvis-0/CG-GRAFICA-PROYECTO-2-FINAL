/**
 * Configuración central del juego (ARQ-005).
 *
 * Fuente única para valores de juego duplicados entre módulos y HTML:
 * la duración del timer ya no se hardcodea en `Timer.js` ni en `index.html`.
 */

export const TIMER_CONFIG = {
    /** Minutos iniciales del cronómetro (display inicial y reset). */
    initialMinutes: 1,
    /** Segundos iniciales (complemento de los minutos). */
    initialSeconds: 0,
    /** Límite superior del botón "+" (minutos). */
    maxMinutes: 5,
};
