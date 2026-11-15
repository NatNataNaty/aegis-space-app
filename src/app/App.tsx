import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertBanner } from "../components/alerts/AlertBanner";
import { CameraPanel } from "../components/camera/CameraPanel";
import { MarsHero, useHeroMood } from "../components/dashboard/MarsHero";
import { OcularCard } from "../components/dashboard/OcularCard";
import { PriorityMetrics } from "../components/dashboard/PriorityMetrics";
import { AlertsSection } from "../components/dashboard/sections/AlertsSection";
import { ExposureSection } from "../components/dashboard/sections/ExposureSection";
import { EyeSection } from "../components/dashboard/sections/EyeSection";
import { GuideSection } from "../components/dashboard/sections/GuideSection";
import { LibrarySection } from "../components/dashboard/sections/LibrarySection";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { ScheduleSection } from "../components/dashboard/sections/ScheduleSection";
import { SelfCheckSection } from "../components/dashboard/sections/SelfCheckSection";
import { TrendsSection } from "../components/dashboard/sections/TrendsSection";
import { AboutDataDialog } from "../components/layout/AboutDataDialog";
import { ModuleRail, type ModuleId } from "../components/layout/ModuleRail";
import { TopBar } from "../components/layout/TopBar";
import { StepsPanel } from "../components/protocols/StepsPanel";

export function App() {
  const { t } = useTranslation();
  const mood = useHeroMood();
  const [module, setModule] = useState<ModuleId>("vitals");
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className={`shell shell--${mood}`}>
      <ModuleRail current={module} onChange={setModule} />

      <div className="shell__main">
        <TopBar onOpenAbout={() => setAboutOpen(true)} onOpenAlerts={() => setModule("alerts")} />

        {module === "vitals" && (
          <ErrorBoundary name="vitals">
            <div className="module module--vitals" key="vitals">
              <div className="vitals-stage">
                <MarsHero />
                <StepsPanel mood={mood} onLogSymptom={() => setModule("log")} />
              </div>
              <AlertBanner onOpen={() => setModule("alerts")} />
              <PriorityMetrics />
            </div>
          </ErrorBoundary>
        )}

        {/* La cámara se monta una sola vez y solo se oculta: el vídeo y el modelo no se reinician al cambiar de módulo. */}
        <div className="module module--eye" hidden={module !== "eye"}>
          <ErrorBoundary name="eye">
            <div className="eye-stage">
              <CameraPanel />
              <OcularCard />
            </div>
            {module === "eye" && <EyeSection />}
          </ErrorBoundary>
        </div>

        {module === "log" && (
          <ErrorBoundary name="log">
            <div className="module" key="log">
              <SelfCheckSection />
            </div>
          </ErrorBoundary>
        )}
        {module === "alerts" && (
          <ErrorBoundary name="alerts">
            <div className="module" key="alerts">
              <AlertsSection />
            </div>
          </ErrorBoundary>
        )}
        {module === "hazards" && (
          <ErrorBoundary name="hazards">
            <div className="module" key="hazards">
              <LibrarySection />
              <GuideSection />
            </div>
          </ErrorBoundary>
        )}
        {module === "radiation" && (
          <ErrorBoundary name="radiation">
            <div className="module" key="radiation">
              <ExposureSection />
            </div>
          </ErrorBoundary>
        )}
        {module === "sleep" && (
          <ErrorBoundary name="sleep">
            <div className="module" key="sleep">
              <ScheduleSection />
              <TrendsSection />
            </div>
          </ErrorBoundary>
        )}

        <footer className="footer">{t("app.footer")}</footer>
      </div>

      <AboutDataDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
