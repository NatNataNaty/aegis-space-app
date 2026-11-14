import { useState } from "react";
import { AlertBanner } from "../components/alerts/AlertBanner";
import { CameraPanel } from "../components/camera/CameraPanel";
import { OcularCard } from "../components/dashboard/OcularCard";
import { PriorityMetrics } from "../components/dashboard/PriorityMetrics";
import { SectionTabs, type TabId } from "../components/dashboard/SectionTabs";
import { AboutDataDialog } from "../components/layout/AboutDataDialog";
import { TopBar } from "../components/layout/TopBar";
import { useAppEngine } from "../hooks/useAppEngine";
import { useCameraStore } from "../stores/camera.store";

export function App() {
  useAppEngine();
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

      <footer className="footer">
        aegis-space-med · Prototipo educativo NASA Space Apps 2026. No es un dispositivo médico. Los datos marcados como
        SIMULADO no representan lecturas reales.
      </footer>

      <AboutDataDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
