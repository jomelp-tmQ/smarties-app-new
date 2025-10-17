export class TTSProvider {
    constructor() { }
    get IsReady() { return false; }
    get IsSpeaking() { return false; }
    async initialize() { }
    async speak(text) { }
    setLanguage(language) { }
    setVoice(voice) { }
    getLanguages() { }
    getVoices() { }
    onLanguageChange(callback) { }
    onVoiceChange(callback) { }
    destroy() { }
    onReady(callback) { }

    // Event handling methods
    on(event, callback) { }
    off(event, callback) { }
    onSpeechStart(callback) { }
    onSpeechEnd(callback) { }
    onSpeechPause(callback) { }
    onSpeechResume(callback) { }
}