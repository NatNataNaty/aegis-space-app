import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TriageLight } from "../components/alerts/TriageLight";
import { AssistantPage } from "../components/assistant/AssistantPage";
import { CameraPanel } from "../components/camera/CameraPanel";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { BodyNow } from "../components/dashboard/BodyNow";
import { MarsHero, useHeroMood } from "../components/dashboard/MarsHero";
import { QuickActions } from "../components/dashboard/QuickActions";
import { AlertsSection } from "../components/dashboard/sections/AlertsSection";
import { ExposureSection } from "../components/dashboard/sections/ExposureSection";
import { EyeSection } from "../components/dashboard/sections/EyeSection";
import { GuideSection } from "../components/dashboard/sections/GuideSection";
import { LibrarySection } from "../components/dashboard/sections/LibrarySection";
import { ScheduleSection } from "../components/dashboard/sections/ScheduleSection";
import { SelfCheckSection } from "../components/dashboard/sections/SelfCheckSection";
import { TrendsSection } from "../components/dashboard/sections/TrendsSection";
import { FaceModule } from "../components/identity/FaceModule";
import { AboutDataDialog } from "../components/layout/AboutDataDialog";
import { HowItWorks } from "../components/layout/HowItWorks";
import { ModuleRail, type ModuleId } from "../components/layout/ModuleRail";
import { TopBar } from "../components/layout/TopBar";
import { StepsPanel } from "../components/protocols/StepsPanel";

export function App() {
  const { t } = useTranslation();
  const mood = useHeroMood();
  const [module, setModule] = useState<ModuleId>("vitals");
  const [aboutOpen, setAboutOpen] = useState(false);

  const go = (m: ModuleId) => {
    setModule(m);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`shell shell--${mood}`}>
      <ModuleRail current={module} onChange={go} />

      <div className="shell__main">
        <TopBar onOpenAssistant={() => go("assistant")} />

        {module === "vitals" && (
          <ErrorBoundary name="vitals">
            <div className="module module--vitals" key="vitals">
              <div className="vitals-stage">
                <MarsHero />
                <StepsPanel mood={mood} onLogSymptom={() => go("log")} />
              </div>
              <TriageLight onOpenAlerts={() => go("alerts")} />
              <BodyNow />
              <QuickActions onGo={go} />
            </div>
          </ErrorBoundary>
        )}

        {/* La cámara se monta una sola vez y solo se oculta: el vídeo y el modelo no se reinician al cambiar de módulo. */}
        <div className="module module--face" hidden={module !== "face"}>
          <ErrorBoundary name="face">
            <FaceModule camera={<CameraPanel />} />
            {module === "face" && <EyeSection />}
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
        {module === "assistant" && (
          <ErrorBoundary name="assistant">
            <div className="module" key="assistant">
              <AssistantPage onGo={go} />
            </div>
          </ErrorBoundary>
        )}
        {module === "how" && (
          <ErrorBoundary name="how">
            <div className="module" key="how">
              <HowItWorks />
            </div>
          </ErrorBoundary>
        )}

        <footer className="footer">
          {t("app.footer")}
          <button type="button" className="footer__link" onClick={() => setAboutOpen(true)}>
            {t("topbar.aboutData")}
          </button>
        </footer>
      </div>

      <AboutDataDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
