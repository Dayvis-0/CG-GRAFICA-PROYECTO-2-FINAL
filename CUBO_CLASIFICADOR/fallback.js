/**
 * Fallback de CDN (SEC-002): si el CDN principal (jsdelivr) falla, reintenta
 * con unpkg reescribiendo el import map ANTES de que se ejecuten los módulos.
 *
 * Archivo externo (no inline) para permitir una CSP estricta sin 'unsafe-inline'.
 */
(async function () {
    try {
        await import('three');
    } catch {
        console.warn('[Fallback] CDN principal (jsdelivr) falló, usando unpkg');
        const im = document.querySelector('script[type="importmap"]');
        const map = JSON.parse(im.textContent);
        map.imports.three = 'https://unpkg.com/three@0.160.0/build/three.module.js';
        map.imports['three/addons/'] = 'https://unpkg.com/three@0.160.0/examples/jsm/';
        map.imports['cannon-es'] = 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';
        im.textContent = JSON.stringify(map);
    }
})();
