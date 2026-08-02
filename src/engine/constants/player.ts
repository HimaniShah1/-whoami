export const EYE_HEIGHT = 1.6; // meters — camera height when grounded
export const BASE_SPEED = 4; // meters/second — walk speed
export const SPRINT_MULTIPLIER = 1.8; // multiplier applied to BASE_SPEED while sprinting
export const MOVEMENT_RESPONSIVENESS = 8; // smoothing rate for smoothVelocity; higher = snappier
export const HEAD_BOB_AMPLITUDE = 0.05; // meters — vertical bob offset at peak
export const HEAD_BOB_FREQUENCY = 10; // radians per meter traveled
export const JUMP_VELOCITY = 5; // meters/second — initial upward velocity on jump
export const GRAVITY = 18; // meters/second^2 — downward acceleration while airborne
export const PLAYER_CAPSULE_RADIUS = 0.3; // meters — player collider radius
// Chosen so the capsule's total height (2 * (halfHeight + radius)) equals
// EYE_HEIGHT exactly: standing on a floor at y=0, the capsule's center sits
// at EYE_HEIGHT/2 and its top (where the eyes are) sits at EYE_HEIGHT —
// matching the pre-physics grounded camera height with no new tuning.
export const PLAYER_CAPSULE_HALF_HEIGHT = EYE_HEIGHT / 2 - PLAYER_CAPSULE_RADIUS;
export const PLAYER_EYE_OFFSET = EYE_HEIGHT / 2; // meters — capsule center to eye (== capsule top)
export const CHARACTER_CONTROLLER_OFFSET = 0.01; // meters — Rapier's recommended small stability gap
export const VOID_FALL_RESET_Y = -20; // meters — below this, snap the player back to room-center
