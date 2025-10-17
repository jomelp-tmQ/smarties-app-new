import People from '../dbTemplates/People.js';
import PersonProfileLinks from '../dbTemplates/PersonProfileLinks.js';
import { createHash } from 'crypto';
import moment from 'moment';
import { MongoInternals } from 'meteor/mongo';

function h(val) { return "sha256:" + createHash('sha256').update(String(val)).digest('hex'); }

function scoreSignals({ deviceId, cookieId, ipAsn, email, phone, timeProximitySec }) {
    let s = 0;
    if (deviceId) s += 0.35;
    if (cookieId) s += 0.25;
    if (ipAsn) s += 0.10;
    if (email) s += 0.20;
    if (phone) s += 0.20;
    if (timeProximitySec != null && timeProximitySec <= 900) s += 0.10;
    return Math.min(0.95, s);
}

// IdentityResolution.js (only this function changes)
async function resolveOrCreatePersonFromSignals({ businessId, meta = {} }) {
    const { Double } = MongoInternals.NpmModules.mongodb.module;
    const toDouble = (n) => new Double(Number(n));
    const now = moment().valueOf();

    // 0) Reuse via existing soft links that share the same signals
    const linkOr = [];
    if (meta.cookieId) linkOr.push({ "signals.cookieId": meta.cookieId });
    if (meta.deviceId) linkOr.push({ "signals.deviceId": meta.deviceId });
    if (meta.ipAsn) linkOr.push({ "signals.ipAsn": meta.ipAsn });
    if (linkOr.length) {
        const existingLink = await PersonProfileLinks.findOne(
            { businessId, linkType: "soft", $or: linkOr },
            { sort: { confidence: -1, lastSeenAt: -1 } }
        );
        if (existingLink?.personId) {
            await People.updateOne({ _id: existingLink.personId }, { $set: { lastSeenAt: toDouble(now) } });
            const reused = await People.findOne({ _id: existingLink.personId });
            if (reused) return reused;
        }
    }

    console.log("linkOr =>>", linkOr);
    // 1) Deterministic matches on People (verified identifiers)
    const deterministicFilters = [];
    if (meta.verifiedEmail) deterministicFilters.push({ businessId, "emails.valueHash": h(meta.verifiedEmail), "emails.verified": true });
    if (meta.otpPhone) deterministicFilters.push({ businessId, "phones.valueHash": h(meta.otpPhone), "phones.verified": true });
    if (meta.loginUserId) deterministicFilters.push({ businessId, "identifiers.type": "loginUserId", "identifiers.valueHash": h(meta.loginUserId) });
    if (meta.ssoSub) deterministicFilters.push({ businessId, "identifiers.type": "ssoSub", "identifiers.valueHash": h(meta.ssoSub) });

    let person = null;
    for (const f of deterministicFilters) {
        person = await People.findOne(f);
        if (person) break;
    }

    // 2) Probabilistic matches on People fingerprints (hashed)
    if (!person) {
        const or = [];
        if (meta.email) or.push({ "emails.valueHash": h(meta.email) });
        if (meta.phone) or.push({ "phones.valueHash": h(meta.phone) });
        if (meta.deviceId) or.push({ "fingerprints.deviceIds": h(meta.deviceId) });
        if (meta.cookieId) or.push({ "fingerprints.cookies": h(meta.cookieId) });
        if (meta.ipAsn) or.push({ "fingerprints.asn": meta.ipAsn }); // store raw ASN if desired
        if (or.length) person = await People.findOne({ businessId, $or: or });
    }

    // 3) Create only if nothing matched
    if (!person) {
        const doc = {
            businessId,
            active: true,
            firstSeenAt: toDouble(now),
            lastSeenAt: toDouble(now),
            createdAt: toDouble(now),
            emails: meta.email ? [{ valueHash: h(meta.email), verified: false, isPrimary: true, updatedAt: toDouble(now) }] : [],
            phones: meta.phone ? [{ valueHash: h(meta.phone), verified: false, isPrimary: true, updatedAt: toDouble(now) }] : [],
            identifiers: [
                ...(meta.loginUserId ? [{ type: "loginUserId", valueHash: h(meta.loginUserId), updatedAt: toDouble(now) }] : []),
                ...(meta.ssoSub ? [{ type: "ssoSub", valueHash: h(meta.ssoSub), updatedAt: toDouble(now) }] : []),
            ],
            fingerprints: {
                deviceIds: meta.deviceId ? [h(meta.deviceId)] : [],
                cookies: meta.cookieId ? [h(meta.cookieId)] : [],
                asn: meta.ipAsn || null
            }
        };
        console.log("doc =>>", doc);
        const { insertedId } = await People.insertOne(doc);
        person = { _id: insertedId, ...doc };
    }

    await People.updateOne({ _id: person._id }, { $set: { lastSeenAt: toDouble(now) } });
    return person;
}


async function writeSoftLink({ businessId, personId, consumerId, signals }) {
    const { Double } = MongoInternals.NpmModules.mongodb.module;
    const toDouble = (n) => new Double(Number(n));
    const now = toDouble(moment().valueOf());
    const confidence = scoreSignals(signals);

    return PersonProfileLinks.updateOne(
        { businessId, personId, profileId: consumerId },
        {
            $setOnInsert: { createdAt: now, linkType: "soft", isHardLink: false },
            $set: { confidence: toDouble(confidence), signals, lastSeenAt: now },
            $inc: { touches: 1 }
        },
        { upsert: true }
    );
}


export const IdentityResolution = {
    resolveOrCreatePersonFromSignals,
    writeSoftLink,
    scoreSignals
};

export default IdentityResolution;


