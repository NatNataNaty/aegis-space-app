import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { recentReports } from "../../features/link/earthReports";
import { getOutboxStats, type OutboxItem } from "../../features/link/outboxService";
import { fetchMissionOverview, type MissionOverview } from "../../features/link/syncService";
import { readEvents, type LoggedEvent } from "../../features/protocols/eventLog";
import { DELAY_MS, useLinkStore, type DelayMode } from "../../stores/linkStore";
import { PageShell } from "../layout/PageShell";

type Stats = Awaited<ReturnType<typeof getOutboxStats>>;

/**
 * Centro de control: qué espera en la bandeja de salida, qué se ha registrado a bordo y el
 * estado del enlace. Sin enlace no se inventan cifras de la Tierra: se dice que no hay datos.
 */
export function ControlPage() {
  const { t, i18n } = useTranslation();
  const delayMode = useLinkStore((s) => s.delayMode);
  const setDelayMode = useLinkStore((s) => s.setDelayMode);
  const isLinkActive = useLinkStore((s) => s.isLinkActive);
  const setLinkActive = useLinkStore((s) => s.setLinkActive);
  const [stats, setStats] = useState<Stats | null>(null);
  const [overview, setOverview] = useState<MissionOverview | null>(null);
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [reports, setReports] = useState<OutboxItem[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [s, o, e, r] = await Promise.all([
        getOutboxStats().catch(() => null),
        fetchMissionOverview().catch(() => null),
        readEvents(30).catch(() => []),
        recentReports(12).catch(() => []),
      ]);
      if (!alive) return;
      setReports(r);
      setStats(s);
      setOverview(o);
      setEvents(e);
    };
    void load();
    const id = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const earthValue = (v: number | null | undefined) => (v === null || v === undefined ? t("control.noEarthData") : String(v));
  const time = (ms: number) => new Date(ms).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <PageShell title={t("pages.control.title")}>
      <div className="control">
        <section className="panel" aria-labelledby="link-title">
          <h2 id="link-title">{t("control.link")}</h2>
          <p className="muted">{t("control.linkSub")}</p>
          <dl className="kv-grid">
            <div>
              <dt className="kv__label">{t("control.network")}</dt>
              <dd className="kv__value">{overview?.isOnline ? t("control.online") : t("control.offline")}</dd>
            </div>
            <div>
              <dt className="kv__label">{t("control.supabase")}</dt>
              <dd className="kv__value">{overview?.isConfigured ? t("control.configured") : t("control.notConfigured")}</dd>
            </div>
            <div>
              <dt className="kv__label">{t("control.pending")}</dt>
              <dd className="kv__value">{stats ? stats.pending + stats.failed : "—"}</dd>
            </div>
            <div>
              <dt className="kv__label">{t("control.synced")}</dt>
              <dd className="kv__value">{stats ? stats.synced : "—"}</dd>
            </div>
          </dl>
          <div className="control__row">
            <label className="toggle">
              <input type="checkbox" checked={isLinkActive} onChange={(e) => setLinkActive(e.target.checked)} />
              {t("control.linkActive")}
            </label>
            <div className="seg" role="radiogroup" aria-label={t("control.delay")}>
              {(Object.keys(DELAY_MS) as DelayMode[]).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={delayMode === m} className={`seg__btn${delayMode === m ? " seg__btn--on" : ""}`} onClick={() => setDelayMode(m)}>
                  {t(`control.delayMode.${m}`)}
                </button>
              ))}
            </div>
          </div>
          <p className="muted">{t("control.delayNote")}</p>
        </section>

        <section className="panel" aria-labelledby="reports-title">
          <h2 id="reports-title">{t("control.reports")}</h2>
          <p className="muted">{t("control.reportsSub")}</p>
          {reports.length === 0 ? (
            <p className="empty">{t("control.noReports")}</p>
          ) : (
            <ul className="history reports">
              {reports.map((r) => {
                const raw = (r.payload.raw_data ?? {}) as Record<string, unknown>;
                const kind = r.target_table === "crew_telemetry" ? String(raw.kind ?? "minute_summary") : r.target_table;
                return (
                  <li key={r.id}>
                    <div>
                      <span className="history__title">
                        {t(`control.reportKind.${kind}`, { defaultValue: kind })} · {String(r.payload.crew_id ?? "—")}
                      </span>
                      <span className="history__meta">
                        {time(Date.parse(r.created_at))}
                        {typeof r.payload.heart_rate === "number" ? ` · ${r.payload.heart_rate} lpm · SpO₂ ${String(r.payload.spo2)} %` : ""}
                      </span>
                    </div>
                    <span className={`report-status report-status--${r.status}`}>{t(`control.reportStatus.${r.status}`)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="muted">{t("control.neverSent")}</p>
        </section>

        <section className="panel" aria-labelledby="earth-title">
          <h2 id="earth-title">{t("control.earth")}</h2>
          <dl className="kv-grid">
            <div>
              <dt className="kv__label">{t("control.telemetry")}</dt>
              <dd className="kv__value">{earthValue(overview?.telemetryCount)}</dd>
            </div>
            <div>
              <dt className="kv__label">{t("control.alerts")}</dt>
              <dd className="kv__value">{earthValue(overview?.alertsCount)}</dd>
            </div>
            <div>
              <dt className="kv__label">{t("control.protocols")}</dt>
              <dd className="kv__value">{earthValue(overview?.protocolsCount)}</dd>
            </div>
          </dl>
          <h3 className="subhead">{t("control.notes")}</h3>
          <ul className="history">
            {(overview?.recentNotes ?? []).map((n) => (
              <li key={n.id ?? n.created_at}>
                <div>
                  <span className="history__title">{n.title}</span>
                  <span className="history__meta">
                    {n.author_role} · {n.note}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel control__log" aria-labelledby="log-title">
          <h2 id="log-title">{t("control.log")}</h2>
          <p className="muted">{t("control.logSub")}</p>
          {events.length === 0 ? (
            <p className="empty">{t("control.noEvents")}</p>
          ) : (
            <ul className="history">
              {events.map((e, i) => (
                <li key={`${e.kind}-${e.at}-${i}`}>
                  <div>
                    <span className="history__title">{t(`control.event.${e.kind}`)}</span>
                    <span className="history__meta">
                      {time(e.at)}
                      {typeof e.data.protocol_id === "string" ? ` · ${e.data.protocol_id}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
