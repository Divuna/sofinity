-- Delete all demo/sample projects from Projects table
DELETE FROM "Projects" 
WHERE is_demo = true
   OR name IN ('Demo Project', 'Ukázkový projekt 1', 'Ukázkový projekt 2', 'Vytvořit ukázkové projekty');