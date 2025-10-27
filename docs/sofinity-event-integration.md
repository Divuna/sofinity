# Sofinity Event Integration Guide

## Overview

All external projects (OneMil, Opravo, BikeShare24, CoDneska) must send events to the Sofinity Event API instead of writing directly to the database. This ensures proper event standardization and unified tracking across all systems.

## API Endpoint

```
POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-event
```

## Authentication

All requests must include the Sofinity API key in the headers:

```
x-api-key: YOUR_SOFINITY_API_KEY
```

OR

```
Authorization: Bearer YOUR_SOFINITY_API_KEY
```

## Request Format

```json
{
  "project_id": "uuid",
  "event_name": "string",
  "source_system": "string",  // 'onemill' | 'opravo' | 'bikeshare24' | 'codneska'
  "user_id": "uuid (optional)",
  "metadata": {
    // Any additional event data
  }
}
```

### Required Fields

- **project_id**: UUID of the project in Sofinity system
- **event_name**: Original event name from your system
- **source_system**: Identifier for your system (see below)

### Optional Fields

- **user_id**: UUID of the user who triggered the event
- **metadata**: Object containing any additional event data
  - **player_id**: OneSignal player_id for push notifications (recommended for user events)
  - **device_type**: Device type for push notifications ('mobile' | 'web' | 'tablet')

## Player ID for Push Notifications

To enable push notification delivery via OneSignal, include the `player_id` in event metadata:

```json
{
  "project_id": "uuid",
  "event_name": "user_registered",
  "source_system": "onemill",
  "user_id": "uuid",
  "metadata": {
    "player_id": "abc123-def456-ghi789",
    "device_type": "mobile",
    "email": "user@example.com"
  }
}
```

**Automatic Processing:**
When a `player_id` is detected in event metadata:
1. ✅ Saved to `user_devices` table via `save_player_id()` RPC
2. ✅ Updated in `profiles.onesignal_player_id` for backward compatibility
3. ✅ Enables push notification delivery through the `create_notification` trigger

**Important Notes:**
- `player_id` is only processed when a valid `user_id` is provided
- Events without `player_id` will still be logged normally
- Missing `player_id` will trigger a warning in function logs

## Source Systems

Each external project must identify itself with the correct `source_system` value:

| Project | source_system |
|---------|--------------|
| OneMil | `onemill` |
| Opravo | `opravo` |
| BikeShare24 | `bikeshare24` |
| CoDneska | `codneska` |

## Event Standardization

The Sofinity Event API automatically standardizes event names based on mappings in the EventTypes table:

### OneMil Events

| Original Event | Standardized Event |
|---------------|-------------------|
| `prize_won` | `reward_distributed` |
| `coin_redeemed` | `points_redeemed` |
| `voucher_purchased` | `voucher_acquired` |
| `user_registered` | `user_registered` |
| `notification_sent` | `notification_sent` |
| `contest_closed` | `contest_completed` |
| `contest_created` | `contest_created` |
| `ticket_created` | `entry_created` |

### Opravo Events

| Original Event | Standardized Event |
|---------------|-------------------|
| `job_created` | `service_request_created` |
| `offer_received` | `quote_received` |
| `job_completed` | `service_completed` |

### Unmapped Events

If an event is not found in the EventTypes mapping table:
- The original event name will be used as-is
- The event will be logged to `audit_logs` with `event_name: 'unmapped_event_detected'`
- You should add a mapping to the EventTypes table for this event

## Example Requests

### OneMil Prize Won Event

```bash
curl -X POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-event \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "defababe-004b-4c63-9ff1-311540b0a3c9",
    "event_name": "prize_won",
    "source_system": "onemill",
    "user_id": "3ed40e96-20b9-4a3a-97a7-f937af688a1a",
    "metadata": {
      "prize_id": "prize_l7r968",
      "contest_id": "00000000-0000-0000-0000-000000000002",
      "prize_type": "product",
      "prize_value": 1677
    }
  }'
```

### Opravo Job Created Event

```bash
curl -X POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-event \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "defababe-004b-4c63-9ff1-311540b0a3c9",
    "event_name": "job_created",
    "source_system": "opravo",
    "user_id": "bbc1d329-fe8d-449e-9960-6633a647b65a",
    "metadata": {
      "job_id": "job_123",
      "category": "plumbing",
      "urgent": true,
      "location": "Prague"
    }
  }'
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Event processed successfully",
  "source_system": "onemill",
  "original_event": "prize_won",
  "standardized_event": "reward_distributed",
  "was_mapped": true,
  "event_log_id": "uuid",
  "ai_request_id": "uuid",
  "audit_log_id": "uuid"
}
```

### Error Responses

**400 Bad Request** - Missing required fields
```json
{
  "success": false,
  "error": "Missing required fields: project_id and event_name"
}
```

**401 Unauthorized** - Invalid or missing API key
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**500 Internal Server Error** - Server error
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "error message"
}
```

## Monitoring & Logs

All events are logged with detailed information in the Supabase Edge Function logs:

- 📥 Incoming event with source_system, project_id, original_event
- 🔄 Standardization attempt
- ✅ Standardization result with mapping status
- 💾 Database insertion
- 🎉 Final success with all IDs

**View logs**: [Sofinity Event Function Logs](https://supabase.com/dashboard/project/rrmvxsldrjgbdxluklka/functions/sofinity-event/logs)

## Best Practices

1. **Always specify source_system**: This enables proper event standardization
2. **Include rich metadata**: Add as much context as possible in the metadata object
3. **Monitor unmapped events**: Check audit_logs regularly for unmapped events and add mappings
4. **Use consistent event names**: Within your system, use consistent event naming
5. **Handle errors gracefully**: Implement retry logic for failed requests
6. **Test in development**: Use test project_ids for development/testing

## Adding New Event Mappings

To add a new event mapping, insert into the EventTypes table:

```sql
INSERT INTO public."EventTypes" (source_system, original_event, standardized_event, description)
VALUES ('onemill', 'new_event', 'standardized_new_event', 'Description of the event');
```

## Support

For questions or issues, contact the Sofinity team or check the [API documentation](./sofinity-api-keys-navigation.md).
