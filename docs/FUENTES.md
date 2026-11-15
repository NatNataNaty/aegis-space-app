# Registro de fuentes y alcance de la evidencia

> Aportado por P2/P4 (Griss390, commit e20aea3). Sirve como «ficha de fuentes» de la entrega.

Consulta: 2026-11-14. Se consultaron páginas oficiales de las organizaciones, documentación de autores y especificaciones. Los enlaces son referencias de desarrollo; la app final debe empaquetar el contenido necesario y no depender de abrirlos durante una emergencia.

## Fuentes científicas, clínicas y de dispositivos

| ID | Fuente consultada | Aporte y límite |
| --- | --- | --- |
| S01 | [NASA: cinco peligros](https://www.nasa.gov/hrp/hazards/) | Taxonomía de radiación, aislamiento, distancia, gravedad y entorno cerrado. Contexto, no procedimiento clínico. |
| S02 | [NASA: riesgos](https://www.nasa.gov/hrp/risks/) | Catálogo público de 17 entradas en tres grupos. Base editorial acotada, no catálogo exhaustivo de todas las enfermedades ni umbrales. |
| S03 | [NASA: investigación HRP](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Estudios como ARCHeR, CIPHER y Standard Measures. Un estudio en curso no acredita una contramedida terapéutica. |
| S04 | [CSA: CANS y radiación, 26-02-2026](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Instrumentación de radiación neutrónica; no sensor de la banda de pulso de la demo. |
| S05 | [CSA: por qué investigar en el espacio](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Contexto divulgativo y beneficios en Tierra; no receta clínica. |
| S06 | [CSA: Bio-Monitor](https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp) | Camiseta, banda y aplicación especializada. Sus capacidades no demuestran compatibilidad con nuestro adaptador BLE. |
| S07 | [NASA: atención médica en vuelo](https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/) | Referencias de medicina operacional. No se ha obtenido de esta página un manual completo utilizable como diez protocolos aprobados. |
| S08 | [NASA: salud y atención médica](https://www.nasa.gov/reference/3-0-health-and-medical-care/) | Requisitos de capacidad médica según misión, recursos y necesidades de la tripulación. No sustituye instrucciones específicas de vuelo. |
| S09 | [NASA: adaptaciones cardiovasculares](https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/) | Contexto del riesgo cardíaco; no valida la fórmula de alarma del PDF. |
| S10 | [NASA: hipoxia](https://www.nasa.gov/reference/risk-of-hypoxia/) | Contexto del riesgo; necesita procedimiento operacional y configuración revisada. |
| S11 | [NASA: descompresión](https://www.nasa.gov/reference/risk-of-decompression-sickness/) | Riesgo asociado a cambios de presión. No extrapolar un protocolo submarino a EVA. |
| S12 | [NASA: lesiones y desempeño en EVA](https://www.nasa.gov/reference/risk-of-injury-and-compromised-performance-from-extravehicular-activity-eva/) | Contexto de lesiones y exigencias del traje; prevención no equivale a tratamiento. |
| S13 | [NASA: función sensoriomotora/vestibular](https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/) | Contexto para mareo y orientación; no clasificar cualquier mareo como adaptación benigna. |
| S14 | [NASA: riesgo SANS](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/) | Riesgo neuroocular. Los parpadeos o PERCLOS no diagnostican SANS. |
| S15 | [NASA: salud conductual](https://www.nasa.gov/directorates/esdmd/hhp/behavioral-health-risk/) | Riesgo y limitaciones de contramedidas en exploración. No inferir diagnósticos psiquiátricos desde un cuestionario o rostro. |
| S16 | [OMS: primeros auxilios psicológicos](https://www.who.int/publications/i/item/9789241548205) | Marco de apoyo humano, práctico y respetuoso; edición de 2011. No protocolo espacial ni sustituto de atención especializada. |
| S17 | [FDA: oxímetros](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters) | Limitaciones de precisión y necesidad de considerar síntomas. La página consultada identifica su guía de enero de 2025 como borrador. |
| S18 | [AHA: soporte vital básico adulto, 2025](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support) | Fuente clínica terrestre para revisión profesional. No se copiaron algoritmos ni se validó su adaptación a microgravedad. |
| S19 | [CDC Yellow Book: lesiones/descompresión en buceo](https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/scuba-diving-decompression-illness-and-other-dive-related-injuries.html) | Comparación fisiológica; su ámbito es buceo. No autoriza presiones, oxígeno ni recompresión para esta app. |

## Fuentes técnicas

| ID | Fuente | Uso |
| --- | --- | --- |
| T01 | [Chrome: Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth) | Contexto seguro, selección iniciada por usuario, GATT y desconexiones. |
| T02 | [MDN: requestDevice](https://developer.mozilla.org/en-US/docs/Web/API/Bluetooth/requestDevice) | Filtros y compatibilidad. Detectar soporte en el equipo real. |
| T03 | [Bluetooth SIG: Heart Rate Service 1.0](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html) | Formato, flags, notificaciones, limitaciones temporales. |
| T04 | [Dexie: diseño](https://dexie.org/docs/Tutorial/Design) | Tablas, índices y versiones. Dexie no cifra por sí solo. |
| T05 | [Dexie: transacciones](https://dexie.org/docs/Dexie/Dexie.transaction()) | Atomicidad y límites de operaciones asíncronas dentro de una transacción. |
| T06 | [MDN: encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) | API Web Crypto para cifrado. |
| T07 | [MDN: deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) | Derivación de claves, incluido PBKDF2. |
| T08 | [MDN: AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams) | IV único por clave y autenticación. |
| T09 | [OWASP: almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | Coste de derivación y sales. No acredita un PIN corto como secreto fuerte. |
| T10 | [MDN: cuotas y expulsión de almacenamiento](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Capacidad, errores y posible eliminación de datos. |
| T11 | [MDN: setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout) | Los temporizadores pueden retrasarse, especialmente en segundo plano. |
| T12 | [MDN: BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) | Comunicación entre contextos compatibles del mismo origen/partición; no red entre equipos. |
| T13 | [Zod: uso básico](https://zod.dev/basics) | Validación y manejo explícito de entradas inválidas. |
| T14 | [Vite PWA: recursos estáticos](https://vite-pwa-org.netlify.app/guide/static-assets) | Inclusión de recursos en precache. No basta colocarlos en cualquier carpeta. |
| T15 | [Playwright: reloj](https://playwright.dev/docs/clock) | Pruebas controladas de temporizadores. |
| T16 | [Playwright: setOffline](https://playwright.dev/docs/api/class-browsercontext#browser-context-set-offline) | Pruebas sin red después de preparar la instalación. |

## Cómo convertir una fuente en contenido

Propuesta editorial del proyecto:

1. Registrar autor/organización, título, URL, versión/fecha si consta y fecha de consulta.
2. Anotar la sección exacta que respalda cada afirmación; no citar solo una portada.
3. Clasificar: contexto, evidencia, procedimiento clínico, especificación técnica o decisión del producto.
4. Diferenciar la afirmación respaldada de su adaptación a la app.
5. Registrar aplicabilidad: Tierra/ISS/EVA/exploración; población y equipo requerido.
6. Para acciones clínicas, registrar aprobación profesional y procedimiento de misión; sin ellos conservar `reviewStatus: pendiente` y bloquear uso operacional.
7. Traducir y revisar equivalencia ES/EN sin alterar dosis, negaciones, unidades o condiciones.
8. Comprobar derechos antes de empaquetar medios/documentos; una URL pública no concede redistribución automática.

No se encontró en las fuentes consultadas justificación suficiente para publicar los diez tratamientos completos, sus dosis y todos sus umbrales como protocolos operacionales. Sí hay base para la taxonomía, el diseño de contratos, la demostración y una cola concreta de revisión.

## «Cómo prevenirlo» (contramedidas, añadido por P3)

Cada riesgo de `content/risks.json` puede llevar `prevention`: contramedidas descritas por NASA, parafraseadas, sin fármacos ni dosis. Sin URL propia, la fuente es la sección «What can be done about it?» de la página oficial del riesgo. Fuentes adicionales:

| ID | Fuente | Uso |
| --- | --- | --- |
| S20 | [NASA OCHMO-MTB-009 Circadian Desynchrony](https://www.nasa.gov/wp-content/uploads/2026/03/ochmo-mtb-009-circadian-desynchrony.pdf) | Horario de luz y cafeína antes de dormir. |
| S21 | [NASA-STD-3001 Radiation Protection brief](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) | Aviso oportuno para ir al refugio ante una tormenta solar. |
| S22 | [NASA OCHMO-MTB-004 Space Adaptation Sickness](https://www.nasa.gov/wp-content/uploads/2025/09/ochmo-mtb-004-space-adaptation-sickness-sas.pdf) | Sin caminatas espaciales en las primeras 72 h. |
| S23 | [NASA HSRB Bone Risk Record Rev C](https://www.nasa.gov/wp-content/uploads/2025/11/hsrb-bone-risk-record-rev-c-web.pdf) | Calcio y vitamina D suficientes. |
| S24 | [Human Research Roadmap: SANS](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105) | Revisiones oculares en vuelo. |
| S25 | [NTRS 20080026032: Human factors and ISS medical systems](https://ntrs.nasa.gov/api/citations/20080026032/downloads/20080026032.pdf) | Respaldo del primer paso «sujétate»: sujetar equipo, paciente y a uno mismo. |

## «Manual de a bordo» (primeros auxilios por situación, añadido por P3)

Cada protocolo lleva `manual` (señales de alarma y acciones rápidas), parafraseado de guías reconocidas, sin fármacos ni dosis. En pantalla no se muestran citas; las referencias están en «Acerca de los datos».

| ID | Fuente | Uso |
| --- | --- | --- |
| M01 | [AHA 2025 Adult BLS](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/executive-summary) | Compresiones 100–120/min, 5–6 cm. |
| M02 | [ERC / Resuscitation Council UK 2025 Adult BLS](https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-basic-life-support-guidelines) | Comprobar respuesta y respiración, pausas mínimas, DEA. |
| M03 | [AHA Heart attack warning signs](https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack) | Señales de alarma de dolor torácico. |
| M04 | [American Red Cross: life-threatening bleeding](https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external) | Presión directa. |
| M05 | [St John Ambulance: severe bleeding](https://www.sja.org.uk/get-advice/first-aid-advice/bleeding/severe-bleeding/) | Segundo apósito, objeto clavado, vigilar respuesta. |
| M06 | [WHO Psychological first aid (2011)](https://www.who.int/publications/i/item/9789241548205) | Observar, escuchar, conectar. |
| M07 | [FDA Pulse oximeters](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters) | Considerar síntomas aunque el oxímetro dude. |
| M08 | NASA (S20–S25 y páginas de riesgos) | Descompresión, mareo espacial, sueño, radiación, SANS, sujeción. |
