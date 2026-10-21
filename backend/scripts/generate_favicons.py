"""Gera os favicons do Slothdule a partir do mascote.

Entrada: public/images/sloth-mascot.png (900x877, alpha).
Saída (App Router do Next detecta automaticamente):
  - src/app/icon.png        (512, favicon/geral)
  - src/app/apple-icon.png  (180, iOS)
  - src/app/favicon.ico     (16/32/48, legado)
Margem transparente de ~4% para o rosto respirar em tamanhos pequenos.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "images" / "sloth-mascot.png"


def square_pad_margin(img: Image.Image, margin_ratio: float = 0.04) -> Image.Image:
    side = max(img.size)
    margin = round(side * margin_ratio)
    canvas_side = side + margin * 2
    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    x = (canvas_side - img.width) // 2
    y = (canvas_side - img.height) // 2
    canvas.paste(img, (x, y), img)
    return canvas


def resize_to(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    mascot = Image.open(SRC).convert("RGBA")
    square = square_pad_margin(mascot)

    app = ROOT / "src" / "app"
    resize_to(square, 512).save(app / "icon.png", optimize=True)
    resize_to(square, 180).save(app / "apple-icon.png", optimize=True)

    favicon = resize_to(square, 48)
    favicon.save(
        app / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[resize_to(square, 16), resize_to(square, 32)],
    )
    print("ok")


if __name__ == "__main__":
    main()
