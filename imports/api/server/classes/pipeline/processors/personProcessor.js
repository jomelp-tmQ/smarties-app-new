import { BaseProcessor } from "../processors/baseProcessor.js";
import { IdentityResolution } from "../../identity/IdentityResolution.js";
import { ConsumerFrame } from "../frames/consumerFrame.js";

export class PersonProcessor extends BaseProcessor {
    constructor() {
        super({ name: "PersonProcessor" });
    }
    /**
     * 
     * @param {ConsumerFrame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     * @returns 
     */
    async _process(frame, ctx) {
        if (frame instanceof ConsumerFrame) {
            try {
                const meta = {
                    deviceId: frame?.meta?.meta?.dev || frame?.meta?.meta?.deviceId || null,
                    cookieId: frame?.meta?.meta?.smrtid || frame?.meta?.meta?.urid || frame?.meta?.meta?.cookieId || null, // prefer stable first-party cookie if available
                    ipAsn: frame?.meta?.meta?.asn || frame?.meta?.meta?.ipAsn || null,
                    email: frame?.meta?.meta?.email || null,
                    phone: frame?.meta?.meta?.phone || null,
                    timeProximitySec: frame?.meta?.meta?.timeProximitySec // optional
                };
                const person = await IdentityResolution.resolveOrCreatePersonFromSignals({ businessId: frame.consumer.businessId, meta });
                await IdentityResolution.writeSoftLink({
                    businessId: frame.consumer.businessId,
                    personId: person._id,
                    consumerId: frame.consumer._id,
                    signals: meta
                });
            } catch (error) {
                ctx.trace("debug", { message: String(error), meta: frame.meta });
            }

        }
        ctx.pass();
    }
}