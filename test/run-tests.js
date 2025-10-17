#!/usr/bin/env node

/**
 * Simple test runner for Smarties API using Node.js
 * This provides an alternative to Postman for basic API testing
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const config = {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    businessSlug: process.env.BUSINESS_SLUG || 'smarties-test',
    timeout: 10000
};

// Test counter
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Utility functions
function generateTestData() {
    const timestamp = Date.now();
    return {
        timestamp,
        sessionId: `sess_${Math.random().toString(36).substr(2, 9)}`,
        messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
        customerId: `customer_${timestamp}`
    };
}

function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const fullUrl = `${config.baseUrl}${endpoint}`;
        const parsedUrl = url.parse(fullUrl);
        const requestModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Smarties-Test-Runner/1.0'
            },
            timeout: config.timeout
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = requestModule.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: jsonResponse,
                        rawData: responseData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: null,
                        rawData: responseData,
                        parseError: error.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

function logTest(name, passed, message = '') {
    testsRun++;
    if (passed) {
        testsPassed++;
        console.log(`✅ ${name}`);
    } else {
        testsFailed++;
        console.log(`❌ ${name}: ${message}`);
    }
}

function logResult(testName, response, expectedStatus = 200) {
    console.log(`\n📝 Test: ${testName}`);
    console.log(`📡 Status: ${response.statusCode}`);

    if (response.parseError) {
        console.log(`⚠️  Parse Error: ${response.parseError}`);
        console.log(`📄 Raw Response: ${response.rawData.substring(0, 200)}...`);
    } else if (response.data) {
        console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    }

    logTest(testName, response.statusCode === expectedStatus,
        response.statusCode !== expectedStatus ? `Expected ${expectedStatus}, got ${response.statusCode}` : '');
}

// Test cases
async function testInboundSmartyChat() {
    const testData = generateTestData();
    const payload = {
        provider: 'smarty',
        type: 'chat',
        identifier: 'smarty-chat-main',
        from: testData.customerId,
        text: 'Hello! This is a test message from the Node.js test runner.',
        meta: {
            customerName: 'Test Customer',
            sessionId: testData.sessionId,
            messageId: testData.messageId,
            timestamp: testData.timestamp
        }
    };

    try {
        const response = await makeRequest('POST', `/api/b/${config.businessSlug}/channels/messages/inbound`, payload);
        logResult('Inbound Smarty Chat Message', response);

        // Additional assertions
        if (response.data && response.data.ok) {
            logTest('Response has success flag', true);
            logTest('Response includes businessId', !!response.data.businessId);
            logTest('Response includes channelId', !!response.data.channelId);
            logTest('Response includes consumerId', !!response.data.consumerId);
            logTest('Response includes inboxId', !!response.data.inboxId);
            logTest('Response includes interactionId', !!response.data.interactionId);
        } else {
            logTest('Response validation', false, 'Missing success flag or data');
        }

        return response.data;
    } catch (error) {
        console.log(`❌ Error in testInboundSmartyChat: ${error.message}`);
        logTest('Inbound Smarty Chat Message', false, error.message);
        return null;
    }
}

async function testOutboundSmartyChat() {
    const testData = generateTestData();
    const payload = {
        provider: 'smarty',
        type: 'chat',
        from: 'smarty-chat-main',
        to: testData.customerId,
        text: 'Thank you for your message! This is an automated response from our test system.',
        meta: {
            agentId: 'test_agent_001',
            agentName: 'Test Agent',
            responseTime: testData.timestamp
        }
    };

    try {
        const response = await makeRequest('POST', `/api/b/${config.businessSlug}/channels/messages/outbound`, payload);
        logResult('Outbound Smarty Chat Message', response);

        // Additional assertions
        if (response.data && response.data.ok) {
            logTest('Outbound response has success flag', true);
            logTest('Outbound includes provider info', !!response.data.provider);
            logTest('Outbound includes providerResponse', !!response.data.providerResponse);
        } else {
            logTest('Outbound response validation', false, 'Missing success flag or data');
        }

        return response.data;
    } catch (error) {
        console.log(`❌ Error in testOutboundSmartyChat: ${error.message}`);
        logTest('Outbound Smarty Chat Message', false, error.message);
        return null;
    }
}

async function testInboundWhatsApp() {
    const testData = generateTestData();
    const payload = {
        provider: 'whatsapp',
        type: 'messaging',
        identifier: 'whatsapp-business',
        from: '+1234567890',
        text: 'Hi! Testing WhatsApp integration from Node.js test runner.',
        meta: {
            customerName: 'WhatsApp Customer',
            phoneNumber: '+1234567890',
            messageId: `wa_${testData.messageId}`
        }
    };

    try {
        const response = await makeRequest('POST', `/api/b/${config.businessSlug}/channels/messages/inbound`, payload);
        logResult('Inbound WhatsApp Message', response);
        return response.data;
    } catch (error) {
        console.log(`❌ Error in testInboundWhatsApp: ${error.message}`);
        logTest('Inbound WhatsApp Message', false, error.message);
        return null;
    }
}

async function testErrorCase() {
    const payload = {
        provider: 'smarty',
        type: 'chat',
        identifier: 'smarty-chat-main',
        from: 'test_customer',
        text: 'This should fail due to invalid business slug'
    };

    try {
        const response = await makeRequest('POST', '/api/b/invalid-business-slug/channels/messages/inbound', payload);
        logResult('Error Case - Invalid Business', response, 400);

        // Check error response structure
        if (response.data && response.data.ok === false) {
            logTest('Error response has ok: false', true);
            logTest('Error response has error message', !!response.data.error);
        } else {
            logTest('Error response structure', false, 'Missing expected error structure');
        }

        return response.data;
    } catch (error) {
        console.log(`❌ Error in testErrorCase: ${error.message}`);
        logTest('Error Case - Invalid Business', false, error.message);
        return null;
    }
}

async function testConversationFlow() {
    console.log(`\n🔄 Testing conversation flow...`);
    const customerId = `flow_customer_${Date.now()}`;

    // 1. Customer initial contact
    const initialPayload = {
        provider: 'smarty',
        type: 'chat',
        identifier: 'smarty-chat-main',
        from: customerId,
        text: 'Hi, I need help with my order #12345.',
        meta: {
            customerName: 'Flow Test Customer',
            orderNumber: '12345'
        }
    };

    try {
        const initialResponse = await makeRequest('POST', `/api/b/${config.businessSlug}/channels/messages/inbound`, initialPayload);
        logTest('Flow Step 1 - Customer Contact', initialResponse.statusCode === 200);

        if (initialResponse.statusCode !== 200) {
            logTest('Conversation Flow', false, 'Initial contact failed');
            return;
        }

        // 2. Agent response
        const agentPayload = {
            provider: 'smarty',
            type: 'chat',
            from: 'smarty-chat-main',
            to: customerId,
            text: 'Hello! I can help you with order #12345. Let me check the status.',
            meta: {
                agentId: 'test_agent_001',
                orderNumber: '12345'
            }
        };

        const agentResponse = await makeRequest('POST', `/api/b/${config.businessSlug}/channels/messages/outbound`, agentPayload);
        logTest('Flow Step 2 - Agent Response', agentResponse.statusCode === 200);

        // 3. Customer follow-up
        const followUpPayload = {
            provider: 'smarty',
            type: 'chat',
            identifier: 'smarty-chat-main',
            from: customerId,
            text: 'Thank you! My email is test@example.com',
            meta: {
                customerEmail: 'test@example.com'
            }
        };

        const followUpResponse = await makeRequest('POST', `/api/b/${config.businessSlug}/channels/messages/inbound`, followUpPayload);
        logTest('Flow Step 3 - Customer Follow-up', followUpResponse.statusCode === 200);

        logTest('Complete Conversation Flow',
            initialResponse.statusCode === 200 &&
            agentResponse.statusCode === 200 &&
            followUpResponse.statusCode === 200
        );

    } catch (error) {
        logTest('Conversation Flow', false, error.message);
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Smarties API Test Runner');
    console.log(`📡 Base URL: ${config.baseUrl}`);
    console.log(`🏢 Business: ${config.businessSlug}`);
    console.log('='.repeat(60));

    try {
        // Basic functionality tests
        await testInboundSmartyChat();
        await testOutboundSmartyChat();
        await testInboundWhatsApp();

        // Error handling tests
        await testErrorCase();

        // Flow tests
        await testConversationFlow();

    } catch (error) {
        console.log(`❌ Test runner error: ${error.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📈 Total Tests: ${testsRun}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Success Rate: ${testsRun > 0 ? Math.round((testsPassed / testsRun) * 100) : 0}%`);

    if (testsFailed > 0) {
        console.log('\n⚠️  Some tests failed. Check the output above for details.');
        console.log('💡 Make sure your Meteor app is running and test data is seeded.');
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = {
    runTests,
    testInboundSmartyChat,
    testOutboundSmartyChat,
    testInboundWhatsApp,
    testErrorCase,
    testConversationFlow
};
