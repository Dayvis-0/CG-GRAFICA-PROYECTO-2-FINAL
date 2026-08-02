/**
 * Constantes de física centralizadas para Cannon-es.
 * Evita números mágicos inline en BodyFactory y PhysicsSystem.
 */

export const PHYSICS_CONSTANTS = {
    LINEAR_DAMPING: 0.05,
    ANGULAR_DAMPING: 0.1,
    SLEEP_SPEED_LIMIT: 0.12,
    SLEEP_TIME_LIMIT: 1.0,
    MIN_WALL_THICKNESS: 0.1,

    // Fricción y restitución por par de materiales (consumidas por PhysicsWorld — CON-002)
    PIECE_FRICTION: 0.45,        // pieza vs pieza y pieza vs panel
    WALL_FRICTION: 0.6,          // pieza vs pared
    GROUND_FRICTION: 0.7,        // pieza vs piso
    DEFAULT_RESTITUTION: 0.05,   // pieza vs pieza
    LOW_RESTITUTION: 0.02,       // pieza vs pared/panel/piso
};
