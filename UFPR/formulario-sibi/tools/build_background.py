import base64
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
APP = Path(__file__).resolve().parents[1]
ASSETS = APP / "assets"
PAGE_SIZE = (1240, 1754)
UFPR_LOGO = APP / "logo ufpr.jpg"
SIBI_LOGO = APP / "logo sibi.png"


def font(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def centered(draw, text, y, chosen_font, fill="#111111"):
    box = draw.textbbox((0, 0), text, font=chosen_font)
    x = (PAGE_SIZE[0] - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=chosen_font, fill=fill)


ASSETS.mkdir(parents=True, exist_ok=True)
page = Image.new("RGB", PAGE_SIZE, "white")
draw = ImageDraw.Draw(page)


def paste_contained(target, source_path, box):
    source = Image.open(source_path)
    if source.mode not in ("RGB", "RGBA"):
        source = source.convert("RGBA")
    x, y, width, height = box
    ratio = min(width / source.width, height / source.height)
    size = (round(source.width * ratio), round(source.height * ratio))
    source = source.resize(size, Image.Resampling.LANCZOS)
    position = (round(x + (width - size[0]) / 2), round(y + (height - size[1]) / 2))
    if source.mode == "RGBA":
        target.paste(source, position, source)
    else:
        target.paste(source, position)


# Cabecalho reconstruido com os arquivos institucionais fornecidos pelo usuario.
paste_contained(page, UFPR_LOGO, (105, 92, 315, 225))
paste_contained(page, SIBI_LOGO, (435, 116, 300, 176))

header_x = 770
header_lines = [
    ("UNIVERSIDADE FEDERAL DO PARANÁ (UFPR)", 18, True),
    ("Sistema de Bibliotecas (SiBi)", 22, False),
    ("Seção de Formação e Desenvolvimento do", 20, False),
    ("Acervo (SFDA)", 20, False),
]
header_y = 126
for text, size, bold in header_lines:
    chosen = font(size, bold)
    while draw.textbbox((0, 0), text, font=chosen)[2] > 365 and size > 14:
        size -= 1
        chosen = font(size, bold)
    draw.text((header_x, header_y), text, font=chosen, fill="#111111")
    header_y += 38

page.crop((85, 82, 1145, 326)).save(ASSETS / "cabecalho-ufpr-sibi.png", optimize=True)

title = "Ficha de incorporação de materiais bibliográficos"
title_font = font(30, True)
centered(draw, title, 405, title_font)
title_box = draw.textbbox((0, 0), title, font=title_font)
title_width = title_box[2] - title_box[0]
draw.line(((PAGE_SIZE[0] - title_width) / 2, 442, (PAGE_SIZE[0] + title_width) / 2, 442), fill="#111111", width=2)

x0, x1, x2 = 155, 355, 1085
y0 = 505
row_heights = [42, 75, 75, 75, 90, 90]
ys = [y0]
for height in row_heights:
    ys.append(ys[-1] + height)

for y in ys:
    draw.line((x0, y, x2, y), fill="#111111", width=2)
draw.line((x0, y0, x0, ys[-1]), fill="#111111", width=2)
draw.line((x2, y0, x2, ys[-1]), fill="#111111", width=2)
draw.line((x1, ys[1], x1, ys[-1]), fill="#111111", width=2)

fund = "FUNDO DE APOIO AO ENSINO DE GRADUAÇÃO E À EDUCAÇÃO PROFISSIONAL 2026"
centered(draw, fund, y0 + 8, font(20, True))

labels = ["Docente", "E-mail", "Curso", "Biblioteca de\ndestino", "Quantidade de\nlivros"]
for index, label in enumerate(labels):
    top, bottom = ys[index + 1], ys[index + 2]
    lines = label.split("\n")
    line_height = 29
    block_height = len(lines) * line_height
    y = top + (bottom - top - block_height) / 2 - 1
    for line in lines:
        draw.text((x0 + 14, y), line, font=font(23, True), fill="#111111")
        y += line_height

note_y = 1030
draw.text((x0, note_y), "Importante:", font=font(24, True), fill="#111111")
draw.text((x0 + 145, note_y), "Após o registro patrimonial dos livros no acervo SiBi/UFPR, será enviado um", font=font(24), fill="#111111")
draw.text((x0, note_y + 46), "relatório ao e-mail informado.", font=font(24), fill="#111111")
draw.line((x0, note_y + 91, x2, note_y + 91), fill="#111111", width=3)

background_path = ASSETS / "formulario-base.jpg"
page.save(background_path, quality=96, subsampling=0, optimize=True)
encoded = base64.b64encode(background_path.read_bytes()).decode("ascii")
(ASSETS / "formulario-base-data.js").write_text(
    f'window.SIBI_BACKGROUND = "data:image/jpeg;base64,{encoded}";\n',
    encoding="utf-8",
)
print(background_path)
