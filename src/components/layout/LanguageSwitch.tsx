import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage, type Lang } from "../../i18n";
import { cx } from "../../lib/format";

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current = i18n.language as Lang;

  return (
    <div className="lang-switch" role="group" aria-label={t("topbar.language")}>
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          className={cx("lang-switch__btn", current === lng && "lang-switch__btn--on")}
          aria-pressed={current === lng}
          onClick={() => setLanguage(lng)}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
