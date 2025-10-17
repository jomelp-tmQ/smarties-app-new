// /imports/api/_shared/objectId.ts (server)
import { Mongo } from 'meteor/mongo';
import { MongoInternals } from 'meteor/mongo';

const { ObjectId: NpmObjectId } = MongoInternals.NpmModules.mongodb.module;

// Coerce nullable values to ObjectId (or leave null/undefined alone)
export const toObjectId = (val) => {
    if (val == null) return val;
    return (val instanceof Mongo.ObjectID) ? val : new Mongo.ObjectID(String(val));
};

// Array version
export const toObjectIdArray = (arr) => (Array.isArray(arr) ? arr.map(toObjectId) : []);

// Type checks / validation
export const isObjectId = (v) => v instanceof Mongo.ObjectID;
export const isValidObjectIdString = (s) => NpmObjectId.isValid(s);
export const rawObjectId = NpmObjectId;
