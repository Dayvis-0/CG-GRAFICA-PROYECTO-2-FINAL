import * as THREE from 'three';

/**
 * Configura luces de escena.
 * @param {THREE.Scene} scene
 * @returns {{ ambient: THREE.AmbientLight, ceiling: THREE.PointLight, dir: THREE.DirectionalLight }}
 */
export function createLights(scene) {
    const lights = {};

    // Luz ambiental.
    lights.ambient = new THREE.AmbientLight(0xfff8e7, 0.55);
    scene.add(lights.ambient);

    // Luz central desactivada.
    lights.ceiling = new THREE.PointLight(0xffffff, 3.5, 35);
    lights.ceiling.position.set(0, 7.5, 0);
    lights.ceiling.castShadow = true;
    lights.ceiling.shadow.mapSize.set(1024, 1024);
    lights.ceiling.shadow.bias = -0.002;
    lights.ceiling.visible = false;
    scene.add(lights.ceiling);

    // Luz direccional con sombras.
    lights.dir = new THREE.DirectionalLight(0xfff0dd, 0.8);
    lights.dir.position.set(7, 12, 9);
    lights.dir.castShadow = true;
    lights.dir.shadow.mapSize.set(1024, 1024);
    lights.dir.shadow.camera.left   = -8;
    lights.dir.shadow.camera.right  =  8;
    lights.dir.shadow.camera.top    =  8;
    lights.dir.shadow.camera.bottom = -8;
    lights.dir.shadow.camera.near   = 0.5;
    lights.dir.shadow.camera.far    = 25;
    lights.dir.visible = true;
    scene.add(lights.dir);

    return lights;
}