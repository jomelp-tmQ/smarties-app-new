import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import Index from '../../pages/settings/assistant';
import Lottie from 'lottie-react';
import { PATHS } from '../../paths';
import { useWatcher } from '../../../api/client/Watcher2';
import ToolsWatcher from '../../../api/client/watchers/vapi/ToolsWatcher';
import { ASSISTANT_VOICE_PROVIDER, MODEL_PROVIDER, OPENAI_MODELS, MODEL_KEYS, VOICE_KEYS, ASSISTANT } from '../../../api/common/assistantConst';
import AssistantWatcher from '../../../api/client/watchers/vapi/AssistantWatcher';
import KnowledgeBaseWatcher from '../../../api/client/watchers/KnowledgeBaseWatcher';
import Loader from '../../pages/custom/Loader';
import ListitemassistantItem from '../../pages/custom/ListitemassistantItem';
import MenuitemItem from '../../pages/custom/MenuitemItem';
import AssistanthdItem from '../../pages/custom/AssistanthdItem';
import CardassistanthdItem from '../../pages/custom/CardassistanthdItem';
import FormcelldivItem from '../../pages/custom/FormcelldivItem';
import Formrow2Item_b59a88f2 from '../../pages/custom/Formrow2Item_b59a88f2';
import Formrow2Item_1a366a6f from '../../pages/custom/Formrow2Item_1a366a6f';
import Formrow2Itemkb from '../../pages/custom/Formrow2Itemkb';
import FormcolItem_bff91a87 from '../../pages/custom/FormcolItem_bff91a87';
import MultiSelectDropdown from '../../pages/custom/MultiSelectDropdown';
import Chat from '../../pages/custom/Chat';

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

export default function SettingsAssistantCentralize() {
    // WATCHERS
    const navigate = useNavigate();

    const watcher = useRef(AssistantWatcher).current;
    const kbWatcher = useRef(KnowledgeBaseWatcher).current;
    const [kbList, setKbList] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [selectedKb, setSelectedKb] = useState(null);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const location = useLocation();

    useWatcher(watcher);
    useWatcher(kbWatcher);

    const chatRef = useRef(null);
    const [newMessage, setNewMessage] = useState("");
    const [formData, setFormData] = useState({
        name: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    useEffect(() => {
        if (location.state?.openModal) {
            watcher.setValue(ASSISTANT.IS_ASSISTANT_POPUP_OPEN, true);
        }
    }, [location.state]);

    const isAssistantSectionOpen = watcher.getValue("isAssistantSectionOpen");
    // const selectedAssistant = watcher.getValue(ASSISTANT.SELECTED_ASSISTANT);
    const selectedAssistantDB = watcher.getValue("dbAssistant");

    const isLoading = watcher.getValue("isLoadingAssistants");
    const assistants = watcher.Assistants;
    const isCallActive = watcher.getValue('callActive');
    const isLoadingCall = watcher.getValue('isCallLoading');
    const voiceList = watcher.Voices;
    const selectedAssistant = watcher.getSelectedAssistant();
    const knowledgeBaseList = kbWatcher.Data;
    const isAssistantPopupOpen = watcher.getValue(ASSISTANT.IS_ASSISTANT_POPUP_OPEN);
    const isChatOpen = watcher.getValue('isChatOpen');
    const chats = watcher.getValue("chats") || [];

    useEffect(() => {
        watcher.setValue("isLoadingAssistants", true);
        watcher.listen();
        watcher.fetchAllAssistants();
        watcher.fetchVoices();
        fetchAllTools();
        fetchKbList();
        return () => {
            watcher.clear();
            watcher.removeListener();
            watcher.endCall();
        };
    }, []);


    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // If we're near the bottom (within 20px) and not currently loading
        if (scrollHeight - scrollTop - clientHeight < 20 && !isLoading) {
            watcher.fetchAllAssistants({ isLoadmore: true });
        }
    };

    const fetchKbList = async () => {
        await kbWatcher.fetchKnowledgeBase();
        const res = kbWatcher.Data;
        setKbList(res);
    };

    const fetchVoice = async () => {
        if (voiceList && voiceList.length > 0) {
            const matchingVoice = voiceList.find(voice => voice.voiceid === selectedAssistantDB.voice);
            if (matchingVoice) {
                setSelectedVoice(matchingVoice.voiceid);
                watcher.setValue("assistantVoice", matchingVoice);
            } else {
                setSelectedVoice(voiceList[0].voiceid);
                watcher.setValue("assistantVoice", voiceList[0]);
            }
        }
    };

    const fetchAllTools = async () => {
        setIsLoadingTools(true);
        await toolsWatcher.fetchAllTools();
        setIsLoadingTools(false);
    };

    const handleKbChange = (e) => {
        setSelectedKb(e.target.value);
        watcher.setAssistantConfig(ASSISTANT.KNOWLEDGE_BASE, e.target.value);
    };

    const handleVoiceChange = (e) => {
        setSelectedVoice(e.target.value);
        const matchingVoice = voiceList.find(voice => voice.voiceid === e.target.value);
        watcher.setValue("assistantVoice", matchingVoice);
        watcher.setAssistantConfig(ASSISTANT.VOICE_CONFIGURATION, VOICE_KEYS.VOICE_ID, matchingVoice.voiceid);
    };

    //---------------Tools-------------------//

    const toolsWatcher = useRef(ToolsWatcher).current;
    const [selectedTools, setSelectedTools] = useState([]);
    const [isLoadingTools, setIsLoadingTools] = useState(false);
    useWatcher(toolsWatcher);
    const tools = toolsWatcher.Tools;

    const assistantTools = watcher.getValue("selectedTools") || [];

    // Update selected tools when selectedAssistant changes
    useEffect(() => {
        if (selectedAssistantDB && selectedAssistantDB.toolidsList) {
            setSelectedTools(selectedAssistantDB.toolidsList);
            const selectedToolObjects = tools.filter(tool => selectedAssistantDB.toolidsList.includes(tool.id));
            watcher.setValue("selectedTools", selectedToolObjects);
        }
    }, [isLoadingTools]);

    const handleToolChange = (event) => {
        const selectedIds = Array.from(event.target.selectedOptions, option => option.value);
        setSelectedTools(selectedIds);
        const selectedToolObjects = tools.filter(tool => selectedIds.includes(tool.id));
        watcher.setAssistantConfig(ASSISTANT.TOOLS, selectedToolObjects);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        await watcher.createAssistant(formData);
        watcher.setValue(ASSISTANT.IS_ASSISTANT_POPUP_OPEN, false);
    };

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chats]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };
    const handleSendMessage = () => {
        watcher.handleSendChat(newMessage);
        setNewMessage(""); // Clear the input field after sending
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
        '[tmq="tmq-0035"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.home) } },
        '[tmq="tmq-0036"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.messaging) } },
        '[tmq="tmq-0037"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.dashboard) } },
        '[tmq="tmq-0038"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.contacts) } },
        '[tmq="tmq-0039"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buzzBuilderHub) } },
        '[tmq="tmq-0040"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.attractShoppers) } },
        '[tmq="tmq-0041"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.convertBuyers) } },
        '[tmq="tmq-0042"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buildLoyalty) } },
        '[tmq="tmq-0043"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.contentLibrary) } },
        '[tmq="tmq-0044"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.policies) } },
        '[tmq="tmq-0045"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.objectionFeed) } },
        '[tmq="tmq-0046"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.account) } },
        '[tmq="tmq-0047"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.billing) } },
        '[tmq="tmq-0048"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.assistant) } },
        '[tmq="tmq-0049"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.phoneNumbers) } },
        '[tmq="tmq-0050"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.tools) } },
        '[tmq="tmq-0051"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.files) } },
        '[tmq="tmq-0052"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.customerMemoryCenter) } },
        '[tmq="tmq-0053"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.knowledgeBase) } },
        '[tmq="tmq-0054"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.widgetConfiguration) } },
        '[tmq="tmq-0055"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.dataEnrichment) } },
        '[tmq="tmq-0056"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.admin) } },
        '[tmq="tmq-0057"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.webCrawl) } },
    };

    // ASSISTANT SIDEBAR
    const assistantSidebarEnhancements = {
        '[data-w-id="afafd7a2-890e-f397-22fe-a3f2fc28385d"]': {
            href: "",
            onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                watcher.setValue(ASSISTANT.IS_ASSISTANT_POPUP_OPEN, true)
            }
        },
        '[tmq="tmq-0060"]': {
            style: { display: isAssistantPopupOpen ? "flex" : "none" },
            children: watcher.getValue("isLoadingCreate") ? <Loader /> : <div className={'popup-card _w-50'}>
                <div className={'card-settings-hd-div'}>
                    <div className={'card-settings-hd'}>{'Create Assistant'}</div>
                </div>
                <div className={'w-form'}>
                    <form
                        id={'email-form'}
                        name={'email-form'}
                        data-name={'Email Form'}
                        method={'get'}
                        data-wf-page-id={'688b61ee631f6165f14725b5'}
                        data-wf-element-id={'dd817661-5700-ca78-940f-32045820c7b8'}
                        onSubmit={handleSubmit}
                    >
                        <div className={'form-body'}>
                            <div className={'form-row'}>
                                <input
                                    className={'inbox-search w-input'}
                                    maxlength={'256'}
                                    name={'name'}
                                    data-name={'Field 3'}
                                    placeholder={'Create a name for your assistant'}
                                    type={'text'}
                                    id={'name'}
                                    required
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className={'notice-div'}>
                                <div className={'notice-icon'}>
                                    <img
                                        src={'../images/smarties-alert-circle.svg'}
                                        loading={'lazy'}
                                        alt={''}
                                    />
                                </div>
                                <div className={'notice-text'}>
                                    {
                                        'You can create multiple assistants, each with its own unique configuration and capabilities.'
                                    }
                                </div>
                            </div>
                            <div className={'form-btn-container mb-20'}>
                                <a href={'#'} className={'btn-style1 outline'} onClick={() => watcher.setValue(ASSISTANT.IS_ASSISTANT_POPUP_OPEN, false)}>
                                    <div>{'Cancel'}</div>
                                </a>
                                <button href={'#'} className={'btn-style1'} type='submit'>
                                    <div>{'Create'}</div>
                                </button>
                            </div>
                            <div className={'notice-div bg-blue'}>
                                <div className={'notice-icon'}>
                                    <img
                                        src={'../images/smarties-alert-circle-blue.svg'}
                                        loading={'lazy'}
                                        alt={''}
                                    />
                                </div>
                                <div className={'notice-text'}>
                                    {
                                        'After creating your assistant, you can configure its model, voice, tools, and other settings in the assistant configuration panel.'
                                    }
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div
                    data-w-id={'dd817661-5700-ca78-940f-32045820c7d3'}
                    className={'popup-close'}
                    onClick={() => watcher.setValue(ASSISTANT.IS_ASSISTANT_POPUP_OPEN, false)}
                >
                    <img src={'../images/smarties-x.svg'} loading={'lazy'} alt={''} />
                </div>
            </div>
        },
        '.email-form': {
            onSubmit: handleSubmit,
            children: <div className={'form-body'}>
                <div className={'form-row'}>
                    <input
                        className={'inbox-search w-input'}
                        maxlength={'256'}
                        name={'name'}
                        data-name={'Field 3'}
                        placeholder={'Create a name for your assistant'}
                        type={'text'}
                        id={'name'}
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                    />
                </div>
                <div className={'notice-div'}>
                    <div className={'notice-icon'}>
                        <img
                            src={'../images/smarties-alert-circle.svg'}
                            loading={'lazy'}
                            alt={''}
                        />
                    </div>
                    <div className={'notice-text'}>
                        {
                            'You can create multiple assistants, each with its own unique configuration and capabilities.'
                        }
                    </div>
                </div>
                <div className={'form-btn-container mb-20'}>
                    <a href={'#'} className={'btn-style1 outline'} onClick={() => watcher.setValue(ASSISTANT.IS_ASSISTANT_POPUP_OPEN, false)}>
                        <div>{'Cancel'}</div>
                    </a>
                    <button href={'#'} className={'btn-style1'} type='submit'>
                        <div>{'Create'}</div>
                    </button>
                </div>
                <div className={'notice-div bg-blue'}>
                    <div className={'notice-icon'}>
                        <img
                            src={'../images/smarties-alert-circle-blue.svg'}
                            loading={'lazy'}
                            alt={''}
                        />
                    </div>
                    <div className={'notice-text'}>
                        {
                            'After creating your assistant, you can configure its model, voice, tools, and other settings in the assistant configuration panel.'
                        }
                    </div>
                </div>
            </div>
        },
        '.list-assistant': {
            style: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '10px', scrollBehavior: 'smooth' },
            onScroll: handleScroll,
            children: isLoading ? <Loader /> : (
                assistants.length ? assistants.map((assistant) => (
                    <ListitemassistantItem key={assistant.id} assistant={assistant} onClick={() => {
                        setChatOpen(false);
                        watcher.ChatBot.reset();
                    }} />
                )) : "No assistants found"
            )
        }
    };

    useEffect(() => {
        console.log('chatOpen', chatOpen);
    }, [chatOpen]);
    // ASSISTANT MAIN PANEL
    const assistantMainPanelEnhancements = {
        '.assistant-content': {
            style: { display: selectedAssistant ? "flex" : "none" },
            children: selectedAssistant ? <>
                <div className={'assistant-controls'}>
                    <div className={'assistant-name-details'}>
                        <div className={'text-assistant-name'}>{selectedAssistant.name}</div>
                        <div className={'text-assistant-details'}>
                            {selectedAssistant.assistantid}
                        </div>
                    </div>
                    <div className={'assistant-buttons-div'}>
                        <div className={'button-edit'}>
                            <img
                                width={'15'}
                                height={'15'}
                                alt={''}
                                src={
                                    '/images/smarties-icon-pencil.svg'
                                }
                                loading={'lazy'}
                                className={'smarties-icon-pencil'}
                            />
                        </div>
                        <div className={'button-chat'} onClick={() => {
                            setChatOpen(!chatOpen);
                            watcher.initialChat();
                        }}>
                            <div className={'button-label'}>{'Chat'}</div>
                            <img
                                width={'15'}
                                height={'15'}
                                alt={''}
                                src={
                                    '/images/smarties-icon-chat.svg'
                                }
                                loading={'lazy'}
                                className={'smarties-icon-chat'}
                            />
                        </div>
                        <div className={'button-call-contain'}>
                            <div
                                data-w-id={'379fe386-af88-ed7e-3780-62a6bbc10947'}
                                className={'button-talk-to-assistant'}
                                style={{ backgroundColor: isCallActive ? "#e14617" : "", opacity: isLoadingCall ? 0.5 : 1, pointerEvents: isLoadingCall ? 'none' : 'auto' }}
                                onClick={() => isCallActive ? watcher.endCall() : watcher.talkToAssistant()}
                            >
                                {isLoading ? <Loader text='Connecting...' size={12} /> :
                                    <>
                                        <div className={'button-label-orange'} style={{ color: isCallActive ? '#fff' : '' }}>
                                            {isCallActive ? "End Call" : isLoadingCall ? "Connecting..." : "Talk to Assistant"}
                                        </div>
                                        <div className={'fluentchat-28-re gular'} style={{ display: isCallActive ? 'none' : '' }}>
                                            <img
                                                width={'15'}
                                                height={'15'}
                                                alt={''}
                                                src={
                                                    '/images/smarties-icon-call.svg'
                                                }
                                                loading={'lazy'}
                                                className={'smarties-icon-call'}
                                            />
                                        </div>
                                    </>}
                            </div>
                            <div className={'button-loading'}>
                                <div className={'button-label'}>{'Connecting'}</div>
                                <div
                                    className={'lottie-animation'}
                                    data-w-id={'dc3a33ce-7c91-d3be-d5a5-3d70277e78c7'}
                                    data-animation-type={'lottie'}
                                    data-src={
                                        '../documents/smarties-loading-animation-3.json'
                                    }
                                    data-loop={'1'}
                                    data-direction={'1'}
                                    data-autoplay={'1'}
                                    data-is-ix2-target={'0'}
                                    data-renderer={'svg'}
                                    data-default-duration={'0'}
                                    data-duration={'1.7666666666666666'}
                                ></div>
                            </div>
                            <div
                                data-w-id={'592e4b93-831d-c748-76be-b78928ce6855'}
                                className={'button-end-call'}
                            >
                                <div className={'button-label-orange-copy'}>
                                    {'End Call'}
                                </div>
                                <div className={'fluentchat-28-regular'}>
                                    <img
                                        width={'15'}
                                        height={'15'}
                                        alt={''}
                                        src={'../images/smarties-endcall.svg'}
                                        loading={'lazy'}
                                        className={'smarties-icon-call'}
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <div
                                data-delay={'0'}
                                data-hover={'false'}
                                className={'dropdown-publish w-dropdown'}
                            >
                                <div
                                    className={'dropdown-publish-toggle w-dropdown-toggle'}
                                    onClick={() => watcher.publishAssistant()} style={{ opacity: watcher.getValue("LoadingPublishAssistant") || isCallActive ? 0.5 : 1, pointerEvents: watcher.getValue("LoadingPublishAssistant") || isCallActive ? 'none' : 'auto' }}
                                >
                                    <div className={'icon-3 w-icon-dropdown-toggle'}></div>
                                    <div>Publish{watcher.getValue("LoadingPublishAssistant") && 'ing...'}</div>
                                </div>
                            </div>
                        </div>
                        <div className={'assistant-menu'}>
                            <div className={'menu-dropdown'}>
                                <MenuitemItem
                                    src={'../images/smarties-icon-version.svg'}
                                    divText={'Version History'}
                                />
                                <MenuitemItem
                                    src={'../images/smarties-icon-document.svg'}
                                    divText={'Call Logs'}
                                />
                                <MenuitemItem
                                    src={'../images/smarties-icon-duplicate.svg'}
                                    divText={'Duplicate'}
                                />
                                <MenuitemItem
                                    src={'../images/smarties-icon-delete_outline.svg'}
                                    divText={'Delete'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div id={'scroll-container'} className={'assistant-main-content'}>
                    <div className={'w-form'}>
                        <form
                            id={'wf-form-Assistant-Settings-Form'}
                            name={'wf-form-Assistant-Settings-Form'}
                            data-name={'Assistant Settings Form'}
                            method={'get'}
                            data-wf-page-id={'688b61ee631f6165f14725b5'}
                            data-wf-element-id={'379fe386-af88-ed7e-3780-62a6bbc10981'}
                        >
                            {
                                <section
                                    id={'section-model'}
                                    className={'assistant-section'}
                                >
                                    <AssistanthdItem
                                        src={
                                            '/images/smarties-icon-model.svg'
                                        }
                                        title={'Model'}
                                        width={'24'}
                                        height={'24'}
                                    />
                                    <div className={'assistant-cards-container'}>
                                        <div className={'card-assistant'}>
                                            <CardassistanthdItem
                                                dataWId={'379fe386-af88-ed7e-3780-62a6bbc10999'}
                                                divText={'Model'}
                                                description={
                                                    'Configure the behavior of the assistant.'
                                                }
                                            />
                                            <div className={'card-assistant-content'}>
                                                <div className={'card-content-model'}>
                                                    <div className={'col-assistant-model'}>
                                                        <div className={'form-row-2'}>
                                                            <FormcelldivItem
                                                                label={'Assistant Name'}
                                                                name={'Assistant-Name'}
                                                                dataName={'Assistant Name'}
                                                                placeholder={'Leo'}
                                                                id={'Assistant-Name'}
                                                                value={selectedAssistant.name} onChange={(e) => watcher.setAssistantConfig(ASSISTANT.NAME, e.target.value)}
                                                            />
                                                        </div>
                                                        <div className={'form-row-2'}>
                                                            <div className={'form--cell-div'}>
                                                                <label
                                                                    htmlFor={''}
                                                                    className={'form-label-2'}
                                                                >
                                                                    {'First Message'}
                                                                </label>
                                                                <div className={'first-message-textarea'}>
                                                                    <div className={'form-textararea-div'}>
                                                                        <textarea
                                                                            id={'First-Message'}
                                                                            name={'First-Message'}
                                                                            maxlength={'5000'}
                                                                            data-name={'First Message'}
                                                                            placeholder={
                                                                                "Hi there! I'm Leo, your go-to for any SmartHome Innovations queries. How can I assist you today?"
                                                                            }
                                                                            className={
                                                                                'form-input-textarea w-input'
                                                                            }
                                                                            value={selectedAssistant[ASSISTANT.FIRST_MESSAGE]}
                                                                            onChange={(e) => watcher.setAssistantConfig(ASSISTANT.FIRST_MESSAGE, e.target.value)}
                                                                        ></textarea>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Formrow2Item_b59a88f2
                                                            id={'System-Prompt'}
                                                            name={'System-Prompt'}
                                                            dataName={'System Prompt'}
                                                            value={selectedAssistant[ASSISTANT.SYSTEM_PROMPT]}
                                                            onChange={(e) => watcher.setAssistantConfig(ASSISTANT.SYSTEM_PROMPT, e.target.value)}
                                                        />
                                                    </div>
                                                    <div className={'model-settings'}>
                                                        <div className={'form-hd-small'}>
                                                            {'Model Settings'}
                                                        </div>
                                                        <div className={'model-settings-container'}>
                                                            <Formrow2Item_1a366a6f
                                                                label={'Provider'}
                                                                id={'Provider'}
                                                                name={'Provider'}
                                                                dataName={'Provider'}
                                                                optionText={'openai'}
                                                                optionText1={'Select one...'}
                                                                options={MODEL_PROVIDER}
                                                                value={selectedAssistant[ASSISTANT.MODEL][MODEL_KEYS.PROVIDER]}
                                                                onChange={(e) => watcher.setAssistantConfig(ASSISTANT.MODEL, "provider", e.target.value)}
                                                            />
                                                            <Formrow2Item_1a366a6f
                                                                label={'Model'}
                                                                id={'Model'}
                                                                name={'Model'}
                                                                dataName={'Model'}
                                                                optionText={'gpt-3.5-turbo'}
                                                                optionText1={'Select one...'}
                                                                options={OPENAI_MODELS}
                                                                value={selectedAssistant[ASSISTANT.MODEL][MODEL_KEYS.MODEL]}
                                                                onChange={(e) => watcher.setAssistantConfig(ASSISTANT.MODEL, "model", e.target.value)}
                                                            />
                                                            <Formrow2Itemkb
                                                                textLabel="Knowledge Base"
                                                                id="Files"
                                                                name="Files"
                                                                dataName="Files"
                                                                textOption="First choice"
                                                                textOption1="Select Files"
                                                                options={knowledgeBaseList}
                                                                value={typeof selectedAssistant[ASSISTANT.KNOWLEDGE_BASE] == "object"
                                                                    ? selectedAssistant[ASSISTANT.KNOWLEDGE_BASE].id : typeof selectedAssistant[ASSISTANT.KNOWLEDGE_BASE] == "string"
                                                                        ? selectedAssistant[ASSISTANT.KNOWLEDGE_BASE] : ""}
                                                                onChange={handleKbChange} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            }
                            <section
                                id={'section-voice'}
                                className={'assistant-section'}
                            >
                                <AssistanthdItem
                                    src={
                                        '/images/smarties-icon-voice.svg'
                                    }
                                    title={'Voice'}
                                    width={'24'}
                                    height={'24'}
                                />
                                <div className={'assistant-cards-container'}>
                                    <div className={'card-assistant'}>
                                        <CardassistanthdItem
                                            dataWId={'379fe386-af88-ed7e-3780-62a6bbc10a13'}
                                            divText={'Voice Configuration'}
                                            description={
                                                "Select a voice from the list, or sync your voice library if it's missing. If errors persist, enable custom voice and add a voice ID."
                                            }
                                        />
                                        <div className={'card-assistant-content'}>
                                            <div className={'card-content'}>
                                                <div className={'col-assistant-model'}>
                                                    <div className={'form-row-2 flex'}>
                                                        <FormcolItem_bff91a87
                                                            label={'Provider'}
                                                            id={'Voice-Provider'}
                                                            name={'Voice-Provider'}
                                                            dataName={'Voice Provider'}
                                                            optionText={'Select one...'}
                                                            options={ASSISTANT_VOICE_PROVIDER}
                                                            value={selectedAssistant[ASSISTANT.VOICE_CONFIGURATION][VOICE_KEYS.PROVIDER]}
                                                            onChange={(e) => watcher.setAssistantConfig(ASSISTANT.VOICE_CONFIGURATION, "provider", e.target.value)}
                                                        />
                                                        <FormcolItem_bff91a87
                                                            label={'Voice'}
                                                            id={'Voice-Voice'}
                                                            name={'Voice-Voice'}
                                                            dataName={'Voice Voice'}
                                                            optionText={'Select one...'}
                                                            options={voiceList.map((v) => ({
                                                                label: v.name,
                                                                value: v.voiceid || v.name
                                                            }))}
                                                            value={selectedAssistant[ASSISTANT.VOICE_CONFIGURATION][VOICE_KEYS.VOICE_ID]}
                                                            onChange={(e) => watcher.setAssistantConfig(ASSISTANT.VOICE_CONFIGURATION, VOICE_KEYS.VOICE_ID, e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </section>
                            {assistantTools &&
                                <section
                                    id={'section-tools'}
                                    className={'assistant-section'}
                                >
                                    <AssistanthdItem
                                        src={
                                            '/images/smarties-icon-tools.svg'
                                        }
                                        title={'Tools'}
                                        width={'24'}
                                        height={'24'}
                                    />
                                    <div className={'assistant-cards-container'}>
                                        <div className={'card-assistant'}>
                                            <CardassistanthdItem
                                                dataWId={'379fe386-af88-ed7e-3780-62a6bbc10ae5'}
                                                divText={'Tools'}
                                                description={
                                                    'Tools enable voicebots to perform actions during calls. Add tools from the'
                                                }
                                            />
                                            <div className={'card-assistant-content'}>
                                                <div className={'card-content'}>
                                                    <div className={'col-assistant-model'}>
                                                        <div className={'form-row-2'}>
                                                            <div style={{ width: '100%' }}>
                                                                <MultiSelectDropdown
                                                                    id="Analysis-Structured-Data-Type-2"
                                                                    name="Analysis-Structured-Data-Type-2"
                                                                    options={tools}
                                                                    selectedValues={selectedTools}
                                                                    onChange={handleToolChange}
                                                                    placeholder="Select tools"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            }
                        </form>
                    </div>
                </div>
            </> : (isAssistantSectionOpen == undefined ? <Loader /> : "")
        },
        '[data-w-id="5e893b25-49be-ebb6-93d8-223b702d8b87"]': {
            style: { display: "none" },
        },
        '.chat-main': {
            style: { display: chatOpen ? "block" : "none" },
            children: <Chat onClose={() => setChatOpen(false)} />
        }
    };

    const enhancements = {
        ...animationsEnhancements,
        ...sidebarEnhancements,
        ...assistantSidebarEnhancements,
        ...assistantMainPanelEnhancements
    };

    return (
        <div>
            <Toaster closeButton />
            <DeepEnhancer component={Index} enhancements={enhancements} />
        </div >
    );
}