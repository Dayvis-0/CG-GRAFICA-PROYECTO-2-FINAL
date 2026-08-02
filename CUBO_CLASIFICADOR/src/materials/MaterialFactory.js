import * as THREE from 'three';

/**
 * @param {object} textures
 * @returns {function} buildMaterial(type, color, textureKey, wireframe)
 */
export function createMaterialFactory(textures) {
    return function buildMaterial(type, color, textureKey, wireframe = false) {
        const tex = textures.get ? textures.get(textureKey) : (textures[textureKey] || null);
        const common = { color, map: tex, wireframe };

        switch (type) {
            case 'lambert':
                return new THREE.MeshLambertMaterial(common);
            case 'phong':
                return new THREE.MeshPhongMaterial({
                    ...common,
                    shininess: 90,
                    specular: 0x666666,
                });
            case 'standard':
                return new THREE.MeshStandardMaterial({
                    ...common,
                    roughness: 0.35,
                    metalness: 0.45,
                });
            default:
                return new THREE.MeshPhongMaterial(common);
        }
    };
}