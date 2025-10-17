import { Meteor } from 'meteor/meteor';
import { METHODS } from '../lib/Const';
import { MongoInternals } from 'meteor/mongo';

const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
Meteor.methods({
    [METHODS.GETCONFIG]:
        /**
         * @param {{username: string, email: string, password: string}} options
         * @param {Function} callback
         */
        function () {
            if (Meteor.isServer) {
                return db.collection("clientConfig").find().toArray();
            }
            return [];
        },
});

console.log('📋 Universal Accounts server methods loaded');