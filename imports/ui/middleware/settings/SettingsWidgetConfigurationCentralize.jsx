import React, { useEffect, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Index from '../../pages/settings/widget-configuration';
import Lottie from 'lottie-react';
import { PATHS } from '../../paths';
import { TOAST_STYLE } from '../../../api/common/const';
import WidgetWatcher from '../../../api/client/watchers/WidgetWatcher';
import AssistantWatcher from '../../../api/client/watchers/vapi/AssistantWatcher';
import { useWatcher } from '../../../api/client/Watcher2';
import Loader from '../../pages/custom/Loader';
import FormrowItem_ca5d0667 from '../../pages/custom/FormrowItem_ca5d0667';
import FormhddivrightItem_34200126 from '../../pages/custom/FormhddivrightItem_34200126';
import Noticedivstyle2Item_b196be0b from '../../pages/custom/Noticedivstyle2Item_b196be0b';
import DomaindivItem from '../../pages/custom/DomaindivItem';
import InboxitemItem_aeb4ecec from '../../pages/custom/InboxitemItem_aeb4ecec';
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

export default function SettingsWidgetConfigurationCentralize() {
    // WATCHERS
    const listRef = useRef(null);
    const navigate = useNavigate();
    const watcher = useRef(WidgetWatcher).current;
    const watcher2 = useRef(AssistantWatcher).current;
    useWatcher(watcher);
    useWatcher(watcher2);

    const [domain, setDomain] = useState([]);
    const [name, setName] = useState('');
    const [selectedAssistant, setSelectedAssistant] = useState({});
    const [showPopup, setShowPopup] = useState(false);
    const [verifyDomain, setVerifyDomain] = useState(false);

    const showPopUp = watcher.getValue('showPopUp');
    const isLoadingCreation = watcher.getValue("isLoadingCreation");
    const assistant = watcher2.Assistants;
    const isWebsiteVerifying = watcher.getValue("isWebsiteVerifying");
    const isAddDomainOpen = watcher.getValue('isAddHeaderOpen') || false;
    const [domainsListEdit, setDomainsListEdit] = useState({});
    const [selectedName, setSelectedName] = useState('');
    const [selectedDomain, setSelectedDomain] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const currentWidget = watcher.getValue('currentWidget');
    const isLoading = watcher.getValue("isLoadingWidget");
    const widgetData = watcher.Widget;
    const activeTab = watcher.getValue("activeTab") || 'appearance';
    const fetchData = async () => {
        await watcher.fetchWidgetConfig();
        await watcher2.fetchAllAssistants();
    };

    const handleDomainInputBlur = async () => {
        setVerifyDomain(true);
        const len = domain.length;
        const currentDomain = domain[len - 1].value;

        domain[len - 1].isValid = false;
        const isValid = await watcher.checkDomain(currentDomain);
        if (!isValid) {
            toast.error(`Invalid domain: ${currentDomain}`, {
                style: TOAST_STYLE.ERROR
            });
        }

        const updated = [...domain];
        updated[len - 1].isValid = isValid;
        setDomain(updated);
        setVerifyDomain(false);
    };

    const handleDomainChange = (index, field, value) => {
        const updated = [...domain];
        updated[index][field] = value;
        setDomain(updated);
    };

    const handleRemoveDomain = (index) => {
        const updated = domain.filter((_, i) => i !== index);
        setDomain(updated);
    };

    useEffect(() => {
        watcher.setValue("isLoadingWidget", true);
        watcher.listen();
        fetchData();
        return () => {
            watcher.clear();
            watcher.removeListener();
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        // check if all domains are valid
        const allValid = domain.every(item => item.isValid);
        if (!allValid) {
            toast.error('Please check all domains and make sure they are valid', {
                style: TOAST_STYLE.ERROR
            });
            return;
        }

        // check if there are duplicate domains
        const duplicateDomains = domain.filter(item => item.value);
        const hasDuplicates = duplicateDomains.some((item, index) =>
            duplicateDomains.findIndex(d => d.value === item.value) !== index
        );

        if (hasDuplicates) {
            toast.error('Duplicate domains are not allowed', {
                style: TOAST_STYLE.ERROR
            });
            return;
        }
        watcher.createWidgetConfig({
            name: name,
            domain: domain.map(item => item.value),
            assistantId: selectedAssistant ? selectedAssistant.assistantid : null,
            assistantidllm: selectedAssistant ? selectedAssistant.assistantidllm : null,
        }).then((res) => {
            if (res) {
                setDomain([]); // Clear the domain state after submission
                setName(''); // Clear the name input after submission
                setSelectedAssistant([]);
                setDomain([]);
            }
        });
    };

    const handleAddDomain = () => {
        // do not add if domain is already in the list  and if isWebsiteVerifying is true
        if (isWebsiteVerifying) {
            toast.warning('Please wait for the domain to be verified', {
                style: TOAST_STYLE.WARNING
            });
            return;
        }

        if (!showPopup && !isAddDomainOpen) setDomain([]);

        setDomain(prevParams => {
            const newParams = [...prevParams, {
                key: '',
                value: '',
            }];
            return newParams;
        });
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // If we're near the bottom (within 20px) and not currently loading
        if (scrollHeight - scrollTop - clientHeight < 20 && !isLoading) {
            watcher.fetchWidgetConfig({ isLoadmore: true });
        }
    };


    const handleWidgetSelect = (widget) => {
        if (hasUnsavedChanges) {
            if (window.confirm('You have unsaved changes. Do you want to discard them?')) {
                initializeChanges(widget);
                setDomainsListEdit({});
                watcher.setValue("currentWidget", widget);
                watcher.setValue("isAddDomainOpen", widget);
                setSelectedDomain(widget.domainsList.map(domain => ({ value: domain })));
            }
        } else {
            watcher.setValue("isAddDomainOpen", widget);
            setDomainsListEdit({});
            watcher.setValue("currentWidget", widget);
            initializeChanges(widget);
        }
    };

    const initializeChanges = (widget) => {
        setSelectedName(widget.name);
        // Ensure consistent structure for all domains
        setSelectedDomain(widget.domainsList.map(domain => ({
            value: domain,
            isValid: true
        })));
    };

    const handleUpdate = async () => {
        if (!hasUnsavedChanges || !currentWidget) return;
        setHasUnsavedChanges(false);
        // Validate all domains when save is clicked
        const validationPromises = selectedDomain.map(async (domain) => {
            const isValid = await watcher.checkDomain(domain.value);
            return { value: domain.value, isValid };
        });

        const validatedDomains = await Promise.all(validationPromises);
        setSelectedDomain(validatedDomains);

        // Check if all domains are valid
        const allValid = validatedDomains.every(domain => domain.isValid);
        if (!allValid) {
            toast.error('Please check all domains and make sure they are valid', {
                style: TOAST_STYLE.ERROR
            });
            return;
        }
    }

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
        '[tmq="tmq-0051"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.home) } },
        '[tmq="tmq-0052"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.messaging) } },
        '[tmq="tmq-0053"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.dashboard) } },
        '[tmq="tmq-0054"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.contacts) } },
        '[tmq="tmq-0055"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buzzBuilderHub) } },
        '[tmq="tmq-0056"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.attractShoppers) } },
        '[tmq="tmq-0057"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.convertBuyers) } },
        '[tmq="tmq-0058"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.buildLoyalty) } },
        '[tmq="tmq-0059"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.contentLibrary) } },
        '[tmq="tmq-0060"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.policies) } },
        '[tmq="tmq-0061"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.objectionFeed) } },
        '[tmq="tmq-0062"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.account) } },
        '[tmq="tmq-0063"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.billing) } },
        '[tmq="tmq-0064"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.assistant) } },
        '[tmq="tmq-0065"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.phoneNumbers) } },
        '[tmq="tmq-0066"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.tools) } },
        '[tmq="tmq-0067"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.files) } },
        '[tmq="tmq-0068"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.journey.customerMemoryCenter) } },
        '[tmq="tmq-0069"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.knowledgeBase) } },
        '[tmq="tmq-0070"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.widgetConfiguration) } },
        '[tmq="tmq-0071"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.settings.dataEnrichment) } },
        '[tmq="tmq-0072"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.admin) } },
        '[tmq="tmq-0073"]': { href: "", onClick: (e) => { e.preventDefault(); navigate(PATHS.webCrawl) } },
    };

    const widgetSidebarEnhancements = {
        '[data-w-id="63a9b66e-78d6-7eee-4643-e54302a9ad55"]': {
            onClick: () => watcher.setValue('showPopUp', true)
        },
        '[tmq="tmq-0076"]': {
            style: { display: showPopUp ? 'flex' : 'none' },
            children: isLoadingCreation ? <Loader /> :
                < div className={'popup-card _w-50'} >
                    <div className={'card-settings-hd-div'}>
                        <div className={'card-settings-hd'}>{'Create Configuration'}</div>
                    </div>
                    <div className={'w-form'}>
                        <form
                            id={'wf-form-create-configuration-form'}
                            name={'wf-form-create-configuration-form'}
                            data-name={'create configuration form'}
                            method={'get'}
                            data-wf-page-id={'688b61ee631f6165f14725bb'}
                            data-wf-element-id={'63a9b66e-78d6-7eee-4643-e54302a9ae49'}
                        >
                            <div className={'form-body'}>
                                <FormrowItem_ca5d0667
                                    label={'Configuration Name'}
                                    name={'config-name'}
                                    dataName={'config name'}
                                    type={'text'}
                                    id={'config-name'}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <div className="dropdown-group">
                                    <label>Select Assistant</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                        <select
                                            className="select-field w-select"
                                            onChange={(e) => {
                                                const selectedItem = JSON.parse(e.target.value);
                                                setSelectedAssistant(selectedItem);
                                            }}
                                        >
                                            <option value="" >Select Assistant</option>
                                            {assistant && assistant.map((item, index) => (
                                                <option key={index} value={JSON.stringify(item)}>
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className={'form-row'}>
                                    <div className={'form-control'}>
                                        <div className={'popup-form-hd-div'}>
                                            <div className={'form-hd-div-left'}>
                                                <div className={'form-label'}>{'Domain'}</div>
                                            </div>
                                            <FormhddivrightItem_34200126
                                                dataWId={'b4274f11-8c4c-3670-a676-a8a0e61dff7e'}
                                                onClick={() => {
                                                    watcher.setValue('isAddHeaderOpen', true);
                                                    handleAddDomain();
                                                }}
                                            />
                                        </div>
                                        {domain.length == 0 &&
                                            <Noticedivstyle2Item_b196be0b />}
                                        {
                                            domain.map((domain, index) => (
                                                <DomaindivItem
                                                    onBlur={handleDomainInputBlur}
                                                    key={index}
                                                    isValid={domain.isValid}
                                                    index={index} domain={domain.value}
                                                    handleDomainChange={handleDomainChange}
                                                    handleRemoveDomain={handleRemoveDomain}
                                                    isAddDomainOpen={isAddDomainOpen}
                                                    onClose={() => watcher.setValue('isAddHeaderOpen', false)}
                                                    isWebsiteVerifying={isWebsiteVerifying}
                                                    name="header-name" dataName="header name" id="header-name" name1="header-value" dataName1="header value" id1="header-value" />
                                            ))
                                        }
                                    </div>
                                </div>
                                <div className={'form-btn-container'}>
                                    <a href={'#'} className={'btn-style1 outline'}
                                        onClick={() => {
                                            setName("");
                                            setSelectedAssistant([]);
                                            setDomain([]);
                                            watcher.setValue("showPopUp", false);
                                        }}
                                    >
                                        <div>{'Cancel'}</div>
                                    </a>
                                    <a href={'#'} className={'btn-style1'} onClick={handleSubmit}>
                                        <div>{'Submit'}</div>
                                    </a>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div
                        data-w-id={'63a9b66e-78d6-7eee-4643-e54302a9aee3'}
                        className={'popup-close'}
                        onClick={() => {
                            setName("");
                            setSelectedAssistant([]);
                            setDomain([]);
                            watcher.setValue("showPopUp", false);
                        }}
                    >
                        <img src={'../images/smarties-x.svg'} loading={'lazy'} alt={''} />
                    </div>
                </div >
        },
        '.inbox-list': {
            ref: listRef,
            style: {
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '10px',
                scrollBehavior: 'smooth'
            },
            onScroll: handleScroll,
            children: isLoading ? <Loader /> : (
                widgetData.length ? widgetData.map((widget, index) => (
                    <InboxitemItem_aeb4ecec
                        key={index}
                        divText={widget.name}
                        isCurrent={widget.id === currentWidget?.id}
                        onClick={() => handleWidgetSelect(widget)}
                    />
                )) : <div className="no-data">No widgets found</div>
            )
        },
        '.mainbody-col': {
            style: { display: currentWidget ? 'block' : 'none' },
        },

    };


    const widgetMainbodyEnhancements = {
        '.messaging-top-name': {
            children: <>{currentWidget && currentWidget.name ? currentWidget.name : "no name"}</>
        },
        '.messaging-top-userstatus': {
            children: <>
                <div className="domain-div-icon"><img src="../images/smarties-action-icon-03_1.svg" loading="lazy" alt /></div>
                <div>{currentWidget && currentWidget.domainsList && currentWidget.domainsList.length ? currentWidget.domainsList[0] : "no domain"}</div>
            </>
        },
        '.assistant-buttons-div': {
            children: <>
                <div className={`button-save ${hasUnsavedChanges ? '' : 'disabled'}`} onClick={handleUpdate} style={{ cursor: hasUnsavedChanges ? "pointer" : "not-allowed", opacity: hasUnsavedChanges ? 1 : 0.4 }}>
                    <div>{'Save'}</div>
                    <div className={'fluentchat-28-regular'}>
                        <img
                            loading={'lazy'}
                            src={'../images/smarties-save.svg'}
                            alt={''}
                        />
                    </div>
                </div>
            </>
        },
        '[tmq="tmq-0005"]': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2 }
        },
        '[tmq="tmq-00066"]': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2 }
        },
        '[tmq="tmq-00067"]': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2 }
        },
        '[tmq="tmq-00068"]': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2 }
        },
        '[tmq="tmq-00069"]': {
            className: 'contactdetails-tablink w-inline-block w-tab-link w--current'
        },
        '[tmq="integration-tab"]': {
            className: 'contactdetails-tabpane w-tab-pane w--tab-active'
        },
        '.dataenrichment-control-group': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2, filter: "grayscale(50%)" }
        },
        '[tmq="tmq-0047"]': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2 }
        },
        '[tmq="tmq-0048"]': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2 }
        },
        '[tmq="tmq-0049"]': {
            disabled: true,
            style: { pointerEvents: 'none', opacity: 0.2 }
        },
        '[tmq="tmq-0050"]': {
            onClick: () => watcher.loadWidget(currentWidget?.siteid),
        },
    };

    const enhancements = {
        ...animationsEnhancements,
        ...sidebarEnhancements,
        ...widgetSidebarEnhancements,
        ...widgetMainbodyEnhancements
    };

    return (
        <div>
            <Toaster closeButton />
            <DeepEnhancer component={Index} enhancements={enhancements} />
        </div >
    );
}