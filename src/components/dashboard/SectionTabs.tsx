import { Bell, BookOpen, ClipboardCheck, Eye, LineChart, Moon, Radiation } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";
import { AlertsSection } from "./sections/AlertsSection";
import { ExposureSection } from "./sections/ExposureSection";
import { EyeSection } from "./sections/EyeSection";
import { GuideSection } from "./sections/GuideSection";
import { ScheduleSection } from "./sections/ScheduleSection";
import { SelfCheckSection } from "./sections/SelfCheckSection";
import { TrendsSection } from "./sections/TrendsSection";

export type TabId = "eye" | "trends" | "schedule" | "exposure" | "alerts" | "self" | "guide";

// Las etiquetas salen de i18n: tabs.<id>
const TABS: { id: TabId; Icon: typeof Eye }[] = [
  { id: "eye", Icon: Eye },
  { id: "trends", Icon: LineChart },
  { id: "schedule", Icon: Moon },
  { id: "exposure", Icon: Radiation },
  { id: "alerts", Icon: Bell },
  { id: "self", Icon: ClipboardCheck },
  { id: "guide", Icon: BookOpen },
];

const PANELS: Record<TabId, () => React.JSX.Element> = {
  eye: EyeSection,
  trends: TrendsSection,
  schedule: ScheduleSection,
  exposure: ExposureSection,
  alerts: AlertsSection,
  self: SelfCheckSection,
  guide: GuideSection,
};

export function SectionTabs({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  const { t } = useTranslation();
  const alertCount = useHealthStore((s) => s.activeAlerts.filter((a) => a.level !== "info").length);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const Panel = PANELS[tab];

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    const next = TABS[(i + delta + TABS.length) % TABS.length].id;
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <section className="sections" id="sections">
      <div className="tabs" role="tablist" aria-label={t("tabs.ariaLabel")} onKeyDown={onKey}>
        {TABS.map(({ id, Icon }) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={cx("tab", tab === id && "tab--on")}
            onClick={() => onChange(id)}
          >
            <Icon size={15} aria-hidden />
            {t(`tabs.${id}`)}
            {id === "alerts" && alertCount > 0 && <span className="tab__count">{alertCount}</span>}
          </button>
        ))}
      </div>
      <div className="tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        <Panel />
      </div>
    </section>
  );
}
