// Bulletin de paie rendered with @react-pdf/renderer (server-side only). One page per employee.
// Uses the built-in Helvetica (WinAnsi), so numbers use plain spaces, not the narrow no-break
// spaces Intl produces for fr-FR, and en dashes instead of U+2212 minus: that font can't draw either.
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { PayslipDocData } from "../payslip-documents";
import { amountInWords } from "./amount-in-words";

const C = { ink: "#0f172a", muted: "#64748b", line: "#e2e8f0", soft: "#f8fafc", brand: "#047857", brandSoft: "#ecfdf5", warn: "#b45309" };

const fcfa = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const pct = (r: number) => `${String(r).replace(".", ",")} %`;
const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const phone = (n: string | null) => n?.replace(/^\+226(\d{2})(\d{2})(\d{2})(\d{2})$/, "+226 $1 $2 $3 $4") ?? "";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 8.5, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.35 },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: C.muted },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.brand, letterSpacing: 0.5, lineHeight: 1.1, marginBottom: 4 },
  company: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 8 },
  label: { color: C.muted, width: 92 },
  badge: { marginTop: 6, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3, alignSelf: "flex-end", fontSize: 8 },
  th: { backgroundColor: C.soft, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 4, fontFamily: "Helvetica-Bold", fontSize: 7.5, color: C.muted, textTransform: "uppercase" },
  td: { paddingVertical: 3.5, borderBottomWidth: 0.5, borderColor: C.line },
  cLabel: { flex: 3.2, paddingLeft: 6 },
  cNum: { flex: 1.3, textAlign: "right", paddingRight: 6 },
  cRate: { flex: 0.8, textAlign: "right", paddingRight: 6 },
  netBox: { marginTop: 12, backgroundColor: C.brandSoft, borderRadius: 4, padding: 10, borderLeftWidth: 3, borderColor: C.brand },
  section: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.muted, textTransform: "uppercase", marginBottom: 4 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 7, color: C.muted, borderTopWidth: 0.5, borderColor: C.line, paddingTop: 6 },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={[s.row, { marginBottom: 2 }]}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ flex: 1 }}>{value || "—"}</Text>
    </View>
  );
}

function Line({ label, base, rate, gain, deduction, strong }: { label: string; base?: number; rate?: number; gain?: number; deduction?: number; strong?: boolean }) {
  const st = strong ? [s.td, s.bold, { backgroundColor: C.soft }] : [s.td];
  return (
    <View style={[s.row, ...st]}>
      <Text style={s.cLabel}>{label}</Text>
      <Text style={s.cNum}>{base !== undefined ? fcfa(base) : ""}</Text>
      <Text style={s.cRate}>{rate !== undefined ? pct(rate) : ""}</Text>
      <Text style={s.cNum}>{gain !== undefined ? fcfa(gain) : ""}</Text>
      <Text style={s.cNum}>{deduction !== undefined ? fcfa(deduction) : ""}</Text>
    </View>
  );
}

function Kv({ k, v, strong, minus }: { k: string; v: number; strong?: boolean; minus?: boolean }) {
  return (
    <View style={[s.between, { marginBottom: 2 }, strong ? s.bold : {}]}>
      <Text style={strong ? {} : s.muted}>{k}</Text>
      <Text>{minus ? "– " : ""}{fcfa(v)}</Text>
    </View>
  );
}

function Bulletin({ d, generatedAt }: { d: PayslipDocData; generatedAt: string }) {
  const co = d.company;
  const familyRate = d.iuts.gross_tax > 0 ? Math.round((d.iuts.family_reduction / d.iuts.gross_tax) * 100) : 0;
  return (
    <Page size="A4" style={s.page}>
      {/* Header */}
      <View style={[s.between, { marginBottom: 14 }]}>
        <View style={{ maxWidth: 300 }}>
          <Text style={s.company}>{co.name}{co.legalForm && !co.name.includes(co.legalForm) ? ` ${co.legalForm}` : ""}</Text>
          {co.address && <Text style={s.muted}>{co.address}</Text>}
          <Text style={s.muted}>{co.city}, Burkina Faso{co.phone ? ` · Tél. ${phone(co.phone)}` : ""}</Text>
          <Text style={[s.muted, { marginTop: 3 }]}>
            IFU : {co.ifu ?? "—"} · RCCM : {co.rccm ?? "—"}
          </Text>
          <Text style={s.muted}>N° employeur CNSS : {co.cnssEmployerNumber ?? "—"}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.h1}>BULLETIN DE PAIE</Text>
          <Text style={{ fontSize: 10, marginTop: 2 }}>Période : {d.periodLabel}</Text>
          {d.status === "PAID" && d.paidAt ? (
            <Text style={[s.badge, { backgroundColor: C.brandSoft, color: C.brand }]}>Payé le {dateFr(d.paidAt)}</Text>
          ) : (
            <Text style={[s.badge, { backgroundColor: "#fffbeb", color: C.warn }]}>PROVISOIRE · non payé</Text>
          )}
        </View>
      </View>

      {/* Employee */}
      <View style={[s.box, s.row, { marginBottom: 12 }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Field label="Matricule" value={d.employee.code} />
          <Field label="Nom et prénom(s)" value={d.employee.fullName} />
          <Field label="Emploi" value={d.employee.role} />
          <Field label="Service" value={d.employee.department} />
        </View>
        <View style={{ flex: 1, paddingLeft: 8, borderLeftWidth: 0.5, borderColor: C.line }}>
          <Field label="N° CNSS" value={d.employee.cnssNumber ?? ""} />
          <Field label="Catégorie" value={d.employee.isExecutive ? "Cadre" : "Non-cadre"} />
          <Field label="Charges de famille" value={String(d.employee.dependents)} />
          <Field
            label="Mode de paiement"
            value={`${d.employee.paymentMethod}${d.employee.mobileMoneyNumber ? ` · ${phone(d.employee.mobileMoneyNumber)}` : ""}`}
          />
        </View>
      </View>

      {/* Gains and deductions */}
      <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 4 }}>
        <View style={[s.row, s.th]}>
          <Text style={s.cLabel}>Rubrique</Text>
          <Text style={s.cNum}>Base</Text>
          <Text style={s.cRate}>Taux</Text>
          <Text style={s.cNum}>Gains</Text>
          <Text style={s.cNum}>Retenues</Text>
        </View>
        {d.earnings.map((e) => (
          <Line key={e.label} label={e.label} gain={e.amount} />
        ))}
        <Line label="SALAIRE BRUT" gain={d.gross} strong />
        <Line label="Cotisation CNSS (part salariale)" base={d.cnss.base} rate={d.cnss.rate} deduction={d.cnss.amount} />
        <Line label="IUTS (impôt unique sur traitements et salaires)" base={d.iuts.taxable_base} deduction={d.iuts.net_tax} />
        <Line label="Fonds de Soutien Patriotique (FSP)" base={d.fsp.base} rate={d.fsp.rate} deduction={d.fsp.amount} />
        <Line label="TOTAUX" gain={d.gross} deduction={d.totalDeductions} strong />
      </View>

      {/* Net */}
      <View style={s.netBox}>
        <View style={s.between}>
          <Text style={[s.bold, { fontSize: 11 }]}>NET À PAYER</Text>
          <Text style={[s.bold, { fontSize: 14, color: C.brand }]}>{fcfa(d.net)} FCFA</Text>
        </View>
        <Text style={{ marginTop: 4, fontSize: 8 }}>
          Arrêté le présent bulletin à la somme nette de {amountInWords(d.net)} ({fcfa(d.net)}) francs CFA.
        </Text>
      </View>

      {/* Detail blocks */}
      <View style={[s.row, { marginTop: 12 }]}>
        <View style={[s.box, { flex: 1, marginRight: 6 }]}>
          <Text style={s.section}>Détail du calcul de l&apos;IUTS</Text>
          <Kv k="Salaire brut" v={d.gross} />
          <Kv k="Indemnités exonérées" v={d.iuts.exempt_allowances} minus />
          <Kv k="Cotisation CNSS déductible (max. 8 %)" v={d.iuts.pension_deduction ?? d.cnss.amount} minus />
          <Kv k={`Abattement forfaitaire (${pct(d.iuts.abatementRate)})`} v={d.iuts.professional_abatement} minus />
          <Kv k="Base imposable (arrondie à la centaine)" v={d.iuts.taxable_base} strong />
          <Kv k="IUTS selon barème" v={d.iuts.gross_tax} />
          <Kv k={`Réduction charges de famille (${familyRate} %)`} v={d.iuts.family_reduction} minus />
          <Kv k="IUTS retenu" v={d.iuts.net_tax} strong />
        </View>
        <View style={[s.box, { flex: 1, marginLeft: 6 }]}>
          <Text style={s.section}>Charges patronales (pour information)</Text>
          <Kv k={`CNSS part patronale (${pct(d.employer.cnssRate)})`} v={d.employer.cnss} />
          <Kv k={`Taxe patronale d'apprentissage (${pct(d.employer.tpaRate)})`} v={d.employer.tpa} />
          <Kv k="Total charges patronales" v={d.employer.total} strong />
          <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderColor: C.line }}>
            <Kv k="Coût total employeur" v={d.employer.totalCost} strong />
          </View>
          <View style={{ marginTop: 16, height: 52, borderWidth: 0.5, borderColor: C.line, borderStyle: "dashed", borderRadius: 3, padding: 4 }}>
            <Text style={[s.muted, { fontSize: 7 }]}>Cachet et signature de l&apos;employeur</Text>
          </View>
        </View>
      </View>

      <View style={s.footer} fixed>
        <View style={s.between}>
          <Text>
            Bulletin établi par FasoPay le {dateFr(generatedAt)}. Conservez-le sans limitation de durée.
          </Text>
          <Text>
            {d.employee.code} · {d.period}
          </Text>
        </View>
      </View>
    </Page>
  );
}

export function PayslipDocument({ slips, title }: { slips: PayslipDocData[]; title: string }) {
  const generatedAt = new Date().toISOString();
  return (
    <Document title={title} author={slips[0]?.company.name} creator="FasoPay" producer="FasoPay" language="fr">
      {slips.map((d) => (
        <Bulletin key={`${d.period}-${d.employee.code}`} d={d} generatedAt={generatedAt} />
      ))}
    </Document>
  );
}
