// More permissive MongoDB schemas for development and testing
// These schemas allow for flexibility while still providing basic validation

const permissiveSchemas = {
    business: {
        "bsonType": "object",
        "title": "business",
        "properties": {
            "name": {
                "bsonType": ["string", "null"]
            },
            "slug": {
                "bsonType": ["string", "null"]
            },
            "local": {
                "bsonType": ["string", "null"]
            },
            "plan": {
                "bsonType": ["string", "null"]
            },
            "settings": {
                "bsonType": ["object", "null"]
            },
            "createdAt": {
                "bsonType": ["double", "long", "int"]
            }
        },
        "additionalProperties": true // Allow extra fields
    },

    channels: {
        "bsonType": "object",
        "title": "channels",
        "properties": {
            "businessId": {
                "bsonType": ["objectId", "string"] // Allow both ObjectId and string
            },
            "type": {
                "bsonType": ["string", "null"]
            },
            "identifier": {
                "bsonType": ["string", "null"]
            },
            "provider": {
                "bsonType": ["string", "null"]
            },
            "metadata": {
                "bsonType": ["object", "null"]
            },
            "status": {
                "bsonType": ["string", "null"]
            },
            "createdAt": {
                "bsonType": ["double", "long", "int"]
            }
        },
        "additionalProperties": true
    },

    consumers: {
        "bsonType": "object",
        "title": "consumers",
        "properties": {
            "businessId": {
                "bsonType": ["objectId", "string"]
            },
            "externalId": {
                "bsonType": ["string", "null"]
            },
            "name": {
                "bsonType": ["object", "null"],
                "properties": {
                    "given": {
                        "bsonType": ["string", "null"]
                    },
                    "family": {
                        "bsonType": ["string", "null"]
                    }
                },
                "additionalProperties": true
            },
            "contacts": {
                "bsonType": ["array", "null"],
                "items": {
                    "bsonType": "object",
                    "additionalProperties": true // Allow flexible contact structure
                }
            },
            "tags": {
                "bsonType": ["array", "null"],
                "items": {
                    "bsonType": "string"
                }
            },
            "createdAt": {
                "bsonType": ["double", "long", "int"]
            }
        },
        "additionalProperties": true
    },

    inbox: {
        "bsonType": "object",
        "title": "inbox",
        "properties": {
            "businessId": {
                "bsonType": ["objectId", "string"]
            },
            "consumerId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "channel": {
                "bsonType": ["object", "null"],
                "title": "channel",
                "properties": {
                    "id": { "bsonType": ["objectId", "string"] },
                    "identifier": { "bsonType": ["string", "null"] },
                    "type": { "bsonType": ["string", "null"] }
                },
                "additionalProperties": true
            },
            "status": {
                "bsonType": ["string", "null"]
            },
            "assigneeId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "lockedAt": {
                "bsonType": ["double", "long", "int", "null"]
            },
            "unreadForAssignee": {
                "bsonType": ["double", "long", "int"],
                "minimum": 0
            },
            "latestInteractionId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "latestSnippet": {
                "bsonType": ["string", "null"]
            },
            "keywords": {
                "bsonType": ["array", "null"],
                "items": { "bsonType": "string" }
            },
            "latestAt": {
                "bsonType": ["double", "long", "int", "null"]
            },
            "latestDirection": {
                "bsonType": ["string", "null"]
            },
            "createdAt": {
                "bsonType": ["double", "long", "int"]
            }
        },
        "additionalProperties": true
    },

    interactions: {
        "bsonType": "object",
        "title": "interactions",
        "properties": {
            "businessId": {
                "bsonType": ["objectId", "string"]
            },
            "inboxId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "channelId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "consumerId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "userId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "medium": {
                "bsonType": ["string", "null"]
            },
            "direction": {
                "bsonType": ["string", "null"],
                "enum": ["inbound", "outbound"] // Still enforce valid directions
            },
            "payload": {
                "bsonType": ["object", "null"],
                "properties": {
                    "text": {
                        "bsonType": ["string", "null"]
                    },
                    "attachments": {
                        "bsonType": ["array", "null"],
                        "items": {
                            "bsonType": "string"
                        }
                    }
                },
                "additionalProperties": true
            },
            "status": {
                "bsonType": ["string", "null"]
            },
            "timestamp": {
                "bsonType": ["double", "long", "int"]
            },
            "attributes": {
                "bsonType": ["array", "null"],
                "items": {
                    "bsonType": "object",
                    "properties": {
                        "key": {
                            "bsonType": "string"
                        },
                        "value": {
                            "bsonType": ["string", "double", "bool", "int", "long"]
                        }
                    },
                    "required": ["key", "value"],
                    "additionalProperties": false
                }
            }
        },
        "additionalProperties": true
    },

    departments: {
        "bsonType": "object",
        "title": "departments",
        "properties": {
            "businessId": {
                "bsonType": ["objectId", "string"]
            },
            "name": {
                "bsonType": ["string", "null"]
            },
            "description": {
                "bsonType": ["string", "null"]
            },
            "channelIds": {
                "bsonType": ["array", "null"],
                "items": {
                    "bsonType": ["objectId", "string"]
                }
            },
            "createdAt": {
                "bsonType": ["double", "long", "int"]
            }
        },
        "additionalProperties": true
    }
    ,
    people: {
        "bsonType": "object",
        "title": "people",
        "properties": {
            "businessId": { "bsonType": ["objectId", "string"] },
            "active": { "bsonType": ["bool", "null"] },
            "mergedInto": { "bsonType": ["objectId", "string", "null"] },
            "name": { "bsonType": ["object", "null"], "additionalProperties": true },
            "emails": { "bsonType": ["array", "null"], "items": { "bsonType": "object", "additionalProperties": true } },
            "phones": { "bsonType": ["array", "null"], "items": { "bsonType": "object", "additionalProperties": true } },
            "identifiers": { "bsonType": ["array", "null"], "items": { "bsonType": "object", "additionalProperties": true } },
            "fingerprints": { "bsonType": ["object", "null"], "additionalProperties": true },
            "firstSeenAt": { "bsonType": ["double", "long", "int"] },
            "lastSeenAt": { "bsonType": ["double", "long", "int"] },
            "createdAt": { "bsonType": ["double", "long", "int"] }
        },
        "additionalProperties": true
    },
    person_profile_links: {
        "bsonType": "object",
        "title": "person_profile_links",
        "properties": {
            "businessId": { "bsonType": ["objectId", "string"] },
            "personId": { "bsonType": ["objectId", "string", "null"] },
            "profileId": { "bsonType": ["objectId", "string", "null"] },
            "linkType": { "bsonType": ["string", "null"] },
            "isHardLink": { "bsonType": ["bool", "null"] },
            "confidence": { "bsonType": ["double", "long", "int", "null"] },
            "signals": { "bsonType": ["object", "null"], "additionalProperties": true },
            "createdAt": { "bsonType": ["double", "long", "int", "null"] }
        },
        "additionalProperties": true
    },

    attachments: {
        "bsonType": "object",
        "title": "attachments",
        "properties": {
            "businessId": {
                "bsonType": ["objectId", "null"]
            },
            "inboxId": {
                "bsonType": ["objectId", "null"]
            },
            "interactionId": {
                "bsonType": ["objectId", "null"]
            },
            "consumerId": {
                "bsonType": ["objectId", "null"]
            },
            "channelId": {
                "bsonType": ["objectId", "null"]
            },
            "originalName": {
                "bsonType": ["string", "null"]
            },
            "fileSize": {
                "bsonType": ["double", "long", "int", "null"]
            },
            "mimeType": {
                "bsonType": ["string", "null"]
            },
            "fileExtension": {
                "bsonType": ["string", "null"]
            },
            "localPath": {
                "bsonType": ["string", "null"]
            },
            "localUrl": {
                "bsonType": ["string", "null"]
            },
            "remoteUrl": {
                "bsonType": ["string", "null"]
            },
            "source": {
                "bsonType": ["string", "null"]
            },
            "recordingId": {
                "bsonType": ["string", "null"]
            },
            "createdAt": {
                "bsonType": ["double", "long", "int"]
            },
            "attributes": {
                "bsonType": ["array", "null"],
                "items": {
                    "bsonType": "object"
                }
            },
            "thumbnailUrl": {
                "bsonType": ["string", "null"]
            }
        },
        "additionalProperties": true
    },

    uploads: {
        "bsonType": "object",
        "title": "uploads",
        "properties": {
            "fileId": {
                "bsonType": ["string", "null"]
            },
            "businessId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "userId": {
                "bsonType": ["objectId", "string", "null"]
            },
            "originalName": {
                "bsonType": ["string", "null"]
            },
            "fileSize": {
                "bsonType": ["double", "long", "int", "null"]
            },
            "mimeType": {
                "bsonType": ["string", "null"]
            },
            "fileExtension": {
                "bsonType": ["string", "null"]
            },
            "remoteUrl": {
                "bsonType": ["string", "null"]
            },
            "status": {
                "bsonType": ["string", "null"]
            },
            "statusUrl": {
                "bsonType": ["string", "null"]
            },
            "source": {
                "bsonType": ["string", "null"]
            },
            "attributes": {
                "bsonType": ["array", "null"],
                "items": {
                    "bsonType": "object"
                }
            },
            "createdAt": {
                "bsonType": ["double", "long", "int"]
            },
            "updatedAt": {
                "bsonType": ["double", "long", "int"]
            },
            "completedAt": {
                "bsonType": ["double", "long", "int", "null"]
            }
        },
        "additionalProperties": true
    },
    files: {
        "bsonType": "object",
        "title": "files",
        "properties": {
            "fileId": { "bsonType": ["string", "null"] },
            "businessId": { "bsonType": ["objectId", "string", "null"] },
            "userId": { "bsonType": ["objectId", "string", "null"] },
            "originalName": { "bsonType": ["string", "null"] },
            "fileSize": { "bsonType": ["double", "long", "int", "null"] },
            "mimeType": { "bsonType": ["string", "null"] },
            "kbStatus": { "bsonType": ["string", "null"] },
            "fileExtension": { "bsonType": ["string", "null"] },
            "remoteUrl": { "bsonType": ["string", "null"] },
            "status": { "bsonType": ["string", "null"] },
            "statusUrl": { "bsonType": ["string", "null"] },
            "createdAt": { "bsonType": ["double", "long", "int"] },
            "updatedAt": { "bsonType": ["double", "long", "int"] },
            "completedAt": { "bsonType": ["double", "long", "int", "null"] }
        },
        "additionalProperties": true
    }
};

// Keep the original strict schemas for reference
import { schemas as strictSchemas, indexes } from './schemas.js';

// Export both versions
export {
    permissiveSchemas as schemas,  // Use permissive as default
    strictSchemas,                 // Keep original for production
    indexes
};

export default permissiveSchemas;
