import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Index from '../../pages/web-crawl';
import Lottie from 'lottie-react';
import { PATHS } from '../../paths';
import { useWatcher } from '../../../api/client/Watcher2';
import CrawlWatcher, { CRAWL_FORM, CRAWL_STATE } from '../../../api/client/watchers/CrawlWatcher';
import UrlitemItem from '../../pages/custom/UrlitemItem';
import moment from 'moment/moment';

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

export default function SettingsWebcrawlCentralize() {
    // WATCHERS
    const navigate = useNavigate();

    const watcher = useRef(CrawlWatcher).current;
    useWatcher(watcher);

    useEffect(() => {
        watcher.fetchCrawlRequests();
        watcher.setValue(CRAWL_FORM.UPDATe_INTERVAL, 'weekly');
    }, []);

    const urlList = watcher.Url;
    const pages = watcher.Pages;
    const loadingPage = watcher.getValue(CRAWL_STATE.LOADING);
    const currentSelected = watcher.getValue(CRAWL_STATE.SELECTED_CRAWL) || "";
    const selectedUrl = urlList.find(u => u.id === watcher.getValue(CRAWL_STATE.SELECTED_CRAWL));
    const urlStatus = selectedUrl?.status ? selectedUrl?.status : "PENDING";

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

    const webcrawlEnhancements = {
        '[data-w-id="1687704e-e675-467d-e072-c3d6b28a9605"]': {
            onClick: (e) => watcher.submitCrawlForm(e)
        },
        '[tmq="tmq-0002"]': {
            value: watcher.getValue(CRAWL_FORM.MAX_PAGES),
            onChange: (e) => watcher.setValue(CRAWL_FORM.MAX_PAGES, e.target.value)
        },
        '[tmq="tmq-0003"]': {
            value: watcher.getValue(CRAWL_FORM.DEPTH),
            onChange: (e) => watcher.setValue(CRAWL_FORM.DEPTH, e.target.value)
        },
        '[tmq="tmq-0004"]': {
            value: watcher.getValue(CRAWL_FORM.UPDATe_INTERVAL),
            onChange: (e) => watcher.setValue(CRAWL_FORM.UPDATe_INTERVAL, e.target.value)
        },
        '.mainwidth-control': {
            style: { display: "flex" }
        },
        '.inbox-list': {
            children: urlList.length != 0 && urlList.map((item, index) => (
                <UrlitemItem dataWId={'9bba86ca-9be5-99ad-ceca-b591f883646d'} urlName={item.url} onClick={() => watcher.setSelectedUrl(item.id)} currentSelected={currentSelected == item.id} />
            ))
        },
        '.settings-title': {
            children: `(${urlStatus}) ${selectedUrl?.url == undefined ? "" : selectedUrl?.url}`
        },
        '.table-content': {
            children: pages && pages.length != 0 && pages.map((page, index) => (<div className="table-row">
                <div className="table-cell-div stretch">
                    <a href="#" className="table-subpages-url w-inline-block" tmq="tmq-0010">
                        <div>{page.url}</div>
                    </a>
                </div>
                <div className="table-cell-div stretch">
                    <div className="settings-sublabel">{page.title}</div>
                </div>
                <div className="table-cell-div stretch">
                    <div className="settings-sublabel">{moment(parseInt(page.createdAt)).format('M/D/YYYY, h:mm:ss A')}</div>
                </div>
                <div className="table-cell-div">
                    <div
                        className={`messaging-inbox-status-tag ${page.status.toLowerCase() === 'completed' ? '' : page.status.toLowerCase() === 'queued' ? 'bg-yellow' : 'bg-green'}`}
                    >
                        {page.status}
                    </div>
                </div>
                <div className="table-cell-div _w-7">
                    <div className={`switch-div ${!page.active && "off"}`} onClick={() => watcher.updateCrawlPages(page.id, !page.active)}>
                        <div className="switch-control" />
                    </div>
                </div>
            </div>))
        }
    }

    const enhancements = {
        ...animationsEnhancements,
        ...sidebarEnhancements,
        ...webcrawlEnhancements
    };

    return (
        <div>
            <Toaster closeButton />
            <DeepEnhancer component={Index} enhancements={enhancements} />
        </div >
    );
}