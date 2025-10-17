import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import { loyaltyMembers } from "./data/loyaltyMember";
import SalesEnablement from "../modules/SalesEnablement";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const TABLE = {
    LOADING_MEMBERS: 'loadingMembers',
    MEMBERS: 'members',
}

class BuildLoyaltyWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
        this.salesEnablementRequest = new SalesEnablement((hex, data) => this.parent.callFunc(hex, data));
    }

    searchLoyaltyMembers(value) {
        console.log("Searching loyalty members with value:", value);
    }

    fetchLoyaltyMembers() {
        this.setValue(TABLE.LOADING_MEMBERS, true);
        // Simulate fetching data
        this.setValue(TABLE.MEMBERS, loyaltyMembers);
        setTimeout(() => {
            this.setValue(TABLE.LOADING_MEMBERS, false);
        }, 1000);
    }

    createLoyaltyPoints() {
        this.salesEnablementRequest.createLoyaltyPoints({
            customerId: "68a610d9bb20b24cc0bd4853",
            totalAmount: 100,
            orderId: "123456",
            invoiceId: "123456",
            transactionId: "123456",
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }

    spendLoyaltyPoints() {
        this.salesEnablementRequest.spendLoyaltyPoints({
            customerId: "68a610d9bb20b24cc0bd4853",
            points: 100,
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }

    createDiscountCode() {
        this.salesEnablementRequest.createDiscountCode({
            name: "Discount Code",
            code: "123456",
            type: "percentage",
            value: 10,
            currency: "USD",
            maxUses: 1,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            minimumAmount: 100,
            userId: "test_user_1754428233728",
            metadata: {
                description: "Discount Code",
            }
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }
}

export default new BuildLoyaltyWatcher(Client);