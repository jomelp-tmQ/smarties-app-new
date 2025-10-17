// MongoDB schema definitions for all collections

const schemas = {
    business: {
        "bsonType": "object",
        "title": "business",
        "properties": {
            "name": {
                "bsonType": "string"
            },
            "slug": {
                "bsonType": "string"
            },
            "local": {
                "bsonType": "string"
            },
            "plan": {
                "bsonType": "string"
            },
            "settings": {
                "bsonType": "object",
                "title": "object"
            },
            "createdAt": {
                "bsonType": "double"
            }
        }
    },

    channels: {
        "bsonType": "object",
        "title": "channels",
        "properties": {
            "businessId": {
                "bsonType": "objectId"
            },
            "type": {
                "bsonType": "string"
            },
            "identifier": {
                "bsonType": "string"
            },
            "provider": {
                "bsonType": "string"
            },
            "api": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "url": {
                        "bsonType": "string"
                    },
                    "key": {
                        "bsonType": "string"
                    },
                    "secret": {
                        "bsonType": "string"
                    },
                    "token": {
                        "bsonType": "string"
                    }
                }
            },
            "metadata": {
                "bsonType": "object",
                "title": "object"
            },
            "status": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "double"
            }
        }
    },

    consumers: {
        "bsonType": "object",
        "title": "consumers",
        "properties": {
            "businessId": {
                "bsonType": "objectId"
            },
            "externalId": {
                "bsonType": "string"
            },
            "name": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "given": {
                        "bsonType": "string"
                    },
                    "family": {
                        "bsonType": "string"
                    }
                }
            },
            "contacts": {
                "bsonType": "array",
                "items": {
                    "title": "object",
                    "properties": {
                        "phones": {
                            "bsonType": "array",
                            "items": {
                                "title": "object",
                                "properties": {
                                    "label": {
                                        "bsonType": "string"
                                    },
                                    "value": {
                                        "bsonType": "string"
                                    }
                                }
                            }
                        },
                        "emails": {
                            "bsonType": "array",
                            "items": {
                                "title": "object",
                                "properties": {
                                    "label": {
                                        "bsonType": "string"
                                    },
                                    "value": {
                                        "bsonType": "string"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "tags": {
                "bsonType": "array",
                "items": {
                    "bsonType": "string"
                }
            },
            "createdAt": {
                "bsonType": "double"
            }
        }
    },

    inbox: {
        "bsonType": "object",
        "title": "inbox",
        "properties": {
            "businessId": {
                "bsonType": "objectId"
            },
            "consumerId": {
                "bsonType": "objectId"
            },
            "channel": {
                "bsonType": "object",
                "title": "channel",
                "properties": {
                    "id": {
                        "bsonType": "objectId"
                    },
                    "identifier": {
                        "bsonType": "string"
                    },
                    "type": {
                        "bsonType": "string"
                    }
                }
            },
            "status": {
                "bsonType": "string"
            },
            "assigneeId": {
                "bsonType": "objectId"
            },
            "lockedAt": {
                "bsonType": "double"
            },
            "unreadForAssignee": {
                "bsonType": "int"
            },
            "latestInteractionId": {
                "bsonType": "objectId"
            },
            "latestSnippet": {
                "bsonType": "string"
            },
            "keywords": {
                "bsonType": "array",
                "items": { "bsonType": "string" }
            },
            "latestAt": {
                "bsonType": "double"
            },
            "latestDirection": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "double"
            },
            "consumer": {
                "bsonType": "object",
                "title": "consumer_snapshot",
                "properties": {
                    "displayName": {
                        "bsonType": "string"
                    },
                    "primaryEmail": {
                        "bsonType": "string"
                    },
                    "primaryPhone": {
                        "bsonType": "string"
                    },
                    "avatarUrl": {
                        "bsonType": "string"
                    },
                    "tagsPreview": {
                        "bsonType": "array",
                        "items": {
                            "bsonType": "string"
                        }
                    },
                    "isVIP": {
                        "bsonType": "bool"
                    },
                    "optedOut": {
                        "bsonType": "bool"
                    },
                    "optedAt": {
                        "bsonType": "double"
                    },
                    "optedBy": {
                        "bsonType": "string"
                    }
                }
            }
        }
    },

    interactions: {
        "bsonType": "object",
        "title": "interactions",
        "required": ["businessId", "inboxId", "channelId", "consumerId", "medium", "direction", "payload"],
        "properties": {
            "businessId": {
                "bsonType": "objectId",
            },
            "inboxId": {
                "bsonType": "objectId",
            },
            "channelId": {
                "bsonType": "objectId",
            },
            "consumerId": {
                "bsonType": "objectId",
            },
            "userId": {
                "bsonType": "objectId",
            },
            "medium": {
                "bsonType": "string",
            },
            "messageId": {
                "bsonType": "string",
            },
            "direction": {
                "bsonType": "string",
            },
            "payload": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "text": {
                        "bsonType": "string",
                    },
                    "attachments": {
                        "bsonType": "array",
                        "items": {
                            "bsonType": "string",
                        },
                    },
                },
            },
            "status": {
                "bsonType": "string",
            },
            "timestamp": {
                "bsonType": "double",
            },
            "attributes": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "properties": {
                        "key": {
                            "bsonType": "string",
                        },
                        "value": {
                            "bsonType": ["string", "double", "bool", "int"],
                        },
                    },
                },
            },
        }
    },

    departments: {
        "bsonType": "object",
        "title": "departments",
        "properties": {
            "businessId": {
                "bsonType": "objectId",
            },
            "name": {
                "bsonType": "string",
            },
            "description": {
                "bsonType": "string",
            },
            "channelIds": {
                "bsonType": "array",
                "items": {
                    "bsonType": "objectId",
                },
            },
            "createdAt": {
                "bsonType": "double",
            },
        }
    },

    people: {
        "bsonType": "object",
        "title": "people",
        "description": "golden identity per business",
        "properties": {
            "businessId": { "bsonType": "objectId" },
            "active": { "bsonType": "bool" },
            "mergedInto": { "bsonType": "objectId" },
            "name": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "given": { "bsonType": "string" },
                    "family": { "bsonType": "string" },
                    "source": { "bsonType": "string" },
                    "updatedAt": { "bsonType": "double" }
                }
            },
            "emails": {
                "bsonType": "array",
                "items": {
                    "title": "object",
                    "properties": {
                        "label": { "bsonType": "string" },
                        "valueHash": { "bsonType": "string" },
                        "isPrimary": { "bsonType": "bool" },
                        "verified": { "bsonType": "bool" },
                        "source": { "bsonType": "string" },
                        "updatedAt": { "bsonType": "double" }
                    }
                }
            },
            "phones": {
                "bsonType": "array",
                "items": {
                    "title": "object",
                    "properties": {
                        "label": { "bsonType": "string" },
                        "valueHash": { "bsonType": "string" },
                        "isPrimary": { "bsonType": "string" },
                        "verified": { "bsonType": "bool" },
                        "source": { "bsonType": "string" },
                        "updatedAt": { "bsonType": "double" }
                    }
                }
            },
            "identifiers": {
                "bsonType": "array",
                "items": {
                    "title": "object",
                    "properties": {
                        "type": { "bsonType": "string" },
                        "valueHash": { "bsonType": "string" },
                        "updatedAt": { "bsonType": "double" }
                    }
                }
            },
            "fingerprints": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "deviceIds": { "bsonType": "array", "items": { "bsonType": "string" } },
                    "cookies": { "bsonType": "array", "items": { "bsonType": "string" } }
                }
            },
            "firstSeenAt": { "bsonType": "double" },
            "lastSeenAt": { "bsonType": "double" },
            "createdAt": { "bsonType": "double" }
        }
    },

    person_profile_links: {
        "bsonType": "object",
        "title": "person_profile_links",
        "required": ["businessId"],
        "properties": {
            "businessId": { "bsonType": "objectId" },
            "personId": { "bsonType": "objectId" },
            "profileId": { "bsonType": "objectId" },
            "linkType": { "bsonType": "string" },
            "isHardLink": { "bsonType": "bool" },
            "confidence": { "bsonType": "double" },
            "signals": { "bsonType": "object", "title": "object" },
            "createdAt": { "bsonType": "double" }
        }
    },

    sessions: {
        "bsonType": "object",
        "title": "sessions",
        "properties": {
            "businessId": {
                "bsonType": "objectId"
            },
            "channelId": {
                "bsonType": "objectId"
            },
            "consumerId": {
                "bsonType": "objectId"
            },
            "inboxId": {
                "bsonType": "objectId"
            },
            "status": {
                "bsonType": "string"
            },
            "startedAt": {
                "bsonType": "double"
            },
            "lastSeenAt": {
                "bsonType": "double"
            },
            "endedAt": {
                "bsonType": "double"
            },
            "durationMs": {
                "bsonType": "double"
            },
            "pageCount": {
                "bsonType": "int"
            },
            "utm": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "source": {
                        "bsonType": "string"
                    },
                    "medium": {
                        "bsonType": "string"
                    },
                    "campaign": {
                        "bsonType": "string"
                    },
                    "term": {
                        "bsonType": "string"
                    },
                    "content": {
                        "bsonType": "string"
                    }
                }
            },
            "referrer": {
                "bsonType": "string"
            },
            "device": {
                "bsonType": "string"
            },
            "userAgent": {
                "bsonType": "string"
            },
            "attributes": {
                "bsonType": "array",
                "items": {
                    "title": "object"
                }
            },
            "externalSessionId": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "double"
            }
        }
    },

    page_views: {
        "bsonType": "object",
        "title": "page_views",
        "properties": {
            "sessionId": {
                "bsonType": "objectId"
            },
            "businessId": {
                "bsonType": "objectId"
            },
            "channelId": {
                "bsonType": "objectId"
            },
            "consumerId": {
                "bsonType": "objectId"
            },
            "inboxId": {
                "bsonType": "objectId"
            },
            "type": {
                "bsonType": "string"
            },
            "path": {
                "bsonType": "string"
            },
            "title": {
                "bsonType": "string"
            },
            "order": {
                "bsonType": "int"
            },
            "timestamp": {
                "bsonType": "double"
            },
            "dwellMs": {
                "bsonType": "double"
            },
            "metadata": {
                "bsonType": "object",
                "title": "object"
            },
            "createdAt": {
                "bsonType": "double"
            }
        }
    },

    assistants: {
        "bsonType": "object",
        "title": "assistants",
        "properties": {
            "userId": {
                "bsonType": "string"
            },
            "businessId": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "double"
            },
            "updatedAt": {
                "bsonType": "double"
            },
            "assistantId": {
                "bsonType": "string"
            },
            "assistantIdLlm": {
                "bsonType": "string"
            },
            "voice": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "provider": {
                        "bsonType": "string"
                    },
                    "voiceId": {
                        "bsonType": "string"
                    },
                    "name": {
                        "bsonType": "string"
                    }
                }
            },
            "model": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "provider": {
                        "bsonType": "string"
                    },
                    "model": {
                        "bsonType": "string"
                    }
                }
            },
            "metadata": {
                "bsonType": "object",
                "title": "object"
            },
            "name": {
                "bsonType": "string"
            },
            "description": {
                "bsonType": "string"
            },
            "firstMessage": {
                "bsonType": "string"
            },
            "systemMessage": {
                "bsonType": "string"
            },
            "serverUrl": {
                "bsonType": "string"
            },
            "transcriber": {
                "bsonType": "object",
                "title": "object",
                "properties": {
                    "provider": {
                        "bsonType": "string"
                    },
                    "model": {
                        "bsonType": "string"
                    },
                    "language": {
                        "bsonType": "string"
                    },
                    "smartFormat": {
                        "bsonType": "string"
                    }
                }
            },
            "serverMessages": {
                "bsonType": "array",
                "items": {
                    "title": "object"
                }
            },
            "tools": {
                "bsonType": "array",
                "items": {
                    "title": "object"
                }
            },
            "knowledgeBase": {
                "bsonType": "object",
                "properties": {
                    "provider": {
                        "bsonType": "string"
                    },
                    "id": {
                        "bsonType": "string"
                    }
                }
            }
        }
    },

    attachments: {
        "bsonType": "object",
        "title": "attachments",
        "required": ["businessId", "inboxId", "interactionId", "consumerId", "channelId", "originalName", "source"],
        "properties": {
            "businessId": {
                "bsonType": "objectId"
            },
            "inboxId": {
                "bsonType": "objectId"
            },
            "interactionId": {
                "bsonType": "objectId"
            },
            "consumerId": {
                "bsonType": "objectId"
            },
            "channelId": {
                "bsonType": "objectId"
            },
            "originalName": {
                "bsonType": "string"
            },
            "fileSize": {
                "bsonType": ["double", "int"]
            },
            "mimeType": {
                "bsonType": "string"
            },
            "fileExtension": {
                "bsonType": "string"
            },
            "localPath": {
                "bsonType": "string"
            },
            "localUrl": {
                "bsonType": "string"
            },
            "remoteUrl": {
                "bsonType": "string"
            },
            "source": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "double"
            },
            "recordingId": {
                "bsonType": "string"
            },
            "attributes": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "properties": {
                        "key": {
                            "bsonType": "string"
                        },
                        "value": {
                            "bsonType": ["string", "double", "bool", "int"]
                        }
                    }
                }
            },
            "thumbnailUrl": {
                "bsonType": "string"
            }
        }
    },

    uploads: {
        "bsonType": "object",
        "title": "uploads",
        "required": ["fileId", "originalName", "source", "status"],
        "properties": {
            "fileId": {
                "bsonType": "string"
            },
            "businessId": {
                "bsonType": "objectId"
            },
            "userId": {
                "bsonType": "objectId"
            },
            "originalName": {
                "bsonType": "string"
            },
            "fileSize": {
                "bsonType": ["double", "int"]
            },
            "mimeType": {
                "bsonType": "string"
            },
            "fileExtension": {
                "bsonType": "string"
            },
            "remoteUrl": {
                "bsonType": "string"
            },
            "status": {
                "bsonType": "string",
                "enum": ["pending", "completed", "failed"]
            },
            "statusUrl": {
                "bsonType": "string"
            },
            "source": {
                "bsonType": "string",
                "enum": ["api_upload", "webhook_download", "knowledge_base", "messaging", "system"]
            },
            "attributes": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "properties": {
                        "key": {
                            "bsonType": "string"
                        },
                        "value": {
                            "bsonType": ["string", "double", "bool", "int"]
                        }
                    }
                }
            },
            "thumbnailUrl": {
                "bsonType": "string"
            }
        }
    }
    ,
    files: {
        "bsonType": "object",
        "title": "files",
        "required": ["fileId", "originalName", "status"],
        "properties": {
            "fileId": {
                "bsonType": "string"
            },
            "businessId": {
                "bsonType": "objectId"
            },
            "userId": {
                "bsonType": "objectId"
            },
            "originalName": {
                "bsonType": "string"
            },
            "fileSize": {
                "bsonType": ["double", "int"]
            },
            "mimeType": {
                "bsonType": "string"
            },
            "fileExtension": {
                "bsonType": "string"
            },
            "remoteUrl": {
                "bsonType": "string"
            },
            "status": {
                "bsonType": "string",
                "enum": ["pending", "completed", "failed"]
            },
            "kbStatus": {
                "bsonType": "string",
                "enum": ["queued", "completed", "failed"]
            },
            "statusUrl": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "double"
            },
            "updatedAt": {
                "bsonType": "double"
            },
            "completedAt": {
                "bsonType": ["double", "int"]
            }
        }
    }
};

// Index definitions for all collections
const indexes = {
    business: [
        {
            keys: { "slug": 1 },
            options: { name: "index1", unique: true }
        }
    ],

    channels: [
        {
            keys: { "businessId": 1, "type": 1, "identifier": 1 },
            options: { name: "index1", unique: true }
        }
    ],

    consumers: [
        {
            keys: { "businessId": 1, "contacts.phones.value": 1 },
            options: { name: "index1" }
        },
        {
            keys: { "businessId": 1, "contacts.emails.value": 1 },
            options: { name: "index2" }
        },
        {
            keys: { "businessId": 1, "externalId": 1 },
            options: { name: "index3" }
        }
    ],

    inbox: [
        {
            keys: { "businessId": 1, "consumerId": 1, "channel.id": 1 },
            options: { name: "index1", unique: true }
        },
        {
            keys: { "businessId": 1, "assigneeId": 1, "status": 1, "latestAt": -1 },
            options: { name: "index2" }
        },
        {
            keys: { "businessId": 1, "channel.id": 1, "latestAt": -1 },
            options: { name: "index3" }
        },
        {
            keys: { "businessId": 1, "channel.type": 1, "unreadForAssignee": 1, "latestAt": -1 },
            options: { name: "index4" }
        },
        {
            keys: { "keywords": 1 },
            options: { name: "index5" }
        }
    ],

    interactions: [
        {
            keys: { "inboxId": 1, "timestamp": -1 },
            options: { name: "index1" }
        },
        {
            keys: { "businessId": 1, "medium": 1, "direction": 1, "status": 1, "timestamp": -1 },
            options: { name: "index2" }
        },
        {
            keys: { "attributes.key": 1, "attributes.value": 1 },
            options: { name: "index3" }
        },
        {
            keys: { "messageId": 1 },
            options: { name: "messageId_unique", unique: true, sparse: true }
        },
        {
            keys: { "businessId": 1, "consumerId": 1, "channelId": 1, "timestamp": -1 },
            options: { name: "index4" }
        }
    ],

    // users: [
    //     {
    //         keys: { "businessId": 1, "email": 1 },
    //         options: { name: "index1", unique: true }
    //     },
    //     {
    //         keys: { "businessId": 1, "role": 1 },
    //         options: { name: "index2" }
    //     }
    // ],

    departments: [
        {
            keys: { "businessId": 1, "name": 1 },
            options: { name: "index1", unique: true }
        },
        {
            keys: { "businessId": 1, "channelIds": 1 },
            options: { name: "index2" }
        }
    ],

    people: [
        { keys: { "businessId": 1, "lastSeenAt": -1 }, options: { name: "people_idx1" } },
        { keys: { "businessId": 1, "emails.valueHash": 1, "emails.verified": 1 }, options: { name: "people_idx2" } },
        { keys: { "businessId": 1, "phones.valueHash": 1, "phones.verified": 1 }, options: { name: "people_idx3" } },
        { keys: { "businessId": 1, "identifiers.type": 1, "identifiers.valueHash": 1 }, options: { name: "people_idx4" } },
        { keys: { "businessId": 1, "fingerprints.deviceIds": 1 }, options: { name: "people_idx5" } },
        { keys: { "businessId": 1, "fingerprints.cookies": 1 }, options: { name: "people_idx6" } }
    ],

    person_profile_links: [
        { keys: { "businessId": 1, "personId": 1, "profileId": 1 }, options: { name: "ppl_idx1", unique: true } },
        { keys: { "businessId": 1, "profileId": 1, "confidence": -1 }, options: { name: "ppl_idx2" } },
        { keys: { "businessId": 1, "personId": 1, "linkType": 1, "confidence": -1 }, options: { name: "ppl_idx3", partialFilterExpression: { linkType: "soft" } } }
    ],

    sessions: [
        {
            keys: { "businessId": 1, "channelId": 1, "startedAt": -1 },
            options: { name: "biz_channel_startedAt" }
        }, {
            keys: { "consumerId": 1, "startedAt": -1 },
            options: { name: "consumer_startedAt" }
        },
        {
            keys: { "status": 1, "lastSeenAt": -1 },
            "startedAt": -1
        }, {
            keys: { "inboxId": 1, "startedAt": -1 },
            options: { name: "inbox_startedAt" }
        },
        {
            keys: { "businessId": 1, "externalSessionId": 1 },
            options: { name: "biz_extSessionId", sparse: true, unique: true }
        }
    ],

    page_views: [
        {
            keys: { "sessionId": 1, "timestamp": -1 },
            options: { name: "session_ts" }
        },
        {
            keys: { "businessId": 1, "path": 1, "timestamp": -1 },
            options: { name: "biz_path_ts" }
        },
        {
            keys: { "consumerId": 1, "timestamp": -1 },
            options: { name: "consumer_ts" }
        },
        {
            keys: { "businessId": 1, "type": 1, "timestamp": -1 },
            options: { name: "biz_type_ts" }
        }
    ],

    assistants: [
        { keys: { "userId": 1, "createdAt": -1 }, options: { name: "user_createdAt" } },
        { keys: { "assistantId": 1 }, options: { name: "assistantId_unique", unique: true, sparse: true } },
        { keys: { "assistantIdLlm": 1 }, options: { name: "assistantIdLlm_unique", unique: true, sparse: true } },
        { keys: { "name": 1 }, options: { name: "name_idx" } }
    ],

    attachments: [
        {
            keys: { "businessId": 1, "inboxId": 1, "createdAt": -1 },
            options: { name: "index1" }
        },
        {
            keys: { "businessId": 1, "consumerId": 1, "createdAt": -1 },
            options: { name: "index2" }
        },
        {
            keys: { "interactionId": 1 },
            options: { name: "index3" }
        },
        {
            keys: { "recordingId": 1 },
            options: { name: "index4" }
        },
        {
            keys: { "attributes.key": 1, "attributes.value": 1 },
            options: { name: "index5" }
        }
    ]
    ,
    files: [
        { keys: { "fileId": 1 }, options: { name: "fileId_unique", unique: true, sparse: true } },
        { keys: { "businessId": 1, "createdAt": -1 }, options: { name: "biz_createdAt" } }
    ]
};

export { schemas, indexes };