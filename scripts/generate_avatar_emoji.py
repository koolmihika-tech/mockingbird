"""One-off script: render the 15 animal emoji used as selectable profile avatars.

Outputs 256x256 PNGs with transparent backgrounds to assets/avatars/, one per
entry in AVATARS. The filenames (the `slug`) are what scripts/seedAvatars.mjs
uploads to the Supabase `avatars` storage bucket, so keep them stable.

Run with: python scripts/generate_avatar_emoji.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "avatars")

# Windows ships Segoe UI Emoji (a COLR/CPAL colour font) at this path.
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\seguiemj.ttf",
    "/System/Library/Fonts/Apple Color Emoji.ttc",
    "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
]

SIZE = 256          # output canvas, px
GLYPH_SIZE = 220    # emoji cap height before centring, px

# slug -> (emoji, human title). slug is the storage object name (minus .png) and
# must match the seed script. The bird is the Mockingbird itself.
AVATARS = [
    ("mockingbird", "\U0001F426", "Mockingbird"),
    ("fox", "\U0001F98A", "Fox"),
    ("turtle", "\U0001F422", "Turtle"),
    ("owl", "\U0001F989", "Owl"),
    ("octopus", "\U0001F419", "Octopus"),
    ("lion", "\U0001F981", "Lion"),
    ("koala", "\U0001F428", "Koala"),
    ("penguin", "\U0001F427", "Penguin"),
    ("unicorn", "\U0001F984", "Unicorn"),
    ("dolphin", "\U0001F42C", "Dolphin"),
    ("butterfly", "\U0001F98B", "Butterfly"),
    ("cat", "\U0001F431", "Cat"),
    ("dog", "\U0001F436", "Dog"),
    ("panda", "\U0001F43C", "Panda"),
    ("raccoon", "\U0001F99D", "Raccoon"),
]


def load_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                # Segoe UI Emoji renders any requested size; Apple/Noto only
                # expose fixed bitmap strikes (commonly 109 / 128).
                return ImageFont.truetype(path, GLYPH_SIZE)
            except OSError:
                return ImageFont.truetype(path, 109)
    raise SystemExit(
        "No colour-emoji font found. Tried:\n  " + "\n  ".join(FONT_CANDIDATES)
    )


def render(emoji: str, font: ImageFont.FreeTypeFont) -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    # anchor="mm" centres the glyph on the given point
    draw.text((SIZE / 2, SIZE / 2), emoji, font=font, embedded_color=True, anchor="mm")

    bbox = canvas.getbbox()
    if bbox:
        glyph = canvas.crop(bbox)
        scale = min(GLYPH_SIZE / glyph.width, GLYPH_SIZE / glyph.height, 1.0)
        if scale < 1.0:
            glyph = glyph.resize(
                (round(glyph.width * scale), round(glyph.height * scale)),
                Image.LANCZOS,
            )
        out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        out.alpha_composite(glyph, ((SIZE - glyph.width) // 2, (SIZE - glyph.height) // 2))
        return out
    return canvas


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    font = load_font()
    for slug, emoji, title in AVATARS:
        render(emoji, font).save(os.path.join(OUT_DIR, f"{slug}.png"))
        print(f"  {slug}.png  ({title})")
    print(f"Done - {len(AVATARS)} avatars written to assets/avatars/")


if __name__ == "__main__":
    main()
