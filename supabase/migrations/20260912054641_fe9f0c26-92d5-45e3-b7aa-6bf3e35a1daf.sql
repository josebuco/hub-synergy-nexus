CREATE POLICY "Authenticated can read invoices" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'faturas');
CREATE POLICY "Authenticated can upload invoices" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faturas');
CREATE POLICY "Authenticated can update invoices" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'faturas') WITH CHECK (bucket_id = 'faturas');
CREATE POLICY "Authenticated can delete invoices" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'faturas');