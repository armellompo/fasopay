"""Pure payroll calculation functions for Burkina Faso.

No I/O, no database, no global state: each function maps Decimals to Decimals,
so every step can be unit-tested and audited in isolation.

Rounding policy: intermediate math stays in exact ``Decimal``; each statutory
line item is rounded once to the whole franc (ROUND_HALF_UP), and totals are
summed from those rounded items so the pay slip always adds up.
"""

from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal

from . import config as c
from .schemas import (
    EmployeeDeductions,
    EmployerLiabilities,
    IutsBreakdown,
    PayrollInput,
    PayrollResult,
)

ZERO = Decimal(0)


def round_fcfa(amount: Decimal) -> Decimal:
    """Round to the nearest whole franc, halves away from zero."""
    return amount.quantize(Decimal(1), rounding=ROUND_HALF_UP)


def _non_negative(amount: Decimal) -> Decimal:
    if amount < 0:
        raise ValueError(f"amount must be non-negative, got {amount}")
    return amount


# --- CNSS -------------------------------------------------------------------

def cnss_base(gross: Decimal) -> Decimal:
    """Contributable base: ``min(gross, 800 000)``."""
    return min(_non_negative(gross), c.CNSS_CEILING)


def cnss_employee(gross: Decimal) -> Decimal:
    """Employee share: ``5.5% × min(gross, ceiling)``."""
    return round_fcfa(cnss_base(gross) * c.CNSS_EMPLOYEE_RATE)


def cnss_employer(gross: Decimal) -> Decimal:
    """Employer share: ``16% × min(gross, ceiling)``."""
    return round_fcfa(cnss_base(gross) * c.CNSS_EMPLOYER_RATE)


# --- TPA --------------------------------------------------------------------

def tpa(gross: Decimal) -> Decimal:
    """Taxe Patronale d'Apprentissage: ``3% × gross``, no ceiling."""
    return round_fcfa(_non_negative(gross) * c.TPA_RATE)


# --- IUTS -------------------------------------------------------------------

def _capped_exemption(amount: Decimal, base_salary: Decimal, rule: tuple[Decimal, Decimal]) -> Decimal:
    """Exempt part of one allowance: ``min(amount, share × base, absolute cap)``."""
    share, cap = rule
    return min(amount, base_salary * share, cap)


def exempt_allowances(
    base_salary: Decimal, housing: Decimal, transport: Decimal, function: Decimal
) -> Decimal:
    """Sum of IUTS-exempt allowance portions (housing, transport, function)."""
    return round_fcfa(
        _capped_exemption(housing, base_salary, c.HOUSING_EXEMPTION)
        + _capped_exemption(transport, base_salary, c.TRANSPORT_EXEMPTION)
        + _capped_exemption(function, base_salary, c.FUNCTION_EXEMPTION)
    )


def professional_abatement(base_salary: Decimal, is_executive: bool) -> Decimal:
    """Flat professional abatement on base salary: 20% (cadre) or 25%."""
    rate = c.IUTS_ABATEMENT_EXECUTIVE if is_executive else c.IUTS_ABATEMENT_NON_EXECUTIVE
    return round_fcfa(_non_negative(base_salary) * rate)


def iuts_taxable_base(
    gross: Decimal, exempt: Decimal, employee_cnss: Decimal, abatement: Decimal
) -> Decimal:
    """``gross − exempt allowances − employee CNSS − abatement``, floored at 0
    and truncated down to the nearest 100 FCFA."""
    raw = max(gross - exempt - employee_cnss - abatement, ZERO)
    step = c.IUTS_BASE_ROUNDING
    return (raw / step).to_integral_value(rounding=ROUND_DOWN) * step


def iuts_progressive(taxable: Decimal) -> Decimal:
    """Apply the monthly barème bracket by bracket (marginal rates).

    For each bracket ``(upper, rate)`` the slice
    ``min(taxable, upper) − previous_upper`` is taxed at ``rate``.
    """
    tax = ZERO
    lower = ZERO
    for upper, rate in c.IUTS_BRACKETS:
        if taxable <= lower:
            break
        top = taxable if upper is None else min(taxable, upper)
        tax += (top - lower) * rate
        if upper is None:
            break
        lower = upper
    return round_fcfa(tax)


def iuts_family_reduction(gross_tax: Decimal, dependents: int) -> Decimal:
    """Reduction of gross IUTS for dependents (capped at 4 dependents)."""
    if dependents < 0:
        raise ValueError("dependents must be non-negative")
    rate = c.IUTS_FAMILY_REDUCTION[min(dependents, c.IUTS_MAX_DEPENDENTS)]
    return round_fcfa(gross_tax * rate)


# --- FSP --------------------------------------------------------------------

def fsp(net_before_fsp: Decimal) -> Decimal:
    """Fonds de Soutien Patriotique: ``1% × net salary`` (after CNSS and IUTS)."""
    return round_fcfa(max(net_before_fsp, ZERO) * c.FSP_RATE)


# --- Orchestration ----------------------------------------------------------

def calculate_payroll(data: PayrollInput) -> PayrollResult:
    """Compose the pure steps into a full itemised monthly pay computation.

    1. gross = base + bonuses + allowances
    2. employee CNSS / employer CNSS on min(gross, 800 000)
    3. IUTS on (gross − exempt allowances − employee CNSS − abatement), less family reduction
    4. FSP = 1% × (gross − employee CNSS − IUTS)
    5. net = gross − CNSS − IUTS − FSP; employer cost = gross + employer CNSS + TPA
    """
    gross = data.gross_salary
    a = data.allowances

    emp_cnss = cnss_employee(gross)
    exempt = exempt_allowances(data.base_salary, a.housing, a.transport, a.function)
    abatement = professional_abatement(data.base_salary, data.is_executive)
    taxable = iuts_taxable_base(gross, exempt, emp_cnss, abatement)
    gross_tax = iuts_progressive(taxable)
    reduction = iuts_family_reduction(gross_tax, data.dependents)
    iuts = gross_tax - reduction

    fsp_amount = fsp(gross - emp_cnss - iuts)
    total_deductions = emp_cnss + iuts + fsp_amount
    net = gross - total_deductions

    er_cnss = cnss_employer(gross)
    tpa_amount = tpa(gross)
    employer_total = er_cnss + tpa_amount

    return PayrollResult(
        employee_id=data.employee_id,
        gross_salary=int(gross),
        cnss_base=int(cnss_base(gross)),
        employee_deductions=EmployeeDeductions(
            cnss=int(emp_cnss), iuts=int(iuts), fsp=int(fsp_amount), total=int(total_deductions)
        ),
        iuts_detail=IutsBreakdown(
            exempt_allowances=int(exempt),
            professional_abatement=int(abatement),
            taxable_base=int(taxable),
            gross_tax=int(gross_tax),
            family_reduction=int(reduction),
            net_tax=int(iuts),
        ),
        net_salary=int(net),
        employer_liabilities=EmployerLiabilities(
            cnss=int(er_cnss), tpa=int(tpa_amount), total=int(employer_total)
        ),
        total_employer_cost=int(gross + employer_total),
    )
