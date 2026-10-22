# flowers

A night garden of glowing flowers that grow, bloom, sway and can be picked — plain HTML, CSS
and JavaScript, no build step.

## Run it

The scripts are ES modules, and browsers block those on a page opened straight from disk, so
serve the folder over http:

- **VS Code:** install the *Live Server* extension → right-click `index.html` → *Open with Live Server*
- **Terminal:** `npx serve` (Node) or `python -m http.server`, then open the address it prints

Phone shake needs **https** (e.g. GitHub Pages) — phones only send motion data to secure pages.

## Play

| Do this | What happens |
| --- | --- |
| Tap empty ground | Plants the next flower kind (10% chance it's rare) |
| Tap the top of the sky | Plants a mysterious bud — 35% chance it opens as a **legendary** |
| Tap a flower | It wobbles and shakes off pollen (dandelions lose their seeds) |
| Hold + drag a flower | Bends it; pull it up far enough to pick it and watch its scent rise |
| Drag / scroll / pinch | Pan and zoom around the garden (keys: arrows, `+` `-`, `0`) |
| Shake your phone | Flowers sway with it |

## Layout

```
index.html
assets/
  icons/favicon.svg
  css/
    base.css        tokens, reset, page background, boot notice
    layers.css      canvases, glow, vignette, legendary flash
    banner.css      rare / legendary announcement
    hint.css        bottom hint line
    controls.css    round buttons
  js/
    main.js         wires everything together + the frame loop
    config.js       all the knobs (chances, flower lists, glow …)
    core/           math helpers, shared state, JSDoc types, page elements
    render/         canvas, viewport sizing, camera, reusable shapes
    flowers/
      flower.js     a flower's state and behaviour (grow, bloom, shake, pick)
      draw.js       how a flower is drawn
      parts.js      petal rings, bud, stamens, cores
      effects.js    halo, glint, rays, shimmer, rarity sparkle
      species/      one file per flower design + index.js registry
    world/          garden, background, particles, scent, texts, bees, bloom moments
    input/          pointer, flower press, wheel, keyboard, phone shake
    ui/             hint, buttons
```

## Add a flower

1. Copy a file in `assets/js/flowers/species/` (e.g. `sakura.js`) and change its name, colors and rings.
2. Import it in `species/index.js` and add it to `SPECIES`.
3. For a common flower, add its key to `gardenSpecies` / `plantOrder` in `config.js`.
   Rare and legendary ones are picked up automatically from their `rarity`.

Optional extras a species can define: `sparkHue(f, k)` to color its sparks and orbiting comets
(see `celestial.js`), and `ambient(f, dt)` for its own particles once it's open (see the
snowfall in `frost-bloom.js` or the crackling sparks in `storm-lily.js`).
