/**
 * Adapta la cámara FPS y el renderer al cambiar el tamaño de la ventana.
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.WebGLRenderer} renderer
 */
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