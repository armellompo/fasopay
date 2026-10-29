import { redirect } from "next/navigation";

import { TeamView } from "@/components/settings/TeamView";
import { getTeam } from "@/lib/team-service";

export default async function TeamPage() {
  const team = await getTeam();
  if (!team) redirect("/login");
  return <TeamView team={team} />;
}
