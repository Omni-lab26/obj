# Store screenshots in Lento's look: the icon's paper and ink, a fermata, a headline,
# and the app's own screen below.
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'screenshots')
SERIF_JP = os.environ.get('NOTO_SERIF_JP', 'NotoSerifJP.ttf')  # Noto Serif JP (variable), from Google Fonts
IS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'node_modules', '@expo-google-fonts', 'instrument-serif') + '/'
SERIF_EN = IS + '400Regular/InstrumentSerif_400Regular.ttf'
SERIF_EN_IT = IS + '400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf'
INK = (24, 25, 29)
SOFT = (92, 90, 86)
CAPS = {
  'ja': [
    ('眺めていられる、置き時計', '鯉の泳ぐ夜の池、サメの浅瀬、通りすがりの足音'),
    ('目盛りをなぞって、タイマー', 'よく使う時間は5つまで保存'),
    ('ストップウォッチも、静かに', '数字を左右にスライドして切り替え'),
    ('フォントも色も、好みのままに', '8つのフォントと、好きな色'),
    ('どこにでも、どんな大きさでも', '1本指で動かし、2本指で大きさを'),
  ],
  'en': [
    ('A clock you can simply watch', 'Koi at night, sharks in the shallows, passersby'),
    ('Set the timer by touch', 'Keep up to five favourite lengths'),
    ('A quiet stopwatch, too', 'Slide the digits to switch'),
    ('Your font, your colour', 'Eight fonts and any colour you like'),
    ('Anywhere, any size', 'Drag with one finger, pinch with two'),
  ],
}
DEV = {
  'iphone-6.9': dict(W=1320, H=2868, head=92, sub=44, shotW=1010, top=640, radius=70, mark=96),
  'ipad-13': dict(W=2064, H=2752, head=104, sub=50, shotW=1560, top=650, radius=40, mark=110),
}

def paper(W, H):
    S = 2; w, h = W // S, H // S
    im = Image.new('RGB', (w, h), (226, 221, 210)); d = ImageDraw.Draw(im)
    c0, c1 = (250, 247, 240), (228, 223, 212)
    for i in range(200, 0, -1):
        t = i / 200; r = max(w, h) * 0.9 * t; k = t ** 1.3
        col = tuple(int(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
        d.ellipse([w / 2 - r, h * 0.3 - r, w / 2 + r, h * 0.3 + r], fill=col)
    return im.filter(ImageFilter.GaussianBlur(20)).resize((W, H), Image.LANCZOS)

def fermata(size, color):
    S = 4; W = size * S
    lay = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    R = W * 0.42; t0 = W * 0.085; ax, ay = W / 2, W * 0.5 + R * 0.32
    for i in range(401):
        a = math.pi + math.pi * i / 400; u = abs(i / 400 - 0.5) * 2
        th = t0 * (1 - 0.72 * u ** 1.6)
        x = ax + R * math.cos(a); y = ay + R * math.sin(a) * 0.86
        d.ellipse([x - th / 2, y - th / 2, x + th / 2, y + th / 2], fill=color)
    r = W * 0.088; d.ellipse([ax - r, ay - r * 1.2, ax + r, ay + r * 0.8], fill=color)
    return lay.resize((size, size), Image.LANCZOS)

def font(lang, size, kind):
    if lang == 'ja':
        f = ImageFont.truetype(SERIF_JP, size)
        try: f.set_variation_by_axes([600 if kind == 'head' else 400])
        except Exception: pass
        return f
    return ImageFont.truetype(SERIF_EN if kind == 'head' else SERIF_EN_IT, int(size * (1.25 if kind == 'head' else 1.15)))

def centred(d, W, y, text, lang, size, kind, fill):
    # As big as asked, or smaller if that would come within 8 % of the sides.
    f = font(lang, size, kind)
    while d.textlength(text, font=f) > W * 0.84 and size > 20:
        size -= 2
        f = font(lang, size, kind)
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)

for dev, p in DEV.items():
    for lang in ('ja', 'en'):
        src = f'{ROOT}/raw/{dev}/{lang}'
        out = f'{ROOT}/{dev}/{lang}'
        os.makedirs(out, exist_ok=True)
        for i, name in enumerate(sorted(os.listdir(src))):
            W, H = p['W'], p['H']
            im = paper(W, H).convert('RGBA')
            m = p['mark']
            im.alpha_composite(fermata(m, INK + (255,)), ((W - m) // 2, int(p['top'] * 0.17)))
            d = ImageDraw.Draw(im)
            head, sub = CAPS[lang][i]
            centred(d, W, int(p['top'] * 0.37), head, lang, p['head'], 'head', INK)
            centred(d, W, int(p['top'] * 0.37) + int(p['head'] * 1.55), sub, lang, p['sub'], 'sub', SOFT)
            shot = Image.open(f'{src}/{name}').convert('RGB')
            sw = p['shotW']; sh = round(shot.height * sw / shot.width)
            shot = shot.resize((sw, sh), Image.LANCZOS)
            x, y = (W - sw) // 2, p['top']
            mask = Image.new('L', (sw, sh), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=p['radius'], fill=255)
            shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(shadow).rounded_rectangle([x, y + 18, x + sw, y + sh + 18], radius=p['radius'], fill=(40, 34, 24, 70))
            im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(36)))
            im.paste(shot, (x, y), mask)
            ImageDraw.Draw(im).rounded_rectangle([x, y, x + sw - 1, y + sh - 1], radius=p['radius'], outline=(24, 25, 29, 40), width=2)
            im.convert('RGB').save(f'{out}/{name}', quality=92)
        print(dev, lang, 'ok')
