import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const POPUP = {
    UPLOAD_DOCUMENT: "uploadDocumentPopup",
    RECORD_VOICE: "recordVoicePopup"
};

export const ASSISTANT_FORM = {
    NAME: "assistant",
    DESCRIPTION: "assistantDescription",
    FILES: "assistantFiles",
}

class IndexWatcher extends Watcher2 {
    #data;
    #processes = {};
    #lastBasis = null;
    #listen = null;

    constructor(parent) {
        super(parent);
        this.setValue(ASSISTANT_FORM.NAME, "");
        this.setValue(ASSISTANT_FORM.DESCRIPTION, "");
        this.setValue(ASSISTANT_FORM.FILES, []);
    }

    /**
     * Set the upload document popup visibility.
     * @param {boolean} [flag=false] - Whether the popup should be visible.
     */
    setUploadDocumentPopup(flag = false) {
        this.setValue(POPUP.UPLOAD_DOCUMENT, flag);
    }

    /**
     * Set the record voice popup visibility.
     * @param {boolean} [flag=false] - Whether the popup should be visible.
     */
    setRecordVoicePopup(flag = false) {
        this.setValue(POPUP.RECORD_VOICE, flag);
    }

    /**
     * Resets the assistant form fields to their default empty values.
     */
    resetAssistantForm() {
        this.setValue(ASSISTANT_FORM.NAME, "");
        this.setValue(ASSISTANT_FORM.DESCRIPTION, "");
        this.setValue(ASSISTANT_FORM.FILES, []);
    }

    /**
     * Handles the form submission for uploading a document.
     * Currently logs the name and description values to the console.
     */
    SubmitUploadDocumentForm() {
        console.log(this.getValue(ASSISTANT_FORM.NAME));
        console.log(this.getValue(ASSISTANT_FORM.DESCRIPTION));
    }

    /**
     * Handles the form submission for recording a voice note.
     * Currently logs the name and description values to the console.
     */
    SubmitRecordVoiceForm() {
        console.log(this.getValue(ASSISTANT_FORM.NAME));
        console.log(this.getValue(ASSISTANT_FORM.DESCRIPTION));
    }

}

export default new IndexWatcher(Client);
