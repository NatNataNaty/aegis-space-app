import { Bell, ClipboardList, ScanFace, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fmtClock } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";
import type { ModuleId } from "../layout/ModuleRail";

/** «Qué puedes hacer»: tres accesos directos con el estado de cada uno. */
export function QuickActions({ onGo }: { onGo: (m: ModuleId) => void }) {
  const { t } = useTranslation();
  const lastReport = useHealthStore((s) => s.selfReport?.recordedAt ?? null);
  const alertCount = useHealthStore((s) => s.activeAlerts.filter((a) => a.level !== "info").length);

  const items: { id: ModuleId; Icon: LucideIcon; text: string }[] = [
    { id: "face", Icon: ScanFace, text: t("quick.face") },
    {
      id: "log",
      Icon: ClipboardList,
      text: lastReport ? t("quick.logLast", { time: fmtClock(lastReport, false) }) : t("quick.logNone"),
    },
    { id: "alerts", Icon: Bell, text: alertCount ? t("quick.alertsSome", { count: alertCount }) : t("quick.alertsNone") },
  ];

  return (
    <>
      <div className="section-title">
        <h2>{t("quick.title")}</h2>
      </div>
      <section className="quick" aria-label={t("quick.title")}>
        {items.map(({ id, Icon, text }) => (
          <button key={id} type="button" className="quick__card" onClick={() => onGo(id)}>
            <span className="ico">
              <Icon size={22} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="quick__body">
              <span className="quick__title">{t(`quick.${id}Title`)}</span>
              <span className="quick__text">{text}</span>
            </span>
          </button>
        ))}
      </section>
    </>
  );
}
