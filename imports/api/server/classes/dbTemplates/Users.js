import { Mongo } from 'meteor/mongo';
import { toObjectId, toObjectIdArray } from '../db/helper';

export const UsersCollection = new Mongo.Collection('users', {
    idGeneration: 'MONGO', // keeps _id as ObjectId to match your schemas
});

export default class Users {
    constructor(data = {}) {
        this._id = data._id ?? null;
        this.businessId = data.businessId ?? null;
        this.name = data.name ?? { given: null, family: null };
        this.email = data.email ?? null;
        this.role = data.role ?? null;
        this.services = data.services ?? { password: {}, resume: { loginTokens: [] } };
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.lastLoginAt = data.lastLoginAt ?? null;
        this.createdAt = data.createdAt ?? Date.now();
    }

    // Validate data according to schema
    validate() {
        // Type validations based on schema
        if (this.email !== null && typeof this.email !== 'string') {
            throw new Meteor.Error('validation-error', 'Email must be a string');
        }

        if (this.role !== null && typeof this.role !== 'string') {
            throw new Meteor.Error('validation-error', 'Role must be a string');
        }

        if (typeof this.isActive !== 'boolean') {
            throw new Meteor.Error('validation-error', 'IsActive must be a boolean');
        }

        if (this.lastLoginAt !== null && typeof this.lastLoginAt !== 'number') {
            throw new Meteor.Error('validation-error', 'LastLoginAt must be a number');
        }

        if (typeof this.createdAt !== 'number') {
            throw new Meteor.Error('validation-error', 'CreatedAt must be a number');
        }

        // Validate name structure if provided
        if (this.name && (typeof this.name !== 'object' || Array.isArray(this.name))) {
            throw new Meteor.Error('validation-error', 'Name must be an object with given and family properties');
        }

        if (this.name && this.name.given !== null && typeof this.name.given !== 'string') {
            throw new Meteor.Error('validation-error', 'Name given must be a string');
        }

        if (this.name && this.name.family !== null && typeof this.name.family !== 'string') {
            throw new Meteor.Error('validation-error', 'Name family must be a string');
        }

        // Validate services structure
        if (this.services && typeof this.services !== 'object') {
            throw new Meteor.Error('validation-error', 'Services must be an object');
        }

        if (this.services && this.services.password && typeof this.services.password !== 'object') {
            throw new Meteor.Error('validation-error', 'Services password must be an object');
        }

        if (this.services && this.services.password && this.services.password.bcrypt && typeof this.services.password.bcrypt !== 'string') {
            throw new Meteor.Error('validation-error', 'Password bcrypt must be a string');
        }

        if (this.services && this.services.resume && typeof this.services.resume !== 'object') {
            throw new Meteor.Error('validation-error', 'Services resume must be an object');
        }

        if (this.services && this.services.resume && this.services.resume.loginTokens && !Array.isArray(this.services.resume.loginTokens)) {
            throw new Meteor.Error('validation-error', 'Login tokens must be an array');
        }

        // Validate login tokens structure
        if (this.services && this.services.resume && this.services.resume.loginTokens && Array.isArray(this.services.resume.loginTokens)) {
            for (const token of this.services.resume.loginTokens) {
                if (token && typeof token === 'object') {
                    if (token.when && !(token.when instanceof Date)) {
                        throw new Meteor.Error('validation-error', 'Login token when must be a Date');
                    }
                    if (token.hashedToken && typeof token.hashedToken !== 'string') {
                        throw new Meteor.Error('validation-error', 'Login token hashedToken must be a string');
                    }
                }
            }
        }

        return true;
    }

    async save() {
        this.validate();
        const doc = {
            createdAt: this.createdAt || Date.now(),
        };

        // Only include fields if they have valid values matching schema types
        if (this.businessId) {
            doc.businessId = toObjectId(this.businessId);
        }
        if (this.name) {
            doc.name = this.name;
        }
        if (this.email) {
            doc.email = this.email;
        }
        if (this.role) {
            doc.role = this.role;
        }
        if (this.services) {
            doc.services = this.services;
        }
        if (typeof this.isActive === 'boolean') {
            doc.isActive = this.isActive;
        }
        if (typeof this.lastLoginAt === 'number') {
            doc.lastLoginAt = this.lastLoginAt;
        }

        if (this._id) {
            await UsersCollection.updateAsync(toObjectId(this._id), { $set: doc });
            return this._id;
        } else {
            this._id = await UsersCollection.insertAsync(doc);
            return this._id;
        }
    }

    static async findById(id) {
        const data = await UsersCollection.findOneAsync(toObjectId(id));
        return data ? new Users(data) : null;
    }

    static async findByBusinessId(businessId) {
        const docs = await UsersCollection.find({ businessId: toObjectId(businessId) }).fetchAsync();
        return docs.map(d => new Users(d));
    }

    static async findByEmail(email) {
        const data = await UsersCollection.findOneAsync({ email });
        return data ? new Users(data) : null;
    }

    static async findByRole(role) {
        const docs = await UsersCollection.find({ role }).fetchAsync();
        return docs.map(d => new Users(d));
    }

    static async findActiveUsers() {
        const docs = await UsersCollection.find({ isActive: true }).fetchAsync();
        return docs.map(d => new Users(d));
    }

    static async findAll() {
        const docs = await UsersCollection.find({}).fetchAsync();
        return docs.map(d => new Users(d));
    }

    async update(updateData = {}) {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        Object.assign(this, updateData);
        this.validate();

        const $set = { ...updateData };
        if ('businessId' in $set) $set.businessId = toObjectId($set.businessId);

        await UsersCollection.updateAsync(toObjectId(this._id), { $set });
        return this._id;
    }

    async setPassword(bcryptHash) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot set password for user without ID');
        }

        this.services.password = { bcrypt: bcryptHash };

        const result = await UsersCollection.updateAsync(
            toObjectId(this._id),
            { $set: { 'services.password': this.services.password } }
        );

        return result;
    }

    async addLoginToken(hashedToken) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot add login token for user without ID');
        }

        const loginToken = {
            when: new Date(),
            hashedToken: hashedToken
        };

        if (!this.services.resume) {
            this.services.resume = { loginTokens: [] };
        }

        this.services.resume.loginTokens.push(loginToken);

        const result = await UsersCollection.updateAsync(
            toObjectId(this._id),
            { $push: { 'services.resume.loginTokens': loginToken } }
        );

        return result;
    }

    async removeLoginToken(hashedToken) {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot remove login token for user without ID');
        }

        if (this.services.resume && this.services.resume.loginTokens) {
            this.services.resume.loginTokens = this.services.resume.loginTokens.filter(
                token => token.hashedToken !== hashedToken
            );
        }

        const result = await UsersCollection.updateAsync(
            toObjectId(this._id),
            { $pull: { 'services.resume.loginTokens': { hashedToken: hashedToken } } }
        );

        return result;
    }

    async updateLastLogin() {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot update last login for user without ID');
        }

        this.lastLoginAt = Date.now();

        const result = await UsersCollection.updateAsync(
            toObjectId(this._id),
            { $set: { lastLoginAt: this.lastLoginAt } }
        );

        return result;
    }

    async activate() {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot activate user without ID');
        }

        this.isActive = true;

        const result = await UsersCollection.updateAsync(
            toObjectId(this._id),
            { $set: { isActive: true } }
        );

        return result;
    }

    async deactivate() {
        if (!this._id) {
            throw new Meteor.Error('bad-request', 'Cannot deactivate user without ID');
        }

        this.isActive = false;

        const result = await UsersCollection.updateAsync(
            toObjectId(this._id),
            { $set: { isActive: false } }
        );

        return result;
    }

    async delete() {
        if (!this._id) throw new Meteor.Error('bad-request', 'Missing _id');
        return UsersCollection.removeAsync(toObjectId(this._id));
    }

    toObject(includeSensitive = false) {
        const obj = {
            _id: this._id,
            businessId: this.businessId,
            name: this.name,
            email: this.email,
            role: this.role,
            isActive: this.isActive,
            lastLoginAt: this.lastLoginAt,
            createdAt: this.createdAt
        };

        if (includeSensitive) {
            obj.services = this.services;
        }

        return obj;
    }
}