import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/PhoneService.js' });
import { status } from "@grpc/grpc-js";
import { tmq as phone } from "../../common/static_codegen/tmq/phone";

const { PhoneResponse, Phone, FetchPhoneResponse, Capabilities } = phone;

export default {
    createPhone: async function ({ request }, callback) {
        const response = new FetchPhoneResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                try {
                    await Core.getDB("phones", true).insertOne({
                        number: request.number,
                        countryCode: request.countryCode,
                        formattedNumber: request.formattedNumber,
                        capabilities: request.capabilities,
                        provider: request.provider,
                        providerSid: request.providerSid,
                        userId: request.userId,
                        businessId: request.businessId,
                        status: request.status,
                        monthlyPrice: request.monthlyPrice
                    });

                    response.success = true;
                    response.message = "Assistant created successfully";
                } catch (error) {
                    logger.error('createPhone error', { error: error?.message || error });
                    response.success = false;
                    response.message = "Failed to create assistant";
                }
            }
            callback(null, response);
        } catch (error) {
            logger.error('createPhone fatal', { error: error?.message || error });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    },
    fetchPhones: async function ({ request }, callback) {
        const response = new FetchPhoneResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                const phones = await Core.getDB("phones", true).find({ userId: request.userId }).toArray();
                if (phones.length > 0) {
                    phones.forEach(element => {
                        const p = new Phone();
                        const c = new Capabilities();
                        c.voice = element.capabilities.voice;
                        c.sms = element.capabilities.sms;
                        c.mms = element.capabilities.mms;
                        p.number = element.number;
                        p.countryCode = element.countryCode;
                        p.formattedNumber = element.formattedNumber;
                        p.capabilities = c;
                        p.provider = element.provider;
                        p.providerSid = element.providerSid;
                        p.businessId = element.businessId;
                        p.status = element.status;
                        p.monthlyPrice = element.monthlyPrice;
                        p.id = element._id.toString();
                        response.phones.push(p);
                    });
                    response.success = true;
                } else {
                    response.success = false;
                }
            }
            callback(null, response);
        } catch (error) {
            logger.error('fetchPhones error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    }
};
