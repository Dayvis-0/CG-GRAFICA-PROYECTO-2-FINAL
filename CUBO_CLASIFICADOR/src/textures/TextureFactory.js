import * as THREE from 'three';

function makeTexture(drawFn, size = 256) {
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = size;
    const ctx = cnv.getContext('2d');
    drawFn(ctx, size);
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

/**
 * Fábrica de texturas procedurales con Lazy Loading (PERF-006).
 * Las texturas se generan bajo demanda (al primer acceso) en lugar de
 * crear todas al inicio. La generación se cachea para accesos posteriores.
 */
export function createTextures() {
    const _cache = {};

    function get(key) {
        if (key === 'none') return null;
        if (_cache[key]) return _cache[key];

        _cache[key] = makeTexture(_DRAWERS[key]);
        return _cache[key];
    }

    return { get };
}

// ── Drawers individuales (no se ejecutan hasta que se accede a la textura) ──
const _DRAWERS = {
    stripes: (ctx, s) => {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#ffb45b';
        for (let i = 0; i < s; i += 32) ctx.fillRect(0, i, s, 16);
    },
    dots: (ctx, s) => {
        ctx.fillStyle = '#1a2e35';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#5be3ff';
        for (let y = 16; y < s; y += 32) {
            for (let x = 16; x < s; x += 32) {
                ctx.beginPath();
                ctx.arc(x, y, 9, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    gradient: (ctx, s) => {
        const g = ctx.createLinearGradient(0, 0, s, s);
        g.addColorStop(0, '#ff7a9c');
        g.addColorStop(0.5, '#9b5bff');
        g.addColorStop(1, '#5be3ff');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
    },
    wood: (ctx, s) => {
        ctx.fillStyle = '#6b3f23';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 14; i++) {
            ctx.strokeStyle = `rgba(40,20,8,${0.25 + Math.random() * 0.3})`;
            ctx.lineWidth = 2 + Math.random() * 4;
            ctx.beginPath();
            const yOff = (i / 14) * s + (Math.random() * 6 - 3);
            ctx.moveTo(0, yOff);
            for (let x = 0; x <= s; x += 16) {
                ctx.lineTo(x, yOff + Math.sin(x * 0.05 + i) * 6);
            }
            ctx.stroke();
        }
    },
};