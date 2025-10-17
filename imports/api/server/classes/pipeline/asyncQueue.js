import Denque from 'denque';

export class AsyncQueue {
    constructor(capacity = 64) {
        this.capacity = capacity;
        this.buf = new Denque();
        this.waiters = [];
        this.closed = false;
    }
    async push(item) {
        if (this.closed) throw new Error('queue closed');
        while (this.buf.size() >= this.capacity) {
            // lightweight backoff; tune or replace with a condition var if needed
            await new Promise(r => setTimeout(r, 0));
        }
        this.buf.push(item);
        const w = this.waiters.shift();
        if (w) w({ value: this.buf.shift(), done: false });
    }
    close() {
        this.closed = true;
        for (const w of this.waiters) w({ value: undefined, done: true });
        this.waiters = [];
    }
    [Symbol.asyncIterator]() {
        return {
            next: () => new Promise(resolve => {
                if (!this.buf.isEmpty()) resolve({ value: this.buf.shift(), done: false });
                else if (this.closed) resolve({ value: undefined, done: true });
                else this.waiters.push(resolve);
            }),
            return: () => { this.close(); return Promise.resolve({ done: true, value: undefined }); },
        };
    }
}
