import { Frame } from "./frame.js";

export class InboxFrame extends Frame {
    constructor(inbox, meta = {}, ptsNs) {
        super("inbox", { ...meta }, ptsNs);
        this.inbox = inbox;
    }
}