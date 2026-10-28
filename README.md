# Neon Strata

A Terraria-inspired 2D sandbox survival game set on a shattered terraforming world in a hyper-technological far future. You dig, build, craft, fish, colonize and fight your way from scrap tools to Singularity-grade technology.

It runs in any modern browser. It is designed for iPhone: touch controls, safe-area layout, and full-screen play offline once you add it to your Home Screen.

## Content

| | |
|---|---|
| Items | 511 (10 metal tiers, 8 furniture sets, 16 armor sets, 50+ accessories, 7 fishing rods) |
| Crafting recipes | 346 across 11 crafting stations |
| Enemies | 61, spawning by biome, depth, time of day and event |
| Bosses | 12: Overseer, Gel Sovereign, Data Wyrm, Swarm Mother, Archon, Core Warden, Twin Lancers, Leviathan, Prime Archon, Bloom Titan, Gravity Golem, The Architect |
| Biomes | Synth Plains, Rust Wastes, Cryo Fields, Overgrowth, Nanite Blight, Prism (hardmode), Coolant Sea, Orbit islands, Derelict Station, Ancient Temple, Swarm Hive, Reactor Core |
| Systems | Procedural worlds in 3 sizes, colored lighting, liquids (coolant, plasma, gel), day/night, Red Shift, Drone Invasion, Solar Flare, Orbital Drops, star showers, 8 colonists with housing, shops, healing and reforging, item modifiers, grappling hooks, jetpacks, minions, fishing and crates, 50 achievements, Softcore/Mediumcore/Hardcore characters, Normal/Expert worlds |

Defeating the Core Warden starts the **Singularity** (hardmode). It spreads Prism and Blight across the world and seeds three new ore tiers.

## Play on iPhone

1. Deploy the site (see below) or host the folder on any static web server over HTTPS.
2. Open the URL in Safari.
3. Tap **Share → Add to Home Screen**.
4. Launch it from the Home Screen icon. It runs full-screen, works offline, and saves to the device.

Play in landscape. Controls:
- **Left thumb stick:** move. Push up to jump or climb, and down to drop through platforms.
- **Tap or hold in the world:** use the selected item at that spot (mine, chop, build, attack, fish).
- **Tap doors, chests, Rest Pods, terminals and colonists** to interact with them.
- **Buttons:** JUMP, HOOK, STIM (quick heal), CELL (quick energy), DASH.
- **Top-right buttons:** inventory and crafting, map, and menu (field guide, achievements, settings, save).

Keyboard and mouse also work: WASD or arrows, Space, mouse, right-click to interact, 1–0 for the hotbar, E, M, F, H, J and Shift.

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

`.github/workflows/pages.yml` publishes the game on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**. The game is then at `https://<user>.github.io/<repo>/`.

### Code layout

```
src/core     util, noise, input (touch + keyboard), audio synth, storage (IndexedDB)
src/content  tiles, items, recipes, monsters, projectiles, buffs, loot, prefixes, achievements
src/world    world grid, procedural generator, lighting, liquids
src/game     game loop, player, entities, AI, bosses, spawner, events, colonists, fishing
src/gfx      procedural textures and sprites, renderer, backgrounds, icons
src/ui       HUD, inventory/crafting/shops, map, menus
```

All art and audio are generated in code at startup, so there are no asset files.
