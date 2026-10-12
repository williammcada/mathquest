# Nightfall Sprite Brief v1

Companion to [Nightfall Art Direction v1.0.0](../change-specs/nightfall-art-direction-v1.0.0.md). This brief defines the five new sprite sheets needed by First Response, Last Bus Out and False Haven under standard NF-ART-01.

Status: brief only. No sheets exist yet.

## 1. What to produce

Five PNG sheets. Every sheet follows the same format:

- **1024 × 1024 pixels.**
- A **4 × 4 grid** of 256 × 256 cells; one object per cell.
- Cells are numbered 0–15, left to right, then top to bottom:

```
 0  1  2  3
 4  5  6  7
 8  9 10 11
12 13 14 15
```

- **Background:** transparent PNG. If the image tool cannot make transparency, use a perfectly flat pure magenta `#FF00FF` background with no shading; it will be removed in code. Do not use magenta inside any object.
- Keep at least 12 px of empty background around each object so nothing touches a neighbouring cell. Exceptions: tileable textures (roof fills, edges, rail, fence) fill their whole cell edge to edge.
- **No text, letters, numbers, logos or brand marks** in any sprite. The game adds readable text itself.
- **No blood, gore or bodies.** School-appropriate suspense only.

| Sheet | Save as (repository path) |
|---|---|
| A. Interactables | `public/assets/nightfall/shared/interactables-v1.png` |
| B. Furniture | `public/assets/nightfall/shared/furniture-v1.png` |
| C. Floor decals | `public/assets/nightfall/shared/decals-v1.png` |
| D. Roofs | `public/assets/nightfall/shared/roofs-v1.png` |
| E. False Haven machinery | `public/assets/false-haven/machinery-v1.png` |

## 2. Style lock (paste at the start of every prompt)

Attach these existing files from the repository as style references when generating:

- `public/assets/nightfall/city/props.png`
- `public/assets/false-haven/tiles-v3.webp`

> Style: detailed painted pixel-art game sprites for a top-down zombie-survival evacuation game, matching the attached reference sprite sheet exactly in rendering style, outline weight, level of detail and palette. Viewed from directly above with a slight three-quarter tilt so front faces are just visible, consistent with the reference vehicles, desk and crates. Light comes from the top-left. Rainy night palette: wet dark asphalt greys, cold teal floodlight highlights, amber lamp and warning-light accents, rust and olive military-surplus materials. Crisp dark outline around every object so it reads against dark ground. Worn, used, abandoned but not gory. No text, letters, numbers, logos or symbols that read as words. One object centred in each cell of a 4 × 4 grid on a 1024 × 1024 canvas, 256 px cells, each object surrounded by empty [transparent / flat #FF00FF] background with a clear margin.

## 3. Sheet contents

Orientation: draw horizontal pieces (windows, gates, fences, rails, parapet edges) **running left–right**. The game rotates them 90° for vertical walls.

### A. Interactables — `interactables-v1.png`

| Cell | Object | Notes |
|---|---|---|
| 0 | Window, intact | Short horizontal wall section with a glass pane in a metal frame, cold teal reflections. Long and thin (about 5:1). |
| 1 | Window, shattered | Same frame; glass broken out, a few shards on the sill. Clearly passable. |
| 2 | Security roll gate, closed | Horizontal corrugated steel shutter across a doorway, padlock plate, yellow-black hazard edge (stripes only, no text). |
| 3 | Chain-link fence segment | Tileable left–right; bright galvanized mesh between posts with a top rail, high contrast against dark ground. Fills cell width. |
| 4 | Fence post / end cap | Single heavy post with base plate; used at fence ends and corners. |
| 5 | Inspection gate, closed | Heavy barred swing gate, thick yellow-painted steel with diagonal brace and red warning lamp. Must look clearly different from cell 3. |
| 6 | Inspection gate, open | Same gate swung open against its post. |
| 7 | Broadcast speaker tower, idle | Steel pole with a cluster of horn loudspeakers and a junction box, seen from above. Lamps dark. |
| 8 | Broadcast speaker tower, active | Same tower with amber lamps lit and a faint glow (no drawn sound waves). |
| 9 | Hazard fuel drum | Rusted red-orange steel drum with a hazard diamond (symbol only, no words) and a bright rim highlight. |
| 10 | Fuel drum, burnt out | Same drum blackened and split after burning. |
| 11 | Cargo trolley | Flat-bed rail cargo trolley loaded with strapped crates, seen from above. Proportion about 3:1, long side left–right. |
| 12 | Rail track segment | Tileable left–right pair of rails on sleepers. Fills cell width. |
| 13 | Rail end bumper | Buffer stop at the end of a rail. |
| 14 | Sign board, wide | Blank weathered metal sign board on two posts, a lamp above. Plain, empty face for game text. About 4:1. |
| 15 | Door plate sign | Small blank metal plaque with screws, for door labels. |

### B. Furniture — `furniture-v1.png`

All placed flush against walls; front face toward the room.

| Cell | Object |
|---|---|
| 0 | Folding army cot with a rumpled blanket |
| 1 | Two-tier metal bunk bed |
| 2 | Row of three tall metal lockers, one door ajar |
| 3 | Metal storage shelving with boxes, tins and water bottles |
| 4 | Workbench with vice, tools and a lamp |
| 5 | Wall tool rack (pegboard with tools) |
| 6 | Radio dispatch console with handset, dials and glowing amber screen |
| 7 | Map / notice board with pinned papers (no legible text) |
| 8 | Long canteen table with two attached benches |
| 9 | Stainless steel serving counter with trays |
| 10 | Vending machine (no brand), dim glowing front |
| 11 | Folding medical privacy screen |
| 12 | Wall-mounted medical cabinet with a red cross symbol |
| 13 | Battery charging rack with heavy vehicle batteries |
| 14 | Industrial cable drum |
| 15 | Intake desk / reception counter with clipboard |

### C. Floor decals — `decals-v1.png`

Flat items lying on the floor; seen straight down. Must not look like obstacles.

| Cell | Object |
|---|---|
| 0 | Worn rectangular rug |
| 1 | Painted yellow-black hazard floor stripes |
| 2 | Scattered papers and folders |
| 3 | Crumpled blue tarp |
| 4 | Oil stain |
| 5 | Rain puddle reflecting teal light |
| 6 | Flattened cardboard boxes |
| 7 | Pile of blankets and a pillow |
| 8 | Dropped canteen trays and cups |
| 9 | Painted evacuation arrow (arrow shape only, no words) |
| 10 | Painted medical cross floor marking |
| 11 | Painted parking bay line corner |
| 12 | Scattered sporting goods (balls, gloves, boxes) |
| 13 | Cracked floor patch |
| 14 | Round floor drain |
| 15 | Wind-blown leaves and litter |

### D. Roofs — `roofs-v1.png`

Seen straight down. Cells 0–3 tile seamlessly in every direction; cell 3 tiles left–right.

| Cell | Object |
|---|---|
| 0 | Tar-and-gravel flat roof (seamless tile) |
| 1 | Corrugated metal roof (seamless tile) |
| 2 | Weathered concrete roof slab (seamless tile) |
| 3 | Roof parapet edge (seamless left–right; outside edge at the bottom of the cell) |
| 4 | Parapet outer corner (matching cell 3) |
| 5 | Roof access hatch |
| 6 | Rooftop air-conditioning unit |
| 7 | Cluster of vent stacks |
| 8 | Skylight with dim interior glow |
| 9 | Rooftop water tank on legs |
| 10 | Antenna mast with cables |
| 11 | Ducting run |
| 12 | Puddle around a roof drain |
| 13 | Rooftop debris (bricks, a bucket) |
| 14 | Stair access box with small door |
| 15 | Rooftop floodlight |

### E. False Haven machinery — `machinery-v1.png`

Military evacuation-compound equipment: olive drab, faded evacuation-orange markings, amber lamps.

| Cell | Object |
|---|---|
| 0 | Utility generator, off |
| 1 | Utility generator, running (lamps lit, slight exhaust haze) |
| 2 | Power selector panel with large rotary switch |
| 3 | Drainage pump, idle |
| 4 | Drainage pump, running (lamp lit) |
| 5 | Service shortcut floor hatch, closed |
| 6 | Service shortcut hatch, open |
| 7 | Depot roller shutter, closed (horizontal) |
| 8 | Depot roller shutter, raised |
| 9 | Vehicle barrier arm, down (red-white striped arm, horizontal) |
| 10 | Vehicle barrier arm, raised |
| 11 | Evacuation gate control console |
| 12 | Waterline edge (tileable left–right foam/edge strip) |
| 13 | Square drain grate in water |
| 14 | Compound floodlight pole |
| 15 | Cable conduit run (tileable left–right) |

## 4. Acceptance checks (run before implementation)

Claude will run an automated check on each committed sheet, then review rendered in-game frames. A sheet passes when all of these hold:

1. Exactly 1024 × 1024, PNG, with a transparent or flat `#FF00FF` background.
2. Every object stays inside its own cell with the margin (tileable cells excepted).
3. Tileable cells show no visible seam when repeated 3 × 3.
4. No readable text, logos, gore or bodies.
5. Light, outline and palette match the reference sheets.
6. Objects read clearly against the False Haven gravel and the Chapter 1 asphalt at in-game size (32–128 px).

A failed cell can be regenerated alone; send it as a single 256 × 256 image and Claude will place it into the sheet.

## 5. Adding the sheets to GitHub (web interface)

1. Open `https://github.com/williammcada/mathquest` and stay on the **main** branch.
2. Open the folder `public/assets/nightfall`, click **Add file → Create new file**, type `shared/README.md` as the name, enter one line such as `Nightfall shared sprites`, and click **Commit changes**. This creates the `shared` folder.
3. Open the new `shared` folder, click **Add file → Upload files**, and drag in `interactables-v1.png`, `furniture-v1.png`, `decals-v1.png` and `roofs-v1.png`. Use exactly these file names.
4. Commit message: `Nightfall art direction v1.0.0 sprite sheets`. Choose **Commit directly to the main branch** and click **Commit changes**.
5. Open `public/assets/false-haven`, click **Add file → Upload files**, and upload `machinery-v1.png` with the same commit message.
6. Tell Claude when they are uploaded. Partial uploads are fine; say which sheets are in.

## 6. Provenance

Record in `docs/NIGHTFALL_ASSET_PROVENANCE.md` at implementation:

- the tool used;
- the date;
- that the prompts came from this brief;
- that no external artist or franchise reference artwork was used beyond the project's own sheets.
