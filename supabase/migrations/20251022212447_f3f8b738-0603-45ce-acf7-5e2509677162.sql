-- Remove color codes from AI requests status view
DROP VIEW IF EXISTS v_ai_requests_status;

CREATE VIEW v_ai_requests_status AS
SELECT 
    id,
    user_id,
    project_id,
    type,
    prompt,
    response,
    status,
    event_name,
    event_id,
    agent_id,
    metadata,
    created_at,
    updated_at,
    CASE
        WHEN status = 'completed' THEN 'Dokončeno'
        WHEN status = 'waiting' THEN 'Čekání'
        WHEN status = 'error' THEN 'Chyba'
        ELSE 'Zpracovává se'
    END AS status_label
FROM "AIRequests"
ORDER BY updated_at DESC;