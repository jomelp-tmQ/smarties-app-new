import core from "@tmq-dev-ph/tmq-dev-core-client";
import configService from "../common/static_codegen/tmq/config_pb";
import { useState, useEffect, useRef } from 'react';

const { Watcher } = core;

class Watcher2 extends Watcher {
    static _configInitPromise = null;
    static _config = null;
    constructor(props) {
        super(props);
        this.subscribers = new Set();
        this.state = new Map();
    }

    static async initConfigOnce(parent) {
        if (Watcher2._config) return Watcher2._config;
        if (Watcher2._configInitPromise) return Watcher2._configInitPromise;
        Watcher2._configInitPromise = (async () => {
            try {
                const req = new proto.tmq.GetClientConfigRequest();
                const { err, result } = await parent.callFunc(0xbb9d4ba3, req);
                if (err) throw err;
                const deserialized = proto.tmq.GetClientConfigResponse.deserializeBinary(result);
                const obj = deserialized.toObject();
                if (!obj.success) throw new Error(obj.errorMessage || 'Config fetch failed');
                const cfg = obj.config || {};
                const mapped = {
                    auth: {
                        username: cfg.auth?.username || "",
                        password: cfg.auth?.password || ""
                    },
                    smartiesAssistant: {
                        isHumanUrl: cfg.client?.smartiesAssistant?.isHumanUrl || ""
                    },
                    suggestion: {
                        url: cfg.client?.suggestion?.url || "",
                        min: cfg.client?.suggestion?.min || 1,
                        max: cfg.client?.suggestion?.max || 1
                    },
                    predefinedAnswer: {
                        serverUrl: cfg.predefined?.serverurl || "",
                        apiKey: cfg.predefined?.apikey || "",
                        refreshEndpoint: cfg.predefined?.refreshendpoint || ""
                    },
                    livekit: {
                        serverUrl: cfg.livekit?.serverurl || ""
                    }
                };
                Watcher2._config = mapped;
                return mapped;
            } finally {
                // keep the resolved config; allow GC of the promise reference
                Watcher2._configInitPromise = null;
            }
        })();
        return Watcher2._configInitPromise;
    }

    async ensureConfig() {
        const cfg = await Watcher2.initConfigOnce(this.Parent);
        this.activateWatch();
        return cfg;
    }

    // Subscribe a component's update function
    setWatcher(callback) {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    // Notify all subscribers to update triggers re-render
    activateWatch() {
        this.subscribers.forEach(callback => callback());
    }

    // Set a value and trigger updates
    setValue(key, value) {
        this.state.set(key, value);
        this.activateWatch();
    }

    // Get a value
    getValue(key) {
        return this.state.get(key);
    }

    // Delete a value
    deleteValue(key) {
        this.state.delete(key);
        this.activateWatch();
    }

    // Clear all values
    clear() {
        this.state.clear();
        this.activateWatch();
    }
}

// React Hook to use the Watcher
export function useWatcher(watcher) {
    const [, forceUpdate] = useState({});

    useEffect(() => {
        // Subscribe to updates
        const unsubscribe = watcher.setWatcher(() => {
            forceUpdate({});
        });

        // Cleanup subscription
        return () => {
            unsubscribe();
        };
    }, [watcher]);

    return watcher;
}

// Example usage:
const MyComponent = () => {
    const watcher = useRef(new Watcher()).current;
    useWatcher(watcher);

    const handleClick = () => {
        watcher.setValue('counter', (watcher.getValue('counter') || 0) + 1);
    };

    return (
        <div>
            <p>Counter: {watcher.getValue('counter') || 0}</p>
            <button onClick={handleClick}>Increment</button>
        </div>
    );
};

export { Watcher2 };