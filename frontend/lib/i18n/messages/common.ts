// Words shared across screens: statuses, payment methods, roles, generic actions.
const fr = {
  status: { Draft: "Brouillon", Calculated: "Calculé", Paid: "Payé" },
  method: { "Orange Money": "Orange Money", "Moov Money": "Moov Money", Wave: "Wave", "Bank Transfer": "Virement bancaire" },
  methodDb: { ORANGE_MONEY: "Orange Money", MOOV_MONEY: "Moov Money", WAVE: "Wave", BANK_TRANSFER: "Virement bancaire" },
  role: { OWNER: "Propriétaire", ADMIN: "Administrateur", ACCOUNTANT: "Comptable" },
  roleDescription: {
    OWNER: "Accès complet, y compris ajouter ou retirer d'autres propriétaires.",
    ADMIN: "Gère les salariés, la paie, les paiements, les paramètres et l'équipe. Ne peut pas modifier les propriétaires.",
    ACCOUNTANT: "Consulte tout, calcule la paie, dépose les déclarations et exporte. Ne peut ni modifier la paie ni enregistrer les paiements.",
  },
  all: "Tous",
  cancel: "Annuler",
  close: "Fermer",
  edit: "Modifier",
  pending: "En attente",
  viewOnly: "Lecture seule",
  daysLeft: (n: number) => `${n} jour${n > 1 ? "s" : ""} restant${n > 1 ? "s" : ""}`,
  perMonth: "/ mois",
};

const en: typeof fr = {
  status: { Draft: "Draft", Calculated: "Calculated", Paid: "Paid" },
  method: { "Orange Money": "Orange Money", "Moov Money": "Moov Money", Wave: "Wave", "Bank Transfer": "Bank Transfer" },
  methodDb: { ORANGE_MONEY: "Orange Money", MOOV_MONEY: "Moov Money", WAVE: "Wave", BANK_TRANSFER: "Bank Transfer" },
  role: { OWNER: "Owner", ADMIN: "Admin", ACCOUNTANT: "Accountant" },
  roleDescription: {
    OWNER: "Full access, including adding or removing other owners.",
    ADMIN: "Manages employees, payroll, payouts, settings and the team. Cannot change owners.",
    ACCOUNTANT: "Views everything, calculates payroll, files declarations and exports. Cannot edit pay or mark payouts.",
  },
  all: "All",
  cancel: "Cancel",
  close: "Close",
  edit: "Edit",
  pending: "Pending",
  viewOnly: "View only",
  daysLeft: (n: number) => `${n} day${n === 1 ? "" : "s"} left`,
  perMonth: "/ month",
};

export default { fr, en };
