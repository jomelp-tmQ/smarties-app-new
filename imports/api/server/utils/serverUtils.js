import { createLogger } from '@tmq-dev-ph/logger-pino';
import { Meteor } from 'meteor/meteor';

const settings = Meteor.settings.logger;
export const logger = createLogger({
    consoleLevel: "trace", fluentLevel: "trace",
    fluent: {
        host: settings.fluent.host,
        port: settings.fluent.port || 24224,
        tag: settings.fluent.tag || "dev.app.smartiesai",
        label: settings.fluent.label || "log",
        timeout: settings.fluent.timeout || 3.0,
        reconnectInterval: settings.fluent.reconnectInterval || 1000,
        async: settings.fluent.async || true,
    },
    service: settings.service || "api.js"
});

// Helper to extract safe request context for logs
export function buildRequestContext(req) {
    try {
        const headers = req && req.headers ? req.headers : {};
        return {
            requestId: headers["x-request-id"] || headers["x-correlation-id"] || null,
            ip: (req && (req.ip || (req.connection && req.connection.remoteAddress))) || null,
            userAgent: headers["user-agent"] || null,
            path: req && req.url,
            method: req && req.method
        };
    } catch (_) {
        return {};
    }
}
