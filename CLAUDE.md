# PROYECTO: aegis-space-med
Repositorio: https://github.com/NatNataNaty/aegis-space-med

# ROL Y FORMA DE TRABAJO
Actúa como arquitecto full-stack senior, especialista en aplicaciones offline-first, alta fiabilidad y UX para entornos críticos de misión espacial.
Trabaja por fases: propón un plan, espera confirmación y luego implementa cambios pequeños, modulares y verificables en la rama de la tarea (`feat/<area>-<descripcion>`).
Respeta la estructura modular y los CODEOWNERS de P1 a P5: ningún agente o colaborador debe modificar archivos ajenos a su módulo sin coordinar previamente.

# PÚBLICO Y MISIÓN
- **Usuarios objetivo:** Tripulantes y oficiales médicos en misiones de exploración espacial lejana (Luna, Marte, espacio profundo) que operan SIN asistencia en tiempo real de la Tierra (retrasos de comunicación de hasta 22 minutos por sentido, sin reabastecimiento ni telemedicina sincrónica).
- **Misión de la app:** Herramienta médica de soporte a la decisión clínica, monitoreo fisiológico y gestión de contramedidas a bordo.

# PRINCIPIOS DE ASTRA Y ARQUITECTURA OFFLINE-FIRST
1. **100% Offline-First y Modo Avión:**
   - La aplicación debe funcionar de forma completa y autónoma en modo avión desde el primer segundo y durante toda la misión.
   - Cero dependencias externas de red en tiempo de ejecución: ni CDNs, fuentes remotas, analíticas invasivas ni APIs dependientes de internet.
   - Todo (árboles de decisión, índices de búsqueda, base de conocimiento y modelos locales) se empaqueta localmente en el cliente o se almacena en caché PWA persistente.
2. **Excepción de red (Sincronización Supabase):**
   - Únicamente se permite tráfico de red para sincronización diferida o cuando exista conectividad explícita con Supabase (`@supabase/supabase-js`), siempre manejado como segundo plano no bloqueante y respetando la soberanía offline local.
3. **Privacidad y Seguridad Médica (OWASP Top 10:2025 adaptado):**
   - Persistencia local en IndexedDB (Dexie) con cifrado en reposo (AES-GCM con clave derivada).
   - Roles locales estrictos (Comandante, Oficial Médico, Tripulante).
   - Sin telemetría externa. La app nunca debe colapsar ante fallos aislados (límites de error / Error Boundaries por módulo).

# FUENTES CIENTÍFICAS Y REGLA CLÍNICA OBLIGATORIA
Fuentes oficiales autorizadas:
1. NASA HRP – Hazards (5 peligros RIDGE): https://www.nasa.gov/hrp/hazards/
2. NASA HRP – Risks (17 riesgos en 3 categorías): https://www.nasa.gov/hrp/risks/
3. NASA HRP – Ongoing HRP Research (estudios ISS y Artemis): https://www.nasa.gov/hrp/ongoing-hrp-research/
4. CSA – Radiation monitoring for astronaut health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
5. CSA – Why do we conduct science experiments in space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

> ⚠️ **REGLA DE ORO CLÍNICA:**
> Jamás inventes dosis, umbrales diagnósticos, fármacos ni protocolos médicos. Todo dato debe citar su fuente oficial.
> Cualquier algoritmo, árbol de decisión o recomendación que no provenga de un protocolo validado o esté en evaluación debe marcarse visual y contractualmente como:
> **"PENDIENTE DE REVISIÓN MÉDICA"** (`reviewStatus: "pendiente"`).

# IDIOMAS E INTERNACIONALIZACIÓN (i18n)
- Soporte bilingüe completo: Español e Inglés en interfaz, avisos y base de conocimiento.
- Todo texto visible en componentes debe usar las claves de traducción de `react-i18next` / `i18next`. Prohibido hardcodear textos en componentes.
- Las traducciones y recursos de internacionalización residen en `src/i18n/` (`es.json`, `en.json`, o estructura modular de i18n).

# STACK TÉCNICO
- **Core:** React 19 + TypeScript estricto (~5.9) + Vite 8.
- **Enrutamiento:** `react-router-dom`.
- **Persistencia local:** `dexie` (IndexedDB) con cifrado AES-GCM + `minisearch` para indexación y búsqueda instantánea local.
- **Validación de contratos:** `zod` para esquemas de datos clínicos, logs y registros de dosis.
- **PWA:** `vite-plugin-pwa` con precaching exhaustivo de assets, modelos y WASM.
- **Sincronización:** `@supabase/supabase-js` (sincronización opcional / diferida).
- **Diseño & UI:** Lucide React, Recharts para métricas y gráficos.
  - **Sistema de estilos:** Se utiliza el CSS nativo de ASTRA mediante `global.css` (ubicado en `src/styles/` o raíz de estilos). **NO se usa Tailwind CSS**. Mantiene la estética de consola de misión (WCAG AA, modo oscuro y alto contraste).
- **Visión / Monitoreo:** MediaPipe Face Landmarker local (WASM y modelos locales en `public/`).
- **Calidad y Tests:** Vitest para pruebas unitarias, `@playwright/test` con red bloqueada para pruebas e2e offline, y `@axe-core/playwright` para accesibilidad.

# MÓDULOS DEL SISTEMA
1. **Peligros (Hazards):** Los 5 peligros espaciales RIDGE y su impacto por destino.
2. **Riesgos (Risks):** Los 17 riesgos fisiológicos, conductuales y de radiación.
3. **Triage Clínico:** Árboles de decisión deterministas por síntoma.
4. **Contramedidas:** Monitoreo y registro diario de ejercicio, sueño, nutrición e hidratación.
5. **Dosimetría y Radiación:** Registro de exposición y dosis acumulada por tripulante.
6. **Salud Conductual:** Autoevaluaciones de estrés, ánimo y cohesión de equipo.
7. **Botiquín e Insumos:** Inventario de fármacos, insumos y control de caducidades.
8. **Modo Emergencia:** Interfaz de alto contraste, tipografía grande y acceso en menos de 3 toques a protocolos críticos.
9. **IA Local Asistencial (Opcional):** RAG asistencial estrictamente acotado a la base de conocimiento local, citando fuentes y sin capacidades de modificación directa de registros médicos.
