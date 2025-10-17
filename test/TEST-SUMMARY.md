# Smarties API Testing Suite

Complete testing solution for the Smarties webhook API endpoints with multiple testing approaches.

## 📁 Files Overview

| File | Type | Description |
|------|------|-------------|
| `Smarties-API-Webhooks.postman_collection.json` | Postman Collection | Complete test suite with 15+ test cases |
| `Smarties-Development.postman_environment.json` | Postman Environment | Development environment variables |
| `run-tests.js` | Node.js Script | Command-line test runner |
| `README-Postman.md` | Documentation | Detailed Postman usage guide |
| `TEST-SUMMARY.md` | Documentation | This overview file |

## 🚀 Quick Start Options

### Option 1: Postman (Recommended)
**Best for: Interactive testing, detailed validation, team collaboration**

1. Import both JSON files into Postman
2. Select "Smarties Development" environment  
3. Run individual tests or entire collection

### Option 2: Command Line
**Best for: CI/CD, automated testing, quick validation**

```bash
# Run all tests
node test/run-tests.js

# Or with custom config
BASE_URL=http://localhost:3000 BUSINESS_SLUG=smarties-test node test/run-tests.js
```

### Option 3: Newman (Postman CLI)
**Best for: CI/CD integration with Postman collections**

```bash
npm install -g newman
newman run test/Smarties-API-Webhooks.postman_collection.json \
  -e test/Smarties-Development.postman_environment.json
```

## 📋 Test Coverage

### ✅ **Core Functionality**
- ✅ Inbound message processing (Smarty, WhatsApp, Email)
- ✅ Outbound message sending (all providers)
- ✅ Message with attachments
- ✅ Consumer auto-creation
- ✅ Inbox management
- ✅ Interaction recording

### ✅ **Error Handling**
- ✅ Invalid business slug (404)
- ✅ Missing required fields (400)
- ✅ Malformed JSON (400)
- ✅ Provider failures
- ✅ Database validation errors

### ✅ **Conversation Flows**
- ✅ Customer initial contact
- ✅ Agent responses
- ✅ Multi-message conversations
- ✅ Cross-channel messaging
- ✅ End-to-end workflows

### ✅ **Provider Testing**
- ✅ Smarty chat provider (main)
- ✅ WhatsApp Business
- ✅ Email/SMTP
- ✅ Provider response mocking
- ✅ Provider-specific metadata

## 🎯 Test Scenarios

### Scenario 1: Happy Path
```
Customer → Inbound Message → Webhook Processing → Database Storage → Agent Response → Outbound Processing
```

### Scenario 2: Error Handling
```
Invalid Request → Validation → Error Response → Graceful Failure
```

### Scenario 3: New Customer
```
Unknown Customer → Auto-Creation → Inbox Creation → Message Processing
```

### Scenario 4: Multi-Channel
```
Same Customer → Different Channels → Separate Inboxes → Unified Experience
```

## 📊 Expected Results

### ✅ **Successful Responses**
```json
{
  "ok": true,
  "businessId": "ObjectId",
  "channelId": "ObjectId", 
  "consumerId": "ObjectId",
  "inboxId": "ObjectId",
  "interactionId": "ObjectId",
  "provider": "smarty",
  "providerResponse": {
    "providerMessageId": "mock-id",
    "status": "sent"
  }
}
```

### ❌ **Error Responses**
```json
{
  "ok": false,
  "error": "business_not_found"
}
```

## 🔧 Prerequisites

### Required Setup
1. **Meteor App Running**: `meteor` (port 3000)
2. **Test Data Seeded**: Run `test.js` to create sample business
3. **Database Available**: MongoDB running with collections

### Environment Check
```bash
# Verify app is running
curl http://localhost:3000/api/b/smarties-test/channels/messages/inbound \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"provider":"smarty","type":"chat","identifier":"test","from":"test","text":"test"}'
```

## 🐛 Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Meteor not running | Start with `meteor` |
| Business not found | No test data | Run `test.js` seeding script |
| Validation errors | Schema mismatch | Check payload structure |
| 500 server errors | Code errors | Check Meteor console logs |

### Debug Commands
```bash
# Check if server is responding
curl -I http://localhost:3000

# Test basic endpoint
curl http://localhost:3000/api/b/smarties-test/channels/messages/inbound \
  -X POST -H "Content-Type: application/json" -d '{}'

# Check test data exists
# (Run in Meteor console)
# Business.findBySlug('smarties-test')
```

## 📈 Performance Testing

### Load Testing with Newman
```bash
# Run 10 iterations with 2 second delay
newman run test/Smarties-API-Webhooks.postman_collection.json \
  -e test/Smarties-Development.postman_environment.json \
  -n 10 \
  --delay-request 2000
```

### Stress Testing with Node.js
```javascript
// Modify run-tests.js for concurrent requests
const concurrency = 10;
const requests = 100;

for (let i = 0; i < requests; i++) {
  Promise.all([
    testInboundSmartyChat(),
    testOutboundSmartyChat(),
    // ... more tests
  ]);
}
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install -g newman
      - run: meteor &
      - run: sleep 30  # Wait for Meteor to start
      - run: node test.js  # Seed test data
      - run: newman run test/Smarties-API-Webhooks.postman_collection.json
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    stages {
        stage('Setup') {
            steps {
                sh 'meteor &'
                sh 'sleep 30'
                sh 'node test.js'
            }
        }
        stage('Test') {
            steps {
                sh 'node test/run-tests.js'
            }
        }
    }
}
```

## 📝 Adding New Tests

### Postman Collection
1. Duplicate existing request
2. Modify payload and assertions
3. Add to appropriate folder
4. Export updated collection

### Node.js Test Runner
1. Add new async function in `run-tests.js`
2. Call from `runTests()` function
3. Include appropriate assertions
4. Update test counter

### Example New Test
```javascript
async function testNewFeature() {
  const payload = {
    // your test payload
  };
  
  try {
    const response = await makeRequest('POST', '/your/endpoint', payload);
    logResult('New Feature Test', response);
    
    // Add specific assertions
    logTest('Feature works correctly', response.data.success === true);
    
  } catch (error) {
    logTest('New Feature Test', false, error.message);
  }
}
```

## 🎉 Success Metrics

A successful test run should show:
- ✅ All core endpoints responding (200 OK)
- ✅ Error cases handled properly (400/404)
- ✅ Database entities created correctly
- ✅ Provider integrations working (mocked)
- ✅ Conversation flows completing
- ✅ Response times under acceptable thresholds

Happy testing! 🚀
