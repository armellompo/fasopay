import { redirect } from "next/navigation";

import { SettingsView } from "@/components/settings/SettingsView";
import { getRates } from "@/lib/api";
import { PRICE_PER_EMPLOYEE } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { currentCompany } from "@/lib/payroll-service";

export default async function SettingsPage() {
  const company = await currentCompany();
  if (!company) {
    redirect("/companies/new");
  }

  const [rates, activeEmployees, inactiveEmployees] = await Promise.all([
    getRates(),
    prisma.employee.count({ where: { companyId: company.id, active: true } }),
    prisma.employee.count({ where: { companyId: company.id, active: false } }),
  ]);

  return (
    <SettingsView
      company={{
        name: company.name,
        city: company.city,
        legalForm: company.legalForm,
        ifu: company.ifu,
        rccm: company.rccm,
        cnssEmployerNumber: company.cnssEmployerNumber,
        address: company.address,
        phone: company.phone,
        email: company.email,
      }}
      rates={rates}
      subscription={{ activeEmployees, inactiveEmployees, pricePerEmployee: PRICE_PER_EMPLOYEE }}
    />
  );
}
