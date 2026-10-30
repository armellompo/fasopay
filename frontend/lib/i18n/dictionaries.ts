// One message file per feature, French and English side by side (each declares `en: typeof fr`,
// so a missing or mistyped English entry fails the type-check).
import auth from "./messages/auth";
import common from "./messages/common";
import dashboard from "./messages/dashboard";
import employees from "./messages/employees";
import importMessages from "./messages/import";
import runs from "./messages/runs";
import server from "./messages/server";
import settings from "./messages/settings";
import shell from "./messages/shell";
import tax from "./messages/tax";

const sections = { common, shell, dashboard, employees, import: importMessages, runs, tax, settings, auth, server };

type Sections = typeof sections;
type Lang<L extends "fr" | "en"> = { [S in keyof Sections]: Sections[S][L] };

function pick<L extends "fr" | "en">(lang: L): Lang<L> {
  return Object.fromEntries(Object.entries(sections).map(([name, s]) => [name, s[lang]])) as Lang<L>;
}

export const dictionaries = { fr: pick("fr"), en: pick("en") };
export type Dict = Lang<"fr">;
