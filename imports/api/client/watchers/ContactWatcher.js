import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const POPUP = {
    FILTER_CONTACTS: "filterContactsPopup",
    CONTACT_DETAILS: "contactDetailsPopup"
};

export const TAB = {
    CONTACT_DETAILS: "contactDetailsTab",
}

class ContactWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
    }
    async searchContacts(value) {
        console.log("Searching contacts...", value);
        // Implement search logic here
    }

    toggleFilterContactsPopup() {
        this.setValue(POPUP.FILTER_CONTACTS, !this.getValue(POPUP.FILTER_CONTACTS));
    }

    setSelectedContact(contact) {
        console.log("Selected contact:", contact);
    }

    toggleContactDetailsPopup() {
        this.setValue(POPUP.CONTACT_DETAILS, !this.getValue(POPUP.CONTACT_DETAILS));
    }

    contactDetailsTabChange(tab = 'conversation') {
        this.setValue(TAB.CONTACT_DETAILS, tab);
    }
}

export default new ContactWatcher(Client);