#!/usr/bin/env python3
"""Generate Play Store listing graphics for flashkarte using Pillow.

Outputs (to OUT dir): app icon (512), feature graphic (1024x500), and two
phone screenshots (1080x1920) mirroring the real deck-list and study screens.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

# Brand palette (matches the app)
INDIGO = (79, 70, 229)        # #4F46E5 primary
INDIGO_DK = (55, 48, 163)     # #3730A3
INDIGO_LT = (199, 210, 254)   # #C7D2FE
BG = (249, 250, 251)          # gray-50
CARD = (236, 238, 246)        # surfaceVariant
WHITE = (255, 255, 255)
INK = (26, 26, 46)            # text
MUTED = (107, 114, 128)       # gray-500
RATING = {                    # Again / Hard / Good / Easy / Perfect
    1: (229, 72, 77), 2: (247, 104, 8), 3: (245, 166, 35),
    4: (70, 167, 88), 5: (48, 164, 108),
}

FONTS = {
    "regular": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "bold": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
}


def font(kind, size):
    return ImageFont.truetype(FONTS[kind], size)


def center_text(d, cx, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text((cx - w / 2, y), text, font=f, fill=fill)


def vgrad(size, top, bottom):
    """Vertical-ish gradient image (left->right blend used for feature)."""
    w, h = size
    base = Image.new("RGB", size, top)
    top_img = Image.new("RGB", size, bottom)
    mask = Image.new("L", size)
    md = mask.load()
    for x in range(w):
        v = int(255 * x / max(1, w - 1))
        for y in range(h):
            md[x, y] = v
    base.paste(top_img, (0, 0), mask)
    return base


def cards_motif(d, cx, cy, scale, line_color=INDIGO):
    """Two stacked flashcards centered at (cx, cy)."""
    w, h = int(150 * scale), int(190 * scale)
    # back card (offset, light indigo), slight rotate via skew offset
    bx, by = cx - w // 2 + int(22 * scale), cy - h // 2 - int(10 * scale)
    d.rounded_rectangle([bx, by, bx + w, by + h], radius=int(18 * scale),
                        fill=INDIGO_LT)
    # front card (white)
    fx, fy = cx - w // 2 - int(14 * scale), cy - h // 2 + int(14 * scale)
    d.rounded_rectangle([fx, fy, fx + w, fy + h], radius=int(18 * scale),
                        fill=WHITE)
    # text lines on the front card
    lx = fx + int(24 * scale)
    for i, frac in enumerate((0.62, 0.62, 0.42)):
        ly = fy + int((40 + i * 34) * scale)
        d.rounded_rectangle(
            [lx, ly, lx + int(w * frac), ly + int(10 * scale)],
            radius=int(5 * scale), fill=line_color)


# ---------------- App icon 512 ----------------
def make_icon():
    s = 512
    img = Image.new("RGB", (s, s), INDIGO)
    d = ImageDraw.Draw(img)
    cards_motif(d, s // 2, s // 2, scale=1.55)
    img.save(f"{OUT}/icon_512.png")


# ---------------- Feature graphic 1024x500 ----------------
def make_feature():
    img = vgrad((1024, 500), INDIGO, INDIGO_DK)
    d = ImageDraw.Draw(img)
    d.text((70, 150), "flashkarte", font=font("bold", 104), fill=WHITE)
    d.text((76, 280), "easy learning", font=font("regular", 46),
           fill=INDIGO_LT)
    d.text((78, 340), "Markdown flashcards · spaced repetition",
           font=font("regular", 30), fill=(220, 224, 250))
    cards_motif(d, 850, 250, scale=1.25, line_color=INDIGO)
    img.save(f"{OUT}/feature_1024x500.png")


def phone_base(caption):
    W, H = 1080, 1920
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # caption band
    d.rectangle([0, 0, W, 220], fill=INDIGO)
    center_text(d, W // 2, 86, caption, font("bold", 44), WHITE)
    return img, d, W, H


def deck_card(d, x, y, w, title, sub):
    h = 150
    d.rounded_rectangle([x, y, x + w, y + h], radius=24, fill=CARD)
    d.text((x + 34, y + 30), title, font=font("bold", 40), fill=INK)
    d.text((x + 34, y + 86), sub, font=font("regular", 28), fill=MUTED)
    # Study button
    bw, bh = 150, 64
    bx, by = x + w - bw - 30, y + (h - bh) // 2
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=18, fill=INDIGO)
    center_text(d, bx + bw // 2, by + 16, "Study", font("bold", 30), WHITE)
    # Stats text button
    center_text(d, bx - 70, by + 16, "Stats", font("regular", 28), INDIGO)


# ---------------- Screenshot 1: deck list ----------------
def make_shot_decks():
    img, d, W, H = phone_base("Organize decks, study what's due")
    top = 220
    # app bar
    d.rectangle([0, top, W, top + 110], fill=WHITE)
    d.text((44, top + 32), "flashkarte", font=font("bold", 48), fill=INDIGO)
    d.text((W - 200, top + 40), "Log out", font=font("regular", 30), fill=MUTED)
    y = top + 160
    decks = [
        ("Spanish Vocabulary", "120 cards · 14 due today · studied today"),
        ("Biology — Cells", "64 cards · 7 due today · yesterday"),
        ("World Capitals", "195 cards · 0 due today · 2 days ago"),
        ("French Verbs", "88 cards · 23 due today · today"),
    ]
    for title, sub in decks:
        deck_card(d, 44, y, W - 88, title, sub)
        y += 182
    # FAB
    fx, fy, r = W - 150, H - 170, 56
    d.ellipse([fx - r, fy - r, fx + r, fy + r], fill=INDIGO)
    center_text(d, fx, fy - 40, "+", font("bold", 78), WHITE)
    img.save(f"{OUT}/screenshot_1_decks_1080x1920.png")


# ---------------- Screenshot 2: study / flip ----------------
def make_shot_study():
    img, d, W, H = phone_base("Flip, rate, repeat — spaced repetition")
    top = 220
    d.rectangle([0, top, W, top + 110], fill=WHITE)
    d.text((44, top + 34), "←", font=font("bold", 48), fill=INK)
    d.text((130, top + 38), "Spanish Vocabulary", font=font("bold", 40),
           fill=INK)
    # progress
    py = top + 150
    d.rounded_rectangle([44, py, W - 44, py + 14], radius=7, fill=CARD)
    d.rounded_rectangle([44, py, 44 + int((W - 88) * 0.4), py + 14], radius=7,
                        fill=INDIGO)
    center_text(d, W // 2, py + 34, "6 done  ·  9 remaining",
                font("regular", 28), MUTED)
    # flashcard (answer revealed)
    cx0, cy0, cx1, cy1 = 80, py + 110, W - 80, py + 760
    d.rounded_rectangle([cx0, cy0, cx1, cy1], radius=32, fill=CARD)
    center_text(d, W // 2, cy0 + 80, "ANSWER", font("bold", 30), MUTED)
    center_text(d, W // 2, cy0 + 250, "How are you?", font("bold", 64), INK)
    center_text(d, W // 2, cy0 + 360, "(informal greeting)",
                font("regular", 34), MUTED)
    # rating row
    labels = {1: "Again", 2: "Hard", 3: "Good", 4: "Easy", 5: "Perfect"}
    gap, n = 18, 5
    bw = (W - 88 - gap * (n - 1)) // n
    bh = 130
    rx, ry = 44, cy1 + 50
    for i in range(1, 6):
        x = rx + (i - 1) * (bw + gap)
        d.rounded_rectangle([x, ry, x + bw, ry + bh], radius=20, fill=RATING[i])
        center_text(d, x + bw // 2, ry + 28, str(i), font("bold", 40), WHITE)
        center_text(d, x + bw // 2, ry + 80, labels[i], font("regular", 24),
                    WHITE)
    img.save(f"{OUT}/screenshot_2_study_1080x1920.png")


make_icon()
make_feature()
make_shot_decks()
make_shot_study()
print("written to", OUT)
for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    im = Image.open(p)
    print(f"  {f}: {im.size[0]}x{im.size[1]}  {os.path.getsize(p)//1024}KB")
