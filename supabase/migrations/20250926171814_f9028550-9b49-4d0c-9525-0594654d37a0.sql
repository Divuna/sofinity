-- Create 5 test draft emails for OneMil batch processing testing
INSERT INTO "Emails" (
  user_id, 
  type, 
  project, 
  subject, 
  content, 
  status, 
  email_mode, 
  recipient,
  created_at
) VALUES 
(
  'bbc1d329-fe8d-449e-9960-6633a647b65a'::uuid,
  'campaign',
  'OneMil',
  'OneMil Test Email #1 - Batch Processing',
  'Toto je testovací e-mail #1 pro OneMil batch processing. Obsah tohoto e-mailu slouží k testování automatického zpracování draft e-mailů.',
  'draft',
  'test',
  'test1@example.com',
  now()
),
(
  '23e1d3d2-a0a0-40a0-b451-1c5775208572'::uuid,
  'campaign', 
  'OneMil',
  'OneMil Test Email #2 - Status Update',
  'Testovací e-mail #2 pro OneMil projekt. Tento e-mail testuje změnu statusu z draft na production během batch testu.',
  'draft',
  'test',
  'test2@example.com',
  now()
),
(
  '3ed40e96-20b9-4a3a-97a7-f937af688a1a'::uuid,
  'campaign',
  'OneMil', 
  'OneMil Test Email #3 - Notification Check',
  'Třetí testovací e-mail pro OneMil. Ověřuje vytváření notifikací při batch zpracování draft e-mailů.',
  'draft',
  'test',
  'test3@example.com',
  now()
),
(
  '60f5837e-a280-4ddd-b0dd-f94cc844bb3b'::uuid,
  'campaign',
  'OneMil',
  'OneMil Test Email #4 - Logging Verification', 
  'Čtvrtý testovací e-mail určený pro testování logovacích funkcí v batch zpracování OneMil projektu.',
  'draft',
  'test',
  'test4@example.com',
  now()
),
(
  'c3e5f389-3c0b-4ab6-8106-f3cf1252a6d2'::uuid,
  'campaign',
  'OneMil',
  'OneMil Test Email #5 - Final Batch Test',
  'Pátý a poslední testovací e-mail pro kompletní batch test OneMil systému. Testuje úplný workflow zpracování.',
  'draft', 
  'test',
  'test5@example.com',
  now()
);