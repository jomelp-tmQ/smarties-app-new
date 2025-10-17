import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
import { blogTopics, headlines } from "./data/blog";
const { Adapter, Logger } = core;


Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

export const STEPS = {
    CURRENT_POSITION: "currentBlog",
};

export const TAB = {
    TOPIC: "topicTab",
};

export const BLOG = {
    LOADING_TOPIC: "loading",
    LOADING_HEADLINES: "loadingHeadlines",
    TOPICS: "all",
    HEADLINES: "headlines",

};

class BlogWatcher extends Watcher2 {
    #data;
    #processes = {};
    #lastBasis = null;
    #listen = null;
    constructor(parent) {
        super(parent);
        this.setValue(STEPS.CURRENT_POSITION, 0);
        this.setValue(BLOG.HEADLINES, []);
    }

    goNext() {
        const currentPosition = this.getValue(STEPS.CURRENT_POSITION);
        this.setValue(STEPS.CURRENT_POSITION, currentPosition + 1);
        this.fetchDataAccordingtoPosition(currentPosition + 1);
    }
    goPrevious() {
        const currentPosition = this.getValue(STEPS.CURRENT_POSITION);
        if (currentPosition > 0) {
            this.setValue(STEPS.CURRENT_POSITION, currentPosition - 1);
            this.fetchDataAccordingtoPosition(currentPosition + 1);
        } else {
            toast.error("You are already at the first step.", {
                style: TOAST_STYLE.ERROR,
            });
        }
    }

    fetchDataAccordingtoPosition(position) {
        switch (position) {
            case 0:
                this.fetchTopic();
                break;
            case 1:
                this.fetchHeadlines();
                break;
            default:
                toast.error("Invalid step position.", {
                    style: TOAST_STYLE.ERROR,
                });
        }
    }


    fetchTopic() {
        this.setValue(BLOG.LOADING_TOPIC, true);
        this.setValue(BLOG.TOPICS, blogTopics);
        setTimeout(() => {
            this.setValue(BLOG.LOADING_TOPIC, false);
        }, 1000);
    }

    topicTabChange(tab = 'all') {
        this.setValue(TAB.TOPIC, tab);
    }

    fetchHeadlines() {
        this.setValue(BLOG.LOADING_HEADLINES, true);
        this.setValue(BLOG.HEADLINES, headlines);
        setTimeout(() => {
            this.setValue(BLOG.LOADING_HEADLINES, false);
        }, 1000);
    }
}

export default new BlogWatcher(Client);