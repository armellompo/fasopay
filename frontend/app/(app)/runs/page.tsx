import { RunsView } from "@/components/runs/RunsView";
import { listRuns } from "@/lib/runs-service";

export default async function RunsPage() {
  const { runs, next, blockedBy } = await listRuns();
  return <RunsView runs={runs} next={next} blockedBy={blockedBy} />;
}
