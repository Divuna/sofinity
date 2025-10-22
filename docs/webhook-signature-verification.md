# Webhook Signature Verification Guide

## Overview

All webhook endpoints in this application now use HMAC-SHA256 signature verification with replay protection to ensure request authenticity and prevent abuse.

## Security Features

### 1. HMAC-SHA256 Signature Verification
- Signatures are computed over: `timestamp.rawBody`
- Uses constant-time comparison to prevent timing attacks
- Secret key stored securely in environment variables

### 2. Timestamp Validation
- Requests must include a timestamp within ±5 minutes of server time
- Prevents old requests from being replayed

### 3. Idempotency Protection
- Each request requires a unique `x-idempotency-key` header
- Keys are stored in database for 10 minutes
- Duplicate requests with same key are rejected

### 4. Rate Limiting
- Per-endpoint rate limiting: 60 requests/minute
- Helps prevent abuse and DoS attacks

## Required Headers

All webhook requests must include these headers:

```
X-Signature: <hmac_sha256_hex_signature>
X-Timestamp: <ISO8601_timestamp>
X-Idempotency-Key: <unique_request_id>
Content-Type: application/json
```

## Signature Generation

### Example (JavaScript/Node.js)

```javascript
const crypto = require('crypto');

function generateWebhookSignature(body, timestamp, secret) {
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Usage
const body = { event: 'user_created', data: {...} };
const timestamp = new Date().toISOString();
const signature = generateWebhookSignature(body, timestamp, 'your-webhook-secret');

fetch('https://your-domain.com/functions/v1/webhook-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'X-Idempotency-Key': crypto.randomUUID()
  },
  body: JSON.stringify(body)
});
```

### Example (Python)

```python
import hmac
import hashlib
import json
from datetime import datetime
import uuid
import requests

def generate_webhook_signature(body, timestamp, secret):
    payload = f"{timestamp}.{json.dumps(body)}"
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

# Usage
body = {"event": "user_created", "data": {...}}
timestamp = datetime.utcnow().isoformat() + 'Z'
signature = generate_webhook_signature(body, timestamp, 'your-webhook-secret')

response = requests.post(
    'https://your-domain.com/functions/v1/webhook-endpoint',
    headers={
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
        'X-Idempotency-Key': str(uuid.uuid4())
    },
    json=body
)
```

### Example (cURL)

```bash
#!/bin/bash

SECRET="your-webhook-secret"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
BODY='{"event":"user_created","data":{}}'
IDEMPOTENCY_KEY=$(uuidgen)

# Generate signature
PAYLOAD="${TIMESTAMP}.${BODY}"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Make request
curl -X POST https://your-domain.com/functions/v1/webhook-endpoint \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "$BODY"
```

## Secured Endpoints

The following endpoints require signature verification:

1. **email-events-ingest** - Email delivery events
2. **opravo-integration** - Opravo system webhooks
3. **sofinity-event** - Sofinity event tracking
4. **insert_opravo_job** - Job creation webhooks
5. **sofinity-api** - General API endpoint

## Error Responses

All failed verification attempts return a generic error:

```json
{
  "error": "Unauthorized"
}
```

**Status Code:** 401

### Common Failure Reasons
- Missing required headers
- Invalid signature
- Timestamp outside acceptable window (>5 minutes old)
- Duplicate idempotency key (replay attack)
- Rate limit exceeded (>60 req/min per endpoint)

## Secret Management

### Setting the Webhook Secret

The webhook secret is stored as `SOFINITY_WEBHOOK_SECRET` in Supabase environment variables.

**Important Security Notes:**
- Never commit secrets to version control
- Rotate secrets regularly (recommended: every 90 days)
- Use strong, randomly generated secrets (min 32 characters)
- Share secrets only through secure channels

### Generating a Strong Secret

```bash
# Linux/macOS
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Testing

### Test Ping (No Signature Required)

The `sofinity-event` endpoint supports test pings for monitoring:

```bash
curl -X POST https://your-domain.com/functions/v1/sofinity-event \
  -H "X-Test-Ping: true"
```

Response:
```json
{
  "success": true,
  "message": "Sofinity event function is operational",
  "timestamp": "2025-10-22T10:30:00.000Z"
}
```

## Maintenance

### Database Cleanup

Old webhook request records are automatically cleaned up. A cleanup function runs periodically to remove records older than 10 minutes:

```sql
SELECT cleanup_old_webhook_requests();
```

This function is safe to run manually if needed.

## Security Best Practices

1. **Validate Webhook Source**
   - Always verify signatures before processing
   - Check timestamp freshness
   - Never trust client-provided data without verification

2. **Handle Errors Securely**
   - Don't leak implementation details in error messages
   - Log security events for monitoring
   - Return generic 401 responses for all auth failures

3. **Monitor for Attacks**
   - Track failed verification attempts
   - Set up alerts for rate limit violations
   - Review audit logs regularly

4. **Rotate Secrets Regularly**
   - Implement secret rotation schedule
   - Update all webhook clients when rotating
   - Keep backup of old secret during transition period

## Support

For issues or questions about webhook integration, contact the development team.