# Plan de trabajo P5 — QA, pruebas offline y accesibilidad

**Responsable:** P5  
**Alcance:** pruebas automatizadas, verificación sin red, accesibilidad y, solo si el MVP está estable y el equipo lo aprueba, evaluación de IA local.  
**Estado:** plan de trabajo; no implica que todos los casos descritos ya estén implementados.

## 1. Objetivo de P5

Entregar evidencia reproducible de que la aplicación funciona de forma segura y predecible, detecta errores sin colapsar y no depende de la red durante el uso previsto. Las pruebas deben validar el comportamiento acordado por el equipo, no certificar eficacia médica.

**Límites:**

- No inventar diagnósticos, umbrales, dosis ni protocolos clínicos.
- No presentar resultados de pruebas como validación clínica.
- No usar datos personales ni imágenes reales de tripulantes en fixtures; preferir datos sintéticos.
- No cambiar contratos Zod, módulos ajenos o configuración de CI sin coordinar con P1/P2/P4 y respetar `CODEOWNERS`.
- En las pruebas de red, bloquear conexiones externas y verificar el comportamiento de la app; no probar contra servicios o sistemas ajenos.

## 2. Estado inicial conocido del repositorio

La base actual usa **React + TypeScript + Vite + Vitest**. No asumir que las instrucciones de Next.js del plan maestro ya están implementadas.

Ya hay pruebas unitarias en `tests/` para:

- `eyeAspectRatio.test.ts`: EAR, landmarks ausentes o degenerados y mediana.
- `blinkDetector.test.ts`: eventos, histéresis, duración, estado `unknown` y FPS.
- `perclos.test.ts`: porcentaje, exclusión de cierres cortos, frames inválidos y cobertura insuficiente.
- `simulation.test.ts`: reproducibilidad, procedencia simulada, escenarios e históricos.
- `alertEngine.test.ts`: alertas oculares/combinadas, procedencia, descanso y variaciones simuladas.

Por tanto, el primer trabajo es ejecutar y revisar estas pruebas; no duplicar casos que ya están cubiertos. Playwright y axe están en dependencias, pero antes de planificar E2E hay que comprobar configuración, scripts y estado real de la app. Coordinar con P1 cualquier cambio de configuración compartida.

## 3. Pasos para empezar

1. Sincronizar la rama local con `origin/main` (usar el procedimiento del equipo; por ejemplo, `git pull --rebase origin main`).
2. Crear una rama de tarea, por ejemplo `feat/p5-qa-plan` para este documento y luego `feat/p5-unit-tests` para cambios de pruebas.
3. Revisar `CODEOWNERS` y confirmar con el equipo cualquier archivo compartido que se necesite modificar.
4. Ejecutar y anotar el estado inicial:

   ```bash
   npm test
   npm run typecheck
   npm run build
   ```

5. Separar fallos preexistentes de regresiones nuevas. Guardar comandos, resultado y notas en el PR o en la issue.
6. Elegir un lote acotado, implementar pruebas en `tests/`, volver a ejecutar los comandos y abrir un PR pequeño para revisión.

## 4. Tandas de trabajo

### Tanda 0 — Línea base y mapa de cobertura (primero)

**Tareas**

- Ejecutar `npm test`, `npm run typecheck` y `npm run build` en la base sincronizada.
- Leer las pruebas ya existentes y marcar qué reglas cubren.
- Identificar huecos reales sin reescribir pruebas equivalentes.

**Aceptación**

- Hay un registro claro de comandos, resultados y fallos preexistentes.
- El equipo sabe qué comportamiento ya está probado y qué falta.

### Tanda 1 — Pruebas unitarias de mayor prioridad

**Enfoque:** completar únicamente brechas de lógica pura, usando Vitest y fixtures sintéticos. Revisar primero si la regla ya está cubierta en `perclos.test.ts`, `alertEngine.test.ts` o `simulation.test.ts`.

Lista de comprobación:

- [ ] Datos ausentes, inválidos o con calidad `unavailable` no se convierten en mediciones válidas ni provocan alertas oculares indebidas.
- [ ] La cobertura insuficiente de PERCLOS produce el estado no disponible (`null`), no un cero engañoso.
- [ ] El periodo de descanso no clasifica los cierres oculares como anomalía.
- [ ] Las alertas combinadas conservan el origen individual de cada señal (`camera_live`, `simulated`, etc.).
- [ ] La simulación es reproducible para los mismos parámetros acordados.
- [ ] Las entradas límite y valores ausentes se manejan de forma explícita.

**Nota:** varios de estos puntos ya aparecen en las pruebas actuales. Añadir solo aserciones o escenarios que falten tras comprobar la línea base.

**Aceptación**

- Cada caso está vinculado a una regla existente del producto.
- Las pruebas son deterministas, no dependen de cámara, reloj real, red ni orden de ejecución.
- `npm test`, `npm run typecheck` y `npm run build` pasan.

### Tanda 2 — Pruebas de interfaz y fallos controlados

**Tareas**

- Comprobar navegación y renderizado de las secciones principales.
- Verificar estados de carga, error y ausencia de datos.
- Probar que una cámara denegada/no disponible o un error del modelo se comunica con claridad y no inutiliza las funciones independientes de cámara.
- Revisar que cambiar de escenario no mezcle datos simulados con lecturas en vivo.

**Aceptación**

- La UI comunica estados sin mostrar datos inventados ni dejar controles bloqueados.
- Los tests no necesitan hardware real; usar mocks para APIs del navegador.
- Acordar con P3 si se deben tocar componentes o textos fuera del área P5.

### Tanda 3 — E2E sin conexión

**Antes de empezar:** verificar que Playwright esté configurado y acordar con P1 los cambios a `package.json`, configuración y CI. La existencia de dependencias por sí sola no significa que E2E esté listo.

**Casos**

- [ ] Arrancar la app con navegador y contexto de prueba controlados.
- [ ] Bloquear solicitudes de red externas durante el uso y detectar cualquier intento inesperado.
- [ ] Verificar que la pantalla inicial y los recursos locales necesarios cargan sin red, según lo que soporte actualmente el proyecto.
- [ ] Comprobar un flujo principal y una ruta de error sin conectividad.
- [ ] Confirmar que un fallo de un módulo opcional no impide usar el resto de la aplicación.

**Aceptación**

- La prueba no depende de internet ni llama servicios externos reales.
- Las excepciones de red locales se documentan y aprueban explícitamente.
- No afirmar que la PWA funciona offline hasta verificar instalación/caché y arranque real en el navegador.

### Tanda 4 — Accesibilidad

**Tareas**

- Ejecutar axe en las pantallas y estados principales cuando la prueba E2E esté disponible.
- Revisar teclado, foco visible, etiquetas accesibles, nombres de controles y mensajes de error.
- Comprobar contraste y que color no sea el único medio para transmitir estado.
- Registrar hallazgos con pantalla, paso para reproducir, severidad y responsable; coordinar reparaciones de UI con P3.

**Aceptación**

- No hay violaciones críticas/bloqueantes sin issue y responsable.
- La revisión automatizada se complementa con una comprobación manual básica de teclado; axe no sustituye una auditoría completa.

### Tanda 5 — Regresión y evidencia para entrega

**Tareas**

- Ejecutar toda la batería después de integrar cambios.
- Repetir el flujo offline en el artefacto o entorno de entrega acordado.
- Publicar en el PR un resumen de pruebas pasadas/fallidas, pasos manuales y limitaciones conocidas.
- Revisar que fixtures no contengan datos personales, secretos ni contenido clínico sin fuente.

**Aceptación**

- CI y comandos locales acordados pasan o los fallos están explicados y asignados.
- La evidencia identifica versión/commit, entorno y pasos reproducibles.
- No se presenta la app como dispositivo médico validado.

### Extra — IA local (solo después del MVP y con aprobación)

No es prioridad inicial. Si se autoriza, probar como mínimo: modelo ausente/sin recursos, respuesta fuera de la base de conocimiento, citas de fuente, contenido pendiente de revisión médica y recuperación ante error. La IA no debe modificar registros ni reemplazar el flujo determinista crítico. Coordinar implementación y criterios con P1 y el equipo.

## 5. Plantilla breve para documentar un caso

```text
ID / prioridad:
Regla o requisito relacionado:
Precondiciones / datos sintéticos:
Pasos:
Resultado esperado:
Resultado observado:
Tipo: unitario / UI / E2E / manual / accesibilidad
Comando y entorno:
Issue o PR:
```

## 6. Checklist de PR de P5

- [ ] Rama actualizada y cambios limitados al alcance acordado.
- [ ] No se duplican pruebas existentes.
- [ ] Casos deterministas y datos sintéticos.
- [ ] `npm test` ejecutado.
- [ ] `npm run typecheck` ejecutado.
- [ ] `npm run build` ejecutado.
- [ ] En cambios E2E: configuración y CI coordinadas con P1.
- [ ] En cambios UI: coordinación con P3; contratos/contenido: P2; persistencia/motores: P4.
- [ ] PR incluye propósito, cobertura, resultados y limitaciones.
- [ ] Sin afirmaciones de diagnóstico ni validación clínica.
