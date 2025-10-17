// Script to remove MongoDB validators from collections
import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';

Meteor.startup(async () => {
    console.log('🔧 Removing MongoDB validators...');

    try {
        const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

        const collections = ['business', 'channels', 'consumers', 'inbox', 'interactions', 'departments'];

        for (const collectionName of collections) {
            try {
                await db.command({ collMod: collectionName, validator: {} });
                console.log(`✅ Removed validator from ${collectionName}`);
            } catch (error) {
                console.log(`⚠️  Could not remove validator from ${collectionName}: ${error.message}`);
            }
        }

        console.log('🎉 Validator removal complete! Testing API...');

        // Test the API
        setTimeout(async () => {
            try {
                const response = await fetch('http://localhost:3000/api/b/smarties-test/channels/messages/inbound', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: 'smarty',
                        type: 'chat',
                        identifier: 'smarty-chat-main',
                        from: 'test',
                        text: 'test'
                    })
                });

                const result = await response.json();
                console.log('📊 API Test Result:', result);

            } catch (error) {
                console.log('❌ API Test Failed:', error.message);
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Error removing validators:', error);
    }
});

export { };
