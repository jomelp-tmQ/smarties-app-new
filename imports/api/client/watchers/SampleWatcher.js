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

class SampleWatcher extends Watcher2 {
    #data
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
    }

}

export default new SampleWatcher(Client);