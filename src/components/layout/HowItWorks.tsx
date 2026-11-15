import {
  Activity,
  Bell,
  BookOpen,
  ClipboardList,
  Globe,
  Inbox,
  LockKeyhole,
  ScanFace,
  Sun,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const COLUMNS: { id: string; items: { id: string; Icon: LucideIcon; tag?: "live" | "self" }[] }[] = [
  {
    id: "inputs",
    items: [
      { id: "camera", Icon: ScanFace, tag: "live" },
      { id: "vitals", Icon: Activity },
      { id: "feel", Icon: ClipboardList, tag: "self" },
    ],
  },
  { id: "detect", items: [{ id: "engine", Icon: Bell }] },
  {
    id: "respond",
    items: [
      { id: "help", Icon: TriangleAlert },
      { id: "buddy", Icon: Users },
      { id: "protocol", Icon: BookOpen },
    ],
  },
  {
    id: "record",
    items: [
      { id: "vault", Icon: LockKeyhole },
      { id: "outbox", Icon: Inbox },
      { id: "control", Icon: Globe },
    ],
  },
];

const MENU: { id: string; Icon: LucideIcon }[] = [
  { id: "watch", Icon: Activity },
  { id: "guide", Icon: Bell },
  { id: "mission", Icon: Sun },
];

/** «Cómo funciona aegis»: el mapa del sistema en cuatro pasos (pantalla del diseño). */
export function HowItWorks() {
  const { t } = useTranslation();
  return (
    <div className="how">
      <header className="how__head">
        <h1>{t("how.title")}</h1>
        <p>{t("how.lead")}</p>
      </header>
      <ol className="how__cols">
        {COLUMNS.map((col, i) => (
          <li key={col.id} className="how__col">
            <span className="how__num" aria-hidden>
              {i + 1}
            </span>
            <h2>{t(`how.${col.id}.title`)}</h2>
            <p className="how__sub">{t(`how.${col.id}.sub`)}</p>
            {col.items.map(({ id, Icon, tag }) => (
              <div key={id} className="how__box">
                <span className="ico ico--sm" aria-hidden>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span>
                  <b>{t(`how.items.${id}.title`)}</b>
                  <span>{t(`how.items.${id}.text`)}</span>
                  {tag && (
                    <span className={tag === "live" ? "badge badge--camera_live" : "badge"}>
                      {tag === "live" ? t("origin.camera_live") : t("origin.user_reported")}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ol>
      <h2 className="how__menu-title">{t("how.menuTitle")}</h2>
      <div className="how__menu">
        {MENU.map(({ id, Icon }) => (
          <div key={id} className="how__box">
            <span className="ico ico--sm" aria-hidden>
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span>
              <b>{t(`modules.group.${id}`)}</b>
              <span>{t(`how.menu.${id}`)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
