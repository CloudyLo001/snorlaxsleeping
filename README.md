# Sleeping Snorlax

A calm, interactive 3D scene: Snorlax naps in a sunny meadow, and you can poke him.

- **Poke him** — click or tap. He dents where you touch, a fluid ripple travels
  across his body, and he reacts: a twitch, a sleepy head shake, a foot kick, an
  arm swat, a tummy rub, or a full-body grumble. Reactions escalate the more you
  pester him, and a small meter shows how bothered he is.
- **Wake him** — poke rapidly for about six seconds. He sits up, blinks around
  groggily, rubs an eye, then flops back down with a dust burst and a leg kick.
  Poking slowly never wakes him; the meter drains faster than it fills.
- **Snore bubble** — grows out of his mouth on the exhale, trembles as he gets
  annoyed, and pops when he wakes.
- **Look around** — drag to orbit, scroll to zoom, WASD to wander (Shift to
  hurry).

## Running it

```bash
npm install
npm run dev
```

`npm run build` typechecks and produces a production bundle in `dist/`.

## How it works

Snorlax is a single **unrigged** mesh — Mint cannot rig him, because his
proportions do not classify as a humanoid character, so there are no skeletal
animation clips. Every motion is procedural instead:

- `src/scene/rigProfiles.ts` paints seven virtual-bone weights (head, both arms,
  both legs, belly, torso) onto the mesh from each vertex's normalized position.
- `src/scene/snorlax.ts` blends those bones in a vertex shader, along with the
  poke dent and ripple.
- `src/scene/reactions.ts` is the reaction library. It asks for *semantic*
  motions (`headYaw`, `armLift`, `legKick`) rather than naming rotation axes,
  because the model is sculpted **sitting** and is tipped 90° while asleep — so
  turning his head is a Z rotation, not the Y you would expect.

A single `upright` value (0 = flopped out asleep, 1 = sitting) drives posture.
Lying down is a deformation of the sculpted sitting pose: tipped onto his back,
squashed flat, limbs splayed. Because tipping swings parts of him through the
ground by amounts that vary per pose, `replantOnGround` re-measures his true
lowest point every frame and plants it on the ground rather than relying on
fixed offsets.

The meadow is a Gaussian-splat world streamed through SparkJS. Splats cannot
receive shadows, so a soft painted contact shadow keeps Snorlax visually planted.

## Assets

Generated with [Mint](https://mint.gg) and tracked in `mint-assets.json`.

| Asset | Registry key | Source |
| --- | --- | --- |
| Pastel Belly Snorlax | `snorlax` | [Mint chat](https://mint.gg/chat/ph7epk8xbemdear33wjn9g1kx18bfpdj) |
| Pastel Anime Meadow | `meadow` | [Mint chat](https://mint.gg/chat/ph73gnsgmmmts415wmexxy97t98bfj8t) |

The model is committed to the repo. The meadow is a `remote_stream` record —
its RAD splat and collider load from Mint's CDN at runtime and are not vendored.

Snorlax is a Pokémon character owned by Nintendo / Creatures Inc. / GAME FREAK.
This is a personal, non-commercial project.
