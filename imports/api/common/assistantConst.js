export const ASSISTANT_VOICE_PROVIDER = [
    { label: "cartesia", value: "cartesia" },
    { label: "google", value: "google" },
];

export const defaultModel = {
    assistantName: "Leo",
    firstMessage: "Hi there! I'm Leo, your go-to for any SmartHome Innovations queries. How can I assist you today?",
    systemPrompt: "Welcome, Leo! You are the friendly and helpful voice of SmartHome Innovations, here to assist customers with their smart home devices...",
    provider: "openai",
    model: "gpt-3.5-turbo",
    files: "First choice",
    temperature: "0.7",
    maxTokens: "First choice"
};
export const defaultTranscriber = {
    provider: "deepgram",
    model: "deepgram",
    backgroundDenoisingEnabled: false
};

export const defaultvoiceConfiguration = {
    provider: ASSISTANT_VOICE_PROVIDER[0].value,
    voiceid: ASSISTANT_VOICE_PROVIDER[0].value,
    voicename: "",
    addVoiceIdManually: false,
    model: ASSISTANT_VOICE_PROVIDER[0].value
};
export const defaultvoiceAdditionalConfiguration = {
    backgroundSound: "deepgram",
    backgroundSoundUrl: "",
    inputMinCharacters: "",
    punctuationBoundaries: "deepgram",
    customSpeedEnabled: false,
    speed: "Normal",
    anger: "none",
    positivity: "none",
    surprise: "none",
    sadness: "none",
    curiosity: "none"
};

export const defaulttools = {
    name: "Sample Tool",
    description: "This is a sample tool description.",
    selectAll: false,
    functionTool: "499ce958-10ae-4fa1-be50-124f32dc05e9",
    enableEndCallFunction: false,
    dialKeypad: false,
    phoneNumber: "+1 (555) 000-0000"
};

export const analysis = {
    systemPrompt: "Welcome, Leo! You are the friendly and helpful voice of SmartHome Innovations...",
    successEvaluationRubric: "deepgram",
    successEvaluationRequestTimeoutInSeconds: "0.7",
    dataStructurePrompt: "deepgram",
    name: "",
    type: "String",
    isEnum: false,
    required: false,
    description: "Hi there! I'm Leo, your go-to for any SmartHome Innovations queries. How can I assist you today?"
};
export const defaultadvanced = {
    hipaaCompliance: false,
    pciCompliance: false,
    audioRecording: "deepgram",
    videoRecording: false,
    waitSeconds: "0.7",
    smartEndpointing: "deepgram",
    onPunctuationSeconds: "0.7",
    voicemailDetectionProvider: "deepgram",
    serverUrl: "https://api.deepgram.com/v1/listen",
    serverDescription: "This is the server URL for Deepgram's API.",
    messagePrompt: "Welcome, Leo! You are the friendly and helpful voice of SmartHome Innovations...",
};

export const CALL_STATUS = {
    LIVE: "live",
    DEMO: "demo",
};

export const ASSISTANT = {
    NAME: "name",
    MODEL: "model",
    TRANSCRIBER: "transcriber",
    VOICE_CONFIGURATION: "voice",
    VOICE_ADDITIONAL_CONFIGURATION: "voiceAdditional",
    TOOLS: "tools",
    PREDEFINED_FUNCTIONS: "predefinedFunctions",
    ANALYSIS: "analysis",
    ADVANCED: "advanced",
    IS_ASSISTANT_POPUP_OPEN: "isAssistantPopupOpen",
    SELECTED_ASSISTANT: "selectedAssistant",
    DESCRIPTION: "description",
    FIRST_MESSAGE: "firstmessage",
    SYSTEM_PROMPT: "systemmessage",
    KNOWLEDGE_BASE: "knowledgebase",
};

export const MODEL_KEYS = {
    PROVIDER: "provider",
    MODEL: "model",
    TEMPERATURE: "temperature",
    MAX_TOKENS: "maxtokens",
};

export const VOICE_KEYS = {
    PROVIDER: "provider",
    VOICE_ID: "voiceid",
    VOICE_NAME: "voicename",
};

export const VOICE_ADDITIONAL_KEYS = {
    BACKGROUND_SOUND: "backgroundSound",
    BACKGROUND_SOUND_URL: "backgroundSoundUrl",
};

export const MODEL_PROVIDER = [
    { label: "openai", value: "openai" },
];

export const OPENAI_MODELS = [
    { label: "gpt-3.5-turbo", value: "gpt-3.5-turbo" },
    { label: "gpt-4", value: "gpt-4" },
    { label: "gpt-4o", value: "gpt-4o" },
    { label: "gpt-4o-mini", value: "gpt-4o-mini" },
];