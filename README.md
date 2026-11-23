# Velvet Break

A late-night pool club. Twelve missions. One perfect shot.

A complete, single-player browser billiards game with a handcrafted mission campaign, full-rack free play, three-star scoring, local progress, procedural sound and mouse/keyboard controls. All graphics are drawn in Canvas; no external art, fonts, audio downloads, account or server is required.

## Run

Node.js 24+ is recommended. The stack uses the latest stable versions available when built: TypeScript 7.0.2, Vite 8.3.8 and OpenGame SDK 0.5.1.

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

The first mission starts aimed at the ball so a 35% shot is a useful introduction. A scratch returns the cue ball and costs an extra shot. Bank objectives require the **object** ball to touch a rail in the same shot it drops. Called-pocket and ordered-pot rules are explained before the shot. Any mission can be selected, so players can explore without grinding unlocks. Stars and personal-best shot counts are kept only in this browser; clearing browser storage removes them. Sound is off until enabled.

## OpenGame export

```sh
npm run package:game
```

This writes `release/velvet-break-opengame.zip`, with `index.html` at the root. Upload that ZIP at https://opengame.io/deploy. The `opengame.json` project manifest declares the Racing & sports track and the static build directory. For the official CLI:

```sh
npm install -g @opengamehq/cli
opengame check . --build
opengame login
opengame deploy .
```

The owner must sign in, review the private preview, confirm competition eligibility and submit/publish the entry themselves. Building this project does not submit it to the jam. SDK initialization, ready, host pause and host mute are integrated; the first frame and gameplay do not depend on a platform connection. No platform credentials belong in the game build.

## Implementation

- Deterministic 240 Hz equal-mass billiard simulation with restitution, rolling friction, pockets, scratch respot and raycast aiming.
- Twelve challenges: clean pots, multi-ball clears, banks, called pockets, ordered pots, timed clear and eight-ball-last finales.
- Framework-free TypeScript and Canvas, bundled as a tiny static Vite build. Local sounds use Web Audio synthesis.
- Responsive layout, keyboard controls, reduced-motion CSS, modal guide and installable app metadata. No service worker, trackers, ads or backend.
- `npm test` checks momentum, tunneling, rolling stops, bank detection, pocket capture, mission success/failure, scratches, timing and free-play rack integrity.

## Assets and rights

The game code, Canvas artwork, icon and synthesized sound were created for this project during the November 2026 jam. No third-party art/audio/font assets are used. Runtime dependency `@opengamehq/sdk` is Apache-2.0 licensed; development dependencies retain their own licenses. System fonts are rendered by the player's browser.
Velvet Break: a pool game with a mission campaign, built for OpenGame
