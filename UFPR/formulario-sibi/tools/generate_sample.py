from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
OUTPUT = ROOT / "output" / "pdf" / "formulario-sibi-exemplo.pdf"
BACKGROUND = APP / "assets" / "formulario-base.jpg"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUTPUT), pagesize=A4)
width, height = A4
c.drawImage(str(BACKGROUND), 0, 0, width=width, height=height)
c.setFont("Helvetica", 10.5)

scale_x = width / 1240
scale_y = height / 1754
entries = [
    ("Profa. Maria da Silva", 584),
    ("maria.silva@ufpr.br", 659),
    ("Engenharia de Produção", 734),
    ("Biblioteca de Ciência e Tecnologia", 818),
    ("25", 908),
]
for text, pixel_y in entries:
    c.drawString(374 * scale_x, height - pixel_y * scale_y, text)

c.showPage()
c.save()
print(OUTPUT)
