"""Pydantic request/response contracts for the payroll API."""

from decimal import Decimal
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

# FCFA has no subunit: amounts are non-negative whole francs.
Fcfa = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=0)]


class Allowances(BaseModel):
    """Monthly allowances (indemnités). Some are partly IUTS-exempt."""

    model_config = ConfigDict(extra="forbid")

    housing: Fcfa = Decimal(0)
    transport: Fcfa = Decimal(0)
    function: Fcfa = Decimal(0)
    other: Fcfa = Decimal(0)

    @property
    def total(self) -> Decimal:
        return self.housing + self.transport + self.function + self.other


class PayrollInput(BaseModel):
    """One employee's pay elements for a single month."""

    model_config = ConfigDict(extra="forbid")

    employee_id: str = Field(min_length=1, max_length=64)
    base_salary: Fcfa = Field(gt=0, description="Salaire de base")
    bonuses: Fcfa = Field(default=Decimal(0), description="Primes taxables")
    allowances: Allowances = Field(default_factory=Allowances)
    dependents: int = Field(default=0, ge=0, le=20, description="Charges de famille")
    is_executive: bool = Field(default=False, description="Cadre: 20% abatement instead of 25%")
    declared_gross_salary: Fcfa | None = Field(
        default=None,
        description="Optional cross-check: rejected if it differs from base + bonuses + allowances",
    )

    @property
    def gross_salary(self) -> Decimal:
        return self.base_salary + self.bonuses + self.allowances.total

    @model_validator(mode="after")
    def _check_declared_gross(self) -> Self:
        if self.declared_gross_salary is not None and self.declared_gross_salary != self.gross_salary:
            raise ValueError(
                f"declared_gross_salary ({self.declared_gross_salary}) does not match "
                f"base + bonuses + allowances ({self.gross_salary})"
            )
        return self


class IutsBreakdown(BaseModel):
    exempt_allowances: int
    pension_deduction: int = Field(description="Employee CNSS deducted from the IUTS base, capped at 8% of base salary")
    professional_abatement: int
    taxable_base: int
    gross_tax: int
    family_reduction: int
    net_tax: int


class EmployeeDeductions(BaseModel):
    cnss: int
    iuts: int
    fsp: int
    total: int


class EmployerLiabilities(BaseModel):
    cnss: int
    tpa: int
    total: int


class PayrollResult(BaseModel):
    employee_id: str
    gross_salary: int
    cnss_base: int
    employee_deductions: EmployeeDeductions
    iuts_detail: IutsBreakdown
    net_salary: int
    employer_liabilities: EmployerLiabilities
    total_employer_cost: int


class IutsBracket(BaseModel):
    up_to: int | None = Field(description="Upper bound in FCFA; null for the top bracket")
    rate: str


class StatutoryRates(BaseModel):
    """Every legal parameter the engine applies. Rates are decimal strings (e.g. "0.055") to stay exact."""

    cnss_ceiling: int
    cnss_employee_rate: str
    cnss_employer_rate: str
    tpa_rate: str
    fsp_rate: str
    iuts_abatement_executive: str
    iuts_abatement_non_executive: str
    iuts_brackets: list[IutsBracket]
    iuts_family_reduction: dict[int, str]
