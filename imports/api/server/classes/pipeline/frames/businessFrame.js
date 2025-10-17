import { Frame } from "./frame.js";

export class BusinessFrame extends Frame {
    constructor(business, meta = {}, ptsNs = nowNs()) {
        super("business", { ...meta, businessId: business._id }, ptsNs);
        this.business = business;
    }
}