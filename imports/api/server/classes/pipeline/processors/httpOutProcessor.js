import { BaseProcessor } from "./baseProcessor.js";
import { httpResponseFrame } from "../frames/httpResponseFrame.js";

class HttpOutProcessor extends BaseProcessor {
    constructor(req, res) {
        super({ name: "HttpOutProcessor" });
        this.res = res;
        this.req = req;
    }
    /**
     * 
     * @param {httpResponseFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {
        if (!this.res) {
            ctx.drop();
            return;
        }
        if (frame instanceof httpResponseFrame) {
            if (frame.header) {
                this.res.setHeader(frame.header.key, frame.header.value);
            }
            if (frame.status) {
                this.res.status(frame.status);
            }
            if (frame.body) {
                this.res.json(frame.body);
            }
            return;
        }
        ctx.drop();
    }
}

export { HttpOutProcessor };