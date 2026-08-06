// Fallback de CDN para Three.js y Cannon-es si falla el CDN principal.
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
