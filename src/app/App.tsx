import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertBanner } from "../components/alerts/AlertBanner";
import { CameraPanel } from "../components/camera/CameraPanel";
import { OcularCard } from "../components/dashboard/OcularCard";
import { PriorityMetrics } from "../components/dashboard/PriorityMetrics";
import { SectionTabs, type TabId } from "../components/dashboard/SectionTabs";
import { AboutDataDialog } from "../components/layout/AboutDataDialog";
import { TopBar } from "../components/layout/TopBar";
import { useCameraStore } from "../stores/camera.store";

export function App() {
  const { t } = useTranslation();
  const view = useCameraStore((s) => s.view);
  const [tab, setTab] = useState<TabId>("eye");
  const [aboutOpen, setAboutOpen] = useState(false);

  const openAlerts = () => {
    setTab("alerts");
    document.getElementById("sections")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={`app app--${view}`}>
      <TopBar onOpenAbout={() => setAboutOpen(true)} onOpenAlerts={openAlerts} />

      <main className="main">
        <section className="hero">
          <CameraPanel />
          <div className="hero__metrics">
            {view !== "expanded" && <OcularCard />}
            <PriorityMetrics />
          </div>
        </section>

        <AlertBanner onOpen={openAlerts} />
        <SectionTabs tab={tab} onChange={setTab} />
      </main>

      <footer className="footer">{t("app.footer")}</footer>

      <AboutDataDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
