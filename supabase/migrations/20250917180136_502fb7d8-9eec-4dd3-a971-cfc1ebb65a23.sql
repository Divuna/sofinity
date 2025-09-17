-- Create the trigger function for EventLogs → AIRequests
CREATE OR REPLACE FUNCTION public.eventlogs_to_airequests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
    v_ai_id uuid;
begin
    -- Insert into AIRequests with proper event_name and metadata
    insert into public."AIRequests" (
        id, 
        user_id, 
        project_id, 
        type, 
        event_name, 
        metadata, 
        prompt, 
        status, 
        created_at
    )
    values (
        gen_random_uuid(),
        new.user_id,
        new.project_id,
        'event_forward',
        new.event_name,  -- This should preserve the event_name
        new.metadata,    -- This should preserve the metadata
        concat(
            'Event: ', coalesce(new.event_name, '<NULL>'),
            ' | Metadata: ', coalesce(new.metadata::text, '<NULL>')
        ),
        'waiting',
        now()
    )
    returning id into v_ai_id;

    -- Create campaigns only for specific events
    if new.event_name in ('voucher_purchased', 'prize_won') then
        insert into public."Campaigns" (
            id, 
            user_id, 
            project_id, 
            event_id, 
            name, 
            targeting, 
            status, 
            created_at
        )
        values (
            gen_random_uuid(),
            new.user_id,
            new.project_id,
            v_ai_id,
            'AI Campaign: ' || new.event_name,
            coalesce(new.metadata::text, '{}'),
            'draft',
            now()
        );
    end if;

    return new;
end;
$function$;

-- Create the trigger on EventLogs table
DROP TRIGGER IF EXISTS eventlogs_to_airequests_trigger ON public."EventLogs";
CREATE TRIGGER eventlogs_to_airequests_trigger
    AFTER INSERT ON public."EventLogs"
    FOR EACH ROW
    EXECUTE FUNCTION public.eventlogs_to_airequests();