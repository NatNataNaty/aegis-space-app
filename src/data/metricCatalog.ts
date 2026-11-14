export interface MetricInfo {
  label: string;
  what: string;
  note?: string;
}

export const METRIC_INFO = {
  heartRate: {
    label: "Frecuencia cardíaca",
    what: "Latidos por minuto generados por el escenario de demostración.",
    note: "Dato simulado. No procede de ningún sensor.",
  },
  spo2: {
    label: "SpO₂",
    what: "Saturación de oxígeno en sangre simulada.",
    note: "La cámara no mide SpO₂ en este prototipo.",
  },
  bloodPressure: {
    label: "Presión arterial",
    what: "Presión sistólica / diastólica simulada en mmHg.",
    note: "Dato simulado. Las etiquetas describen el escenario, no un diagnóstico.",
  },
  temperature: {
    label: "Temperatura corporal",
    what: "Temperatura central simulada en °C.",
  },
  respRate: {
    label: "Frecuencia respiratoria",
    what: "Respiraciones por minuto simuladas.",
  },
  glucose: {
    label: "Glucosa",
    what: "Glucosa en sangre simulada en mg/dL. Indicador secundario.",
  },
  sleep: {
    label: "Sueño",
    what: "Horas de sueño del último ciclo estimadas por una actigrafía ficticia.",
    note: "La cámara no mide el sueño. Una actigrafía real requeriría un wearable.",
  },
  perclos: {
    label: "PERCLOS",
    what: "Porcentaje del tiempo válido con los ojos casi cerrados (≥ 80 % de reducción frente a tu apertura de referencia), excluyendo parpadeos de menos de 400 ms.",
    note: "Ventanas móviles de 1 y 5 min. Sin cobertura suficiente se muestra «No disponible». No es un diagnóstico de somnolencia.",
  },
  blinkRate: {
    label: "Parpadeos por minuto",
    what: "Reaperturas confirmadas por minuto de tiempo válido.",
    note: "No existe un valor normal universal: depende de la tarea y de cada persona.",
  },
  closures: {
    label: "Cierres",
    what: "Parpadeo < 400 ms · cierre prolongado 400–499 ms · cierre largo ≥ 500 ms.",
    note: "Cortes experimentales del detector, no umbrales médicos ni prueba de microsueño.",
  },
  ear: {
    label: "Apertura ocular (EAR)",
    what: "Eye Aspect Ratio: relación entre la altura y la anchura del ojo a partir de 6 puntos faciales, normalizada con tu calibración.",
  },
  quality: {
    label: "Calidad de captura",
    what: "Combina FPS, presencia del rostro, visibilidad de los ojos, orientación de la cabeza e iluminación.",
    note: "Con calidad insuficiente las métricas pasan a «No disponible» y no se generan alertas.",
  },
  yawn: {
    label: "Aperturas prolongadas de boca",
    what: "Coeficiente jawOpen mantenido ≥ 1,5 s. Puede representar un posible bostezo, pero no lo demuestra.",
  },
  radiation: {
    label: "Radiación acumulada",
    what: "Dosis acumulada demostrativa en mSv para un tránsito interplanetario.",
    note: "Valor ilustrativo, no una medición dosimétrica.",
  },
  exercise: {
    label: "Ejercicio",
    what: "Minutos de ejercicio completados según el horario simulado.",
  },
  reaction: {
    label: "Tiempo de reacción",
    what: "Prueba local breve: pulsa en cuanto aparezca el estímulo. Resultado real de tu interacción.",
  },
} satisfies Record<string, MetricInfo>;

export type MetricId = keyof typeof METRIC_INFO;
