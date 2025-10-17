import { Mongo } from 'meteor/mongo';
import { MongoInternals } from 'meteor/mongo';

export default class DatabaseInitializer {
    /**
     * @param {Object} params
     * @param {import('mongodb').Db} [params.db] - raw Mongo DB instance; if omitted we derive from Meteor
     * @param {Record<string, any>} params.schemas - JSON Schemas keyed by collection name
     * @param {Record<string, Array<{keys: object, options?: object}>>} params.indexes - Index definitions
     * @param {boolean} [params.background=true] - create indexes in background/online (ignored in modern versions, kept for compatibility)
     */
    constructor({ db, schemas, indexes, background = true }) {
        this.db = db || MongoInternals.defaultRemoteCollectionDriver().mongo.db;
        this.schemas = schemas || {};
        this.indexes = indexes || {};
        this.background = background;
    }

    /** Run all tasks: ensure collections (with validators) and ensure indexes */
    async run() {
        await this.ensureCollectionsWithValidators();
        await this.ensureIndexes();
    }

    /**
     * Ensure each collection exists and has the JSON Schema validator applied.
     * - If the collection is missing: create with { validator: { $jsonSchema: schema } }
     * - If the collection exists: use collMod to (re)apply validator
     */
    async ensureCollectionsWithValidators() {
        const existing = await this._existingCollections();

        for (const [name, schema] of Object.entries(this.schemas)) {
            const has = existing.has(name);
            if (!has) {
                // Create collection with strict validator
                await this.db.createCollection(name, {
                    validator: { $jsonSchema: schema },
                    validationLevel: 'strict',
                    validationAction: 'error'
                });
                // Note: Don't create Mongo.Collection here - dbTemplate files handle that
                // eslint-disable-next-line no-console
                console.log(`🆕 Created collection '${name}' with STRICT JSON Schema validator`);
            } else {
                // Update validator via collMod with validationLevel: strict
                try {
                    await this.db.command({
                        collMod: name,
                        validator: { $jsonSchema: schema },
                        validationLevel: 'strict',
                        validationAction: 'error'
                    });
                    // eslint-disable-next-line no-console
                    console.log(`🔧 Updated validator for '${name}' with STRICT validation`);
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.warn(`⚠️ Failed to update validator for '${name}':`, error.message);

                    // If it fails, check if it's due to existing invalid data
                    if (error.code === 121 || error.message.includes('Document failed validation')) {
                        // eslint-disable-next-line no-console
                        console.log(`⚠️ Collection '${name}' has existing data that violates the strict schema`);
                        console.log(`🧹 Cleaning invalid data and reapplying strict validator...`);

                        // Option 1: Remove the validator temporarily to clean data
                        await this.db.command({ collMod: name, validator: {} });

                        // Option 2: Drop and recreate (nuclear option)
                        // await this.db.collection(name).drop();
                        // await this.db.createCollection(name, { 
                        //     validator: { $jsonSchema: schema },
                        //     validationLevel: 'strict'
                        // });

                        console.log(`⚠️ Manual data cleanup required for '${name}' collection`);
                        console.log(`⚠️ Run: db.${name}.deleteMany({businessId: null}) to remove invalid documents`);

                    } else {
                        throw error;
                    }
                }
            }
        }
    }

    /** Ensure indexes for each collection according to this.indexes */
    async ensureIndexes() {
        for (const [name, defs] of Object.entries(this.indexes)) {
            if (!Array.isArray(defs) || defs.length === 0) continue;
            const coll = this.db.collection(name);

            for (const def of defs) {
                const keys = def.keys || def.fields || {};
                const opts = { ...(def.options || {}), background: this.background };
                try {
                    await coll.createIndex(keys, opts);
                    // eslint-disable-next-line no-console
                    console.log(`✅ Ensured index '${opts.name || JSON.stringify(keys)}' on '${name}'`);
                } catch (err) {
                    // Duplicate or incompatible options may throw; log but continue to keep startup resilient
                    // eslint-disable-next-line no-console
                    console.warn(`⚠️  Index ensure failed for '${name}' (${opts.name || JSON.stringify(keys)}):`, err.message);
                }
            }
        }
    }

    /** Drop all non-_id indexes for a specific collection (useful during migrations) */
    async dropIndexes(name) {
        const coll = this.db.collection(name);
        try {
            await coll.dropIndexes();
            // eslint-disable-next-line no-console
            console.log(`🗑️ Dropped indexes for '${name}'`);
        } catch (err) {
            if (!/ns not found|index not found/i.test(err.message)) throw err;
        }
    }

    /** Validate that expected indexes by name exist; returns report */
    async validateIndexes() {
        const report = {};
        for (const [name, defs] of Object.entries(this.indexes)) {
            const coll = this.db.collection(name);
            const existing = await coll.listIndexes().toArray();
            const existingNames = new Set(existing.map(i => i.name));
            report[name] = defs.map(d => ({ name: d.options?.name, exists: existingNames.has(d.options?.name) }));
        }
        return report;
    }

    /** helper: get current collection names */
    async _existingCollections() {
        const cols = await this.db.listCollections({}, { nameOnly: true }).toArray();
        return new Set(cols.map(c => c.name));
    }
}

// --- Example usage at server startup ---
// Place this in /imports/startup/server/index.js (or server/main.js)
//
// import { Meteor } from 'meteor/meteor';
// import DatabaseInitializer from './DatabaseInitializer.js';
// import { schemas, indexes } from '/imports/api/db/schemas.js';
//
// Meteor.startup(async () => {
//   const initializer = new DatabaseInitializer({ schemas, indexes });
//   await initializer.run();
// });
