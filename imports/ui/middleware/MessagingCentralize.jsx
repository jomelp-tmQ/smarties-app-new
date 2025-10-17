import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Index from '../pages/messaging';
import Lottie from 'lottie-react';
import { PATHS } from '../paths';
import MessagingWatcher, { INTERACTION, POPUP, TAB, TOGGLE } from '../../api/client/watchers/MessagingWatcher';
import SessionWatcher from '../../api/client/watchers/SessionWatcher';
import InboxWatcher from '../../api/client/watchers/InboxWatcher';
import { useWatcher } from '../../api/client/Watcher2';
import ConvoinbounddurationItem from '../pages/custom/ConvoinbounddurationItem';
import ConvodividercontentItem from '../pages/custom/ConvodividercontentItem';
import ConvodividerItem from '../pages/custom/ConvodividerItem';
import InboxFilter from '../pages/custom/InboxFilter';
import MessaginginboxavatarItem_9c103e5b from '../pages/custom/MessaginginboxavatarItem_9c103e5b';
import MessaginginboxnamerowItem_c231de57 from '../pages/custom/MessaginginboxnamerowItem_c231de57';
import FilterdropdownItem from '../pages/custom/FilterdropdownItem';
import DurationtooltipItem from '../pages/custom/DurationtooltipItem';
import MessaginginboxtextcontentbotItem_6121060c from '../pages/custom/MessaginginboxtextcontentbotItem_6121060c';
import MessaginginboxitemrightItem_d2b9f097 from '../pages/custom/MessaginginboxitemrightItem_d2b9f097';
import MessagingtablinkItem_69d9c18b from '../pages/custom/MessagingtablinkItem_69d9c18b';

function DeepEnhancer({ component: Component, enhancements }) {
    const interceptRender = (element) => {
        if (!React.isValidElement(element)) return element;

        const elementType = element.type;

        // Handle React components (function/class)
        if (typeof elementType === 'function') {
            const rendered = elementType(element.props);
            return interceptRender(rendered);
        }

        // Handle DOM elements (div, button, input, etc.)
        if (typeof elementType === 'string') {
            const props = element.props || {};
            const { className, id, name } = props;
            const wId = props['data-w-id'];
            const tmq = props['tmq'];

            let matchedEnhancement = null;
            if (tmq && enhancements[`[tmq="${tmq}"]`]) {
                matchedEnhancement = enhancements[`[tmq="${tmq}"]`];
            }
            // Match by data-w-id (highest priority for your use case)
            else if (wId && enhancements[`[data-w-id="${wId}"]`]) {
                matchedEnhancement = enhancements[`[data-w-id="${wId}"]`];
            }
            // Match by ID
            else if (id && enhancements[`#${id}`]) {
                matchedEnhancement = enhancements[`#${id}`];
            }
            // Match by className
            else if (className) {
                const classes = className.split(' ');
                for (const cls of classes) {
                    if (enhancements[`.${cls}`]) {
                        matchedEnhancement = enhancements[`.${cls}`];
                        break;
                    }
                }
            }
            // Match by name attribute
            else if (name && enhancements[`[name="${name}"]`]) {
                matchedEnhancement = enhancements[`[name="${name}"]`];
            }

            // Apply enhancement and recurse children
            const children = element.props?.children
                ? React.Children.map(element.props.children, interceptRender)
                : element.props?.children;

            if (matchedEnhancement) {
                const mergedProps = { ...element.props, ...matchedEnhancement };
                // Only use recursively enhanced children if enhancement doesn't explicitly provide children
                if (!matchedEnhancement.hasOwnProperty('children')) {
                    mergedProps.children = children;
                }
                // If enhancement provides children, it stays (already merged above)

                return React.cloneElement(element, mergedProps);
            }

            return React.cloneElement(element, { ...element.props }, children);
        }

        // Recurse through children for other cases
        if (element.props?.children) {
            const children = React.Children.map(element.props.children, interceptRender);
            return React.cloneElement(element, {}, children);
        }

        return element;
    };

    return interceptRender(<Component />);
}

const BotSpeakControl = ({ text, watcher }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const idRef = useRef(Math.random().toString(36).slice(2));

    useEffect(() => {
        const onGlobalPlay = (e) => {
            const otherId = e?.detail?.id;
            if (otherId && otherId !== idRef.current) {
                if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                }
                setIsSpeaking(false);
            }
        };
        if (typeof window !== 'undefined') window.addEventListener(GLOBAL_AUDIO_EVENT, onGlobalPlay);

        const intervalId = setInterval(() => {
            try {
                const speaking = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.speaking : false;
                if (!speaking && isSpeaking) setIsSpeaking(false);
            } catch (e) { }
        }, 300);
        return () => {
            clearInterval(intervalId);
            if (typeof window !== 'undefined') window.removeEventListener(GLOBAL_AUDIO_EVENT, onGlobalPlay);
        };
    }, [isSpeaking]);

    const toggleSpeak = () => {
        if (isSpeaking) {
            if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(GLOBAL_AUDIO_EVENT, { detail: { id: idRef.current } }));
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try { window.speechSynthesis.resume(); } catch (e) { }
                try { window.speechSynthesis.cancel(); } catch (e) { }
            }
            setTimeout(() => {
                watcher.speak(text);
                setIsSpeaking(true);
            }, 300);
        }
    };

    return (
        <div className="message-player">
            <div className="btn-play" onClick={toggleSpeak}>
                <img loading="lazy" src={isSpeaking ? '/images/pause-fill.svg' : '/images/smarties-icon-play.svg'} alt={isSpeaking ? 'Stop' : 'Play'} />
            </div>
        </div>
    );
};

const MessageAudioPlayer = ({ recordingId }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fileStatus, setFileStatus] = useState(null);
    const idRef = useRef(Math.random().toString(36).slice(2));
    const recIdRef = useRef(recordingId);

    useEffect(() => {
        const onGlobalPlay = (e) => {
            const otherId = e?.detail?.id;
            if (otherId && otherId !== idRef.current) {
                const audio = audioRef.current;
                if (audio && !audio.paused) {
                    audio.pause();
                }
                setIsPlaying(false);
            }
        };
        if (typeof window !== 'undefined') window.addEventListener(GLOBAL_AUDIO_EVENT, onGlobalPlay);
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener(GLOBAL_AUDIO_EVENT, onGlobalPlay);
        };
    }, []);
    const formatTime = (seconds) => {
        if (!isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const checkFileStatus = async (recId) => {
        if (!recId) return false;

        try {
            setIsLoading(true);
            const response = await fetch(`/api/b/download/${recId}`);
            if (response.ok) {
                if (recId !== recIdRef.current) return false;
                setFileStatus('available');
                return true;
            } else if (response.status === 404) {
                if (recId !== recIdRef.current) return false;
                setFileStatus('pending');
                return false;
            } else {
                if (recId !== recIdRef.current) return false;
                setFileStatus('error');
                return false;
            }
        } catch (error) {
            console.error('Error checking file status:', error);
            if (recId === recIdRef.current) setFileStatus('error');
            return false;
        } finally {
            if (recId === recIdRef.current) setIsLoading(false);
        }
    };

    useEffect(() => {
        recIdRef.current = recordingId;
        // Reset player state when recordingId changes
        const audio = audioRef.current;
        if (audio) {
            try { audio.pause(); } catch (e) { }
            try { audio.currentTime = 0; } catch (e) { }
        }
        setIsPlaying(false);
        setDuration(0);
        setCurrentTime(0);
        setHasError(false);
        setFileStatus(null);

        // Automatically check file status when recordingId changes
        if (recordingId) {
            checkFileStatus(recordingId);
        }
        const onFileReady = (e) => {
            const readyId = e?.detail?.recordingId;
            if (readyId && readyId === recIdRef.current) {
                checkFileStatus(recIdRef.current);
            }
        };
        if (typeof window !== 'undefined') window.addEventListener('messageAudio:fileReady', onFileReady);
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener('messageAudio:fileReady', onFileReady);
        };
    }, [recordingId]);

    const togglePlay = async () => {
        if (!recordingId) return;

        // Check file status first if we haven't already
        if (fileStatus === null) {
            const isAvailable = await checkFileStatus(recordingId);
            if (!isAvailable) return;
        }

        // If file is pending, show message
        if (fileStatus === 'pending') {
            alert('File is not currently available yet. Please try again later.');
            return;
        }

        // If file has error, show message
        if (fileStatus === 'error') {
            alert('Unable to access file. Please try again later.');
            return;
        }

        const audio = audioRef.current;
        if (!audio) return;
        if (hasError) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(GLOBAL_AUDIO_EVENT, { detail: { id: idRef.current } }));

            // Set the audio source to our download endpoint
            audio.src = `/api/b/download/${recordingId}`;

            const playPromise = audio.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.then(() => {
                    setIsPlaying(true);
                }).catch((error) => {
                    console.error('Play failed:', error);
                    setHasError(true);
                    setIsPlaying(false);
                });
            } else {
                // Older browsers without promise from play()
                setIsPlaying(true);
            }
        }
    };

    const onLoadedMetadata = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setDuration(audio.duration || 0);
        setHasError(false);
    };

    const onTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
        setIsPlaying(false);
    };

    const onError = () => {
        setHasError(true);
        setIsPlaying(false);
    };

    const onSeek = (event) => {
        const bar = event.currentTarget;
        const rect = bar.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const ratio = Math.min(Math.max(x / rect.width, 0), 1);
        const audio = audioRef.current;
        if (!audio || hasError || !isFinite(duration) || duration <= 0) return;
        audio.currentTime = ratio * duration;
    };

    const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

    // Show loading state
    if (isLoading) {
        return (
            <div className="message-player">
                <div className="player-main">
                    <div className="player">
                        <div style={{ color: '#999' }}><i>Checking file availability...</i></div>
                    </div>
                </div>
            </div>
        );
    }

    // Show pending state
    if (fileStatus === 'pending') {
        return (
            <div className="message-player">
                <div className="player-main">
                    <div className="player">
                        <div style={{ color: '#999' }}><i>File is not currently available yet</i></div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (fileStatus === 'error') {
        return (
            <div className="message-player">
                <div className="player-main">
                    <div className="player">
                        <div style={{ color: '#999' }}><i>Unable to access file</i></div>
                    </div>
                </div>
            </div>
        );
    }

    // Show audio player when file is available
    if (recordingId && fileStatus === 'available') {
        return (
            <div className="message-player">
                <audio
                    ref={audioRef}
                    preload="metadata"
                    onLoadedMetadata={onLoadedMetadata}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={onEnded}
                    onCanPlay={() => setHasError(false)}
                    onError={onError}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    style={{ display: 'none' }}
                />
                <div className="btn-play" onClick={togglePlay}>
                    <img loading="lazy" src={isPlaying ? '/images/pause-fill.svg' : '/images/smarties-icon-play.svg'} alt={isPlaying ? 'Pause' : 'Play'} />
                </div>
                <div className="player-main">
                    <div className="player-bar" onClick={onSeek} style={{ cursor: 'pointer' }}>
                        <div className="player-active" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="player">
                        <div>{formatTime(currentTime)}</div>
                        <div>/</div>
                        <div>{formatTime(duration)}</div>
                    </div>
                </div>
            </div>
        );
    }

    // Default state when no recordingId or other conditions
    return (
        <div className="message-player">
            <div className="player-main">
                <div className="player">
                    <div style={{ color: '#999' }}><i>Recording currently not available</i></div>
                </div>
            </div>
        </div>
    );
};

export default function MessagingCentralize() {
    // WATCHERS
    const watcher = useRef(MessagingWatcher).current;
    const sessionWatcher = useRef(SessionWatcher).current;
    const inboxWatcher = useRef(InboxWatcher).current;
    const [error, setError] = useState(null);
    const [inbox, setInbox] = useState([]);
    const [messages, setMessages] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isSuggestionOpen, setIsSuggestionOpen] = useState(true);
    const [isEditable, setIsEditable] = useState(false);
    const [aiResponseText, setAiResponseText] = useState("");
    const [aiResponseDraft, setAiResponseDraft] = useState('');
    const [isDataEnrichmentSideColumn, setIsDataEnrichmentSideColumn] = useState(false);
    const [isDataEnrichmentProcessing, setIsDataEnrichmentProcessing] = useState(false);
    const [isDataEnrichmentResult, setIsDataEnrichmentResult] = useState(false);
    const conversationDivRef = useRef(null);
    const aiInputRef = useRef(null);
    const unreadCount = inboxWatcher.InboxUnreadTotal;

    useWatcher(watcher);
    useWatcher(sessionWatcher);
    useWatcher(inboxWatcher);
    const isInboxActive = watcher.getValue("inboxActive") ?? false;
    const businessId = watcher.BusinessId ?? null;
    useEffect(() => {
        if (!businessId) return;
        inboxWatcher.initialize();
        watcher.initialize();
        inboxWatcher.fetchInbox();
        inboxWatcher.inboxListen();
        async function setupWatcher() {
            try {
                const initial = await inboxWatcher.DB.find({}, { sort: { latestAt: -1 } }).fetch();
                setInbox(Array.isArray(initial) ? initial : []);
                const unsubscribe = inboxWatcher.DB.onChange(async () => {
                    const all = await inboxWatcher.DB.find({}, { sort: { latestAt: -1 } }).fetch();
                    setInbox(Array.isArray(all) ? all : []);
                });

                return unsubscribe;
            } catch (err) {
                console.error(err);
                // setError(err.message);
                // setLoading(false);
            }
        }
        const cleanupPromise = setupWatcher();

        return () => {
            cleanupPromise.then(cleanup => cleanup?.());
            inboxWatcher.stopListening();
        };
    }, [businessId]);

    useEffect(() => {
        if (isInboxActive) {
            async function setupInteractionWatcher() {
                try {
                    // Initialize from Minimongo
                    const initialMsgs = await watcher.DBInteraction.find({}).fetch();
                    setMessages(Array.isArray(initialMsgs) ? initialMsgs : []);
                    const initialAtt = await watcher.DBAttachments.find({}, { sort: { createdAt: -1 } }).fetch();
                    setAttachments(Array.isArray(initialAtt) ? initialAtt : []);

                    // Subscribe to local changes
                    const unsubMsgs = watcher.DBInteraction.onChange(async () => {
                        const allMsgs = await watcher.DBInteraction.find({}).fetch();
                        setMessages(Array.isArray(allMsgs) ? allMsgs : []);
                    });
                    const unsubAtt = watcher.DBAttachments.onChange(async () => {
                        const allAtt = await watcher.DBAttachments.find({}, { sort: { createdAt: -1 } }).fetch();
                        setAttachments(Array.isArray(allAtt) ? allAtt : []);
                    });

                    return () => {
                        try { unsubMsgs?.(); } catch (e) { }
                        try { unsubAtt?.(); } catch (e) { }
                    };
                } catch (err) {
                    console.error(err);
                    watcher.setValue("inboxActive", false);
                }
            }

            const cleanupPromise = setupInteractionWatcher();

            return () => {
                cleanupPromise.then(cleanup => cleanup?.());
                watcher.stopInteractionListening();
                watcher.stopAttachmentListening();
            };
        }
    }, [isInboxActive]);

    useEffect(() => {
        if (isDataEnrichmentProcessing) {
            setTimeout(() => {
                setIsDataEnrichmentResult(true);
                setIsDataEnrichmentProcessing(false);
                setIsDataEnrichmentSideColumn(false);
            }, 2000);
        }
    }, [isDataEnrichmentProcessing]);

    const isSmartiesAssistantToggled = watcher.getValue(TOGGLE.SMARTIES_ASSISTANT) ?? true;
    const isScriptInjectionPopupOpen = watcher.getValue(POPUP.SCRIPT_INJECTION);
    const activeMessageTab = watcher.getValue(TAB.MESSAGES);
    const activeCustomerInformationTab = watcher.getValue(TAB.CUSTOMER_INFORMATION);
    const isMessageFilterPopupOpen = watcher.getValue(POPUP.MESSAGES_FILTER);
    const messageList = messages;
    const inboxList = inbox;
    const attachmentsList = attachments;
    const currentInteraction = watcher.getValue(INTERACTION.CURRENT);
    const predefinedAnswers = watcher.getValue(INTERACTION.PREDEFINED_ANSWERS);
    const suggestions = watcher.getValue(INTERACTION.SUGGESTIONS);
    const loadingSuggestions = watcher.getValue(INTERACTION.LOADING_SUGGESTIONS);
    const isTakenOverCall = watcher.getValue("IS_TAKEN_OVER_CALL") ?? false;
    const isCallInProgress = watcher.getValue("IS_CURRENTLY_IN_CALL");

    // Call in progress timer
    const [callElapsed, setCallElapsed] = useState('00:00');
    const callTimerRef = useRef(null);

    const callSegmentStartTs = useMemo(() => {
        if (!Array.isArray(messageList) || messageList.length === 0) return null;

        // Find the last index that relates to a call
        let lastCallIdx = -1;
        for (let i = messageList.length - 1; i >= 0; i--) {
            if (messageList[i]?.medium === 'call') { lastCallIdx = i; break; }
        }
        if (lastCallIdx === -1) return null;

        // Walk backward through contiguous call messages to find the segment start,
        // stopping after an 'ended' marker if present.
        let startIdx = lastCallIdx;
        for (let i = lastCallIdx; i >= 0; i--) {
            const msg = messageList[i];
            if (msg?.medium !== 'call') break;
            const ended = Array.isArray(msg?.attributes) && msg.attributes.some(a => a?.key === 'isCallEnded' && String(a?.value).toLowerCase() === 'true');
            if (ended) { startIdx = i + 1; break; }
            startIdx = i;
        }

        // If there's an end marker after the start, it's not an active segment
        for (let i = startIdx; i < messageList.length; i++) {
            const msg = messageList[i];
            if (Array.isArray(msg?.attributes) && msg.attributes.some(a => a?.key === 'isCallEnded' && String(a?.value).toLowerCase() === 'true')) {
                return null;
            }
        }

        const ts = moment(messageList[startIdx]?.timestamp).valueOf();
        return Number.isFinite(ts) ? ts : null;
    }, [messageList]);

    useEffect(() => {
        const clearTimer = () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
        };

        if (!isCallInProgress || !callSegmentStartTs) {
            clearTimer();
            setCallElapsed('00:00');
            return;
        }

        const update = () => {
            const now = Date.now();
            const elapsedSec = Math.max(0, Math.floor((now - callSegmentStartTs) / 1000));
            const minutes = Math.floor(elapsedSec / 60);
            const seconds = elapsedSec % 60;
            const hours = Math.floor(minutes / 60);
            const text = hours > 0
                ? `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                : `${minutes}:${seconds.toString().padStart(2, '0')}`;
            setCallElapsed(text);
        };

        update();
        clearTimer();
        callTimerRef.current = setInterval(update, 1000);

        return () => { clearTimer(); };
    }, [callSegmentStartTs, isCallInProgress]);

    // SESSIONS
    // const session = sessionWatcher.getValue(SESSION.CURRENT_SESSION);
    // const previousSession = sessionWatcher.getValue(SESSION.PREVIOUS_SESSION);
    const session = sessionWatcher.CurrentSession;
    const previousSession = sessionWatcher.PreviousSession;
    const pageViews = sessionWatcher.PageViews;

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (conversationDivRef.current && messageList.length > 0) {
            conversationDivRef.current.scrollTop = conversationDivRef.current.scrollHeight;
        }
    }, [messageList.length]);

    useEffect(() => {
        if (suggestions && suggestions.length > 0) setAiResponseText(suggestions[0]);
    }, [suggestions]);

    useEffect(() => {
        if (isEditable && aiInputRef.current) {
            const el = aiInputRef.current;
            const { value } = el;
            el.focus();
            const end = value.length;
            try {
                el.setSelectionRange(end, end);
            } catch (_) {
                // Non-text inputs may not support selection; ignore.
            }
        }
    }, [isEditable]);

    const truncateText = (text, limit = 45) => {
        return text.length > limit ? text.substring(0, limit) + "..." : text;
    };

    const mapSessionStatus = (session) => {
        return <RowprofilecontactdetailsItem_ca66d080
            src={'images/smarties-icon-journey-started.svg'}
            divText={session.status}
            divText1={moment(session.startedAt).format('hh:mm A') + " (" + moment(session.startedAt).fromNow() + ")"}
        />;
    };

    const rowJourney = (pageViews = []) => {
        const iconMap = {
            'checkout': 'images/smarties-icon-journey-checkout.svg',
            'home': 'images/smarties-icon-journey-home.svg',
            'cart': 'images/smarties-icon-journey-cart.svg',
        };
        const getIcon = (path) => {
            for (const key in iconMap) {
                if (new RegExp(key).test(path)) {
                    return iconMap[key];
                }
            }
            return iconMap.home;
        };
        return pageViews.map((pageView, idx) => {
            const icon = getIcon(pageView.path);
            const isCurrent = idx === 0;
            const isLast = idx === pageViews.length - 1;
            return <div key={idx} className={'row-journey'}>
                <div className={'icon-journey'}>
                    <img
                        loading={'lazy'}
                        src={icon}
                        alt={''}
                    />
                </div>
                <div className={'card-journey'}>
                    <div className={'card-journey-hd'}>
                        <div className={'journey-page-name'}>
                            {pageView.title}
                        </div>
                        <div className={'journey-status'}>
                            {isCurrent ? 'Current' : isLast ? 'Entry' : ''}
                        </div>
                    </div>
                    <div>{pageView.path}</div>
                    <CardjourneydurationItem timestamp={pageView.createdAt} />
                </div>
            </div>;
        });
    };

    const totalSessionTime = (pageViews = []) => {
        let totalTime = 0;
        pageViews.forEach((pageView, idx) => {
            if (idx === 0) return;
            let current = moment(pageView.createdAt);
            let last = moment(pageViews[idx - 1].createdAt);
            totalTime += last.diff(current, 'seconds');
        });
        return moment.duration(totalTime, 'seconds').humanize();
    };


    // ANIMATIONS
    const [lottieData0, setLottieData0] = useState(null);
    const [lottieData1, setLottieData1] = useState(null);
    const [lottieData2, setLottieData2] = useState(null);
    const [lottieData3, setLottieData3] = useState(null);
    const [lottieData4, setLottieData4] = useState(null);
    const [lottieData5, setLottieData5] = useState(null);
    const [lottieData6, setLottieData6] = useState(null);

    useEffect(() => {
        fetch("/documents/smarties-loading.json")
            .then(res => res.json())
            .then(data => setLottieData0(data))
            .catch(err => console.error('Failed to load /documents/smarties-loading.json:', err));

        fetch("/documents/smarties-loading.json")
            .then(res => res.json())
            .then(data => setLottieData1(data))
            .catch(err => console.error('Failed to load /documents/smarties-loading.json:', err));

        fetch("/documents/smarties-loading.json")
            .then(res => res.json())
            .then(data => setLottieData2(data))
            .catch(err => console.error('Failed to load /documents/smarties-loading.json:', err));

        fetch("https://cdn.prod.website-files.com/688b61f29ddc05275744387e/688b61f29ddc0527574438e6_smarties-loading-animation-3.json")
            .then(res => res.json())
            .then(data => setLottieData3(data))
            .catch(err => console.error('Failed to load https://cdn.prod.website-files.com/688b61f29ddc05275744387e/688b61f29ddc0527574438e6_smarties-loading-animation-3.json:', err));

        fetch("documents/smarties-loading.json")
            .then(res => res.json())
            .then(data => setLottieData4(data))
            .catch(err => console.error('Failed to load documents/smarties-loading.json:', err));

        fetch("/documents/smarties-loading-animation-3.json")
            .then(res => res.json())
            .then(data => setLottieData5(data))
            .catch(err => console.error('Failed to load /documents/smarties-loading-animation-3.json:', err));

        fetch("/documents/smarties-loading.json")
            .then(res => res.json())
            .then(data => setLottieData6(data))
            .catch(err => console.error('Failed to load /documents/smarties-loading.json:', err));
    }, []);

    const animationsEnhancements = {
        '.dataenrichment-loading': {
            children: <>{lottieData0 ? (
                <Lottie
                    animationData={lottieData0}
                    loop={false}
                    autoplay={false}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}</>,
            style: { display: lottieData0 ? "block" : "none" },
        },
        '.dataenrichment-loading': {
            children: <>{lottieData1 ? (
                <Lottie
                    animationData={lottieData1}
                    loop={false}
                    autoplay={false}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}</>,
            style: { display: lottieData1 ? "block" : "none" },
        },
        '.dataenrichment-loading': {
            children: <>{lottieData2 ? (
                <Lottie
                    animationData={lottieData2}
                    loop={false}
                    autoplay={false}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}</>,
            style: { display: lottieData2 ? "block" : "none" },
        },
        '.loading-lottie': {
            children: <>{lottieData3 ? (
                <Lottie
                    animationData={lottieData3}
                    loop={false}
                    autoplay={false}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}</>,
            style: { display: lottieData3 ? "block" : "none" },
        },
        '.dataenrichment-loading': {
            children: <>{lottieData4 ? (
                <Lottie
                    animationData={lottieData4}
                    loop={false}
                    autoplay={false}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}</>,
            style: { display: lottieData4 ? "block" : "none" },
        },
        '.button-label': {
            children: <>{lottieData5 ? (
                <Lottie
                    animationData={lottieData5}
                    loop={false}
                    autoplay={false}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}</>,
            style: { display: lottieData5 ? "block" : "none" },
        },
        '.dataenrichment-loading': {
            children: <>{lottieData6 ? (
                <Lottie
                    animationData={lottieData6}
                    loop={false}
                    autoplay={false}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}</>,
            style: { display: lottieData6 ? "block" : "none" },
        }
    };

    // SIDEBAR
    const sidebarEnhancements = {
        '[tmq="tmq-0071"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.home) } },
        '[tmq="tmq-0072"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.messaging) } },
        '[tmq="tmq-0073"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.dashboard) } },
        '[tmq="tmq-0074"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.contacts) } },
        '[tmq="tmq-0075"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buzzBuilderHub) } },
        '[tmq="tmq-0076"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.attractShoppers) } },
        '[tmq="tmq-0077"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.convertBuyers) } },
        '[tmq="tmq-0078"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buildLoyalty) } },
        '[tmq="tmq-0079"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.contentLibrary) } },
        '[tmq="tmq-0080"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.policies) } },
        '[tmq="tmq-0081"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.objectionFeed) } },
        '[tmq="tmq-0082"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.account) } },
        '[tmq="tmq-0083"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.billing) } },
        '[tmq="tmq-0084"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.assistant) } },
        '[tmq="tmq-0085"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.phoneNumbers) } },
        '[tmq="tmq-0086"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.tools) } },
        '[tmq="tmq-0087"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.files) } },
        '[tmq="tmq-0088"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.customerMemoryCenter) } },
        '[tmq="tmq-0089"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.knowledgeBase) } },
        '[tmq="tmq-0090"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.widgetConfiguration) } },
        '[tmq="tmq-0091"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.dataEnrichment) } },
        '[tmq="tmq-0092"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.admin) } },
        '[tmq="tmq-0093"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.webCrawl) } },
    };

    // MESSAGING HANDLING
    const messagingHandlingEnhancements = {
        '.button-assign': {
            children: <> <div className="fluentchat-28-regular"><img loading="lazy" src="/images/smarties-icon-assign.svg" alt /></div>
                <div className="button-label">Assign</div></>,
            style: { display: isCallInProgress ? 'none' : 'flex' }
        },
        // take over chat
        '[data-w-id="a6dc440d-420d-352d-d335-dbe1bda29f2e"]': {
            onClick: () => watcher.toggleSmartiesAssistant(),
            style: { display: isSmartiesAssistantToggled && !isCallInProgress ? 'flex' : 'none' }
        },
        '.messaging-handling-agent': {
            style: { display: !isSmartiesAssistantToggled ? 'flex' : 'none' }
        },
        '.messaging-handling-agent-bg': {
            style: { display: isSmartiesAssistantToggled ? 'block' : 'none' }
        },
        '.messaging-handling-aibot': {
            style: { display: isSmartiesAssistantToggled ? 'flex' : 'none' }
        },
        '.messaging-handling-aibot-bg': {
            style: { display: !isSmartiesAssistantToggled ? 'block' : 'none' }
        },
        '[data-w-id="466d0a60-7ecd-180d-fff7-c46b23c60015"]': {
            onClick: () => watcher.toggleSmartiesAssistant(),
            style: { display: !isSmartiesAssistantToggled ? 'flex' : 'none' },
        },
        // take over call
        '[data-w-id="40a4a7a3-cd6d-b64d-c5e8-2df6143245b8"]': {
            onClick: () => watcher.joinRoom(),
            style: { display: isCallInProgress ? 'flex' : 'none' }
        },
        '[data-w-id="40a4a7a3-cd6d-b64d-c5e8-2df6143245c2"]': {
            onClick: () => watcher.endCall(),
            style: { display: isCallInProgress ? 'flex' : 'none', pointerEvents: isTakenOverCall ? 'auto' : 'none', opacity: isTakenOverCall ? 1 : 0.5 }
        },
        '.messaging-main-conversation-div': {
            ref: conversationDivRef,
            children: <>
                <div className={'convo-divider'} style={{ pointerEvents: 'auto' }}>
                    <div className={'convo-divider-content'}>
                        <img src="/images/arrow-clockwise.svg" alt="" />
                        <a onClick={async () => {
                            // Save current scroll position before loading more
                            const scrollContainer = conversationDivRef.current;
                            const previousScrollHeight = scrollContainer.scrollHeight;
                            const previousScrollTop = scrollContainer.scrollTop;

                            // Fetch more messages
                            await watcher.fetchMessages(watcher.getValue(INTERACTION.CURRENT), { append: true });

                            // After messages load, restore scroll position
                            setTimeout(() => {
                                if (scrollContainer) {
                                    const newScrollHeight = scrollContainer.scrollHeight;
                                    const scrollDiff = newScrollHeight - previousScrollHeight;
                                    scrollContainer.scrollTop = previousScrollTop + scrollDiff;
                                }
                            }, 50);
                        }}>Load More</a>
                    </div>
                </div>
                <div className={'convo-divider'}>
                    <div className={'convo-divider-content'}>
                        <div>{'Conversation Started'}</div>
                    </div>
                </div>
                {messageList.length && messageList.map((data, index) => {
                    const previous = index > 0 ? messageList[index - 1] : null;
                    const currentMedium = (data && data.medium) ? data.medium : 'chat';
                    const previousMedium = (previous && previous.medium) ? previous.medium : null;
                    const shouldShowDivider = index === 0 || previousMedium !== currentMedium;
                    const isCallEnded = data.attributes.find(attribute => attribute.key === 'isCallEnded')?.value;
                    // Resolve recordingId: prefer inline attachment id, else look up from attachmentsList by interactionId
                    let recordingId = Array.isArray(data.attachments) && data.attachments.length > 0 ? data.attachments[0] : undefined;
                    if (!recordingId && Array.isArray(attachmentsList)) {
                        try {
                            const att = attachmentsList.find(a => (a.interactionId === data.id) || (a.interactionId === data._id));
                            if (att && att.recordingId) recordingId = att.recordingId;
                        } catch (e) { }
                    }
                    if (isCallEnded == 'true' || isCallEnded == true) return (
                        <div className={'call-convo-divider'} key={index}>
                            <div className={'convo-divider-line'}></div>
                            <ConvodividercontentItem
                                src={'images/smarties-avatar-icon-endcall.svg'}
                                divText={`Call Ended • ${moment(data.timestamp).format('h:mm A')}`}
                            />
                            <div className={'convo-divider-line'}></div>
                        </div>
                    );
                    const inboundContent = (
                        <div className="convo-inbound">
                            <div className="convo-inbound-avatar">
                                <img
                                    loading="lazy"
                                    src="/images/smarties-avatar-01_1smarties-avatar-01.png"
                                    alt=""
                                />
                                <div className="message-type-div">
                                    <div
                                        data-w-id="915b5944-3838-0891-c296-c45dd45ff477"
                                        className="message-type"
                                    >
                                        <img
                                            src={data.medium === 'chat' ? '/images/smarties-avatar-icon-chat.svg' : '/images/smarties-avatar-icon-call.svg'}
                                            loading="lazy"
                                            alt=""
                                        />
                                    </div>
                                    <div className="message-type-tooltip" style={{ display: "none" }}>
                                        <div>
                                            {data.medium === 'chat' ? 'Chat' : 'Call'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {currentMedium === "call" ? (<div className="convo-bubble-inbound">
                                <div className="call-transcript-div">
                                    <div className="call-transcript-icon">
                                        <img
                                            loading="lazy"
                                            src="https://cdn.prod.website-files.com/68a6ed699293ec31a61d4e9f/68a6fabdad109b0959a01c94_smarties-avatar-icon-calltranscript.svg"
                                            alt=""
                                        />
                                    </div>
                                    <div>Call Transcript</div>
                                </div>
                                <div>
                                    {data.message}
                                </div>
                                {(Array.isArray(data?.attributes || data?.attribute || data?.attaribute) && (data.attributes || data.attribute || data.attaribute).some(a => a?.key === 'isBot' && String(a?.value).toLowerCase() === 'true'))
                                    ? <BotSpeakControl text={data.message} watcher={watcher} />
                                    : <MessageAudioPlayer recordingId={recordingId} />}
                            </div>
                            ) : (<div className="convo-bubble-inbound">
                                <div>
                                    {data.message}
                                </div>
                            </div>)}

                            <ConvoinbounddurationItem
                                dataWId="d2601b0f-93ed-ec78-d431-297ce3d04872"
                                divText={moment(data.timestamp).format('h:mm A')}
                            />
                        </div>
                    );

                    const outboundContent = (
                        <div className="convo-outbound">
                            <ConvoinbounddurationItem
                                dataWId="40de4617-1996-b595-f7c8-2ed436404f34"
                                divText={moment(data.timestamp).format('h:mm A')}
                            />
                            {currentMedium === "call" ? (<div className="convo-bubble-outbound">
                                <div className="call-transcript-div">
                                    <div className="call-transcript-icon">
                                        <img
                                            loading="lazy"
                                            src="/images/smarties-avatar-icon-calltranscript.svg"
                                            alt=""
                                        />
                                    </div>
                                    <div>Call Transcript</div>
                                </div>
                                <div>
                                    {data.message}
                                </div>
                                {(Array.isArray(data?.attributes || data?.attribute || data?.attaribute) && (data.attributes || data.attribute || data.attaribute).some(a => a?.key === 'isBot' && String(a?.value).toLowerCase() === 'true'))
                                    ? <BotSpeakControl text={data.message} watcher={watcher} />
                                    : <MessageAudioPlayer recordingId={recordingId} />}
                            </div>) : (<div className="convo-bubble-outbound">
                                <div>
                                    {data.message}
                                </div>
                            </div>)}
                            <div className="convo-bot-avatar">
                                <img
                                    loading="lazy"
                                    src="/images/smarties-head.png"
                                    alt=""
                                />
                                <div className="message-type-div">
                                    <div className="message-type" >
                                        <img
                                            loading="lazy"
                                            src="/images/smarties-avatar-icon-call.svg"
                                            alt=""
                                        />
                                    </div>
                                    <div className="message-type-tooltip" style={{ display: "none" }}>
                                        <div>Call</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    );

                    return (
                        <React.Fragment key={data.id || data._id || data.timestamp || index}>
                            {shouldShowDivider && (
                                currentMedium === 'call' ? (
                                    <div className={'call-convo-divider'}>
                                        <div className={'convo-divider-line'}></div>
                                        <ConvodividercontentItem
                                            src={'images/smarties-avatar-icon-endcall.svg'}
                                            divText={`Call Started • ${moment(data.timestamp).format('h:mm A')}`}
                                        />
                                        <div className={'convo-divider-line'}></div>
                                    </div>
                                ) : (
                                    <ConvodividerItem
                                        src={'images/smarties-head.png'}
                                        divText={'SMARTIES is responding in real-time'}
                                    />
                                )
                            )}
                            {data.direction === 'inbound' ? inboundContent : outboundContent}
                        </React.Fragment>
                    );
                })}
            </>
        },
        '.message-search-input': {
            onChange: (e) => inboxWatcher.fetchInbox({ searchQuery: e.target.value })
        },
        '[data-w-id="22da1d15-a272-dba8-d763-7cbf1103c82f"]': {
            onClick: () => watcher.togglefilterMessagesPopup()
        },
        '[tmq="tmq-0004"]': {
            style: { display: isMessageFilterPopupOpen ? 'flex' : 'none' }
        },
        '[tmq="w-form-messages-filter"]': {
            children: <InboxFilter onApply={(values) => {
                setMessages([]);
                inboxWatcher.filter(values)
            }}
                onCancel={() => watcher.setValue(POPUP.MESSAGES_FILTER, false)}
            />
        },
        '.messaging-maincol': {
            style: { display: messageList.length ? 'block' : 'none' }
        },
        '.contact-name-div': {
            children: <>
                <div className={'contact-name'}>
                    <div
                        data-w-id={'cd26c9d9-c5dc-e7f8-c613-cd8a8266dd49'}
                        className={'card-inbox-name'}
                    >
                        <div className={'name-contact'}>
                            {currentInteraction?.consumer?.displayName || 'Customer Name'}
                        </div>
                    </div>
                    <div className={'tag-customer'}>{currentInteraction?.tag || 'prospect'}</div>
                </div>
                <div className={'contact-page-viewing'}>
                    <div className={'contact-page-viewing-content'}>
                        <div className={'status-online static'}></div>
                        <div>{'Online'}</div>
                        <div>{'• Viewing:'}</div>
                        <div>{'/pricing'}</div>
                    </div>
                </div>
            </>
        }
    };

    // INBOX ENHANCEMENTS
    const inboxEnhancements = {
        '[tmq="inbox-tabs"]': {
            children: <> <div className={'messaging-tabsmenu w-tab-menu'}>
                <a
                    data-w-tab={'Tab 1'}
                    className={
                        `messaging-tablink w-inline-block w-tab-link ${activeMessageTab == 'all' ? 'w--current' : ''}`
                    }
                    onClick={() => watcher.messagesTabChange()}
                >
                    <div>{'All '}</div>
                    <div className={'messaging-tablink-notify-count'}>{unreadCount}</div>
                </a>
                <MessagingtablinkItem_69d9c18b
                    dataWTab={'Tab 2'}
                    divText={'Active'}
                    isActive={activeMessageTab == 'active'}
                    onClick={() => watcher.messagesTabChange('active')}
                    count={0}
                />
                <MessagingtablinkItem_69d9c18b
                    dataWTab={'Tab 3'}
                    divText={'Pending'}
                    isActive={activeMessageTab == 'pending'}
                    onClick={() => watcher.messagesTabChange('pending')}
                    count={0}
                />
                <a
                    data-w-tab={'Tab 4'}
                    className={
                        `messaging-tablink close w-inline-block w-tab-link ${activeMessageTab == 'close' ? 'w--current' : ''}`
                    }
                    onClick={() => watcher.messagesTabChange('close')}
                >
                    <div className={'duration-div'}>
                        <div
                            data-w-id={'9dd2bd11-226a-c9e2-0477-fdc9ea93eeb5'}
                            className={'close-tab-icon'}
                        >
                            <img
                                src={'images/smarties-icon-checkmark.svg'}
                                loading={'lazy'}
                                alt={''}
                            />
                        </div>
                        <DurationtooltipItem divText={'Closed'} />
                    </div>
                </a>
            </div>
                <div className={'messaging-inbox-tabscontent w-tab-content'}>
                    <div
                        data-w-tab={'Tab 1'}
                        className={`w-tab-pane ${watcher.getValue(TAB.MESSAGES) == 'all' ? 'w--tab-active' : ''}`}
                    >
                        <div className={'messaging-tabpane-div'}>
                            <div className={'filter-row gap-10'}>
                                <FilterdropdownItem divText={'Assigned to Me'} />
                                <FilterdropdownItem divText={'Newest'} />
                            </div>
                            <div className={'inbox-list gap-5'}>
                                {inboxList.map((data, index) => {
                                    return (
                                        <a
                                            key={data._id}
                                            href={'#'}
                                            className={`messaging-inbox-item ${data._id == currentInteraction?._id && 'active'} w-inline-block`}
                                            onClick={() => watcher.fetchMessages(data)}
                                        >
                                            <div className={'messaging-inbox-item-left'}>
                                                <div className={'messaging-inbox-avatar-col'}>
                                                    <MessaginginboxavatarItem_9c103e5b
                                                        src={data.consumer.avatarUrl}
                                                        dataWId={'2ee757d2-bd3e-4a12-ca0b-9190293817ff'}
                                                        initialText={data.consumer.displayName[0] || 'Prospect'}
                                                    />
                                                    <div className="messaging-inbox-user-tag">PROSPECT</div>
                                                </div>
                                                <div className={'messaging-inbox-textcontent'}>
                                                    <div className={'messaging-inbox-textcontent-top'}>
                                                        <MessaginginboxnamerowItem_c231de57
                                                            divText={data.consumer.displayName || "N/A"}
                                                        />
                                                        <div className={'messaging-inbox-preview-div'}>
                                                            <div className={'messaging-inbox-icon-status'}>
                                                                <img
                                                                    loading={'lazy'}
                                                                    src={'images/smarties-inbox-icon-mic_1.svg'}
                                                                    alt={''}
                                                                />
                                                            </div>
                                                            <div className={'messaging-inbox-preview'}>
                                                                {truncateText(data.latestSnippet)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <MessaginginboxtextcontentbotItem_6121060c
                                                        divText={'Pricing inquiry'}
                                                        dataWId={'b4729139-7f78-8afa-aaa9-4ab7545ae1b0'}
                                                        divText1={moment(data.latestAt).format('hh:mm A')}
                                                    />
                                                </div>
                                            </div>
                                            <MessaginginboxitemrightItem_d2b9f097
                                                dataWId={'2ee757d2-bd3e-4a12-ca0b-91902938181b'}
                                                count={data.unreadForAssignee}
                                            />
                                        </a>
                                    );
                                })}
                                <button onClick={() => inboxWatcher.fetchInbox({ append: true })}>Load more</button>
                            </div>
                        </div>
                    </div>
                    <div data-w-tab={'Tab 2'} className={`w-tab-pane ${activeMessageTab == 'active' ? 'w--tab-active' : ''}`}></div>
                    <div data-w-tab={'Tab 3'} className={`w-tab-pane ${activeMessageTab == 'active' ? 'w--tab-active' : ''}`}></div>
                    <div data-w-tab={'Tab 4'} className={`w-tab-pane ${activeMessageTab == 'active' ? 'w--tab-active' : ''}`}></div>
                </div></>
        },
    };

    const enhancements = {
        ...animationsEnhancements,
        ...sidebarEnhancements,
        ...messagingHandlingEnhancements,
        ...inboxEnhancements,
    };

    return (
        <div>
            <Toaster closeButton />
            <DeepEnhancer component={Index} enhancements={enhancements} />
        </div >
    );
}