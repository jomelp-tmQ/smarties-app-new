// pipeline.js (ESM)
import { AsyncQueue } from "./asyncQueue.js";
import { Frame } from "./frames/frame.js";

/**
 * @typedef {Object} TraceConfig
 * @property {boolean}  [verbose=true]
 * @property {boolean}  [suppressProcessorIn=false] // avoid duplicate [in] if BaseProcessor also logs "in"
 * @property {string[]} [includeMetaKeys=['correlation_id','idempotency_key','tenant','attempt']]
 * @property {string[]} [previewKeys=['text','body']]
 * @property {number}   [maxPreview=120]
 */

/**
 * @typedef {Object} PipelineOptions
 * @property {number}      [queueCapacity=64]
 * @property {Function}    [onTrace] // (proc, event, data) => void
 * @property {TraceConfig} [trace]
 */

/**
 * @typedef {Object} PipelineContext
 * @property {AbortSignal} abortSignal
 * @property {() => bigint} nowNs
 * @property {(event: string, data: any) => void} trace
 * @property {() => void} pass
 * @property {(frame: Frame) => void} next
 * @property {(frames: Frame[]) => void} emitAll
 * @property {() => void} drop
 */

// ---------- internals for tracing ----------
const START_TS = Symbol("pipeline_start_ns");
const nowNs = () => process.hrtime.bigint();
const dtMs = (startNs, endNs = nowNs()) => Number((endNs - startNs) / 1000000n);

function getQSize(q) {
    // support AsyncQueue implementations with .size or .length or .buf?.length
    if (typeof q.size === "number") return q.size;
    if (typeof q.length === "number") return q.length;
    if (q.buf && typeof q.buf.length === "number") return q.buf.length;
    return undefined;
}

/** Build a compact, safe summary of a frame for logs */
function summarizeFrame(frame, cfg) {
    const kind = frame?.kind ?? frame?.constructor?.name ?? "unknown";
    const m = frame?.meta;
    const meta = {};
    if (m && typeof m === "object") {
        for (const k of cfg.includeMetaKeys) {
            if (Object.prototype.hasOwnProperty.call(m, k)) meta[k] = m[k];
        }
    }
    const preview = {};
    for (const k of cfg.previewKeys) {
        if (frame?.[k] === undefined) continue;
        const v = frame[k];
        if (typeof v === "string") {
            preview[k] = v.length > cfg.maxPreview ? v.slice(0, cfg.maxPreview) + "…" : v;
        } else if (
            (typeof Buffer !== "undefined" && Buffer.isBuffer(v)) ||
            v instanceof Uint8Array ||
            v instanceof ArrayBuffer
        ) {
            const len = typeof Buffer !== "undefined" && Buffer.isBuffer(v) ? v.length : (v.byteLength ?? 0);
            preview[k] = `binary(${len} bytes)`;
        } else {
            let s;
            try { s = JSON.stringify(v); } catch { s = String(v); }
            preview[k] = s.length > cfg.maxPreview ? s.slice(0, cfg.maxPreview) + "…" : s;
        }
    }
    return { kind, meta, preview };
}

/******** Pipeline ********/
class Pipeline {
    /** @param {Array<any>} processors @param {PipelineOptions} opts */
    constructor(processors = [], opts = {}) {
        this.processors = processors;
        this.opts = opts;
        this.inQ = new AsyncQueue(opts.queueCapacity ?? 64);
        this.outQ = new AsyncQueue(opts.queueCapacity ?? 64);
        this.controller = new AbortController();

        // trace config
        this.tcfg = {
            verbose: true,
            suppressProcessorIn: false,
            includeMetaKeys: ["correlation_id", "idempotency_key", "tenant", "attempt"],
            previewKeys: ["text", "body"],
            maxPreview: 120,
            ...(opts.trace || {}),
        };
    }

    get abortSignal() { return this.controller.signal; }
    _emitTrace(p, e, d) { this.opts.onTrace && this.opts.onTrace(p, e, d); }
    _vtrace(proc, event, frame, extra = {}) {
        if (!this.tcfg.verbose) return;
        const base = frame ? summarizeFrame(frame, this.tcfg) : {};
        this._emitTrace(proc, event, { ...base, ...extra });
    }

    async start() {
        (async () => {
            for await (const first of this.inQ) {
                if (!first[START_TS]) first[START_TS] = nowNs();
                this._vtrace("pipeline", "dequeue", first, { inQ: getQSize(this.inQ) });

                let frames = [first];
                for (let i = 0; i < this.processors.length; i++) {
                    const p = this.processors[i];
                    const nextBatch = [];
                    this._emitTrace(p.name, "stage_enter", { index: i });

                    for (const f of frames) {
                        if (!p.accepts(f)) {
                            this._vtrace(p.name, "skip", f, { reason: "not_accepted" });
                            nextBatch.push(f);
                            continue;
                        }

                        let decided = false;
                        const ctx = {
                            abortSignal: this.abortSignal,
                            nowNs,
                            trace: (ev, data) => this._emitTrace(p.name, ev, data),
                            pass: () => { decided = true; nextBatch.push(f); this._vtrace(p.name, "pass", f); },
                            next: (g) => {
                                decided = true;
                                if (g) {
                                    // carry start timestamp + correlation_id forward
                                    if (!g[START_TS]) g[START_TS] = f[START_TS] ?? nowNs();
                                    if (f.meta && g.meta && g.meta.correlation_id == null && f.meta.correlation_id != null) {
                                        g.meta.correlation_id = f.meta.correlation_id;
                                    }
                                    nextBatch.push(g);
                                    this._vtrace(p.name, "next", g, { from: summarizeFrame(f, this.tcfg) });
                                }
                            },
                            emitAll: (arr) => {
                                decided = true;
                                let cnt = 0;
                                for (const g of (arr || [])) {
                                    if (!g) continue;
                                    if (!g[START_TS]) g[START_TS] = f[START_TS] ?? nowNs();
                                    if (f.meta && g.meta && g.meta.correlation_id == null && f.meta.correlation_id != null) {
                                        g.meta.correlation_id = f.meta.correlation_id;
                                    }
                                    nextBatch.push(g);
                                    cnt++;
                                }
                                this._vtrace(p.name, "emitAll", f, { count: cnt });
                            },
                            drop: () => { decided = true; this._vtrace(p.name, "drop", f); },
                        };

                        const t0 = nowNs();
                        if (!this.tcfg.suppressProcessorIn) this._vtrace(p.name, "in", f, { stage: i });
                        try {
                            await p.process(f, ctx);
                            if (!decided) ctx.pass(); // default pass-through
                        } catch (e) {
                            // include rich context so onTrace can react (e.g., push 500)
                            this._emitTrace(p.name, "error", {
                                message: String(e),
                                kind: f.kind,
                                meta: f.meta,
                                framePtsNs: f.ptsNs ?? undefined,
                                stage: i,
                            });
                            // default error policy: drop
                        }
                        const t1 = nowNs();
                        this._emitTrace(p.name, "latency", { dt_ms: dtMs(t0, t1) });
                    }

                    this._emitTrace(p.name, "stage_exit", { index: i, produced: nextBatch.length });
                    frames = nextBatch;
                    if (!frames.length) break;
                }

                for (const f of frames) {
                    await this.outQ.push(f);
                    const total = f[START_TS] ? dtMs(f[START_TS]) : undefined;
                    this._vtrace(
                        "pipeline",
                        "output_push",
                        f,
                        { outQ: getQSize(this.outQ), ...(total !== undefined ? { total_dt_ms: total } : {}) }
                    );
                }
            }
            this._emitTrace("pipeline", "drained");
            this.outQ.close();
        })().catch(e => this._emitTrace("pipeline", "fatal", { message: String(e) }));
    }

    async push(f) {
        if (f && !f[START_TS]) f[START_TS] = nowNs();
        await this.inQ.push(f);
        this._vtrace("pipeline", "enqueue", f, { inQ: getQSize(this.inQ) });
    }

    async *output() { for await (const f of this.outQ) yield f; }

    async stop() {
        this.controller.abort();
        this.inQ.close();
        await Promise.all(this.processors.map(p => p.close?.() || Promise.resolve()));
        this.outQ.close();
        this._emitTrace("pipeline", "stopped");
    }
}

export { Pipeline, summarizeFrame, PipelineContext };
