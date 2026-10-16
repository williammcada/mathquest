"""Build the served WebP game art from the PNG originals in art-source/.

Game-loading change specification (Math-Arcade docs/change-specs/game-loading-2026-10-16.md),
owner-approved 16 October 2026: WebP quality 90 at the same pixel size; PNG originals
kept in art-source/ (not published). Run from the repository root:

    python3 scripts/art/convert-webp.py          # write public/assets/**.webp
    python3 scripts/art/convert-webp.py --check  # verify sizes and alpha only

Alpha is stored losslessly (alpha_quality=100), so sprite-frame bounds computed from the
PNG originals still hold for the WebP files.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / 'art-source', ROOT / 'public' / 'assets'

# (source PNG relative to art-source, output size or None, mode)
# lossy: painted art, WebP quality 90. lossless: pixel art drawn with nearest-neighbour scaling.
JOBS = [(f'journey/{name}.png', None, 'lossy') for name in [
    'wukong-stage1', 'bajie-stage2', 'wujing-stage2', 'tang-stage2', 'prince-stage2',
    'raider-stage1', 'prince-charge-stage3', 'bajie-repair-stage3',
    'wukong-repair-stage4', 'wujing-repair-stage4', 'prince-repair-stage4',
    'leaper-stage6', 'caster-stage6', 'shield-stage6', 'brute-stage6', 'nezha-stage6',
    'enemy-repairs-stage6', 'baozi-stage9', 'elixir-stage9', 'crate-stage9', 'cast-concept']]
# Nightfall shared sheets: the renderer already decodes these 1024 px sheets at 512 px.
JOBS += [(f'nightfall/shared/{n}-v1.png', (512, 512), 'lossy') for n in ['interactables', 'furniture', 'decals', 'roofs']]
JOBS += [('false-haven/machinery-v1.png', (512, 512), 'lossy')]
# Nightfall city atlases are pixel art; keep every pixel.
JOBS += [(f'nightfall/city/{n}.png', None, 'lossless') for n in ['actors', 'tiles', 'props']]


def target(rel):
    return OUT / Path(rel).with_suffix('.webp')


def build(rel, size, mode):
    im = Image.open(SRC / rel)
    im.load()
    if size and im.size != size:
        im = im.resize(size, Image.LANCZOS)
    out = target(rel)
    out.parent.mkdir(parents=True, exist_ok=True)
    if mode == 'lossless':
        im.save(out, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    else:
        im.save(out, 'WEBP', quality=90, method=6, alpha_quality=100)
    return out


def check(rel, size, mode):
    src, out = Image.open(SRC / rel), Image.open(target(rel))
    want = size or src.size
    assert out.size == want, f'{out.size} != {want}: {rel}'
    if size is None and 'A' in src.getbands():
        a, b = src.getchannel('A').tobytes(), out.convert('RGBA').getchannel('A').tobytes()
        assert a == b, f'alpha changed: {rel}'
    if mode == 'lossless':
        assert src.convert('RGBA').tobytes() == out.convert('RGBA').tobytes(), f'pixels changed: {rel}'


if __name__ == '__main__':
    total_in = total_out = 0
    for rel, size, mode in JOBS:
        if '--check' not in sys.argv:
            build(rel, size, mode)
        check(rel, size, mode)
        total_in += (SRC / rel).stat().st_size
        total_out += target(rel).stat().st_size
    print(f'{len(JOBS)} images: PNG {total_in / 1e6:.1f} MB -> WebP {total_out / 1e6:.1f} MB')
