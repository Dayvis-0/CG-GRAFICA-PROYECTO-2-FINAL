/**
 * Constantes de física centralizadas para Cannon-es.
 * Evita números mágicos inline en BodyFactory y PhysicsSystem.
 */

export const PHYSICS_CONSTANTS = {
    DEFAULT_RESTITUTION: 0.05,
    PANEL_FRICTION: 0.4,
    PIECE_FRICTION: 0.3,
    PIECE_MASS: 1.0,
    LINEAR_DAMPING: 0.05,
    ANGULAR_DAMPING: 0.1,
    SLEEP_SPEED_LIMIT: 0.12,
    SLEEP_TIME_LIMIT: 1.0,
    MIN_WALL_THICKNESS: 0.1,
    DEFAULT_CYLINDER_SEGMENTS: 12,
};
