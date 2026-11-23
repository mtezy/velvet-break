# Velvet Break

A late-night pool club. Twelve missions. One perfect shot.

## Runebound update

The **Lantern Guild** presentation replaces the page-like dashboard with a full-viewport, original 3D pool hall: timber floorboards and trusses, leaded windows, a back bar and hearth, brass pool lamps, cue racks, cups, candles and low-poly background guests. The title screen previews the actual room/table; its arrows inspect all eight builds before entry. Gameplay uses a compact floating HUD. **Missions** opens the campaign drawer, **Tables** opens the relic vault, and **Menu** returns to the title without advancing a solo mission's clock. Online room controls collapse after connection (on phones, tap **Online VS** to reopen them).

Warm practical/studio lighting, cool window fill, atmospheric fog and a vignette establish depth without a full-screen postprocessing chain. Hardware renderers use clearcoat ball materials; software renderers use the lighter enamel shader. **Quality: Auto** detects common software renderers and reduces resolution under sustained moving-frame load; High and Economy are manual overrides. Static scenes are cached. All scene models, textures and title treatments are generated locally; no reference-game assets are copied or fetched. Hardware-GPU quality/performance must still be checked on a real device.

Eight selectable custom builds now have actual cabinet depth, recessed pockets, legs, supports and a floor stage: The Heritage (turned walnut), Afterglow (carbon trestle), Glacier (twin pedestal), Sovereign (fluted columns), Desert Social (flared teak), Obsidian (marble monolith), Kyoto House (ash beams), and Apex Arena (alloy tournament chassis). Table choice persists independently of campaign progress and does not alter collision bounds.

The rune-forged interface includes a relic vault, perspective 3D/overhead camera controls, right-drag orbit and wheel zoom. Balls have enamel reflections, texture-mapped numbers/stripes that roll with the sphere, and a spotted cue ball. Optional shot runes, impact sparks, trails, pocket rings and victory effects respect reduced-motion defaults.

## Online VS

Choose **Online VS**, enter a name and select **8-ball** or **9-ball**, then create a room. Send the invite link or eight-character code to a friend; they open the game and join from a second device. The host picks the table and breaks. A legal scoring pot keeps the turn; fouls give ball in hand (click clear felt before shooting). Both players must request a rematch. Leaving/disconnecting freezes the match rather than silently continuing against an absent opponent.

Online uses the MIT-licensed PeerJS client and public PeerJS signaling/STUN/TURN infrastructure; no account, database, camera or microphone is required. Match data travels over an encrypted WebRTC data channel. The host is authoritative for physics, turn checks and rules; this is casual invite-only play, not ranked anti-cheat. Keep the host tab visible. Restricted networks or unavailable public relay service can prevent joining; the lobby reports failures and timeouts. Campaign/free play stay independent of these online services. Match state is not persisted across reloads.

**Club rules:** 8-ball assigns solids/stripes on a legal pot after the break; an early 8 or foul on the 8 loses, and an opening-break 8 is respotted. 9-ball requires lowest-number-first contact; a legal 9, including a combination/break pot, wins, and a fouled 9 is respotted. Both modes enforce scratches, first contact and a cushion/pot after contact. These variants do not implement called pockets, push-outs, or the three-foul rule; the lobby states these differences.

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
| Mission/table drawers | Missions / Tables in the top navigation; Escape closes |
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

## Implementation

- Deterministic 240 Hz equal-mass billiard simulation with restitution, rolling friction, pockets, scratch respot and raycast aiming.
- Twelve challenges: clean pots, multi-ball clears, banks, called pockets, ordered pots, timed clear and eight-ball-last finales.
- TypeScript and Three.js with orthographic 3D rendering, pointer raycasting, rolling sphere meshes and a Canvas fallback, bundled as a static Vite build. Local sounds use Web Audio synthesis.
- Mission clocks use real elapsed time independently of the fixed physics step, including on low-frame-rate devices; pausing freezes both.
- Responsive layout, keyboard controls, reduced-motion CSS, modal guide and installable app metadata. No service worker, trackers, ads or backend.
- `npm test` checks momentum, tunneling, rolling stops, bank detection, pocket capture, mission success/failure, scratches, timing and free-play rack integrity.

## Assets and rights

The game code, procedural artwork, icon and synthesized sound were created for this project. No third-party art/audio/font assets are used. Runtime dependency `@opengamehq/sdk` is Apache-2.0 licensed; `three` and `peerjs` are MIT licensed. Development dependencies retain their own licenses. System fonts are rendered by the player's browser.
