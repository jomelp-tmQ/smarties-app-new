import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import CustomerEngagement from "../modules/CustomerEngagement";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const TAB = {
    LEAD: "leadTab",
}

export const EMAIL = {
    HEADLINE: "headline",
    CONTENT: "content",
}

class AttractShoppersWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
        this.customerEngagementRequest = new CustomerEngagement((hex, data) => this.parent.callFunc(hex, data));
    }


    searchLead(value) {
        console.log("Searching leads...", value);
        // Implement search logic here

        
    }

    leadTabChange(tab = 'all') {
        this.setValue(TAB.LEAD, tab);

        this.generateResponse({
            accountId: "sdk_test_account",
            customerId: "cust_med8iv7z_jcr2h"
        });
    }

    approveAndSend() {
        console.log("Approving and sending email...");
        console.log("Headline:", this.getValue(EMAIL.HEADLINE));
        console.log("Content:", this.getValue(EMAIL.CONTENT));
    }

    generateResponse({accountId, customerId}) {
        this.customerEngagementRequest.generateResponse({
            accountId: accountId,
            customerId: customerId
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }

}

export default new AttractShoppersWatcher(Client);