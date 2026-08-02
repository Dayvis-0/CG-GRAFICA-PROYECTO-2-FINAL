import * as CANNON from 'cannon-es';

/**
 * Mundo de físicas cannon-es.
 * Responsabilidad ÚNICA: mantener el world, los materiales y los contact materials.
 * No sabe de meshes de Three ni de reglas del juego.
 *
 * @returns {{
 *   world: CANNON.World,
 *   materials: { piece: CANNON.Material, wall: CANNON.Material, panel: CANNON.Material, ground: CANNON.Material },
 *   step: (dt: number) => void,
 * }}
 */
export function createPhysicsWorld() {
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -35, 0),
    });

    // Broadphase: las piezas son pocas, NaiveBroadphase suficiente y exacto
    world.broadphase = new CANNON.NaiveBroadphase();

    // Solver: más iteraciones = contactos más estables con piezas rápidas
    world.solver.iterations = 30;

    // Sleep: cuerpos quietos no consumen CPU
    world.allowSleep = true;

    // ─── Materiales de colisión ────────────────────────────────────
    const materials = {
        piece:  new CANNON.Material('piece'),
        wall:   new CANNON.Material('wall'),
        panel:  new CANNON.Material('panel'),
        ground: new CANNON.Material('ground'),
    };

    // Pieza vs pieza: fricción media, rebote bajo
    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.piece, {
        friction: 0.45,
        restitution: 0.05,
    }));

    // Pieza vs pared: fricción alta (que no resbale)
    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.wall, {
        friction: 0.6,
        restitution: 0.02,
    }));

    // Pieza vs panel perforado: fricción media
    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.panel, {
        friction: 0.45,
        restitution: 0.02,
    }));

    // Pieza vs piso del cuarto: media/alta
    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.ground, {
        friction: 0.7,
        restitution: 0.02,
    }));

    /** Avanza la simulación. El dt se capa a 1/30 en AnimationLoop para evitar espiral de muerte. */
    function step(dt) {
        world.fixedStep(1 / 240, dt);
    }

    return { world, materials, step };
}