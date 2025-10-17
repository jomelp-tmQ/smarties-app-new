import { Frame } from "./frame.js";

export class ChannelFrame extends Frame {
    constructor(channel, meta = {}, ptsNs) {
        super("channel", { ...meta }, ptsNs);
        this.channel = channel;
    }
}