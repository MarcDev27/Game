# Neon Strata

A Terraria-inspired 2D sandbox survival game set on a shattered terraforming world in a hyper-technological far future. You dig, build, craft, fish, colonize and fight your way from scrap tools to Singularity-grade technology.

It runs in any modern browser. It is designed for every current iPhone, including iPhone Duo: touch controls with 44-pt targets, safe-area layout in portrait and landscape, fold-aware layouts, and full-screen play offline once you add it to your Home Screen.

It is more than Terraria with a sci-fi skin. Neon Strata has its own systems:
- **Vehicles:** a Scrap Hoverbike, a Bore Pod that drills through rock, the Aerodyne Sky Car (a flying car), a Titan Walker mech and the Starjumper shuttle.
- **Cyberware:** 22 body-mod implants in six slots (Neural, Optics, Arms, Spine, Legs, Core), installed at a Surgery Bay. Each implant costs capacity. Neural implants give active abilities: time dilation, drone command, machine hijacking and overdrive. Other implants include mantis blades, a grapple arm, a shoulder missile launcher, kinetic legs and a Nano-Heart that revives you.
- **Tech weapons:** photon and graviton beams, coilguns you charge before firing, a gravity gun that picks up enemies and throws them, a wormhole projector that opens two linked portals, monofilament whips, smart pistols with homing rounds, black-hole charges and hard-light barriers.
- **Quantum Beacons:** a fast-travel network you build yourself.
- **Original opponents:** see below.
- **The Archive:** 16 Memory Shards, found in chests and dropped by bosses. Together they tell what happened to the Concord, the Strata Engine and the Architect.

## Content

| | |
|---|---|
| Items | 570 (10 metal tiers, 8 furniture sets, 16 armor sets, 50+ accessories, 5 vehicles, 22 implants, 7 fishing rods) |
| Crafting recipes | 399 across 12 crafting stations |
| Enemies | 67, spawning by biome, depth, time of day and event |
| Bosses | 16: Overseer, Gel Sovereign, Firewall, Data Wyrm, Swarm Mother, Archon, Echo Engine, Core Warden, Twin Lancers, Leviathan, Prime Archon, Legion, Blackout, Bloom Titan, Gravity Golem, The Architect |
| Biomes | Synth Plains, Rust Wastes, Cryo Fields, Overgrowth, Nanite Blight, Prism (hardmode), Coolant Sea, Orbit islands, Derelict Station, Ancient Temple, Swarm Hive, Reactor Core |
| Systems | Procedural worlds in 3 sizes, colored lighting, liquids (coolant, plasma, gel), day/night, Red Shift, Drone Invasion, Solar Flare, Orbital Drops, star showers, 9 colonists (including a Ripperdoc) with housing, shops, healing and reforging, item modifiers, grappling hooks, jetpacks, minions, fishing and crates, 57 achievements, Softcore/Mediumcore/Hardcore characters, Normal/Expert worlds |

## Opponents of its own

Four bosses are built entirely around their own mechanics:
- **The Firewall** can't be damaged until you hack its four ports by standing next to each one, while scan beams sweep the area. Hacked ports turn their guns on its core, and then it reboots.
- **The Echo Engine** records your movement and replays it as damaging echoes of yourself, so you have to avoid where you were a few seconds ago. Near the end it tries to rewind its own damage unless you destroy its Time Anchor in time.
- **Legion** is forty units sharing one health pool. They re-form into a swarm, a sweeping blade, closing walls, a shrinking ring and a lance, and get faster the fewer are left.
- **Blackout** smothers every light around it. Its own flare orbs are the only light, unless you bring Thermal Optics.

Every other boss also has a signature mechanic:
- **Overseer:** orbital strikes that track you, then lock on.
- **Gel Sovereign:** reabsorbs its gel cubes to heal, and leaves slowing gel where it lands.
- **Data Wyrm:** contact glitches your controls, swapping left and right.
- **Swarm Mother:** pheromone marks that make her drones hunt you faster until you dash.
- **Archon:** locks the area down inside hard-light walls.
- **Core Warden:** reactor vents erupt from the floor.
- **Twin Lancers:** an energy link between them that they sweep across you.
- **Leviathan:** a magnetic hull that drags you in.
- **Prime Archon:** a repair crew that rebuilds its arms unless you destroy it first.
- **Bloom Titan:** charges a solar beam that you can interrupt with enough damage.
- **Gravity Golem:** switches between crushing and near-zero gravity, and sends shockwaves along the floor.
- **The Architect:** remixes the Firewall's beam and the Echo Engine's echoes.

New regular enemies:
- **Maintenance Drones** heal other enemies and rebuild the tunnels you dug.
- **Phase Stalkers** stay invisible until they blink behind you.
- **EMP Drones** jam your vehicle and implants.
- **Cache Mimics** pose as supply crates.
- **Tether Leeches** drain you until you break the line.
- **Sappers** blast craters into the terrain.

Defeating the Core Warden starts the **Singularity** (hardmode). It spreads Prism and Blight across the world and seeds three new ore tiers.

## Play on iPhone

1. Deploy the site (see below) or host the folder on any static web server over HTTPS.
2. Open the URL in Safari.
3. Tap **Share → Add to Home Screen**.
4. Launch it from the Home Screen icon. It runs full-screen, works offline, and saves to the device.

Play in either orientation. Landscape gives the widest view.

On **iPhone Duo** the layout follows the device:
- **Unfolded:** the game fills the large inner display.
- **Folded like a book:** the hotbar and menus stay clear of the fold.
- **Folded like a laptop:** the world is on the top half and the controls are on the bottom half.

The game detects the fold through the Viewport Segments and Device Posture APIs. In Safari 27.1 these are still behind feature flags (**Settings → Apps → Safari → Advanced → Feature Flags**). Without them, choose **Menu → Settings → Fold layout**. The game then puts the split at the middle of the physical screen, even though the system keeps a strip outside the page. **Fold position** nudges the split if it still doesn't line up with the hinge, and **Display info** at the bottom of Settings shows what the phone reports.

Safari 27.1 doesn't yet let web content draw under the iPhone Duo's side strip (status bar and camera), or under the strip along the bottom of the inner display in portrait. It fills that strip with the page's background colour, so the game keeps that colour in step with the scene next to the strip.

**Settings → Resolution** trades sharpness for battery life.

Controls:
- **Left thumb stick:** move. Push up to jump or climb, and down to drop through platforms.
- **USE button (hold):** use the selected item without touching the world. Weapons lock onto the nearest enemy, pickaxes dig the way you walk (push the stick down to dig down), axes find the nearest tree, and blocks build in front of you. Drag the button to aim in any direction.
- **Tap or hold in the world:** use the selected item at exactly that spot.
- **Tap doors, chests, Rest Pods, terminals and colonists** to interact with them.
- **Buttons:** JUMP, HOOK, STIM (quick heal), CELL (quick energy), DASH. RIDE appears when a vehicle is equipped, and AUG appears when a neural implant is installed.
- **Top-right buttons:** inventory and crafting, map, and menu (field guide, Archive, achievements, settings, save).

**Backups to iCloud:** on the title screen, open **Saves & iCloud Backup → Back up all saves → Save to Files** and choose **iCloud Drive**. You can also do this during play from **Menu → Back up to iCloud / Files**. **Restore from backup** picks the file back up from Files, for example on a new phone.

Keyboard and mouse also work: WASD or arrows, Space, mouse, right-click to interact, 1–0 for the hotbar, E (inventory), M (map), F (hook), H (heal), J (energy), Shift (dash), R (ride) and Q (augment).

## Develop

No build step and no dependencies. It is plain ES modules.

```sh
npm start            # serves on http://localhost:8080
npm run build        # regenerate icons and the offline cache list (sw.js)
npm test             # deep simulation test (needs Playwright + Chromium)
npm run smoke        # menu-to-gameplay smoke test with screenshots
```

Run `npm run build` after changing files so the service worker caches the new version.

### Deploy to GitHub Pages

`.github/workflows/pages.yml` publishes the game on every push to `main` or `claude/neon-strata-game`. Enable it once under **Settings → Pages → Source: GitHub Actions**. The game is then at `https://<user>.github.io/<repo>/`.

### Code layout

```
src/core     util, noise, input (touch + keyboard), audio synth, storage (IndexedDB), backups
src/content  tiles, items, recipes, monsters, projectiles, buffs, loot, prefixes, achievements, lore
src/world    world grid, procedural generator, lighting, liquids
src/game     game loop, player, entities, AI, bosses, original enemies and bosses, hazards,
             spawner, events, colonists, fishing, vehicles, implants (cyberware), tech weapons,
             smart aim for the USE button
src/gfx      procedural textures and sprites, renderer, backgrounds, icons
src/ui       HUD, inventory/crafting/shops, map, menus, layout (safe areas, iPhone Duo fold),
             strip colour for system bars
```

All art and audio are generated in code at startup, so there are no asset files.
