import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Index from '../../pages/settings/knowledge-base';
import Lottie from 'lottie-react';
import { PATHS } from '../../paths';
import { useWatcher } from '../../../api/client/Watcher2';
import KnowledgeBaseWatcher from '../../../api/client/watchers/KnowledgeBaseWatcher';
import { KNOWLEDGEBASE } from '../../../api/common/const';
import moment from 'moment/moment';
import Loader from '../../pages/custom/Loader';
import AssignFileToKnowledgeBase from '../../pages/custom/AssignFileToKnowledgeBase';

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

export default function SettingsKnowledgebaseCentralize() {
    // WATCHERS
    const navigate = useNavigate();

    const watcher = useRef(KnowledgeBaseWatcher).current;
    const listRef = useRef(null);
    const formRef = useRef(null);
    useWatcher(watcher);

    const [searchTerm, setSearchTerm] = useState('');
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const knowledgeBase = watcher.Data;
    const isLoading = watcher.getValue(KNOWLEDGEBASE.ISLOADING);
    const currentSelectedKb = watcher.getValue(KNOWLEDGEBASE.CURRENTSELECTED);
    const isCreateNewKnowledgeBaseOpen = watcher.getValue("createNewKnowledgeBase");
    const isKnowledgeBasePopupOpen = watcher.getValue(KNOWLEDGEBASE.IS_KNOWLEDGE_BASE_POPUP_OPEN);
    const handleScroll = async (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;

        // Trigger only when close to bottom and not already loading
        if (scrollHeight - scrollTop - clientHeight < 20 && !isLoading && !isFetchingMore) {
            setIsFetchingMore(true);
            try {
                await watcher.fetchKnowledgeBase({ append: true });
            } finally {
                setIsFetchingMore(false);
            }
        }
    };

    const handleUploadSubmit = (formRef) => {
        const selectedFiles = [];
        // Use the FormData API to read checkbox values
        const formData = new FormData(formRef.current);
        for (const [key, value] of formData.entries()) {
            if (value === 'on') {
                selectedFiles.push(key); // key is the file name
            }
        }
        switch (formRef.current.name) {
            case 'file-form':
                watcher.uploadKnowledgeBase(selectedFiles, [], "file");
                break;
            case 'url-form':
                watcher.uploadKnowledgeBase([], selectedFiles, "url");
                break;
        }
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
        '[tmq="tmq-0011"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.home) } },
        '[tmq="tmq-0012"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.messaging) } },
        '[tmq="tmq-0013"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.dashboard) } },
        '[tmq="tmq-0014"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.contacts) } },
        '[tmq="tmq-0015"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buzzBuilderHub) } },
        '[tmq="tmq-0016"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.attractShoppers) } },
        '[tmq="tmq-0017"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.convertBuyers) } },
        '[tmq="tmq-0018"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buildLoyalty) } },
        '[tmq="tmq-0019"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.contentLibrary) } },
        '[tmq="tmq-0020"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.policies) } },
        '[tmq="tmq-0021"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.objectionFeed) } },
        '[tmq="tmq-0022"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.account) } },
        '[tmq="tmq-0023"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.billing) } },
        '[tmq="tmq-0024"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.assistant) } },
        '[tmq="tmq-0025"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.phoneNumbers) } },
        '[tmq="tmq-0026"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.tools) } },
        '[tmq="tmq-0027"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.files) } },
        '[tmq="tmq-0028"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.customerMemoryCenter) } },
        '[tmq="tmq-0029"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.knowledgeBase) } },
        '[tmq="tmq-0030"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.widgetConfiguration) } },
        '[tmq="tmq-0031"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.dataEnrichment) } },
        '[tmq="tmq-0032"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.admin) } },
        '[tmq="tmq-0033"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.webCrawl) } },
    };

    const kbManagementEnhancements = {
        '[tmq="kb-list-content"]': {
            ref: listRef,
            style: {
                height: '400px',
                overflowY: 'auto',
                padding: '10px',
                scrollBehavior: 'smooth'
            },
            onScroll: handleScroll,
            children: isLoading ? <Loader /> :
                knowledgeBase.length ? knowledgeBase.map((file, index) => (
                    <div data-w-id="61790036-d452-9f0a-b33d-0b85e1b47285" className="table-row" key={index}>
                        <div className="table-cell-div stretch">
                            <div className="table-doctitle">
                                <div className="table-fileicon"><img src="../images/smarties-file-dark.svg" loading="lazy" alt /></div>
                                <div className="table-doctitle-text">{file.collectionname}</div>
                            </div>
                        </div>
                        <div className="table-cell-div stretch">
                            <div className="settings-sublabel">{file.collectionid}</div>
                        </div>
                        <div className="table-cell-div stretch">
                            <div className="settings-sublabel">{moment(parseInt(file.createdat)).format('MM/DD/YYYY') || "May 6, 2025"}</div>
                        </div>
                        <div className="table-cell-div _w-5">
                            <div className="table-menu"><img width={15} height={15} alt src="https://cdn.prod.website-files.com/681bd50cca2b1f41b87287dc/681cae0a45e15d21303356de_smarties-icon-menu.svg" loading="lazy" className="image-100" /></div>
                        </div>
                    </div>
                )) : "No Knowledge Base Found"
        },
        '[data-w-id="05baf8d8-9541-fe79-48a2-6cb3c1831b04"]': {
            onClick: () => watcher.setValue("createNewKnowledgeBase", true)
        },
        '[tmq="tmq-0044"]': {
            style: { display: isCreateNewKnowledgeBaseOpen ? 'flex' : 'none' }
        },
        '#wf-form-knowledge-base-form': {
            ref: formRef
        },
        '[tmq="tmq-0041"]': {
            onClick: () => {
                watcher.setValue("createNewKnowledgeBase", false);
                formRef.current.reset();
            }
        },
        '[tmq="tmq-0047"]': {
            onClick: (e) => {
                e.preventDefault();
                watcher.setValue("createNewKnowledgeBase", false);
                watcher.handlesubmitNewKnowledgeBase(formRef.current);
                formRef.current.reset();
            }
        },
        '[data-w-id="68c9648d-cea9-ff78-b2cb-57329e0c0bc9"]': {
            onClick: () => watcher.setValue(KNOWLEDGEBASE.IS_KNOWLEDGE_BASE_POPUP_OPEN, true)
        },
        '[tmq="tmq-0003"]': {
            style: { display: "none" }
        },
        '.property-icon': {
            style: { display: "none" }
        },
    }


    const enhancements = {
        ...animationsEnhancements,
        ...sidebarEnhancements,
        ...kbManagementEnhancements
    };

    return (
        <div>
            <Toaster closeButton />
            <DeepEnhancer component={Index} enhancements={enhancements} />
            <AssignFileToKnowledgeBase
                isOpen={isKnowledgeBasePopupOpen}
                onClose={() => watcher.setValue(KNOWLEDGEBASE.IS_KNOWLEDGE_BASE_POPUP_OPEN, false)}
                currentSelected={currentSelectedKb}
                onSubmit={handleUploadSubmit}
            />
        </div >
    );
}