-- TTS audio bucket (public read, backend write)  
INSERT INTO storage.buckets (id, name, public)  
VALUES ('tts-audio', 'tts-audio', true)  
ON CONFLICT (id) DO NOTHING;

-- Image analysis audio bucket  
INSERT INTO storage.buckets (id, name, public)  
VALUES ('image-audio', 'image-audio', true)  
ON CONFLICT (id) DO NOTHING;

-- Bucket policies  
CREATE POLICY "Public read tts-audio"  
  ON storage.objects FOR SELECT  
  USING (bucket_id = 'tts-audio');

CREATE POLICY "Service write tts-audio"  
  ON storage.objects FOR INSERT  
  WITH CHECK (bucket_id = 'tts-audio' AND auth.role() = 'service_role');

CREATE POLICY "Public read image-audio"  
  ON storage.objects FOR SELECT  
  USING (bucket_id = 'image-audio');

CREATE POLICY "Service write image-audio"  
  ON storage.objects FOR INSERT  
  WITH CHECK (bucket_id = 'image-audio' AND auth.role() = 'service_role');
