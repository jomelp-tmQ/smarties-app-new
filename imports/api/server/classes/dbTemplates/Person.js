import { toObjectId } from '../db/helper';
import { PeopleCollection } from './People.js';

export default class Person {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.active = data.active ?? true;
        this.name = data.name ?? null;
        this.emails = Array.isArray(data.emails) ? data.emails : [];
        this.phones = Array.isArray(data.phones) ? data.phones : [];
        this.identifiers = Array.isArray(data.identifiers) ? data.identifiers : [];
        this.fingerprints = data.fingerprints ?? { deviceIds: [], cookies: [] };
        this.firstSeenAt = data.firstSeenAt ?? Date.now();
        this.lastSeenAt = data.lastSeenAt ?? Date.now();
        this.createdAt = data.createdAt ?? Date.now();
    }

    async save() {
        const doc = {
            businessId: toObjectId(this.businessId),
            active: this.active,
            name: this.name,
            emails: this.emails,
            phones: this.phones,
            identifiers: this.identifiers,
            fingerprints: this.fingerprints,
            firstSeenAt: this.firstSeenAt,
            lastSeenAt: this.lastSeenAt,
            createdAt: this.createdAt,
        };

        if (this._id) {
            await PeopleCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await PeopleCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await PeopleCollection.findOneAsync(toObjectId(id));
        return data ? new Person(data) : null;
    }

    static async findOne(filter) {
        const data = await PeopleCollection.findOneAsync(filter);
        return data ? new Person(data) : null;
    }
}