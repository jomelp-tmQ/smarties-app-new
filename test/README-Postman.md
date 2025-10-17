# Smarties API - Postman Testing Collection

This directory contains comprehensive Postman collections for testing the Smarties webhook API endpoints.

## Files Included

### 📁 Collections
- **`Smarties-API-Webhooks.postman_collection.json`** - Complete test suite for webhook endpoints

### 🌍 Environments  
- **`Smarties-Development.postman_environment.json`** - Development environment configuration

## Quick Setup

### 1. Import Files into Postman
1. Open Postman
2. Click **Import** button
3. Drag and drop both JSON files or click **Upload Files**
4. Select both files:
   - `Smarties-API-Webhooks.postman_collection.json`
   - `Smarties-Development.postman_environment.json`

### 2. Select Environment
1. In Postman, click the environment dropdown (top right)
2. Select **"Smarties Development"**
3. Verify the `baseUrl` is set to your local development server (default: `http://localhost:3000`)

### 3. Start Your Meteor App
```bash
cd /path/to/smarties-appV3
meteor
```

## Test Categories

### 📥 **Inbound Messages**
Tests for incoming messages from customers:
- **Smarty Chat Message** - Main chat channel with provider "smarty"
- **WhatsApp Message** - WhatsApp Business messaging
- **Email Message** - Email support channel
- **Message with Attachments** - File upload handling

### 📤 **Outbound Messages** 
Tests for outgoing messages to customers:
- **Smarty Chat Response** - Agent responses via chat
- **WhatsApp Response** - WhatsApp Business replies
- **Email Response** - Email support replies

### 🚨 **Error Cases**
Tests for error handling:
- **Invalid Business Slug** - Non-existent business
- **Missing Required Fields** - Malformed requests
- **Invalid JSON Payload** - Syntax errors

### 🔄 **Conversation Flow Tests**
End-to-end conversation simulation:
1. **Customer Initial Contact** - Customer starts conversation
2. **Agent Response** - Support agent replies
3. **Customer Provides Info** - Customer gives details
4. **Final Agent Resolution** - Agent resolves issue

## Test Features

### 🤖 **Dynamic Data Generation**
- Automatic timestamp generation
- Unique session IDs
- Random message IDs
- Customer ID generation for flow tests

### ✅ **Automated Testing**
Each request includes test scripts that verify:
- HTTP status codes (200 for success, 400 for errors)
- Response structure validation
- Required field presence
- Provider-specific responses
- Error message content

### 📊 **Test Results**
After running tests, you'll see:
- ✅ Passed tests in green
- ❌ Failed tests in red
- Detailed assertion results
- Response time metrics

## Running Tests

### Individual Tests
1. Select any request from the collection
2. Click **Send**
3. View results in the **Test Results** tab

### Collection Runner
1. Right-click the collection name
2. Select **Run collection**
3. Choose which tests to run
4. Click **Run Smarties API - Webhook Endpoints**
5. View comprehensive test report

### Automated Testing
For CI/CD integration:
```bash
newman run Smarties-API-Webhooks.postman_collection.json \
  -e Smarties-Development.postman_environment.json \
  --reporters cli,json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `baseUrl` | `http://localhost:3000` | API server URL |
| `businessSlug` | `smarties-test` | Test business identifier |
| `testCustomerId` | `postman_test_customer` | Default customer ID |
| `testAgentId` | `postman_test_agent` | Default agent ID |

## Request Examples

### Sample Inbound Request
```json
{
  "provider": "smarty",
  "type": "chat", 
  "identifier": "smarty-chat-main",
  "from": "customer_123",
  "text": "Hello, I need help!",
  "meta": {
    "customerName": "John Doe",
    "sessionId": "sess_abc123"
  }
}
```

### Sample Response
```json
{
  "ok": true,
  "businessId": "507f1f77bcf86cd799439011",
  "channelId": "507f1f77bcf86cd799439012", 
  "consumerId": "507f1f77bcf86cd799439013",
  "inboxId": "507f1f77bcf86cd799439014",
  "interactionId": "507f1f77bcf86cd799439015"
}
```

## Troubleshooting

### Common Issues

**❌ Connection Error**
- Verify Meteor app is running on correct port
- Check `baseUrl` in environment settings

**❌ Business Not Found**
- Ensure test data has been seeded (run `test.js`)
- Verify `businessSlug` matches seeded data

**❌ Validation Errors**
- Check request payload structure
- Ensure required fields are included
- Verify JSON syntax is valid

**❌ 500 Server Errors**
- Check Meteor console for detailed error logs
- Verify database collections are properly initialized
- Ensure all required imports are working

### Debugging Tips

1. **Enable Postman Console**: View → Show Postman Console
2. **Check Test Results**: Click on test name to see detailed assertions
3. **Inspect Responses**: Use the response viewer to examine return data
4. **Variable Values**: Check current environment variable values
5. **Pre-request Scripts**: Review generated dynamic values

## Advanced Usage

### Custom Business Testing
To test with a different business:
1. Create new business data using `test.js`
2. Update `businessSlug` in environment
3. Ensure channels exist for that business

### Load Testing
1. Use Collection Runner with multiple iterations
2. Add delays between requests if needed
3. Monitor server performance during tests

### Integration Testing
Chain requests using test scripts:
```javascript
// Store response data for next request
pm.globals.set('customerId', jsonData.consumerId);
```

### Custom Assertions
Add your own test scripts:
```javascript
pm.test("Custom business logic", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.customField).to.equal('expectedValue');
});
```

## Support

For issues with the Postman collection:
1. Check this README for troubleshooting steps
2. Verify your Meteor app is running with seeded test data
3. Ensure environment variables are correctly configured
4. Review Postman console logs for detailed error information
