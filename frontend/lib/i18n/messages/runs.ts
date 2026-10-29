// Payroll runs list and run detail (payouts, bulk export, pay slips).
const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

const fr = {
  title: "Paies mensuelles",
  subtitle: "Une paie par mois : calculer, payer, puis déclarer.",
  open: (label: string) => `Ouvrir ${label}`,
  blocked: (n: number, label: string) => `${n} ${plural(n, "bulletin", "bulletins")} en brouillon dans ${label}`,
  none: "Aucune paie pour l'instant. Ouvrez votre premier mois ci-dessus.",
  runStatus: { paid: "Payée", open: "Ouverte", partial: "Partiellement payée", calculated: "Calculée" },
  col: {
    period: "Période",
    status: "Statut",
    employees: "Salariés",
    gross: "Brut (FCFA)",
    net: "Nets à payer (FCFA)",
    cost: "Coût employeur (FCFA)",
    paidOut: "Payés",
    filings: "Déclarations",
  },
  filed: (n: number) => `${n}/3 ${plural(n, "déposée", "déposées")}`,
  detail: {
    back: "Paies mensuelles",
    calculate: "Calculer la paie",
    recalculate: "Recalculer les impayés",
    exportSelected: (n: number) => `Exporter ${n} ${plural(n, "sélectionné", "sélectionnés")}`,
    exportUnpaid: "Exporter les impayés (CSV)",
    payslipsSelected: (n: number) => `${n} ${plural(n, "bulletin", "bulletins")} (PDF)`,
    payslipsAll: "Tous les bulletins (PDF)",
    stats: { gross: "Masse brute", net: "Nets à payer", cost: "Coût employeur", paidOut: "Déjà payé" },
    confirm: (n: number, amount: string) =>
      `Marquer ${n} ${plural(n, "bulletin", "bulletins")} (${amount}) comme ${plural(n, "payé", "payés")} ? C'est définitif.`,
    confirmPaid: "Confirmer le paiement",
    markPaid: (n: number, amount: string) => `Marquer ${n} comme ${plural(n, "payé", "payés")} · ${amount}`,
    empty: "Aucun bulletin dans cette paie.",
    selectAll: "Sélectionner tous les bulletins à payer",
    select: (name: string) => `Sélectionner ${name}`,
    col: {
      employee: "Salarié",
      payout: "Paiement",
      gross: "Brut",
      deductions: "Retenues",
      net: "Net",
      employer: "Charges patronales",
      status: "Statut",
      payslip: "Bulletin",
    },
    payslip: "Bulletin",
    payslipTitle: (name: string) => `Bulletin de paie de ${name}`,
    exported: (n: number) => `Fichier groupé exporté pour ${n} ${plural(n, "bulletin", "bulletins")}.`,
    flow:
      "Déroulé habituel : calculer la paie → exporter le fichier groupé par opérateur → le charger sur le portail entreprise " +
      "Orange Money, Moov ou Wave → une fois le virement réussi, sélectionner ces bulletins et les marquer comme payés. " +
      "Les bulletins payés sont définitifs.",
  },
};

const en: typeof fr = {
  title: "Payroll Runs",
  subtitle: "One run per month. Calculate, pay out, then declare.",
  open: (label: string) => `Open ${label}`,
  blocked: (n: number, label: string) => `${n} draft payslip${n === 1 ? "" : "s"} left in ${label}`,
  none: "No payroll runs yet. Open your first month above.",
  runStatus: { paid: "Paid", open: "Open", partial: "Partially paid", calculated: "Calculated" },
  col: {
    period: "Period",
    status: "Status",
    employees: "Employees",
    gross: "Gross (FCFA)",
    net: "Net payouts (FCFA)",
    cost: "Employer cost (FCFA)",
    paidOut: "Paid out",
    filings: "Declarations",
  },
  filed: (n: number) => `${n}/3 filed`,
  detail: {
    back: "Payroll Runs",
    calculate: "Calculate payroll",
    recalculate: "Recalculate unpaid",
    exportSelected: (n: number) => `Export ${n} selected`,
    exportUnpaid: "Export unpaid (CSV)",
    payslipsSelected: (n: number) => `${n} pay slip${n === 1 ? "" : "s"} (PDF)`,
    payslipsAll: "All pay slips (PDF)",
    stats: { gross: "Gross pay", net: "Net payouts", cost: "Employer cost", paidOut: "Paid out so far" },
    confirm: (n: number, amount: string) => `Mark ${n} payslip${n === 1 ? "" : "s"} (${amount}) as paid? This is final.`,
    confirmPaid: "Confirm paid",
    markPaid: (n: number, amount: string) => `Mark ${n} as paid · ${amount}`,
    empty: "No payslips in this run.",
    selectAll: "Select all payable",
    select: (name: string) => `Select ${name}`,
    col: {
      employee: "Employee",
      payout: "Payout",
      gross: "Gross",
      deductions: "Deductions",
      net: "Net",
      employer: "Employer charges",
      status: "Status",
      payslip: "Pay slip",
    },
    payslip: "Pay slip",
    payslipTitle: (name: string) => `Pay slip for ${name}`,
    exported: (n: number) => `Bulk file exported for ${n} payslip${n === 1 ? "" : "s"}.`,
    flow:
      "Typical flow: calculate payroll → export the bulk file per operator → upload it to the Orange Money, Moov or Wave " +
      "business portal → once the transfer succeeds, select those payslips and mark them as paid. Paid payslips are final.",
  },
};

export default { fr, en };
