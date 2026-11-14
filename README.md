# ASTRA Health — MVP

Prototipo para NASA Space Apps Challenge 2026: observación ocular real con la cámara web y contexto de salud y misión simulado.

> Prototipo educativo de apoyo a la observación. No es un dispositivo médico, no diagnostica y no sustituye al personal médico ni a los protocolos de vuelo.

## Requisitos

- Node.js 20 o superior.
- Navegador Chromium o Firefox reciente con cámara web.
- `localhost` o HTTPS (requisito de `getUserMedia`).

## Puesta en marcha

```bash
npm install          # copia también los WASM de MediaPipe a public/mediapipe/wasm
npm run setup:assets # descarga el modelo si falta y regenera public/models/MODEL-MANIFEST.md
npm run dev          # http://localhost:5173
```

El modelo `public/models/face_landmarker.task` y los WASM se sirven desde el propio proyecto: tras la primera carga la aplicación no depende de ningún CDN.

## Scripts

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos y build de producción |
| `npm run preview` | Sirve el build |
| `npm test` | Tests unitarios (Vitest) |
| `npm run setup:assets` | Copia WASM y descarga/verifica el modelo |

## Qué es real y qué es simulado

| Procedencia | Datos |
|---|---|
| `EN VIVO` | Rostro, estado de los ojos, parpadeos, duración de cierres, PERCLOS 1/5 min, aperturas prolongadas de boca, calidad de captura |
| `SIMULADO` | Signos vitales, sueño, radiación, ejercicio, horario de misión, históricos 24 h / 7 días |
| `AUTORREPORTADO` | Cuestionario de fatiga, ánimo, estrés y síntomas |
| `PRUEBA LOCAL` | Prueba de tiempo de reacción |

Los frames de vídeo solo existen en memoria durante el procesamiento. No se graban, no se suben y no se almacenan.

## Arquitectura

```text
src/
  features/camera/      cámara, Face Landmarker, EAR, calibración, parpadeos, PERCLOS, sesión
  features/simulation/  escenarios deterministas y generador de datos simulados
  features/mission/     reloj y horario de misión
  features/alerts/      reglas y motor de alertas explicables (funciones puras)
  stores/               estado Zustand (cámara, salud, misión)
  components/           interfaz React (sin cálculos biométricos en JSX)
tests/                  tests unitarios
```

- Una sola instancia de Face Landmarker (`faceLandmarker.service.ts`), con fallback GPU → CPU.
- Un solo stream y un solo bucle de frames (`ocularSession.ts`), limitado a ~20 FPS.
- El `<video>` se monta una vez; minimizar, ocultar o expandir solo cambia clases CSS.
- Pausar detiene todas las pistas de la cámara.

Los parámetros del detector están en `src/features/camera/eyeMetrics.config.ts` y los de las alertas en `src/features/alerts/alertRules.ts`. Son valores experimentales, no umbrales médicos.

## Guion de demo (2–3 min)

1. Mostrar la misión `ARES-01` y el botón **Acerca de los datos**.
2. **Iniciar** la cámara y aceptar el permiso.
3. Calibrar: ojos abiertos unos segundos y tres parpadeos.
4. Parpadear y mantener los ojos cerrados ~1 s para ver la duración registrada.
5. **Minimizar**: la tarjeta *Vigilancia ocular* sigue contando.
6. Cambiar el escenario a **Déficit de sueño** y revisar *Tendencias* y *Alertas*.
7. Abrir el detalle de una alerta: señales, fuente, calidad y acción.
8. **Ocultar vídeo** (solo métricas) y después **Pausar**.
