import { Frame } from "./frame.js";

export class ConsumerFrame extends Frame {
    constructor(consumer, meta = {}, ptsNs) {
        super("consumer", { ...meta }, ptsNs);
        this.consumer = consumer;
    }
}