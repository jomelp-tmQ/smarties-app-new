import { Watcher2 } from "../Watcher2";
import { Mongo } from "meteor/mongo";
import moment from "moment";
import widgetSession from "../modules/WidgetSession";

const WAITING_MESSAGES = [
    "Processing...",
    "Please wait...",
    "One moment, please...",
    "Loading...",
    "Fetching information...",
    "Hang tight...",
    "Working on it...",
    "Stand by...",
    "Almost there...",
    "Just a sec...",
    "Calculating...",
    "Gathering data...",
    "Hold tight...",
    "Bear with me...",
    "Coming right up...",
    "In progress...",
    "Preparing your request...",
    "Just a moment...",
    "Please hold...",
    "Sit tight...",
    "Retrieving results...",
    "Crunching numbers...",
    "We're on it...",
    "Stay tuned...",
    "Making magic happen...",
    "Hold the line...",
    "Good things take time...",
    "Your request is important to us...",
    "Thank you for your patience...",
    "We're getting there...",
    "Any second now...",
    "Almost done...",
    "Won't be long now...",
    "Finalizing...",
    "Updating records...",
    "Synchronizing data...",
    "Processing your request...",
    "Compiling information...",
    "Analyzing...",
    "Hang on...",
    "Wait a moment...",
    "Loading data...",
    "Please stand by...",
    "Standby...",
    "In the meantime, take a deep breath...",
    "Processing the magic...",
    "Connecting to the server...",
    "Loading your content...",
    "Preparing data...",
    "We're working on it...",
    "Just a tick...",
    "Hold please...",
    "Data incoming...",
    "We're almost ready...",
    "Getting things ready...",
    "Initializing...",
    "Setting things up...",
    "Warming up the engines...",
    "Making it happen...",
    "Stay with us...",
    "Bringing it to you...",
    "Good things are coming...",
    "Hold on to your hat...",
    "We're nearly there...",
    "Just ironing out the details...",
    "Dotting the i's and crossing the t's...",
    "Any moment now...",
    "Processing your data...",
    "Hang in there...",
    "Awaiting response...",
    "Your patience is appreciated...",
    "Things are happening...",
    "Final touches...",
    "Wrapping things up...",
    "Almost finished...",
    "Wait for it...",
    "Right around the corner...",
    "Results are on the way...",
    "We haven't forgotten you...",
    "Everything's in motion...",
    "We're cooking up something good...",
    "Hold steady...",
    "On the way...",
    "Time is relative, results are absolute...",
    "Synchronizing...",
    "Just about ready...",
    "We're close...",
    "Booting up...",
    "Loading resources...",
    "Connecting you now...",
    "The wheels are turning...",
    "Aligning the stars...",
    "Unveiling results soon...",
    "Bringing you the goods...",
    "Almost in your hands...",
    "Stay on the line...",
    "Your turn is coming up...",
    "Seconds away...",
    "We're on the case...",
    "Processing, please stand by..."
];
const TRANSCRIPT_STATUS = {
    FINAL: "final",
    PENDING: "pending",
    TEMPORARY: "temporary"
};

class RoundRobin {
    #index = 0;
    #list = [];
    constructor(list) {
        this.#list = list;
    }
    next() {
        if (this.#index >= this.#list.length) this.#index = 0;
        return this.#list[this.#index++];
    }
}

export class ChatBot extends Watcher2 {
    #transcripts = new Mongo.Collection(null);
    #roundRobin = new RoundRobin(WAITING_MESSAGES);
    #timeout = null;
    #timeoutInMs = 1000 * 3;
    #threadId = null;
    constructor(parent) {
        super(parent);
    }
    /**
   * @returns {LLMClient}
   */
    get Transcripts() {
        return this.#transcripts.find().fetch();
    }

    onLoad(timeout = 1000, retry = 0, assistantId, businessId) {
        if (this.#transcripts.find().count() === 0) {
            // this.createTranscript("inbound", "Hello, how can I help you today?");
            if (this.onloaded) clearTimeout(this.onloaded);
            this.onloaded = setTimeout(() => {
                this.sendRequest("Hello", assistantId, businessId).catch(() => {
                    if (retry < 3) {
                        this.onLoad(timeout * 2, retry + 1, assistantId);
                    }
                });
            }, timeout);
        }
    }

    createTranscript(direction, message, status = TRANSCRIPT_STATUS.FINAL) {
        this.#transcripts.insert({ direction, message, timestamp: moment().format("YYYY-MM-DD HH:mm:ss"), status });
        this.Parent.setValue("chats", this.Transcripts);
    }
    askQuestion(question, initial = false, assistantId, businessId) {
        if (!initial) this.createTranscript("outbound", question);
        this.activateWatcher();
        return this.sendRequest(question, assistantId, businessId).then(this.activateWatcher.bind(this));
    }
    addTemporaryTranscript() {
        const message = this.#roundRobin.next();
        this.createTranscript("inbound", message, TRANSCRIPT_STATUS.TEMPORARY);
        this.activateWatcher();
        if (this.#timeout) clearTimeout(this.#timeout);
        this.#timeout = setTimeout(() => {
            this.removeTemporaryTranscript();
            this.addTemporaryTranscript();
        }, this.#timeoutInMs);
    }
    removeTemporaryTranscript() {
        if (this.#timeout) clearTimeout(this.#timeout);
        this.#transcripts.remove({ status: TRANSCRIPT_STATUS.TEMPORARY });
        this.Parent.setValue("chats", this.Transcripts);
        this.activateWatcher();
    }
    setSession() {
        const sessionId = widgetSession.generateSessionId();
        widgetSession.setSessionId(sessionId);
    }
    async sendRequest(query, assistantId, businessId) {
        try {
            const payload = {};
            if (this.#threadId) payload.threadId = this.#threadId;
            if (query) payload.query = query;
            if (this.#timeout) clearInterval(this.#timeout);
            this.addTemporaryTranscript();
            return await widgetSession.sendChatMessage({
                message: query,
                assistantId,
                businessId
            }).then(async (response) => {
                if (response && response.response) {
                    this.createTranscript("inbound", response.response);
                }
            }).finally(() => {
                if (this.#timeout) clearTimeout(this.#timeout);
                this.removeTemporaryTranscript();
            });
        } catch (error) {
            console.error(error);
        }

    }

    reset() {
        this.#transcripts.remove({});
        this.Parent.setValue("chats", []);
    }
}