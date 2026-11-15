import { CircleCheck, CircleX, LockKeyhole, Play, ScanFace, Square, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CREW_PROFILE } from "../../data/crew";
import { useIdentityStore } from "../../features/identity/identity.store";
import { toMissionTime } from "../../features/mission/missionClock";
import { useVaultStore } from "../../features/protocols/eventLog";
import { fmtNum } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";
import { useMissionStore } from "../../stores/mission.store";
import { CameraPanel } from "../camera/CameraPanel";

function IdentityBar() {
  const { t } = useTranslation();
  const { phase, progress, score, enrolled, refresh, enroll, scan, stop, forget } = useIdentityStore();
  const vault = useVaultStore((s) => s.status);
  const busy = phase === "enrolling" || phase === "scanning";

  useEffect(() => {
    void refresh();
  }, [refresh, vault]);

  return (
    <div className="identity">
      <div className="identity__status" role="status" aria-live="polite">
        {phase === "matched" && (
          <span className="identity__ok">
            <CircleCheck size={18} aria-hidden /> {t("face.matched", { name: CREW_PROFILE.name })}
            {score !== null && score < 1 && <small> · {t("face.score", { value: Math.round(score * 100) })}</small>}
          </span>
        )}
        {phase === "nomatch" && (
          <span className="identity__bad">
            <CircleX size={18} aria-hidden /> {t("face.nomatch")}
          </span>
        )}
        {phase === "noface" && <span className="identity__bad">{t("face.noface")}</span>}
        {phase === "locked" && (
          <span className="identity__warn">
            <LockKeyhole size={16} aria-hidden /> {t("face.locked")}
          </span>
        )}
        {busy && (
          <span className="identity__progress">
            {phase === "enrolling" ? t("face.enrolling") : t("face.scanning")}
            <span className="identity__bar" aria-hidden>
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          </span>
        )}
        {phase === "idle" && <span className="muted">{enrolled ? t("face.readyScan") : t("face.readyEnroll")}</span>}
      </div>

      <div className="identity__actions">
        {busy ? (
          <button type="button" className="dbtn" onClick={stop}>
            <Square size={16} aria-hidden /> {t("face.stop")}
          </button>
        ) : enrolled ? (
          <button type="button" className="dbtn dbtn--primary" onClick={scan}>
            <Play size={16} aria-hidden /> {t("face.scan")}
          </button>
        ) : (
          <button type="button" className="dbtn dbtn--primary" onClick={enroll}>
            <UserPlus size={16} aria-hidden /> {t("face.enroll")}
          </button>
        )}
        {enrolled && !busy && (
          <>
            <button type="button" className="dbtn" onClick={enroll}>
              <ScanFace size={16} aria-hidden /> {t("face.reenroll")}
            </button>
            <button type="button" className="dbtn" onClick={() => void forget()}>
              {t("face.forget")}
            </button>
          </>
        )}
      </div>
      <p className="identity__note">{t("face.privacy")}</p>
    </div>
  );
}

function ProfileCard() {
  const { t } = useTranslation();
  const lastMatchAt = useIdentityStore((s) => s.lastMatchAt);
  const missionMs = useMissionStore((s) => s.missionMs);
  const mt = toMissionTime(missionMs);
  const p = CREW_PROFILE;
  const rows: [string, string][] = [
    [t("face.profile.id"), p.id],
    [t("face.profile.age"), t("face.profile.ageValue", { n: p.age })],
    [t("face.profile.mission"), `ARES-01 · ${t("mission.name")}`],
    [t("face.profile.day"), String(mt.day)],
    [t("face.profile.body"), `${fmtNum(p.heightM, 2)} m · ${p.weightKg} kg`],
    [t("face.profile.blood"), p.bloodType],
    [t("face.profile.buddy"), t("face.profile.buddyValue")],
    [t("face.profile.last"), lastMatchAt ? t("face.profile.lastNow") : t("face.profile.lastNever")],
  ];
  return (
    <article className="card profile">
      <header className="profile__head">
        <span className="profile__avatar" aria-hidden>
          {p.initials}
        </span>
        <span>
          <span className="profile__name">{p.name}</span>
          <span className="profile__role">{t("hero.crewName")}</span>
        </span>
      </header>
      <dl className="profile__grid">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="profile__note">{t("face.profile.fictional")}</p>
    </article>
  );
}

function TodayAndDays() {
  const { t } = useTranslation();
  const snap = useHealthStore((s) => s.snapshot);
  const report = useHealthStore((s) => s.selfReport);
  const missionMs = useMissionStore((s) => s.missionMs);
  const day = toMissionTime(missionMs).day;
  const v = snap.vitals;
  const tiles: [string, string, string][] = [
    [t("face.today.hr"), fmtNum(v.heartRate.value), t("face.today.bpm")],
    [t("face.today.spo2"), fmtNum(v.spo2.value), "%"],
    [t("face.today.bp"), `${fmtNum(v.bloodPressure.value)}/${fmtNum(v.bloodPressure.value2 ?? 0)}`, "mmHg"],
    [t("face.today.temp"), fmtNum(v.temperature.value, 1), "°C"],
    [t("face.today.sleep"), fmtNum(snap.sleep.lastNightHours, 1), "h"],
    [t("face.today.feel"), report ? `${report.fatigue}·${report.mood}·${report.stress}` : "—", report ? "/5" : ""],
  ];
  const last = snap.trend7d.slice(-3);
  return (
    <div className="face-row">
      <article className="card">
        <h2 className="card__title">{t("face.today.title", { day })}</h2>
        <div className="tiles">
          {tiles.map(([k, val, unit]) => (
            <div key={k} className="tile">
              <span className="tile__label">{k}</span>
              <span className="tile__value">
                {val}
                {unit && <em>{unit}</em>}
              </span>
            </div>
          ))}
        </div>
        <p className="muted small">{t("face.today.feelHint")}</p>
      </article>
      <article className="card">
        <h2 className="card__title">{t("face.days.title")}</h2>
        <table className="days">
          <thead>
            <tr>
              <th scope="col">{t("face.days.day")}</th>
              <th scope="col">{t("face.days.hr")}</th>
              <th scope="col">{t("face.days.sleep")}</th>
              <th scope="col">{t("face.days.exercise")}</th>
            </tr>
          </thead>
          <tbody>
            {last.map((d, i) => (
              <tr key={d.label}>
                <td>{i === last.length - 1 ? t("face.days.today", { day: day - (last.length - 1 - i) }) : t("mission.day", { day: day - (last.length - 1 - i) })}</td>
                <td>
                  {fmtNum(d.restingHr)} {t("face.today.bpm")}
                </td>
                <td>{fmtNum(d.sleepHours, 1)} h</td>
                <td>{fmtNum(d.exerciseMin)} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}

/**
 * Identificación facial: la cámara (montada una sola vez en App) + reconocimiento + ficha.
 * `camera` es el panel de cámara ya montado; aquí solo se coloca.
 */
export function FaceModule({ camera }: { camera?: React.ReactNode }) {
  return (
    <>
      <div className="face-grid">
        <div className="face-cam">
          {camera ?? <CameraPanel />}
          <IdentityBar />
        </div>
        <ProfileCard />
      </div>
      <TodayAndDays />
    </>
  );
}
