-- Users  
CREATE TABLE IF NOT EXISTS users (  
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  phone_hash    TEXT UNIQUE NOT NULL,  
  language_pref CHAR(2) DEFAULT 'hi',  
  created_at    TIMESTAMPTZ DEFAULT now()  
);

-- Sessions  
CREATE TABLE IF NOT EXISTS sessions (  
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,  
  jwt_id     TEXT UNIQUE NOT NULL,  
  expires_at TIMESTAMPTZ NOT NULL  
);

-- Query logs (NO PII stored here)  
CREATE TABLE IF NOT EXISTS query_logs (  
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  device_id_hash TEXT NOT NULL,  
  intent         TEXT,  
  language       CHAR(2),  
  latency_ms     INTEGER,  
  created_at     TIMESTAMPTZ DEFAULT now()  
);

-- Audio uploads (24h TTL)  
CREATE TABLE IF NOT EXISTS audio_uploads (  
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  storage_path TEXT NOT NULL,  
  expires_at   TIMESTAMPTZ NOT NULL,  
  created_at   TIMESTAMPTZ DEFAULT now()  
);

-- Enable RLS on all tables  
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;  
ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;  
ALTER TABLE query_logs    ENABLE ROW LEVEL SECURITY;  
ALTER TABLE audio_uploads ENABLE ROW LEVEL SECURITY;

-- Only service role can access (backend uses service role key)  
CREATE POLICY "service_only" ON users  
  USING (auth.role() = 'service_role');  
CREATE POLICY "service_only" ON sessions  
  USING (auth.role() = 'service_role');  
CREATE POLICY "service_only" ON query_logs  
  USING (auth.role() = 'service_role');  
CREATE POLICY "service_only" ON audio_uploads  
  USING (auth.role() = 'service_role');
