-- Recreate trigger with correct case
DROP TRIGGER IF EXISTS eventlogs_to_airequests_trigger ON public."EventLogs";
CREATE TRIGGER eventlogs_to_airequests_trigger
    AFTER INSERT ON public."EventLogs"
    FOR EACH ROW
    EXECUTE FUNCTION public.eventlogs_to_airequests();