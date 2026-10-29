"""Statutory rates and thresholds for Burkina Faso payroll.

Every legal parameter lives here so a change in the Loi de Finances only
touches this file. All values are ``Decimal`` to keep the math exact.

IMPORTANT: the IUTS barème, abatements and family reductions below reflect the
Code Général des Impôts as commonly applied since 2020. Have a Burkinabè
chartered accountant validate them before using the engine in production.
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
# Professional abatement on base salary: 20 % for executives, 25 % otherwise.
IUTS_ABATEMENT_EXECUTIVE: Final = Decimal("0.20")
IUTS_ABATEMENT_NON_EXECUTIVE: Final = Decimal("0.25")

# Exempt allowance caps: (share of base salary, absolute monthly cap in FCFA).
HOUSING_EXEMPTION: Final = (Decimal("0.20"), Decimal("75000"))
TRANSPORT_EXEMPTION: Final = (Decimal("0.05"), Decimal("30000"))
FUNCTION_EXEMPTION: Final = (Decimal("0.05"), Decimal("50000"))

# Taxable base is rounded down to the nearest 100 FCFA before the barème.
IUTS_BASE_ROUNDING: Final = Decimal("100")

# Progressive monthly barème: (upper bound of bracket, marginal rate).
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

# Reduction of gross IUTS by number of dependents (charges de famille), capped at 4.
IUTS_FAMILY_REDUCTION: Final[dict[int, Decimal]] = {
    0: Decimal("0"),
    1: Decimal("0.08"),
    2: Decimal("0.10"),
    3: Decimal("0.12"),
    4: Decimal("0.14"),
}
IUTS_MAX_DEPENDENTS: Final = 4
