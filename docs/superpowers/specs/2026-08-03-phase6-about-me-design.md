# Phase 6: About Me Terminal — Design

## Context

Phase 6 of "Backend Odyssey," following Phase 5 (Entry Sequence, merged to
`main`). Per `SKILLS.md`'s Future Roadmap, Phase 6 is "About Me terminal."
Unlike Phase 5's three entry rooms (infrastructure narrative — load
balancing, routing, auth concepts, none of it personal), `about-me`'s
entire purpose per `ROOM_REGISTRY` is `"A terminal holding cat about.md"` —
genuinely biographical content about the site's real owner.

**Note on process:** scoped and built autonomously, same as Phase 5 — the
project owner delegated all decisions and is unavailable. This phase hits a
real limit of that delegation, recorded here rather than worked around
silently.

## The scope decision this phase turns on

I do not have the site owner's real biography — background, work history,
personality, what they want said about themselves. The only genuinely
verified facts available in this environment are their name (`Himani
Shah`, from git commit authorship) and email (`himanishah202@gmail.com`,
from system context). Inventing anything beyond that — education, prior
roles, personal narrative, achievements — would mean fabricating claims
about a real, named person and shipping them into their own portfolio.
That is not a design judgment call the way a GSAP duration or a room's
rack layout is; it is not mine to guess at, and getting it wrong is worse
than leaving it honestly incomplete.

**Decision: build the room and the terminal mechanism exactly as
roadmapped, but the `about.md` content itself contains only the two
verified facts plus an explicit, honestly-worded note that the narrative
is pending the owner's own words — not an invented bio, not a generic
placeholder that pretends to be real.** Concretely, the terminal prints:
```
cat about.md

Himani Shah
himanishah202@gmail.com

[bio pending — the rest of this file is mine to write]
```
The bracketed line is deliberately in first person and diegetic (reads as
a note left by the site's owner, not a broken TODO comment) so it doesn't
read as an engineering artifact leaking into shipped content, while still
being unambiguously honest that it's a placeholder. This is a smaller,
weaker version of the phase than "About Me terminal" implies, and that's
the point — the alternative (fabricated biography) is worse than an
honest gap. The content constant is isolated in one small, obviously-named
export (`ABOUT_ME_LINES`) specifically so replacing it later is a one-file,
one-constant edit — no component logic to touch.

Everything else about this phase is ordinary engineering: reuse Phase 5's
`Terminal`/`TerminalOverlay`/`RoomShell` wholesale, no new shared
infrastructure, no new `EventBus` events, no new component types.

## Architecture

- **`src/scenes/world/AboutMeRoom.tsx`** — replaces the current thin
  `RoomTemplate` wrapper (`return <RoomTemplate roomId="about-me" />;`)
  with bespoke content, following the exact structural pattern Phase 5
  established for `LoadBalancerRoom`/`ApiGatewayRoom`/`AuthServiceRoom`:
  `RoomShell roomId="about-me" showLabel={false}` wrapping a small amount
  of primitive set-dressing plus one `Terminal`.
  - Geometry: modest and consistent with the "dark industrial baseline" —
    a single low pedestal/plinth the terminal kiosk stands on (addresses
    Phase 5's whole-branch-review Minor note that `Terminal`'s kiosk mesh
    floats unsupported at eye level with nothing beneath it; this phase
    is the first new room built since that finding, so it's the right
    place to start fixing it without a separate cross-cutting task).
  - Terminal: `id="about-me-term"`, `title="about.md"`, `lines:
    ABOUT_ME_LINES` (the constant above), `position={[0, 1.6, 0]}` —
    room-center, matching every Phase 5 room's placement, which is already
    proven clear of both `about-me`'s portals (`SPAWN_Z=6`/`8` derivation
    unchanged from Phase 4/5) and both its spawn points.
- No changes to `RoomShell`, `Terminal`, `TerminalOverlay`, `EventBus`, or
  `SceneManager` — `about-me`'s `ROOM_LOADERS` entry already points at
  `AboutMeRoom.tsx` (Phase 4), and that filename doesn't need to change
  (unlike `load-balancer`'s `PlaceholderRoom` → `LoadBalancerRoom` rename
  in Phase 5), so no registry edit is needed this phase.

## Geometry Safety

`about-me` has a back portal (from `auth-service`) at local `z=+8` and a
forward portal (to `experience-service`) at local `z=-8` — identical
layout to every Phase 5 room. The terminal at room-center and a single
pedestal directly beneath it (no lateral offset, so no new clearance
question versus Phase 5's pillar/panel geometry) means this phase
introduces no new proximity-radius arithmetic to verify beyond what
Phase 4/5 already proved for the standard room template.

## Testing

No unit tests — `AboutMeRoom.tsx` is a thin R3F composition of
already-tested/already-manually-verified components (`RoomShell`,
`Terminal`), matching every Phase 5 bespoke room's bucket.

## Out of Scope (explicitly)

- The real biography. This is the one thing this phase deliberately does
  not attempt, for the reason above.
- Any change to the `Terminal`/`TerminalOverlay` interaction pattern
  itself — Phase 5 already built and fixed it; this phase is a pure
  content consumer.
- Fixing the floating-terminal-kiosk issue in `Terminal.tsx` itself (a
  shared component, which would affect every room) — only adding a
  pedestal locally in this one room's bespoke geometry, since a shared-
  component change is a larger, cross-cutting decision better scoped on
  its own.
