-- Delete all demo/sample projects from Projects table by name
DELETE FROM "Projects" 
WHERE name IN ('Demo Project', 'Ukázkový projekt 1', 'Ukázkový projekt 2', 'Vytvořit ukázkové projekty', 'Sample Project', 'Test Project');