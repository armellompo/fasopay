import { TaxView } from "@/components/tax/TaxView";
import { getT } from "@/lib/i18n/server";
import { getTaxDeclaration } from "@/lib/tax-service";

export default async function TaxPage({ searchParams }: { searchParams: { period?: string } }) {
  const declaration = await getTaxDeclaration(searchParams.period);

  if (!declaration) {
    const t = getT().tax;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-lg font-semibold">{t.noPayroll}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.noPayrollHint}</p>
      </div>
    );
  }
  return <TaxView declaration={declaration} />;
}
