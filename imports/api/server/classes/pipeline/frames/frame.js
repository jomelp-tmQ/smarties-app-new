const nowNs = () => process.hrtime.bigint();
/**
 * Base Frame
 * - kind: discriminator used by processors (e.g. 'in.request', 'http.req', 'db.update')
 * - meta: bag for correlation_id, idempotency_key, tenant, attempt, etc.
 * - ptsNs: monotonic timestamp for tracing/metrics
 */
export class Frame {
    constructor(kind, meta = {}, ptsNs = nowNs()) {
        this.kind = kind;
        this.meta = meta || {};
        this.ptsNs = ptsNs;
    }
    withMeta(patch = {}) {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
            meta: { ...(this.meta || {}), ...patch },
        });
    }
}