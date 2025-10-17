
import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../../Watcher2";
import Client from "../../Client";
import PhoneNumberClient from "phonenumber-client";
import VpManager from "../../modules/VpManager";
import phoneService from "../../../common/static_codegen/tmq/phone_pb";

const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;

class PhoneWatcher extends Watcher2 {
    constructor(parent) {
        super(parent);
        this.phoneNumberClient = new PhoneNumberClient();
    }

    handleSaveNumber(form, form2) {
        const formData = new FormData(form);
        const formData2 = new FormData(form2);
        let inbound = formData.get('inboundNumber');
        let outbound = formData2.get('outboundNumber');
        let callCountType = formData2.get('callCountType');
        let inboundDescription = formData.get('description');
        let outboundDescription = formData2.get('description');
    }

    async buyPhoneNumber(numberId) {
        const result = await this.phoneNumberClient.purchasePhoneNumber(numberId, Accounts.userId(), "this.parent.businessId");
        await VpManager.addPhoneNumber({
            phoneNumber: result.ownedNumber.number,
            type: 'twilio',
            credentials: {
                twilioAccountSid: result.credentials.sid,
                twilioAuthToken: result.credentials.authToken
            },
            name: Accounts.userId()
        });

        //  {
        //     id: purchasedNumber.phoneNumber,
        //     number: purchasedNumber.phoneNumber,
        //     countryCode: purchasedNumber.addressRequirements,
        //     formattedNumber: this.formatPhoneNumber(purchasedNumber.phoneNumber),
        //     capabilities: {
        //         voice: purchasedNumber.capabilities.voice,
        //         sms: purchasedNumber.capabilities.sms,
        //         mms: purchasedNumber.capabilities.mms
        //     },
        //     provider: 'twilio',
        //     providerMetadata: {
        //         sid: purchasedNumber.sid,
        //         dateCreated: purchasedNumber.dateCreated
        //     },
        //     userId,
        //     businessId,
        //     purchasedAt: new Date(),
        //     status: 'active',
        //     monthlyPrice: 1.00 // This would be configurable
        // };

        if (result) {
            const req = new phoneService.PhoneRequest();
            req.setUserid(Accounts.userId());
            req.setNumber(result.ownedNumber.number);
            req.setCountrycode(result.ownedNumber.addressRequirements);
            req.setFormattednumber(this.formatPhoneNumber(result.ownedNumber.number));
            req.setCapabilities(result.ownedNumber.capabilities);
            req.setProvider(result.ownedNumber.provider);
            req.setProvidersid(result.ownedNumber.providerMetadata.sid);
            req.setUserid(Accounts.userId());
            req.setBusinessid(result.ownedNumber.businessId);
            req.setStatus(result.ownedNumber.status);
            req.setMonthlyprice(result.ownedNumber.monthlyPrice);
            return this.Parent.callFunc(0x130f51e, req).then(({ result }) => {
                const deserialized = phoneService.PhoneResponse.deserializeBinary(result);
                return deserialized.toObject();
            });
        }
    }

    async searchAvailableNumbers(number) {
        return await this.phoneNumberClient.getAvailablePhoneNumbers({
            contains: number
        });
    }

    async fetchOwnedPhoneNumbers(options) {
        return await this.phoneNumberClient.getOwnedPhoneNumbers(options);
        // const req = new phoneService.FetchPhoneResponse();
        // req.setUserid(Accounts.userId());
        // return this.Parent.callFunc(0xa2263f75, req).then(({ result }) => {
        //     const deserialized = phoneService.FetchPhoneResponse.deserializeBinary(result);
        //     return deserialized.toObject();
        // });
    }

    async assignAssistantToPhoneNumber(phoneNumber, assistantId) {
        return await VapiManager.assignAssistantToPhoneNumber(phoneNumber, assistantId);
    }
}

export default new PhoneWatcher(Client);