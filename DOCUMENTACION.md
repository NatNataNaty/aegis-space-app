# ASTRA Health — Documentación del software construido

**Proyecto:** ASTRA Health  
**Ubicación:** `D:\Heastra\astra-health`  
**Reto:** NASA Space Apps Challenge 2026 — Create Health Monitoring Software for Astronauts on Space Missions  
**Misión de demo:** `ARES-01` · Tránsito a Marte · Día de misión 142  
**Tipo:** aplicación web local (offline-first), sin backend  
**Estado:** MVP funcional implementado

> **Límite médico:** ASTRA Health es un prototipo educativo de apoyo a la observación. No es un dispositivo médico, no diagnostica, no prescribe medicamentos y no sustituye al personal médico ni a los protocolos de vuelo. Los valores simulados no representan datos de astronautas reales.

---

## 1. Resumen del producto

ASTRA Health combina dos fuentes de información claramente separadas:

1. **Observación ocular en vivo** — cámara web real + MediaPipe Face Landmarker ejecutado en el navegador.
2. **Contexto de salud y misión simulado** — signos vitales, sueño, radiación, ejercicio, horario e históricos generados de forma determinista según un escenario de demo.

El valor diferencial es correlacionar señales oculares reales con un contexto de misión reproducible (por ejemplo: cierres prolongados + sueño simulado insuficiente → “señales compatibles con fatiga en este escenario de demo”), sin afirmar diagnósticos.

### Principios implementados

| Principio | Cómo se cumple |
|---|---|
| Procedencia visible | Cada dato lleva etiqueta `EN VIVO`, `SIMULADO`, `AUTORREPORTADO` o `PRUEBA LOCAL` |
| Sin vídeo almacenado | Los frames solo existen en memoria; el canvas de brillo se limpia tras cada lectura |
| Procesamiento local | Modelo y WASM se sirven desde `public/`; no hay CDN en runtime |
| Offline-first | Tras la primera carga, la app puede funcionar sin red |
| Una sola cámara y un solo modelo | Minimizar no crea otro stream ni otra instancia de Face Landmarker |
| Datos faltantes ≠ cero | Si no hay calidad suficiente se muestra `—` / `No disponible` |
| Sin diagnósticos faciales | No se infieren emociones, estrés, depresión ni enfermedades |
| Alertas explicables | Cada alerta muestra señales, fuente, ventana, calidad y acción |
| Demo reproducible | Escenarios con semilla fija; mismo escenario + misma hora → mismos datos |

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión / notas |
|---|---|---|
| UI | React + TypeScript | React 19 |
| Build | Vite | 8.x |
| Estilos | CSS global (`src/styles/global.css`) | Tema oscuro de consola médica |
| Iconos | `lucide-react` | 1.73 |
| Gráficos | `recharts` | 3.x |
| Estado | Zustand | 5.x |
| Visión | `@mediapipe/tasks-vision` | **1.2.3** (fijada, no `@latest`) |
| Modelo | Face Landmarker Float16 | `public/models/face_landmarker.task` |
| Persistencia ligera | `localStorage` | Preferencias (vista, overlay, escenario) |
| Tests | Vitest + jsdom | Unitarios de detector, PERCLOS, simulación y alertas |

### Scripts npm

| Script | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173` |
| `npm run build` | Typecheck + build de producción |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Solo comprobación TypeScript |
| `npm test` | Tests unitarios |
| `npm run setup:assets` | Copia WASM y descarga/verifica el modelo |
| `postinstall` | Copia WASM automáticamente tras `npm install` |

### Recursos locales

```text
public/
  models/
    face_landmarker.task          (~3.6 MB)
    MODEL-MANIFEST.md             SHA-256 + fecha + versión del paquete
  mediapipe/wasm/                 WASM copiados del paquete NPM
  favicon.svg
```

| Campo del modelo | Valor |
|---|---|
| Variante | Face Landmarker Float16 |
| SHA-256 | `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF` |
| Paquete | `@mediapipe/tasks-vision@1.2.3` |

---

## 3. Arquitectura

### 3.1 Estructura de carpetas

```text
astra-health/
├─ public/                  Modelo, WASM, favicon
├─ scripts/
│  └─ setup-assets.mjs      Descarga modelo + copia WASM + manifiesto
├─ src/
│  ├─ app/App.tsx           Shell principal
│  ├─ main.tsx              Entrada React
│  ├─ styles/global.css     Tema completo
│  ├─ data/metricCatalog.ts Glosario de métricas (tooltips / guía)
│  ├─ lib/
│  │  ├─ format.ts          Formato numérico y clases CSS
│  │  └─ storage.ts         Preferencias localStorage
│  ├─ hooks/
│  │  └─ useAppEngine.ts    Reloj de misión + snapshot + alertas (1 Hz)
│  ├─ stores/
│  │  ├─ camera.store.ts    Estado de cámara y métricas oculares
│  │  ├─ health.store.ts    Escenario, snapshot, cuestionario, alertas
│  │  └─ mission.store.ts   Reloj de misión
│  ├─ features/
│  │  ├─ camera/            Pipeline de visión (puro + servicios DOM)
│  │  ├─ simulation/        Escenarios y generador determinista
│  │  ├─ mission/           Reloj y horario
│  │  └─ alerts/            Reglas y motor de alertas
│  └─ components/
│     ├─ layout/            TopBar, AboutDataDialog
│     ├─ camera/            Panel de cámara y controles
│     ├─ dashboard/         Métricas, pestañas, secciones
│     ├─ metrics/           MetricCard
│     ├─ charts/            ChartCard + estilos de Recharts
│     ├─ alerts/            Banner, ítems, iconos de nivel
│     └─ common/            Badges, tooltips, tags de estado
└─ tests/                   Vitest (EAR, blink, PERCLOS, simulación, alertas)
```

### 3.2 Límites entre módulos

| Módulo | Responsabilidad | No hace |
|---|---|---|
| `camera.service.ts` | Permiso, abrir/cerrar tracks, adjuntar vídeo | Inferencia facial |
| `faceLandmarker.service.ts` | Cargar WASM/modelo; **una sola instancia**; `detectForVideo` | React / UI |
| `eyeAspectRatio.ts` | EAR geométrico puro | DOM / React |
| `blinkDetector.ts` | Máquina de estados + duración de cierres | Imágenes |
| `perclos.ts` | Ventanas temporales y cobertura | Alertas |
| `ocularMetrics.ts` | Orquesta frame → eventos y resúmenes | JSX |
| `ocularSession.ts` | Stream + bucle de frames + sync con store | Cálculos biométricos en componentes |
| `simulation.service.ts` | Solo datos simulados | Datos de cámara |
| `alertEngine.ts` | Combina fuentes **sin mezclar orígenes** | Mutar métricas |
| Componentes React | Presentar estado | Cálculos biométricos en JSX |

### 3.3 Flujo de datos (alto nivel)

```text
getUserMedia → <video> persistente
       ↓
FaceLandmarker.detectForVideo (~20 FPS, token bucket)
       ↓
FaceObservation (landmarks, blendshapes, matriz, brillo)
       ↓
OcularAnalyzer (EAR → calibración → histéresis → eventos → PERCLOS)
       ↓
camera.store (Zustand)
       ↓
UI (CameraPanel, OcularCard, EyeSection, …)

Escenario + missionMs → generateSnapshot → health.store
camera.store + health.store → evaluateAlerts → health.activeAlerts / alertLog
```

El ticker `useAppEngine` corre cada 1 s: avanza el reloj de misión, regenera el snapshot simulado por buckets de 5 s y reevalúa alertas.

---

## 4. Procedencia de los datos

| Etiqueta UI | Código | Qué incluye |
|---|---|---|
| **EN VIVO** | `camera_live` | Rostro, estado de ojos, EAR normalizado, parpadeos, duración de cierres, PERCLOS 1/5 min, aperturas prolongadas de boca, orientación de cabeza, FPS, calidad |
| **SIMULADO** | `simulated` | FC, SpO₂, PA, temperatura, respiración, glucosa, sueño, radiación, ejercicio, horario, históricos 24 h / 7 días, recomendaciones del escenario |
| **AUTORREPORTADO** | `user_reported` | Fatiga, ánimo, estrés y síntomas del cuestionario |
| **PRUEBA LOCAL** | `local_test` | Tiempo de reacción (media / mediana de 5 ensayos) |
| **LECTURA ANTERIOR** | (estado) | Tras pausar la cámara: se conserva la última lectura con su hora |

Nunca se insertan datos simulados en el historial de cámara, ni se inventa un valor a partir de una lectura ausente.

---

## 5. Módulo de cámara y visión

### 5.1 Características funcionales

| Función | Detalle |
|---|---|
| Solicitud de permiso | `getUserMedia` solo vídeo (`audio: false`) |
| Resolución objetivo | 640×480, facingMode `user`, frameRate ideal 30 |
| Contexto seguro | Requiere `localhost` o HTTPS; error `insecure` si no |
| Elemento vídeo | `autoPlay`, `muted`, `playsInline`; espejado en CSS |
| Iniciar / reanudar | Abre stream + carga modelo en paralelo |
| Pausar | Detiene **todas** las pistas; libera el indicador físico de cámara cuando el hardware lo permite |
| Minimizar | Miniatura flotante; el análisis continúa |
| Ocultar vídeo | Modo `metrics_only`; vídeo montado pero invisible; indicador `CÁMARA ACTIVA — PROCESAMIENTO LOCAL` |
| Expandir | Vuelve al layout 40/60 |
| Overlay de landmarks | Canvas separado; contorno facial + contornos de ojos; se puede activar/desactivar |
| Recalibrar | Reinicia EAR de referencia y limpia métricas de la sesión |
| Indicador permanente | `CÁMARA ACTIVA` / `EN PAUSA` / `INACTIVA` / `INICIANDO` |
| Estado del modelo | idle → loading → ready / error; muestra delegado GPU o CPU |
| Preferencias | Vista de cámara y overlay se guardan en `localStorage` |
| Liberación al salir | `pagehide` pausa la cámara |

### 5.2 Modos de visualización

| Modo | Comportamiento |
|---|---|
| **Expandida** | Vídeo grande a la izquierda (~40 %), métricas a la derecha (~60 %); readout ocular bajo el vídeo |
| **Minimizada** | Miniatura fija abajo a la derecha; aparece la tarjeta **Vigilancia ocular**; el mismo `<video>` y stream siguen vivos |
| **Solo métricas** | Imagen oculta; análisis activo; barra compacta con indicador largo |
| **Pausada** | Stream apagado; última lectura con etiqueta `LECTURA ANTERIOR` |

**Garantía clave:** cambiar de modo solo altera clases CSS. El componente `CameraPanel` se monta **una sola vez**; no se recrea el stream ni Face Landmarker.

### 5.3 Estados de error de cámara

| Código | Mensaje típico |
|---|---|
| `denied` | Permiso denegado |
| `no_camera` | No hay cámara / constraints no satisfechos |
| `in_use` | Cámara usada por otra app |
| `insecure` | Contexto no seguro |
| `unsupported` | API no disponible |
| `model` | Fallo al cargar el modelo local |
| `unknown` | Error genérico |

### 5.4 Face Landmarker

- Ruta WASM: `/mediapipe/wasm`
- Modelo: `/models/face_landmarker.task`
- Modo: `VIDEO`, `numFaces: 1`
- Salidas: landmarks + blendshapes + matriz de transformación facial
- Fallback: intenta `delegate: "GPU"`; si falla, reintenta con `"CPU"`
- Timestamps estrictamente crecientes (requisito de MediaPipe en modo VIDEO)
- Bucle: `requestVideoFrameCallback` si existe; si no (o si se atasca), `requestAnimationFrame` + watchdog
- Límite de inferencia: **~20 FPS** (token bucket); mínimo operativo de calidad: **15 FPS**

### 5.5 Overlay visual

Dibuja (opcionalmente):

- Contorno oval del rostro
- Contornos de ambos ojos coloreados según estado (`open` / `closing` / `closed` / `unknown`)
- Puntos EAR (6 por ojo)

No guarda frames como imagen persistente.

---

## 6. Pipeline de detección ocular

### 6.1 Señales por frame (`OcularFrame`)

| Campo | Origen | Significado |
|---|---|---|
| `faceVisible` | Landmarks | Rostro presente |
| `eyeState` | Máquina de estados | `open` \| `closing` \| `closed` \| `unknown` |
| `normalizedEar` | EAR / baseline | Apertura relativa a la calibración |
| `leftBlinkScore` / `rightBlinkScore` | Blendshapes | Señal auxiliar (no clínica) |
| `jawOpenScore` | Blendshape | Apertura de boca |
| `headPose` | Matriz 4×4 | pitch / yaw / roll (contextual) |
| `fps` | Contador de frames | FPS efectivos |
| `quality` | Evaluación | `good` \| `limited` \| `unavailable` |
| `qualityReasons` | Texto | Motivos de calidad baja |

### 6.2 Eye Aspect Ratio (EAR)

Índices MediaPipe Face Mesh:

- Ojo derecho: `[33, 160, 158, 133, 153, 144]`
- Ojo izquierdo: `[362, 385, 387, 263, 373, 380]`

Fórmula:

```text
EAR = (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4))
```

- Promedio de ambos ojos cuando son válidos
- Con la cabeza girada, se usa el ojo más visible
- Distancia entre esquinas ~0 o landmarks ausentes → `null` (nunca se asume “cerrado”)

### 6.3 Calibración personal

| Paso | Qué hace |
|---|---|
| 1. Ojos abiertos | ~4 s de frames válidos; mediana EAR = `baselineEAR` (mín. 30 muestras; baseline ≥ 0.15) |
| 2. Comprobación | Pide 3 parpadeos normales (timeout 12 s); se puede omitir |
| Resultado | Fase `ready`; a partir de ahí se acumulan métricas de sesión |

`normalizedEAR = currentEAR / baselineEAR`

### 6.4 Máquina de estados (histéresis)

| Parámetro | Valor |
|---|---|
| Entrar en `closed` | `normalizedEAR < 0.68` durante ≥ 2 frames válidos |
| Volver a `open` | `normalizedEAR > 0.78` durante ≥ 2 frames válidos |
| Gap inválido | > 500 ms sin frames válidos → estado `unknown` |
| Re-armado | Tras `unknown`, solo se reabre tras un `open` confirmado (evita eventos falsos) |

### 6.5 Clasificación de eventos de cierre

| Duración | Tipo en UI |
|---|---|
| < 400 ms | Parpadeo |
| 400–499 ms | Cierre prolongado |
| ≥ 500 ms | Cierre largo |

Estos cortes son experimentales (`eyeMetrics.config.ts`), **no** umbrales médicos ni prueba de microsueño.

### 6.6 PERCLOS

Definición operacional del MVP:

- “Casi cerrado” si `normalizedEar ≤ 0.20` (~80 % de reducción frente a la referencia)
- Ventanas móviles de **60 s** y **300 s**
- Excluye rachas < 400 ms (parpadeos ordinarios)
- Excluye frames inválidos del numerador y del denominador
- Cobertura mínima: 60 %; tiempo válido mínimo: 30 s (1 min) / 120 s (5 min)
- Sin cobertura suficiente → `null` / “No disponible”, **nunca 0 %**

### 6.7 Otras métricas oculares

| Métrica | Cálculo |
|---|---|
| Parpadeos/min | Eventos en ventana / minutos de tiempo válido |
| Duración media del parpadeo | Media de eventos tipo `blink` |
| Cierres prolongados / largos | Conteos en ventana de 5 min |
| Posibles bostezos | `jawOpen > 0.5` mantenido ≥ 1,5 s → “apertura prolongada de boca / posible bostezo” |
| Orientación de cabeza | Euler aproximados desde la matriz facial (solo contextual) |

### 6.8 Calidad de captura

Se marca **limitada** o **no disponible** cuando ocurre alguno de estos casos:

| Condición | Efecto |
|---|---|
| FPS < 15 (tras calentamiento) | Limitada |
| Sin rostro | No disponible |
| Rostro demasiado lejos (`faceWidth < 0.12`) | Limitada |
| Yaw > 40° | No disponible |
| Yaw > 25° o pitch > 25° | Limitada |
| Brillo medio < 45 | Limitada |
| Movimiento brusco de nariz | Limitada |
| Un ojo no visible | Limitada |
| Ojos no medibles | No disponible |

Reglas duras:

- `unknown` **nunca** se convierte en `closed`
- Frames inválidos **no** generan alertas de fatiga

---

## 7. Simulador de salud y misión

### 7.1 Características

- Servicio TypeScript independiente de la cámara
- Generación **determinista** (semilla + PRNG Mulberry32 + ruido FNV-1a)
- Mismo escenario + misma hora de misión → mismo snapshot
- Buckets de 5 s para evitar re-randomizar en cada render
- Selector visible **Escenario de misión** en la barra superior
- Cambiar escenario reinicia el reloj al minuto de inicio del escenario y actualiza todo el contexto simulado **sin** tocar las métricas reales de la cámara

### 7.2 Escenarios de demo

| ID | Nombre | Resumen |
|---|---|---|
| `stable` | Rutina estable | Descanso suficiente y carga habitual |
| `sleep_deficit` | Déficit de sueño | Sueño reducido varios días y horario exigente |
| `accumulated_fatigue` | Fatiga acumulada | Descanso irregular + carga física/cognitiva elevada |
| `physio_variation` | Variación fisiológica | Varios signos vitales fuera del perfil de demo |
| `recovery` | Recuperación | Mejora progresiva del sueño tras acciones preventivas |

Cada escenario coordina: vitals actuales, historial 24 h, tendencias 7 días, horario, log de alertas simuladas y recomendaciones educativas.

### 7.3 Indicadores simulados

| Grupo | Indicador | Unidad / presentación |
|---|---|---|
| Cardiovascular | Frecuencia cardíaca | bpm |
| Cardiovascular | Presión arterial | mmHg (sistólica/diastólica) |
| Respiratorio | SpO₂ | % |
| Respiratorio | Frecuencia respiratoria | resp/min |
| Temperatura | Temperatura corporal | °C |
| Metabólico | Glucosa (secundaria) | mg/dL |
| Sueño | Duración último ciclo / media 7 d | horas |
| Sueño | Calidad y regularidad | escala ilustrativa / % |
| Misión | Horario trabajo/descanso/ejercicio/comida | bloques del día |
| Exposición | Radiación acumulada | mSv (demostrativo, ~1,8 mSv/día) |
| Actividad | Ejercicio | minutos / objetivo del día |
| Estado | Fatiga percibida del escenario | 1–5 |

Etiquetas de estado del escenario (no diagnóstico): **estable** · **seguimiento** · **variación**, respecto a un perfil de demo (`FC 64`, `SpO₂ 98`, `36,6 °C`, etc.).

### 7.4 Reloj y horario de misión

| Concepto | Detalle |
|---|---|
| ID de misión | `ARES-01` |
| Nombre | Tránsito a Marte |
| Día inicial | 142 |
| Reloj | Avanza en tiempo real desde el minuto de inicio del escenario |
| Bloques | `sleep`, `work`, `exercise`, `meal`, `personal` |
| UI | Día + reloj + chip del bloque actual; timeline del día; tiempo desde / hasta el descanso |

Importante: en periodo de descanso programado, los ojos cerrados **no** se clasifican como anomalía. La cámara **no** mide sueño.

---

## 8. Motor de alertas

### 8.1 Clases de alerta

| Fuente | Código | Ejemplo |
|---|---|---|
| Cámara real | `camera_live` | Cierres prolongados repetidos; PERCLOS sobre referencia personal |
| Simulador | `simulated` | Sueño reducido; variación de signos vitales; periodo de descanso |
| Combinada (demo) | `combined` | Cierres reales + sueño simulado insuficiente |
| Autorreporte | `user_reported` | Síntomas o fatiga percibida alta |

Niveles: **Información** · **Seguimiento** · **Atención**

### 8.2 Reglas implementadas

| Condición | Resultado |
|---|---|
| Cámara sin rostro / ojos no visibles (≥ 3 s) | Medición no disponible; sin alerta ocular |
| Periodo de descanso programado | Contexto de descanso; cierres no se tratan como anomalía |
| ≥ 3 cierres prolongados o largos en 5 min (trabajo) | Revisar nivel de alerta |
| PERCLOS sobre referencia personal en ≥ 2 ventanas de 1 min | Aumento de cierres oculares respecto a tu referencia |
| ≥ 2 cierres prolongados/largos + sueño simulado < 6 h | Señales compatibles con fatiga en este escenario de demo |
| Signos vitales simulados fuera del perfil | Variación en datos simulados |
| Síntomas autorreportados | Seguir el protocolo médico de la misión |
| Fatiga percibida ≥ 4/5 | Fatiga percibida alta |
| Sin cuestionario | Autoevaluación pendiente (info) |

Umbrales en `alertRules.ts` (configurables, no médicos).

### 8.3 Contenido de cada alerta

1. Título breve  
2. Nivel (información / seguimiento / atención)  
3. Qué se observó  
4. Tabla de señales con **origen original** de cada una  
5. Ventana temporal y calidad  
6. Acción educativa sugerida  
7. Disclaimer: no es un diagnóstico  

Las alertas activas se muestran en banner, pestaña Alertas e historial de sesión; el escenario aporta además un log simulado previo.

### 8.4 Acciones educativas permitidas

- Sugerir pausa y revisión del estado de alerta  
- Recordar el horario de descanso  
- Pedir completar cuestionario pendiente  
- Recordar ejercicio / hidratación del programa de misión  
- Ante variación grave simulada o síntomas: seguir protocolo médico y contactar personal sanitario  

**No** recomienda medicamentos ni dosis.

---

## 9. Interfaz de usuario

### 9.1 Diseño

- Estética de **consola médica espacial**: fondo oscuro, contraste alto, tipografía clara
- Layout pensado para **1366×768** y adaptable a pantallas menores
- Color nunca es el único indicador: siempre hay texto + icono
- Respeta `prefers-reduced-motion`
- Cada métrica tiene tooltip / panel “¿Qué significa?” (`InfoTip` + `metricCatalog`)
- Interfaz limpia: hero con cámara + 6 tarjetas prioritarias; el resto en pestañas (sin saturar el primer viewport)

### 9.2 Barra superior (`TopBar`)

- Marca **ASTRA Health** + misión `ARES-01`
- Reloj de misión (día + HH:MM:SS) y chip del bloque actual
- Selector de escenario
- Campana de alertas (conteo de seguimiento/atención)
- Botón **Acerca de los datos**
- Indicador de cámara

### 9.3 Zona principal (hero)

**Izquierda — Cámara** (`CameraPanel`)

- Vídeo + overlay + chips (rostro / calidad / FPS)
- Guía de calibración
- Controles: Iniciar / Pausar, Minimizar / Expandir, Ocultar vídeo, Recalibrar, Overlay
- Readout ocular (expandida): estado de ojos, apertura %, duración del último cierre / cierre en curso, conteo de eventos

**Derecha — Métricas prioritarias**

1. Frecuencia cardíaca — SIMULADO  
2. SpO₂ — SIMULADO  
3. Presión arterial — SIMULADO  
4. Temperatura — SIMULADO  
5. Sueño último ciclo — SIMULADO  
6. PERCLOS — EN VIVO (o No disponible)

Con cámara minimizada / oculta aparece además la tarjeta **Vigilancia ocular** (PERCLOS 1/5 min, parpadeos/min, cierres largos, calidad).

### 9.4 Banner de observación

Muestra la alerta activa de mayor prioridad (excluida “info”) con acceso directo al detalle.

### 9.5 Pestañas inferiores

| Pestaña | Contenido |
|---|---|
| **Ojos y alerta** | Resúmenes 1/5 min, timeline de cierres (scatter), tendencia PERCLOS/parpadeos, pose de cabeza |
| **Tendencias** | Histórico 24 h (área) y 7 días (sueño + FC en reposo); selector de serie |
| **Sueño y misión** | Timeline del día, bloque actual, tiempos de descanso, sueño estimado/percibido |
| **Exposición** | Radiación acumulada, ejercicio del día, gráfico 7 d ejercicio/carga |
| **Alertas** | Lista activa con detalle expandible + historial de sesión + log del escenario |
| **Autoevaluación** | Cuestionario (fatiga/ánimo/estrés/síntomas) + prueba de tiempo de reacción (5 ensayos) |
| **Guía** | Recomendaciones del escenario, tabla de reglas, glosario de indicadores |

### 9.6 Diálogo “Acerca de los datos”

Explica las cuatro procedencias y los límites del prototipo (no diagnóstico, no medición clínica con cámara, umbrales experimentales, “No disponible” en lugar de ceros).

### 9.7 Pie

Aviso legal: prototipo educativo NASA Space Apps 2026; datos SIMULADO no son lecturas reales.

---

## 10. Estado de la aplicación (stores)

### `camera.store`

Estado de cámara/visión: `status`, `view`, overlay, error, modelo/delegado, frame actual, calibración, eventos, resúmenes 60/300 s, tendencia de sesión, última lectura, offset de reloj.

### `health.store`

Escenario activo, snapshot simulado, autoevaluación, prueba de reacción, alertas activas e historial. Persiste el escenario en `localStorage`.

### `mission.store`

Base de tiempo de misión + tick en tiempo real.

---

## 11. Configuración ajustable

### Detector ocular — `src/features/camera/eyeMetrics.config.ts`

| Parámetro | Valor por defecto |
|---|---|
| Umbral cierre / apertura | 0.68 / 0.78 |
| Frames de confirmación | 2 |
| Cortes de duración | 400 / 500 ms |
| PERCLOS umbral | 0.20 |
| FPS objetivo / mínimo | 20 / 15 |
| Calibración abierta | 4000 ms |
| Bostezo | jawOpen > 0.5 durante ≥ 1500 ms |

### Alertas — `src/features/alerts/alertRules.ts`

| Parámetro | Valor por defecto |
|---|---|
| Cierres repetidos (alerta cámara) | ≥ 3 en 5 min |
| Cierres para alerta combinada | ≥ 2 |
| Sueño insuficiente (demo) | < 6 h |
| Ventanas PERCLOS de referencia | 3 |
| Ventanas elevadas para alerta | 2 |
| Fatiga percibida alta | ≥ 4 |

---

## 12. Privacidad y seguridad de datos

| Aspecto | Comportamiento |
|---|---|
| Micrófono | No se solicita |
| Frames / vídeo | Solo en memoria; no se graban, no se suben, no se guardan en disco |
| Overlay | Canvas efímero; no se exporta |
| Brillo | Muestra 32×24 en canvas temporal; se limpia tras leer |
| Autoevaluación | Solo en memoria de sesión (Zustand); no sale del navegador |
| Preferencias | Solo vista, overlay y escenario en `localStorage` |
| Red | Tras cargar modelo/WASM locales, no se requieren llamadas externas para operar |

---

## 13. Tests unitarios (escritos)

Ubicación: `tests/` · runner: Vitest

| Archivo | Qué cubre |
|---|---|
| `eyeAspectRatio.test.ts` | EAR abierto/cerrado, esquinas colapsadas, landmarks ausentes, mediana |
| `blinkDetector.test.ts` | Un evento por ciclo, histéresis, clasificación por duración, no convertir unknown→closed, FPS |
| `perclos.test.ts` | Porcentaje con tiempo cerrado conocido, exclusión de parpadeos cortos, frames inválidos, `null` sin cobertura |
| `simulation.test.ts` | Reproducibilidad, origen `simulated`, cambio de escenario, historiales |
| `alertEngine.test.ts` | Cierre aislado sin alerta, cierres repetidos, alerta combinada, orígenes intactos, descanso, vitals simulados |

Ejecución: `npm test` (el usuario las ejecuta cuando quiera).

---

## 14. Cómo arrancar

```powershell
cd D:\Heastra\astra-health
npm install
npm run setup:assets   # si el modelo aún no está
npm run dev
```

Abrir `http://localhost:5173`, conceder permiso de cámara y seguir la calibración guiada.

### Guion corto de demostración

1. Mostrar `ARES-01` y **Acerca de los datos**  
2. Iniciar cámara → calibrar (ojos abiertos + 3 parpadeos)  
3. Parpadear y mantener cerrados ~1 s → ver duración  
4. Minimizar → Vigilancia ocular sigue contando  
5. Escenario **Déficit de sueño** → tendencias y alertas  
6. Abrir detalle de una alerta (señales / fuente / calidad / acción)  
7. Solo métricas → Pausar  

---

## 15. Inventario de componentes UI

| Componente | Rol |
|---|---|
| `App` | Layout: TopBar + hero + banner + tabs + footer + diálogo |
| `TopBar` | Marca, reloj, escenario, alertas, acerca de |
| `CameraPanel` | Vídeo persistente y orquestación visual de cámara |
| `CameraControls` | Botones de cámara |
| `CalibrationGuide` | Overlay de calibración en 2 pasos |
| `EyeReadout` | Estado ocular en vista expandida |
| `OcularCard` | Resumen en vistas compactas |
| `PriorityMetrics` | 6 tarjetas principales |
| `MetricCard` / `OriginBadge` / `InfoTip` / `StatusTag` | Presentación homogénea de métricas |
| `AlertBanner` / `AlertItem` | Observaciones activas |
| `SectionTabs` + 7 secciones | Contenido inferior |
| `AboutDataDialog` | Transparencia de procedencia |
| `ChartCard` | Contenedor común de gráficos Recharts |

---

## 16. Qué queda fuera del MVP (por diseño)

- Diagnóstico de enfermedades  
- Medición clínica de PA / SpO₂ / temperatura / glucosa con la cámara  
- Detección de SANS por webcam  
- Emociones / depresión / estrés a partir del rostro  
- Backend, cuentas, telemetría en la nube o enlace real con NASA  
- Wearables / sensores físicos obligatorios  
- Vigilancia 24/7 de la tripulación (la cámara es sesión voluntaria)  

---

## 17. Mapa rápido “dónde está cada cosa”

| Necesitas… | Archivo |
|---|---|
| Abrir/cerrar cámara | `features/camera/camera.service.ts` |
| Cargar MediaPipe | `features/camera/faceLandmarker.service.ts` |
| Bucle de frames | `features/camera/ocularSession.ts` |
| EAR | `features/camera/eyeAspectRatio.ts` |
| Calibración | `features/camera/eyeCalibration.ts` |
| Parpadeos | `features/camera/blinkDetector.ts` |
| PERCLOS | `features/camera/perclos.ts` |
| Resúmenes oculares | `features/camera/ocularMetrics.ts` |
| Parámetros del detector | `features/camera/eyeMetrics.config.ts` |
| Escenarios | `features/simulation/scenarios.ts` |
| Generador simulado | `features/simulation/simulation.service.ts` |
| Reloj / horario | `features/mission/missionClock.ts`, `schedule.ts` |
| Reglas de alerta | `features/alerts/alertRules.ts`, `alertEngine.ts` |
| UI principal | `app/App.tsx`, `components/**` |
| Estilos | `styles/global.css` |
| Glosario | `data/metricCatalog.ts` |

---

*Documento generado a partir del código implementado en `astra-health`. Describe el software construido, no el plan previo.*
