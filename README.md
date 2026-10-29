# FasoPay

Payroll compliance SaaS for Burkina Faso: CNSS, IUTS, TPA and FSP, plus Mobile Money bulk payouts.

Deploying to a server: see [DEPLOY.md](DEPLOY.md) (Docker Compose with HTTPS, backups, monitoring).

## Backend — compliance engine (FastAPI)

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
uvicorn app.main:app --reload --port 8000
```

Docs: http://localhost:8000/docs

- `app/config.py` — every statutory rate and bracket (single place to update after each Loi de Finances)
- `app/engine.py` — pure calculation functions (Decimal math, rounded once per line item to the whole franc)
- `app/schemas.py` — Pydantic contracts (non-negative whole-FCFA amounts, unknown fields rejected)
- `app/main.py` — `POST /api/v1/payroll/calculate`

Example request:

```json
{
  "employee_id": "EMP-001",
  "base_salary": 300000,
  "bonuses": 20000,
  "allowances": { "housing": 60000, "transport": 25000 },
  "dependents": 2,
  "is_executive": false
}
```

→ gross 405 000, CNSS 22 275, IUTS 32 108, FSP 3 506, **net 347 111**; employer CNSS 64 800 + TPA 12 150.

> The IUTS barème, abatements and allowance exemptions in `config.py` must be validated by a Burkinabè expert-comptable before production use.

## Frontend — dashboard (Next.js 14 + Tailwind + Prisma/PostgreSQL)

First time:

```bash
cd frontend
cp .env.example .env
npm install
npm run db:start      # terminal 1 — local PostgreSQL 17 on port 5433, data in ./.pgdata
npm run db:migrate    # terminal 2 — create tables
npm run db:seed       # demo account, 2 companies, November 2026
```

Demo login after seeding (local development only): `demo@fasopay.example` / `FasoPay-demo-2026`. It owns
two companies, Sahel Logistique SARL and Boulangerie Wend-Kuuni. `comptable@fasopay.example` (same password)
is Sahel's external accountant with the Accountant role. New users can also sign up at `/signup`.

Every time: run `npm run db:start`, the backend (`uvicorn`, above) and `npm run dev`, then open http://localhost:3000.
`npm run db:studio` opens a table browser for the database.

"Run Monthly Payroll" calls `POST /api/payroll/run`. The Next.js server sends every unpaid employee to the
engine, then saves all payslips in one transaction (Paid payslips are locked). Each payslip keeps the
engine's full response for audits. Production: point `DATABASE_URL` at a managed PostgreSQL and
`PAYROLL_ENGINE_URL` at the deployed engine.

- `prisma/schema.prisma` — Company, Employee, PayrollRun, Payslip
- Accounts: email + password (scrypt, `lib/auth/password.ts`), server-side sessions in PostgreSQL with only a
  hash of the cookie token stored (`lib/auth/session.ts`), failed-login throttling (in-memory, single
  server). A user can own several companies (accounting firms) and switch between them in the sidebar.
  Every query is scoped through `currentCompany()`, which only returns a company the user is a member of.
- Languages: French by default with an FR/EN switch (header and sign-in pages), saved in a cookie. All text,
  including server messages and validation, lives in `lib/i18n/messages/*.ts` with French and English side by
  side; each file declares `en: typeof fr`, so a missing translation fails the type-check. Pay slips stay in
  French (legal document language).
- Roles and invites: Owner / Admin / Accountant (`lib/auth/permissions.ts`). Every mutating action calls
  `authorize(permission)` (`lib/auth/authorize.ts`); the UI hides the same controls via `useCan`. Owners and
  admins invite from Settings → Team: the invite link (7 days, single use, bound to one email, only its
  hash stored) is shown once with Copy and Share on WhatsApp. Only owners can grant or remove the Owner role,
  and a company always keeps at least one owner.
- `lib/payroll-service.ts` — load dashboard, run payroll
- `/employees` — add, edit, deactivate employees (`lib/employee-actions.ts`, validated by `lib/employee-schema.ts`).
  "Preview payslip" runs the form through the engine without saving. Changing pay on a Calculated
  employee sends this month's payslip back to Draft; Paid payslips are never touched.
- `/runs` — one payroll run per month (`lib/runs-service.ts`, `lib/run-actions.ts`). Open the next month
  (only once the current one has no drafts), calculate, export the Mobile Money bulk file per operator
  (with phone numbers), then mark payslips as paid after the transfer. Paid payslips are final.
- Pay slips (bulletins de paie): French A4 PDFs from Payroll Runs → a run → "All pay slips (PDF)" or a row's
  "Bulletin" (`GET /api/payslips/{period}[/{employeeId}]`, rendered by `lib/pdf/PayslipDocument.tsx` with
  `@react-pdf/renderer`). Company IFU/RCCM/CNSS numbers, employee CNSS number, gains and deductions with
  bases and rates, IUTS working, employer charges, net in words (`lib/pdf/amount-in-words.ts`). Each payslip
  stores a snapshot of the employee's details at calculation time, so a paid slip always reprints exactly as
  issued; unpaid ones are marked PROVISOIRE.
- `/settings` — company identity (IFU, RCCM, CNSS employer number, contact) shown on declarations, the
  subscription total (`lib/billing.ts`), and the statutory rates read live from the engine's `GET /api/v1/rates`.
- `/tax` — monthly remittances to DGI (IUTS + TPA), CNSS (5.5% + 16%) and FSP from saved payslips, the
  per-employee état nominatif (CSV export, printable), and "Mark as filed" with a receipt number
  (`lib/tax-service.ts`, `lib/tax-actions.ts`). Filing is refused while any active employee is uncalculated,
  and a filed amount that no longer matches payroll is flagged for correction.
- `scripts/dev-db.mjs` — embedded PostgreSQL for local development only

> Windows: keep the project in a short path (e.g. `Downloads\FasoPay`). PostgreSQL fails to start when
> its binaries sit past the 260-character path limit.
