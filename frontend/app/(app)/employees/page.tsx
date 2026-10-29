import { EmployeesView, type EmployeeRecord } from "@/components/employees/EmployeesView";
import { prisma } from "@/lib/db";
import { currentCompany } from "@/lib/payroll-service";

export default async function EmployeesPage() {
  const company = await currentCompany();
  const employees = company
    ? await prisma.employee.findMany({ where: { companyId: company.id }, orderBy: { code: "asc" } })
    : [];

  const records: EmployeeRecord[] = employees.map((e) => ({
    id: e.id,
    code: e.code,
    fullName: e.fullName,
    role: e.role,
    department: e.department,
    baseSalary: e.baseSalary,
    bonuses: e.bonuses,
    housingAllowance: e.housingAllowance,
    transportAllowance: e.transportAllowance,
    functionAllowance: e.functionAllowance,
    otherAllowance: e.otherAllowance,
    dependents: e.dependents,
    isExecutive: e.isExecutive,
    paymentMethod: e.paymentMethod,
    mobileMoneyNumber: e.mobileMoneyNumber,
    cnssNumber: e.cnssNumber,
    active: e.active,
  }));

  return <EmployeesView employees={records} />;
}
