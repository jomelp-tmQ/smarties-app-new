// Test script to demonstrate enhanced schema validation error reporting
import { Meteor } from 'meteor/meteor';
import SchemaErrorHandler from './imports/api/server/utils/schemaErrorHandler.js';

/**
 * Test schema validation with intentionally invalid data
 * This will show the detailed error reporting in action
 */
async function testSchemaValidation() {
    console.log('🧪 Testing schema validation error reporting...');

    if (!Meteor.isServer) {
        console.log('❌ This test must run on the server');
        return;
    }

    try {
        // Test 1: Simulate a validation error response
        const mockValidationError = {
            code: 121,
            message: 'Document failed validation',
            errInfo: {
                failingDocumentId: 'mock_document_id',
                details: {
                    operatorName: '$jsonSchema',
                    title: 'business',
                    schemaRulesNotSatisfied: [
                        {
                            operatorName: 'required',
                            specifiedAs: {
                                required: ['name', 'slug']
                            }
                        },
                        {
                            operatorName: 'properties',
                            propertiesNotSatisfied: [
                                {
                                    propertyName: 'createdAt',
                                    details: [
                                        {
                                            operatorName: 'bsonType',
                                            specifiedAs: { bsonType: 'double' },
                                            consideredValue: 'invalid_timestamp'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        };

        console.log('\n📊 Testing error detection...');
        const isValidationError = SchemaErrorHandler.isValidationError(mockValidationError);
        console.log(`✅ Is validation error: ${isValidationError}`);

        console.log('\n📊 Testing error details extraction...');
        const details = SchemaErrorHandler.extractValidationDetails(mockValidationError);
        console.log('✅ Extracted details:', JSON.stringify(details, null, 2));

        console.log('\n📊 Testing error response creation...');
        const errorResponse = SchemaErrorHandler.createErrorResponse(mockValidationError, {
            operation: 'test_operation',
            collection: 'business'
        });
        console.log('✅ Error response:', JSON.stringify(errorResponse, null, 2));

        console.log('\n📊 Testing error logging...');
        SchemaErrorHandler.logValidationError(mockValidationError, 'test operation', {
            name: 'Test Business',
            createdAt: 'invalid_timestamp'
        });

        console.log('\n🎉 Schema validation error testing complete!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

/**
 * Test API endpoint with enhanced error handling
 */
async function testAPIWithValidation() {
    console.log('\n🔌 Testing API with validation errors...');

    try {
        // Test with invalid data that should trigger validation errors
        const testPayloads = [
            {
                name: 'Missing required fields',
                data: {
                    provider: 'smarty',
                    // Missing type, identifier, from, text
                }
            },
            {
                name: 'Invalid types',
                data: {
                    provider: 'smarty',
                    type: 'chat',
                    identifier: 'test',
                    from: 123, // Should be string
                    text: true // Should be string
                }
            }
        ];

        for (const testCase of testPayloads) {
            console.log(`\n📝 Testing: ${testCase.name}`);

            try {
                const response = await fetch('http://localhost:3000/api/b/smarties-test/channels/messages/inbound', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testCase.data)
                });

                const result = await response.json();
                console.log(`📊 Response (${response.status}):`, JSON.stringify(result, null, 2));

            } catch (error) {
                console.log(`❌ Request failed:`, error.message);
            }
        }

    } catch (error) {
        console.error('❌ API test failed:', error);
    }
}

// Export test functions
export { testSchemaValidation, testAPIWithValidation };

// Run tests if this file is executed directly
if (Meteor.isServer) {
    Meteor.startup(() => {
        // Wait a bit for the server to fully start
        setTimeout(async () => {
            await testSchemaValidation();
            await testAPIWithValidation();
        }, 3000);
    });
}
