import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import monitor_imoveis as monitor
import gerar_site


def api_house(
    id_: str,
    value: str,
    category: str = "CASA",
    city: str = "Jandaia do Sul",
):
    return {
        "id": id_, "codigo": f"C{id_}", "descricaoCategoria": category,
        "valor": value, "endereco": "Rua Teste", "numero": "10",
        "bairro": "Centro", "cidade": city, "idImobiliaria": "388",
        "imagem": "foto.jpeg",
    }


def house(source: str, id_: str, price: str = "2200"):
    return monitor.House(
        source=source, source_name=monitor.SOURCE_NAMES[source], source_id=id_,
        code=f"C{id_}", category="Casa", price=Decimal(price), address="Rua Teste, 10",
        neighborhood="Centro", city="Jandaia do Sul", updated_at="",
        url=f"https://example.test/{id_}",
        image_url=f"https://example.test/{id_}.jpg",
    )


class MonitorTests(unittest.TestCase):
    @patch("monitor_imoveis.fetch_api_config", return_value=("https://api.test", "token"))
    @patch("monitor_imoveis.http_json")
    def test_simob_filters_price_category_and_city(self, http_json, _config):
        http_json.return_value = {
            "success": True,
            "result": [
                api_house("1", "2000.00"),
                api_house("2", "2000.01", "Casa em alvenaria"),
                api_house("3", "3000.00", "Apartamento"),
                api_house("4", "3000.00", "Casa", "Maringá"),
            ],
        }
        result = monitor.fetch_simob_houses("hashimoto", Decimal("2000"))
        self.assertEqual([item.source_id for item in result], ["2"])

    def test_extracts_jol_jsonld(self):
        page = '''
        <script type="application/ld+json">
        {"@type":"rentAction","price":"2.444,00","object":{
          "name":"Casa para Locação, em Jandaia do Sul, bairro Centro",
          "url":"https://www.jolnegociosimobiliarios.com.br/imovel/4268715/casa-locacao-jandaia-do-sul-pr-centro",
          "address":{"addressLocality":"Jandaia do Sul"}}}
        </script>'''
        with patch("monitor_imoveis.http_text", return_value=page):
            result = monitor.fetch_jol_houses(Decimal("2000"))
        self.assertEqual(result[0].source_id, "4268715")
        self.assertEqual(result[0].price, Decimal("2444.00"))

    def test_extracts_ideal_jsonld_and_rejects_apartment(self):
        page = '''
        <script type="application/ld+json">{"@graph":[
          {"@type":"RealEstateListing","name":"Casa para alugar em Centro, Jandaia do Sul - PR",
           "url":"https://idealimoveismga.com.br/imovel/4071/locacao/casa-em-jandaia-do-sul/centro",
           "offers":{"price":"2500","availableAtOrFrom":{"address":{"addressLocality":"Jandaia do Sul"}}}},
          {"@type":"RealEstateListing","name":"Apartamento para alugar em Centro, Jandaia do Sul - PR",
           "url":"https://idealimoveismga.com.br/imovel/4072/locacao/apartamento-em-jandaia-do-sul/centro",
           "offers":{"price":"3000","availableAtOrFrom":{"address":{"addressLocality":"Jandaia do Sul"}}}}
        ]}</script>'''
        with patch("monitor_imoveis.http_text", return_value=page):
            result = monitor.fetch_ideal_houses(Decimal("2000"))
        self.assertEqual([item.source_id for item in result], ["4071"])

    def test_migrates_version_one_state(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            state.write_text(json.dumps({"seen_ids": ["739"]}))
            seen, initialized, first = monitor.load_state(state)
        self.assertEqual(seen, {"hashimoto:739"})
        self.assertEqual(initialized, {"hashimoto"})
        self.assertFalse(first)

    @patch("monitor_imoveis.notify_email", return_value=False)
    @patch("monitor_imoveis.notify_telegram", return_value=False)
    @patch("monitor_imoveis.fetch_all_sources")
    def test_first_run_baselines_all_sources(self, fetch_all, telegram, email):
        fetch_all.return_value = ({"hashimoto": [house("hashimoto", "1")], "jol": [house("jol", "2")]}, {})
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            monitor.run_once(state, Decimal("2000"), False)
            data = json.loads(state.read_text())
        self.assertEqual(data["seen_ids"], ["hashimoto:1", "jol:2"])
        telegram.assert_not_called()
        email.assert_not_called()

    @patch("monitor_imoveis.notify_email", return_value=False)
    @patch("monitor_imoveis.notify_telegram", return_value=True)
    @patch("monitor_imoveis.fetch_all_sources")
    def test_alerts_only_new_items_from_initialized_sources(self, fetch_all, telegram, _email):
        fetch_all.return_value = (
            {"hashimoto": [house("hashimoto", "1"), house("hashimoto", "2", "2800")],
             "ideal": [house("ideal", "9", "3000")]}, {})
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            state.write_text(json.dumps({
                "version": 2, "seen_ids": ["hashimoto:1"],
                "initialized_sources": ["hashimoto"],
            }))
            monitor.run_once(state, Decimal("2000"), False)
            data = json.loads(state.read_text())
        message = telegram.call_args.args[0]
        self.assertIn("C2", message)
        self.assertNotIn("C1", message)
        self.assertNotIn("C9", message)  # Ideal acabou de ser adicionada: vira linha de base.
        self.assertEqual(data["seen_ids"], ["hashimoto:1", "hashimoto:2", "ideal:9"])

    def test_static_payload_contains_current_and_new_houses(self):
        current = house("hashimoto", "10", "2500")
        report = monitor.CheckReport(
            results={"hashimoto": [current]},
            errors={},
            all_houses=[current],
            new_houses=[current],
            first_run=False,
            updated_seen={current.id},
            updated_initialized={"hashimoto"},
        )
        with patch.dict("os.environ", {"GITHUB_REPOSITORY": "usuario/radar"}):
            payload = gerar_site.build_payload(report)

        self.assertEqual(payload["repository"], "usuario/radar")
        self.assertEqual(payload["new_count"], 1)
        self.assertEqual(payload["total_count"], 1)
        self.assertEqual(payload["current_houses"][0]["price_formatted"], "R$ 2.500,00")


if __name__ == "__main__":
    unittest.main()
