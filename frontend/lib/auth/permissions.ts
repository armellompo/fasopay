// Role → permission table. Pure (no server imports) so the UI can hide what the server would refuse.
// The server is the authority: every mutating action calls authorize() with one of these.
export type Role = "OWNER" | "ADMIN" | "ACCOUNTANT";

export type Permission =
  | "payroll.calculate" // run the compliance engine on unpaid payslips
  | "tax.file" // mark declarations filed / reopen them
  | "employees.manage" // add, edit, deactivate employees
  | "runs.open" // open the next payroll month
  | "runs.markPaid" // record that salaries were paid out
  | "settings.manage" // company identity
  | "team.manage"; // invite, change roles, remove members

const MATRIX: Record<Role, readonly Permission[]> = {
  OWNER: ["payroll.calculate", "tax.file", "employees.manage", "runs.open", "runs.markPaid", "settings.manage", "team.manage"],
  ADMIN: ["payroll.calculate", "tax.file", "employees.manage", "runs.open", "runs.markPaid", "settings.manage", "team.manage"],
  ACCOUNTANT: ["payroll.calculate", "tax.file"],
};

// Role names and descriptions for display live in the dictionaries (common.role, common.roleDescription).

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

/** Roles an actor may grant. Only owners can create owners. */
export function assignableRoles(actor: Role): Role[] {
  if (!can(actor, "team.manage")) return [];
  return actor === "OWNER" ? ["OWNER", "ADMIN", "ACCOUNTANT"] : ["ADMIN", "ACCOUNTANT"];
}

/** Whether an actor may change or remove a member holding `target`. Only owners touch owners. */
export function canManageMember(actor: Role, target: Role): boolean {
  return can(actor, "team.manage") && (target !== "OWNER" || actor === "OWNER");
}
