// Test script to seed sample business, department, and channel data
// Run this file to populate your database with test data

import { Meteor } from 'meteor/meteor';
import Business from '../imports/api/server/classes/dbTemplates/Business.js';
import Departments from '../imports/api/server/classes/dbTemplates/Departments.js';
import Channels from '../imports/api/server/classes/dbTemplates/Channels.js';

async function seedTestData() {
    console.log('🌱 Starting database seeding...');

    try {
        // Validate that required collections exist
        if (!Business || !Departments || !Channels) {
            throw new Error('Required database classes not properly imported');
        }
        // 1. Create a sample business
        console.log('📊 Creating sample business...');
        const businessData = new Business({
            name: 'Smarties Test Company',
            slug: 'smarties-test',
            local: 'en-US',
            plan: 'premium',
            settings: {
                timezone: 'America/New_York',
                businessHours: {
                    monday: { start: '09:00', end: '17:00' },
                    tuesday: { start: '09:00', end: '17:00' },
                    wednesday: { start: '09:00', end: '17:00' },
                    thursday: { start: '09:00', end: '17:00' },
                    friday: { start: '09:00', end: '17:00' },
                    saturday: { start: '10:00', end: '14:00' },
                    sunday: { start: 'closed', end: 'closed' }
                },
                notifications: {
                    email: true,
                    sms: false,
                    push: true
                }
            },
            createdAt: Date.now()
        });

        let businessId;
        try {
            businessId = await businessData.save();
            console.log(`✅ Business created with ID: ${businessId}`);
        } catch (businessError) {
            console.error('❌ Failed to create business:', businessError.message);
            if (businessError.errInfo) {
                console.error('📋 Validation details:', JSON.stringify(businessError.errInfo, null, 2));
            }
            throw new Error(`Business creation failed: ${businessError.message}`);
        }

        // 2. Create a sample channel with type 'chat' and provider 'smarty'
        console.log('💬 Creating sample channel...');
        const channelData = new Channels({
            businessId: businessId,
            type: 'chat',
            identifier: 'smarty-chat-main',
            provider: 'smarty',
            metadata: {
                displayName: 'Smarty Chat Channel',
                description: 'Main chat channel for customer support',
                maxConcurrentChats: 50,
                autoResponse: {
                    enabled: true,
                    message: 'Hello! Thanks for contacting us. We\'ll be with you shortly.',
                    delay: 2000 // 2 seconds
                },
                integrations: {
                    crmSync: true,
                    analyticsTracking: true,
                    chatbotEnabled: false
                },
                appearance: {
                    theme: 'light',
                    primaryColor: '#007bff',
                    brandLogo: 'https://example.com/logo.png'
                }
            },
            status: 'active',
            createdAt: Date.now()
        });

        const channelId = await channelData.save();
        console.log(`✅ Channel created with ID: ${channelId}`);

        // 3. Create a sample department and link it to the channel
        console.log('🏢 Creating sample department...');
        const departmentData = new Departments({
            businessId: businessId,
            name: 'Customer Support',
            description: 'Primary customer support department handling all chat inquiries',
            channelIds: [channelId], // Link the channel to this department
            createdAt: Date.now()
        });

        const departmentId = await departmentData.save();
        console.log(`✅ Department created with ID: ${departmentId}`);

        // 4. Create additional test channels for variety
        console.log('📱 Creating additional test channels...');

        // WhatsApp channel
        const whatsappChannel = new Channels({
            businessId: businessId,
            type: 'messaging',
            identifier: 'whatsapp-business',
            provider: 'whatsapp',
            metadata: {
                displayName: 'WhatsApp Business',
                phoneNumber: '+1234567890',
                verified: true,
                businessProfile: {
                    description: 'Official WhatsApp channel for Smarties Test Company',
                    email: 'support@smartiestest.com',
                    website: 'https://smartiestest.com'
                }
            },
            status: 'active',
            createdAt: Date.now()
        });

        const whatsappChannelId = await whatsappChannel.save();
        console.log(`✅ WhatsApp channel created with ID: ${whatsappChannelId}`);

        // Email channel
        const emailChannel = new Channels({
            businessId: businessId,
            type: 'email',
            identifier: 'support-email',
            provider: 'smtp',
            metadata: {
                displayName: 'Support Email',
                emailAddress: 'support@smartiestest.com',
                smtpConfig: {
                    host: 'smtp.example.com',
                    port: 587,
                    secure: false,
                    requireAuth: true
                },
                autoReply: {
                    enabled: true,
                    subject: 'We received your message',
                    template: 'Thank you for contacting us. We will respond within 24 hours.'
                }
            },
            status: 'active',
            createdAt: Date.now()
        });

        const emailChannelId = await emailChannel.save();
        console.log(`✅ Email channel created with ID: ${emailChannelId}`);

        // Update department to include all channels
        console.log('🔗 Linking all channels to department...');
        await departmentData.update({
            channelIds: [channelId, whatsappChannelId, emailChannelId]
        });
        console.log('✅ Department updated with all channel links');

        // 5. Display summary
        console.log('\n🎉 Seeding completed successfully!');
        console.log('📋 Summary of created entities:');
        console.log(`   📊 Business: "${businessData.name}" (slug: ${businessData.slug})`);
        console.log(`   🏢 Department: "${departmentData.name}"`);
        console.log(`   💬 Chat Channel: "Smarty Chat Channel" (type: chat, provider: smarty)`);
        console.log(`   📱 WhatsApp Channel: "WhatsApp Business" (type: messaging, provider: whatsapp)`);
        console.log(`   📧 Email Channel: "Support Email" (type: email, provider: smtp)`);

        console.log('\n🔗 Test webhook endpoints:');
        console.log(`   Inbound: POST /api/b/${businessData.slug}/channels/messages/inbound`);
        console.log(`   Outbound: POST /api/b/${businessData.slug}/channels/messages/outbound`);

        console.log('\n📝 Sample webhook payload for testing:');
        console.log(JSON.stringify({
            provider: 'smarty',
            type: 'chat',
            identifier: 'smarty-chat-main',
            from: 'customer123',
            text: 'Hello, I need help with my order!',
            meta: {
                customerName: 'John Doe',
                userAgent: 'Mozilla/5.0...',
                sessionId: 'sess_abc123'
            }
        }, null, 2));

        return {
            business: businessData,
            department: departmentData,
            channels: {
                chat: channelData,
                whatsapp: whatsappChannel,
                email: emailChannel
            }
        };

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    }
}

// Function to clean up test data (optional)
async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');

    try {
        // Find and remove test business and related data
        const business = await Business.findBySlug('smarties-test');
        if (business) {
            // Remove departments
            const departments = await Departments.findByBusinessId(business._id);
            for (const dept of departments) {
                await dept.delete();
                console.log(`🗑️  Deleted department: ${dept.name}`);
            }

            // Remove channels
            const channels = await Channels.findByBusinessId(business._id);
            for (const channel of channels) {
                await channel.delete();
                console.log(`🗑️  Deleted channel: ${channel.metadata?.displayName || channel.identifier}`);
            }

            // Remove business
            await business.delete();
            console.log(`🗑️  Deleted business: ${business.name}`);

            console.log('✅ Cleanup completed successfully!');
        } else {
            console.log('ℹ️  No test data found to clean up.');
        }
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Main execution
if (Meteor.isServer) {
    Meteor.startup(async () => {
        try {
            // Uncomment the line below if you want to clean up before seeding
            // await cleanupTestData();

            // Check if test data already exists
            const existingBusiness = await Business.findBySlug('smarties-test');
            if (existingBusiness) {
                console.log('ℹ️  Test data already exists. Skipping seeding.');
                console.log('   To reseed, run cleanupTestData() first or change the business slug.');
            } else {
                await seedTestData();
            }
        } catch (startupError) {
            console.error('❌ Error during startup seeding:', startupError.message);
            console.error('📋 The application will continue to run, but test data was not created.');
            console.error('   You can manually run seedTestData() from the console to try again.');

            // Log additional details if available
            if (startupError.errInfo) {
                console.error('🔍 Error details:', JSON.stringify(startupError.errInfo, null, 2));
            }

            // Don't re-throw the error to prevent app crash
        }
    });
}

// Export functions for manual use
export { seedTestData, cleanupTestData };
