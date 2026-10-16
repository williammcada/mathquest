# Hero atlas provenance — 2026-10-01

Built-in OpenAI image generation, original game designs, guided by the approved Journey cast descriptions. No film/ROM assets used. Transparent outputs preserved unchanged; no pixel postprocessing. Tang and Prince corrected with the built-in image editor. SHA-256 and geometry in manifest.json.

## Prompt set / production directions

Common generation directions: stylized-concept production sprite atlas; 1536×1024 transparent PNG; exact six columns × four rows; 256px cells; full-body right-facing original detailed 16-bit arcade pixel art; consistent foot anchor near (128,240); all weapons/effects within cells with margin; no text/grid/scenery/shadows. Rows: two idle/four walk; six combo attacks; jump rise/fall, aerial attack, landing, hurt, knockdown; two special, get-up, ready, two victory.

- Bajie: broad pig face/large ears, plum and brown clothes, red sash, bronze trim, nine-toothed rake; heavy rake combo, compact ochre Earthshaker slam.
- Wujing: tall broad bearded guardian, teal/indigo robes, large prayer beads, gold headband, crescent polearm; thrust/sweep combo, compact cyan River Surge.
- Tang: youthful monk, ivory/saffron robes/red drape, ceremonial gold headdress/ringed staff; offensive staff/spell combo, golden Lotus Ward. Correction: replace row two only with exactly six full-body poses; restore monk in third cell and shorten/angle staff/effects to fit.
- Prince: dark flowing hair/small pale horns, silver-white armor/pale cyan sash, sword combo; transform to white/cyan horse. Correction: bottom row exactly six poses (transform, horse, human get-up, ready, two victories), remove extra horse and shorten the extended sword in row two column two.

Generated character concepts are game adaptations, not claims about the novel. These are candidate animation assets; seam/pivot polish and full horse choreography remain documented work.

## Horse supplement — 1 October 2026

`prince-charge-stage3.png`: original built-in image generation using the Prince atlas as identity reference. Prompt requested a transparent 1536×1024, four-column/four-row atlas: human transformation, horse standing/rearing, four gallop strides, turn, impact, dissolve, return and supplemental sword poses. Original output preserved without pixel edits. Actual row boundaries are explicit in manifest/renderer because generated poses did not conform to uniform cells.

`scripts/art/journey-frame-bounds.py` analyzes alpha connected components of original six-column hero sheets; it does not alter pixels. 94 of 120 frames receive safe expanded source bounds; 26 ambiguous frames retain uniform cuts. These can still clip weapons/effects and need later artwork correction. Horse gallop screenshot inspected in Chromium; this is development art, not final production acceptance.

## Bajie repair supplement — 2 October 2026

Built-in image generation produced `public/assets/journey/bajie-repair-stage3.png` using `bajie-stage2.png` as identity/style reference. Original output retained without pixel editing. Initial prompt: same maroon/gold pig warrior, transparent 1536×1024 four-column/three-row atlas; idle, three walking poses, rake thrust/sweep/overhead/slam/follow-through, aerial attack, landing and hurt; preserve full weapons with generous gutters. First result still crowded cells and was not integrated. Final correction prompt: preserve twelve poses, reduce each to 70% within its cell, generous transparent gutters, complete body/rake/effects, same identity and palette, no labels/shadows/background.

Explicit runtime mapping in `public/games/journey/frame-repairs.js` replaces original indices 1,2,4,5,7,8,9,10,11,14,15,16. Original sheet and alpha-analysis metadata remain intact for provenance. Read-only alpha inspection requires at least 12 pixels of margin at alpha >50 and passes all twelve cells. Renderer contact sheet inspected at gameplay scale in both directions. 106/120 hero poses now use isolated bounds or replacement art; 14 original fallback frames remain across Wukong/Wujing/Prince.
