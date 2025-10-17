// IdentityRanker.js
import People from '../dbTemplates/People.js';
import PersonProfileLinks from '../dbTemplates/PersonProfileLinks.js';
import moment from 'moment';
import { PersonProfileLinksCollection } from '../dbTemplates/PersonProfileLinks.js';

const HALF_LIFE_HOURS = 24;         // decay after 1 day without new evidence
const UNIQUE_COOKIE_BONUS = 0.10;   // if cookieId is rare within business
const UNIQUE_DEVICE_BONUS = 0.05;
const UNIQUE_ASN_BONUS = 0.03;
const TOUCHES_BONUS = 0.02;   // each extra touch (cap later)
const CONFLICT_PENALTY = 0.25;   // verified conflict

function decayFactor(lastSeenAtMs) {
    const hours = Math.max(0, (Date.now() - lastSeenAtMs) / 3600000);
    // exp decay: factor in (0,1]; half-life = HALF_LIFE_HOURS
    return Math.pow(0.5, hours / HALF_LIFE_HOURS);
}

// Count how many links share a given signal in this business (for uniqueness boost)
async function signalCounts(businessId, { cookieId, deviceId, ipAsn }) {
    const m = { businessId };
    const counts = { cookieId: 0, deviceId: 0, ipAsn: 0 };

    const $or = [];
    if (cookieId) $or.push({ "signals.cookieId": cookieId });
    if (deviceId) $or.push({ "signals.deviceId": deviceId });
    if (ipAsn) $or.push({ "signals.ipAsn": ipAsn });
    if (!$or.length) return counts;

    const agg = await PersonProfileLinksCollection.rawCollection().aggregate([
        { $match: { businessId, linkType: "soft", $or } },
        {
            $group: {
                _id: null,
                cookieId: { $sum: { $cond: [{ $eq: ["$signals.cookieId", cookieId || null] }, 1, 0] } },
                deviceId: { $sum: { $cond: [{ $eq: ["$signals.deviceId", deviceId || null] }, 1, 0] } },
                ipAsn: { $sum: { $cond: [{ $eq: ["$signals.ipAsn", ipAsn || null] }, 1, 0] } }
            }
        }
    ]).toArray();

    if (agg[0]) {
        counts.cookieId = agg[0].cookieId || 0;
        counts.deviceId = agg[0].deviceId || 0;
        counts.ipAsn = agg[0].ipAsn || 0;
    }
    return counts;
}

async function hasVerifiedConflict({ businessId, personId, meta }) {
    // If the person has a verified email/phone that explicitly *differs* from meta.email/meta.phone
    // treat as a strong negative. (You can extend to loginUserId/SSO too.)
    const p = await People.findOne({ _id: personId, businessId }, {
        projection: { emails: 1, phones: 1 }
    });
    if (!p) return false;
    const verifiedEmails = new Set((p.emails || []).filter(e => e.verified).map(e => e.valueHash));
    const verifiedPhones = new Set((p.phones || []).filter(ph => ph.verified).map(ph => ph.valueHash));
    // If meta has an *unverified* email/phone that differs from all verified ones, don't penalize.
    // Only penalize if meta has a *verified* value and it mismatches. If you don't pass that in meta, skip this.
    return false; // keep simple for now
}

export async function rankPersonsForConsumer({ businessId, consumerId, meta = {}, minConfidence = 0.5 }) {
    const links = await PersonProfileLinksCollection.find({ businessId, profileId: consumerId, linkType: "soft", confidence: { $gte: minConfidence } }, { projection: { personId: 1, confidence: 1, signals: 1, touches: 1, lastSeenAt: 1, createdAt: 1 } }).fetchAsync();

    const scored = [];
    for (const L of links) {
        const base = typeof L.confidence === "number" ? L.confidence : (L.confidence?.value || 0); // handle Double
        const lastSeen = Number(L.lastSeenAt?.value || L.lastSeenAt || L.createdAt || 0);

        const df = lastSeen ? decayFactor(lastSeen) : 1.0;

        // Uniqueness boosts (rarer cookie/device/asn → small bonus)
        const { cookieId, deviceId, ipAsn } = L.signals || {};
        const counts = await signalCounts(businessId, { cookieId, deviceId, ipAsn });

        let bonus = 0;
        if (cookieId && counts.cookieId <= 2) bonus += UNIQUE_COOKIE_BONUS;   // seen in ≤2 links across biz
        if (deviceId && counts.deviceId <= 3) bonus += UNIQUE_DEVICE_BONUS;
        if (ipAsn && counts.ipAsn <= 3) bonus += UNIQUE_ASN_BONUS;

        // Repeat observations help
        const touches = Number(L.touches || 1);
        bonus += Math.min(0.10, (touches - 1) * TOUCHES_BONUS); // cap at +0.10

        // Conflicts
        const conflict = false; // await hasVerifiedConflict({ businessId, personId: L.personId, meta });

        let finalScore = base * df + bonus - (conflict ? CONFLICT_PENALTY : 0);
        finalScore = Math.max(0, Math.min(0.99, finalScore));

        scored.push({
            personId: L.personId,
            consumerId,
            baseConfidence: base,
            finalScore,
            reasons: {
                decayFactor: Number(df.toFixed(3)),
                unique: { cookieRare: counts.cookieId <= 2, deviceRare: counts.deviceId <= 3, asnRare: counts.ipAsn <= 3 },
                touches,
                conflict
            }
        });
    }

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const top = scored[0];
    const second = scored[1];

    let verdict = "unlikely";
    if (top) {
        const margin = second ? (top.finalScore - second.finalScore) : top.finalScore;
        if (top.finalScore >= 0.90 && margin >= 0.15) verdict = "likely_same";
        else if (top.finalScore >= 0.70) verdict = "review";
    }

    return { verdict, top, ranked: scored };
}
