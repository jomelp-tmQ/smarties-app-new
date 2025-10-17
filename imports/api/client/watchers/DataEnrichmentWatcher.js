import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
// import dataenrichmentService from "../../common/static_codegen/tmq/dataenrichment_pb";
import { INTERACTION } from "./MessagingWatcher";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;

class DataEnrichmentWatcher extends Watcher2 {
    #businessId = "";
    #sessionId = "";
    constructor(parent) {
        super(parent);
        Accounts.getCurrentUser().then((user) => {
            Logger.showLog("DataEnrichmentWatcher: Current user", user);
            this.#businessId = user.businessId;
        }).catch((error) => {
            Logger.showError("DataEnrichmentWatcher: Failed to get current user", error);
        });
    }

    async fetchDataEnrichment() {
        Logger.showLog("DataEnrichmentWatcher: Fetching data enrichment");
        const req = new proto.tmq.DataEnrichmentRequest();
        const currentInbox = this.getValue(INTERACTION.CURRENT);
        const consumerId = currentInbox.consumerId || currentInbox.consumerId._str || currentInbox.consumerId.toString();
        req.setBusinessId(this.#businessId);
        req.setConsumerId(consumerId);
        const { err, result } = await this.Parent.callFunc(0x2686675b, req);
        if (err) {
            console.error("Error fetching data enrichment:", err);
            toast.error("Failed to fetch data enrichment", TOAST_STYLE);
            return;
        }

        const response = proto.tmq.DataEnrichmentResponse.deserializeBinary(result);
        const responseObj = response.toObject();
        console.log("DataEnrichmentWatcher: Data enrichment response", responseObj);
        // return true;
    }
}

export default new DataEnrichmentWatcher(Client);