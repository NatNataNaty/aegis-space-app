# Checklist de trabajo P5 — Visión y QA

**Repositorio:** `NatNataNaty/aegis-space-med`  
**Responsable:** P5  
**Actualizado para:** `main` después de integrar P1 (PWA/CSP/Supabase) y P3 (i18n ES/EN y router).  
**Propósito:** llevar el seguimiento del QA y la integración P5 sin duplicar pruebas ni interferir con módulos de otras personas.

> Marca una casilla solo cuando hayas ejecutado o verificado el punto y anota el commit, resultado o issue correspondiente. Que exista código no significa que ya haya sido probado en el entorno objetivo.

## Reglas de trabajo

- Trabajar en una rama propia `feat/p5-...`; actualizarla desde `origin/main` antes de iniciar cada tanda.
- No subir cambios de WASM que sean efectos secundarios de `npm ci`; conservar los assets de `main` salvo que P1 coordine una actualización intencional.
- Mantener fixtures sintéticos: no usar datos médicos personales ni secretos.
- No inventar diagnósticos, umbrales, dosis ni protocolos. Las pruebas verifican contratos y comportamientos aprobados, no eficacia clínica.
- Coordinar con P1 cambios en CI, `package.json`, configuración de Playwright o PWA; con P2 contratos y contenido clínico; con P3 UI/i18n; con P4 sensores, alertas, perfiles y persistencia.
- No publicar claves de Supabase en commits, capturas, logs ni mensajes. La QA offline debe funcionar sin claves.
- Registrar defectos con pasos reproducibles, resultado esperado/observado, commit y responsable. No arreglar archivos de otro módulo sin coordinación.

## Estado del repositorio que guía este checklist

En la versión de `main` revisada tras la integración de P3:

- La aplicación usa React, TypeScript, Vite y Vitest.
- P1 integró PWA/offline, CSP, configuración de despliegue y enlace/outbox de Supabase.
- P3 integró i18n local ES/EN, selector de idioma, React Router y páginas iniciales de protocolo, emergencia y control.
- `tests/i18n.test.ts` comprueba igualdad de claves ES/EN y que las traducciones no estén vacías.
- Hay pruebas unitarias de cámara/visión (`eyeAspectRatio`, `blinkDetector`, `perclos`), simulación, alertas y enlace/outbox (`earthLink`). No repetir casos ya cubiertos; revisar los archivos de `tests/` antes de añadir otros.
- Las páginas de protocolo, emergencia y control de P3 son actualmente provisionales. La existencia de una ruta no significa que el flujo funcional esté terminado.
- Playwright y axe están en dependencias, pero `package.json` todavía no declara un script E2E dedicado ni se ha confirmado una configuración Playwright lista para el flujo offline.
- El workflow CI ejecuta instalación, typecheck, pruebas unitarias y build en `push`/`pull_request`; coordinar con P1 antes de añadirle E2E.
- Perfiles/PIN y contratos de protocolos/alertas dependen de la entrega y confirmación de P2/P4.

## Tanda 0 — Sincronización y línea base

**Objetivo:** comprobar el estado integrado actual antes de cambiar código.

- [ ] Confirmar rama P5 y árbol de trabajo limpio: `git status -sb`.
- [ ] Obtener cambios remotos: `git fetch origin`.
- [ ] Integrar `origin/main` en la rama P5 según el procedimiento acordado; si hay conflictos, detenerse y pedir revisión antes de resolverlos.
- [ ] Ejecutar `npm ci`.
- [ ] Si `npm ci` modifica WASM versionados, restaurar solo esos assets y verificar el estado:

  ```bash
  git restore -- public/mediapipe/wasm/vision_wasm_internal.js public/mediapipe/wasm/vision_wasm_module_internal.js
  git status --short
  ```

- [ ] Ejecutar `npm test` y anotar resultado/número de pruebas.
- [ ] Ejecutar `npm run typecheck`.
- [ ] Ejecutar `npm run build`; registrar advertencias aunque el build termine bien.
- [ ] Registrar commit probado, sistema operativo, comandos y fallos preexistentes en el PR o en la sección de progreso.

**Resultado de la última línea base local conocida:** 31 pruebas pasaron y `typecheck`/`build` pasaron antes de integrar los cambios recientes de P3 y P1. **Hay que repetir en el `main` actual; no se considera validación de la versión nueva.**

## Tanda 1 — Revisar cobertura existente de visión y alertas

**Objetivo:** confirmar que los tests existentes siguen cubriendo las reglas principales y añadir pruebas solo para huecos reales.

Cobertura ya presente (revisar, no duplicar):

- `tests/eyeAspectRatio.test.ts`: EAR, landmarks no válidos y mediana.
- `tests/blinkDetector.test.ts`: eventos de cierre, histéresis, duración, `unknown` y calidad FPS.
- `tests/perclos.test.ts`: porcentaje, exclusión de cierres cortos, frames inválidos y cobertura insuficiente.
- `tests/alertEngine.test.ts`: cierres repetidos/aislados, calidad no disponible, descanso, alerta combinada y origen de señales.
- `tests/simulation.test.ts`: determinismo, origen simulado, escenarios e históricos.

Checklist:

- [ ] Ejecutar los tests actuales en la rama actualizada y registrar resultado.
- [ ] Comparar los casos presentes con reglas de `eyeMetrics.config.ts` y `alertRules.ts`; los umbrales se toman del código aprobado, no se inventan en QA.
- [ ] Añadir únicamente casos límite no cubiertos (por ejemplo, entradas nulas/malformadas o transiciones relevantes), en tests unitarios deterministas.
- [ ] Confirmar que datos ausentes o de calidad insuficiente no se transformen en una lectura válida ni causen alerta ocular indebida.
- [ ] Verificar que la señal de cámara se mantenga distinguible de datos simulados/autorreporte.
- [ ] Ejecutar `npm test`, `npm run typecheck` y `npm run build` tras los cambios.

**Aceptación:** pruebas reproducibles sin cámara real, internet ni tiempo aleatorio; cada caso corresponde a una regla existente.

## Tanda 2 — QA exploratorio de la integración actual de P3

**Objetivo:** encontrar problemas y reportarlos sin editar las pantallas que P3 sigue mejorando.

En local, arrancar `npm run dev` y recorrer:

- [ ] `/` carga el panel.
- [ ] El selector cambia entre ES y EN; comprobar nombres accesibles y estado seleccionado.
- [ ] Recargar después de cambiar idioma: verificar si se conserva la preferencia.
- [ ] Abrir `/emergencia` y `/control`; confirmar carga y regreso al panel.
- [ ] Abrir rutas `/es/protocolos/<id>` y `/en/protocolos/<id>`; comprobar idioma y que el identificador de ruta no rompa la página.
- [ ] Abrir `/protocolos/<id>` sin idioma; comprobar redirección al idioma actual.
- [ ] Probar idioma o ruta inexistente; comprobar pantalla 404 controlada.
- [ ] Recargar directamente una ruta secundaria en servidor local/preview; reportar errores de rewrite si aparecen.
- [ ] Probar navegación básica con teclado (Tab, Shift+Tab, Enter, Escape si aplica) y registrar hallazgos sin cambiar CSS/componentes de P3.

Para cada defecto registrar: URL, idioma, pasos, esperado, observado, navegador/tamaño de pantalla y captura sin datos sensibles. Las pantallas provisionales se prueban solo por el comportamiento que ya ofrecen; no se marca como defecto que el contenido de protocolo esté pendiente si así está indicado.

## Tanda 3 — E2E Playwright sin red

**Antes de implementar:** coordinar con P1 la configuración compartida, scripts de `package.json`, instalación de navegadores y ejecución en CI. No cambiar workflow o configuración de PWA unilateralmente.

Casos propuestos, tras acuerdo y cuando las rutas estén suficientemente estables:

- [ ] Configurar una prueba smoke que arranque el build local en un servidor de prueba.
- [ ] Bloquear y registrar solicitudes externas durante el flujo (sin contactar servicios reales).
- [ ] Verificar que el panel carga con recursos empaquetados/locales.
- [ ] Verificar navegación entre panel, emergencia, control y una ruta de protocolo.
- [ ] Verificar cambio ES/EN y persistencia de idioma si ese comportamiento está aprobado.
- [ ] Simular rechazo/ausencia de cámara y comprobar mensaje/recuperación sin hardware físico.
- [ ] Verificar comportamiento de la app cuando Supabase no está configurado o la red está bloqueada, sin proporcionar secretos.
- [ ] Comprobar offline de primera carga y offline tras instalación/cache por separado; no afirmar soporte offline completo si solo funciona después de precargar.
- [ ] Añadir E2E a CI solo con aprobación de P1 y documentar navegador/entorno.

**Aceptación:** ninguna petición externa inesperada, sin dependencia de secretos, datos deterministas y resultado reproducible localmente/CI.

## Tanda 4 — Integración de alertas oculares con protocolos (dependencia P2/P4)

**Bloqueada hasta que P2/P4 publiquen y confirmen los contratos y los módulos correspondientes.** No inventar IDs ni relacionar síntomas con protocolos sin aprobación de contenido.

- [ ] Pedir a P2 el contrato acordado de `Protocol`/`AlertRule`, IDs disponibles, idioma y estado de revisión médica.
- [ ] Pedir a P4 el contrato del evento de alerta y el punto de integración con las alertas oculares de ASTRA.
- [ ] Acordar con P2/P4 el mapeo explícito de reglas a IDs de protocolo; registrar decisiones y excepciones.
- [ ] Crear fixtures sintéticos que cumplan los esquemas compartidos.
- [ ] Probar que una alerta enlazada abre el protocolo correcto y mantiene el idioma esperado.
- [ ] Probar ID inexistente, protocolo no disponible y contenido pendiente de revisión; el sistema debe fallar de forma controlada y no presentar la alerta como diagnóstico.
- [ ] Probar procedencia: la señal ocular sigue marcada como cámara/observación y no se confunde con datos simulados.
- [ ] Revisar con P2 cualquier texto clínico; P5 valida el comportamiento técnico, no aprueba contenido médico.

## Tanda 5 — Perfiles/PIN y protección de datos (dependencia P4)

**Bloqueada hasta que P4 publique la implementación y el contrato de prueba.** Usar únicamente cuentas y datos ficticios.

- [ ] Obtener de P4 el flujo esperado de alta, desbloqueo, cierre/bloqueo y errores de PIN.
- [ ] Probar PIN válido e inválido según reglas aprobadas, sin guardar ni imprimir PIN en logs.
- [ ] Probar bloqueo/cierre de sesión y reingreso según los requisitos definidos por P4.
- [ ] Comprobar aislamiento de datos entre perfiles de prueba.
- [ ] Comprobar que los errores de almacenamiento/cifrado se manejan sin exponer registros.
- [ ] No inferir ni añadir reglas de recuperación, límite de intentos o bloqueo progresivo: deben estar definidas por P4/producto.

## Tanda 6 — Accesibilidad con UI estabilizada

**Coordinar correcciones con P3.** axe ayuda a detectar problemas, pero no sustituye pruebas manuales.

- [ ] Ejecutar axe en panel, cambio de idioma, emergencia, control y protocolo cuando estén disponibles.
- [ ] Revisar controles con nombres accesibles, etiquetas, foco visible y orden de tabulación.
- [ ] Verificar que el idioma de documento cambia correctamente (`html lang`) al alternar ES/EN y al abrir una ruta con idioma.
- [ ] Revisar mensajes de error, contraste y que color no sea el único indicador.
- [ ] Registrar violaciones con pantalla, selector/elemento, severidad y pasos; acordar responsable P3.
- [ ] Repetir pruebas tras los cambios visuales de P3.

## Tanda 7 — Regresión, PR y evidencia

- [ ] Actualizar la rama P5 desde `origin/main` antes de cerrar la tanda.
- [ ] Ejecutar `npm test`, `npm run typecheck` y `npm run build`.
- [ ] Ejecutar Playwright/axe si ya están configurados y aprobados.
- [ ] Revisar `git status`; no incluir `dist/`, secretos ni cambios incidentales en WASM.
- [ ] Abrir PR pequeño hacia `main` con propósito, alcance, evidencia, pruebas pasadas/fallidas y limitaciones.
- [ ] Pedir revisión a los propietarios del módulo tocado; no asumir que las asignaciones de `CODEOWNERS` están activas si sus usuarios están comentados.
- [ ] No declarar “funciona offline”, “seguro” o “validado clínicamente” más allá de lo comprobado y del alcance técnico de las pruebas.

## Dependencias y coordinación

| Trabajo P5 | Depende de | Acción de coordinación |
|---|---|---|
| E2E/CI/offline | P1 | Acordar Playwright, scripts, servidor de prueba y workflow |
| Protocolos y mapeo de alertas | P2 + P4 | Confirmar esquemas, IDs, eventos y reglas de relación |
| Perfiles/PIN | P4 | Esperar contrato e implementación; pedir criterios de aceptación |
| Accesibilidad visual | P3 | Reportar hallazgos; coordinar arreglos mientras evoluciona la interfaz |
| Unit tests de visión existentes | Código actual P4/P5 | Auditar cobertura y añadir solo huecos, sin alterar lógica ajena |

## Registro de progreso

Añadir una fila por tanda ejecutada:

| Fecha | Tanda | Rama/commit probado | Resultado | Hallazgos / issue / PR |
|---|---|---|---|---|
|  |  |  |  |  |

## Plantilla para reportar un defecto de QA

```text
Título:
Prioridad:
Commit / rama:
Entorno (SO, navegador, versión):
Precondiciones y datos sintéticos:
Pasos para reproducir:
Resultado esperado:
Resultado observado:
¿Reproducible?:
Captura/log sin información sensible:
Módulo responsable / persona a coordinar:
```
