import { Frame } from "./frame.js";

export class httpResponseFrame extends Frame {
    constructor({ header, body, status }, meta = {}, ptsNs) {
        super("http.response", { ...meta }, ptsNs);
        this.header = header;
        this.body = body;
        this.status = status;
    }
}