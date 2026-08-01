# Sleeping Snorlax

A calm, interactive 3D scene: Snorlax naps in a sunny meadow, and you can poke him.

**Live:** https://cloudylo001.github.io/snorlaxsleeping/ (GitHub Pages) · https://sleeping-snorlax.vercel.app (Vercel)

- **Poke him** — a large pulsing "Poke Snorlax" prompt invites the first
  interaction, then shrinks to a quiet reminder once you have. Click or tap. He dents where you touch, a fluid ripple travels
  across his body, and he fidgets: a twitch, a foot flick, a sleepy head shake,
  restless leg shuffling, an uncomfortable squirm, an arm swat, a long stretch,
  burying his face away from you, a shiver, a tummy rub, a grumble, or heaving
  his whole body over to turn his back on you. Fourteen in all. They escalate
  the more you pester him, never repeat back to back, and a small meter shows
  how bothered he is.
- **Score** — every poke that lands scores, and poking fast builds a combo
  multiplier that climbs a step every three pokes up to x8, then lapses if you
  pause for a beat. The number springs about 35% larger on each poke and
  overshoots on the way back, punching harder the higher the multiplier. It
  resets on refresh, like his size.
- **Wake him** — poke rapidly for about six seconds. The snore bubble bursts
  first and he lies still for a beat, then heaves upright, blinks around
  groggily, rubs an eye, and flops back down with a heavy landing, a dust burst
  and a leg kick. Poking slowly never wakes him; the meter drains faster than it
  fills.
- **He grows** — every waking leaves him permanently 20% bigger, with a visible
  balloon-like inflation, and he stays that size when he goes back to sleep.
  There is no cap. A refresh returns him to his original size. The gear button
  switches when the inflation plays and how it feels.
- **Snore bubble** — grows out of his mouth on the exhale, trembles as he gets
  annoyed, and pops when he wakes.
- **Sound** — a serene ambient bed with soft wind, occasional deep snoring on
  his exhale, a pop when the bubble bursts and a loud padded whump when he
  lands. Both the snore and the thud pitch down as he grows. The speaker button
  mutes everything, and the choice is remembered.
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

Growth is a uniform scale, not a second model — the poke dent, bone deformation
and snore bubble all sit inside his transform, so they scale for free. The scale
group deliberately sits *below* `groundGroup`, because the ground re-planting
writes a world-space delta into a local position and would be wrong by the scale
factor otherwise. `sitHeight`, `restHeight` and `restFootprint` are getters that
track his current size, which is how the camera, dust burst and Zzz particles
stay in proportion.

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
| Serene Meadow Ambience | `ambience` | [Mint chat](https://mint.gg/chat/ph765xjgq39ndk9w97qkpnxzx98bg3y4) |
| Giant Creature Snore | `snore` | [Mint chat](https://mint.gg/chat/ph7fg2hpdb8pkjgxxpv2g6r74x8bhr9w) |
| Soft Bubble Pop | `pop` | [Mint chat](https://mint.gg/chat/ph73zfjeb682vwqsynge4d3a4s8bgmcz) |
| Giant Soft Body Thud | `thud` | [Mint chat](https://mint.gg/chat/ph702rm8b2y8rvjpqvp3xsdech8bge1z) |

The model is committed to the repo. The grassland is a `remote_stream` record —
its RAD splat and collider load from Mint's CDN at runtime and are not vendored.

GitHub Pages serves the committed copies directly; the Vercel deployment ships source only, so it 404s there and
falls back to a durable Mint CDN mirror (see `CDN_MIRRORS` in `src/assets.ts`).

Pages serves the site from `/snorlaxsleeping/` rather than a domain root, so
`vite.config.ts` sets `base` from the `GITHUB_PAGES` env var and
`localArtifactUrl` prefixes `import.meta.env.BASE_URL`. Runtime-built asset URLs
are not rewritten by the bundler, so they have to honour the base themselves.

Snorlax is a Pokémon character owned by Nintendo / Creatures Inc. / GAME FREAK.
This is a personal, non-commercial project.
