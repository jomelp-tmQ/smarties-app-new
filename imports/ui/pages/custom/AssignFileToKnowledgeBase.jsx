import React, { useEffect, useRef, useState } from 'react';
import FileUploadWatcher from '../../../api/client/watchers/vapi/FileUploadWatcher';
import { useWatcher } from '../../../api/client/Watcher2';
import { truncateFileName } from '../../../api/common/utils';
import { toast } from 'sonner';

const AssignFileToKnowledgeBase = ({ isOpen = false, onClose = () => { }, onSubmit = () => { }, currentSelected }) => {
    const formRef = useRef(null);
    const watcher = useRef(FileUploadWatcher).current;

    useWatcher(watcher);
    const isLoading = watcher.getValue("isLoadingFiles");
    const [files, setFiles] = useState([]);

    useEffect(() => {
        async function setupWatcher() {
            try {
                watcher.setValue("isLoadingFiles", true);
                await watcher.fetchFiles({ append: false, limit: 20 });
                watcher.filesListen();

                // Initial load from Minimongo
                const initial = await watcher.DB.find({}, { sort: { createdAt: -1 } }).fetch();
                setFiles(Array.isArray(initial) ? initial : []);

                // Subscribe to local changes
                const unsubscribe = watcher.DB.onChange(async () => {
                    const all = await watcher.DB.find({}, { sort: { createdAt: -1 } }).fetch();
                    setFiles(Array.isArray(all) ? all : []);
                });

                return unsubscribe;
            } catch (err) {
                console.error(err);
            } finally {
                watcher.activateWatch();
            }
        }

        let cleanupPromise = null;
        if (watcher.BusinessId) {
            cleanupPromise = setupWatcher();
        }

        return () => {
            if (cleanupPromise) cleanupPromise.then(cleanup => cleanup?.());
        };
    }, [watcher.BusinessId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formRef);
        onClose();
    };

    useEffect(() => {
        if (!isOpen && formRef.current) {
            formRef.current.reset();
        }
    }, [isOpen]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 20;
        if (nearBottom && !isLoading) {
            watcher.fetchFiles({ append: true });
        }
    };

    return (
        <div className="popup-createphonenumber" style={{ display: isOpen ? "flex" : "none" }}>
            <div className="popup-card _w-50">
                <div className="card-settings-hd-div">
                    <div className="card-settings-hd">Assign File</div>
                </div>
                <div className="w-form">
                    <form ref={formRef} id="email-form" name="file-form" onSubmit={handleSubmit}>
                        <div className="form-body">
                            <div
                                className="form-row"
                                style={{
                                    maxHeight: '500px',
                                    overflowY: 'auto',
                                    paddingRight: '6px',
                                    marginBottom: '16px',
                                    border: '1px solid #eee',
                                    borderRadius: '6px',
                                }}
                                onScroll={handleScroll}
                            >
                                {files && files.map((file) => {
                                    const isAlreadyAdded = currentSelected?.filesList?.some(
                                        (selectedFile) => selectedFile.id === file.fileId
                                    );
                                    // const isProcessed = String(file?.kbStatus || file?.status || '').toLowerCase() === 'completed';
                                    // #TODOS: Added todo for status update
                                    const isProcessed = true;
                                    const isDisabled = isAlreadyAdded || !isProcessed;

                                    return (
                                        <div
                                            key={file._id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                border: isAlreadyAdded ? '1px solid green' : '1px solid #ccc',
                                                backgroundColor: isAlreadyAdded ? '#e6f7e6' : 'white',
                                                borderRadius: '6px',
                                                marginBottom: '8px',
                                                width: '100%',
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: '14px', fontWeight: '500' }} title={file.originalName}>
                                                    {truncateFileName(file.originalName)}{' '}
                                                    {isAlreadyAdded && (
                                                        <span style={{ color: 'green' }}>
                                                            (Already Assigned)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div style={{ width: 120, textAlign: 'right', paddingRight: 12 }}>
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                                    {(file.kbStatus || '—')}
                                                </span>
                                            </div>
                                            <div style={{ width: 24, display: 'flex', justifyContent: 'flex-end' }}
                                                onClick={() => {
                                                    if (!isProcessed) {
                                                        toast.error('File unavailable: already assigned, in progress, or failed.');
                                                        return;
                                                    }
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    name={file._id}
                                                    defaultChecked={isAlreadyAdded}
                                                    title={!isProcessed ? 'Unavailable until file processing completes' : undefined}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="form-btn-container mb-20">
                                <a href="#" className="btn-style1 outline" onClick={onClose}>
                                    <div>Cancel</div>
                                </a>
                                <button type="submit" className="btn-style1">
                                    <div>Submit</div>
                                </button>
                            </div>
                            <div className="notice-div bg-blue">
                                <div className="notice-icon">
                                    <img
                                        src="/images/smarties-alert-circle-blue.svg"
                                        loading="lazy"
                                        alt=""
                                    />
                                </div>
                                <div className="notice-text">
                                    You can assign files to your knowledge base. Please select the
                                    files you want to assign.
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="popup-close" onClick={onClose}>
                    <img src="/images/smarties-x.svg" loading="lazy" alt="" />
                </div>
            </div>
        </div>
    );
};

export default AssignFileToKnowledgeBase;
