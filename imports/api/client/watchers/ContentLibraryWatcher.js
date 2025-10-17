import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import { contentItems } from "./data/contentLibrary";
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const TABLE = {
    LOADING_CONTENT: 'loadingContent',
    CONTENT_ITEMS: 'contentItems',
    SELECTED_CONTENT_ITEM: 'selectedContentItem',
    FILTER_STATUS: 'filterStatus',
}

class ContentLibraryWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
    }

    fetchContentItems(filter = 'all') {
        this.setValue(TABLE.LOADING_CONTENT, true);
        const filteredItems = contentItems.filter(item => filter === 'all' || item.status === filter);
        this.setValue(TABLE.CONTENT_ITEMS, filteredItems);
        setTimeout(() => {
            this.setValue(TABLE.LOADING_CONTENT, false);
        }, 1000);
    }

    selectContentItem(item) {
        this.setValue(TABLE.SELECTED_CONTENT_ITEM, item);
    }

    blogTabChange(tab = 'all') {
        this.setValue(TABLE.FILTER_STATUS, tab);
        this.fetchContentItems(tab);
    }

}

export default new ContentLibraryWatcher(Client);