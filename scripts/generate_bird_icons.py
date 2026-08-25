"""One-off script: regenerate app icon assets from the MaterialCommunityIcons
'bird' glyph (same glyph used in the drawer header) in the app's brand purple.

Run with: python scripts/generate_bird_icons.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = os.path.join(
    ROOT, "node_modules", "@expo", "vector-icons", "build", "vendor",
    "react-native-vector-icons", "Fonts", "MaterialCommunityIcons.ttf",
)
IMAGES = os.path.join(ROOT, "assets", "images")

BIRD_CODEPOINT = 988614  # "bird" glyph, from MaterialCommunityIcons glyphmap
PRIMARY = (0x6C, 0x5B, 0xC4, 255)       # theme light.colors.primary
PRIMARY_CONTAINER = (0xE6, 0xE1, 0xF5, 255)  # theme light.colors.primaryContainer
WHITE = (0xFF, 0xFF, 0xFF, 255)

SS = 4  # supersample factor for anti-aliasing


def render_glyph(color, px_size):
    """Render the bird glyph tightly cropped, `px_size` tall (RGBA, transparent bg)."""
    probe_size = 1000
    font = ImageFont.truetype(FONT_PATH, probe_size)
    bbox = font.getbbox(chr(BIRD_CODEPOINT))
    glyph_w, glyph_h = bbox[2] - bbox[0], bbox[3] - bbox[1]

    canvas = Image.new("RGBA", (glyph_w + 20, glyph_h + 20), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.text((10 - bbox[0], 10 - bbox[1]), chr(BIRD_CODEPOINT), font=font, fill=color)

    scale = px_size / glyph_h
    new_size = (max(1, round(canvas.width * scale)), max(1, round(canvas.height * scale)))
    return canvas.resize(new_size, Image.LANCZOS)


def compose(canvas_size, bg, glyph_color, content_fraction, mode="RGBA"):
    ss_size = canvas_size * SS
    base = Image.new("RGBA", (ss_size, ss_size), bg if bg else (0, 0, 0, 0))

    glyph = render_glyph(glyph_color, round(ss_size * content_fraction))
    gx = (ss_size - glyph.width) // 2
    gy = (ss_size - glyph.height) // 2
    base.alpha_composite(glyph, (gx, gy))

    out = base.resize((canvas_size, canvas_size), Image.LANCZOS)
    return out.convert(mode) if mode != "RGBA" else out


def main():
    # Main app icon (opaque, no alpha — required for iOS App Store)
    icon = compose(1024, PRIMARY_CONTAINER, PRIMARY, content_fraction=0.60, mode="RGB")
    icon.save(os.path.join(IMAGES, "icon.png"))

    # Android adaptive icon foreground (transparent, kept within safe zone)
    fg = compose(512, None, PRIMARY, content_fraction=0.46)
    fg.save(os.path.join(IMAGES, "android-icon-foreground.png"))

    # Android adaptive icon background (solid brand color)
    bg = Image.new("RGBA", (512, 512), PRIMARY_CONTAINER)
    bg.save(os.path.join(IMAGES, "android-icon-background.png"))

    # Android monochrome/themed icon (white silhouette, transparent bg)
    mono = compose(432, None, WHITE, content_fraction=0.46)
    mono.save(os.path.join(IMAGES, "android-icon-monochrome.png"))

    # Favicon
    favicon = compose(48, None, PRIMARY, content_fraction=0.75)
    favicon.save(os.path.join(IMAGES, "favicon.png"))

    # Splash icon (transparent, shown via expo-splash-screen at imageWidth 200)
    splash = compose(1024, None, PRIMARY, content_fraction=0.55)
    splash.save(os.path.join(IMAGES, "splash-icon.png"))

    print("Done.")


if __name__ == "__main__":
    main()
