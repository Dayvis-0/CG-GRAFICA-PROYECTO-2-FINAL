// Maneja el redimensionamiento de ventana para actualizar la cámara y el renderizador.
export function setupResize(camera, renderer) {
    let resizeScheduled = false;

    const onResize = () => {
        if (resizeScheduled) return;
        resizeScheduled = true;

        requestAnimationFrame(() => {
            const w = window.innerWidth;
            const h = window.innerHeight;

            camera.aspect = w / h;
            camera.updateProjectionMatrix();

            renderer.setSize(w, h);
            resizeScheduled = false;
        });
    };

    window.addEventListener('resize', onResize);

    return {
        dispose() {
            window.removeEventListener('resize', onResize);
        },
    };
}