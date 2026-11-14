# Plan maestro: aegis-space-med

Nov 14, 2026 · @Natalia Diaz

## Resumen y decisiones clave

**aegis-space-med** es una app médica de apoyo a decisiones para astronautas que no pueden recibir ayuda de la Tierra. Funciona 100 % sin conexión, está en español e inglés y la construyen 5 personas en paralelo sobre [el repositorio de GitHub](https://github.com/NatNataNaty/aegis-space-med).

Qué cambia respecto a la versión anterior: el público ya no es educativo, sino la tripulación en vuelo. Por eso la app no depende de nada externo mientras se usa: ni APIs, ni IA en la nube, ni servidores.

| Decisión | Elección | Motivo |
| --- | --- | --- |
| Público | Tripulación en misión (Luna, Marte, espacio profundo) sin contacto con la Tierra | Requisito del equipo |
| Autonomía | Sin conexión: contenido, IA y datos viven en el dispositivo | La «distancia de la Tierra» es uno de los 5 peligros de NASA |
| Plataforma | Next.js en exportación estática + PWA instalable (Tauri, después de la entrega) | Un solo código para los portátiles de la nave y para tabletas |
| Idiomas | Español e inglés: interfaz y contenido completos en ambos | Requisito; tripulaciones internacionales |
| Datos de la tripulación | IndexedDB (Dexie) cifrada con AES-GCM | Privacidad médica sin servidor |
| IA a bordo | Modelo pequeño local (WebLLM o llama.cpp) + RAG sobre la base de conocimiento | Sin nube. Los árboles de decisión deterministas funcionan aunque la IA falle |
| Desarrollo | Claude Code (Claude Pro) por persona + `CLAUDE.md` compartido. AI Studio y Antigravity solo en desarrollo | Nada de eso viaja en la app |
| Seguridad | OWASP Top 10:2025 adaptado a una app local + OWASP Top 10 para LLM |  |
| Distribución | PWA instalada desde Vercel para la entrega de 26 h. Instalador firmado de Tauri en una versión posterior |  |
| Equipo | 5 roles, cada uno dueño de sus carpetas (CODEOWNERS), con contratos de datos fijados en la fase 1 | Trabajo simultáneo sin pisarse |

**Límite importante:** las páginas de NASA HRP son divulgativas, no protocolos clínicos. Todo procedimiento, umbral o dosis que muestre la app debe salir de una fuente clínica citada y pasar la revisión de alguien con formación médica. La app nunca inventa tratamientos.

## Revisión de los 5 recursos entregados

Los 5 enlaces son contenido narrativo, no datos: ninguno ofrece un dataset descargable ni una API. Hay que convertirlos en una base de conocimiento propia y completarla con APIs abiertas de NASA.

| Recurso | Qué aporta | Cómo usarlo en la app |
| --- | --- | --- |
| [NASA HRP – Hazards](https://www.nasa.gov/hrp/hazards/) | Los 5 peligros (siglas RIDGE en inglés): radiación, aislamiento y confinamiento, distancia de la Tierra, campos de gravedad y entornos cerrados u hostiles. Lista de YouTube de 5 videos de unos 3 min. Datos: Marte a unos 140 millones de millas de media, misión de unos 3 años frente a 3 días a la Luna, gravedad de 3/8 de la terrestre | Columna vertebral de la navegación: una ficha por peligro con su video incrustado |
| [NASA HRP – Risks](https://www.nasa.gov/hrp/risks/) | 17 riesgos en 3 categorías: fisiología humana (11), conducta y factores humanos (5), radiación (1, cáncer). Los efectos varían según el destino (órbita baja, Luna, Marte). No trae matriz de probabilidad × severidad | Explorador de riesgos filtrable por categoría, peligro y destino. Cada riesgo enlaza a su página de referencia en nasa.gov |
| [NASA HRP – Ongoing research](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Estudios de Artemis II (ARCHeR, Immune Biomarkers, Standard Measures) y de la ISS (B-Complex, CIPHER, Thigh Cuff, Zero T2, Venous Haemostasis, entre otros). Enlace al Human Research Roadmap | Sección «Cómo lo combatimos»: cada riesgo con los estudios y contramedidas que lo atacan |
| [CSA – Monitoreo de radiación (26-02-2026)](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Espectrómetro CANS: contrato de 5,5 M$ CAD a Bubble Technology Industries. Los neutrones son cerca del 30 % de la radiación en la ISS. Antecedentes: MOSFET, EVARM, Radi-N/Radi-N2 | Caso destacado dentro del peligro «radiación», junto a datos solares en vivo |
| [CSA – Por qué hacemos ciencia en el espacio](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Dos objetivos: preparar misiones a la Luna y Marte, y mejorar la salud en la Tierra. Unos 200 experimentos internacionales a bordo de la ISS en todo momento. Beneficios: equilibrio, osteoporosis, salud cardiovascular, diabetes tipo 2 | Sección «Beneficios en la Tierra» que conecta cada riesgo con una aplicación médica |

Vacíos que hay que cubrir:

- **Datos cuantitativos.** Se descargan en tierra, durante el build, y viajan dentro de la app: el histórico de eventos solares de NASA DONKI y los datos de radiación de la ISS de OSDR (RadLab). A bordo, las dosis se registran a mano o se importan del dosímetro.
- **Protocolos clínicos.** Las fuentes son divulgativas. Los árboles de triage necesitan fuentes clínicas citadas y revisión médica (etiqueta `revisión-médica`). Nunca se inventan.
- **Medios sin conexión.** Los videos de YouTube se sustituyen por archivos locales, solo si su licencia lo permite. Las imágenes de NASA suelen ser de dominio público y las de CSA tienen sus propias condiciones: hay que comprobar cada una.

## Prompt maestro mejorado

Guárdalo como `CLAUDE.md` en la raíz del repositorio. Así las 5 personas trabajan con las mismas reglas en Claude Code, y también sirve como primer mensaje en Antigravity.

```markdown
# PROYECTO: aegis-space-med
Repositorio: https://github.com/NatNataNaty/aegis-space-med

# ROL
Actúa como arquitecto full-stack senior, especialista en apps offline-first y en UX
para entornos críticos. Trabaja por fases: propón un plan, espera mi "OK" y luego
implementa cambios pequeños y verificables en la rama de la tarea.

# PÚBLICO Y MISIÓN
Usuarios: astronautas en misiones a la Luna, Marte o el espacio profundo SIN NINGUNA
posibilidad de ayuda desde la Tierra (sin comunicación, sin médicos en tierra,
sin reabastecimiento). La app es su apoyo médico y de salud a bordo.
Debe ser TOTAL Y COMPLETAMENTE INDEPENDIENTE DE LA TIERRA:
- Cero llamadas de red en tiempo de ejecución. Nada de CDN, fuentes remotas,
  analíticas, APIs ni IA en la nube.
- Todo (contenido, medios, índices de búsqueda, modelo de IA) se empaqueta en la app.
- Funciona en modo avión desde el primer arranque y durante años sin actualizarse.

# IDIOMAS
Español e inglés completos (interfaz Y contenido), con selector visible.
Ningún texto queda escrito a mano en los componentes: todo pasa por i18n.

# FUENTES (única verdad del contenido)
1. https://www.nasa.gov/hrp/hazards/  -> 5 peligros (RIDGE)
2. https://www.nasa.gov/hrp/risks/    -> 17 riesgos en 3 categorías
3. https://www.nasa.gov/hrp/ongoing-hrp-research/ -> contramedidas y estudios
4. https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
5. https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
Regla: no inventes datos, umbrales, dosis ni procedimientos. Cada dato lleva su fuente.
Lo clínico que no esté en las fuentes se marca "PENDIENTE DE REVISIÓN MÉDICA".

# MÓDULOS
1. Peligros: los 5 peligros y cómo afectan según el destino.
2. Riesgos: los 17 riesgos, con síntomas de alerta y contramedidas.
3. Triage: árboles de decisión por síntoma (deterministas, siempre disponibles).
4. Contramedidas diarias: registro de ejercicio, sueño, nutrición e hidratación.
5. Radiación: registro manual de dosis o importación de CSV del dosímetro, con
   acumulado por tripulante.
6. Salud conductual: autoevaluación de ánimo, aislamiento y trabajo en equipo.
7. Botiquín: inventario de insumos médicos a bordo y caducidades.
8. Modo emergencia: botones grandes, alto contraste, máximo 3 toques para llegar
   a un protocolo, usable con poca luz.
9. Asistente IA local (opcional): responde SOLO con la base de conocimiento, cita
   la fuente y dice "no lo sé" fuera de ella.

# STACK (no cambiar sin justificarlo)
Next.js (App Router, output: 'export') + TypeScript estricto + Tailwind + shadcn/ui.
PWA con Serwist (Tauri v2 después de la entrega). i18n con next-intl.
Contenido en /content como JSON bilingüe validado con Zod.
Datos de la tripulación en IndexedDB (Dexie) cifrada con Web Crypto (AES-GCM).
IA local: WebLLM (WebGPU) o llama.cpp en Tauri; búsqueda con MiniSearch.
Tests: Vitest + Playwright con la red desactivada.

# PLAZO: 26 HORAS
Prioriza el mínimo: módulos 1, 2, 3, 4 (sueño, ejercicio, ánimo), 5 (solo
registro manual) y 8. El 9 es un extra; el 6 y el 7 solo si sobra tiempo.
Prefiere la solución más simple que funcione sin red.

# DISEÑO
Skill ui-ux-pro-max: estética de "consola de misión", modo oscuro, contraste
WCAG AA o mejor, objetivos táctiles de 48 px o más, navegable con teclado.

# SEGURIDAD
OWASP Top 10:2025 adaptado a una app local: cifrado en reposo, roles
(comandante / oficial médico / tripulante), contenido firmado, sin telemetría,
errores que nunca bloquean la app. Para la IA: OWASP Top 10 para LLM.

# FORMA DE TRABAJAR (equipo de 5)
- Una rama por tarea: feat/<area>-<descripcion>. Pull request a main con 1 revisión.
- Respeta CODEOWNERS: no edites carpetas de otra persona sin avisar en la issue.
- Cada entrega trae: plan, código, tests, comandos para verificar y checklist.

# PRIMERA TAREA
Lee las 5 fuentes. Propón los esquemas Zod (Hazard, Risk, Study, EarthBenefit,
Protocol, LogEntry, DoseRecord, KitItem) con campos es/en, y la estructura de
carpetas. No escribas código hasta que yo apruebe.
```

## Stack: herramientas, APIs y frameworks

Todo lo que viaja en la app funciona sin red. Las APIs externas solo se usan en tierra, durante el desarrollo, para descargar y empaquetar datos.

| Capa | Herramienta | Para qué |
| --- | --- | --- |
| Framework | Next.js (App Router, `output: 'export'`) + React + TypeScript | Genera archivos estáticos que corren sin servidor |
| Sin conexión | Serwist (service worker para PWA) | Precarga todos los recursos; la app arranca en modo avión |
| Escritorio | Tauri v2 | Instalador ligero para Windows, Linux y macOS. Acceso a archivos para importar el CSV del dosímetro |
| UI | Tailwind CSS + shadcn/ui + lucide-react, con fuentes alojadas en la propia app | Nada se carga desde un CDN |
| Idiomas | next-intl (compatible con exportación estática) + campos `es`/`en` en cada registro | Español e inglés completos |
| Contenido | JSON en `/content` + Zod | Base de conocimiento validada en cada build |
| Datos de la tripulación | Dexie (IndexedDB) + Web Crypto AES-GCM | Registros cifrados con PIN; copia de seguridad cifrada exportable |
| Gráficos | Recharts | Tendencias de sueño, ejercicio y dosis acumulada |
| Búsqueda | MiniSearch | Búsqueda instantánea sin IA |
| IA local | WebLLM (WebGPU) en navegador o llama.cpp como proceso de Tauri; embeddings con transformers.js | Asistente RAG a bordo con un modelo cuantizado pequeño |
| Medios | Videos e imágenes de NASA descargados y empaquetados | YouTube no funciona sin red. Verificar la licencia de cada archivo |
| Datos en tierra (solo build) | NASA DONKI y OSDR | Histórico de eventos solares y de radiación empaquetado como referencia |
| Calidad | Vitest, Playwright (con la red bloqueada), axe-core, Lighthouse (PWA) | Probar que nada depende de internet |
| Seguridad | Dependabot, `npm audit`, CodeQL o Semgrep, gitleaks | Cadena de suministro y secretos |
| Equipo y CI | GitHub (issues, Projects, CODEOWNERS, ramas protegidas) + GitHub Actions | Builds de Tauri para cada sistema operativo y comprobaciones en cada PR |

Se eliminan de la versión anterior: Supabase, Upstash, Sentry, Vercel Analytics y la Gemini API en tiempo de ejecución, porque todos necesitan internet.

## Arquitectura

Arquitectura **offline-first de una sola pieza**: todo corre en el dispositivo de a bordo, en capas separadas para que cada persona del equipo sea dueña de una.

```text
DISPOSITIVO A BORDO (portátil con Tauri o tableta con PWA) -- SIN RED
|
|-- Interfaz (Next.js estático, ES/EN) .................................. P3
|     Peligros | Riesgos | Triage | Contramedidas | Radiación
|     Salud conductual | Botiquín | MODO EMERGENCIA | Asistente
|
|-- Capa de conocimiento (solo lectura, firmada) ........................ P2
|     /content/*.json (es/en) -> índice MiniSearch + embeddings precalculados
|
|-- Motor de decisión: árboles de triage deterministas (siempre activos) . P2 + P4
|
|-- Capa de datos de la tripulación (lectura y escritura) ................ P4
|     IndexedDB cifrada: tripulantes, registros, dosis, botiquín, auditoría
|
|-- IA local opcional: LLM cuantizado + RAG con citas obligatorias ....... P5
|
`-- Plataforma: service worker, empaquetado Tauri, firma, CI .............. P1
```

Si la IA local falla (sin GPU o sin memoria), la app sigue funcionando completa con búsqueda y árboles de decisión. Ninguna función crítica depende de la IA.

Modelo de datos (los contratos que se fijan en la fase 1 para poder trabajar en paralelo):

- **Hazard** (5) y **Risk** (17): `{ id, name: {es, en}, summary: {es, en}, hazardIds[], destinations[], warningSigns: {es, en}[], countermeasureIds[], sourceUrl }`
- **Study / Countermeasure:** `{ id, name, mission, riskIds[], howTo: {es, en}, sourceUrl }`
- **Protocol** (árbol de triage): `{ id, riskId, nodes[{ question, options[{label, next}] }], reviewStatus: "pendiente" | "revisado", sourceUrl }`
- **EarthBenefit:** `{ id, text: {es, en}, riskIds[], sourceUrl }`
- **CrewMember**, **LogEntry** (sueño, ejercicio, ánimo, síntoma), **DoseRecord**, **KitItem**, **AuditEvent**: datos locales cifrados

Estructura de carpetas y responsables (base del archivo `CODEOWNERS`):

```text
aegis-space-med/
|-- CLAUDE.md, README.md, CODEOWNERS ................... P1
|-- .github/workflows/  (CI, builds de Tauri) ........... P1
|-- src-tauri/          (app de escritorio) ............. P1
|-- content/            (es/en: hazards, risks, studies, protocols, benefits) .. P2
|-- public/media/       (videos e imágenes con créditos) P2
|-- src/
|   |-- app/[locale]/   (páginas) ....................... P3
|   |-- components/     (ui/, emergency/, charts/) ....... P3
|   |-- messages/       (es.json, en.json) .............. P3
|   |-- lib/schemas/    (Zod: contratos compartidos) .... P2 + P1
|   |-- lib/db/         (Dexie, cifrado, copias) ........ P4
|   |-- features/       (trackers, dosimetry, kit, triage-engine) .. P4
|   |-- lib/ai/         (WebLLM, RAG, guardas) .......... P5
|   `-- features/assistant/ ............................. P5
|-- tests/unit, tests/e2e (offline) ..................... P5 (cada uno escribe los suyos)
`-- next.config.ts, serwist config ...................... P1
```

## Skills de Claude y UI/UX Pro Max

Una skill es una carpeta con un `SKILL.md` (instrucciones) y, a veces, scripts y datos. Claude la carga sola cuando tu petición coincide con su descripción, o cuando la nombras.

**Dónde viven en Claude Code:**

- `.claude/skills/<nombre>/SKILL.md` dentro del proyecto: se comparte con el equipo vía Git.
- `~/.claude/skills/<nombre>/` para tenerla en todos tus proyectos.
- También se instalan como plugins con `/plugin marketplace add <repo>` y `/plugin install`.

**Skills recomendadas para este proyecto:**

| Skill | Uso |
| --- | --- |
| ui-ux-pro-max | Generar el sistema de diseño: estilo, paleta, tipografía y guías de UX |
| frontend-design (Anthropic) | Evitar interfaces genéricas y dar una dirección visual con intención |
| skill-creator (Anthropic) | Crear tu propia skill `nasa-content` con las reglas de contenido: citar fuentes, no inventar cifras, formato JSON |
| Skill propia `owasp-check` | Lista de verificación de la sección 8 que Claude repasa antes de cada pull request |

### Instalar UI/UX Pro Max

Es una skill de código abierto (licencia MIT) de nextlevelbuilder. Trae 67 estilos de UI, 161 paletas, 57 combinaciones de fuentes y 99 guías de UX. Requiere Node.js y Python 3.

Opción A, por CLI (recomendada):

```bash
npm install -g uipro-cli
cd /ruta/a/astrosalud
uipro init --ai claude          # crea .claude/skills/ui-ux-pro-max/
# uipro init --ai claude --global   (para ~/.claude/skills/)
# uipro init --ai antigravity       (para usarla también en Antigravity)
```

Opción B, como plugin dentro de Claude Code:

```text
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

Después reinicia Claude Code y comprúebalo:

```bash
ls .claude/skills/ui-ux-pro-max/SKILL.md
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "offline medical app astronauts mission console" --design-system -p "aegis-space-med" -f markdown
```

**Cómo usarla:** pídelo en lenguaje natural, por ejemplo: «Usa ui-ux-pro-max para crear el sistema de diseño de aegis-space-med, consola de misión, modo oscuro, WCAG AA, y guárdalo en `design-system.md`». Luego pide que cada componente siga ese archivo.

**Precaución de seguridad (OWASP A03):** es código de terceros que ejecuta scripts. Revisa el `SKILL.md` y la carpeta `scripts/` antes del primer uso, y fija la versión con `uipro versions`.

## Google AI Studio, Antigravity y Claude Pro

Las tres herramientas sirven para **construir** la app en tierra, pero ninguna viaja dentro de ella. A bordo solo corre el modelo local que empaqueta la persona P5.

| Herramienta | Quién y para qué | Límites |
| --- | --- | --- |
| Claude Pro → Claude Code | Las 5 personas, cada una con su propia cuenta, como agente principal en su rama. Todos leen el mismo `CLAUDE.md` | Límites de uso por cuenta. Trabajad con tareas acotadas de 1 a 3 archivos |
| [Google AI Studio](https://aistudio.google.com) | P3: prototipos rápidos de pantallas en modo Build, como referencia visual. P5: probar prompts de RAG antes de pasarlos al modelo local | Los prompts del nivel gratuito pueden usarse para entrenar: no pongas datos médicos reales. El código exportado es solo una referencia: usa la nube y no cumple la regla de «sin red» |
| [Antigravity](https://antigravity.google) | P5 y P1: pruebas en el navegador con capturas, sobre todo la prueba en modo avión. Revisiones cruzadas de pull requests | Con AI Plus o AI Pro la cuota es de nivel de entrada y ha cambiado varias veces en 2026. Desde el 2 de noviembre de 2026 el plan gratuito solo tiene modelos Gemini |

**Modelo de IA a bordo (decisión de P5 en la fase 2):** un modelo abierto pequeño y cuantizado, de unos 1.000 a 4.000 millones de parámetros, cuya licencia permita redistribuirlo. Debe responder bien en español y en inglés y caber en la memoria de un portátil sin GPU dedicada. Los candidatos se comparan con un banco de 50 preguntas propias por idioma.

Reglas del equipo con los agentes:

1. Una rama por persona y tarea. Nunca dos agentes en los mismos archivos.
2. Siempre primero el plan, luego aprobar, implementar y probar.
3. Todo pull request lo revisa una persona, no solo el agente.

## OWASP Top 10:2025 aplicado

Se aplica la [OWASP Top 10:2025](https://owasp.org/Top10/2025/), adaptada a una app sin servidor y sin red. El mayor riesgo aquí no es un atacante remoto, sino perder o corromper datos médicos, o que la app falle cuando nadie puede arreglarla. El responsable es P1, y cada persona cumple las filas de su capa.

| Código | Riesgo | Medida en aegis-space-med | Capa |
| --- | --- | --- | --- |
| A01 | Control de acceso roto | Roles locales (comandante, oficial médico, tripulante) con PIN. Cada tripulante ve solo sus registros, y el oficial médico ve los de todos | P4 |
| A02 | Configuración incorrecta | CSP con `connect-src 'self'` (bloquea cualquier llamada de red), sin mapas de código, permisos mínimos en Tauri | P1 |
| A03 | Cadena de suministro (nueva) | Archivo de bloqueo, Dependabot, `npm audit` en CI, revisar skills y plugins de terceros, hash verificado del modelo de IA | P1 + P5 |
| A04 | Fallos criptográficos | AES-GCM con clave derivada del PIN (PBKDF2 o Argon2). Nunca guardar el PIN | P4 |
| A05 | Inyección | Zod en toda entrada y en el CSV importado. Nada de `dangerouslySetInnerHTML` | P4 + P3 |
| A06 | Diseño inseguro | Modelado de amenazas en la fase 2. Las funciones críticas nunca dependen de la IA | P1 |
| A07 | Fallos de autenticación | PIN con bloqueo progresivo y recuperación por el comandante | P4 |
| A08 | Integridad de software o datos | Contenido y modelo firmados en el build y verificados al arrancar. Instaladores de Tauri firmados | P1 + P2 |
| A09 | Registro y alertas | Registro de auditoría local (quién vio o cambió qué), sin telemetría externa | P4 |
| A10 | Condiciones excepcionales (nueva) | Si algo falla, la app nunca se bloquea: límites de error por módulo, modo emergencia accesible siempre, copia de seguridad cifrada automática | P3 + P4 |

**Asistente IA (P5):** aplicar el OWASP Top 10 para aplicaciones LLM. Responde solo con la base de conocimiento, cita siempre la fuente, nunca da dosis que no estén en un protocolo revisado y no tiene herramientas con permiso de escritura.

Verificación: Semgrep o CodeQL, gitleaks, y una prueba e2e con la red bloqueada que falla si la app intenta cualquier conexión externa.

## Despliegue: Vercel vs Render vs Netlify vs Cloudflare

A bordo no hay servidor, así que en producción la app se **instala**, no se despliega: un instalador firmado de Tauri para los portátiles y la PWA instalada en las tabletas antes del lanzamiento. Para la demo, el jurado y las vistas previas de cada PR, **usa Vercel**, que sigue siendo lo más fácil.

| Plataforma | Papel en este proyecto | Plan gratuito | Uso comercial gratis |
| --- | --- | --- | --- |
| **Vercel** (recomendada) | Demo pública, vistas previas por PR, punto de instalación de la PWA | 100 GB de transferencia al mes | No (Hobby es personal) |
| Cloudflare Pages | Alternativa si la demo recibe mucho tráfico o es comercial | Transferencia de estáticos sin límite, 500 builds al mes | Sí |
| Netlify | Alternativa equivalente para un sitio estático | Plan por créditos | Sí |
| Render | No hace falta: no hay backend | Servicios que se duermen | Sí |
| **GitHub Releases** | Distribución de los instaladores de Tauri (.msi, .AppImage, .dmg) generados por GitHub Actions | Gratis en repositorios públicos | Sí |

Pasos:

1. P1 conecta el repositorio a Vercel (Add New → Project). Con `output: 'export'` el despliegue es estático.
2. Cada PR genera una URL de vista previa para revisar.
3. Un tag `v*` dispara el workflow de Tauri, que compila y firma los instaladores para cada sistema operativo y los publica en GitHub Releases.
4. Prueba de aceptación: instalar, desconectar la red, reiniciar el equipo y usar los 9 módulos en los dos idiomas.
5. «Congelado de vuelo»: la versión que se lanza no se actualiza a bordo. Las actualizaciones de Tauri se desactivan en el build de misión.

## Checklist de instalación

El repositorio de GitHub está vacío (sin commits), así que P1 hace el arranque y los demás clonan después.

**Cada una de las 5 personas**

- [ ] Cuenta de GitHub con acceso de escritura al repositorio (Settings → Collaborators)
- [ ] Claude Pro propio, con sesión iniciada en Claude Code (instalación según docs.claude.com)
- [ ] Node.js LTS + pnpm (`npm i -g pnpm`), Git y Python 3
- [ ] VS Code o Antigravity como editor
- [ ] Rust + requisitos de Tauri (rustup, y en Windows las Build Tools de Visual Studio): obligatorio para P1, recomendado para el resto
- [ ] `npm install -g uipro-cli` (UI/UX Pro Max)
- [ ] Clonar: `git clone https://github.com/NatNataNaty/aegis-space-med.git`

**Solo P1, el primer día**

```bash
git clone https://github.com/NatNataNaty/aegis-space-med.git
cd aegis-space-med
pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir
pnpm dlx shadcn@latest init
pnpm add zod next-intl dexie minisearch recharts lucide-react @serwist/next
pnpm add -D @serwist/sw vitest @testing-library/react @playwright/test @axe-core/playwright prettier @tauri-apps/cli
# pnpm tauri init   (después de la entrega)
uipro init --ai claude
# crear CLAUDE.md (prompt maestro), CODEOWNERS, .github/workflows/ci.yml
git add . && git commit -m "chore: estructura inicial de aegis-space-med"
git push -u origin main
```

- [ ] `next.config.ts` con `output: 'export'` y CSP `connect-src 'self'`
- [ ] Proteger `main` en GitHub: PR obligatorio, 1 aprobación y CI en verde
- [ ] Activar Dependabot y crear el tablero en GitHub Projects con las columnas Por hacer, En curso, En revisión y Hecho
- [ ] Crear las etiquetas `fase-0` a `fase-9`, `P1` a `P5`, `bloqueante` y `revisión-médica`
- [ ] Conectar Vercel para las vistas previas
- [ ] (Solo en tierra) Clave de api.nasa.gov para descargar DONKI y OSDR en el build

## Plan de 26 horas para 5 personas

Con 26 horas solo cabe un **producto mínimo sólido**: una PWA sin conexión y bilingüe con 6 módulos. La IA local, Tauri y el resto quedan como extras que solo se empiezan si el mínimo está listo a las 21:00. Horario de La Paz: inicio el sábado a las 11:00 y entrega el domingo a las 13:00.

### Alcance

| Prioridad | Qué entra |
| --- | --- |
| **Obligatorio** | PWA instalable que funciona en modo avión. ES/EN completo. Módulos: Peligros (5), Riesgos (17), Contramedidas y estudios, Triage (3 a 5 árboles marcados «pendiente de revisión médica»), Modo emergencia, Registro diario cifrado (sueño, ejercicio, ánimo, dosis manual). Búsqueda con MiniSearch |
| Extra 1 (desde las 21:00) | Asistente IA local con WebLLM y citas obligatorias |
| Extra 2 | Botiquín, autoevaluación conductual, gráficos de tendencias |
| Después de la entrega | Tauri e instaladores, importar el CSV del dosímetro, roles con PIN, firma de contenido |

### Roles

| Persona | Rol | Dueña de | Nombre |
| --- | --- | --- | --- |
| P1 | Líder técnico, plataforma, seguridad e integración | Repositorio, CI, PWA, CSP, despliegue, fusión de PRs | \[escribir\] |
| P2 | Contenido científico bilingüe | `/content`, esquemas Zod, fuentes, árboles de triage | \[escribir\] |
| P3 | UI/UX e idiomas | Sistema de diseño, páginas, modo emergencia, i18n | \[escribir\] |
| P4 | Datos locales | Dexie cifrada, registro diario, motor de triage, búsqueda | \[escribir\] |
| P5 | QA, pruebas sin red e IA local | Playwright sin red, accesibilidad, WebLLM (extra), video y presentación | \[escribir\] |

### Bloques horarios y tareas

| Bloque (La Paz) | P1 Plataforma | P2 Contenido | P3 UI/UX | P4 Datos | P5 QA e IA |
| --- | --- | --- | --- | --- | --- |
| Sáb 11:00–12:00 · Arranque | Primer commit, `CLAUDE.md`, CODEOWNERS, protección de `main`, tablero y 30 issues. **Push antes de las 11:45** | Instalar herramientas, empezar a extraer los 5 peligros | Instalar UI/UX Pro Max y generar `design-system.md` | Instalar herramientas, preparar el prototipo de Dexie | Instalar Playwright y escribir el guion de pruebas |
| 12:00–13:30 · Contratos | Revisar y fusionar los esquemas Zod. **Barrera: esquemas en `main` a las 13:30** | Redactar los esquemas y cargar los 5 peligros en ES/EN | Layout, navegación y selector ES/EN | Esquemas locales: LogEntry y DoseRecord | Test e2e que bloquea la red |
| 13:30–17:00 · Construcción 1 | Exportación estática, Serwist (sin conexión), CSP `connect-src 'self'`, CI, Vercel | Cargar los 17 riesgos y los estudios en ES/EN | Páginas de Peligros y Riesgos con filtros | Base de datos cifrada (AES-GCM con PIN) y registro diario | Tests de lo que se vaya fusionando |
| 17:00–21:00 · Construcción 2 | Integrar PRs cada hora y mantener `main` estable | De 3 a 5 árboles de triage con fuente. Beneficios en la Tierra | Modo emergencia, página de Contramedidas, pantallas de registro | Motor de triage y búsqueda con MiniSearch | Pruebas de accesibilidad (axe) y de los dos idiomas |
| **21:00 · Punto de control** | Demo interna de 15 min. ¿Está el mínimo? Sí: se empiezan los extras. No: todos terminan el mínimo |  |  |  |  |
| 21:00–01:00 · Extras | Revisar seguridad (OWASP), gitleaks, `npm audit` | Revisar textos y fuentes, añadir medios con créditos | Pulir la interfaz, estados de error, extra 2 | Copia de seguridad cifrada, extra 2 | WebLLM + RAG con citas (extra 1). Si no funciona a las 01:00, se descarta |
| 01:00–06:00 · Turnos de descanso | Descansa 01:00–05:00 | Guardia de errores 01:00–03:00, descansa 03:00–06:00 | Descansa 01:00–05:00 | Descansa 02:00–06:00 | Guardia 01:00–02:00, descansa 02:00–06:00 |
| Dom 06:00–09:00 · Pruebas sin Tierra | Corregir lo que salga | Corregir contenido | Corregir interfaz | Corregir datos | Simulacro en modo avión: instalar, desconectar, reiniciar y recorrer los 6 módulos en ES y EN |
| 09:00–10:00 · Congelación del código | **Nada nuevo desde las 10:00.** Solo errores bloqueantes |  |  |  |  |
| 10:00–12:00 · Entrega | Despliegue final en Vercel, tag `v1.0.0`, README | Ficha de fuentes y licencias | Capturas y pantalla «Acerca de» | Datos de demo ficticios | Video de 2 a 3 min y presentación |
| 12:00–13:00 · Margen | Enviar la entrega antes de las 12:45 | Revisar la entrega | Revisar la entrega | Revisar la entrega | Revisar la entrega |

### Reglas para no perder tiempo

1. Una issue por tarea, con etiqueta de persona. Una rama por issue (`feat/p3-emergencia`). PR pequeño, 1 aprobación y CI en verde.
2. Los esquemas en `lib/schemas` se congelan a las 13:30. Si hay que cambiarlos, lo aprueban P1 y P2 y se avisa a todos.
3. Nadie espera a nadie: hasta que llegue el contenido real, se trabaja con datos de prueba que cumplen los esquemas.
4. Si una tarea se atasca 45 minutos, se avisa al grupo y P1 decide si se recorta.
5. Cada persona usa Claude Code en su propia rama, con el `CLAUDE.md` común. Primero el plan y luego el código, de 1 a 3 archivos por tarea.
6. `git pull --rebase origin main` al empezar cada bloque.

```text
# CODEOWNERS (reemplaza por los usuarios de GitHub)
*                    @P1-usuario
/content/            @P2-usuario
/src/lib/schemas/    @P2-usuario @P1-usuario
/src/app/ /src/components/ /src/messages/  @P3-usuario
/src/lib/db/ /src/features/                @P4-usuario
/tests/ /src/lib/ai/                       @P5-usuario
/.github/            @P1-usuario
```

## Fuentes

Recursos del proyecto (revisados):

- [NASA HRP – Hazards](https://www.nasa.gov/hrp/hazards/)
- [NASA HRP – Risks](https://www.nasa.gov/hrp/risks/)
- [NASA HRP – Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/)
- [CSA – Monitoring radiation to protect astronaut health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp)
- [CSA – Why do we conduct science experiments in space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp)

Herramientas y plataformas:

- [UI/UX Pro Max – instalación](https://www.mintlify.com/nextlevelbuilder/ui-ux-pro-max-skill/installation) y [comandos de la CLI](https://www.mintlify.com/nextlevelbuilder/ui-ux-pro-max-skill/guides/cli-commands)
- [UI/UX Pro Max en Claude Code](https://www.mintlify.com/nextlevelbuilder/ui-ux-pro-max-skill/platforms/claude-code)
- [Google AI Studio – despliegue desde Build mode](https://ai.google.dev/gemini-api/docs/aistudio-deploying)
- [Reseña de Antigravity 2026 (planes y cuotas)](https://preuve.ai/blog/antigravity-review)
- [The Register – cambios de precio en Antigravity](https://www.theregister.com/2026/03/12/users_protest_as_google_antigravity/)
- [Comparativa de hosting estático 2026](https://guptadeepak.com/tools/top-5-static-site-hosting-jamstack-platforms-2026/)
- [Vercel vs Netlify (uso comercial del plan gratuito)](https://agentdeals.dev/vercel-vs-netlify)
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/) y [explicación de Parasoft](https://parasoft.com/blog/owasp-top-10/)
- [NASA DONKI API](https://developers.qodex.ai/nasa-open-apis/donki) y [api.nasa.gov](https://api.nasa.gov)
- [NASA OSDR – RadLab y EDA](https://ntrs.nasa.gov/citations/20230009560)
