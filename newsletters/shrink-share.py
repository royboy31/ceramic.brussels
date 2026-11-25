"""Shrink the heavy images inside a review page made by build-share.mjs.

usage: python -I newsletters/shrink-share.py page.html

A shared page must stay under 16 MB. The animated GIFs and the video still
are several MB each at full size, so every embedded image over 400 KB is
redrawn smaller for the review page only (the templates keep the originals):
GIFs at 990 px wide with all their frames and timings, other images as
JPEG at 1320 px. Needs Pillow.
"""
import base64, io, json, re, sys
from PIL import Image, ImageSequence

path = sys.argv[1]
page = open(path, encoding='utf-8').read()
m = re.search(r'const ASSETS = (\[.*?\]);\n', page, re.S)
assets = json.loads(m.group(1))

def shrink(uri):
    head, data = uri.split(',', 1)
    raw = base64.b64decode(data)
    if len(raw) < 400 * 1024 or 'font' in head:
        return uri
    im = Image.open(io.BytesIO(raw))
    out = io.BytesIO()
    if getattr(im, 'n_frames', 1) > 1:
        w = min(990, im.width)
        h = round(im.height * w / im.width)
        frames, durations = [], []
        for f in ImageSequence.Iterator(im):
            durations.append(f.info.get('duration', im.info.get('duration', 100)))
            frames.append(f.convert('RGB').resize((w, h), Image.LANCZOS).quantize(colors=128, method=Image.Quantize.MEDIANCUT))
        frames[0].save(out, format='GIF', save_all=True, append_images=frames[1:], duration=durations,
                       loop=im.info.get('loop', 0), optimize=True, disposal=1)
        kind = 'image/gif'
    else:
        w = min(1320, im.width)
        im = im.convert('RGB').resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(out, format='JPEG', quality=84, optimize=True, progressive=True)
        kind = 'image/jpeg'
    print(f'  {len(raw) // 1024} KB -> {out.tell() // 1024} KB ({kind}, {getattr(im, "n_frames", 1)} frames in)')
    return f'data:{kind};base64,' + base64.b64encode(out.getvalue()).decode()

assets = [shrink(a) for a in assets]
page = page[:m.start(1)] + json.dumps(assets) + page[m.end(1):]
open(path, 'w', encoding='utf-8').write(page)
print(f'{path}: {len(page) / 1024 / 1024:.2f} MB')
