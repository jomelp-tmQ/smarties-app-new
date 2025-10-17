import core from "@tmq-dev-ph/tmq-dev-core-client";
import { DDP } from "meteor/ddp-client";
import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";
import { Watcher2 } from "./Watcher2";
import { toast } from "sonner";
import { TOAST_STYLE } from "../common/const";
const { Adapter, Logger, Account } = core;
import { Accounts } from 'meteor/tmq:accounts';
import SessionWatcher from "./watchers/SessionWatcher";
import { syncManager } from 'redisvent-module';
import { Configs } from 'meteor/tmq:configs';

Adapter.Accounts = Accounts;
Adapter.Meteor = Meteor;
Adapter.Mongo = Mongo;
Adapter.DDP = DDP;
class Client extends Watcher2 {
    #currentUser = null;
    #redisVentReadyPromise = null;
    constructor(parent) {
        super(parent);
        this.secureTransaction();
        Configs.mergeConfigs(this.Settings);
        this.account = new Account(this);
        this.startup();
        if (!this.#currentUser) {
            Accounts.getCurrentUser().then((user) => {
                this.#currentUser = user;
                SessionWatcher.listen(user.businessId);
            });
        }
        this.initializeRedisVent(this.Settings.wsUrl || 'ws://localhost:3503');
    }
    // getKeys() {
    //     const userId = "123";
    //     const request = new PublicKeyRequest();
    //     request.setUserid(userId);
    //     return this.callFunc(0xad08520f, request).then(({ result }) => {
    //         const deserialized = PublicKeyResponse.deserializeBinary(result);
    //         const publicKey = deserialized.getPublickey();
    //         const assistantId = deserialized.getAssistantid();
    //         console.log(deserialized.toObject());
    //         return { publicKey, assistantId };
    //     });
    // }
    get CurrentUser() {
        return this.#currentUser;
    }

    startup() {
        // const interval = setInterval(() => {
        //     if (this.initConfig()) {
        //         clearInterval(interval);
        //         this.initFeatures(this.Settings.featuresUrl, this.Settings.featuresClientKey, this.Settings.featuresAppName).then(() => {
        //             Logger.showDebug("Features initialized", this.Features.IsReady,);
        //         });
        //     }
        // }, 1000);
    }
    async loginWithPassword(email, password) {
        await Accounts.loginWithPassword(email, password);
        const user = await this.waitForLoginReady(15000);
        this.#currentUser = user;
        try {
            if (user && user.businessId) {
                SessionWatcher.listen(user.businessId);
            }
        } catch (err) {
            Logger.showError("SessionWatcher listen failed", err);
        }
        return user;
    }

    SignOut() {
        this.account.logoutAccount().then(() => {
            toast.success('Logout Successfully', {
                style: TOAST_STYLE.SUCCESS
            });
            window.location.reload();
        }).catch((err) => {
            Logger.showError("Logout failed", err);
        });
    }

    signup(username, password, email) {
        this.account.signup(email, password, password, email, { displayName: "KURT" }, {
            verificationIsCode: false,
        }).then((res) => {
            Logger.showDebug("Signup successful", res);
        }).catch((err) => {
            Logger.showError("Signup failed", err);
        });
    }

    get RedisVentReadyPromise() {
        return this.#redisVentReadyPromise;
    }

    initializeRedisVent(wsUrl = 'ws://localhost:3503') {
        if (this.#redisVentReadyPromise) return;
        syncManager.connect(wsUrl, async () => {
            console.log('Sync to server via Meteor methods');
        }).then(() => {
            console.log('RedisVent client connected');
            this.#redisVentReadyPromise = true;
        }).catch(error => {
            console.error('RedisVent connection failed:', error);
            this.#redisVentReadyPromise = false;
            throw error;
        });
    }
    /**
     * Waits until the Meteor login session is established and current user data is available.
     * Resolves with the current user document or throws on timeout.
     * @param {number} timeoutMs
     * @returns {Promise<object>}
     */
    async waitForLoginReady(timeoutMs = 10000) {
        const startTimeMs = Date.now();
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        while (Date.now() - startTimeMs < timeoutMs) {
            try {
                const isLoggedIn = typeof Accounts.isLoggedIn === 'function' ? Accounts.isLoggedIn() : !!Adapter.Meteor.userId();
                if (!isLoggedIn) {
                    await sleep(100);
                    continue;
                }
                if (typeof Accounts.isReady === 'function' && !Accounts.isReady()) {
                    await sleep(100);
                    continue;
                }
                const user = await Accounts.getCurrentUser();
                if (user && user._id) {
                    return user;
                }
            } catch (err) {
                // Ignore transient errors while session stabilizes
            }
            await sleep(100);
        }
        throw new Error('Login session not ready in time');
    }
}

export default (Adapter.ClientInstance = new Client());