// Schema validation error handler with detailed debugging
import { Meteor } from 'meteor/meteor';

/**
 * Enhanced error handler for MongoDB schema validation errors
 * Provides detailed debugging information for validation failures
 */
export class SchemaErrorHandler {

    /**
     * Check if an error is a MongoDB validation error
     */
    static isValidationError(error) {
        return error && (
            error.code === 121 || // Document failed validation
            error.name === 'MongoServerError' ||
            (error.errInfo && error.errInfo.details)
        );
    }

    /**
     * Extract detailed validation error information
     */
    static extractValidationDetails(error) {
        if (!this.isValidationError(error)) {
            return null;
        }

        const details = {
            code: error.code,
            message: error.message || error.errmsg,
            collection: null,
            failedDocument: null,
            schemaErrors: []
        };

        // Extract error details if available
        if (error.errInfo) {
            details.failedDocument = error.errInfo.failingDocumentId;

            if (error.errInfo.details) {
                details.operatorName = error.errInfo.details.operatorName;
                details.title = error.errInfo.details.title;
                details.collection = error.errInfo.details.title;

                // Extract specific schema rule violations
                if (error.errInfo.details.schemaRulesNotSatisfied) {
                    details.schemaErrors = this.parseSchemaRules(error.errInfo.details.schemaRulesNotSatisfied);
                }
            }
        }

        return details;
    }

    /**
     * Parse schema rules violations into human-readable format
     */
    static parseSchemaRules(rules) {
        const errors = [];

        if (!Array.isArray(rules)) {
            return errors;
        }

        rules.forEach(rule => {
            if (rule.operatorName === 'required') {
                errors.push({
                    type: 'missing_required_field',
                    field: rule.specifiedAs?.required?.join(', '),
                    message: `Missing required field(s): ${rule.specifiedAs?.required?.join(', ')}`
                });
            } else if (rule.operatorName === 'properties') {
                rule.propertiesNotSatisfied?.forEach(prop => {
                    errors.push({
                        type: 'property_validation',
                        field: prop.propertyName,
                        details: prop.details,
                        message: `Field '${prop.propertyName}' failed validation: ${JSON.stringify(prop.details)}`
                    });
                });
            } else if (rule.operatorName === 'bsonType') {
                errors.push({
                    type: 'type_mismatch',
                    expectedType: rule.specifiedAs?.bsonType,
                    actualType: rule.consideredValue ? typeof rule.consideredValue : 'unknown',
                    message: `Type mismatch: expected ${rule.specifiedAs?.bsonType}, got ${typeof rule.consideredValue}`
                });
            } else {
                errors.push({
                    type: 'unknown_validation_error',
                    operator: rule.operatorName,
                    details: rule,
                    message: `Validation failed for operator: ${rule.operatorName}`
                });
            }
        });

        return errors;
    }

    /**
     * Create a user-friendly error response for API endpoints
     */
    static createErrorResponse(error, context = {}) {
        const validationDetails = this.extractValidationDetails(error);

        if (!validationDetails) {
            // Not a validation error, return generic error
            return {
                ok: false,
                error: 'database_error',
                message: error.message || 'An unknown database error occurred',
                context
            };
        }

        // Create detailed validation error response
        const response = {
            ok: false,
            error: 'validation_error',
            message: 'Document failed schema validation',
            collection: validationDetails.collection,
            context,
            validation: {
                code: validationDetails.code,
                totalErrors: validationDetails.schemaErrors.length,
                errors: validationDetails.schemaErrors.map(err => ({
                    type: err.type,
                    field: err.field,
                    message: err.message,
                    details: err.details
                }))
            }
        };

        // Add debugging info in development
        if (Meteor.isDevelopment) {
            response.debug = {
                fullError: {
                    code: error.code,
                    message: error.message,
                    errInfo: error.errInfo
                },
                failedDocument: validationDetails.failedDocument,
                suggestedFixes: this.generateSuggestedFixes(validationDetails.schemaErrors)
            };
        }

        return response;
    }

    /**
     * Generate suggested fixes for common validation errors
     */
    static generateSuggestedFixes(schemaErrors) {
        const fixes = [];

        schemaErrors.forEach(error => {
            switch (error.type) {
                case 'missing_required_field':
                    fixes.push(`Add required field: ${error.field}`);
                    break;
                case 'type_mismatch':
                    fixes.push(`Convert field to ${error.expectedType} type`);
                    break;
                case 'property_validation':
                    fixes.push(`Fix validation for field: ${error.field}`);
                    break;
                default:
                    fixes.push(`Review field requirements for: ${error.field || 'unknown field'}`);
            }
        });

        return fixes;
    }

    /**
     * Log validation errors with detailed information
     */
    static logValidationError(error, operation = 'database operation', data = null) {
        const details = this.extractValidationDetails(error);

        if (details) {
            console.error(`❌ Validation Error in ${operation}:`);
            console.error(`   Collection: ${details.collection || 'unknown'}`);
            console.error(`   Total Errors: ${details.schemaErrors.length}`);

            details.schemaErrors.forEach((err, index) => {
                console.error(`   ${index + 1}. ${err.message}`);
            });

            if (data && Meteor.isDevelopment) {
                console.error('   Attempted Data:', JSON.stringify(data, null, 2));
            }

            if (Meteor.isDevelopment) {
                console.error('   Full Error Details:', JSON.stringify(error.errInfo, null, 2));
            }
        } else {
            console.error(`❌ Database Error in ${operation}:`, error.message);
        }
    }
}

/**
 * Wrapper function for database operations with enhanced error handling
 */
export async function withSchemaErrorHandling(operation, context = {}) {
    try {
        return await operation();
    } catch (error) {
        // Log the error with details
        SchemaErrorHandler.logValidationError(error, context.operation || 'database operation', context.data);

        // Re-throw with enhanced error information
        const enhancedError = new Error(SchemaErrorHandler.createErrorResponse(error, context).message);
        enhancedError.originalError = error;
        enhancedError.validationDetails = SchemaErrorHandler.extractValidationDetails(error);
        enhancedError.isValidationError = SchemaErrorHandler.isValidationError(error);

        throw enhancedError;
    }
}

export default SchemaErrorHandler;
