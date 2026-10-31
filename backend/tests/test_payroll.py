from decimal import Decimal as D

import pytest
from fastapi.testclient import TestClient

from app import engine
from app.main import app

client = TestClient(app)
URL = "/api/v1/payroll/calculate"


def test_cnss_respects_ceiling() -> None:
    assert engine.cnss_employee(D(1_000_000)) == D(44_000)   # 5.5% × 800 000
    assert engine.cnss_employer(D(1_000_000)) == D(128_000)  # 16%  × 800 000
    assert engine.cnss_employee(D(400_000)) == D(22_000)


def test_tpa_has_no_ceiling() -> None:
    assert engine.tpa(D(1_000_000)) == D(30_000)


def test_iuts_brackets() -> None:
    assert engine.iuts_progressive(D(30_000)) == 0
    assert engine.iuts_progressive(D(50_000)) == D(2_420)
    # 2420 + 4170 + 6280 + 9200 + 62 700 × 21.7% = 35 675.9
    assert engine.iuts_progressive(D(232_700)) == D(35_676)


def test_taxable_base_truncated_to_hundred() -> None:
    assert engine.iuts_taxable_base(D(405_000), D(75_000), D(22_275), D(75_000)) == D(232_700)


def test_exemption_shares_apply_to_gross_less_cnss() -> None:
    # CGI art. 106: shares of (base + allowances − employee CNSS), bonuses excluded.
    reference = engine.exemption_reference(D(300_000), D(85_000), D(22_275))
    assert reference == D(362_725)
    # housing min(60 000, 72 545, 75 000) + transport min(25 000, 18 136.25, 30 000)
    assert engine.exempt_allowances(reference, D(60_000), D(25_000), D(0)) == D(78_136)
    # the absolute caps still bind: function min(60 000, 40 300, 50 000)
    assert engine.exempt_allowances(D(806_000), D(150_000), D(40_000), D(60_000)) == D(145_300)


def test_pension_deduction_capped_at_8_percent_of_base() -> None:
    # CGI art. 111: 5.5% of a 210 000 gross is 11 550, but only 8% of the 100 000 base is deductible.
    assert engine.pension_deduction(D(11_550), D(100_000)) == D(8_000)
    assert engine.pension_deduction(D(22_275), D(300_000)) == D(22_275)


def test_round_half_up() -> None:
    assert engine.round_fcfa(D("10.5")) == 11
    assert engine.round_fcfa(D("10.49")) == 10


def test_full_payslip_hand_checked() -> None:
    payload = {
        "employee_id": "EMP-001",
        "base_salary": 300_000,
        "bonuses": 20_000,
        "allowances": {"housing": 60_000, "transport": 25_000},
        "dependents": 2,
    }
    r = client.post(URL, json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["gross_salary"] == 405_000
    # 405 000 − 78 136 exempt − 22 275 CNSS − 75 000 abatement = 229 589 → 229 500
    # IUTS 34 982 − 10% family reduction 3 498 = 31 484; FSP 1% of 351 241 = 3 512
    assert body["employee_deductions"] == {"cnss": 22_275, "iuts": 31_484, "fsp": 3_512, "total": 57_271}
    assert body["iuts_detail"]["exempt_allowances"] == 78_136
    assert body["iuts_detail"]["taxable_base"] == 229_500
    assert body["net_salary"] == 347_729
    assert body["employer_liabilities"] == {"cnss": 64_800, "tpa": 12_150, "total": 76_950}
    assert body["total_employer_cost"] == 481_950
    assert body["gross_salary"] - body["employee_deductions"]["total"] == body["net_salary"]


@pytest.mark.parametrize(
    "patch",
    [
        {"base_salary": -1},
        {"base_salary": 0},
        {"bonuses": 100.5},
        {"dependents": -2},
        {"allowances": {"housing": -500}},
        {"unknown_field": 1},
        {"declared_gross_salary": 999},
    ],
)
def test_invalid_inputs_rejected(patch: dict) -> None:
    payload = {"employee_id": "E", "base_salary": 100_000} | patch
    assert client.post(URL, json=payload).status_code == 422


def test_low_earner_pays_no_iuts() -> None:
    body = client.post(URL, json={"employee_id": "E", "base_salary": 40_000}).json()
    assert body["employee_deductions"]["iuts"] == 0
    assert body["net_salary"] == 40_000 - 2_200 - 378  # CNSS 2 200, FSP 1% of 37 800


def test_rates_endpoint_mirrors_config() -> None:
    body = client.get("/api/v1/rates").json()
    assert body["cnss_ceiling"] == 800_000
    assert body["cnss_employee_rate"] == "0.055"
    assert body["tpa_rate"] == "0.03"
    assert body["iuts_brackets"][0] == {"up_to": 30_000, "rate": "0"}
    assert body["iuts_brackets"][-1]["up_to"] is None
    assert body["iuts_family_reduction"]["4"] == "0.14"
