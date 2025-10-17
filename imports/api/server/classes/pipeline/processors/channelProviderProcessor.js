import { BaseProcessor } from "./baseProcessor.js";
import { InteractionFrame } from "../frames/interactionFrame";
import Channels from "../../dbTemplates/Channels.js";
import Interactions from "../../dbTemplates/Interactions.js";
const CHAT_PROVIDERS = {
    smarties: async ({ username, password, url, to, text, sessionId, agentId, ...rest }) => {
        try {
            if (agentId === "bot") {
                return { messageId: rest.messageId || `chat-${Date.now()}`, status: 'sent', code: 200 };
            }

            const auth = Buffer.from(`${username}:${password}`).toString('base64');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Basic " + auth,
                },
                body: JSON.stringify({ query: text, sessionId, ...rest }),
            });
            return await response.json().then(() => {
                return { messageId: rest.messageId || `chat-${Date.now()}`, status: 'queued', code: 200 };
            });
        } catch (error) {
            return { messageId: rest.messageId || `chat-${Date.now()}`, status: 'failed', code: 500, error: error.message };
        }
    }
};

export class ChannelProviderProcessor extends BaseProcessor {
    constructor() {
        super({ name: "ChannelProviderProcessor" });
    }
    getProvider(medium, channel) {
        switch (medium) {
            case 'chat':
                return CHAT_PROVIDERS[channel.provider];
            default:
                return null;
        }
    }
    async _process(frame, ctx) {
        if (frame instanceof InteractionFrame) {
            switch (frame.interaction.medium) {
                case 'sms':
                case 'whatsapp':
                    ctx.pass();
                    break;
                case 'chat':
                    const channel = await Channels.findById(frame.interaction.channelId._str);
                    const provider = this.getProvider(frame.interaction.medium, channel);
                    if (provider) {
                        const result = await provider({
                            ...frame.interaction,
                            ...frame.meta,
                            url: channel.api.url,
                            username: channel.api.key,
                            password: channel.api.secret,
                        });
                        const interaction = await Interactions.findById(frame.interaction._id._str);
                        if (interaction) {
                            if (!interaction.messageId && result.messageId) {
                                interaction.messageId = result.messageId;
                            }
                            interaction.status = result.status || 'failed';
                            await interaction.save();
                            ctx.next(new InteractionFrame(interaction, frame.meta));
                            return;
                        }
                    }
                    ctx.pass();
                    break;
            }
            return;
        }
        ctx.pass();
    }
}