import { Meteor } from 'meteor/meteor';
import { logger as baseLogger } from '../../../api/server/utils/serverUtils.js';
const logger = baseLogger.child({ service: 'startup/server/database.js' });
import DatabaseInitializer from '../../../api/server/classes/db/DatabaseInitializer';
import { schemas as permissiveSchemas, strictSchemas, indexes } from '../../../api/server/classes/db/permissive-schemas.js';
import { Package } from "@tmq-dev-ph/tmq-dev-core-server";

// Package.addDB("database", [{ key: { primaryKey: 1 } }]);

Package.addDB("Product", [{ key: { dtCreated: -1 } }]);

Package.addDB("content", [{ key: { dtCreated: -1 } }]);

Package.addDB("customerEngagement", [{ key: { dtCreated: -1 } }]);

Package.addDB("customers", [{ key: { dtCreated: -1 } }]);
Package.addDB("salesEnablement", [{ key: { dtCreated: -1 } }]);

Package.addDB("transcripts", [{ key: { dtCreated: -1 } }, { key: { index1: 1 } }]);
Package.addDB("vapiKnowledgeBase", [{ key: { dtCreated: -1 } }, { key: { index1: 1 } }]);
Package.addDB("clientRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("vapiFiles", [{ key: { createdAt: -1 } }, { key: { index1: 1 } }]);
// Package.addDB("assistants", [{ key: { userId: -1 } }, { key: { createdAt: -1 } }, { key: { keywords: 1 } }]);
Package.addDB("clientRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("contactUsRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("channelPartnerRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("whiteLabelRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("wholeSalerRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("affiliateRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("opportunityRequest", [{ key: { dtCreated: -1 } }]);
Package.addDB("userNumbers", [{ key: { createdAt: -1 } }, { key: { userId: 1 } }]);
Package.addDB("fineTuneModels", [{ key: { createdAt: -1 } }, { key: { userId: 1 } }]);
Package.addDB("fineTuneJobs", [{ key: { createdAt: -1 } }, { key: { userId: 1 } }]);
Package.addDB("threadsAssitants", [{ key: { createdAt: -1 } }, { key: { userId: 1 } }]);
Package.addDB("voices", [{ key: { createdAt: -1 } }, { key: { index1: -1 } }, { key: { keywords: 1 } }]);
Package.addDB("products", [{ key: { dtCreated: -1 } }]);
Package.addDB("billingWebhook", [{ key: { created: -1 } }]);
Package.addDB("phoneNumbers", []);
Package.addDB("settings", [{ key: { key: 1 } }]);
Package.addDB("callLogs", [{ key: { createdAt: -1 } }]);
Package.addDB("chatLogs", [{ key: { createdAt: -1 } }]);
Package.addDB("crawlLogs", [{ key: { createdAt: -1 } }]);
Package.addDB("useCaseMessages", [{ key: { createdAt: -1 } }]);
Package.addDB("tools", [{ key: { createdAt: -1 } }, { key: { userId: 1 } }, { key: { index1: -1 } }]);
Package.addDB("phones", [{ key: { createdAt: -1 } }]);
Package.addDB("mediaFiles", [{ key: { createdAt: -1 } }]);
Package.addDB("knowledgeBase", [{ key: { createdAt: -1 } }, { key: { userId: 1 } }, { key: { index1: -1 } }]);
Package.addDB("widgetConfig", [{ key: { createdAt: -1 } }, { key: { userId: 1 } }, { key: { index1: -1 } }]);
// BILLING
Package.addDB("subscriptions", [{ key: { createdAt: -1 } }]);
Package.addDB("invoices", [{ key: { createdAt: -1 } }]);
Package.addDB("charges", [{ key: { createdAt: -1 } }]);
Package.addDB("paymentSessions", [{ key: { createdAt: -1 } }]);
Package.addDB("subscriptionPlans", [{ key: { createdAt: -1 } }]);
Package.addDB("regions", [{ key: { createdAt: -1 } }]);
// /imports/startup/server/index.js (or server/main.js)


Meteor.startup(async () => {
    // Choose schema validation level based on environment
    const isDevelopment = Meteor.isDevelopment;
    // const useStrictValidation = process.env.STRICT_SCHEMA_VALIDATION === 'true';
    const useStrictValidation = true;

    let schemasToUse;
    if (useStrictValidation) {
        schemasToUse = strictSchemas;
        logger.info('Using STRICT schema validation');
    } else if (isDevelopment) {
        schemasToUse = permissiveSchemas;
        logger.info('Using PERMISSIVE schema validation for development');
    } else {
        schemasToUse = permissiveSchemas; // Still permissive for production until schemas are finalized
        logger.info('Using PERMISSIVE schema validation');
    }

    logger.info('Schema validation enabled with detailed error reporting');

    const init = new DatabaseInitializer({ schemas: schemasToUse, indexes });
    await init.run(); // creates/updates validators, then ensures indexes
});
