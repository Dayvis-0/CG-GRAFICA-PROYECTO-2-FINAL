import * as CANNON from 'cannon-es';
import { PHYSICS_CONSTANTS } from '../data/physicsConstants.js';

export function createPhysicsWorld() {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -35, 0) });
    
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 30;
    world.allowSleep = true;

    const materials = {
        piece:  new CANNON.Material('piece'),
        wall:   new CANNON.Material('wall'),
        panel:  new CANNON.Material('panel'),
        ground: new CANNON.Material('ground'),
    };

    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.piece, {
        friction: PHYSICS_CONSTANTS.PIECE_FRICTION,
        restitution: PHYSICS_CONSTANTS.DEFAULT_RESTITUTION,
    }));

    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.wall, {
        friction: PHYSICS_CONSTANTS.WALL_FRICTION,
        restitution: PHYSICS_CONSTANTS.LOW_RESTITUTION,
    }));

    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.panel, {
        friction: PHYSICS_CONSTANTS.PIECE_FRICTION,
        restitution: PHYSICS_CONSTANTS.LOW_RESTITUTION,
    }));

    world.addContactMaterial(new CANNON.ContactMaterial(materials.piece, materials.ground, {
        friction: PHYSICS_CONSTANTS.GROUND_FRICTION,
        restitution: PHYSICS_CONSTANTS.LOW_RESTITUTION,
    }));

    function step(dt) {
        world.fixedStep(1 / 240, dt);
    }

    return { world, materials, step };
}