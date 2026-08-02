import * as THREE from 'three';

/**
 * Configura la iluminación base de la escena.
 * @param {THREE.Scene} scene
 * @returns {{ ambient: THREE.AmbientLight, ceiling: THREE.PointLight, dir: THREE.DirectionalLight }}
 */
export function createLights(scene) {
    const lights = {};

    // Luz ambiental blanca suave
    lights.ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(lights.ambient);

    // Luz de techo tipo foco
    lights.ceiling = new THREE.PointLight(0xffffff, 1.2, 25);
    lights.ceiling.position.set(0, 7.5, 0);
    scene.add(lights.ceiling);

    // Luz direccional principal (con sombras)
    lights.dir = new THREE.DirectionalLight(0xffeedd, 0.6);
    lights.dir.position.set(7, 12, 9);
    lights.dir.castShadow = true;
    lights.dir.shadow.mapSize.set(1024, 1024);
    lights.dir.shadow.camera.left   = -8;
    lights.dir.shadow.camera.right  =  8;
    lights.dir.shadow.camera.top    =  8;
    lights.dir.shadow.camera.bottom = -8;
    lights.dir.shadow.camera.near   = 0.5;
    lights.dir.shadow.camera.far    = 25;
    scene.add(lights.dir);

    return lights;
}