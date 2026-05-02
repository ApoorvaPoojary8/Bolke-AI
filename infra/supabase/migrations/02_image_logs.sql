-- Image analysis logs  
CREATE TABLE IF NOT EXISTS image_analysis_logs (  
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  device_id_hash  TEXT NOT NULL,  
  document_type   TEXT,  
  target_language CHAR(2),  
  confidence      FLOAT,  
  latency_ms      INTEGER,  
  created_at      TIMESTAMPTZ DEFAULT now()  
);

ALTER TABLE image_analysis_logs ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "service_only" ON image_analysis_logs  
  USING (auth.role() = 'service_role');
