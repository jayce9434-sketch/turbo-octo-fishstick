# BUGBREAK: Colony Siege — Update 5.1: SIMPLE ROOMS

BUGBREAK is a mobile/desktop browser colony-defense game built to run directly on GitHub Pages. This build focuses on better art, a real soundtrack, usernames, settings, installable app icons, more playable insects, and free small-group co-op without a paid game server.

## Update 5.1 highlights
- 50-wave campaign across 5 distinct visual biomes: Clover Meadow, Flower Bed, Night Garden, Compost Yard, and Porch Raid.
- 7 playable insects: Ant, Termite, Ladybug, Fly, Mosquito, Bumblebee, and Stag Beetle.
- Every insect has its own stats and active ability.
- Large environment/art pass with biome-specific set pieces, lighting, flowers, pond/log details, elites, upgraded insects and boss visuals.
- 5 real normal biome music tracks and 6 faster boss themes stored locally as MP3 files.
- Boss music hard-switches when a boss starts; peaceful biome music resumes outside boss fights.
- Settings screen with Master, Music, and SFX volume sliders from 0% to 2000%, normal-music toggle, and screen-shake toggle.
- Audio is routed through a WebAudio compressor/limiter so boosted settings are intentionally extreme without relying only on raw browser clipping.
- Usernames are saved locally and appear over player insects.
- Shared Yard co-op: one host browser owns the yard, creates a 4-character room code, and up to two friends join by typing that code. PeerJS Cloud handles free signaling; gameplay is sent with WebRTC.
- The host is authoritative for enemies, nest state, damage, enemy deaths, wave state, and run results; guest movement/actions are sent to the host.
- Co-op enemy count/HP scales upward slightly when friends are connected.
- Random events, elite predators, contracts, combos/Frenzy, relic choices, mutations, gems, repair ability, and 12 permanent upgrades.
- Installable PWA metadata, service worker caching, 192px/512px icons, and Apple touch icon.
- Local save/settings data uses localStorage.

## Multiplayer limitations
GitHub Pages cannot provide its own always-on game server. Shared Yard therefore uses a free PeerJS Cloud signaling service to let players find the host using a 4-character code. After signaling, the host is the single authoritative game instance and gameplay uses WebRTC peer-to-peer data channels. Some restrictive NAT/firewall combinations can still prevent a direct connection because this zero-cost build does not include a paid TURN relay.

## Controls
Desktop: WASD / arrows move, Space/J bite, Shift/K dash, E/L special ability, R repair, Escape pause.

Mobile/tablet: virtual joystick plus REPAIR, SPECIAL, DASH, and BITE buttons.

## GitHub Pages
Upload every non-screenshot game file from this ZIP directly into the root of a repository, or simply upload the entire flat ZIP contents. There are no folders inside the ZIP. Enable GitHub Pages for the repository root/default branch, then open the generated Pages URL.

## App icon / install
`icon-192.png`, `icon-512.png`, and `apple-touch-icon.png` are included. `manifest.json` and `sw.js` make the site installable/offline-capable on supporting browsers. On iPad/iPhone, use Safari's **Add to Home Screen** to use the app icon.

## QA
The JavaScript files were syntax-checked with Node. The included Update 5.1 screenshots were captured from the current build and cover the menu, gameplay, boss battle, settings, and Shared Yard multiplayer UI. Audio files were validated as playable MP3s. The room-code layer was QA-tested for 4-character room generation, guest join flow, and the 3-player cap using a controlled PeerJS test peer. The actual internet connection still depends on PeerJS Cloud and the players' networks, so a direct connection cannot be guaranteed on every restrictive network without a TURN relay.


## Why 5.1 exists
The old manual WebRTC invite/answer flow was removed because it was too complicated and unreliable. Hosting now creates one 4-character room code and friends join by typing it. The app icon was also replaced with a simple top-down ant/garden icon that matches the actual game art instead of advertising artwork the game does not contain.


## v5.2 lobby-to-run fix
- Only the host starts multiplayer gameplay.
- The lobby now has a clear **START SHARED EXPEDITION** button for the host.
- Connected guests automatically enter the run when the host starts.
- Guests can no longer accidentally start their own separate run.
- Late joiners are automatically pulled into the host's current expedition.
