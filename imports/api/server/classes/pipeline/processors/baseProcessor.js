// base_processor.js

// Tiny helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = async (p, ms) => {
    if (!ms || ms <= 0) return p;
    let t;
    try {
        return await Promise.race([
            p,
            new Promise((_, rej) => (t = setTimeout(() => rej(new Error("processor_timeout")), ms))),
        ]);
    } finally { clearTimeout(t); }
};

// Minimal semaphore for per-processor concurrency control
class Semaphore {
    constructor(n = 1) { this.free = n; this.waiters = []; }
    async acquire() {
        if (this.free > 0) { this.free--; return; }
        await new Promise((res) => this.waiters.push(res));
        this.free--;
    }
    release() {
        this.free++;
        const w = this.waiters.shift();
        if (w) w();
    }
}

/**
 * BaseProcessor
 * - name: string (for logs/metrics)
 * - handles: Set<string> (kinds this processor accepts). null => accepts all.
 * - timeoutMs: max time per frame (optional)
 * - concurrency: in-flight frames allowed inside this processor (default 1)
 * - onError: (err, frame, ctx) => 'pass' | 'drop' | 'rethrow' | { next?: Frame, emitAll?: Frame[] }
 * - onTrace: (event, data) => void (optional, falls back to ctx.trace)
 */
class BaseProcessor {
    constructor({ name, handles = null, timeoutMs = 0, concurrency = 1, onError = null, onTrace = null } = {}) {
        this.name = name || this.constructor.name;
        this.handles = handles ? new Set(handles) : null;
        this.timeoutMs = timeoutMs;
        this.sem = new Semaphore(Math.max(1, concurrency));
        this.onError = onError;
        this.onTrace = onTrace;
    }

    accepts(frame) { return this.handles ? this.handles.has(frame.kind) : true; }

    // Public entrypoint used by the Pipeline
    async process(frame, ctx) {
        const trace = this.onTrace || ctx.trace || (() => { });
        const start = Date.now();
        await this.sem.acquire();
        try {
            trace("in", { kind: frame.kind });
            // Delegate to _process with timeout
            await withTimeout(this._process(frame, ctx), this.timeoutMs);
            trace("ok", { dt_ms: Date.now() - start });
        } catch (err) {
            trace("error", { message: String(err), dt_ms: Date.now() - start });
            await this._handleError(err, frame, ctx, trace);
        } finally {
            this.sem.release();
        }
    }

    // Override this in your processor subclasses
    /**
     * 
     * @param {import("../frames/frame.js").Frame} frame 
     * @param {import("../pipeline.js").PipelineContext} ctx 
     */
    async _process(frame, ctx) {
        // default behavior: pass through unchanged
        ctx.pass();
    }

    async _handleError(err, frame, ctx, trace) {
        if (!this.onError) { ctx.drop(); return; }
        const action = await this.onError(err, frame, ctx);
        if (action === "pass") return ctx.pass();
        if (action === "drop") return ctx.drop();
        if (action === "rethrow") throw err;
        if (action && action.next) return ctx.next(action.next);
        if (action && Array.isArray(action.emitAll)) return ctx.emitAll(action.emitAll);
        // default if handler returned nothing recognizable
        trace("error_default_drop");
        ctx.drop();
    }

    async close() { }
}

export { BaseProcessor, Semaphore, withTimeout, sleep };
