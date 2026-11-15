import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { createPin, initVault, lockVault, resetVault, unlockWithPin, useVaultStore } from "../../features/protocols/eventLog";
import { PIN_PATTERN } from "../../lib/db/vaultCrypto";
import { useVaultUi } from "../../stores/vaultUi.store";
import { useBuddyStore } from "../../stores/buddy.store";

/**
 * Aviso + pantalla de desbloqueo del registro cifrado.
 * No bloquea la app: emergencia y «¿Necesitas ayuda?» funcionan aunque el registro esté cerrado.
 */
export function VaultLock() {
  const { t } = useTranslation();
  const status = useVaultStore((s) => s.status);
  const pending = useVaultStore((s) => s.pending);
  const open = useVaultUi((s) => s.open);
  const setOpen = useVaultUi((s) => s.setOpen);
  // Si salta «¿Necesitas ayuda?» o llega un aviso del compañero, el PIN se aparta: la emergencia manda.
  const helpActive = useBuddyStore((s) => s.prompt !== null || s.incoming.length > 0);

  useEffect(() => {
    void initVault();
  }, []);

  useEffect(() => {
    if (helpActive) setOpen(false);
  }, [helpActive]);

  if (status === "checking" || status === "unsupported") return null;

  if (status === "unlocked") {
    return (
      <div className="vault-bar vault-bar--open" role="status">
        <ShieldCheck size={16} aria-hidden />
        <span>{t("vault.bar.unlocked")}</span>
        <button type="button" className="vault-bar__btn" onClick={lockVault}>
          {t("vault.lock")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="vault-bar" role="status">
        <LockKeyhole size={16} aria-hidden />
        <span>
          {status === "new" ? t("vault.bar.new") : t("vault.bar.locked")}
          {pending > 0 && ` ${t("vault.bar.pending", { count: pending })}`}
        </span>
        <button type="button" className="vault-bar__btn" onClick={() => setOpen(true)}>
          {status === "new" ? t("vault.create") : t("vault.unlock")}
        </button>
      </div>
      {open && <VaultDialog mode={status} onClose={() => setOpen(false)} />}
    </>
  );
}

function VaultDialog({ mode, onClose }: { mode: "new" | "locked"; onClose: () => void }) {
  const { t } = useTranslation();
  const busy = useVaultStore((s) => s.busy);
  const error = useVaultStore((s) => s.error);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetAsk, setResetAsk] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const errId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!PIN_PATTERN.test(pin)) return setLocalError(t("vault.err.format"));
    if (mode === "new" && pin !== confirm) return setLocalError(t("vault.err.mismatch"));
    const ok = mode === "new" ? await createPin(pin) : await unlockWithPin(pin);
    setPin("");
    setConfirm("");
    if (ok) onClose();
  };

  const shownError =
    localError ??
    (error === "wrong_pin" ? t("vault.err.wrong") : error === "invalid_pin" ? t("vault.err.format") : error ? t("vault.err.failed") : null);

  return (
    <dialog ref={ref} className="vault" aria-labelledby={titleId} onCancel={onClose}>
      <form className="vault__card" onSubmit={submit}>
        <LockKeyhole size={28} aria-hidden className="vault__icon" />
        <h2 id={titleId} className="vault__title">
          {mode === "new" ? t("vault.title.new") : t("vault.title.locked")}
        </h2>
        <p className="vault__lead">{mode === "new" ? t("vault.lead.new") : t("vault.lead.locked")}</p>

        <label className="vault__field">
          {t("vault.pin")}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            aria-invalid={!!shownError}
            aria-describedby={shownError ? errId : undefined}
            autoFocus
          />
        </label>
        {mode === "new" && (
          <label className="vault__field">
            {t("vault.confirm")}
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        )}

        {shownError && (
          <p id={errId} className="vault__error" role="alert">
            {shownError}
          </p>
        )}

        <button type="submit" className="mbtn mbtn--amber" disabled={busy}>
          {busy ? t("vault.working") : mode === "new" ? t("vault.create") : t("vault.unlock")}
        </button>
        <div className="vault__row">
          <button type="button" className="mbtn mbtn--ghost" onClick={onClose}>
            {t("vault.later")}
          </button>
          <Link to="/emergencia" className="mbtn mbtn--ghost vault__emergency" onClick={onClose}>
            {t("nav.emergency")}
          </Link>
        </div>

        <p className="vault__note">{t("vault.note")}</p>

        {mode === "locked" &&
          (resetAsk ? (
            <div className="vault__reset" role="group" aria-label={t("vault.reset.title")}>
              <p>{t("vault.reset.warning")}</p>
              <button
                type="button"
                className="mbtn mbtn--ghost"
                onClick={async () => {
                  await resetVault();
                  onClose();
                }}
              >
                {t("vault.reset.confirm")}
              </button>
            </div>
          ) : (
            <button type="button" className="vault__link" onClick={() => setResetAsk(true)}>
              {t("vault.reset.title")}
            </button>
          ))}
      </form>
    </dialog>
  );
}
