# Sleeping Snorlax

A calm, interactive 3D scene: Snorlax naps in a sunny meadow, and you can poke him.

**Live:** https://cloudylo001.github.io/snorlaxsleeping/ (GitHub Pages) · https://sleeping-snorlax.vercel.app (Vercel)

- **Poke him** — click or tap. He dents where you touch, a fluid ripple travels
  across his body, and he reacts: a twitch, a sleepy head shake, a foot kick, an
  arm swat, a tummy rub, or a full-body grumble. Reactions escalate the more you
  pester him, and a small meter shows how bothered he is.
- **Wake him** — poke rapidly for about six seconds. He sits up, blinks around
  groggily, rubs an eye, then flops back down with a dust burst and a leg kick.
  Poking slowly never wakes him; the meter drains faster than it fills.
- **Snore bubble** — grows out of his mouth on the exhale, trembles as he gets
  annoyed, and pops when he wakes.
- **Look around** — drag to orbit, scroll to zoom. The camera stays locked on
  Snorlax; panning is disabled so he is always centred.

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

The landscape in `src/scene/environment.ts` is hand-built geometry: rolling
hills, conifers and broadleaf trees, boulders, tall grass, flower patches, a
distant mountain ring and drifting clouds. Terrain height comes from an analytic
function, so the same call grounds Snorlax, trees, rocks and grass with no
raycasting, and the middle is dead level so he always lies flat.

This replaced a Gaussian-splat world. Splats smear badly once the camera leaves
the captured region, and the camera has to sit well back because Snorlax is
large — so the environment was visibly distorted. Geometry has no such limit,
reads clean from every angle, casts real shadows, and cut the bundle from
5.6 MB to 0.6 MB by dropping the splat runtime.

Two performance notes worth keeping. Every repeated prop is one merged geometry
drawn as an InstancedMesh, so the whole landscape is ~10 draw calls and 8 shader
programs rather than one per branch. And only Snorlax casts shadows: an
InstancedMesh is frustum-culled as a single object, so letting trees cast would
drag every distant tree into the shadow pass.

## Assets

Generated with [Mint](https://mint.gg) and tracked in `mint-assets.json`.

| Asset | Registry key | Source |
| --- | --- | --- |
| Pastel Belly Snorlax | `snorlax` | [Mint chat](https://mint.gg/chat/ph7epk8xbemdear33wjn9g1kx18bfpdj) |

The model is committed to the repo. The grassland is a `remote_stream` record —
its RAD splat and collider load from Mint's CDN at runtime and are not vendored.

The Snorlax model is the only generated asset. GitHub Pages serves the committed
copy directly; the Vercel deployment ships source only, so it 404s there and
falls back to a durable Mint CDN mirror (see `CDN_MIRRORS` in `src/assets.ts`).

Pages serves the site from `/snorlaxsleeping/` rather than a domain root, so
`vite.config.ts` sets `base` from the `GITHUB_PAGES` env var and
`localArtifactUrl` prefixes `import.meta.env.BASE_URL`. Runtime-built asset URLs
are not rewritten by the bundler, so they have to honour the base themselves.

Snorlax is a Pokémon character owned by Nintendo / Creatures Inc. / GAME FREAK.
This is a personal, non-commercial project.
