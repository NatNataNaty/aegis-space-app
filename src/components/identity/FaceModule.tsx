import { CircleCheck, CircleX, KeyRound, LockKeyhole, Play, ScanFace, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CREW, crewById, useActiveCrew } from "../../data/crew";
import { ocularSession } from "../../features/camera/ocularSession";
import { useCameraStore } from "../../stores/camera.store";
import { useIdentityStore } from "../../features/identity/identity.store";
import { toMissionTime } from "../../features/mission/missionClock";
import { useVaultStore } from "../../features/protocols/eventLog";
import { fmtNum } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";
import { useMissionStore } from "../../stores/mission.store";
import { useVaultUi } from "../../stores/vaultUi.store";
import { CameraPanel } from "../camera/CameraPanel";

function IdentityBar() {
  const { t } = useTranslation();
  const { phase, progress, score, matchedId, enrolledIds, refresh, startAuto, stopAuto, reassign, forgetAll } = useIdentityStore();
  const camera = useCameraStore((s) => s.status);
  const vault = useVaultStore((s) => s.status);
  const [picking, setPicking] = useState(false);
  const matched = crewById(matchedId);

  // Con la cámara activa, el reconocimiento es automático; al apagarla se detiene.
  useEffect(() => {
    if (camera === "active") startAuto();
    else stopAuto();
  }, [camera, startAuto, stopAuto]);

  useEffect(() => {
    void refresh();
  }, [refresh, vault]);

  useEffect(() => {
    if (phase !== "matched" && phase !== "newcrew") setPicking(false);
  }, [phase]);

  return (
    <div className="identity">
      <div className="identity__status" role="status" aria-live="polite">
        {phase === "off" && <span className="muted">{t("face.auto.off")}</span>}
        {phase === "watching" && (
          <span className="identity__watch">
            <ScanFace size={18} aria-hidden /> {t("face.auto.watching")}
          </span>
        )}
        {phase === "identifying" && (
          <span className="identity__progress">
            {t("face.auto.identifying")}
            <span className="identity__bar" aria-hidden>
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          </span>
        )}
        {phase === "matched" && matched && (
          <span className="identity__ok">
            <CircleCheck size={18} aria-hidden /> {t("face.auto.matched", { name: matched.name })}
            {score !== null && score < 1 && <small> · {t("face.score", { value: Math.round(score * 100) })}</small>}
          </span>
        )}
        {phase === "newcrew" && matched && (
          <span className="identity__ok">
            <UserPlus size={18} aria-hidden /> {t("face.auto.newcrew", { name: matched.name })}
          </span>
        )}
        {phase === "unknown" && (
          <span className="identity__bad">
            <CircleX size={18} aria-hidden /> {t("face.auto.unknown")}
          </span>
        )}
      </div>

      <div className="identity__actions">
        {camera !== "active" && (
          <button type="button" className="dbtn dbtn--primary" onClick={() => void ocularSession.start()}>
            <Play size={16} aria-hidden /> {t("face.auto.start")}
          </button>
        )}
        {(phase === "matched" || phase === "newcrew") && (
          <button type="button" className="dbtn" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
            <Users size={16} aria-hidden /> {t("face.auto.notYou")}
          </button>
        )}
        {enrolledIds.length > 0 && (
          <button type="button" className="dbtn" onClick={() => void forgetAll()}>
            {t("face.auto.forget", { count: enrolledIds.length })}
          </button>
        )}
      </div>

      {picking && (
        <div className="identity__pick" role="group" aria-label={t("face.auto.pick")}>
          <span className="muted small">{t("face.auto.pick")}</span>
          {CREW.filter((c) => c.id !== matchedId).map((c) => (
            <button key={c.id} type="button" className="crew-chip" onClick={() => void reassign(c.id).then(() => setPicking(false))}>
              <span className="crew-chip__av" aria-hidden>
                {c.initials}
              </span>
              <span>
                {c.name}
                <small>{t(`crew.role.${c.role}`)}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="identity__note">
        {t("face.privacy")} {vault === "unlocked" ? t("face.auto.storedEncrypted") : t("face.auto.storedMemory")}
      </p>
    </div>
  );
}

/** El perfil se abre al reconocer el rostro o con el registro desbloqueado por PIN. */
export function profileUnlocked(vault: string, phase: string): boolean {
  return vault === "unlocked" || phase === "matched" || phase === "newcrew";
}

function ProfileCard() {
  const { t } = useTranslation();
  const lastMatchAt = useIdentityStore((s) => s.lastMatchAt);
  const phase = useIdentityStore((s) => s.phase);
  const camera = useCameraStore((s) => s.status);
  const vault = useVaultStore((s) => s.status);
  const openPin = useVaultUi((s) => s.setOpen);
  const missionMs = useMissionStore((s) => s.missionMs);
  const mt = toMissionTime(missionMs);
  const p = useActiveCrew();
  const buddy = crewById(p.buddyId);
  const unlocked = profileUnlocked(vault, phase);
  const byFace = phase === "matched" || phase === "newcrew";
  const rows: [string, string][] = [
    [t("face.profile.id"), p.id],
    [t("face.profile.age"), t("face.profile.ageValue", { n: p.age })],
    [t("face.profile.mission"), `ARES-01 · ${t("mission.name")}`],
    [t("face.profile.day"), String(mt.day)],
    [t("face.profile.body"), `${fmtNum(p.heightM, 2)} m · ${p.weightKg} kg`],
    [t("face.profile.blood"), p.bloodType],
    [t("face.profile.buddy"), buddy ? `${buddy.name}` : "—"],
    [t("face.profile.last"), lastMatchAt && byFace ? t("face.profile.lastNow") : t("face.profile.lastNever")],
  ];
  return (
    <article className={`card profile${unlocked ? " profile--open" : " profile--locked"}`} key={unlocked ? p.id : "locked"}>
      <header className="profile__head">
        <span className="profile__avatar" aria-hidden>
          {unlocked ? p.initials : <LockKeyhole size={26} />}
        </span>
        <span>
          <span className="profile__name">{unlocked ? p.name : t("face.profile.lockedTitle")}</span>
          <span className="profile__role">{unlocked ? t(`crew.role.${p.role}`) : t("face.profile.lockedRole")}</span>
        </span>
      </header>
      {unlocked ? (
        <>
          <p className="profile__opened">
            <ShieldCheck size={16} aria-hidden /> {byFace ? t("face.profile.byFace") : t("face.profile.byPin")}
          </p>
          <dl className="profile__grid">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="profile__lock">
          <p>{t("face.profile.lockedText")}</p>
          <div className="profile__actions">
            {camera !== "active" && (
              <button type="button" className="dbtn dbtn--primary" onClick={() => void ocularSession.start()}>
                <ScanFace size={16} aria-hidden /> {t("face.profile.useFace")}
              </button>
            )}
            {vault !== "unsupported" && (
              <button type="button" className="dbtn" onClick={() => openPin(true)}>
                <KeyRound size={16} aria-hidden /> {vault === "new" ? t("face.profile.createPin") : t("face.profile.usePin")}
              </button>
            )}
          </div>
        </div>
      )}
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
