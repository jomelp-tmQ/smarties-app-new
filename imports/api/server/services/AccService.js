import { Adapter, Core } from "@tmq-dev-ph/tmq-dev-core-server";
import { status } from "@grpc/grpc-js";
import { tmq as acc } from "../../common/static_codegen/tmq/acc";
import { logger as baseLogger } from "../utils/serverUtils";
const logger = baseLogger.child({ service: 'services/AccService.js' });

const { AccCustomerIdResponse } = acc;

export default {
    fetchCustomerId: async function ({ request }, callback) {
        const response = new AccCustomerIdResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                // const user = await Meteor.users.findOne({ _id: this.user()._id });
                const user = await Core.getDB("users", true).findOne({ _id: request.userId });
                if (user) {
                    response.success = true;
                    response.customerId = user.customerId;
                } else response.success = false;
            }
            callback(null, response);
        } catch (error) {
            logger.error('fetchCustomerId error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    },
    fetchAccountDetails: async function ({ request }, callback) {
        const response = new acc.AccAccountResponse();
        try {
            const { ServerInstance } = Adapter;
            if (!ServerInstance) {
                callback({
                    code: 500,
                    message: "Server instance not initialized!",
                    status: status.INTERNAL
                });
            } else {
                const user = await Core.getDB("users", true).findOne({ _id: request.userId });
                if (user) {
                    response.id = user._id;
                    if (user.customerId) response.customerId = user.customerId;
                    else response.customerId = "";
                    user.emails.forEach(email => {
                        const e = new acc.Emails();
                        e.address = email.address;
                        e.verified = email.verified;
                        response.emails.push(e);
                    });
                    response.userName = user.username;

                    const p = new acc.Profile();
                    p.address = user.profile.address;
                    p.displayName = user.profile.displayName;
                    p.email = user.profile.email;
                    p.phone = user.profile.phone;
                    p.address = user.profile.address;
                    p.city = user.profile.city;
                    p.state = user.profile.state;
                    p.zip = user.profile.zip;
                    p.country = user.profile.country;
                    p.website = user.profile.website;
                    p.avatar = user.profile.avatar;
                    p.address2 = user.profile.address2;
                    p.nickName = user.profile.nickName;

                    const r = new acc.Roles();
                    r.userRole = user.profile.roles.userRole;
                    r.adminRole = user.profile.roles.adminRole;
                    r.superAdminRole = user.profile.roles.superAdminRole;
                    p.roles = r;

                    response.profile = p;
                }
            }
            callback(null, response);
        } catch (error) {
            logger.error('fetchAccountDetails error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    },

    updateAccountDetails: async function ({ request }, callback) {
        const response = new acc.UpdateAccountResponse();
        try {
            const user = Core.getDB("users", true).updateOne({ _id: request.userId }, {
                $set: {
                    "profile.address": request.address,
                    "profile.phone": request.phone
                }
            });
            if (user) {
                if (request.currentPassword && request.newPassword) {
                    Accounts.changePassword(request.currentPassword, request.newPassword, (error) => {
                        if (error) {
                            response.success = false;
                            response.message = "Failed to change password: " + error.message;
                            return callback(null, response);
                        }
                    });
                }

                response.success = true;
                response.message = "Account updated successfully";
            } else {
                response.success = false;
                response.message = "Failed to update account";
            }
            callback(null, response);
        } catch (error) {
            logger.error('updateAccountDetails error', { error: error?.message || error });
            callback({
                code: 500,
                message: "Server instance not initialized!",
                status: status.INTERNAL
            });
        }
    }
};
