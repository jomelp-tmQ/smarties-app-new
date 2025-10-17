# Test Data Seeding

This document explains how to use the `test.js` file to seed your database with sample data for testing the webhook system.

## What Gets Created

The test script creates:

### 1. Sample Business
- **Name**: "Smarties Test Company"
- **Slug**: "smarties-test"
- **Plan**: "premium"
- **Complete settings** including business hours, timezone, and notifications

### 2. Sample Department
- **Name**: "Customer Support"
- **Description**: Primary customer support department
- **Linked to all created channels**

### 3. Sample Channels

#### Main Chat Channel (Smarty Provider)
- **Type**: `chat`
- **Provider**: `smarty`
- **Identifier**: `smarty-chat-main`
- **Features**: Auto-response, CRM sync, analytics

#### WhatsApp Channel
- **Type**: `messaging`
- **Provider**: `whatsapp`
- **Phone**: +1234567890
- **Business profile configured**

#### Email Channel
- **Type**: `email`
- **Provider**: `smtp`
- **Email**: support@smartiestest.com
- **Auto-reply configured**

## How to Use

### Option 1: Automatic Seeding (Recommended)
The script runs automatically on Meteor startup and will:
- Check if test data already exists
- Skip seeding if data is found
- Seed data if none exists

### Option 2: Manual Seeding
```javascript
import { seedTestData, cleanupTestData } from './test.js';

// Seed test data
await seedTestData();

// Clean up test data (optional)
await cleanupTestData();
```

## Testing Webhooks

After seeding, you can test the webhook endpoints:

### Webhook URLs
- **Inbound**: `POST /api/b/smarties-test/channels/messages/inbound`
- **Outbound**: `POST /api/b/smarties-test/channels/messages/outbound`

### Sample Inbound Payload
```json
{
  "provider": "smarty",
  "type": "chat",
  "identifier": "smarty-chat-main",
  "from": "customer123",
  "text": "Hello, I need help with my order!",
  "meta": {
    "customerName": "John Doe",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "sess_abc123"
  }
}
```

### Sample Outbound Payload
```json
{
  "provider": "smarty",
  "type": "chat",
  "identifier": "smarty-chat-main",
  "to": "customer123",
  "text": "Thank you for contacting us! How can we help?",
  "meta": {
    "agentId": "agent_456",
    "priority": "normal"
  }
}
```

## Expected Workflow

1. **Inbound Message**:
   - Creates consumer if not exists
   - Creates/finds inbox for consumer+channel
   - Records interaction
   - Updates inbox latest fields
   - Increments unread count

2. **Outbound Message**:
   - Sends via provider (mocked)
   - Records interaction
   - Updates inbox latest fields
   - Does not increment unread count

## Cleanup

To remove all test data:
```javascript
import { cleanupTestData } from './test.js';
await cleanupTestData();
```

This will remove:
- Test business
- All associated departments
- All associated channels
- Related inbox and interaction data (via cascade)

## Development Tips

- Modify the business slug in the script to create multiple test environments
- Adjust channel metadata to test different provider configurations
- Add additional channels or departments as needed for your testing scenarios
- Use the cleanup function between test runs to ensure fresh data
