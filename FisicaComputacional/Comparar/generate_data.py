from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET


NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
COURSE_FILES = [
    ("FCOM", "Física Computacional", "FCOM_comparacao_bibliografia_x_livros_completa.xlsx"),
    ("MAT", "Matemática", "MAT_comparacao_bibliografia_x_livros_completa.xlsx"),
    ("IAES", "IAES", "IAES_comparacao_bibliografia_x_livros_completa.xlsx"),
]


def col_to_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    result = 0
    for ch in letters:
        result = (result * 26) + (ord(ch.upper()) - 64)
    return result - 1


def read_xlsx_rows(path: Path) -> list[list[str | None]]:
    with ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("a:si", NS):
                shared_strings.append("".join(text.text or "" for text in item.iterfind(".//a:t", NS)))

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relationships}
        first_sheet = workbook.find("a:sheets", NS).findall("a:sheet", NS)[0]
        relationship_id = first_sheet.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        worksheet_path = rel_map[relationship_id].lstrip("/")
        worksheet = ET.fromstring(archive.read(worksheet_path))

        rows: list[list[str | None]] = []
        for row in worksheet.findall(".//a:sheetData/a:row", NS):
            values: list[str | None] = []
            for cell in row.findall("a:c", NS):
                index = col_to_index(cell.attrib.get("r", "A1"))
                while len(values) < index:
                    values.append(None)

                cell_type = cell.attrib.get("t")
                value_node = cell.find("a:v", NS)
                inline_node = cell.find("a:is", NS)

                if cell_type == "s" and value_node is not None:
                    value = shared_strings[int(value_node.text)]
                elif cell_type == "inlineStr" and inline_node is not None:
                    value = "".join(text.text or "" for text in inline_node.iterfind(".//a:t", NS))
                elif value_node is not None:
                    value = value_node.text
                else:
                    value = None

                values.append(value)
            rows.append(values)
        return rows


def normalize(value: str | None) -> str:
    return (value or "").strip()


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    records: list[dict[str, str | int]] = []
    next_id = 1

    for course_id, course_name, filename in COURSE_FILES:
        rows = read_xlsx_rows(base_dir / filename)
        header = rows[0]
        for row in rows[1:]:
            padded = row + [None] * (len(header) - len(row))
            mapped = dict(zip(header, padded))
            if not any(normalize(value) for value in mapped.values()):
                continue

            correspondencia = normalize(mapped.get("Correspondencia em livros.csv")) or "Não informado"
            exemplares_text = normalize(mapped.get("Numero de Exemplares"))
            exemplares = int(float(exemplares_text)) if exemplares_text else 0

            records.append(
                {
                    "id": next_id,
                    "cursoId": course_id,
                    "curso": course_name,
                    "disciplina": normalize(mapped.get("Nome da Disciplina")),
                    "natureza": normalize(mapped.get("Natureza")) or "Não informado",
                    "livroPPC": normalize(mapped.get("Nome do Livro na Tabela")),
                    "livroCampus": normalize(mapped.get("Nome do Livro em livros.csv")),
                    "autor": normalize(mapped.get("Autor em livros.csv")),
                    "tipoBibliografia": normalize(mapped.get("Tipo de Bibliografia")) or "Não informado",
                    "correspondencia": correspondencia,
                    "volume": normalize(mapped.get("Volume em livros.csv")),
                    "edicao": normalize(mapped.get("Edicao em livros.csv")),
                    "exemplares": exemplares,
                    "tituloComparado": normalize(mapped.get("Titulo Comparado")),
                }
            )
            next_id += 1

    output = "window.BOOK_DATA = " + json.dumps(records, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (base_dir / "data.js").write_text(output, encoding="utf-8")
    print(f"Gerado data.js com {len(records)} registros.")


if __name__ == "__main__":
    main()
