// Shared with middleware, which runs on the edge runtime: no Node or Prisma imports here.
export const SESSION_COOKIE = "fasopay_session";
// /invite shows who invited you and offers sign-in or sign-up, so it must work signed out.
// /api/health is polled by Docker and uptime monitors.
export const PUBLIC_PATHS = ["/login", "/signup", "/invite", "/api/health"];
