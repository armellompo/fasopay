import { notFound } from "next/navigation";

import { RunDetailView } from "@/components/runs/RunDetailView";
import { getRunDetail } from "@/lib/runs-service";

export default async function RunDetailPage({ params }: { params: { period: string } }) {
  if (!/^\d{4}-\d{2}$/.test(params.period)) notFound();
  const detail = await getRunDetail(params.period);
  if (!detail) notFound();
  return <RunDetailView detail={detail} />;
}
