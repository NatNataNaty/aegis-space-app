-- ==============================================================================
-- AEGIS Space Med - Base de Datos en Tierra (Supabase Schema)
-- Modelo relacional para telemetría, registro de alertas, protocolos y enlace Tierra
-- ==============================================================================

-- 1. Tabla de telemetría médica y signos vitales de la tripulación
CREATE TABLE IF NOT EXISTS crew_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT NOT NULL DEFAULT 'ARES-01',
  crew_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  heart_rate NUMERIC,
  spo2 NUMERIC,
  perclos NUMERIC,
  ear NUMERIC,
  radiation_dose NUMERIC,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Registro histórico de alertas médicas y anomalías detectadas a bordo
CREATE TABLE IF NOT EXISTS alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT NOT NULL DEFAULT 'ARES-01',
  alert_id TEXT NOT NULL,
  crew_id TEXT,
  level TEXT NOT NULL CHECK (level IN ('info', 'caution', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Registro de ejecución de protocolos clínicos de soporte a la decisión (Triage)
CREATE TABLE IF NOT EXISTS protocol_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT NOT NULL DEFAULT 'ARES-01',
  protocol_id TEXT NOT NULL,
  protocol_title TEXT NOT NULL,
  crew_id TEXT NOT NULL,
  operator_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('started', 'in_progress', 'completed', 'aborted')),
  review_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (review_status IN ('pendiente', 'revisado')),
  steps_data JSONB DEFAULT '[]'::jsonb,
  outcome TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Notas e instrucciones del equipo médico y de apoyo en Tierra (Flight Surgeons)
CREATE TABLE IF NOT EXISTS ground_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT NOT NULL DEFAULT 'ARES-01',
  author_role TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent', 'emergency')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta frecuente para telemetría y consultas por tripulante / tiempo
CREATE INDEX IF NOT EXISTS idx_crew_telemetry_mission_time ON crew_telemetry (mission_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crew_telemetry_crew ON crew_telemetry (crew_id);
CREATE INDEX IF NOT EXISTS idx_alerts_log_mission ON alerts_log (mission_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_runs_mission ON protocol_runs (mission_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ground_notes_mission ON ground_notes (mission_id, created_at DESC);

-- ==============================================================================
-- Seguridad RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE crew_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ground_notes ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para cliente de nave con anon key o autenticado
-- (Permite a la nave enviar telemetría, eventos y consultar notas de Tierra)
CREATE POLICY "Permitir insercion y lectura de telemetria"
  ON crew_telemetry FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir insercion y lectura de alertas"
  ON alerts_log FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir insercion y lectura de protocolos"
  ON protocol_runs FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir lectura y gestion de notas de Tierra"
  ON ground_notes FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- Publicación Realtime para sincronización bidireccional cuando hay enlace
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE crew_telemetry;
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts_log;
    ALTER PUBLICATION supabase_realtime ADD TABLE protocol_runs;
    ALTER PUBLICATION supabase_realtime ADD TABLE ground_notes;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Las tablas ya pertenecen a la publicación
    NULL;
END $$;
