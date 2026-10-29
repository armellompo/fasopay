// Seeds a demo account owning two companies for November 2026. Payslip figures are real outputs of
// the compliance engine (backend/app/engine.py) so the demo matches what a run would produce.
import { PrismaClient, type PaymentMethod, type PayslipStatus } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { payslipFields } from "../lib/payslip";
import type { PayrollResult } from "../lib/types";

const prisma = new PrismaClient();
const PERIOD = "2026-11";

// Local development login only. Never reuse for a real account.
const DEMO_EMAIL = "demo@fasopay.example";
const DEMO_PASSWORD = "FasoPay-demo-2026";
const ACCOUNTANT_EMAIL = "comptable@fasopay.example";

interface SeedEmployee {
  code: string;
  fullName: string;
  role: string;
  department: string;
  baseSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  functionAllowance?: number;
  dependents: number;
  isExecutive?: boolean;
  paymentMethod: PaymentMethod;
  mobileMoneyNumber?: string;
  cnssNumber?: string;
  status: PayslipStatus;
  result?: PayrollResult;
}

const sahelEmployees: SeedEmployee[] = [
  {
    code: "EMP-001", fullName: "Aminata Ouédraogo", cnssNumber: "0198 4521", role: "Directrice Financière", department: "Finance",
    baseSalary: 650_000, housingAllowance: 100_000, transportAllowance: 30_000, dependents: 3, isExecutive: true,
    paymentMethod: "BANK_TRANSFER", status: "PAID",
    result: {"employee_id":"EMP-001","gross_salary":780000,"cnss_base":780000,"employee_deductions":{"cnss":42900,"iuts":90160,"fsp":6469,"total":139529},"iuts_detail":{"exempt_allowances":105000,"professional_abatement":130000,"taxable_base":502100,"gross_tax":102455,"family_reduction":12295,"net_tax":90160},"net_salary":640471,"employer_liabilities":{"cnss":124800,"tpa":23400,"total":148200},"total_employer_cost":928200},
  },
  {
    code: "EMP-002", fullName: "Ibrahim Sawadogo", cnssNumber: "0273 1188", role: "Chef d'entrepôt", department: "Opérations",
    baseSalary: 420_000, housingAllowance: 60_000, transportAllowance: 25_000, dependents: 2,
    paymentMethod: "ORANGE_MONEY", mobileMoneyNumber: "+22670112233", status: "CALCULATED",
    result: {"employee_id":"EMP-002","gross_salary":505000,"cnss_base":505000,"employee_deductions":{"cnss":27775,"iuts":44757,"fsp":4325,"total":76857},"iuts_detail":{"exempt_allowances":81000,"professional_abatement":105000,"taxable_base":291200,"gross_tax":49730,"family_reduction":4973,"net_tax":44757},"net_salary":428143,"employer_liabilities":{"cnss":80800,"tpa":15150,"total":95950},"total_employer_cost":600950},
  },
  {
    code: "EMP-003", fullName: "Fatimata Compaoré", cnssNumber: "0311 9042", role: "Comptable", department: "Finance",
    baseSalary: 380_000, transportAllowance: 20_000, dependents: 1,
    paymentMethod: "MOOV_MONEY", mobileMoneyNumber: "+22660445566", status: "CALCULATED",
    result: {"employee_id":"EMP-003","gross_salary":400000,"cnss_base":400000,"employee_deductions":{"cnss":22000,"iuts":39496,"fsp":3385,"total":64881},"iuts_detail":{"exempt_allowances":19000,"professional_abatement":95000,"taxable_base":264000,"gross_tax":42930,"family_reduction":3434,"net_tax":39496},"net_salary":335119,"employer_liabilities":{"cnss":64000,"tpa":12000,"total":76000},"total_employer_cost":476000},
  },
  {
    code: "EMP-004", fullName: "Boukary Zongo", cnssNumber: "0156 7730", role: "Chauffeur poids lourd", department: "Transport",
    baseSalary: 250_000, transportAllowance: 15_000, dependents: 4,
    paymentMethod: "WAVE", mobileMoneyNumber: "+22676778899", status: "PAID",
    result: {"employee_id":"EMP-004","gross_salary":265000,"cnss_base":265000,"employee_deductions":{"cnss":14575,"iuts":19988,"fsp":2304,"total":36867},"iuts_detail":{"exempt_allowances":12500,"professional_abatement":62500,"taxable_base":175400,"gross_tax":23242,"family_reduction":3254,"net_tax":19988},"net_salary":228133,"employer_liabilities":{"cnss":42400,"tpa":7950,"total":50350},"total_employer_cost":315350},
  },
  {
    code: "EMP-005", fullName: "Salimata Traoré", cnssNumber: "0087 2215", role: "Directrice Générale", department: "Direction",
    baseSalary: 900_000, housingAllowance: 150_000, functionAllowance: 50_000, dependents: 2, isExecutive: true,
    paymentMethod: "BANK_TRANSFER", status: "DRAFT",
  },
];

// A second, smaller client to show the company switcher and tenant isolation.
const bakeryEmployees: SeedEmployee[] = [
  {
    code: "EMP-001", fullName: "Rasmané Ilboudo", cnssNumber: "0402 6619", role: "Chef boulanger", department: "Production",
    baseSalary: 160_000, transportAllowance: 10_000, dependents: 3,
    paymentMethod: "ORANGE_MONEY", mobileMoneyNumber: "+22670998877", status: "DRAFT",
  },
  {
    code: "EMP-002", fullName: "Mariam Sanou", role: "Vendeuse", department: "Boutique",
    baseSalary: 75_000, transportAllowance: 7_500, dependents: 1,
    paymentMethod: "WAVE", mobileMoneyNumber: "+22676554433", status: "DRAFT",
  },
];

async function seedEmployees(companyId: string, runId: string, list: SeedEmployee[]) {
  for (const { status, result, ...e } of list) {
    const employee = await prisma.employee.create({ data: { ...e, companyId } });
    await prisma.payslip.create({
      data: {
        runId,
        employeeId: employee.id,
        status,
        ...(result ? payslipFields(result, employee) : {}),
        paidAt: status === "PAID" ? new Date("2026-11-28") : null,
      },
    });
  }
}

async function main() {
  // This wipes every table. Never let it near a production database by accident.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
    throw new Error("Refusing to seed: it deletes all data. Set ALLOW_DEMO_SEED=1 only on a throwaway database.");
  }

  // Idempotent: wipe and recreate the demo data.
  await prisma.invitation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.taxFiling.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.company.deleteMany();

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: "Moussa Kaboré", passwordHash: await hashPassword(DEMO_PASSWORD) },
  });

  // Identifiers below are fictitious demo values.
  const sahel = await prisma.company.create({
    data: {
      name: "Sahel Logistique SARL",
      city: "Ouagadougou",
      legalForm: "SARL",
      ifu: "00012345A",
      rccm: "BF OUA 2019 B 1234",
      cnssEmployerNumber: "1234567",
      address: "Zone industrielle de Kossodo",
      phone: "+22625301234",
      email: "rh@sahel-logistique.example",
      members: { create: { userId: user.id, role: "OWNER" } },
      runs: { create: { period: PERIOD } },
    },
    include: { runs: true },
  });
  await seedEmployees(sahel.id, sahel.runs[0].id, sahelEmployees);

  // Sahel's external accountant: Accountant role on Sahel only, no access to the bakery.
  await prisma.user.create({
    data: {
      email: ACCOUNTANT_EMAIL,
      name: "Awa Zongo",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      memberships: { create: { companyId: sahel.id, role: "ACCOUNTANT" } },
    },
  });

  const bakery = await prisma.company.create({
    data: {
      name: "Boulangerie Wend-Kuuni",
      city: "Bobo-Dioulasso",
      legalForm: "EI",
      members: { create: { userId: user.id, role: "OWNER" } },
      runs: { create: { period: PERIOD } },
    },
    include: { runs: true },
  });
  await seedEmployees(bakery.id, bakery.runs[0].id, bakeryEmployees);

  console.log(`Seeded ${DEMO_EMAIL} (owner) and ${ACCOUNTANT_EMAIL} (accountant, Sahel only) with ${sahel.name} (${sahelEmployees.length}) and ${bakery.name} (${bakeryEmployees.length}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
