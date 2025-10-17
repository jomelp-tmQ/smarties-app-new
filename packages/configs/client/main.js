import { Meteor } from 'meteor/meteor';
import { METHODS } from '../lib/Const';

MX = {
    user: Meteor.user,
    userId: Meteor.userId,
    call: Meteor.call.bind(Meteor),
    callAsync: Meteor.callAsync.bind(Meteor),
    subscribe: Meteor.subscribe.bind(Meteor),
    loginWithPassword: Meteor.loginWithPassword.bind(Meteor),
    logout: Meteor.logout.bind(Meteor),
    users: Meteor.users,
};



class ConfigsClient {
    #configs = [];
    constructor() {
        this.#configs = [];
    }
    get Config() {
        return this.#configs;
    }
    getConfigs() {
        return MX.callAsync(METHODS.GETCONFIG);
    }
    async mergeConfigs(target) {
        return this.getConfigs().then((configs) => {
            if (configs && configs.length > 0) {
                configs.forEach((config) => {
                    target[config.key] = {};
                    target[config.key] = config.value;
                });
            }
            this.#configs = target;
            return target;
        });
    }
}

Configs = new ConfigsClient();

Meteor.startup(() => {
    console.log('📋 Universal Configs client is ready');
});