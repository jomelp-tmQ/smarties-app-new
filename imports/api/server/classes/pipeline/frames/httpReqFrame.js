import { Frame } from "./frame.js";
import crypto from "node:crypto";

const correlationId = (req) =>
    req.headers["x-correlation-id"] ||
    req.headers["x-request-id"] ||
    crypto.randomUUID();

const idempotencyKey = (req) =>
    req.headers["idempotency-key"] ||
    req.headers["x-idempotency-key"] ||
    null;

export class httpReqFrame extends Frame {
    constructor(req, res, meta = {}, ptsNs) {
        meta = { ...meta, correlation_id: correlationId(req), idempotency_key: idempotencyKey(req) };
        super("http.req", { ...meta }, ptsNs);
        this.req = req;
        this.res = res;
    }
}