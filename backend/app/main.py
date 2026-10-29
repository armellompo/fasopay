"""FastAPI entry point for the FasoPay compliance engine."""

import os
from decimal import InvalidOperation

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from . import config as c
from .engine import calculate_payroll
from .schemas import IutsBracket, PayrollInput, PayrollResult, StatutoryRates

app = FastAPI(
    title="FasoPay Compliance Engine",
    version="0.1.0",
    description="Burkina Faso payroll: CNSS, IUTS, TPA and FSP calculations.",
)

# Only the web server calls the engine (server to server), so production needs no CORS at all.
# Set ENGINE_CORS_ORIGINS="" there; the default keeps local browser experiments working.
_cors_origins = [o.strip() for o in os.environ.get("ENGINE_CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_methods=["POST", "GET"],
        allow_headers=["*"],
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/rates", response_model=StatutoryRates, summary="Statutory rates the engine applies")
def rates() -> StatutoryRates:
    """Expose config.py so the UI shows the exact parameters used, never a copy."""
    return StatutoryRates(
        cnss_ceiling=int(c.CNSS_CEILING),
        cnss_employee_rate=str(c.CNSS_EMPLOYEE_RATE),
        cnss_employer_rate=str(c.CNSS_EMPLOYER_RATE),
        tpa_rate=str(c.TPA_RATE),
        fsp_rate=str(c.FSP_RATE),
        iuts_abatement_executive=str(c.IUTS_ABATEMENT_EXECUTIVE),
        iuts_abatement_non_executive=str(c.IUTS_ABATEMENT_NON_EXECUTIVE),
        iuts_brackets=[
            IutsBracket(up_to=None if upper is None else int(upper), rate=str(rate)) for upper, rate in c.IUTS_BRACKETS
        ],
        iuts_family_reduction={k: str(v) for k, v in c.IUTS_FAMILY_REDUCTION.items()},
    )


@app.post(
    "/api/v1/payroll/calculate",
    response_model=PayrollResult,
    summary="Compute one employee's monthly payroll",
)
def calculate(payload: PayrollInput) -> PayrollResult:
    """Return an itemised breakdown: employee deductions (CNSS, IUTS, FSP),
    net salary, and employer liabilities (CNSS, TPA).

    Schema violations (negative or fractional amounts, unknown fields, gross
    mismatch) are rejected by Pydantic with HTTP 422 before reaching here.
    """
    try:
        return calculate_payroll(payload)
    except (ValueError, InvalidOperation) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
