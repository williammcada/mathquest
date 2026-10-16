# Art source (not published)

PNG originals for game art that the games now load as WebP. Render publishes only `public/`, so nothing in this folder is sent to students.

Approved by William McAda on 16 October 2026 (game-loading change specification, Math-Arcade `docs/change-specs/game-loading-2026-10-16.md`): convert to WebP at quality 90, same pixel size, and keep the PNG originals here so they can be re-converted.

| Folder | Originals | Served as |
| --- | --- | --- |
| `journey/` | 20 sprite and item atlases, `cast-concept.png`, 4 environment paintings, plus the original provenance notes and manifests | `public/assets/journey/*.webp`, quality 90, same size (the environment WebP files predate this revision) |
| `nightfall/shared/`, `false-haven/` | five 1024 px sprite sheets (NF-ART-01) | 512 px WebP, quality 90; the renderer already decoded them at 512 px |
| `nightfall/city/` | actors, tiles, props pixel-art atlases | lossless WebP, identical pixels |

Rebuild after changing an original:

```
python3 scripts/art/convert-webp.py
```

The script also checks output size, unchanged alpha for same-size sprites, and identical pixels for lossless files. Frame-bound analysis (`scripts/art/*.py`) reads the PNG originals here.

Conversion changes format only. The artwork, its maker and its provenance are unchanged (handbook U-15); see the provenance notes in each folder.
