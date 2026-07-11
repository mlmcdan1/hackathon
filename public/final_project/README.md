# Game Boy Color Picker — Project Files

## Folder structure

```
/models
  game_boy_challenge.glb      <- the ONE shared 3D model (don't duplicate this)

/textures
  body_green.jpg              <- green body color
  body_yellow.jpg             <- yellow body color
  body_red.jpg                <- red body color

/screens
  (put your event images/videos here, e.g. green_event.mp4,
   yellow_event.jpg, red_event.mp4 — filenames are up to you,
   just update the CONFIG list in gameboy-setup.js to match)

gameboy-setup.js              <- drop-in three.js module that loads
                                  the model 3x, applies a color to
                                  each, and plays a looping video (or
                                  shows an image) on each screen
```

## How it works

- The `.glb` is loaded ONCE, then cloned for each of the 3 Game Boys
  you want on screen. This keeps file size/network requests minimal.
- Each clone gets its own body texture (green / yellow / red) applied
  to the `GameBoy_Mat` material's `map`.
- Each clone gets its own screen content applied to the same
  material's `emissiveMap` — either a looping autoplaying
  `THREE.VideoTexture` or a static `THREE.Texture`, depending on what
  you put in the CONFIG.
- Position, rotation, and scale for each Game Boy are plain x/y/z
  numbers in the CONFIG — change them anytime, no need to touch
  anything else.
- Clicking a Game Boy fires `onGameBoyClick(color)` — wire this up to
  whatever your "events" section should do (open a panel, scroll to
  detail, etc).

## To customize

1. Drop your real event images/videos into `/screens` and update the
   `screen` field for each entry in `GAMEBOY_CONFIG` inside
   `gameboy-setup.js`.
2. Update the `position` fields to wherever you want each Game Boy to
   sit in your scene.
3. Call `initGameBoys(scene)` from your existing three.js init code,
   passing your scene object.
