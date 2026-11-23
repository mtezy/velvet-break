# Velvet Break

A late-night pool club. Twelve missions. One perfect shot.

## Club audio

Use **Sound** in the header to hear the original late-night jazz loop, cue strikes, ball clacks, cushion knocks and pocket drops. The adjacent **Volume** slider sets both music and effects; muting keeps your level for when you turn sound back on. OpenGame host mute always takes priority. All audio is synthesized locally, so no tracks or samples need to be downloaded.

## Tournament visual update

Club and Overhead now frame the playing surface more closely, with shaped cushion noses, bevelled walnut rails, fitted leather pocket mouths, recessed dark wells and worsted teal cloth. A bordered club rug, darker room and balanced warm/cool light keep the table in focus. The floating HUD is quieter and leaves the cloth visible.

Balls use stronger tournament colours, glossy enamel/clearcoat, prefiltered studio reflections and soft contact shadows. **Numbers on/off** adds camera-facing numbers while balls are nearly at rest; the textured spheres and stripes still roll normally during a shot. Turn it off for the unlabelled material view.

**Angle** also adjusts left/right and near/far framing independently of orbit, elevation and zoom. Middle-drag or Shift + right-drag pans on the table plane; touch screens use the sliders. **Centre the table** keeps the angle/zoom, **Save my angle** persists all five settings, and **My angle** restores them. Legacy angle-only saves remain supported, including zero azimuth. Overhead can be adjusted and saved without losing its top-down elevation.

Textures are deterministic and generated only when models are built; there are no fetched assets, live reflection probes, full-scene shadow maps or added postprocessing passes. Static batching, idle-frame caching, adaptive Auto quality and manual Economy/High modes remain. Automated physics/rules checks and the production build pass; this VM uses software rendering, so real-laptop GPU frame rate is not certified here.

## Runebound update

The **Lantern Guild** presentation replaces the page-like dashboard with a full-viewport, original 3D pool hall: timber floorboards and trusses, leaded windows, a back bar and hearth, brass pool lamps, cue racks, cups, candles and low-poly background guests. The title screen previews the actual room/table; its arrows inspect all eight builds before entry. Gameplay uses a compact floating HUD. **Missions** opens the campaign drawer, **Loadout** opens the table/cue vault, and **Menu** returns to the title without advancing a solo mission's clock. Online room controls collapse after connection (on phones, tap **Online VS** to reopen them).

**Angle** opens a camera editor with Club/Overhead/Rail-eye presets and orbit, elevation and distance sliders. Save a personal view, restore it with **My angle**, or Reset to Club. The view refits portrait screens; it never changes table collision bounds. Six cosmetic cues—Ashborne, Nightglass, Sunforge, Ivory Regent, Crimson Oath and Aether—have distinct shafts, textured wraps/butts, metal collars and faceted inlays. Equip one under **Loadout → Cues** or inspect/turn its enlarged 3D model. Cue and camera choices persist locally; cues never change shot power or online rules. Finish inspection before shooting.

Warm practical/studio lighting, cool window fill, atmospheric fog and a vignette establish depth without a full-screen postprocessing chain. Hardware renderers use clearcoat ball materials; software renderers use the lighter enamel shader. **Quality: Auto** detects common software renderers and reduces resolution under sustained moving-frame load; High and Economy are manual overrides. Static scenes are cached. All scene models, textures and title treatments are generated locally; no reference-game assets are copied or fetched. Hardware-GPU quality/performance must still be checked on a real device.

Eight selectable custom builds now have actual cabinet depth, recessed pockets, legs, supports and a floor stage: The Heritage (turned walnut), Afterglow (carbon trestle), Glacier (twin pedestal), Sovereign (fluted columns), Desert Social (flared teak), Obsidian (marble monolith), Kyoto House (ash beams), and Apex Arena (alloy tournament chassis). Table choice persists independently of campaign progress and does not alter collision bounds.

The rune-forged interface includes a relic vault, perspective 3D/overhead camera controls, right-drag orbit and wheel zoom. Balls have enamel reflections, texture-mapped numbers/stripes that roll with the sphere, and a spotted cue ball. Optional shot runes, impact sparks, trails, pocket rings and victory effects respect reduced-motion defaults.

## Offline VS CPU

Choose **Vs CPU**, select **8-ball** or **9-ball** and **Easy / Medium / Hard**. You break first; the same club rules below apply without any network connection. Click clear felt for ball in hand. Restart/R starts a new rack; P pauses both the match and CPU thinking. Results offer Rematch or Back to menu.

The seeded CPU searches ghost-ball pocket lines, bank shots and safeties using cloned real-physics matches. Easy has fewer trials, roughly ±3° aim error and no spin; Medium uses ±1° and some spin; Hard uses ±0.3°, spin and next-shot position scoring. Search is capped at 6/16/28 simulations and yields between candidates so it does not block an entire decision into one frame. Ball-in-hand placement compares clear spots on a coarse grid.

The cue-ball picker (or W/S, A/D, C to centre) applies follow, draw and side english. Spin resets after shooting; longer shots lose draw. A short fading white path previews cue travel after contact, including the first nearby cushion rebound, alongside the object-ball line.

## Online VS

Choose **Online VS**, enter a name and select **8-ball** or **9-ball**, then create a room. Send the invite link or eight-character code to a friend; they open the game and join from a second device. The host picks the table and breaks. A legal scoring pot keeps the turn; fouls give ball in hand (click clear felt before shooting). Both players must request a rematch. Leaving/disconnecting freezes the match rather than silently continuing against an absent opponent.

Online uses the MIT-licensed PeerJS client and public PeerJS signaling/STUN/TURN infrastructure; no account, database, camera or microphone is required. Match data travels over an encrypted WebRTC data channel. The host is authoritative for physics, turn checks and rules; this is casual invite-only play, not ranked anti-cheat. Keep the host tab visible. Restricted networks or unavailable public relay service can prevent joining; the lobby reports failures and timeouts. Campaign/free play stay independent of these online services. Match state is not persisted across reloads.

**8-ball:** A legal break pots an object ball or sends at least four different object balls to cushions. An illegal break gives the opponent ball in hand; a break scratch limits placement to the kitchen (behind the head string on the left of the table). The 8 is respotted if potted on the break. The first legal pot after the break assigns solids or stripes. After clearing your group, click or tap the pocket you intend to use for the 8 before shooting. Potting the 8 early, on a foul, or into a different pocket loses the rack.

**9-ball:** Hit the 1 first on the break and pot an object ball or send at least four different object balls to cushions. On the first shot after a legal break, the shooter may declare **Push out**, waiving the first-ball and cushion requirements. After a legal push-out, the opponent chooses **Shoot from here** or **Pass back**. Otherwise, hit the lowest ball first; a legal 9 wins even on the break or a combination, and the 9 is respotted on a foul or push-out. Two consecutive fouls by a player trigger a warning; that player's third consecutive foul loses the rack. A legal shot resets that player's count.

Both modes enforce scratches, legal first contact and a cushion or object-ball pot after contact on ordinary shots. These are club rules; 8-ball does not require calling pockets for solids or stripes and does not offer an optional re-rack on a break foul.

A browser billiards game with a handcrafted single-player mission campaign, full-rack free play, invite-only online VS, three-star scoring, local progress, procedural sound and mouse/keyboard controls. Three.js renders the table and rolling 3D balls with procedural materials, lighting and lightweight contact shadows; a Canvas fallback supports browsers without WebGL. No external art, fonts, audio downloads, account or game backend is required; online play uses the public PeerJS service.

## Run

Node.js 24+ is recommended. The stack uses the latest stable versions available when built: TypeScript 7.0.2, Vite 8.3.8, Three.js 0.187.0 and OpenGame SDK 0.5.1.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm start
```

## Controls

| Action | Input |
| --- | --- |
| Aim | Move the mouse over the table; click briefly to lock the angle |
| Shoot | Hold the mouse button to charge, release to strike |
| Alternative shoot | Power slider + Strike, or hold/release Space |
| Fine aim | Left / Right arrows; hold Shift for finer adjustments |
| Adjust power | Up / Down arrows |
| Restart | R or Restart button |
| Pause | P (also pauses when the tab is hidden) |
| Cancel charge | Escape |
| Orbit / zoom | Right-drag / scroll over table |
| Precision camera | Overhead button; Reset view restores 3D club |
| Ball in hand (VS) | Click an empty spot on felt before shooting |
| Mission/loadout drawers | Missions / Loadout in the top navigation; Escape closes |
| Personal camera | Angle editor → Save my angle; My angle restores |
| Custom cues | Loadout → Cues; Inspect cue in 3D; Finish inspection |
| Rendering quality | Auto → High → Economy button |

The first mission starts aimed at the ball so a 35% shot is a useful introduction. A scratch returns the cue ball and costs an extra shot. Bank objectives require the **object** ball to touch a rail in the same shot it drops. Called-pocket and ordered-pot rules are explained before the shot. Any mission can be selected, so players can explore without grinding unlocks. Stars and personal-best shot counts are kept only in this browser; clearing browser storage removes them. Sound is off until enabled.

## OpenGame export

```sh
npm run package:game
```

This writes `release/velvet-break-opengame.zip`, with `index.html` at the root. Upload that ZIP at https://opengame.io/deploy. The `opengame.json` project manifest declares the Racing & sports track and the static build directory. For the official CLI:

```sh
npx opengame check . --build
npx opengame login
npx opengame deploy .
```

The owner must sign in, review the private preview, confirm competition eligibility and submit/publish the entry themselves. Building this project does not submit it to the jam. SDK initialization, ready, host pause and host mute are integrated; the first frame and solo gameplay do not depend on a platform connection. OpenGame sandbox/network compatibility for PeerJS must be checked in its private preview before publication; ordinary browser testing does not prove platform approval. No platform credentials belong in the game build.

[Velvet Break cover artwork](artwork/opengame-cover.jpg) is a 1600 × 900 render of the Heritage table for use outside the game. [OpenGame generates the hosted cover and share image after approval](https://docs.opengame.io/guides/updating#your-games-cover); it does not accept a cover image in the project manifest.

## Implementation

- Deterministic 240 Hz equal-mass billiard simulation with restitution, rolling friction, pockets, scratch respot and raycast aiming.
- Twelve challenges: clean pots, multi-ball clears, banks, called pockets, ordered pots, timed clear and eight-ball-last finales.
- TypeScript and Three.js with orthographic 3D rendering, pointer raycasting, rolling sphere meshes and a Canvas fallback, bundled as a static Vite build. Local sounds use Web Audio synthesis.
- Mission clocks use real elapsed time independently of the fixed physics step, including on low-frame-rate devices; pausing freezes both.
- Responsive layout, keyboard controls, reduced-motion CSS, modal guide and installable app metadata. No service worker, trackers, ads or backend.
- `npm test` checks momentum, tunneling, rolling stops, bank detection, pocket capture, mission success/failure, scratches, timing and free-play rack integrity.

## Assets and rights

The game code, procedural artwork, icon and synthesized sound were created for this project. No third-party art/audio/font assets are used. Runtime dependency `@opengamehq/sdk` is Apache-2.0 licensed; `three` and `peerjs` are MIT licensed. Development dependencies retain their own licenses. System fonts are rendered by the player's browser.
