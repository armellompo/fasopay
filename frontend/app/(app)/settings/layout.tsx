import type { ReactNode } from "react";

import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { getT } from "@/lib/i18n/server";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const t = getT().settings;
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-slate-500">{t.subtitle}</p>
      </div>
      <SettingsTabs />
      {children}
    </>
  );
}
