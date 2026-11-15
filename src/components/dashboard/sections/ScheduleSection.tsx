import { BedDouble } from "lucide-react";
import { simT } from "../../../i18n";
import {
  formatMinuteOfDay,
  formatMinutes,
  toMissionTime,
} from "../../../features/mission/missionClock";
import {
  blockAt,
  blockDuration,
  minutesSinceRest,
  minutesUntilRest,
  type ScheduleBlock,
} from "../../../features/mission/schedule";
import { SCENARIOS } from "../../../features/simulation/scenarios";
import { fmtNum } from "../../../lib/format";
import { useHealthStore } from "../../../stores/health.store";
import { useMissionStore } from "../../../stores/mission.store";
import { InfoTip } from "../../common/InfoTip";
import { OriginBadge } from "../../common/OriginBadge";
import { useTranslation } from "react-i18next";

function segments(block: ScheduleBlock): { left: number; width: number }[] {
  const toPct = (m: number) => (m / 1440) * 100;
  if (block.end > block.start) return [{ left: toPct(block.start), width: toPct(block.end - block.start) }];
  return [
    { left: toPct(block.start), width: toPct(1440 - block.start) },
    { left: 0, width: toPct(block.end) },
  ];
}

export function ScheduleSection() {
  const { t } = useTranslation();
  const missionMs = useMissionStore((s) => s.missionMs);
  const scenarioId = useHealthStore((s) => s.scenarioId);
  const sleep = useHealthStore((s) => s.snapshot.sleep);
  const fatigue = useHealthStore((s) => s.snapshot.activity.perceivedFatigue);

  const schedule = SCENARIOS[scenarioId].schedule;
  const mt = toMissionTime(missionMs);
  const current = blockAt(schedule, mt.minuteOfDay);
  const sinceRest = minutesSinceRest(schedule, mt.minuteOfDay);
  const untilRest = minutesUntilRest(schedule, mt.minuteOfDay);
  const restBlock = schedule.find((b) => b.kind === "sleep");

  return (
    <div className="section-grid section-grid--wide">
      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>{t("sections.schedule.title", { day: mt.day })}</h3>
            <p className="panel__sub">{t("sections.schedule.sub")}</p>
          </div>
          <OriginBadge origin="simulated" />
        </header>

        <div className="timeline" aria-label={t("sections.schedule.dayTimeline")}>
          {schedule.flatMap((b, i) =>
            segments(b).map((seg, j) => (
              <span
                key={`${i}-${j}`}
                className={`timeline__seg timeline__seg--${b.kind}`}
                style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                title={`${simT(b.label)} · ${formatMinuteOfDay(b.start)}–${formatMinuteOfDay(b.end)}`}
              />
            )),
          )}
          <span className="timeline__now" style={{ left: `${(mt.minuteOfDay / 1440) * 100}%` }} />
        </div>
        <div className="timeline__axis">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h}>{String(h).padStart(2, "0")}:00</span>
          ))}
        </div>
        <ul className="legend">
          {(["sleep", "work", "exercise", "meal", "personal"] as const).map((k) => (
            <li key={k}>
              <span className={`legend__sw timeline__seg--${k}`} />
              {t(`block.${k}`)}
            </li>
          ))}
        </ul>

        <div className="kv-grid">
          <div>
            <span className="kv__label">{t("sections.schedule.currentBlock")}</span>
            <span className="kv__value">{current ? simT(current.label) : "—"}</span>
            {current && (
              <span className="kv__sub">
                {formatMinuteOfDay(current.start)}–{formatMinuteOfDay(current.end)} · {formatMinutes(blockDuration(current))}
              </span>
            )}
          </div>
          <div>
            <span className="kv__label">{t("sections.schedule.sinceRest")}</span>
            <span className="kv__value">{current?.kind === "sleep" ? t("sections.schedule.resting") : formatMinutes(sinceRest)}</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.schedule.nextRest")}</span>
            <span className="kv__value">{untilRest === 0 ? t("sections.schedule.now") : t("sections.schedule.inTime", { time: formatMinutes(untilRest) })}</span>
            {restBlock && (
              <span className="kv__sub">
                {formatMinuteOfDay(restBlock.start)}–{formatMinuteOfDay(restBlock.end)}
              </span>
            )}
          </div>
        </div>
      </article>

      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>
              <BedDouble size={16} aria-hidden /> {t("sections.schedule.sleepTitle")} <InfoTip metric="sleep" />
            </h3>
            <p className="panel__sub">{t("sections.schedule.sleepSub")}</p>
          </div>
          <OriginBadge origin="simulated" />
        </header>
        <div className="kv-grid kv-grid--2">
          <div>
            <span className="kv__label">{t("sections.schedule.sleepActigraphy")}</span>
            <span className="kv__value kv__value--lg">{fmtNum(sleep.actigraphyHours, 1)} h</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.schedule.sleepPerceived")}</span>
            <span className="kv__value kv__value--lg">{fmtNum(sleep.perceivedHours, 1)} h</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.schedule.avg7")}</span>
            <span className="kv__value">{fmtNum(sleep.avg7d, 1)} h</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.schedule.regularity")}</span>
            <span className="kv__value">{sleep.regularity} %</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.schedule.qualityPerceived")}</span>
            <span className="kv__value">{sleep.quality} / 5</span>
            <span className="kv__sub">{t("sections.schedule.illustrative")}</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.schedule.fatigue")}</span>
            <span className="kv__value">{fatigue} / 5</span>
            <span className="kv__sub">{t("sections.schedule.scenarioValue")}</span>
          </div>
        </div>
      </article>
    </div>
  );
}
