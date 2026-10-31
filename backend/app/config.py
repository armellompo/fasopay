"""Statutory rates and thresholds for Burkina Faso payroll.

Every legal parameter lives here so a change in the Loi de Finances only
touches this file. All values are ``Decimal`` to keep the math exact.

IUTS and TPA rules follow the Code général des impôts (DGI edition updated with
the 2023 finance law, art. 105-116 and 227-230); the 2025 finance law (loi
n°042-2024/ALT) changed no payroll rule. CNSS rates follow the decree in force
since 30 August 2022. Have a Burkinabè chartered accountant validate them before
using the engine in production.
"""

from decimal import Decimal
from typing import Final

# --- CNSS (Caisse Nationale de Sécurité Sociale) ---------------------------
CNSS_CEILING: Final = Decimal("800000")        # max monthly gross subject to CNSS
CNSS_EMPLOYER_RATE: Final = Decimal("0.16")    # 16.0 %
CNSS_EMPLOYEE_RATE: Final = Decimal("0.055")   # 5.5 %

# --- TPA (Taxe Patronale d'Apprentissage) -----------------------------------
TPA_RATE: Final = Decimal("0.03")              # 3.0 % of total gross, no ceiling

# --- FSP (Fonds de Soutien Patriotique) -------------------------------------
FSP_RATE: Final = Decimal("0.01")              # 1.0 % of net salary

# --- IUTS (Impôt Unique sur les Traitements et Salaires) --------------------
# Professional abatement on base salary (art. 111): 20 % for the upper
# categories (cadres), 25 % otherwise.
IUTS_ABATEMENT_EXECUTIVE: Final = Decimal("0.20")
IUTS_ABATEMENT_NON_EXECUTIVE: Final = Decimal("0.25")

# Employee pension contributions are deductible only up to 8 % of base salary (art. 111).
IUTS_PENSION_DEDUCTION_CAP: Final = Decimal("0.08")

# Exempt allowance caps (art. 106): (share of the "salaire brut", absolute monthly
# cap in FCFA). That salaire brut is base salary + allowances − employee social
# contributions; see engine.exemption_reference.
HOUSING_EXEMPTION: Final = (Decimal("0.20"), Decimal("75000"))
TRANSPORT_EXEMPTION: Final = (Decimal("0.05"), Decimal("30000"))
FUNCTION_EXEMPTION: Final = (Decimal("0.05"), Decimal("50000"))

# Taxable base is rounded down to the nearest 100 FCFA before the barème
# (the art. 112 brackets step in hundreds: 30 000, then 30 100).
IUTS_BASE_ROUNDING: Final = Decimal("100")

# Progressive monthly barème (art. 112): (upper bound of bracket, marginal rate).
# ``None`` marks the open-ended top bracket.
IUTS_BRACKETS: Final[tuple[tuple[Decimal | None, Decimal], ...]] = (
    (Decimal("30000"), Decimal("0")),
    (Decimal("50000"), Decimal("0.121")),
    (Decimal("80000"), Decimal("0.139")),
    (Decimal("120000"), Decimal("0.157")),
    (Decimal("170000"), Decimal("0.184")),
    (Decimal("250000"), Decimal("0.217")),
    (None, Decimal("0.25")),
)

# Reduction of gross IUTS by number of dependents (charges de famille, art. 113), capped at 4.
IUTS_FAMILY_REDUCTION: Final[dict[int, Decimal]] = {
    0: Decimal("0"),
    1: Decimal("0.08"),
    2: Decimal("0.10"),
    3: Decimal("0.12"),
    4: Decimal("0.14"),
}
IUTS_MAX_DEPENDENTS: Final = 4
