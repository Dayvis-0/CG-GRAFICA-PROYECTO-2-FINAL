import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Carga e instancia juguetes en la escena.
 * @param {function(THREE.Object3D): void} [onToyLoaded] - Callback invocado por cada juguete cargado.
 * @returns {THREE.Group}
 */
export function createToyModels(onToyLoaded) {
    const group = new THREE.Group();
    const loader = new GLTFLoader();

    const notifyLoaded = (obj) => {
        if (typeof onToyLoaded === 'function') {
            onToyLoaded(obj);
        }
    };

    // Patito de Goma
    loader.load(
        'src/assets/Duck.glb',
        (gltf) => {
            const duck = gltf.scene;
            duck.scale.set(0.008, 0.008, 0.008);
            duck.position.set(-4.5, 0, 4.5);
            duck.rotation.y = Math.PI / 4;
            duck.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            group.add(duck);
            notifyLoaded(duck);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando Duck.glb', err)
    );

    // Camioncito de Leche
    loader.load(
        'src/assets/CesiumMilkTruck.glb',
        (gltf) => {
            const truck = gltf.scene;
            truck.scale.set(0.4, 0.4, 0.4);
            truck.position.set(-2.5, 0, -5.2);
            truck.rotation.y = Math.PI / 6;
            truck.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            group.add(truck);
            notifyLoaded(truck);
        },
        undefined,
        (err) => console.warn('[GLTF] Error cargando CesiumMilkTruck.glb', err)
    );

    // Trencito de Madera
    const train = createToyTrain();
    train.position.set(-4.8, 0.2, -3.2);
    train.rotation.y = Math.PI / 3;
    group.add(train);
    notifyLoaded(train);

    // Osito de Peluche
    const teddy = createTeddyBear();
    teddy.position.set(5.2, 0.45, -2.5);
    teddy.rotation.y = -Math.PI / 4;
    group.add(teddy);
    notifyLoaded(teddy);

    // Pelota de Juguete
    const ball = createToyBall();
    ball.position.set(4.8, 0.45, 4.2);
    group.add(ball);
    notifyLoaded(ball);

    return group;
}

// Crea trencito
function createToyTrain() {
    const trainGroup = new THREE.Group();

    // Materiales coloridos para niños
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff3d00, roughness: 0.4 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x29b6f6, roughness: 0.4 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffd600, roughness: 0.4 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 });

    // Cuerpo principal de la locomotora
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.1), redMat);
    body.position.y = 0.2;
    body.castShadow = true;
    trainGroup.add(body);

    // Cabina trasera
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.5), blueMat);
    cabin.position.set(0, 0.5, -0.25);
    cabin.castShadow = true;
    trainGroup.add(cabin);

    // Chimenea frontal
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.35, 16), yellowMat);
    chimney.position.set(0, 0.5, 0.35);
    chimney.castShadow = true;
    trainGroup.add(chimney);

    // 4 Ruedas
    const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const positions = [
        [-0.38, 0.18, 0.35],
        [ 0.38, 0.18, 0.35],
        [-0.38, 0.18, -0.35],
        [ 0.38, 0.18, -0.35],
    ];

    positions.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(x, y, z);
        wheel.castShadow = true;
        trainGroup.add(wheel);
    });

    return trainGroup;
}

// Crea osito
function createTeddyBear() {
    const bearGroup = new THREE.Group();

    const furMat = new THREE.MeshStandardMaterial({ color: 0xbf8040, roughness: 0.9 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf5d6b3, roughness: 0.8 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

    // Cuerpo
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), furMat);
    body.scale.set(1, 1.1, 0.9);
    body.castShadow = true;
    bearGroup.add(body);

    // Cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), furMat);
    head.position.y = 0.65;
    head.castShadow = true;
    bearGroup.add(head);

    // Orejas
    const earGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const leftEar = new THREE.Mesh(earGeo, furMat);
    leftEar.position.set(-0.25, 0.95, 0);
    bearGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, furMat);
    rightEar.position.set(0.25, 0.95, 0);
    bearGroup.add(rightEar);

    // Hocico y Nariz
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), snoutMat);
    snout.position.set(0, 0.6, 0.28);
    bearGroup.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), blackMat);
    nose.position.set(0, 0.64, 0.4);
    bearGroup.add(nose);

    // Ojos
    const eyeGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const leftEye = new THREE.Mesh(eyeGeo, blackMat);
    leftEye.position.set(-0.12, 0.72, 0.31);
    bearGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, blackMat);
    rightEye.position.set(0.12, 0.72, 0.31);
    bearGroup.add(rightEye);

    // Brazos
    const armGeo = new THREE.SphereGeometry(0.18, 12, 12);
    armGeo.scale(0.8, 1.5, 0.8);

    const leftArm = new THREE.Mesh(armGeo, furMat);
    leftArm.position.set(-0.4, 0.2, 0.1);
    bearGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, furMat);
    rightArm.position.set(0.4, 0.2, 0.1);
    bearGroup.add(rightArm);

    return bearGroup;
}

// Crea pelota
function createToyBall() {
    const geo = new THREE.SphereGeometry(0.45, 32, 32);

    // Textura de rayas coloridas para pelota infantil
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const colors = ['#ff1744', '#00e676', '#ffea00', '#2979ff'];
    const stripeHeight = 256 / colors.length;

    colors.forEach((color, idx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, idx * stripeHeight, 256, stripeHeight);
    });

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.2,
        metalness: 0.1,
    });

    const ball = new THREE.Mesh(geo, mat);
    ball.rotation.z = Math.PI / 6;
    ball.castShadow = true;
    ball.receiveShadow = true;
    return ball;
}
